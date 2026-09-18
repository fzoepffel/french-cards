import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ConfirmProps {
  title: string
  /** What exactly will happen, in plain words */
  body: string
  confirmLabel: string
  cancelLabel?: string
  /** Red confirm button for anything that removes cards or progress */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * In-app confirmation. Used for every action that takes cards out of the rotation or
 * overwrites progress, so nothing irreversible happens on a single tap.
 *
 * Rendered into the app frame rather than in place: an animated ancestor becomes the
 * containing block for position: fixed in Safari, which left the dialog sitting in
 * the middle of the page instead of the middle of the screen. The frame is the
 * visible area, so the dialog centres on what the reader can actually see.
 */
export function Confirm({ title, body, confirmLabel, cancelLabel = 'Abbrechen', destructive, onConfirm, onCancel }: ConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    // hold the page still while the dialog is open
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onCancel])

  return createPortal(
    <div className="backdrop" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title">{title}</h2>
        <p>{body}</p>
        <div className="dialog-buttons">
          <button ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.getElementById('frame') ?? document.body,
  )
}
