/** Small presentational pieces shared across the screens. */

/** The app mark: the two cards and speech bubble from the icon. */
export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 512 512" role="img" aria-label="Neno">
      <rect width="512" height="512" rx="115" fill="var(--primary)" />
      <g stroke="var(--outline)" strokeWidth="20" strokeLinejoin="round">
        <rect x="108" y="140" width="186" height="248" rx="34" fill="var(--accent)" transform="rotate(-9 201 264)" />
        <rect x="188" y="118" width="212" height="272" rx="36" fill="#f7f1e8" transform="rotate(4 294 254)" />
        <path
          d="M294 196c-49 0-89 31-89 69 0 23 14 43 36 56l-11 33 41-24c7 1 15 2 23 2 49 0 89-30 89-67s-40-69-89-69z"
          fill="var(--gold)"
        />
      </g>
      <g fill="var(--outline)">
        <circle cx="258" cy="264" r="15" />
        <circle cx="300" cy="264" r="15" />
        <circle cx="342" cy="264" r="15" />
      </g>
      <g stroke="var(--gold)" strokeWidth="17" strokeLinecap="round">
        <path d="M400 118v-34" />
        <path d="M428 140l24-24" />
        <path d="M440 180h34" />
      </g>
    </svg>
  )
}

/** Daily progress as a ring: how much of today's round is behind you. */
export function Ring({ done, total }: { done: number; total: number }) {
  const r = 38
  const c = 2 * Math.PI * r
  const share = total ? Math.min(1, done / total) : 1
  return (
    <svg className="ring" viewBox="0 0 88 88" role="img" aria-label={`${done} von ${total} Karten heute geschafft`}>
      <circle className="rim" cx="44" cy="44" r={r + 6} fill="none" />
      <circle className="rim" cx="44" cy="44" r={r - 6} fill="none" />
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
      <text x="44" y="46" fontSize="21">
        {total ? `${done}/${total}` : '✓'}
      </text>
      <text x="44" y="62" fontSize="9" fill="var(--ink-soft)" style={{ letterSpacing: '0.1em' }}>
        HEUTE
      </text>
    </svg>
  )
}

/** A sticker medal with the score, for the end of a round. */
export function Seal({ score, perfect }: { score: string; perfect: boolean }) {
  return (
    <svg className="seal" width="150" height="168" viewBox="0 0 150 168" role="img" aria-label={`Ergebnis ${score}`}>
      <g stroke="var(--outline)" strokeWidth="5" strokeLinejoin="round">
        <path d="M58 104 L44 160 L64 146 L75 164 L75 104Z" fill="var(--primary)" />
        <path d="M92 104 L106 160 L86 146 L75 164 L75 104Z" fill="var(--accent)" />
        <circle cx="75" cy="66" r="54" fill="var(--gold)" />
        <circle cx="75" cy="66" r="42" fill="var(--surface)" />
      </g>
      <text x="75" y="68" textAnchor="middle" dominantBaseline="middle" fontSize="32" fontWeight="800" fill="var(--ink)">
        {score}
      </text>
      <text x="75" y="92" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--ink-soft)" letterSpacing="1.5">
        {perfect ? 'PARFAIT' : 'RICHTIG'}
      </text>
    </svg>
  )
}

/** Check mark used for "I know this already". */
export function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
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
      <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
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

/** Speaker icon for the pronunciation button. */
export function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 7.5h3L11 4v12L7 12.5H4z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M13.5 7.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M15.8 5a6.5 6.5 0 0 1 0 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

/** A short burst of confetti when an answer is right. Pure CSS, six pieces. */
export function Burst() {
  // All pieces fly up and to the right, so they never cross the word itself.
  const pieces = [
    { x: 6, y: -34, c: 'var(--c1)', r: -24 },
    { x: 24, y: -46, c: 'var(--c2)', r: 14 },
    { x: 44, y: -40, c: 'var(--c5)', r: -8 },
    { x: 60, y: -24, c: 'var(--c3)', r: 26 },
    { x: 70, y: -6, c: 'var(--c4)', r: -16 },
    { x: 34, y: -16, c: 'var(--c6)', r: 20 },
  ]
  return (
    <span className="burst" aria-hidden>
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            ['--x' as string]: `${p.x}px`,
            ['--y' as string]: `${p.y}px`,
            ['--r' as string]: `${p.r}deg`,
            background: p.c,
            animationDelay: `${i * 18}ms`,
          }}
        />
      ))}
    </span>
  )
}

/**
 * The "neno" wordmark. The letters sit on a bouncing baseline, each with the
 * icon's dark outline, and the final o is the speech bubble from the icon.
 * Letters are placed at fixed positions rather than flowed, so the mark looks
 * the same whatever font metrics a device has.
 */
export function Wordmark({ height = 44 }: { height?: number }) {
  const letters = [
    { c: 'n', x: 34, y: 78, r: -5 },
    { c: 'e', x: 96, y: 84, r: 4 },
    { c: 'n', x: 158, y: 76, r: -3 },
  ]
  return (
    <svg
      className="wordmark"
      height={height}
      viewBox="0 0 268 108"
      role="img"
      aria-label="neno"
      style={{ overflow: 'visible' }}
    >
      {/* sparkles, as on the icon */}
      <g stroke="var(--gold)" strokeWidth="7" strokeLinecap="round">
        <path d="M232 10v-12" />
        <path d="M250 22l11-11" />
      </g>
      <g
        fontFamily="ui-rounded, 'SF Pro Rounded', Nunito, system-ui, sans-serif"
        fontSize="86"
        fontWeight="800"
        textAnchor="middle"
        paintOrder="stroke"
        stroke="var(--outline)"
        strokeWidth="13"
        strokeLinejoin="round"
        fill="var(--primary)"
      >
        {letters.map((l) => (
          <text key={`${l.c}${l.x}`} x={l.x} y={l.y} transform={`rotate(${l.r} ${l.x} ${l.y})`}>
            {l.c}
          </text>
        ))}
      </g>
      {/* the final o, drawn as a speech bubble sitting on the same baseline */}
      <g transform="translate(-10 8)">
        <path
          d="M222 26c-24 0-43 14-43 32 0 11 7 20 17 26l-5 17 20-12c3 1 7 1 11 1 24 0 43-14 43-32s-19-32-43-32z"
          fill="var(--gold)"
          stroke="var(--outline)"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <g fill="var(--outline)">
          <circle cx="204" cy="58" r="6.5" />
          <circle cx="222" cy="58" r="6.5" />
          <circle cx="240" cy="58" r="6.5" />
        </g>
      </g>
    </svg>
  )
}
