// Checks src/data/cards.json against the card rules. Run: npm run validate
import { readFileSync } from 'node:fs'
import { TOPIC_IDS, checkCard, dedupeKey, type Card } from './card-rules.ts'

const cards: Card[] = JSON.parse(readFileSync(new URL('../src/data/cards.json', import.meta.url), 'utf8'))

const errors: string[] = []
const ids = new Set<string>()
const keys = new Map<string, string>()

for (const c of cards) {
  const id = c.id ?? '(no id)'
  if (ids.has(c.id)) errors.push(`${id}: duplicate id`)
  ids.add(c.id)
  const key = dedupeKey(c)
  if (keys.has(key)) errors.push(`${id}: same card as ${keys.get(key)}`)
  keys.set(key, id)
  for (const problem of checkCard(c)) errors.push(`${id}: ${problem}`)
}

const covered = new Set(cards.map((c) => c.topic))
const empty = TOPIC_IDS.filter((t) => !covered.has(t))
const byFormat = cards.reduce<Record<string, number>>((m, c) => ((m[c.format] = (m[c.format] ?? 0) + 1), m), {})

console.log(`${cards.length} cards, ${covered.size}/${TOPIC_IDS.length} topics covered`)
console.log('by format:', byFormat)
if (empty.length) console.log('topics without cards:', empty.join(', '))
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.join('\n'))
  process.exit(1)
}
console.log('ok')
