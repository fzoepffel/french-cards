// Builds conjugate cards straight from Lexique, no AI involved.
// Regular -er forms are skipped; only forms you cannot derive from the infinitive become cards.
// Usage: npm run cards:conjugations -- [--verbs 60]
import { mkdirSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import type { Card } from '../scripts/card-rules.ts'
import { buildWordlist, loadRows, type Row } from './lexique.ts'

const { values } = parseArgs({ options: { verbs: { type: 'string', default: '60' } } })

const rows = loadRows()
const verbs = buildWordlist(rows)
  .filter((l) => l.pos === 'VER')
  .slice(0, Number(values.verbs))

type Cell = string // e.g. "ind:pre:1s", "par:pas"
const PERSONS = ['1s', '2s', '3s', '1p', '2p', '3p'] as const
const PRONOUN: Record<string, string> = { '1s': 'je', '2s': 'tu', '3s': 'il', '1p': 'nous', '2p': 'vous', '3p': 'ils' }
const ETRE_VERBS = new Set(
  'aller arriver descendre devenir entrer monter mourir naître partir rentrer rester retourner revenir sortir tomber venir'.split(' '),
)

const elides = (word: string) => /^[aeiouyàâéèêëîïôûœh]/i.test(word)
const withPronoun = (person: string, form: string) => {
  const p = PRONOUN[person]
  return p === 'je' && elides(form) ? `j'${form}` : `${p} ${form}`
}
const withQue = (person: string, form: string) => {
  const inner = withPronoun(person, form)
  return /^[aeiouy]/.test(inner) ? `qu'${inner}` : `que ${inner}`
}

/** Endings each cell can plausibly have; filters out Lexique tagging noise. */
const ENDINGS: Record<string, RegExp[]> = {
  'ind:pre': [/(s|x|e|ai)$/, /(s|x|es)$/, /(t|d|e|a|c)$/, /(ons|sommes)$/, /(ez|es)$/, /nt$/],
  'ind:imp': [/ais$/, /ais$/, /ait$/, /ions$/, /iez$/, /aient$/],
  'ind:fut': [/ai$/, /as$/, /a$/, /ons$/, /ez$/, /ont$/],
  'sub:pre': [/(e|s)$/, /(es|s)$/, /(e|t)$/, /ons$/, /ez$/, /ent$/],
}

/**
 * Best form for each inflection cell of one verb. Lexique has stray tags (e.g. "sommes" also
 * tagged as subjonctif), so candidates are ranked by how many rows agree, then frequency, and
 * must have a fitting ending and not belong to a cell they can never share a form with.
 */
function paradigm(lemma: string): Map<Cell, string> {
  const candidates = new Map<Cell, Map<string, { votes: number; freq: number }>>()
  for (const r of rows as Row[]) {
    if (r.lemme !== lemma || (r.cgram !== 'VER' && r.cgram !== 'AUX')) continue
    for (const tag of new Set(r.infover)) {
      // Past participle: masculine singular only.
      if (tag === 'par:pas' && (r.genre === 'f' || r.nombre === 'p')) continue
      const forms = candidates.get(tag) ?? new Map()
      const c = forms.get(r.ortho) ?? { votes: 0, freq: 0 }
      forms.set(r.ortho, { votes: c.votes + 1, freq: Math.max(c.freq, r.freqForm) })
      candidates.set(tag, forms)
    }
  }

  const result = new Map<Cell, string>()
  const pick = (cell: Cell, blocked: Set<string> = new Set()) => {
    const [mood, tense, person] = cell.split(':')
    const ending = person ? ENDINGS[`${mood}:${tense}`]?.[PERSONS.indexOf(person as (typeof PERSONS)[number])] : undefined
    const ranked = [...(candidates.get(cell) ?? new Map())]
      .filter(([form]) => (!ending || ending.test(form)) && !blocked.has(form))
      .sort((a, b) => b[1].votes - a[1].votes || b[1].freq - a[1].freq)
    if (ranked.length) result.set(cell, ranked[0][0])
  }

  for (const p of PERSONS) pick(`ind:imp:${p}`)
  const imparfait = new Set(PERSONS.map((p) => result.get(`ind:imp:${p}`)).filter((f): f is string => !!f))
  for (const p of PERSONS) pick(`ind:pre:${p}`, imparfait)
  for (const p of PERSONS) pick(`ind:fut:${p}`)
  // Subjonctif nous/vous legitimately equal the imparfait; no subjonctif equals présent nous/vous.
  const presentPlural = [result.get('ind:pre:1p'), result.get('ind:pre:2p')].filter((f): f is string => !!f)
  for (const p of PERSONS) {
    const blocked = new Set(presentPlural)
    if (p !== '1p' && p !== '2p') for (const f of imparfait) blocked.add(f)
    pick(`sub:pre:${p}`, blocked)
  }
  pick('par:pas')
  return result
}

/** What a regular -er verb would look like, to detect stem changes (achète, appelle, mangeons). */
function regularEr(lemma: string, cell: Cell): string | undefined {
  if (!lemma.endsWith('er')) return undefined
  const stem = lemma.slice(0, -2)
  const [mood, tense, person] = cell.split(':')
  const end = (list: string[]) => list[PERSONS.indexOf(person as (typeof PERSONS)[number])]
  if (cell === 'par:pas') return `${stem}é`
  if (mood === 'ind' && tense === 'pre') return stem + end(['e', 'es', 'e', 'ons', 'ez', 'ent'])
  if (mood === 'ind' && tense === 'fut') return lemma + end(['ai', 'as', 'a', 'ons', 'ez', 'ont'])
  if (mood === 'ind' && tense === 'imp') return stem + end(['ais', 'ais', 'ait', 'ions', 'iez', 'aient'])
  if (mood === 'sub' && tense === 'pre') return stem + end(['e', 'es', 'e', 'ions', 'iez', 'ent'])
  return undefined
}

const TENSES = {
  'ind:pre': { label: 'présent', topic: 'present' },
  'ind:imp': { label: 'imparfait', topic: 'imparfait' },
  'ind:fut': { label: 'futur simple', topic: 'futur' },
  'sub:pre': { label: 'subjonctif', topic: 'subjonctif' },
} as const

/** Which persons get a card, per tense. */
const PICK: Record<keyof typeof TENSES, string[]> = {
  'ind:pre': ['1s', '1p', '3p'],
  'ind:imp': ['1p'],
  'ind:fut': ['1s'],
  'sub:pre': ['1s', '1p'],
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]+/gi, '-')
    .toLowerCase()

