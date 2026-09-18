// Rewrites bare expressions in grammar topics as sentences, so the German prompt
// can only mean one thing. "immer schlimmer" becomes a sentence with de pire en pire
// in the gap. Usage: npm run cards:contextify -- [--dry-run] [--limit 40]
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import * as z from 'zod/v4'
import { checkCard, type Card } from '../scripts/card-rules.ts'
import { SECTIONS } from '../src/data/topics.ts'

const { values } = parseArgs({
  options: { 'dry-run': { type: 'boolean', default: false }, limit: { type: 'string', default: '60' } },
})

const deckPath = new URL('../src/data/cards.json', import.meta.url)
const cards: Card[] = JSON.parse(readFileSync(deckPath, 'utf8'))

// Vocabulary topics are fine as bare words: that is what a vocabulary card is.
const VOCAB_SECTIONS = new Set(['wortschatz'])
const VOCAB_TOPICS = new Set([
  ...SECTIONS.filter((s) => VOCAB_SECTIONS.has(s.id)).flatMap((s) => s.topics.map((t) => t.id)),
  'genus-endung',
  'genus-anders',
  'genus-bedeutung',
  'plural',
  'personen-feminin',
])

const targets = cards
  .filter((c) => c.format === 'translate' && !VOCAB_TOPICS.has(c.topic))
  .slice(0, Number(values.limit))

console.log(`${targets.length} bare expressions sit in grammar topics`)

const Output = z.object({
  cards: z.array(
    z.object({
      id: z.string(),
      de: z.string(),
      fr: z.string(),
      answer: z.string(),
      note: z.string(),
    }),
  ),
})

const SYSTEM = `You rewrite flashcards for Neno, a French learning app for a native German speaker at B1 level.

Each card currently asks for a bare expression, which is ambiguous in German: "immer schlimmer" or "als ob" can be read several ways. Rewrite each one as a gap card that puts the same French expression into a natural sentence.

For every card:
- answer: the French expression, unchanged, exactly as given.
- fr: one natural French sentence at B1 level containing that expression, with the expression replaced by ___ . Everything else in the sentence stays spelled out. Exactly one ___ per sentence.
- de: the German translation of that whole sentence, so the learner knows what to produce.
- note: one or two short German sentences about how the expression is used. Keep the substance of the old note where it is still right. Never use dashes (— or –).

Keep the sentences short, everyday and speakable. Return one entry per input card, with the same id.`

const client = new Anthropic()
const price = { input: 5, output: 25 }
let usedIn = 0
let usedOut = 0
const rewritten: Record<string, z.infer<typeof Output>['cards'][number]> = {}

for (let i = 0; i < targets.length; i += 12) {
  const batch = targets.slice(i, i + 12)
  const input = batch.map((c) => ({ id: c.id, topic: c.topic, de: c.de, answer: c.answer, note: c.note }))
  if (values['dry-run']) {
    console.log(JSON.stringify(input, null, 1))
    continue
  }
  const response = await client.beta.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(input, null, 1) }],
    output_config: { format: betaZodOutputFormat(Output) },
  })
  usedIn += response.usage.input_tokens
  usedOut += response.usage.output_tokens
  for (const c of response.parsed_output?.cards ?? []) rewritten[c.id] = c
  console.log(`  ${Object.keys(rewritten).length}/${targets.length} rewritten`)
}

if (values['dry-run']) process.exit(0)

let changed = 0
const problems: string[] = []
for (const card of cards) {
  const next = rewritten[card.id]
  if (!next) continue
  if (next.answer.trim() !== card.answer.trim()) {
    problems.push(`${card.id}: answer changed from "${card.answer}" to "${next.answer}", skipped`)
    continue
  }
  const candidate: Card = {
    id: card.id,
    topic: card.topic,
    format: 'gap',
    de: next.de,
    fr: next.fr,
    answer: card.answer,
    ...(card.accept ? { accept: card.accept } : {}),
    note: next.note,
  }
  const issues = checkCard(candidate)
  if (issues.length) {
    problems.push(`${card.id}: ${issues.join('; ')}, skipped`)
    continue
  }
  for (const key of Object.keys(card)) delete (card as unknown as Record<string, unknown>)[key]
  Object.assign(card, candidate)
  changed++
}

const lines: string[] = []
let lastTopic = ''
for (const c of cards) {
  if (lastTopic && c.topic !== lastTopic) lines.push('')
  lines.push(`  ${JSON.stringify(c)},`)
  lastTopic = c.topic
}
writeFileSync(deckPath, `[\n${lines.join('\n').replace(/,$/, '')}\n]\n`)

const cost = (usedIn * price.input + usedOut * price.output) / 1e6
console.log(`\n${changed} cards now carry a sentence · about $${cost.toFixed(2)}`)
for (const p of problems) console.log(`  ${p}`)
