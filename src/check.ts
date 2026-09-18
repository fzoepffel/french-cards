export type Verdict = 'correct' | 'typo' | 'accent' | 'wrong'

/** How long a word must be before a slipped key is believable in it. */
const MIN_WORD_FOR_TYPO = 5

function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/ /g, ' ')
    .replace(/\s*([?!.,;:])\s*/g, '$1 ')
    .replace(/[?!.,;:]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const accented = (s: string) => s.match(/[àâäçéèêëîïôöùûüÿœæ]/g)?.join('') ?? ''

/** Words reduced to their letters: punctuation and spacing never count. */
function words(s: string): string[] {
  return s
    .split(/[^a-zà-ÿœæ]+/i)
    .filter(Boolean)
}

const lettersOnly = (s: string) => words(s).join('')

/**
 * A typo is a slip of the fingers, not a different word. So it must keep the same
 * letters in the same places: one swapped character, or two neighbours in the wrong
 * order. A missing or extra letter changes the word (vu / vue, chaise / chaisse) and
 * is marked wrong, and short words get no tolerance at all.
 */
function isTypo(given: string, target: string): boolean {
  const g = words(given)
  const t = words(target)
  if (g.length !== t.length) return false

  let slips = 0
  for (let w = 0; w < t.length; w++) {
    if (g[w] === t[w]) continue
    if (g[w].length !== t[w].length) return false
    if (t[w].length < MIN_WORD_FOR_TYPO) return false

    const diff: number[] = []
    for (let i = 0; i < t[w].length; i++) if (g[w][i] !== t[w][i]) diff.push(i)

    const swapped = diff.length === 1
    const transposed =
      diff.length === 2 &&
      diff[1] === diff[0] + 1 &&
      g[w][diff[0]] === t[w][diff[1]] &&
      g[w][diff[1]] === t[w][diff[0]]
    if (!swapped && !transposed) return false
    slips++
    if (slips > 1) return false
  }
  return slips === 1
}

/**
 * Accents are strict, because they change pronunciation. Everything else is either
 * right, a finger slip, or wrong.
 */
export function check(input: string, answers: string[]): Verdict {
  const given = normalize(input)
  if (!given) return 'wrong'
  let best: Verdict = 'wrong'
  for (const a of answers) {
    const target = normalize(a)
    if (given === target) return 'correct'
    if (stripAccents(given) === stripAccents(target)) {
      best = 'accent'
      continue
    }
    const accentsIntact = accented(given) === accented(target)
    if (best === 'wrong' && accentsIntact) {
      // same letters, only an apostrophe or a comma out of place
      if (lettersOnly(given) === lettersOnly(target)) best = 'typo'
      else if (isTypo(given, target)) best = 'typo'
    }
  }
  return best
}
