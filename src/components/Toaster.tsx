import { useEffect, useState } from 'react'
import { dismissToast, subscribeToasts, type Toast } from './toast'

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => subscribeToasts(setToasts), [])

  return (
    <div className="toaster" role="region" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <div className="toast-icon">{t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}</div>
          <div className="toast-body">
            <strong>{t.title}</strong>
            {t.body && <p>{t.body}</p>}
          </div>
          <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
