import { useCallback, useEffect, useRef, useState } from 'react'
import { Rating, type Grade } from 'ts-fsrs'
import { CARDS, FORMAT_LABEL, acceptedAnswers, solution, topicTitle, type StudyCard } from './cards'
import { check, type Verdict } from './check'
import { SECTIONS } from './data/topics'
import {
  buildQueue,
  exportBackup,
  getLimits,
  getSkip,
  grade,
  importBackup,
  placementBands,
  setLimits,
  setSkip,
  toggleTopicSkip,
  stats,
  type Band,
  type Limits,
  type SkipSettings,
  type Stats,
} from './db'

type Screen =
  | { name: 'home' }
  | { name: 'review'; queue: StudyCard[] }
  | { name: 'done'; result: SessionResult }
  | { name: 'placement' }

interface SessionResult {
  reviewed: number
  right: number
  missed: StudyCard[]
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  if (screen.name === 'review') {
    return <Review queue={screen.queue} onFinish={(result) => setScreen({ name: 'done', result })} />
  }
  if (screen.name === 'done') {
    return <Done result={screen.result} onHome={() => setScreen({ name: 'home' })} />
  }
  if (screen.name === 'placement') {
    return <Placement onDone={() => setScreen({ name: 'home' })} />
  }
  return (
    <Home onStart={(queue) => setScreen({ name: 'review', queue })} onPlacement={() => setScreen({ name: 'placement' })} />
  )
}

