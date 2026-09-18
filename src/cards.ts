import emoji from './data/emoji.json'
import type { Section } from './data/topics'

export type Format = 'translate' | 'gap' | 'conjugate' | 'rewrite' | 'choose' | 'fix' | 'sentence'

export interface StudyCard {
  id: string
  topic: string
  format: Format
  /** German prompt or meaning */
  de?: string
  /** French text: with ___ for gap/choose, the source for rewrite, the faulty sentence for fix */
  fr?: string
  /** Instruction, e.g. "venir · subjonctif · nous" or "Ins Passiv setzen." */
  task?: string
  hint?: string
  options?: string[]
  answer: string
  accept?: string[]
  note?: string
  /** Frequency rank for word cards, used by the placement check */
  rank?: number
}

export let CARDS: StudyCard[] = []
export let SECTIONS: Section[] = []
export let CARD_BY_ID = new Map<string, StudyCard>()
let TOPIC_BY_ID = new Map<string, { id: string; title: string }>()
export let TOPIC_ORDER: string[] = []

/** Installs the deck that was fetched for the chosen language pair. */
export function setDeck(cards: StudyCard[], sections: Section[]) {
  CARDS = cards
  SECTIONS = sections
  CARD_BY_ID = new Map(cards.map((c) => [c.id, c]))
  TOPIC_BY_ID = new Map(sections.flatMap((s) => s.topics.map((t) => [t.id, t] as const)))
  TOPIC_ORDER = sections.flatMap((s) => s.topics.map((t) => t.id))
}

export const FORMAT_LABEL: Record<Format, string> = {
  translate: 'Übersetzen',
  gap: 'Lücke',
  conjugate: 'Konjugieren',
  rewrite: 'Umformen',
  choose: 'Auswählen',
  fix: 'Fehler finden',
  sentence: 'Satz übersetzen',
}

export type Bucket = 'wort' | 'grammatik'

/** Words are plain translation cards; everything else counts as grammar. */
export function bucketOf(card: StudyCard): Bucket {
  return card.format === 'translate' ? 'wort' : 'grammatik'
}

export function topicTitle(card: StudyCard): string {
  return TOPIC_BY_ID.get(card.topic)?.title ?? card.topic
}

const HOOKS = emoji as Record<string, string>

const ARTICLES = /^(les|une|le|la|un|l'|s'|se)\s*/i

/** Splits "la mer" into its article and the word, for colouring the gender. */
export function splitArticle(answer: string): [article: string, rest: string] {
  const m = ARTICLES.exec(answer)
  if (!m) return ['', answer]
  return [m[0], answer.slice(m[0].length)]
}

export function genderOf(answer: string): 'm' | 'f' | null {
  const a = splitArticle(answer)[0].trim().toLowerCase()
  if (a === 'le' || a === 'un') return 'm'
  if (a === 'la' || a === 'une') return 'f'
  return null
}

/** A picture hook for concrete words. System emoji, so it costs no image files. */
export function hookFor(card: StudyCard): string | undefined {
  if (card.format !== 'translate') return undefined
  const word = splitArticle(card.answer)[1]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .toLowerCase()
    .trim()
  return HOOKS[word]
}

export function acceptedAnswers(card: StudyCard): string[] {
  return [card.answer, ...(card.accept ?? [])]
}

/** What to show as the solution: the gap filled in, or the answer itself. */
export function solution(card: StudyCard): string {
  return card.fr?.includes('___') ? card.fr.replace('___', card.answer) : card.answer
}
