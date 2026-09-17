// Writes pipeline/out/wordlist.json and prints a slice.
// Usage: npm run cards:wordlist -- [--from 1500] [--show 30]
import { mkdirSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { buildWordlist, loadRows } from './lexique.ts'

const { values } = parseArgs({ options: { from: { type: 'string', default: '1' }, show: { type: 'string', default: '30' } } })

const list = buildWordlist(loadRows())
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(new URL('./out/wordlist.json', import.meta.url), JSON.stringify(list))

const counts = list.reduce<Record<string, number>>((m, l) => ((m[l.pos] = (m[l.pos] ?? 0) + 1), m), {})
console.log(`${list.length} lemmas`, counts)
const from = Number(values.from)
for (const l of list.slice(from - 1, from - 1 + Number(values.show))) {
  console.log(`${String(l.rank).padStart(5)}  ${l.pos}  ${l.lemma}${l.genders.length ? ` (${l.genders.join('/')})` : ''}`)
}
