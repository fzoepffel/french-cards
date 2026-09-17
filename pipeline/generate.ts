// Drafts new cards with Claude. Drafts land in pipeline/out/drafts/ for spot-checking;
// nothing touches the app until you run cards:import.
//
//   npm run cards:generate -- words --from 1500 --count 40
//   npm run cards:generate -- topic --topic subjonctif-ausloeser --count 12
//   npm run cards:generate -- topics --count 12 --concurrency 4 --max-usd 40
//
// Add --dry-run to print the prompt without calling the API.
// Needs ANTHROPIC_API_KEY in .env (see .env.example).
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import * as z from 'zod/v4'
import { FORMATS, checkCard, dedupeKey, headword, sameWord, type Card } from '../scripts/card-rules.ts'
import { SECTIONS } from '../src/data/topics.ts'
import { buildWordlist, loadRows, type Lemma } from './lexique.ts'

const MODEL = 'claude-opus-5'
// Claude Opus 5 list prices in USD per million tokens, for the cost report.
const PRICE = { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 }

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    from: { type: 'string', default: '1' },
    count: { type: 'string', default: '20' },
    batch: { type: 'string', default: '20' },
    topic: { type: 'string' },
    concurrency: { type: 'string', default: '1' },
    'max-usd': { type: 'string', default: '10' },
    'dry-run': { type: 'boolean', default: false },
  },
})
const mode = positionals[0]
if (mode !== 'words' && mode !== 'topic' && mode !== 'topics') {
  console.error('Usage: generate.ts words --from N --count N | topic --topic ID --count N | topics --count N')
  console.error('Options: --batch N --concurrency N --max-usd N --dry-run')
  process.exit(1)
}
const maxUsd = Number(values['max-usd'])

const root = new URL('../', import.meta.url)
const draftsDir = new URL('./out/drafts/', import.meta.url)
mkdirSync(draftsDir, { recursive: true })

type DraftCard = Card & { status: 'draft' | 'flagged'; issues: string[]; lemma?: string; rank?: number }
interface DraftFile {
  meta: Record<string, unknown> & { lemmas?: string[] }
  cards: DraftCard[]
}

const deck: Card[] = JSON.parse(readFileSync(new URL('src/data/cards.json', root), 'utf8'))
const drafts: DraftFile[] = readdirSync(draftsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, draftsDir), 'utf8')))
const known = [...deck, ...drafts.flatMap((d) => d.cards)]
const knownIds = new Set(known.map((c) => c.id))
const knownKeys = new Map(known.map((c) => [dedupeKey(c), c.id]))

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28)

function uniqueId(base: string): string {
  let id = base
  for (let n = 2; knownIds.has(id); n++) id = `${base}-${n}`
  knownIds.add(id)
  return id
}

const INTRO = `You write flashcards for Neno, a French learning app. The learner is a native German speaker at B1 level working towards B2. Each card shows German on the front. The learner types the French answer, and a short German note appears afterwards.

Write all German text in plain sentences. Never use dashes (— or –) as punctuation in German text.`

// ---------------------------------------------------------------- words

const WORD_SYSTEM = `${INTRO}

You receive words from the Lexique frequency database: lemma, part of speech, and for nouns the gender Lexique records ("m/f" means either). Write one translate card per word.

de: The German prompt. It must lead to exactly this French word, so disambiguate when the German is broader or the French word has several senses, with a short hint in parentheses, e.g. "die Seite (im Buch)". Nouns carry their German article. Verbs in the infinitive, adjectives in the base form.

answer: The French answer.
- Nouns take an article. Use le or la before a consonant or h aspiré. Before a vowel or h muet use un or une, because l' would hide the gender. Nouns normally used in the plural take les.
- If Lexique says m/f, decide from the sense you chose in de. If the gender changes the meaning (le livre, la livre), pick one sense and use topic genus-bedeutung.
- Lexique spells œ as oe (coeur). Always write correct French spelling (cœur).
- Verbs: infinitive, pronominal verbs with se or s'. Adjectives: masculine singular. Adverbs as they are.

accept: Other answers that are equally correct for this German prompt, such as true synonyms or spelling variants. Usually empty, never more than three.

note: One or two short German sentences that help remember or use the word. Choose what matters most for a German speaker: the gender when it differs from German or is not guessable from the ending; irregular feminine or plural forms (beau, belle; travail, travaux); the construction a verb takes (penser à qn, se souvenir de qc, aider qn); a false friend; register (umgangssprachlich, gehoben); a very common collocation. Do not just repeat the translation.

topic:
- genus-anders: the German noun is masculine and the French one feminine, or the other way round (der Zahn, la dent). German neuter nouns never count.
- falsche-freunde: the French word looks like a German word but means something else.
- genus-bedeutung: the noun's meaning depends on its gender.
- grundwortschatz: everything else.

skip: true, with a short skip_reason and empty other fields, only for proper names, abbreviations, interjections, function words, or Lexique errors. Otherwise false with an empty skip_reason.

Return exactly one entry per input word, in the input order.`

