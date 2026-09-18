import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { setDeck } from './cards'
import { applyTheme, getTheme } from './db'
import { getPair, loadDeck } from './deck'
import { setLang } from './i18n'
import './styles.css'

registerSW({ immediate: true })

applyTheme(getTheme())

// Ask the browser not to evict our IndexedDB data under storage pressure.
navigator.storage?.persist?.().catch(() => {})

const root = createRoot(document.getElementById('root')!)

try {
  const deck = await loadDeck(getPair())
  setDeck(deck.cards, deck.sections)
  setLang(deck.ui)
  document.documentElement.lang = deck.ui
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  console.error(error)
  root.render(
    <main>
      <h1>Offline?</h1>
      <p>Die Karten konnten nicht geladen werden. Prüfe die Verbindung und öffne die App noch einmal.</p>
      <p lang="en">The cards could not be loaded. Check your connection and open the app again.</p>
    </main>,
  )
}
