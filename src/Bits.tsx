/** Small presentational pieces shared across the screens. */

/** The app mark: a card corner with an accented é. */
export function Mark() {
  return (
    <span className="mark" aria-hidden>
      é
    </span>
  )
}

/** Daily progress as a ring: how much of today's round is behind you. */
export function Ring({ done, total }: { done: number; total: number }) {
  const r = 38
  const c = 2 * Math.PI * r
  const share = total ? Math.min(1, done / total) : 1
  return (
    <svg className="ring" viewBox="0 0 88 88" role="img" aria-label={`${done} von ${total} Karten heute geschafft`}>
      <circle className="track" cx="44" cy="44" r={r} />
      <circle
        className="value"
        cx="44"
        cy="44"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - share)}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="46" fontSize="20">
        {total ? `${done}/${total}` : '✓'}
      </text>
      <text x="44" y="62" fontSize="9" fill="currentColor" opacity="0.6" style={{ letterSpacing: '0.1em' }}>
        HEUTE
      </text>
    </svg>
  )
}

/** A medallion with the score and a tricolore ribbon, for the end of a round. */
export function Seal({ score, perfect }: { score: string; perfect: boolean }) {
  return (
    <svg className="seal" width="150" height="168" viewBox="0 0 150 168" role="img" aria-label={`Ergebnis ${score}`}>
      <path d="M58 104 L44 160 L64 146 L75 164 L75 104Z" fill="var(--navy)" />
      <path d="M92 104 L106 160 L86 146 L75 164 L75 104Z" fill="var(--rouge)" />
      <circle cx="75" cy="68" r="54" fill="var(--surface)" stroke="var(--brass)" strokeWidth="2" />
      <circle cx="75" cy="68" r="46" fill="none" stroke="var(--brass)" strokeWidth="1" strokeDasharray="1.5 5" opacity="0.7" />
      <text x="75" y="70" textAnchor="middle" dominantBaseline="middle" fontFamily="ui-serif, Georgia, serif" fontSize="34" fill="var(--ink)">
        {score}
      </text>
      <text x="75" y="95" textAnchor="middle" fontSize="8.5" fill="var(--brass)" letterSpacing="2">
        {perfect ? 'PARFAIT' : 'RICHTIG'}
      </text>
    </svg>
  )
}

/** Check mark used for "I know this already". */
export function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The tower draws itself line by line. Used on the finish screen, and small on
 * the home screen when the day is done. About 1 kB of markup, no image files.
 */
export function Tower({ size = 120 }: { size?: number }) {
  return (
    <svg className="tower" width={size} height={size * 1.6} viewBox="0 0 100 160" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* legs */}
        <path className="draw d1" d="M14 150 C28 110 42 74 50 12" />
        <path className="draw d1" d="M86 150 C72 110 58 74 50 12" />
        {/* arch and platforms */}
        <path className="draw d2" d="M24 118 C36 108 64 108 76 118" />
        <path className="draw d2" d="M27 112h46" />
        <path className="draw d3" d="M34 82h32" />
        <path className="draw d3" d="M41 52h18" />
        {/* lattice */}
        <path className="draw d4" d="M31 100 41 84M69 100 59 84M38 74 45 56M62 74 55 56" />
        <path className="draw d4" d="M44 44h12M46 34h8" />
        <path className="draw d5" d="M50 12v-8" />
      </g>
    </svg>
  )
}
