// Fills every gap card and checks that the finished sentence is real French.
// A generated gap can look fine in pieces and break once assembled, e.g.
// "Tu as vraiment ___" + "avoir de la chance".
// Usage: npm run cards:verify -- [--topic si-saetze] [--ids a,b] [--apply]
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import * as z from 'zod/v4'
import { checkCard, type Card } from '../scripts/card-rules.ts'

const { values } = parseArgs({
  options: {
    topic: { type: 'string' },
    ids: { type: 'string' },
    apply: { type: 'boolean', default: false },
    limit: { type: 'string', default: '400' },
    deck: { type: 'string' },
  },
})

// Either a deck file (public/decks/*.json) or the German source deck.
const deckPath = new URL(values.deck ?? '../src/data/cards.json', import.meta.url)
const raw = JSON.parse(readFileSync(deckPath, 'utf8'))
const isDeckFile = !Array.isArray(raw)
const cards: Card[] = isDeckFile ? raw.cards : raw
const only = new Set((values.ids ?? '').split(',').filter(Boolean))

const targets = cards
  .filter((c) => c.format === 'gap' && c.fr?.includes('___'))
  .filter((c) => (values.topic ? c.topic === values.topic : true))
  .filter((c) => (only.size ? only.has(c.id) : true))
  .slice(0, Number(values.limit))

console.log(`checking ${targets.length} gap cards`)

const Output = z.object({
  cards: z.array(
    z.object({
      id: z.string(),
      ok: z.boolean(),
      problem: z.string(),
      /** A repaired French sentence with ___ where the answer goes, empty when ok */
      fr: z.string(),
      /** A repaired German prompt, empty when the old one still fits */
      de: z.string(),
    }),
  ),
})

const promptLanguage = isDeckFile && raw.ui === 'en' ? 'English' : 'German'

const SYSTEM = `You check flashcards for a French learning app. Each card has a prompt in ${promptLanguage}, a French sentence with a gap, and the answer that belongs in the gap.

Judge the French only. The prompt is written in ${promptLanguage} on purpose: never rewrite it into another language, and never report its language as a problem.

For each card, put the answer into the gap and judge the finished sentence:
- Is it grammatical French?
- Does it say what the German prompt says?
- Would a French speaker write it that way?

Set ok true when the sentence is right. Otherwise set ok false, name the problem in one short sentence, and repair it: give a corrected French sentence that still contains the answer word for word, with ___ in its place, and a prompt in ${promptLanguage} that matches. Keep the answer itself unchanged, keep the sentence short and everyday, and keep the card teaching the same point.

A frequent fault: the answer is an infinitive expression (avoir de la chance) but the sentence is built around a conjugated verb, so the filled sentence reads "Tu as vraiment avoir de la chance". Rebuild the sentence so the answer fits verbatim.`

const client = new Anthropic()
let usedIn = 0
let usedOut = 0
const results: z.infer<typeof Output>['cards'] = []

for (let i = 0; i < targets.length; i += 15) {
  const batch = targets.slice(i, i + 15)
  const input = batch.map((c) => ({
    id: c.id,
    de: c.de,
    fr: c.fr,
    answer: c.answer,
    filled: c.fr!.replace('___', c.answer),
  }))
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
  results.push(...(response.parsed_output?.cards ?? []))
  console.log(`  ${results.length}/${targets.length}`)
}

const broken = results.filter((r) => !r.ok)
console.log(`\n${broken.length} of ${results.length} need work`)

let fixed = 0
for (const r of broken) {
  const card = cards.find((c) => c.id === r.id)
  if (!card) continue
  const filledNow = card.fr!.replace('___', card.answer)
  console.log(`\n${r.id}`)
  console.log(`  jetzt:  ${filledNow}`)
  console.log(`  problem: ${r.problem}`)
  if (r.fr) console.log(`  neu:    ${r.fr.replace('___', card.answer)}`)
  if (!values.apply) continue

  const candidate: Card = { ...card, fr: r.fr || card.fr, de: r.de || card.de }
  const gaps = (candidate.fr ?? '').split('___').length - 1
  if (gaps !== 1 || !candidate.fr?.includes('___') || checkCard(candidate).length) {
    console.log('  repair rejected, card left as it was')
    continue
  }
  Object.assign(card, candidate)
  fixed++
}

if (values.apply && fixed) {
  const lines: string[] = []
  let lastTopic = ''
  for (const c of cards) {
    if (lastTopic && c.topic !== lastTopic) lines.push('')
    lines.push(`  ${JSON.stringify(c)},`)
    lastTopic = c.topic
  }
  if (isDeckFile) writeFileSync(deckPath, JSON.stringify({ ...raw, cards }))
  else writeFileSync(deckPath, `[\n${lines.join('\n').replace(/,$/, '')}\n]\n`)
}

const cost = (usedIn * 5 + usedOut * 25) / 1e6
console.log(`\n${values.apply ? `${fixed} repaired` : 'nothing written, pass --apply to repair'} · about $${cost.toFixed(2)}`)
