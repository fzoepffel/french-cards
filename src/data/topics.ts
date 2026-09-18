// Types only: the sections themselves travel inside each deck file (public/decks),
// because a language pair can need different topics.

export interface Topic {
  id: string
  title: string
}

export interface Section {
  id: string
  title: string
  topics: Topic[]
}

