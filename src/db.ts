import Dexie, { type EntityTable } from 'dexie'
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs'
import { CARDS, CARD_BY_ID, bucketOf, type Bucket, type StudyCard } from './cards'
import { SECTIONS, TOPIC_ORDER } from './data/topics'

export interface Progress {
  id: string
  fsrs: Card
  /** Local date (YYYY-MM-DD) the card was first studied */
  introduced: string
}

export interface ReviewEntry {
  n?: number
  id: string
  grade: Grade
  at: Date
}

// The database keeps its original name so existing progress survives the rename to Tessera.
export const db = new Dexie('cartes') as Dexie & {
  progress: EntityTable<Progress, 'id'>
  reviews: EntityTable<ReviewEntry, 'n'>
}

db.version(1).stores({
  progress: 'id, fsrs.due, introduced',
  reviews: '++n, id, at',
})

// enable_short_term: false means a card answered right is scheduled in days, not minutes, so a
// session is one pass through the queue. Missed cards are repeated by the review screen instead.
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false, request_retention: 0.9 }))

export function today(d = new Date()): string {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

export interface Limits {
  wort: number
  grammatik: number
}

const LIMITS_KEY = 'cartes.newPerDay.v2'
const DEFAULT_LIMITS: Limits = { wort: 10, grammatik: 5 }

export function getLimits(): Limits {
  try {
    return { ...DEFAULT_LIMITS, ...JSON.parse(localStorage.getItem(LIMITS_KEY) ?? '{}') }
  } catch {
    return DEFAULT_LIMITS
  }
}

export function setLimits(limits: Limits) {
  try {
    localStorage.setItem(LIMITS_KEY, JSON.stringify(limits))
  } catch {
    /* storage unavailable, keep defaults */
  }
}

const SKIP_KEY = 'cartes.skip'

export interface SkipSettings {
  /** Word cards up to this frequency rank are treated as known and never introduced */
  knownWordRank: number
  /** Topics the learner has marked as already known */
  topics: string[]
  /** Whether the placement check has run */
  placed: boolean
}

const DEFAULT_SKIP: SkipSettings = { knownWordRank: 0, topics: [], placed: false }

export function getSkip(): SkipSettings {
  try {
    return { ...DEFAULT_SKIP, ...JSON.parse(localStorage.getItem(SKIP_KEY) ?? '{}') }
  } catch {
    return DEFAULT_SKIP
  }
}

export function setSkip(skip: SkipSettings) {
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify(skip))
  } catch {
    /* storage unavailable, keep defaults */
  }
}

export function toggleTopicSkip(topic: string): SkipSettings {
  const skip = getSkip()
  const topics = skip.topics.includes(topic) ? skip.topics.filter((t) => t !== topic) : [...skip.topics, topic]
  const next = { ...skip, topics }
  setSkip(next)
  return next
}

/** A card is out of the rotation when its topic is skipped or it is below the placement rank. */
export function isSkipped(card: StudyCard, skip = getSkip()): boolean {
  if (skip.topics.includes(card.topic)) return true
  return card.rank !== undefined && card.rank <= skip.knownWordRank
}

export interface TopicProgress {
  seen: number
  total: number
  due: number
}

export interface Stats {
  due: number
  /** Cards answered today, for the daily ring */
  doneToday: number
  newLeft: Limits
  learned: number
  total: number
  topics: Map<string, TopicProgress>
}

const isDue = (p: Progress, now: number) => new Date(p.fsrs.due).getTime() <= now

export async function stats(): Promise<Stats> {
  const all = (await db.progress.toArray()).filter((p) => CARD_BY_ID.has(p.id))
  const now = Date.now()
  const t = today()
  const limits = getLimits()
  const seen = new Set(all.map((p) => p.id))

  const introducedToday: Limits = { wort: 0, grammatik: 0 }
  for (const p of all) if (p.introduced === t) introducedToday[bucketOf(CARD_BY_ID.get(p.id)!)]++
  const skip = getSkip()
  const unseen: Limits = { wort: 0, grammatik: 0 }
  for (const c of CARDS) if (!seen.has(c.id) && !isSkipped(c, skip)) unseen[bucketOf(c)]++
  const left = (b: Bucket) => Math.max(0, Math.min(unseen[b], limits[b] - introducedToday[b]))

  const topics = new Map<string, TopicProgress>(TOPIC_ORDER.map((id) => [id, { seen: 0, total: 0, due: 0 }]))
  const byId = new Map(all.map((p) => [p.id, p]))
  for (const c of CARDS) {
    const tp = topics.get(c.topic)
    if (!tp || isSkipped(c, skip)) continue
    tp.total++
    const p = byId.get(c.id)
    if (p) {
      tp.seen++
      if (isDue(p, now)) tp.due++
    }
  }

  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const doneToday = await db.reviews.where('at').aboveOrEqual(midnight).count()

  return {
    due: all.filter((p) => isDue(p, now)).length,
    doneToday,
    newLeft: { wort: left('wort'), grammatik: left('grammatik') },
    learned: all.length,
    total: CARDS.length,
    topics,
  }
}

