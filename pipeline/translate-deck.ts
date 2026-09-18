// Builds the English edition of a deck: French stays exactly as it is, the prompts
// and notes are rewritten for an English-speaking learner. Contrastive cards are not
// translated but replaced, because what trips up an English speaker is not what trips
// up a German one.
//
//   npm run cards:translate -- [--limit 200] [--only-contrastive] [--dry-run]
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import * as z from 'zod/v4'
import { checkCard, type Card } from '../scripts/card-rules.ts'

const { values } = parseArgs({
  options: {
    limit: { type: 'string', default: '99999' },
    batch: { type: 'string', default: '20' },
    concurrency: { type: 'string', default: '4' },
    'max-usd': { type: 'string', default: '45' },
    'dry-run': { type: 'boolean', default: false },
    'only-missing': { type: 'boolean', default: false },
  },
})

const src = new URL('../public/decks/fr-de.json', import.meta.url)
const out = new URL('../public/decks/fr-en.json', import.meta.url)
const deck = JSON.parse(readFileSync(src, 'utf8')) as {
  sections: { id: string; title: string; topics: { id: string; title: string }[] }[]
  cards: Card[]
}

/** Topics whose whole point is the contrast with German: these get new content, not a translation. */
const CONTRASTIVE = new Set(['genus-anders', 'falsche-freunde', 'verwechsel', 'anders-als-deutsch'])

const SECTION_TITLES: Record<string, string> = {
  nomen: 'Nouns and articles',
  adjektive: 'Adjectives and adverbs',
  pronomen: 'Pronouns',
  verbformen: 'Verb forms',
  gebrauch: 'Tenses and moods',
  rektion: 'With à, de or nothing',
  praepositionen: 'Prepositions',
  satzbau: 'Sentence structure',
  zahlen: 'Numbers, dates, time',
  wortschatz: 'Vocabulary',
  schreibung: 'Spelling and sound',
}

const TOPIC_TITLES: Record<string, string> = {
  'genus-endung': "Gender by ending",
  'genus-anders': "Gender you have to learn",
  'genus-bedeutung': "Gender changes the meaning",
  'plural': "Irregular plurals",
  'artikel': "Articles and partitives",
  'personen-feminin': "Feminine forms of people",
  'adj-feminin': "Irregular forms",
  'adj-stellung': "Position and meaning",
  'vergleich': "Comparison",
  'adverb-ment': "Adverbs in -ment",
  'objektpronomen': "Object pronouns",
  'y-en': "y and en",
  'betont': "Stressed pronouns",
  'relativ': "Relative pronouns",
  'possessiv-demonstrativ': "Possessive and demonstrative",
  'indefinit': "Indefinite pronouns",
  'stammwechsel': "Verbs with a spelling change",
  'present': "Pr\u00e9sent",
  'passe-compose': "Pass\u00e9 compos\u00e9",
  'imparfait': "Imparfait",
  'plus-que-parfait': "Plus-que-parfait",
  'futur': "Futur simple",
  'futur-proche': "Futur proche and pass\u00e9 r\u00e9cent",
  'futur-anterieur': "Futur ant\u00e9rieur",
  'conditionnel': "Conditionnel pr\u00e9sent",
  'conditionnel-passe': "Conditionnel pass\u00e9",
  'subjonctif': "Subjonctif pr\u00e9sent",
  'subjonctif-passe': "Subjonctif pass\u00e9",
  'imperatif': "Imp\u00e9ratif",
  'gerondif': "G\u00e9rondif and perfect infinitive",
  'passe-simple': "Pass\u00e9 simple (recognise it)",
  'hilfsverb': "\u00eatre or avoir",
  'accord': "Past participle agreement",
  'passiv': "Passive",
  'pronominal': "Pronominal verbs",
  'pc-imparfait': "Pass\u00e9 compos\u00e9 or imparfait",
  'si-saetze': "Si clauses",
  'subjonctif-ausloeser': "When to use subjonctif",
  'quand-futur': "quand + futur",
  'indirekte-rede': "Reported speech",
  'zeitangaben': "depuis, il y a, pendant",
  'faire-causatif': "faire and laisser + infinitive",
  'modalverben': "Modal verbs",
  'verb-praep': "Verb + preposition",
  'verb-a-qn-de': "\u00e0 qn de faire qc",
  'anders-als-deutsch': "Different from English",
  'adj-praep': "Adjective + preposition",
  'nomen-praep': "Noun + preposition",
  'orte': "Places and countries",
  'verkehrsmittel': "Getting around",
  'zeit-praep': "Time",
  'lage': "Position",
  'verneinung': "Negation",
  'fragen': "Questions",
  'hervorhebung': "Emphasis",
  'konnektoren': "Connectors",
  'zahlen': "Numbers",
  'datum-uhrzeit': "Dates and times",
  'grundwortschatz': "Core vocabulary",
  'wortfamilien': "Word families",
  'verwechsel': "Easily confused",
  'falsche-freunde': "False friends with English",
  'kollokationen': "Set phrases",
  'redewendungen': "Idioms",
  'register': "Register and slang",
  'homophone': "Words that sound alike",
  'elision-liaison': "Elision and liaison",
}

