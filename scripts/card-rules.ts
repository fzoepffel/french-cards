// Shared card checks, used by the validator and the content pipeline.
// Topics live in the deck files now, so they are read from the German deck,
// which is the source the other editions are built from.
import { readFileSync } from 'node:fs'

interface Section {
  id: string
  title: string
  topics: { id: string; title: string }[]
}

export const SECTIONS: Section[] = JSON.parse(
  readFileSync(new URL('../public/decks/fr-de.json', import.meta.url), 'utf8'),
).sections

export const FORMATS = ['translate', 'gap', 'conjugate', 'rewrite', 'choose', 'fix', 'sentence'] as const
export type Format = (typeof FORMATS)[number]

export interface Card {
  id: string
  topic: string
  format: Format
  de?: string
  fr?: string
  task?: string
  hint?: string
  options?: string[]
  answer: string
  accept?: string[]
  note?: string
  /** Frequency rank for word cards, used by the placement check */
  rank?: number
}

export const TOPIC_IDS = SECTIONS.flatMap((s) => s.topics.map((t) => t.id))
const topics = new Set(TOPIC_IDS)
const formats = new Set<string>(FORMATS)

/** Returns a list of problems; empty means the card is fine. */
export function checkCard(c: Card): string[] {
  const problems: string[] = []
  const p = (msg: string) => problems.push(msg)
  if (!c.id) p('missing id')
  if (!topics.has(c.topic)) p(`unknown topic "${c.topic}"`)
  if (!formats.has(c.format)) p(`unknown format "${c.format}"`)
  if (!c.answer) p('missing answer')
  if (!c.note) p('missing note')
  if (/[—–]/.test(`${c.note ?? ''}${c.de ?? ''}${c.task ?? ''}`)) p('dash in German text')

  const gaps = (c.fr ?? '').split('___').length - 1
  switch (c.format) {
    case 'translate':
    case 'sentence':
      if (!c.de) p(`${c.format} needs de`)
      break
    case 'gap':
      if (gaps !== 1) p('gap needs exactly one ___ in fr')
      break
    case 'conjugate':
      if (!c.task) p('conjugate needs task')
      break
    case 'rewrite':
      if (!c.fr || !c.task) p('rewrite needs fr and task')
      break
    case 'fix':
      if (!c.fr) p('fix needs fr')
      if (c.fr === c.answer) p('fix: fr is already correct')
      break
    case 'choose':
      if (!Array.isArray(c.options) || c.options.length < 2) p('choose needs 2+ options')
      else if (!c.options.includes(c.answer)) p('choose: answer not among options')
      if (gaps > 1) p('choose allows at most one ___')
      if (!gaps && !c.task) p('choose without ___ needs task')
      break
  }
  return problems
}

const strip = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[?!.,;:«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Two cards that ask the same thing in the same way count as duplicates. */
export function dedupeKey(c: Card): string {
  // A verb form is the same card whatever German gloss it carries.
  const de = c.format === 'conjugate' ? '' : strip(c.de ?? '')
  return [c.format, de, strip(c.fr ?? ''), strip(c.task ?? ''), strip(c.answer)].join('|')
}

/**
 * The French headword of a translate card: "la mer" → "mer", "une expérience" → "expérience".
 * The article only counts when it is a separate word, so "lapin" stays "lapin".
 */
export function headword(answer: string): string {
  return strip(answer)
    .replace(/œ/g, 'oe')
    .replace(/^(?:(?:les|une|le|la|un|se)\s+|(?:l'|s'))/, '')
}

/** Same word ignoring singular/plural, for comparing an answer with its dictionary lemma. */
export function sameWord(a: string, b: string): boolean {
  const base = (s: string) => headword(s).replace(/s$/, '')
  return base(a) === base(b)
}