const WordOutput = z.object({
  cards: z.array(
    z.object({
      lemma: z.string(),
      skip: z.boolean(),
      skip_reason: z.string(),
      topic: z.enum(['grundwortschatz', 'genus-anders', 'falsche-freunde', 'genus-bedeutung']),
      de: z.string(),
      answer: z.string(),
      accept: z.array(z.string()),
      note: z.string(),
    }),
  ),
})

// ---------------------------------------------------------------- topics

const FORMAT_GUIDE = `Formats:
- gap: de is the German translation of the whole sentence. fr is the French sentence with exactly one ___ where the answer goes. answer is only the missing part. hint is an optional cue such as "prendre, passé composé", otherwise empty.
- choose: de is the German sentence. fr is the French sentence with one ___. options holds 2 to 4 French fillers, exactly one correct, the others typical mistakes. answer is the correct option, character for character.
- rewrite: fr is the French source sentence. task is a short German instruction such as "Ins Passiv setzen.". answer is the rewritten sentence.
- fix: de is the German meaning. fr is a French sentence with exactly one typical mistake. answer is the corrected sentence.
- sentence: de is a German sentence to translate. answer is the most natural French translation, accept holds other natural translations.
- conjugate: task is "verb · tense · pronoun", e.g. "venir · subjonctif · nous". answer is the form only, accept holds the form with its pronoun.
- translate: de is a German word or expression. answer is the French, nouns with article.`

const TOPIC_SYSTEM = `${INTRO}

You write cards that teach one grammar or vocabulary topic through natural, everyday sentences.

${FORMAT_GUIDE}

Rules for every card:
- note: one or two German sentences that state the rule or the reason, so the card teaches and does not only test.
- accept: other fully correct answers, empty if there are none.
- Fields a format does not use are empty strings or empty arrays.
- French sentences use normal capitalisation and French punctuation, with a space before ? and !.
- Cover different aspects of the topic and different verbs and nouns. Include the cases where German speakers typically go wrong.
- Mix at least three formats when the topic allows it.
- Never repeat a sentence or test the same thing as one of the existing cards.`

const TopicOutput = z.object({
  cards: z.array(
    z.object({
      format: z.enum(FORMATS),
      de: z.string(),
      fr: z.string(),
      task: z.string(),
      hint: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
      accept: z.array(z.string()),
      note: z.string(),
    }),
  ),
})

// ---------------------------------------------------------------- API

const client = new Anthropic()
const usage = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 }
let budgetHit = false

/** Runs tasks with a fixed number in flight, keeping the results in input order. */
async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const i = next++
      results[i] = await tasks[i]()
    }
  })
  await Promise.all(workers)
  return results
}
const cost = () =>
  (usage.input * PRICE.input + usage.output * PRICE.output + usage.cacheWrite * PRICE.cacheWrite + usage.cacheRead * PRICE.cacheRead) /
  1e6

