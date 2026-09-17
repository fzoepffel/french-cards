import { useEffect, useRef } from 'react'

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
 */
export function Confirm({ title, body, confirmLabel, cancelLabel = 'Abbrechen', destructive, onConfirm, onCancel }: ConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
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
    </div>
  )
}