function Home({ onStart, onPlacement }: { onStart: (queue: StudyCard[]) => void; onPlacement: () => void }) {
  const [s, setS] = useState<Stats | null>(null)
  const [limits, setLim] = useState<Limits>(getLimits)
  const [skip, setSkipState] = useState<SkipSettings>(getSkip)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => {
    stats().then(setS)
  }, [])
  useEffect(refresh, [refresh])

  const start = async (topic?: string) => {
    const queue = await buildQueue(topic)
    if (queue.length) onStart(queue)
  }

  const updateLimit = (key: keyof Limits, value: string) => {
    const next = { ...limits, [key]: Math.max(0, Math.min(100, Number(value) || 0)) }
    setLim(next)
    setLimits(next)
    refresh()
  }

  const download = async () => {
    const blob = new Blob([await exportBackup()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cartes-sicherung-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const upload = async (file: File) => {
    try {
      const n = await importBackup(await file.text())
      setMsg(`${n} Karten wiederhergestellt.`)
      refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import fehlgeschlagen.')
    }
  }

  const total = s ? s.due + s.newLeft.wort + s.newLeft.grammatik : 0

  return (
    <main className="home">
      <header>
        <h1>Cartes</h1>
        <p className="sub">Französisch, jeden Tag ein Stück</p>
      </header>

      <section className="today">
        <div className="stat">
          <span className="num">{s?.due ?? '·'}</span>
          <span className="label">fällig</span>
        </div>
        <div className="stat">
          <span className="num">{s?.newLeft.wort ?? '·'}</span>
          <span className="label">neue Wörter</span>
        </div>
        <div className="stat">
          <span className="num">{s?.newLeft.grammatik ?? '·'}</span>
          <span className="label">neue Grammatik</span>
        </div>
      </section>

      <button className="primary big" disabled={!total} onClick={() => start()}>
        {total ? `Los geht's (${total})` : 'Für heute fertig'}
      </button>

      {!skip.placed && (
        <button className="invite" onClick={onPlacement}>
          <strong>Einstufung machen</strong>
          <span>Ein kurzer Test überspringt die Wörter, die du schon kannst.</span>
        </button>
      )}

      <section className="topics">
        <h2>
          Themen <span className="count">{s ? `${s.learned} von ${s.total} Karten gesehen` : ''}</span>
        </h2>
        {SECTIONS.map((section) => {
          const rows = section.topics.map((t) => ({ ...t, p: s?.topics.get(t.id) }))
          const seen = rows.reduce((n, r) => n + (r.p?.seen ?? 0), 0)
          const all = rows.reduce((n, r) => n + (r.p?.total ?? 0), 0)
          return (
            <details key={section.id} className="section">
              <summary>
                <span>{section.title}</span>
                <span className="count">
                  {seen}/{all}
                </span>
              </summary>
              <ul>
                {rows.map((r) => (
                  <li key={r.id}>
                    <div className="topic-info">
                      <span>{r.title}</span>
                      <span className="bar" aria-hidden>
                        <span style={{ width: `${r.p?.total ? (100 * r.p.seen) / r.p.total : 0}%` }} />
                      </span>
                    </div>
                    <span className="count">
                      {r.p?.seen ?? 0}/{r.p?.total ?? 0}
                      {r.p?.due ? ` · ${r.p.due} fällig` : ''}
                    </span>
                    <button
                      className="skip"
                      aria-pressed={skip.topics.includes(r.id)}
                      title={skip.topics.includes(r.id) ? 'Wieder aufnehmen' : 'Thema überspringen'}
                      onClick={() => {
                        setSkipState(toggleTopicSkip(r.id))
                        refresh()
                      }}
                    >
                      {skip.topics.includes(r.id) ? 'übersprungen' : 'kann ich'}
                    </button>
                    <button
                      disabled={!r.p || (r.p.due === 0 && r.p.seen === r.p.total)}
                      onClick={() => start(r.id)}
                    >
                      Üben
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )
        })}
      </section>

      <details className="settings">
        <summary>Einstellungen</summary>
        <label className="row">
          Neue Wörter pro Tag
          <input type="number" min={0} max={100} value={limits.wort} onChange={(e) => updateLimit('wort', e.target.value)} />
        </label>
        <label className="row">
          Neue Grammatikkarten pro Tag
          <input
            type="number"
            min={0}
            max={100}
            value={limits.grammatik}
            onChange={(e) => updateLimit('grammatik', e.target.value)}
          />
        </label>
        <div className="row">
          <span>
            Einstufung
            {skip.knownWordRank
              ? `: Wörter bis Rang ${skip.knownWordRank} übersprungen`
              : ': noch nicht gemacht'}
          </span>
          <button onClick={onPlacement}>{skip.placed ? 'Wiederholen' : 'Starten'}</button>
        </div>
        {skip.knownWordRank > 0 && (
          <button
            onClick={() => {
              const next = { ...getSkip(), knownWordRank: 0 }
              setSkip(next)
              setSkipState(next)
              refresh()
            }}
          >
            Übersprungene Wörter zurückholen
          </button>
        )}
        <p className="small">
          Dein Fortschritt liegt nur auf diesem Gerät. Eine Sicherung schützt ihn, falls der Browser Daten löscht.
        </p>
        <div className="row buttons">
          <button onClick={download}>Sicherung speichern</button>
          <button onClick={() => fileRef.current?.click()}>Sicherung laden</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </div>
        {msg && <p className="small">{msg}</p>}
      </details>
    </main>
  )
}

const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'î', 'ï', 'ô', 'œ', 'ë']

const AUTO_GRADE: Record<Verdict, Grade> = {
  correct: Rating.Good,
  typo: Rating.Hard,
  accent: Rating.Again,
  wrong: Rating.Again,
}

const VERDICT_TEXT: Record<Verdict, string> = {
  correct: 'Richtig',
  typo: 'Fast, ein Tippfehler',
  accent: 'Akzent falsch',
  wrong: 'Falsch',
}

const PLACEHOLDER: Partial<Record<StudyCard['format'], string>> = {
  sentence: 'Ganzer Satz auf Französisch',
  rewrite: 'Umgeformter Satz',
  fix: 'Korrigierter Satz',
  conjugate: 'Verbform',
}

function Review({ queue: initial, onFinish }: { queue: StudyCard[]; onFinish: (r: SessionResult) => void }) {
  const [queue, setQueue] = useState(initial)
  const card = queue[0]
  const startValue = (c: StudyCard) => (c.format === 'fix' ? (c.fr ?? '') : '')
  const [input, setInput] = useState(() => startValue(card))
  const [picked, setPicked] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [busy, setBusy] = useState(false)
  const result = useRef<SessionResult>({ reviewed: 0, right: 0, missed: [] })
  const inputRef = useRef<HTMLInputElement>(null)

  const selfGraded = card.format === 'sentence'
  const choose = card.format === 'choose'
  const answers = acceptedAnswers(card)

  useEffect(() => {
    inputRef.current?.focus()
  }, [card])

  const submit = () => {
    if (verdict) return
    setVerdict(check(input, answers))
  }

  const pick = (option: string) => {
    if (verdict) return
    setPicked(option)
    setVerdict(option === card.answer ? 'correct' : 'wrong')
  }

  const next = async (g: Grade) => {
    if (busy) return
    setBusy(true)
    const due = await grade(card.id, g)
    const r = result.current
    r.reviewed++
    if (g === Rating.Again) {
      if (!r.missed.includes(card)) r.missed.push(card)
    } else {
      r.right++
    }
    // Cards due again within the next half hour come back in this session.
    const rest = queue.slice(1)
    const again = due.getTime() - Date.now() < 30 * 60 * 1000
    const nextQueue = again ? [...rest, card] : rest
    setVerdict(null)
    setPicked(null)
    setBusy(false)
    if (nextQueue.length) {
      setInput(startValue(nextQueue[0]))
      setQueue(nextQueue)
    } else {
      onFinish(r)
    }
  }

  const insert = (ch: string) => {
    const el = inputRef.current
    if (!el || verdict) return
    const start = el.selectionStart ?? input.length
    const end = el.selectionEnd ?? input.length
    setInput(input.slice(0, start) + ch + input.slice(end))
    requestAnimationFrame(() => el.setSelectionRange(start + ch.length, start + ch.length))
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!verdict) submit()
    else if (!selfGraded) next(AUTO_GRADE[verdict])
  }

  const ok = verdict === 'correct' || verdict === 'typo'
  const showSource = card.format === 'rewrite' || (card.fr && !card.fr.includes('___') && card.format !== 'fix')

  return (
    <main className="review">
      <div className="progress">
        <button className="link" onClick={() => onFinish(result.current)}>
          Beenden
        </button>
        <span>{queue.length} übrig</span>
      </div>

      <article className="card">
        <span className="tag">
          {topicTitle(card)} · {FORMAT_LABEL[card.format]}
        </span>
        {card.format === 'conjugate' ? (
          <>
            <p className="prompt" lang="fr">
              {card.task}
            </p>
            {card.de && <p className="hint">{card.de}</p>}
          </>
        ) : (
          <>
            {card.de && <p className="prompt">{card.de}</p>}
            {card.fr?.includes('___') && (
              <p className="cloze" lang="fr">
                {card.fr}
              </p>
            )}
            {showSource && (
              <p className="cloze" lang="fr">
                {card.fr}
              </p>
            )}
            {card.format === 'fix' && <p className="task">Finde den Fehler und schreib den Satz richtig.</p>}
            {card.task && <p className="task">{card.task}</p>}
          </>
        )}
        {card.hint && <p className="hint">{card.hint}</p>}
      </article>

      {choose ? (
        <div className="options">
          {card.options!.map((o) => {
            const state = !verdict ? '' : o === card.answer ? 'is-ok' : o === picked ? 'is-bad' : 'is-dim'
            return (
              <button key={o} className={`option ${state}`} lang="fr" onClick={() => pick(o)} disabled={!!verdict}>
                {o}
              </button>
            )
          })}
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            className={`answer ${verdict ? (ok ? 'is-ok' : selfGraded ? '' : 'is-bad') : ''}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            readOnly={!!verdict}
            placeholder={PLACEHOLDER[card.format] ?? 'Antwort'}
            lang="fr"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint={verdict ? 'next' : 'done'}
          />
          {!verdict && (
            <div className="accents" aria-label="Sonderzeichen">
              {ACCENTS.map((ch) => (
                <button key={ch} onPointerDown={(e) => e.preventDefault()} onClick={() => insert(ch)}>
                  {ch}
                </button>
              ))}
            </div>
          )}
          {!verdict && (
            <button className="primary big" onClick={submit}>
              {selfGraded ? 'Aufdecken' : 'Prüfen'}
            </button>
          )}
        </>
      )}

      {verdict && (
        <section className="reveal">
          {!selfGraded && <p className={`verdict ${ok ? 'ok' : 'bad'}`}>{VERDICT_TEXT[verdict]}</p>}
          {selfGraded && verdict !== 'wrong' && <p className="verdict ok">{VERDICT_TEXT[verdict]}</p>}
          <p className="solution" lang="fr">
            {solution(card)}
          </p>
          {card.note && <p className="note">{card.note}</p>}

          {selfGraded ? (
            <div className="grades">
              <button onClick={() => next(Rating.Again)}>Nochmal</button>
              <button onClick={() => next(Rating.Hard)}>Schwer</button>
              <button className="primary" onClick={() => next(Rating.Good)}>
                Gut
              </button>
              <button onClick={() => next(Rating.Easy)}>Leicht</button>
            </div>
          ) : (
            <div className="grades">
              {ok ? (
                <button onClick={() => next(Rating.Easy)}>Zu leicht</button>
              ) : (
                !choose && <button onClick={() => next(Rating.Good)}>War doch richtig</button>
              )}
              <button className="primary" autoFocus={choose} onClick={() => next(AUTO_GRADE[verdict])}>
                Weiter
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

/**
 * Placement check: walks up the frequency bands, six words each. A band you clearly know is
 * skipped wholesale; the first band you do not know ends the check and everything above stays.
 */
function Placement({ onDone }: { onDone: () => void }) {
  const [bands] = useState<Band[]>(() => placementBands())
  const [band, setBand] = useState(0)
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [right, setRight] = useState(0)
  const [knownRank, setKnownRank] = useState(0)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = bands[band]
  const card = current?.cards[index]

  useEffect(() => {
    inputRef.current?.focus()
  }, [card])

  const save = (rank: number) => {
    setSkip({ ...getSkip(), knownWordRank: rank, placed: true })
    setKnownRank(rank)
    setFinished(true)
  }

  const answer = (correct: boolean) => {
    const score = right + (correct ? 1 : 0)
    setInput('')
    if (index + 1 < current.cards.length) {
      setRight(score)
      setIndex(index + 1)
      return
    }
    // Five of six right means this band is known; anything less ends the check here.
    if (score >= 5 && band + 1 < bands.length) {
      setRight(0)
      setIndex(0)
      setBand(band + 1)
      setKnownRank(current.to)
    } else {
      save(score >= 5 ? current.to : current.from)
    }
  }

  if (!bands.length) {
    return (
      <main>
        <h1>Einstufung</h1>
        <p>Für die Einstufung fehlen Wortkarten.</p>
        <button className="primary big" onClick={onDone}>
          Zurück
        </button>
      </main>
    )
  }

  if (finished) {
    const skipped = CARDS.filter((c) => c.rank !== undefined && c.rank <= knownRank).length
    return (
      <main className="done">
        <h1>Einstufung fertig</h1>
        <p className="score">
          {knownRank
            ? `${skipped} Wörter bis Rang ${knownRank} sind als bekannt markiert.`
            : 'Es wird nichts übersprungen, du fängst von vorne an.'}
        </p>
        <p className="small">
          Das lässt sich in den Einstellungen jederzeit zurücknehmen. Grammatikthemen kannst du im Themenbaum einzeln
          auf "kann ich" setzen.
        </p>
        <button className="primary big" onClick={onDone}>
          Zur Übersicht
        </button>
      </main>
    )
  }

  return (
    <main className="review">
      <div className="progress">
        <button className="link" onClick={() => save(knownRank)}>
          Abbrechen
        </button>
        <span>
          Häufigkeit {current.from + 1}–{current.to} · {index + 1}/{current.cards.length}
        </span>
      </div>

      <article className="card">
        <span className="tag">Einstufung</span>
        <p className="prompt">{card.de}</p>
      </article>

      <input
        ref={inputRef}
        className="answer"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          answer(check(input, acceptedAnswers(card)) !== 'wrong')
        }}
        placeholder="Antwort"
        lang="fr"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
      />

      <div className="grades">
        <button onClick={() => answer(false)}>Kenne ich nicht</button>
        <button className="primary" onClick={() => answer(check(input, acceptedAnswers(card)) !== 'wrong')}>
          Weiter
        </button>
      </div>
      <p className="small">
        Sechs Wörter pro Häufigkeitsstufe. Fünf richtige überspringen die ganze Stufe, sonst hört die Einstufung hier
        auf.
      </p>
    </main>
  )
}

function Done({ result, onHome }: { result: SessionResult; onHome: () => void }) {
  return (
    <main className="done">
      <h1>Fertig</h1>
      <p className="score">
        {result.right} von {result.reviewed} richtig
      </p>
      {result.missed.length > 0 && (
        <section>
          <h2>Kommen bald wieder</h2>
          <ul className="missed">
            {result.missed.map((c) => (
              <li key={c.id}>
                <span>{c.de ?? c.task ?? c.fr}</span>
                <span lang="fr">{solution(c)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button className="primary big" onClick={onHome}>
        Zur Übersicht
      </button>
    </main>
  )
}
