import { useCallback, useEffect, useRef, useState } from 'react'
import { Rating, type Grade } from 'ts-fsrs'
import {
  CARDS,
  SECTIONS,
  FORMAT_LABEL,
  acceptedAnswers,
  genderOf,
  hookFor,
  solution,
  splitArticle,
  topicTitle,
  type StudyCard,
} from './cards'
import { check, type Verdict } from './check'
import { t } from './i18n'
import { Confirm, type ConfirmProps } from './Confirm'
import { canSpeak, getAutoSpeak, hasFrenchVoice, setAutoSpeak, speak } from './speak'
import { PAIRS, getPair, setPair } from './deck'
import { Burst, Check, Mark, Ring, Seal, SpeakerIcon, Wordmark } from './Bits'

import {
  buildExtraQueue,
  buildQueue,
  exportBackup,
  getLimits,
  getSkip,
  grade,
  importBackup,
  applyTheme,
  cardsInTopic,
  dueTomorrow,
  getTheme,
  markPlaced,
  streak,
  placementBands,
  preview,
  resetProgress,
  setLimits,
  setSkip,
  toggleTopicSkip,
  stats,
  wordsUpToRank,
  type Band,
  type Limits,
  type Theme,
  type SkipSettings,
  type Stats,
} from './db'

type Screen =
  | { name: 'home' }
  | { name: 'review'; queue: StudyCard[] }
  | { name: 'done'; result: SessionResult }
  | { name: 'placement' }

