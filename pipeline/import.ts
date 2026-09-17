// Moves checked drafts into src/data/cards.json.
// Usage: npm run cards:import -- pipeline/out/drafts/FILE.json [...] [--reject id,id] [--include-flagged]
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { TOPIC_IDS, checkCard, dedupeKey, type Card } from '../scripts/card-rules.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    reject: { type: 'string', default: '' },
    'include-flagged': { type: 'boolean', default: false },
  },
})
if (!positionals.length) {
  console.error('Usage: import.ts DRAFT.json [...] [--reject id,id] [--include-flagged]')
  process.exit(1)
}

type Draft = Card & { status?: string; issues?: string[]; lemma?: string; rank?: number }
const CARD_FIELDS = ['id', 'topic', 'format', 'de', 'fr', 'task', 'hint', 'options', 'answer', 'accept', 'note', 'rank'] as const

const deckPath = new URL('../src/data/cards.json', import.meta.url)
const deck: Card[] = JSON.parse(readFileSync(deckPath, 'utf8'))
const ids = new Set(deck.map((c) => c.id))
const keys = new Set(deck.map(dedupeKey))
const rejected = new Set(values.reject.split(',').filter(Boolean))

const added: Card[] = []
const report = { rejected: 0, flagged: 0, duplicate: 0, invalid: 0 }

for (const file of positionals) {
  const draft = JSON.parse(readFileSync(file, 'utf8')) as { meta: Record<string, unknown>; cards: Draft[] }
  const imported: string[] = []
  for (const d of draft.cards) {
    if (rejected.has(d.id)) {
      report.rejected++
      continue
    }
    if (d.status === 'flagged' && !values['include-flagged']) {
      report.flagged++
      continue
    }
    // Keep only app fields, in a stable order.
    const card = Object.fromEntries(CARD_FIELDS.filter((f) => d[f] !== undefined).map((f) => [f, d[f]])) as unknown as Card
    if (ids.has(card.id) || keys.has(dedupeKey(card))) {
      report.duplicate++
      continue
    }
    const problems = checkCard(card)
    if (problems.length) {
      console.warn(`${card.id}: ${problems.join('; ')}`)
      report.invalid++
      continue
    }
    ids.add(card.id)
    keys.add(dedupeKey(card))
    added.push(card)
    imported.push(card.id)
  }
  draft.meta.imported = [...((draft.meta.imported as string[]) ?? []), ...imported]
  draft.meta.importedAt = new Date()
  writeFileSync(file, JSON.stringify(draft, null, 2))
}

// Group by curriculum topic; within a topic keep existing order, new cards after.
const order = new Map(TOPIC_IDS.map((t, i) => [t, i]))
const all = [...deck, ...added].map((c, i) => ({ c, i }))
all.sort((a, b) => (order.get(a.c.topic) ?? 999) - (order.get(b.c.topic) ?? 999) || a.i - b.i)

const lines: string[] = []
let lastTopic = ''
for (const { c } of all) {
  if (lastTopic && c.topic !== lastTopic) lines.push('')
  lines.push(`  ${JSON.stringify(c)},`)
  lastTopic = c.topic
}
const body = lines.join('\n').replace(/,$/, '')
writeFileSync(deckPath, `[\n${body}\n]\n`)

console.log(
  `Added ${added.length} cards (deck now ${deck.length + added.length}). ` +
    `Skipped: ${report.rejected} rejected, ${report.flagged} flagged, ${report.duplicate} duplicates, ${report.invalid} invalid.` +
    `\nNext: npm run validate && npm run build`,
)
