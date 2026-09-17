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
