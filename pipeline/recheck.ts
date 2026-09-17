// Re-runs the checks on existing word drafts after a rule change, and repairs what it safely can:
// answers written as l'X lose the gender, so they become un X or une X when Lexique knows the gender.
// Usage: npm run cards:recheck -- pipeline/out/drafts/FILE.json [...]
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { checkCard, sameWord, type Card } from '../scripts/card-rules.ts'
import { buildWordlist, loadRows } from './lexique.ts'

const { positionals } = parseArgs({ allowPositionals: true })
if (!positionals.length) {
  console.error('Usage: recheck.ts DRAFT.json [...]')
  process.exit(1)
}

const byLemma = new Map(buildWordlist(loadRows()).map((l) => [`${l.lemma}|${l.pos}`, l]))
type Draft = Card & { status: string; issues: string[]; lemma?: string; rank?: number }

for (const file of positionals) {
  const draft = JSON.parse(readFileSync(file, 'utf8')) as { meta: Record<string, unknown>; cards: Draft[] }
  let repaired = 0
  for (const card of draft.cards) {
    if (card.format !== 'translate') continue
    const source = byLemma.get(`${card.lemma}|NOM`)
    const issues: string[] = []

    if (/^l'/i.test(card.answer) && source?.genders.length === 1) {
      card.answer = `${source.genders[0] === 'm' ? 'un' : 'une'} ${card.answer.slice(2)}`
      repaired++
    }
    if (source && source.genders.length === 1) {
      const article = card.answer.split(/\s|'/)[0].toLowerCase()
      const wrong = source.genders[0] === 'm' ? ['la', 'une'] : ['le', 'un']
      if (wrong.includes(article)) issues.push(`article "${article}" but Lexique gender is ${source.genders[0]}`)
    }
    if (/^l'/i.test(card.answer)) issues.push("answer uses l', gender not visible")
    if (card.lemma && !sameWord(card.answer, card.lemma)) issues.push(`answer differs from lemma "${card.lemma}"`)
    issues.push(...checkCard(card))

    card.issues = issues
    card.status = issues.length ? 'flagged' : 'draft'
  }
  writeFileSync(file, JSON.stringify(draft, null, 2))
  const flagged = draft.cards.filter((c) => c.status === 'flagged')
  console.log(`${file}: ${draft.cards.length} cards, ${flagged.length} flagged, ${repaired} answers repaired`)
  for (const c of flagged.slice(0, 15)) console.log(`  ${c.lemma} → ${c.answer}: ${c.issues.join('; ')}`)
}