/** Round-robin over lists: first item of each, then second of each, … */
function rotate<T>(lists: T[][]): T[] {
  const out: T[] = []
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const l of lists) if (i < l.length) out.push(l[i])
  }
  return out
}

/**
 * Orders new grammar cards so each day touches different sections, and within
 * a section different topics: nouns, pronouns, tenses, … rather than all nouns first.
 */
function spread(cards: StudyCard[]): StudyCard[] {
  return rotate(
    SECTIONS.map((section) => rotate(section.topics.map((t) => cards.filter((c) => c.topic === t.id)))),
  )
}

/**
 * Daily queue: due reviews first (oldest first), then today's new words and new
 * grammar mixed. With a topic, only that topic, and up to 10 new cards regardless
 * of the daily limits.
 */
export async function buildQueue(topic?: string): Promise<StudyCard[]> {
  const all = (await db.progress.toArray()).filter((p) => CARD_BY_ID.has(p.id))
  const seen = new Set(all.map((p) => p.id))
  const now = Date.now()
  const inScope = (c: StudyCard) => !topic || c.topic === topic

  const due = all
    .filter((p) => isDue(p, now))
    .sort((a, b) => new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime())
    .map((p) => CARD_BY_ID.get(p.id)!)
    .filter(inScope)

  const skip = getSkip()
  const unseen = CARDS.filter((c) => !seen.has(c.id) && inScope(c) && !isSkipped(c, skip))
  if (topic) return [...due, ...unseen.slice(0, 10)]

  const { newLeft } = await stats()
  const words = spread(unseen.filter((c) => bucketOf(c) === 'wort')).slice(0, newLeft.wort)
  const grammar = spread(unseen.filter((c) => bucketOf(c) === 'grammatik')).slice(0, newLeft.grammatik)
  return [...due, ...rotate([words, grammar])]
}

export interface Band {
  from: number
  to: number
  cards: StudyCard[]
}

/**
 * Word cards grouped into frequency bands for the placement check, easiest first.
 * Each band offers a random sample, so a repeat run does not ask the same words.
 */
export function placementBands(size = 500, perBand = 6): Band[] {
  const words = CARDS.filter((c) => c.rank !== undefined)
  if (!words.length) return []
  const max = Math.max(...words.map((c) => c.rank!))
  const bands: Band[] = []
  for (let from = 0; from < max; from += size) {
    const to = from + size
    const inBand = words.filter((c) => c.rank! > from && c.rank! <= to)
    if (inBand.length < perBand) continue
    const sample = [...inBand].sort(() => Math.random() - 0.5).slice(0, perBand)
    bands.push({ from, to, cards: sample })
  }
  return bands
}

/** Records a grade and returns when the card is due next. */
export async function grade(id: string, g: Grade): Promise<Date> {
  const now = new Date()
  const existing = await db.progress.get(id)
  const current: Card = existing?.fsrs ?? createEmptyCard<Card>(now)
  const { card } = scheduler.next(current, now, g)
  await db.transaction('rw', db.progress, db.reviews, async () => {
    await db.progress.put({ id, fsrs: card, introduced: existing?.introduced ?? today(now) })
    await db.reviews.add({ id, grade: g, at: now })
  })
  return card.due
}

const PALETTE_KEY = 'cartes.palette'
export type Palette = 'abricot' | 'pistache' | 'framboise' | 'bleu'
export const PALETTES: { id: Palette; label: string }[] = [
  { id: 'abricot', label: 'Abricot' },
  { id: 'pistache', label: 'Pistache' },
  { id: 'framboise', label: 'Framboise' },
  { id: 'bleu', label: 'Bleu' },
]

