// Mirrors CURRICULUM.md. Order here is the order topics appear in the app.

export interface Topic {
  id: string
  title: string
}

export interface Section {
  id: string
  title: string
  topics: Topic[]
}

export const SECTIONS: Section[] = [
  {
    id: 'nomen',
    title: 'Nomen und Artikel',
    topics: [
      { id: 'genus-endung', title: 'Genus nach Endung' },
      { id: 'genus-anders', title: 'Genus anders als im Deutschen' },
      { id: 'genus-bedeutung', title: 'Genus ändert die Bedeutung' },
      { id: 'plural', title: 'Unregelmäßiger Plural' },
      { id: 'artikel', title: 'Artikel und Teilungsartikel' },
      { id: 'personen-feminin', title: 'Weibliche Personenbezeichnungen' },
    ],
  },
  {
    id: 'adjektive',
    title: 'Adjektive und Adverbien',
    topics: [
      { id: 'adj-feminin', title: 'Unregelmäßige Formen' },
      { id: 'adj-stellung', title: 'Stellung und Bedeutung' },
      { id: 'vergleich', title: 'Vergleich' },
      { id: 'adverb-ment', title: 'Adverbien auf -ment' },
    ],
  },
  {
    id: 'pronomen',
    title: 'Pronomen',
    topics: [
      { id: 'objektpronomen', title: 'Objektpronomen' },
      { id: 'y-en', title: 'y und en' },
      { id: 'betont', title: 'Betonte Pronomen' },
      { id: 'relativ', title: 'Relativpronomen' },
      { id: 'possessiv-demonstrativ', title: 'Possessiv und Demonstrativ' },
      { id: 'indefinit', title: 'Indefinitpronomen' },
    ],
  },
  {
    id: 'verbformen',
    title: 'Verbformen',
    topics: [
      { id: 'stammwechsel', title: 'Verben mit Schreibwechsel' },
      { id: 'present', title: 'Présent' },
      { id: 'passe-compose', title: 'Passé composé' },
      { id: 'imparfait', title: 'Imparfait' },
      { id: 'plus-que-parfait', title: 'Plus-que-parfait' },
      { id: 'futur', title: 'Futur simple' },
      { id: 'futur-proche', title: 'Futur proche und passé récent' },
      { id: 'futur-anterieur', title: 'Futur antérieur' },
      { id: 'conditionnel', title: 'Conditionnel présent' },
      { id: 'conditionnel-passe', title: 'Conditionnel passé' },
      { id: 'subjonctif', title: 'Subjonctif présent' },
      { id: 'subjonctif-passe', title: 'Subjonctif passé' },
      { id: 'imperatif', title: 'Impératif' },
      { id: 'gerondif', title: 'Gérondif und Infinitiv Perfekt' },
      { id: 'passe-simple', title: 'Passé simple (erkennen)' },
      { id: 'hilfsverb', title: 'être oder avoir' },
      { id: 'accord', title: 'Angleichung des Partizips' },
      { id: 'passiv', title: 'Passiv' },
      { id: 'pronominal', title: 'Pronominale Verben' },
    ],
  },
  {
    id: 'gebrauch',
    title: 'Zeiten und Modi',
    topics: [
      { id: 'pc-imparfait', title: 'Passé composé oder imparfait' },
      { id: 'si-saetze', title: 'Si-Sätze' },
      { id: 'subjonctif-ausloeser', title: 'Wann subjonctif' },
      { id: 'quand-futur', title: 'quand + futur' },
      { id: 'indirekte-rede', title: 'Indirekte Rede' },
      { id: 'zeitangaben', title: 'depuis, il y a, pendant' },
      { id: 'faire-causatif', title: 'faire und laisser + Infinitiv' },
      { id: 'modalverben', title: 'Modalverben' },
    ],
  },
  {
    id: 'rektion',
    title: 'Mit à, de oder ohne',
    topics: [
      { id: 'verb-praep', title: 'Verb + Präposition' },
      { id: 'verb-a-qn-de', title: 'à qn de faire qc' },
      { id: 'anders-als-deutsch', title: 'Anders als im Deutschen' },
      { id: 'adj-praep', title: 'Adjektiv + Präposition' },
      { id: 'nomen-praep', title: 'Nomen + Präposition' },
    ],
  },
  {
    id: 'praepositionen',
    title: 'Präpositionen',
    topics: [
      { id: 'orte', title: 'Orte und Länder' },
      { id: 'verkehrsmittel', title: 'Verkehrsmittel' },
      { id: 'zeit-praep', title: 'Zeit' },
      { id: 'lage', title: 'Lage' },
    ],
  },
  {
    id: 'satzbau',
    title: 'Satzbau',
    topics: [
      { id: 'verneinung', title: 'Verneinung' },
      { id: 'fragen', title: 'Fragen' },
      { id: 'hervorhebung', title: 'Hervorhebung' },
      { id: 'konnektoren', title: 'Konnektoren' },
    ],
  },
  {
    id: 'zahlen',
    title: 'Zahlen, Datum, Uhrzeit',
    topics: [
      { id: 'zahlen', title: 'Zahlen' },
      { id: 'datum-uhrzeit', title: 'Datum und Uhrzeit' },
    ],
  },
  {
    id: 'wortschatz',
    title: 'Wortschatz',
    topics: [
      { id: 'grundwortschatz', title: 'Grundwortschatz' },
      { id: 'wortfamilien', title: 'Wortfamilien' },
      { id: 'verwechsel', title: 'Leicht verwechselt' },
      { id: 'falsche-freunde', title: 'Falsche Freunde' },
      { id: 'kollokationen', title: 'Feste Verbindungen' },
      { id: 'redewendungen', title: 'Redewendungen' },
      { id: 'register', title: 'Umgangssprache und Register' },
    ],
  },
  {
    id: 'schreibung',
    title: 'Schreiben & Aussprache',
    topics: [
      { id: 'homophone', title: 'Gleich klingende Wörter' },
      { id: 'elision-liaison', title: 'Elision und Liaison' },
    ],
  },
]

export const TOPIC_BY_ID = new Map(SECTIONS.flatMap((s) => s.topics.map((t) => [t.id, t] as const)))

/** Topic ids in curriculum order. */
export const TOPIC_ORDER = SECTIONS.flatMap((s) => s.topics.map((t) => t.id))
