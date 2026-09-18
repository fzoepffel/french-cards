/**
 * A deck is one language pair: the cards, the curriculum sections, and the
 * language the interface speaks. Decks live in their own files and are fetched
 * at startup, so the app ships one small bundle and only the chosen language's
 * cards come down the wire.
 */
import type { Section } from './data/topics'
import type { StudyCard } from './cards'

export type Pair = 'fr-de' | 'fr-en'

export interface Deck {
  pair: Pair
  /** The language being learned */
  target: string
  /** The language the interface and the prompts are in */
  ui: 'de' | 'en'
  sections: Section[]
  cards: StudyCard[]
}

export const PAIRS: { id: Pair; label: string }[] = [
  { id: 'fr-de', label: 'Deutsch' },
  { id: 'fr-en', label: 'English' },
]

const PAIR_KEY = 'neno.pair'

export function getPair(): Pair {
  // ?lang=en opens the English edition directly, and is remembered afterwards.
  const asked = new URLSearchParams(location.search).get('lang')
  if (asked === 'en' || asked === 'de') {
    const pair = `fr-${asked}` as Pair
    setPair(pair)
    return pair
  }
  try {
    const stored = localStorage.getItem(PAIR_KEY)
    if (stored && PAIRS.some((p) => p.id === stored)) return stored as Pair
  } catch {
    /* storage unavailable, fall through to the browser's language */
  }
  return navigator.language?.toLowerCase().startsWith('de') ? 'fr-de' : 'fr-en'
}

export function setPair(pair: Pair) {
  try {
    localStorage.setItem(PAIR_KEY, pair)
  } catch {
    /* storage unavailable, the choice just will not persist */
  }
}

declare const __DECK_VERSION__: string

export async function loadDeck(pair: Pair): Promise<Deck> {
  const url = `${import.meta.env.BASE_URL}decks/${pair}.json`
  // The version makes a changed deck a cache miss, so edits reach a device that
  // already holds an older copy. Offline, that copy is still the best answer.
  try {
    const fresh = await fetch(`${url}?v=${__DECK_VERSION__}`)
    if (fresh.ok) return (await fresh.json()) as Deck
  } catch {
    /* offline with a new app shell, fall back to whatever is cached */
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Deck ${pair} not found (${response.status})`)
  return (await response.json()) as Deck
}