const Translated = z.object({
  cards: z.array(z.object({ id: z.string(), de: z.string(), fr: z.string(), task: z.string(), hint: z.string(), note: z.string() })),
})

const SYSTEM = `You localise flashcards for Neno, a French learning app. The cards were written for a German speaker; you are rewriting them for an English speaker at B1 level working towards B2.

The French side never changes: answers, options, accepted answers and the French sentence stay exactly as they are, including the gap marker ___ .

For each card, return:
- de: the prompt, now in English. It is what the learner reads before answering, so it must point to exactly this French answer. Disambiguate the way the German did, with a short hint in brackets where the English word is broader, e.g. "the page (in a book)".
- fr: unchanged, exactly as given. Copy it through.
- task: the instruction, now in English ("Put into the passive."), or empty if the card had none.
- hint: the cue, now in English ("prendre, passé composé"), or empty if the card had none. Grammar terms stay French: passé composé, subjonctif, imparfait.
- note: the explanation, now in English, and rewritten for an English speaker rather than translated. Where the German note compared with German, compare with English instead, or drop that comparison and explain the French rule on its own terms. Keep it to one or two short sentences. Never use dashes (— or –).

Return one entry per input card, same id, same order.`

const CONTRASTIVE_SYSTEM = `You write flashcards for Neno, a French learning app, for an English speaker at B1 level.

You receive cards that were written for German speakers and teach a contrast with German: genders that differ from German, German-French false friends, pairs Germans confuse, constructions that differ from German. Those contrasts mean nothing to an English speaker.

Replace each card with one that teaches the equivalent difficulty for an English speaker, in the same topic and the same format. You may and usually should change the French word or sentence:
- Gender: English has none, so teach the gender of common nouns whose article is worth memorising, with a hint about the ending where one exists.
- False friends: use French words that mislead English speakers (librairie, sensible, actuellement, assister, prétendre, rester, blesser).
- Easily confused: pairs English speakers mix up (savoir/connaître, an/année, visiter/rendre visite, apporter/emmener).
- Different from English: verbs whose complement differs from English (attendre with no preposition where English says wait for, chercher, écouter, payer, demander).

For each card return: de (the English prompt), fr (French sentence with ___ , or empty for translate cards), task, hint, answer (the French answer), options (for choose cards: two to four French fillers, one of them exactly the answer; empty array otherwise), note (one or two English sentences explaining the trap). Keep the format and the id you were given. Never use dashes (— or –).`

const Rewritten = z.object({
  cards: z.array(
    z.object({
      id: z.string(),
      de: z.string(),
      fr: z.string(),
      task: z.string(),
      hint: z.string(),
      answer: z.string(),
      /** For choose cards: the options, one of them the answer. Empty otherwise. */
      options: z.array(z.string()),
      note: z.string(),
    }),
  ),
})

const client = new Anthropic()
const usage = { input: 0, output: 0 }
const cost = () => (usage.input * 5 + usage.output * 25) / 1e6
const maxUsd = Number(values['max-usd'])
let stopped = false

async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (next < tasks.length) {
        const i = next++
        results[i] = await tasks[i]()
      }
    }),
  )
  return results
}

