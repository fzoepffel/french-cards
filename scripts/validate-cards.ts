// Checks src/data/cards.json against the card rules. Run: npm run validate
import { readFileSync } from 'node:fs'
import { SECTIONS } from '../src/data/topics.ts'

const cards = JSON.parse(readFileSync(new URL('../src/data/cards.json', import.meta.url), 'utf8'))
const topics = new Set(SECTIONS.flatMap((s) => s.topics.map((t) => t.id)))
const formats = new Set(['translate', 'gap', 'conjugate', 'rewrite', 'choose', 'fix', 'sentence'])

const errors: string[] = []
const ids = new Set<string>()
const err = (id: string, msg: string) => errors.push(`${id}: ${msg}`)

for (const c of cards) {
  const id = c.id ?? '(no id)'
  if (!c.id) err(id, 'missing id')
  if (ids.has(c.id)) err(id, 'duplicate id')
  ids.add(c.id)
  if (!topics.has(c.topic)) err(id, `unknown topic "${c.topic}"`)
  if (!formats.has(c.format)) err(id, `unknown format "${c.format}"`)
  if (!c.answer) err(id, 'missing answer')
  if (!c.note) err(id, 'missing note')

  const gaps = (c.fr ?? '').split('___').length - 1
  switch (c.format) {
    case 'translate':
    case 'sentence':
      if (!c.de) err(id, `${c.format} needs de`)
      break
    case 'gap':
      if (gaps !== 1) err(id, 'gap needs exactly one ___ in fr')
      break
    case 'conjugate':
      if (!c.task) err(id, 'conjugate needs task')
      break
    case 'rewrite':
      if (!c.fr || !c.task) err(id, 'rewrite needs fr and task')
      break
    case 'fix':
      if (!c.fr) err(id, 'fix needs fr')
      if (c.fr === c.answer) err(id, 'fix: fr is already correct')
      break
    case 'choose':
      if (!Array.isArray(c.options) || c.options.length < 2) err(id, 'choose needs 2+ options')
      else if (!c.options.includes(c.answer)) err(id, 'choose: answer not among options')
      if (gaps > 1) err(id, 'choose allows at most one ___')
      if (!gaps && !c.task) err(id, 'choose without ___ needs task')
      break
  }
}

const covered = new Set(cards.map((c: { topic: string }) => c.topic))
const empty = [...topics].filter((t) => !covered.has(t))
const byFormat = cards.reduce((m: Record<string, number>, c: { format: string }) => ((m[c.format] = (m[c.format] ?? 0) + 1), m), {})

console.log(`${cards.length} cards, ${covered.size}/${topics.size} topics covered`)
console.log('by format:', byFormat)
if (empty.length) console.log('topics without cards:', empty.join(', '))
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.join('\n'))
  process.exit(1)
}
console.log('ok')