export function getPalette(): Palette {
  try {
    const p = localStorage.getItem(PALETTE_KEY) as Palette | null
    return p && PALETTES.some((x) => x.id === p) ? p : 'abricot'
  } catch {
    return 'abricot'
  }
}

export function applyPalette(palette: Palette) {
  try {
    localStorage.setItem(PALETTE_KEY, palette)
  } catch {
    /* storage unavailable, the choice just will not persist */
  }
  // 'bleu' is the original palette, which lives on :root without an attribute
  const root = document.documentElement
  if (palette === 'bleu') root.removeAttribute('data-palette')
  else root.setAttribute('data-palette', palette)
}

const THEME_KEY = 'cartes.theme'
export type Theme = 'system' | 'light' | 'dark'

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* storage unavailable, the choice just will not persist */
  }
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

/** Days in a row with at least one answer. Today only counts once you have started. */
export async function streak(): Promise<number> {
  const recent = await db.reviews.orderBy('at').reverse().limit(1500).toArray()
  const days = new Set(recent.map((r) => today(new Date(r.at))))
  const day = new Date()
  if (!days.has(today(day))) day.setDate(day.getDate() - 1)
  let n = 0
  while (days.has(today(day))) {
    n++
    day.setDate(day.getDate() - 1)
  }
  return n
}

/** How many cards will be waiting tomorrow, for the end-of-round screen. */
export async function dueTomorrow(): Promise<number> {
  const end = new Date()
  end.setDate(end.getDate() + 1)
  end.setHours(23, 59, 59, 999)
  const all = await db.progress.toArray()
  return all.filter((p) => CARD_BY_ID.has(p.id) && new Date(p.fsrs.due).getTime() <= end.getTime()).length
}

/** German wording for how far away a due date is, for the grade buttons. */
export function whenAgain(due: Date, now = new Date()): string {
  const minutes = Math.round((due.getTime() - now.getTime()) / 60000)
  if (minutes < 60) return `in ${Math.max(1, minutes)} min`
  const days = Math.round(minutes / (60 * 24))
  if (days <= 0) return 'später heute'
  if (days === 1) return 'morgen'
  if (days < 31) return `in ${days} Tagen`
  const months = Math.round(days / 30)
  return months < 12 ? `in ${months} Monaten` : `in ${Math.round(days / 365)} Jahren`
}

/** What each grade would do to this card, so the buttons can say when it comes back. */
export async function preview(id: string): Promise<Record<Grade, string>> {
  const now = new Date()
  const existing = await db.progress.get(id)
  const current: Card = existing?.fsrs ?? createEmptyCard<Card>(now)
  const log = scheduler.repeat(current, now)
  const out = {} as Record<Grade, string>
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    out[g] = whenAgain(log[g].card.due, now)
  }
  return out
}

/** How many cards a topic would take out of the rotation. */
export function cardsInTopic(topic: string): number {
  return CARDS.filter((c) => c.topic === topic).length
}

/** Word cards at or below a frequency rank, for the placement summary. */
export function wordsUpToRank(rank: number): number {
  return CARDS.filter((c) => c.rank !== undefined && c.rank <= rank).length
}

export async function resetProgress(): Promise<void> {
  await db.transaction('rw', db.progress, db.reviews, async () => {
    await db.progress.clear()
    await db.reviews.clear()
  })
}

export async function exportBackup(): Promise<string> {
  const [progress, reviews] = await Promise.all([db.progress.toArray(), db.reviews.toArray()])
  return JSON.stringify({ app: 'cartes', version: 1, exported: new Date(), progress, reviews })
}

export async function importBackup(json: string): Promise<number> {
  const data = JSON.parse(json)
  if (data?.app !== 'cartes' || !Array.isArray(data.progress)) throw new Error('Das ist keine Tessera-Sicherung')
  const revive = (p: Progress): Progress => ({
    ...p,
    fsrs: {
      ...p.fsrs,
      due: new Date(p.fsrs.due),
      last_review: p.fsrs.last_review ? new Date(p.fsrs.last_review) : undefined,
    },
  })
  await db.transaction('rw', db.progress, db.reviews, async () => {
    await db.progress.clear()
    await db.reviews.clear()
    await db.progress.bulkPut(data.progress.map(revive))
    await db.reviews.bulkAdd(
      (data.reviews ?? []).map(({ n: _n, ...r }: ReviewEntry) => ({ ...r, at: new Date(r.at) })),
    )
  })
  return data.progress.length
}