const cards: Card[] = []
const skipped: string[] = []

for (const { lemma } of verbs) {
  const forms = paradigm(lemma)
  const isEr = lemma.endsWith('er') && lemma !== 'aller'
  let made = 0

  for (const [tenseKey, tense] of Object.entries(TENSES) as [keyof typeof TENSES, (typeof TENSES)[keyof typeof TENSES]][]) {
    const row = PERSONS.map((p) => [p, forms.get(`${tenseKey}:${p}`)] as const).filter(([, f]) => f)
    if (!row.length) continue
    const line = row.map(([p, f]) => (tenseKey === 'sub:pre' ? withQue(p, f!) : withPronoun(p, f!))).join(', ')
    // Impersonal verbs (falloir, pleuvoir) only have il.
    const persons = forms.has(`${tenseKey}:1s`) ? PICK[tenseKey] : ['3s']

    for (const person of persons) {
      const cell = `${tenseKey}:${person}`
      const form = forms.get(cell)
      if (!form) continue
      const irregular = !isEr || form !== regularEr(lemma, cell)
      // Imparfait is only irregular for être; skip it for everything else.
      if (!irregular || (tenseKey === 'ind:imp' && lemma !== 'être')) continue
      const full = tenseKey === 'sub:pre' ? withQue(person, form) : withPronoun(person, form)
      cards.push({
        id: `cj-${slug(lemma)}-${tenseKey.replace(':', '-')}-${person}`,
        topic: isEr ? 'stammwechsel' : tense.topic,
        format: 'conjugate',
        task: `${lemma} · ${tense.label} · ${PRONOUN[person]}`,
        answer: form,
        accept: [full],
        note: `${tense.label[0].toUpperCase()}${tense.label.slice(1)} von ${lemma}: ${line}.`,
      })
      made++
    }
  }

  const pp = forms.get('par:pas')
  if (pp && (!isEr || pp !== regularEr(lemma, 'par:pas'))) {
    const impersonal = !forms.has('ind:pre:1s')
    const aux = ETRE_VERBS.has(lemma) ? `je suis ${pp}` : impersonal ? `il a ${pp}` : `j'ai ${pp}`
    cards.push({
      id: `cj-${slug(lemma)}-par-pas`,
      topic: 'passe-compose',
      format: 'conjugate',
      task: `${lemma} · participe passé`,
      answer: pp,
      note: `Passé composé: ${aux}${ETRE_VERBS.has(lemma) ? ' (mit être, Partizip wird angeglichen)' : ''}.`,
    })
    made++
  }
  if (!made) skipped.push(lemma)
}

const out = new URL('./out/drafts/', import.meta.url)
mkdirSync(out, { recursive: true })
writeFileSync(
  new URL('conjugations.json', out),
  JSON.stringify({ meta: { source: 'Lexique 3.83', verbs: verbs.length, created: new Date() }, cards }, null, 2),
)
console.log(`${cards.length} conjugate cards from ${verbs.length} verbs → pipeline/out/drafts/conjugations.json`)
if (skipped.length) console.log(`fully regular, no cards: ${skipped.join(', ')}`)
