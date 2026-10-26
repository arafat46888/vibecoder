import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

/** Settings gear icon shown on every page (opens the BYOK provider modal). */
export default function GearButton() {
  const setModal = useStore((s) => s.setSettingsModalOpen)
  return (
    <button
      className="icon-btn"
      title="AI Provider Settings"
      aria-label="Open settings"
      onClick={() => setModal(true)}
    >
      ⚙️
    </button>
  )
}

/** Small pill showing which provider is configured. */
export function ProviderBadge() {
  const settings = useStore((s) => s.settings)
  const setModal = useStore((s) => s.setSettingsModalOpen)
  const ok = settings.apiKey.length > 0
  return (
    <button
      className={`provider-pill ${ok ? 'ok' : 'warn'}`}
      onClick={() => setModal(true)}
      title={ok ? `${settings.provider} · ${settings.model}` : 'Configure your API key'}
    >
      {ok ? `🟢 ${settings.model}` : '🔴 Connect an API key'}
    </button>
  )
}

/** Back-to-home button used in the builder top bar. */
export function BackHome() {
  const nav = useNavigate()
  return (
    <button className="btn ghost" onClick={() => nav('/')} title="Back to Home">
      ← Home
    </button>
  )
}