async function ask<T extends z.ZodType>(system: string, user: string, schema: T): Promise<z.infer<T> | null> {
  if (values['dry-run']) {
    console.log(`\n--- system ---\n${system}\n\n--- user ---\n${user}\n`)
    return null
  }
  if (cost() > maxUsd) {
    budgetHit = true
    return null
  }
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: user }],
    output_config: { format: betaZodOutputFormat(schema) },
  })
  usage.input += response.usage.input_tokens
  usage.output += response.usage.output_tokens
  usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0
  usage.cacheRead += response.usage.cache_read_input_tokens ?? 0

  if (response.stop_reason === 'refusal') {
    console.warn('  Request declined, batch skipped.')
    return null
  }
  if (response.stop_reason === 'max_tokens') {
    console.warn('  Output hit max_tokens, batch skipped. Rerun with a smaller --batch.')
    return null
  }
  return response.parsed_output ?? null
}

function finish(card: DraftCard): DraftCard | null {
  const key = dedupeKey(card)
  if (knownKeys.has(key)) {
    console.warn(`  duplicate of ${knownKeys.get(key)}, dropped: ${card.answer}`)
    return null
  }
  knownKeys.set(key, card.id)
  card.issues.push(...checkCard(card))
  card.status = card.issues.length ? 'flagged' : 'draft'
  return card
}

const clean = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && !(Array.isArray(v) && v.length === 0))) as T