const clean = (c: Card) => ({
  id: c.id,
  format: c.format,
  topic: c.topic,
  de: c.de ?? '',
  fr: c.fr ?? '',
  task: c.task ?? '',
  hint: c.hint ?? '',
  answer: c.answer,
  note: c.note ?? '',
})

const existing: Card[] = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')).cards : []
const have = new Set(values['only-missing'] ? existing.map((c) => c.id) : [])
const todo = deck.cards.filter((c) => !have.has(c.id))
const plain = todo.filter((c) => !CONTRASTIVE.has(c.topic)).slice(0, Number(values.limit))
const contrastive = todo.filter((c) => CONTRASTIVE.has(c.topic)).slice(0, Number(values.limit))
console.log(`${plain.length} cards to localise, ${contrastive.length} to replace`)
if (values['dry-run']) process.exit(0)

const size = Number(values.batch)
const englishById = new Map<string, Card>()

async function ask<T extends z.ZodType>(system: string, cards: Card[], schema: T) {
  if (cost() > maxUsd) {
    stopped = true
    return null
  }
  const response = await client.beta.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: JSON.stringify(cards.map(clean), null, 1) }],
    output_config: { format: betaZodOutputFormat(schema) },
  })
  usage.input += response.usage.input_tokens
  usage.output += response.usage.output_tokens
  return response.parsed_output as z.infer<T> | null
}

const batches: Card[][] = []
for (let i = 0; i < plain.length; i += size) batches.push(plain.slice(i, i + size))
let done = 0

await pool(
  batches.map((batch) => async () => {
    const result = await ask(SYSTEM, batch, Translated).catch((e) => {
      console.warn(`  batch failed: ${e instanceof Error ? e.message : e}`)
      return null
    })
    done++
    if (done % 20 === 0 || done === batches.length) console.log(`  ${done}/${batches.length} batches · $${cost().toFixed(2)}`)
    if (!result) return
    for (const t of result.cards) {
      const original = deck.cards.find((c) => c.id === t.id)
      if (!original) continue
      const card: Card = {
        ...original,
        de: t.de || undefined,
        fr: original.fr,
        task: t.task || undefined,
        hint: t.hint || undefined,
        note: t.note,
      }
      if (!checkCard(card).length) englishById.set(card.id, card)
    }
  }),
  Number(values.concurrency),
)

const conBatches: Card[][] = []
for (let i = 0; i < contrastive.length; i += size) conBatches.push(contrastive.slice(i, i + size))
let conDone = 0
await pool(
  conBatches.map((batch) => async () => {
    const result = await ask(CONTRASTIVE_SYSTEM, batch, Rewritten).catch(() => null)
    conDone++
    if (conDone % 10 === 0 || conDone === conBatches.length) console.log(`  contrastive ${conDone}/${conBatches.length} · $${cost().toFixed(2)}`)
    if (!result) return
    for (const t of result.cards) {
      const original = deck.cards.find((c) => c.id === t.id)
      if (!original) continue
      const card: Card = {
        ...original,
        de: t.de || undefined,
        fr: t.fr || undefined,
        task: t.task || undefined,
        hint: t.hint || undefined,
        answer: t.answer || original.answer,
        options: t.options.length ? t.options : original.options,
        accept: undefined,
        note: t.note,
      }
      if (!checkCard(card).length) englishById.set(card.id, card)
    }
  }),
  Number(values.concurrency),
)

const cards = deck.cards.map((c) => englishById.get(c.id)).filter((c): c is Card => !!c)
const sections = deck.sections.map((s) => ({
  id: s.id,
  title: SECTION_TITLES[s.id] ?? s.title,
  topics: s.topics.map((t) => ({ id: t.id, title: TOPIC_TITLES[t.id] ?? t.title })),
}))

const previous = existsSync(out) ? (JSON.parse(readFileSync(out, 'utf8')).cards as Card[]) : []
const merged = new Map(previous.map((c) => [c.id, c]))
for (const c of cards) merged.set(c.id, c)

writeFileSync(
  out,
  JSON.stringify({ pair: 'fr-en', target: 'fr', ui: 'en', sections, cards: [...merged.values()] }),
)
console.log(`\n${merged.size} of ${deck.cards.length} cards in the English deck · about $${cost().toFixed(2)}`)
if (stopped) console.log(`Stopped at the --max-usd ${maxUsd} limit; run again to continue.`)
