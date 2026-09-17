/**
 * French pronunciation through the voice built into the device.
 * No audio files, so it costs nothing in download size and works offline once
 * the system voice is installed.
 */

let voice: SpeechSynthesisVoice | null = null

function pickVoice() {
  if (!('speechSynthesis' in window)) return
  const voices = speechSynthesis.getVoices()
  const french = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('fr'))
  // Prefer a France French voice over Canadian; prefer a downloaded high quality one.
  voice = french.find((v) => v.lang.toLowerCase().startsWith('fr-fr')) ?? french[0] ?? null
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice()
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** True once a French voice is actually available on this device. */
export function hasFrenchVoice(): boolean {
  if (!canSpeak()) return false
  if (!voice) pickVoice()
  return voice !== null
}

const SPEAK_KEY = 'cartes.speak'

export function getAutoSpeak(): boolean {
  try {
    return localStorage.getItem(SPEAK_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setAutoSpeak(on: boolean) {
  try {
    localStorage.setItem(SPEAK_KEY, on ? 'on' : 'off')
  } catch {
    /* storage unavailable, the choice just will not persist */
  }
}

/** Says a French word or sentence. Gaps and stray punctuation are cleaned up first. */
export function speak(text: string) {
  if (!canSpeak()) return
  const clean = text
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return
  if (!voice) pickVoice()
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(clean)
  utterance.lang = 'fr-FR'
  if (voice) utterance.voice = voice
  utterance.rate = 0.92
  speechSynthesis.speak(utterance)
}
