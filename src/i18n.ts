/**
 * Interface text. The German wording is the key, so the source stays readable and
 * nothing can silently lose a string: an unknown key falls back to the German.
 * Placeholders are written {like_this}.
 */
export type Lang = 'de' | 'en'

let lang: Lang = 'de'

export function setLang(next: Lang) {
  lang = next
}

const EN: Record<string, string> = {
  // home
  'Vokabeln, Formen, Grammatik': 'Words, forms, grammar',
  'zur Wiederholung': 'to review',
  'neue Wörter': 'new words',
  'neue Grammatik': 'new grammar',
  Tag: 'day',
  Tage: 'days',
  'Tage in Folge gelernt': 'days in a row',
  'Wie möchtest du anfangen?': 'How do you want to start?',
  'Einstufung machen': 'Take the placement check',
  'Ein kurzer Test überspringt, was du schon kannst': 'A short test skips what you already know',
  'Von vorne anfangen': 'Start from the beginning',
  'Bei den häufigsten Wörtern beginnen': 'Begin with the most common words',
  'Heutige Runde starten ({n} Karten)': "Start today's round ({n} cards)",
  'Noch eine Runde (10 Karten)': 'Another round (10 cards)',
  'Du tippst die französische Antwort. Falsche Karten kommen am Ende der Runde noch einmal.':
    'You type the French answer. Cards you miss come back at the end of the round.',
  'Dein Tagespensum ist geschafft. Eine Extra-Runde nimmt zusätzliche Karten vor, ohne dein Pensum für morgen zu ändern.':
    "Today's plan is done. An extra round takes more cards without changing tomorrow's plan.",
  Themen: 'Topics',
  '{seen} von {total} Karten schon gesehen': '{seen} of {total} cards seen so far',
  'Tippe ein Thema an, um nur daraus zu üben. Das Häkchen daneben heißt "kann ich schon" und nimmt das Thema aus der Tagesrunde.':
    'Tap a topic to practise only that one. The check mark beside it means "I know this" and takes the topic out of the daily round.',
  übersprungen: 'skipped',
  'alles dran': 'all done',
  '{n} fällig': '{n} due',
  '{title} üben': 'Practise {title}',
  '{title} wieder aufnehmen': 'Bring {title} back',
  '{title} kann ich schon': 'I already know {title}',

  // settings
  Einstellungen: 'Settings',
  'Neue Wörter pro Tag': 'New words per day',
  'Neue Grammatikkarten pro Tag': 'New grammar cards per day',
  'So viele neue Karten kommen pro Tag dazu. Wiederholungen sind davon nicht betroffen, die richten sich danach, wie gut du eine Karte kannst.':
    'This many new cards are added each day. Reviews are separate: they follow how well you know each card.',
  Einstufung: 'Placement',
  ': Wörter bis Rang {rank} übersprungen': ': words up to rank {rank} skipped',
  ': noch nicht gemacht': ': not done yet',
  Wiederholen: 'Redo',
  Starten: 'Start',
  'Übersprungene Wörter zurückholen': 'Bring skipped words back',
  'Übersprungene Wörter zurückholen?': 'Bring skipped words back?',
  '{n} Wörter aus der Einstufung kommen dann wieder in die Tagesrunde.':
    '{n} words from the placement check will return to the daily round.',
  Zurückholen: 'Bring back',
  'Die übersprungenen Wörter sind wieder dabei.': 'The skipped words are back.',
  'Aussprache automatisch': 'Speak the answer',
  'Die Stimme kommt vom Gerät, es wird nichts heruntergeladen.': 'The voice comes from your device, nothing is downloaded.',
  ' Auf diesem Gerät ist noch keine französische Stimme installiert.': ' No French voice is installed on this device yet.',
  Aussehen: 'Appearance',
  System: 'System',
  Hell: 'Light',
  Dunkel: 'Dark',
  Sprache: 'Language',
  'Sprache wechseln?': 'Switch language?',
  'Die App stellt auf {language} um. Dein Fortschritt wird dabei gelöscht, weil die englische Ausgabe eigene Karten hat.':
    'The app switches to {language}. Your progress is deleted, because the other edition has its own cards.',
  'Umstellen und zurücksetzen': 'Switch and reset',
  'Dein Fortschritt liegt nur auf diesem Gerät. Eine Sicherung schützt ihn, falls der Browser Daten löscht.':
    'Your progress lives only on this device. A backup protects it if the browser clears its data.',
  'Sicherung speichern': 'Save a backup',
  'Sicherung laden': 'Load a backup',
  'Sicherung gespeichert. Sie liegt bei deinen Downloads.': 'Backup saved. You will find it in your downloads.',
  'Sicherung laden?': 'Load the backup?',
  'Das ersetzt deinen gesamten Fortschritt auf diesem Gerät durch den Stand aus der Datei. Was du seitdem gelernt hast, geht verloren.':
    'This replaces all your progress on this device with the state in the file. Anything learned since is lost.',
  Ersetzen: 'Replace',
  '{n} Karten aus der Sicherung übernommen.': '{n} cards restored from the backup.',
  'Die Datei konnte nicht gelesen werden.': 'The file could not be read.',
  'Fortschritt zurücksetzen': 'Reset progress',
  'Allen Fortschritt löschen?': 'Delete all progress?',
  'Alle Karten gelten danach wieder als ungelernt, auf diesem Gerät. Die Karten selbst bleiben erhalten. Speichere vorher eine Sicherung, wenn du unsicher bist.':
    'Every card counts as unlearned again, on this device. The cards themselves stay. Save a backup first if you are unsure.',
  'Alles löschen': 'Delete everything',
  'Der Fortschritt wurde gelöscht.': 'Progress deleted.',
  '"{title}" überspringen?': 'Skip "{title}"?',
  '{n} Karten aus diesem Thema kommen dann nicht mehr dran. Schon gelernte Karten bleiben gespeichert, und du kannst das Thema hier jederzeit wieder aufnehmen.':
    '{n} cards from this topic will stop coming up. Cards you have learned stay saved, and you can bring the topic back here at any time.',
  Überspringen: 'Skip',
  '"{title}" wird übersprungen.': '"{title}" is being skipped.',
  '"{title}" ist wieder dabei.': '"{title}" is back.',
  Rückgängig: 'Undo',
  Abbrechen: 'Cancel',

  // review
  'Runde beenden': 'End round',
  'Runde beenden?': 'End the round?',
  'Noch {n} Karten offen. Beantwortete Karten sind gespeichert, der Rest kommt beim nächsten Start wieder.':
    '{n} cards left. Answered cards are saved, the rest come back next time.',
  Beenden: 'End',
  Weitermachen: 'Keep going',
  'noch {n} Karte': '{n} card left',
  'noch {n} Karten': '{n} cards left',
  'Finde den Fehler und schreib den Satz richtig.': 'Find the mistake and write the sentence correctly.',
  'Tippe die richtige Form an.': 'Tap the right form.',
  Antwort: 'Answer',
  'Ganzer Satz auf Französisch': 'Full sentence in French',
  'Umgeformter Satz': 'Rewritten sentence',
  'Korrigierter Satz': 'Corrected sentence',
  Verbform: 'Verb form',
  Prüfen: 'Check',
  'Weiß ich nicht': "I don't know",
  Aufdecken: 'Reveal',
  Richtig: 'Correct',
  'Fast, ein Tippfehler': 'Almost, a typo',
  'Akzent falsch': 'Wrong accent',
  Falsch: 'Wrong',
  'Akzente zählen als Fehler, sie verändern die Aussprache.': 'Accents count as mistakes: they change the pronunciation.',
  'Ein Buchstabe daneben. Zählt als gewusst, kommt aber früher wieder.':
    'One letter off. Counts as known, but comes back sooner.',
  'Aussprache anhören': 'Hear it spoken',
  'Vergleiche mit deiner Antwort. Wie gut wusstest du es?': 'Compare with your answer. How well did you know it?',
  Fast: 'Almost',
  'Sehr leicht': 'Too easy',
  'Wusste ich sofort': 'Knew it instantly',
  'Zählt als richtig': 'Count as correct',
  Weiter: 'Next',

  // finish
  'Runde fertig': 'Round finished',
  'Alles richtig.': 'All correct.',
  '{right} von {total} richtig': '{right} of {total} correct',
  'Morgen warten {n} Karten auf dich.': '{n} cards are waiting tomorrow.',
  'Morgen kommen wieder neue Karten dazu.': 'New cards arrive again tomorrow.',
  'Diese Karten kommen morgen wieder': 'These cards come back tomorrow',
  'Zur Übersicht': 'Back to overview',

  // placement
  'Einstufung · Übersetzen': 'Placement · Translate',
  'Stufe {band} von {bands} · Wort {i} von {n}': 'Level {band} of {bands} · word {i} of {n}',
  'Kenne ich nicht': "Don't know it",
  'Antwort prüfen': 'Check answer',
  'Sechs Wörter pro Stufe, von häufig zu selten. Fünf richtige und die ganze Stufe gilt als bekannt, sonst endet die Einstufung hier. Erst am Ende entscheidest du, ob etwas übersprungen wird.':
    'Six words per level, from common to rare. Five right and the whole level counts as known, otherwise the check ends here. You decide at the end whether anything is skipped.',
  'Einstufung abbrechen?': 'Cancel the placement check?',
  'Es wird nichts übersprungen und nichts gespeichert. Du kannst die Einstufung jederzeit in den Einstellungen neu starten.':
    'Nothing is skipped and nothing is saved. You can restart the check from the settings at any time.',
  'Ergebnis der Einstufung': 'Placement result',
  '{n} Wort': '{n} word',
  '{n} Wörter': '{n} words',
  '{words} kannst du überspringen.': 'You can skip {words}.',
  'Das sind die häufigsten Wörter der Liste. Sie kommen dann nicht mehr in der Tagesrunde vor, alles Seltenere schon.':
    'These are the most common words on the list. They stop appearing in the daily round; rarer ones still do.',
  'Du kannst das in den Einstellungen jederzeit zurückholen. Grammatikthemen überspringst du einzeln in der Themenliste.':
    'You can undo this in the settings at any time. Grammar topics are skipped one by one in the topic list.',
  'Nichts überspringen': 'Skip nothing',
  '{words} überspringen': 'Skip {words}',
  'Es wird nichts übersprungen.': 'Nothing will be skipped.',
  'Du fängst bei den häufigsten Wörtern an. Das ist bei diesem Ergebnis der sinnvollste Start, und der Abstand zwischen den Wiederholungen wächst ohnehin schnell, wenn du eine Karte sicher kannst.':
    'You start with the most common words. With this result that is the sensible start, and the gaps between reviews grow quickly once you know a card.',
  'Alles klar': 'Got it',
  'Für die Einstufung fehlen Wortkarten.': 'There are no word cards for the placement check.',
  Zurück: 'Back',

  // card formats
  Übersetzen: 'Translate',
  Lücke: 'Gap',
  Konjugieren: 'Conjugate',
  Umformen: 'Rewrite',
  Auswählen: 'Choose',
  'Fehler finden': 'Find the mistake',
  'Satz übersetzen': 'Translate the sentence',

  HEUTE: 'TODAY',
  'in {n} min': 'in {n} min',
  'später heute': 'later today',
  morgen: 'tomorrow',
  'in {n} Tagen': 'in {n} days',
  'in {n} Monaten': 'in {n} months',
  'in {n} Jahren': 'in {n} years',
  RICHTIG: 'CORRECT',
  '{done} von {total} Karten heute geschafft': '{done} of {total} cards done today',
  'Ergebnis {score}': 'Result {score}',

  // boot
  'Die Karten konnten nicht geladen werden. Prüfe die Verbindung und öffne die App noch einmal.':
    'The cards could not be loaded. Check your connection and open the app again.',
}

/** Translates one interface string and fills in any {placeholders}. */
export function t(german: string, params?: Record<string, string | number>): string {
  const text = lang === 'en' ? (EN[german] ?? german) : german
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, key) => String(params[key] ?? match))
}
