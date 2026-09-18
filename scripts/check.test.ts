import { check } from '../src/check.ts'
const cases: [string, string, string][] = [
  // the case from the app: a missing letter is a grammar mistake, not a typo
  ["je l'ai vu hier", "Je l'ai vue hier.", 'wrong'],
  ['la chaisse', 'la chaise', 'wrong'],          // extra letter
  ['avons prs', 'avons pris', 'wrong'],          // missing letter
  ['la chaose', 'la chaise', 'typo'],            // one key off
  ['la chiase', 'la chaise', 'typo'],            // two letters swapped round
  ['le pont', 'le port', 'wrong'],               // short word, no tolerance
  ['le probleme', 'le problème', 'accent'],
  ['la mer', 'la mer', 'correct'],
  ['La Mer.', 'la mer', 'correct'],
  ["Je n'en ai plus envie", "Je n'en ai plus envie.", 'correct'],
  ['je nen ai plus envie', "Je n'en ai plus envie.", 'typo'],      // apostrophe slipped
  ['une experience', 'une expérience', 'accent'],
  ['une exprience', 'une expérience', 'wrong'],  // missing letter and an accent
  ['les journaux', 'les journeaux', 'wrong'],
  ['le gouvernement', 'le gouvernemant', 'typo'],
  ['de', 'de', 'correct'],
  ['du', 'de', 'wrong'],                         // two letters, no tolerance
]
let fail = 0
for (const [input, answer, want] of cases) {
  const got = check(input, [answer])
  if (got !== want) { fail++; console.log(`FAIL  "${input}" vs "${answer}" → ${got}, want ${want}`) }
}
console.log(fail ? `${fail} of ${cases.length} failed` : `all ${cases.length} passed`)
