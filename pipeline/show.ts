// Prints draft cards for spot-checking.
// Usage: npm run cards:show -- pipeline/out/drafts/FILE.json [--sample 30] [--flagged]
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import type { Card } from '../scripts/card-rules.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { sample: { type: 'string' }, flagged: { type: 'boolean', default: false } },
})
if (!positionals.length) {
  console.error('Usage: show.ts DRAFT.json [--sample N] [--flagged]')
  process.exit(1)
}

type Draft = Card & { status?: string; issues?: string[]; rank?: number }

for (const file of positionals) {
  const { meta, cards } = JSON.parse(readFileSync(file, 'utf8')) as { meta: Record<string, unknown>; cards: Draft[] }
  let list = values.flagged ? cards.filter((c) => c.status === 'flagged') : cards
  const n = Number(values.sample ?? list.length)
  // Evenly spaced sample, so it covers the whole file rather than the first N.
  if (n < list.length) list = Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)])

  console.log(`# ${file}\n${cards.length} cards, showing ${list.length}${meta.costUSD ? `, cost $${meta.costUSD}` : ''}\n`)
  for (const c of list) {
    const lines = [`## ${c.id}  ·  ${c.topic} · ${c.format}${c.rank ? ` · rank ${c.rank}` : ''}${c.status === 'flagged' ? '  ⚠' : ''}`]
    if (c.de) lines.push(`DE      ${c.de}`)
    if (c.fr) lines.push(`FR      ${c.fr}`)
    if (c.task) lines.push(`Aufgabe ${c.task}`)
    if (c.hint) lines.push(`Hinweis ${c.hint}`)
    if (c.options) lines.push(`Optionen ${c.options.join(' | ')}`)
    lines.push(`→       ${c.answer}${c.accept?.length ? `   (auch: ${c.accept.join('; ')})` : ''}`)
    if (c.note) lines.push(`Notiz   ${c.note}`)
    if (c.issues?.length) lines.push(`⚠       ${c.issues.join('; ')}`)
    console.log(lines.join('\n') + '\n')
  }
  if (Array.isArray(meta.skipped) && meta.skipped.length) console.log(`Skipped by the model:\n- ${meta.skipped.join('\n- ')}\n`)
}
