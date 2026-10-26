import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import {
  PROVIDERS,
  clearSettings,
  hasUsableSettings,
  type ProviderId,
  type Settings,
} from '../lib/providers'
import { pushToast } from './toast'

/**
 * Settings / Providers modal (PRD §4.2 – CRITICAL).
 * Provider dropdown, Base URL, API key with show/hide, model, localStorage persistence.
 */
export default function SettingsModal() {
  const open = useStore((s) => s.settingsModalOpen)
  const setOpen = useStore((s) => s.setSettingsModalOpen)
  const stored = useStore((s) => s.settings)
  const commitSettings = useStore((s) => s.commitSettings)

  const [draft, setDraft] = useState<Settings>(stored)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (open) setDraft(stored)
  }, [open, stored])

  if (!open) return null

  const preset = PROVIDERS[draft.provider]

  const pickProvider = (id: ProviderId) => {
    const p = PROVIDERS[id]
    setDraft((d) => ({ ...d, provider: id, baseUrl: p.baseUrl, model: p.defaultModel }))
  }

  const save = () => {
    commitSettings({ ...draft, baseUrl: draft.baseUrl.trim(), apiKey: draft.apiKey.trim(), model: draft.model.trim() })
    pushToast('success', 'Settings saved', 'Stored in your browser only — never sent to any server but the provider you chose.')
    setOpen(false)
  }

  const forget = () => {
    clearSettings()
    setDraft({ ...PROVIDERS.openai, apiKey: '' } as unknown as Settings)
    commitSettings({ provider: 'openai', baseUrl: PROVIDERS.openai.baseUrl, model: PROVIDERS.openai.defaultModel, apiKey: '' })
    pushToast('info', 'API key removed from this browser')
  }

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="AI provider settings"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>⚙️ AI Provider Settings</h2>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close settings">
            ×
          </button>
        </header>

        <div className="modal-body">
          <div className="security-note">
            🔒 <strong>BYOK &amp; privacy:</strong> your API key is stored only in this browser's
            <code>localStorage</code> and sent directly to the provider. Use keys with spending
            limits where possible.
          </div>

          <label className="field">
            <span>Provider</span>
            <select
              value={draft.provider}
              onChange={(e) => pickProvider(e.target.value as ProviderId)}
            >
              {Object.values(PROVIDERS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Base URL</span>
            <input
              type="text"
              spellCheck={false}
              value={draft.baseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
            />
          </label>

          <label className="field">
            <span>API Key</span>
            <div className="key-row">
              <input
                type={showKey ? 'text' : 'password'}
                spellCheck={false}
                autoComplete="off"
                value={draft.apiKey}
                placeholder="sk-…"
                onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
              />
              <button
                type="button"
                className="icon-btn eye"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                title={showKey ? 'Hide' : 'Show'}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          <label className="field">
            <span>Model</span>
            <input
              list="model-suggestions"
              type="text"
              spellCheck={false}
              value={draft.model}
              placeholder={preset.defaultModel}
              onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
            />
            <datalist id="model-suggestions">
              {preset.models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>

          {preset.hint && <p className="hint">{preset.hint}</p>}

          <details className="cors-help">
            <summary>❓ CORS help — my request is blocked</summary>
            <p>
              Because this app has no backend, calls go straight from your browser to the provider.
              OpenAI, Anthropic and Groq allow this. For local/custom endpoints: enable CORS for
              browser origins (Ollama:&nbsp;
              <code>OLLAMA_ORIGINS=* ollama serve</code>; LM Studio: check “Enable CORS” in the
              server tab), or route through a proxy that adds permissive CORS headers.
            </p>
          </details>

          <div className="modal-actions">
            <button className="btn ghost" onClick={forget}>
              Remove key
            </button>
            <button className="btn primary" onClick={save} disabled={!hasUsableSettings(draft)}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