interface SessionResult {
  /** Cards answered, counted once each */
  reviewed: number
  /** Cards right at the first attempt: later retries never repair a miss */
  right: number
  missed: StudyCard[]
  scored: Set<string>
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
  const [ask, setAsk] = useState<Omit<ConfirmProps, 'onCancel'> | null>(null)
  const [undo, setUndo] = useState<{ text: string; run: () => void } | null>(null)
  const [days, setDays] = useState(0)
  const [theme, setTheme] = useState<Theme>(getTheme)
  const [autoSpeak, setAuto] = useState(getAutoSpeak)
  const [pair] = useState(getPair)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => {
    stats().then(setS)
    streak().then(setDays)
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
    a.download = `neno-sicherung-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg(t('Sicherung gespeichert. Sie liegt bei deinen Downloads.'))
  }

  const upload = async (file: File) => {
    setAsk({
      title: t('Sicherung laden?'),
      body: t('Das ersetzt deinen gesamten Fortschritt auf diesem Gerät durch den Stand aus der Datei. Was du seitdem gelernt hast, geht verloren.'),
      confirmLabel: t('Ersetzen'),
      destructive: true,
      onConfirm: async () => {
        setAsk(null)
        try {
          const n = await importBackup(await file.text())
          setMsg(t('{n} Karten aus der Sicherung übernommen.', { n }))
          refresh()
        } catch (e) {
          setMsg(e instanceof Error ? e.message : t('Die Datei konnte nicht gelesen werden.'))
        }
      },
    })
  }

  const skipTopic = (id: string, title: string) => {
    if (skip.topics.includes(id)) {
      setSkipState(toggleTopicSkip(id))
      setMsg(t('"{title}" ist wieder dabei.', { title }))
      refresh()
      return
    }
    setAsk({
      title: t('"{title}" überspringen?', { title }),
      body: t(
        '{n} Karten aus diesem Thema kommen dann nicht mehr dran. Schon gelernte Karten bleiben gespeichert, und du kannst das Thema hier jederzeit wieder aufnehmen.',
        { n: cardsInTopic(id) },
      ),
      confirmLabel: t('Überspringen'),
      destructive: true,
      onConfirm: () => {
        setAsk(null)
        setSkipState(toggleTopicSkip(id))
        refresh()
        setUndo({
          text: t('"{title}" wird übersprungen.', { title }),
          run: () => {
            setSkipState(toggleTopicSkip(id))
            refresh()
            setUndo(null)
          },
        })
      },
    })
  }

  const total = s ? s.due + s.newLeft.wort + s.newLeft.grammatik : 0
  const doneToday = s?.doneToday ?? 0
  // Asked once: before anything has been learned and before a choice was made.
  const firstRun = !!s && s.learned === 0 && !skip.placed

  return (
    <main className="home">
      <header className="masthead">
        <Mark />
        <div>
          <h1 className="visually-hidden">Neno</h1>
          <div className="lockup">
            <Wordmark />
            <span className="script" lang="fr">
              Français
            </span>
          </div>
          <p className="sub">{t('Vokabeln, Formen, Grammatik')}</p>
        </div>
        {days > 0 && (
          <span className="streak" title={t('Tage in Folge gelernt')}>
            <b>{days}</b>
            {t(days === 1 ? 'Tag' : 'Tage')}
          </span>
        )}
      </header>

      <section className="today">
        <Ring done={doneToday} total={doneToday + total} />
        <div className="legend">
          <div>
            <span className="dot due" />
            <b>{s?.due ?? '·'}</b>{t('zur Wiederholung')}</div>
          <div>
            <span className="dot word" />
            <b>{s?.newLeft.wort ?? '·'}</b>{t('neue Wörter')}</div>
          <div>
            <span className="dot grammar" />
            <b>{s?.newLeft.grammatik ?? '·'}</b>{t('neue Grammatik')}</div>
        </div>
      </section>

      {!s ? (
        <div className="big placeholder" aria-hidden />
      ) : firstRun ? (
        <section className="firstrun">
          <h2>{t('Wie möchtest du anfangen?')}</h2>
          <button className="big primary" onClick={onPlacement}>{t('Einstufung machen')}<small>{t('Ein kurzer Test überspringt, was du schon kannst')}</small>
          </button>
          <button
            className="big"
            onClick={() => {
              markPlaced()
              setSkipState(getSkip())
              start()
            }}
          >{t('Von vorne anfangen')}<small>{t('Bei den häufigsten Wörtern beginnen')}</small>
          </button>
        </section>
      ) : (
        <button
          className="primary big"
          onClick={async () => {
            const queue = total ? await buildQueue() : await buildExtraQueue(10)
            if (queue.length) onStart(queue)
          }}
        >
          {total ? t(doneToday ? 'Heutige Runde fortsetzen' : 'Heutige Runde starten') : t('Noch eine Runde')}
          <small>
            {total
              ? t(total === 1 ? 'noch {n} Karte' : 'noch {n} Karten', { n: total })
              : t('{n} Karten', { n: 10 })}
          </small>
        </button>
      )}
      {!s || firstRun ? null : total ? (
        <p className="small center">
          {t('Du tippst die französische Antwort. Falsche Karten kommen am Ende der Runde noch einmal.')}
        </p>
      ) : (
        <p className="small center">
          {t(
            'Dein Tagespensum ist geschafft. Eine Extra-Runde nimmt zusätzliche Karten vor, ohne dein Pensum für morgen zu ändern.',
          )}
        </p>
      )}

      <section className="topics">
        <h2>{t('Themen')}<span className="count">{s ? t('{seen} von {total} Karten schon gesehen', { seen: s.learned, total: s.total }) : ''}</span>
        </h2>
        <p className="small">
          {t(
            'Tippe ein Thema an, um nur daraus zu üben. Das Häkchen daneben heißt "kann ich schon" und nimmt das Thema aus der Tagesrunde.',
          )}
        </p>
        {SECTIONS.map((section, i) => {
          const rows = section.topics.map((t) => ({ ...t, p: s?.topics.get(t.id) }))
          const seen = rows.reduce((n, r) => n + (r.p?.seen ?? 0), 0)
          const all = rows.reduce((n, r) => n + (r.p?.total ?? 0), 0)
          return (
            <details key={section.id} className="section" style={{ ['--accent-c' as string]: SECTION_COLOURS[i % SECTION_COLOURS.length] }}>
              <summary>
                <span>{section.title}</span>
                <span className="count">
                  {seen}/{all}
                </span>
              </summary>
              <ul>
                {rows.map((r) => {
                  const p = r.p
                  const empty = !p || p.total === 0
                  const complete = !empty && p.due === 0 && p.seen === p.total
                  const skipped = skip.topics.includes(r.id)
                  return (
                    <li key={r.id}>
                      <button
                        className="topic-main"
                        disabled={empty || complete || skipped}
                        onClick={() => start(r.id)}
                        aria-label={t('{title} üben', { title: r.title })}
                      >
                        <span className="topic-head">
                          <span>{r.title}</span>
                          <span className="count">
                            {skipped
                              ? t('übersprungen')
                              : complete
                                ? t('alles dran')
                                : `${p?.seen ?? 0}/${p?.total ?? 0}${p?.due ? ` · ${t('{n} fällig', { n: p.due })}` : ''}`}
                          </span>
                        </span>
                        <span className={`bar ${complete ? 'done' : ''}`} aria-hidden>
                          <span style={{ width: `${p?.total ? (100 * p.seen) / p.total : 0}%` }} />
                        </span>
                      </button>
                      <button
                        className="icon"
                        aria-pressed={skipped}
                        aria-label={skipped ? t('{title} wieder aufnehmen', { title: r.title }) : t('{title} kann ich schon', { title: r.title })}
                        onClick={() => skipTopic(r.id, r.title)}
                      >
                        <Check />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </details>
          )
        })}
      </section>

      <details className="settings">
        <summary>{t('Einstellungen')}</summary>
        <label className="row">{t('Neue Wörter pro Tag')}<input type="number" min={0} max={100} value={limits.wort} onChange={(e) => updateLimit('wort', e.target.value)} />
        </label>
        <p className="small">
          {t(
            'So viele neue Karten kommen pro Tag dazu. Wiederholungen sind davon nicht betroffen, die richten sich danach, wie gut du eine Karte kannst.',
          )}
        </p>
        <label className="row">{t('Neue Grammatikkarten pro Tag')}<input
            type="number"
            min={0}
            max={100}
            value={limits.grammatik}
            onChange={(e) => updateLimit('grammatik', e.target.value)}
          />
        </label>
        <div className="row">
          <span>
            {t('Einstufung')}
            {skip.knownWordRank
              ? t(': Wörter bis Rang {rank} übersprungen', { rank: skip.knownWordRank })
              : t(': noch nicht gemacht')}
          </span>
          <button onClick={onPlacement}>{t(skip.placed ? 'Wiederholen' : 'Starten')}</button>
        </div>
        {skip.knownWordRank > 0 && (
          <button
            onClick={() =>
              setAsk({
                title: t('Übersprungene Wörter zurückholen?'),
                body: t('{n} Wörter aus der Einstufung kommen dann wieder in die Tagesrunde.', {
                  n: wordsUpToRank(skip.knownWordRank),
                }),
                confirmLabel: t('Zurückholen'),
                onConfirm: () => {
                  const next = { ...getSkip(), knownWordRank: 0 }
                  setSkip(next)
                  setSkipState(next)
                  setAsk(null)
                  setMsg(t('Die übersprungenen Wörter sind wieder dabei.'))
                  refresh()
                },
              })
            }
          >{t('Übersprungene Wörter zurückholen')}</button>
        )}
        {canSpeak() && (
          <>
            <label className="row">
              <span>{t('Aussprache automatisch')}</span>
              <input
                type="checkbox"
                className="switch"
                checked={autoSpeak}
                onChange={(e) => {
                  setAutoSpeak(e.target.checked)
                  setAuto(e.target.checked)
                  if (e.target.checked) speak('Bonjour')
                }}
              />
            </label>
            <p className="small">
              {t('Die Stimme kommt vom Gerät, es wird nichts heruntergeladen.')}
              {!hasFrenchVoice() && t(' Auf diesem Gerät ist noch keine französische Stimme installiert.')}
            </p>
          </>
        )}
        <div className="row">
          <span>{t('Sprache')}</span>
          <div className="segmented" role="group" aria-label={t('Sprache')}>
            {PAIRS.map((p) => (
              <button
                key={p.id}
                aria-pressed={pair === p.id}
                onClick={() => {
                  if (p.id === pair) return
                  setAsk({
                    title: t('Sprache wechseln?'),
                    body: t(
                      'Die App stellt auf {language} um. Dein Fortschritt wird dabei gelöscht, weil die englische Ausgabe eigene Karten hat.',
                      { language: p.label },
                    ),
                    confirmLabel: t('Umstellen und zurücksetzen'),
                    destructive: true,
                    onConfirm: async () => {
                      await resetProgress()
                      setSkip({ knownWordRank: 0, topics: [], placed: false })
                      setPair(p.id)
                      location.reload()
                    },
                  })
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <span>{t('Aussehen')}</span>
          <div className="segmented" role="group" aria-label="Aussehen">
            {(['system', 'light', 'dark'] as Theme[]).map((mode) => (
              <button
                key={mode}
                aria-pressed={theme === mode}
                onClick={() => {
                  setTheme(mode)
                  applyTheme(mode)
                }}
              >
                {t(mode === 'system' ? 'System' : mode === 'light' ? 'Hell' : 'Dunkel')}
              </button>
            ))}
          </div>
        </div>
        <p className="small">
          {t('Dein Fortschritt liegt nur auf diesem Gerät. Eine Sicherung schützt ihn, falls der Browser Daten löscht.')}
        </p>
        <div className="row buttons">
          <button onClick={download}>{t('Sicherung speichern')}</button>
          <button onClick={() => fileRef.current?.click()}>{t('Sicherung laden')}</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </div>
        {msg && <p className="small">{msg}</p>}

        <div className="row buttons">
          <button
            className="danger-link"
            onClick={() =>
              setAsk({
                title: t('Allen Fortschritt löschen?'),
                body: t('Alle Karten gelten danach wieder als ungelernt, auf diesem Gerät. Die Karten selbst bleiben erhalten. Speichere vorher eine Sicherung, wenn du unsicher bist.'),
                confirmLabel: t('Alles löschen'),
                destructive: true,
                onConfirm: async () => {
                  await resetProgress()
                  setAsk(null)
                  setMsg(t('Der Fortschritt wurde gelöscht.'))
                  refresh()
                },
              })
            }
          >{t('Fortschritt zurücksetzen')}</button>
        </div>
      </details>

      {undo && (
        <div className="undo" role="status">
          <span>{undo.text}</span>
          <button onClick={undo.run}>{t('Rückgängig')}</button>
        </div>
      )}

      {ask && <Confirm {...ask} onCancel={() => setAsk(null)} />}
    </main>
  )
}

const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'î', 'ï', 'ô', 'œ', 'ë']

/** One colour per curriculum section, so the list is scannable and a bit livelier. */
const SECTION_COLOURS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)']

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

/** Shows "la mer" with the article in the gender's colour: navy for m, rouge for f. */
function Gendered({ answer }: { answer: string }) {
  const [article, rest] = splitArticle(answer)
  const gender = genderOf(answer)
  if (!article || !gender) return <>{answer}</>
  return (
    <>
      <span className={`gender ${gender}`}>{article.trim()}</span> {rest}
    </>
  )
}

function Review({ queue: initial, onFinish }: { queue: StudyCard[]; onFinish: (r: SessionResult) => void }) {
  const [queue, setQueue] = useState(initial)
  const card = queue[0]
  const startValue = (c: StudyCard) => (c.format === 'fix' ? (c.fr ?? '') : '')
  const [input, setInput] = useState(() => startValue(card))
  const [picked, setPicked] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [busy, setBusy] = useState(false)
  const result = useRef<SessionResult>({ reviewed: 0, right: 0, missed: [], scored: new Set() })
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const [again, setAgain] = useState<Record<Grade, string> | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const selfGraded = card.format === 'sentence'
  const choose = card.format === 'choose'
  // Whole sentences never fit on one line, so those answers get a box that wraps.
  const multiline = card.format === 'sentence' || card.format === 'rewrite' || card.format === 'fix'
  const answers = acceptedAnswers(card)

  useEffect(() => {
    const el = inputRef.current
    el?.focus()
    if (el instanceof HTMLTextAreaElement) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    setAgain(null)
    // When the card comes back depends on the grade, so the buttons can say it.
    let current = true
    preview(card.id).then((p) => current && setAgain(p))
    return () => {
      current = false
    }
  }, [card])

  const blank = !input.trim()

  const submit = () => {
    if (verdict) return
    // Nothing typed means the answer is not known; show it and count the card as missed.
    setVerdict(blank ? 'wrong' : check(input, answers))
  }

  const pick = (option: string) => {
    if (verdict) return
    setPicked(option)
    setVerdict(option === card.answer ? 'correct' : 'wrong')
  }

  const next = async (g: Grade) => {
    if (busy) return
    setBusy(true)
    await grade(card.id, g)
    const r = result.current
    // Only the first attempt counts: a card you miss and then get right stays missed.
    if (!r.scored.has(card.id)) {
      r.scored.add(card.id)
      r.reviewed++
      if (g !== Rating.Again) r.right++
    }
    if (g === Rating.Again && !r.missed.includes(card)) r.missed.push(card)
    // A missed card comes back at the end of this session; a correct one is done for today.
    const rest = queue.slice(1)
    const nextQueue = g === Rating.Again ? [...rest, card] : rest
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
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    if (!verdict) submit()
    else if (!selfGraded) next(AUTO_GRADE[verdict])
  }

  const ok = verdict === 'correct' || verdict === 'typo'
  const hook = hookFor(card)
  const spoken = solution(card)

  useEffect(() => {
    if (verdict && getAutoSpeak()) speak(spoken)
  }, [verdict, spoken])
  const showSource = card.format === 'rewrite' || (card.fr && !card.fr.includes('___') && card.format !== 'fix')

  return (
    <main className="review">
      <div className="progress">
        <button className="link" onClick={() => (result.current.reviewed ? setConfirmEnd(true) : onFinish(result.current))}>{t('Runde beenden')}</button>
        <span>
          {t(queue.length === 1 ? 'noch {n} Karte' : 'noch {n} Karten', { n: queue.length })}
        </span>
      </div>

      <article className="card">
        <span className="tag">
          {topicTitle(card)} · {t(FORMAT_LABEL[card.format])}
        </span>
        {card.format === 'conjugate' ? (
          <>
            <div className="bubble">
              <p className="prompt" lang="fr">
                {card.task}
              </p>
            </div>
            {card.de && <p className="hint">{card.de}</p>}
          </>
        ) : (
          <>
            {card.de && (
              <div className="bubble">
                <p className="prompt">{card.de}</p>
              </div>
            )}
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
            {card.format === 'fix' && <p className="task">{t('Finde den Fehler und schreib den Satz richtig.')}</p>}
            {card.task && <p className="task">{card.task}</p>}
          </>
        )}
        {card.hint && <p className="hint">{card.hint}</p>}
      </article>

      {choose ? (
        <>
          {!verdict && <p className="small center">{t('Tippe die richtige Form an.')}</p>}
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
        </>
      ) : (
        <>
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              className={`answer ${verdict ? (ok ? 'is-ok' : selfGraded ? '' : 'is-bad') : ''}`}
              value={input}
              rows={2}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${e.target.scrollHeight}px`
              }}
              onKeyDown={onKey}
              readOnly={!!verdict}
              placeholder={t(PLACEHOLDER[card.format] ?? 'Antwort')}
              lang="fr"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint={verdict ? 'next' : 'done'}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              className={`answer ${verdict ? (ok ? 'is-ok' : selfGraded ? '' : 'is-bad') : ''}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              readOnly={!!verdict}
              placeholder={t(PLACEHOLDER[card.format] ?? 'Antwort')}
              lang="fr"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint={verdict ? 'next' : 'done'}
            />
          )}
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
            <button className={`big ${blank && !selfGraded ? 'quiet' : 'primary'}`} onClick={submit}>
              {t(selfGraded ? 'Aufdecken' : blank ? 'Weiß ich nicht' : 'Prüfen')}
            </button>
          )}
        </>
      )}

      {verdict && (
        <section className="reveal" aria-live="polite">
          {!selfGraded && (
            <p className={`verdict ${ok ? 'ok' : 'bad'}`}>
              {t(VERDICT_TEXT[verdict])}
              {verdict === 'correct' && <Burst />}
            </p>
          )}
          {selfGraded && verdict !== 'wrong' && <p className="verdict ok">{t(VERDICT_TEXT[verdict])}</p>}
          <div className="answer-block">
            {hook && (
              <span className="hook" aria-hidden>
                {hook}
              </span>
            )}
            <p className="solution" lang="fr">
              {card.format === 'translate' ? <Gendered answer={card.answer} /> : spoken}
            </p>
            {canSpeak() && (
              <button className="icon speak" onClick={() => speak(spoken)} aria-label={t('Aussprache anhören')}>
                <SpeakerIcon />
              </button>
            )}
          </div>
          {verdict === 'accent' && <p className="small">{t('Akzente zählen als Fehler, sie verändern die Aussprache.')}</p>}
          {verdict === 'typo' && <p className="small">{t('Ein Buchstabe daneben. Zählt als gewusst, kommt aber früher wieder.')}</p>}
          {card.note && <p className="note">{card.note}</p>}

          {selfGraded ? (
            <>
              <p className="small">{t('Vergleiche mit deiner Antwort. Wie gut wusstest du es?')}</p>
              <div className="grades">
                <button onClick={() => next(Rating.Again)}>{t('Falsch')}<small>{again ? again[Rating.Again] : ' '}</small>
                </button>
                <button onClick={() => next(Rating.Hard)}>{t('Fast')}<small>{again ? again[Rating.Hard] : ' '}</small>
                </button>
                <button className="primary" onClick={() => next(Rating.Good)}>{t('Richtig')}<small>{again ? again[Rating.Good] : ' '}</small>
                </button>
                <button onClick={() => next(Rating.Easy)}>{t('Sehr leicht')}<small>{again ? again[Rating.Easy] : ' '}</small>
                </button>
              </div>
            </>
          ) : (
            <div className="grades">
              {ok ? (
                <button onClick={() => next(Rating.Easy)}>{t('Wusste ich sofort')}<small>{again ? again[Rating.Easy] : ' '}</small>
                </button>
              ) : (
                !choose &&
                !blank && (
                  <button onClick={() => next(Rating.Good)}>{t('Zählt als richtig')}<small>{again ? again[Rating.Good] : ' '}</small>
                  </button>
                )
              )}
              <button className="primary" autoFocus={choose} onClick={() => next(AUTO_GRADE[verdict])}>{t('Weiter')}<small>{again ? again[AUTO_GRADE[verdict]] : ' '}</small>
              </button>
            </div>
          )}
        </section>
      )}

      {confirmEnd && (
        <Confirm
          title={t('Runde beenden?')}
          body={t('Noch {n} Karten offen. Beantwortete Karten sind gespeichert, der Rest kommt beim nächsten Start wieder.', {
            n: queue.length,
          })}
          confirmLabel={t('Beenden')}
          cancelLabel={t('Weitermachen')}
          onConfirm={() => onFinish(result.current)}
          onCancel={() => setConfirmEnd(false)}
        />
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
  const [leaving, setLeaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = bands[band]
  const card = current?.cards[index]

  useEffect(() => {
    inputRef.current?.focus()
  }, [card])

  /** Only shows the result. Storing it happens when the learner accepts it. */
  const finish = (rank: number) => {
    setKnownRank(rank)
    setFinished(true)
  }

  const apply = (rank: number) => {
    setSkip({ ...getSkip(), knownWordRank: rank, placed: true })
    onDone()
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
      finish(score >= 5 ? current.to : current.from)
    }
  }

  if (!bands.length) {
    return (
      <main>
        <h1>{t('Einstufung')}</h1>
        <p>{t('Für die Einstufung fehlen Wortkarten.')}</p>
        <button className="primary big" onClick={onDone}>{t('Zurück')}</button>
      </main>
    )
  }

  if (finished) {
    const skipped = CARDS.filter((c) => c.rank !== undefined && c.rank <= knownRank).length
    const words = (n: number) => t(n === 1 ? '{n} Wort' : '{n} Wörter', { n })
    return (
      <main className="done">
        <h1>{t('Ergebnis der Einstufung')}</h1>
        {/* Below a handful of words there is nothing worth skipping. */}
        {skipped >= 5 ? (
          <>
            <p className="score">{t('{words} kannst du überspringen.', { words: words(skipped) })}</p>
            <p>
              {t(
                'Das sind die häufigsten Wörter der Liste. Sie kommen dann nicht mehr in der Tagesrunde vor, alles Seltenere schon.',
              )}
            </p>
            <p className="small">
              {t(
                'Du kannst das in den Einstellungen jederzeit zurückholen. Grammatikthemen überspringst du einzeln in der Themenliste.',
              )}
            </p>
            <div className="grades">
              <button onClick={() => apply(0)}>{t('Nichts überspringen')}</button>
              <button className="primary" onClick={() => apply(knownRank)}>
                {t('{words} überspringen', { words: words(skipped) })}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="score">{t('Es wird nichts übersprungen.')}</p>
            <p>
              {t(
                'Du fängst bei den häufigsten Wörtern an. Das ist bei diesem Ergebnis der sinnvollste Start, und der Abstand zwischen den Wiederholungen wächst ohnehin schnell, wenn du eine Karte sicher kannst.',
              )}
            </p>
            <button className="primary big" onClick={() => apply(0)}>{t('Alles klar')}</button>
          </>
        )}
      </main>
    )
  }

  return (
    <main className="review">
      <div className="progress">
        <button className="link" onClick={() => setLeaving(true)}>
          Abbrechen
        </button>
        <span>
          {t('Stufe {band} von {bands} · Wort {i} von {n}', {
            band: band + 1,
            bands: bands.length,
            i: index + 1,
            n: current.cards.length,
          })}
        </span>
      </div>

      <article className="card">
        <span className="tag">{t('Einstufung · Übersetzen')}</span>
        <div className="bubble">
          <p className="prompt">{card.de}</p>
        </div>
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
        <button onClick={() => answer(false)}>{t('Kenne ich nicht')}</button>
        <button
          className="primary"
          disabled={!input.trim()}
          onClick={() => answer(check(input, acceptedAnswers(card)) !== 'wrong')}
        >{t('Antwort prüfen')}</button>
      </div>
      <p className="small">
        {t(
          'Sechs Wörter pro Stufe, von häufig zu selten. Fünf richtige und die ganze Stufe gilt als bekannt, sonst endet die Einstufung hier. Erst am Ende entscheidest du, ob etwas übersprungen wird.',
        )}
      </p>

      {leaving && (
        <Confirm
          title={t('Einstufung abbrechen?')}
          body={t('Es wird nichts übersprungen und nichts gespeichert. Du kannst die Einstufung jederzeit in den Einstellungen neu starten.')}
          confirmLabel={t('Abbrechen')}
          cancelLabel={t('Weitermachen')}
          onConfirm={onDone}
          onCancel={() => setLeaving(false)}
        />
      )}
    </main>
  )
}

function Done({ result, onHome }: { result: SessionResult; onHome: () => void }) {
  const perfect = result.reviewed > 0 && result.right === result.reviewed
  const [tomorrow, setTomorrow] = useState<number | null>(null)
  useEffect(() => {
    dueTomorrow().then(setTomorrow)
  }, [])

  return (
    <main className="done">
      <h1 className="center">{t('Runde fertig')}</h1>
      <Seal score={`${result.right}/${result.reviewed}`} perfect={perfect} />
      {perfect && <p className="parfait center">{t('Parfait')}</p>}
      <p className="score">
        {perfect ? t('Alles richtig.') : t('{right} von {total} richtig', { right: result.right, total: result.reviewed })}
      </p>
      {tomorrow !== null && (
        <p className="small center">
          {tomorrow ? t('Morgen warten {n} Karten auf dich.', { n: tomorrow }) : t('Morgen kommen wieder neue Karten dazu.')}
        </p>
      )}
      {result.missed.length > 0 && (
        <section>
          <h2>{t('Diese Karten kommen morgen wieder')}</h2>
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
      <button className="primary big" onClick={onHome}>{t('Zur Übersicht')}</button>
    </main>
  )
}
