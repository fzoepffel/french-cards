import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { applyPalette, applyTheme, getPalette, getTheme } from './db'
import './styles.css'

registerSW({ immediate: true })

applyTheme(getTheme())
applyPalette(getPalette())

// Ask the browser not to evict our IndexedDB data under storage pressure.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
