import raw from './data/cards.json'
import { TOPIC_BY_ID } from './data/topics'

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

export const CARDS = raw as StudyCard[]

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]))

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

export function acceptedAnswers(card: StudyCard): string[] {
  return [card.answer, ...(card.accept ?? [])]
}

/** What to show as the solution: the gap filled in, or the answer itself. */
export function solution(card: StudyCard): string {
  return card.fr?.includes('___') ? card.fr.replace('___', card.answer) : card.answer
}
