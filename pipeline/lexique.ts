// Reads Lexique 3.83 (http://www.lexique.org, CC BY-SA 4.0).
// Get it once with: npm run cards:fetch
import { existsSync, readFileSync } from 'node:fs'

export const LEXIQUE_PATH = new URL('./raw/Lexique383.tsv', import.meta.url)

export interface Row {
  ortho: string
  lemme: string
  /** NOM, VER, AUX, ADJ, ADV, PRE, … */
  cgram: string
  genre: string
  nombre: string
  /** Lemma frequency per million words, mean of films and books */
  freqLemma: number
  /** Frequency of this exact form, mean of films and books */
  freqForm: number
  /** Inflection tags, e.g. ["ind:pre:1s", "sub:pre:1s"] */
  infover: string[]
}

export function loadRows(): Row[] {
  if (!existsSync(LEXIQUE_PATH)) {
    throw new Error('Lexique383.tsv missing. Run: npm run cards:fetch')
  }
  const lines = readFileSync(LEXIQUE_PATH, 'utf8').split('\n')
  const header = lines[0].split('\t')
  const col = (name: string) => {
    const i = header.indexOf(name)
    if (i < 0) throw new Error(`Lexique column "${name}" not found`)
    return i
  }
  const c = {
    ortho: col('ortho'),
    lemme: col('lemme'),
    cgram: col('cgram'),
    genre: col('genre'),
    nombre: col('nombre'),
    lemFilms: col('freqlemfilms2'),
    lemLivres: col('freqlemlivres'),
    films: col('freqfilms2'),
    livres: col('freqlivres'),
    infover: col('infover'),
  }
  const rows: Row[] = []
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split('\t')
    if (f.length < header.length) continue
    rows.push({
      ortho: f[c.ortho],
      lemme: f[c.lemme],
      cgram: f[c.cgram],
      genre: f[c.genre],
      nombre: f[c.nombre],
      freqLemma: (Number(f[c.lemFilms]) + Number(f[c.lemLivres])) / 2,
      freqForm: (Number(f[c.films]) + Number(f[c.livres])) / 2,
      infover: f[c.infover].split(';').filter(Boolean),
    })
  }
  if (rows.length < 100000) throw new Error(`Only ${rows.length} Lexique rows parsed, expected ~142000`)
  return rows
}

export type Pos = 'NOM' | 'VER' | 'ADJ' | 'ADV'

export interface Lemma {
  rank: number
  lemma: string
  pos: Pos
  /** Genders for nouns: ["f"], ["m"], or ["m", "f"] when Lexique marks the base form as either */
  genders: string[]
  freq: number
}

const WORD_POS: Record<string, Pos> = { NOM: 'NOM', VER: 'VER', AUX: 'VER', ADJ: 'ADJ', ADV: 'ADV' }

/** Content words ranked by frequency. Function words are taught through grammar topics instead. */
export function buildWordlist(rows: Row[]): Lemma[] {
  const byKey = new Map<string, Omit<Lemma, 'rank'> & { genderFreq: Map<string, number>; ambiguous: boolean }>()
  for (const r of rows) {
    const pos = WORD_POS[r.cgram]
    if (!pos || !/^[a-zàâäçéèêëîïôöùûüÿœæ' -]{2,}$/.test(r.lemme)) continue
    const key = `${r.lemme}|${pos}`
    let e = byKey.get(key)
    if (!e) {
      e = { lemma: r.lemme, pos, genders: [], freq: 0, genderFreq: new Map(), ambiguous: false }
      byKey.set(key, e)
    }
    e.freq = Math.max(e.freq, r.freqLemma)
    // Lexique leaves genre empty on forms that can be either (le/la livre, un/une élève).
    if (pos === 'NOM' && r.ortho === r.lemme && r.genre === '') e.ambiguous = true
    if (pos === 'NOM' && (r.genre === 'm' || r.genre === 'f')) {
      e.genderFreq.set(r.genre, (e.genderFreq.get(r.genre) ?? 0) + r.freqForm)
    }
  }
  return [...byKey.values()]
    .filter((e) => e.freq > 0)
    .sort((a, b) => b.freq - a.freq)
    .map(({ genderFreq, ambiguous, ...e }, i) => ({
      ...e,
      rank: i + 1,
      genders:
        e.pos !== 'NOM'
          ? []
          : ambiguous
            ? ['m', 'f']
            : // Keep a second gender only if it is not a stray tagging error (>5% of uses).
              [...genderFreq.entries()]
                .filter(([, f]) => f >= 0.05 * Math.max(...genderFreq.values()))
                .sort((a, b) => b[1] - a[1])
                .map(([g]) => g),
    }))
}
