export type Verdict = 'correct' | 'typo' | 'accent' | 'wrong'

function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/ /g, ' ')
    .replace(/\s*([?!.,;:])\s*/g, '$1 ')
    .replace(/[?!.,;:]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const accented = (s: string) => s.match(/[àâäçéèêëîïôöùûüÿœæ]/g)?.join('') ?? ''

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

/**
 * Accents are strict. One slipped letter counts as a typo on longer answers,
 * as long as the first word (usually the article) is right and no accented letter is involved.
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
    const sameFirstWord = given.split(' ')[0] === target.split(' ')[0]
    const accentsIntact = accented(given) === accented(target)
    if (best === 'wrong' && target.length >= 6 && sameFirstWord && accentsIntact && distance(given, target) === 1) {
      best = 'typo'
    }
  }
  return best
}