async function words(): Promise<DraftFile> {
  const from = Number(values.from)
  const count = Number(values.count)
  const batchSize = Number(values.batch)
  const have = new Set([
    ...known.filter((c) => c.format === 'translate').map((c) => headword(c.answer)),
    ...drafts.flatMap((d) => d.meta.lemmas ?? []).map(headword),
  ])
  const list = buildWordlist(loadRows())
    .filter((l) => l.rank >= from && !have.has(headword(l.lemma)))
    .slice(0, count)

  const cards: DraftCard[] = []
  const skipped: string[] = []
  const batches: Lemma[][] = []
  for (let i = 0; i < list.length; i += batchSize) batches.push(list.slice(i, i + batchSize))

  let done = 0
  const outputs = await pool(
    batches.map((batch) => async () => {
      const input = batch.map((l) => ({ lemma: l.lemma, pos: l.pos, gender: l.genders.join('/') || undefined }))
      const out = await ask(WORD_SYSTEM, JSON.stringify(input, null, 1), WordOutput).catch((e) => {
        console.warn(`  words ${batch[0].rank}: ${e instanceof Error ? e.message : e}`)
        return null
      })
      console.log(`words ${batch[0].rank}–${batch.at(-1)!.rank} done (${++done}/${batches.length}, $${cost().toFixed(2)})`)
      return out
    }),
    Number(values.concurrency),
  )

  for (const [b, out] of outputs.entries()) {
    if (!out) continue
    const batch = batches[b]
    for (const [j, w] of out.cards.entries()) {
      const source: Lemma | undefined = batch.find((l) => l.lemma === w.lemma) ?? batch[j]
      if (w.skip) {
        skipped.push(`${w.lemma}: ${w.skip_reason}`)
        continue
      }
      const issues: string[] = []
      if (source?.pos === 'NOM' && source.genders.length === 1) {
        const article = w.answer.split(/\s|'/)[0].toLowerCase()
        const wrong = source.genders[0] === 'm' ? ['la', 'une'] : ['le', 'un']
        if (wrong.includes(article)) issues.push(`article "${article}" but Lexique gender is ${source.genders[0]}`)
      }
      if (/^l'/i.test(w.answer)) issues.push("answer uses l', gender not visible")
      if (source && !sameWord(w.answer, source.lemma)) issues.push(`answer differs from lemma "${source.lemma}"`)
      const card = finish({
        ...clean({ de: w.de, answer: w.answer, accept: w.accept, note: w.note }),
        id: uniqueId(`w-${slug(headword(w.answer))}`),
        topic: w.topic,
        format: 'translate',
        lemma: source?.lemma,
        rank: source?.rank,
        status: 'draft',
        issues,
      } as DraftCard)
      if (card) cards.push(card)
    }
  }
  return { meta: { mode: 'words', from, count, lemmas: list.map((l) => l.lemma), skipped }, cards }
}

function topicPrompt(id: string, n: number, extra: Card[]): string {
  const section = SECTIONS.find((sec) => sec.topics.some((t) => t.id === id))
  const title = section?.topics.find((t) => t.id === id)?.title
  if (!section || !title) throw new Error(`Unknown topic "${id}". See src/data/topics.ts`)
  const curriculum = readFileSync(new URL('CURRICULUM.md', root), 'utf8')
  const description =
    curriculum
      .split('\n')
      .find((l) => l.includes(`\`${id}\``))
      ?.replace(/^- `[^`]+`\s*/, '') ?? ''
  const existing = [...known, ...extra]
    .filter((c) => c.topic === id)
    // Verb-form cards are generated from Lexique; showing hundreds of them wastes context.
    .filter((c) => c.format !== 'conjugate' || !c.id.startsWith('cj-'))
    .slice(0, 40)
    .map(({ id: _id, topic: _t, ...c }) => clean(c as Record<string, unknown>))

  return `Topic: ${title} (section: ${section.title})
What it covers: ${description}

Existing cards for this topic:
${JSON.stringify(existing, null, 1)}

Write ${n} new cards for this topic.`
}

/** One request per topic, run in parallel; results are processed in topic order. */
async function topics(ids: string[]): Promise<DraftFile> {
  const per = Number(values.count)
  const batchSize = Math.min(Number(values.batch), 15)
  const cards: DraftCard[] = []

  for (let offset = 0; offset < per; offset += batchSize) {
    const n = Math.min(batchSize, per - offset)
    let done = 0
    const outputs = await pool(
      ids.map((id) => async () => {
        const out = await ask(TOPIC_SYSTEM, topicPrompt(id, n, cards), TopicOutput).catch((e) => {
          console.warn(`  ${id}: ${e instanceof Error ? e.message : e}`)
          return null
        })
        console.log(`${id} done (${++done}/${ids.length}, $${cost().toFixed(2)})`)
        return { id, out }
      }),
      Number(values.concurrency),
    )

    for (const { id, out } of outputs) {
      if (!out) continue
      for (const c of out.cards) {
        const card = finish({
          ...clean(c),
          id: uniqueId(`${id}-${slug(c.answer)}`),
          topic: id,
          status: 'draft',
          issues: [],
        } as DraftCard)
        if (card) cards.push(card)
      }
    }
  }
  return { meta: { mode: ids.length === 1 ? 'topic' : 'topics', topics: ids, perTopic: per }, cards }
}

// ---------------------------------------------------------------- run

let result: DraftFile | undefined
try {
  const topicIds = SECTIONS.flatMap((sec) => sec.topics.map((t) => t.id))
  result =
    mode === 'words' ? await words() : mode === 'topic' ? await topics([values.topic ?? '']) : await topics(topicIds)
} catch (error) {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error('Authentication failed. Put a valid ANTHROPIC_API_KEY in .env (see .env.example).')
  } else if (error instanceof Anthropic.RateLimitError) {
    console.error('Rate limited after retries. Wait a minute and rerun; finished batches were not saved.')
  } else if (error instanceof Anthropic.APIError) {
    console.error(`API error ${error.status}: ${error.message}`)
  } else {
    throw error
  }
  process.exitCode = 1
}

if (result && !values['dry-run']) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
  const name =
    mode === 'words' ? `${stamp}-words-${values.from}.json` : mode === 'topic' ? `${stamp}-topic-${values.topic}.json` : `${stamp}-topics.json`
  result.meta = { ...result.meta, model: MODEL, created: new Date(), usage, costUSD: Number(cost().toFixed(4)) }
  const path = new URL(name, draftsDir)
  if (existsSync(path)) throw new Error(`${name} exists`)
  writeFileSync(path, JSON.stringify(result, null, 2))
  const flagged = result.cards.filter((c) => c.status === 'flagged').length
  console.log(
    `\n${result.cards.length} cards (${flagged} flagged) → pipeline/out/drafts/${name}` +
      `\ntokens in ${usage.input}, out ${usage.output} · about $${cost().toFixed(2)}` +
      (budgetHit ? `\nStopped early: --max-usd ${maxUsd} reached.` : ''),
  )
}
