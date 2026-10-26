import { useEffect, useState } from 'react'
import { Eye, EyeOff, Plug, RotateCcw } from 'lucide-react'
import { useStore, DEFAULT_SYSTEM_PROMPT } from '../store/useStore'
import {
  PROVIDERS,
  clearSettings,
  hasUsableSettings,
  type ProviderId,
  type Settings,
} from '../lib/providers'
import { testConnection, ApiError } from '../lib/ai'
import { pushToast } from './toast'

/**
 * Settings / Providers modal (PRD §4.2 – CRITICAL).
 * Provider dropdown, Base URL, API key with show/hide, model input,
 * Test Connection, custom System Prompt, localStorage persistence.
 */
export default function SettingsModal() {
  const open = useStore((s) => s.settingsModalOpen)
  const setOpen = useStore((s) => s.setSettingsModalOpen)
  const stored = useStore((s) => s.settings)
  const commitSettings = useStore((s) => s.commitSettings)
  const systemPrompt = useStore((s) => s.systemPrompt)
  const setSystemPrompt = useStore((s) => s.setSystemPrompt)

  const [draft, setDraft] = useState<Settings>(stored)
  const [promptDraft, setPromptDraft] = useState(systemPrompt)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(stored)
      setPromptDraft(systemPrompt)
    }
  }, [open, stored, systemPrompt])

  if (!open) return null

  const preset = PROVIDERS[draft.provider]

  const pickProvider = (id: ProviderId) => {
    const p = PROVIDERS[id]
    setDraft((d) => ({ ...d, provider: id, baseUrl: p.baseUrl, model: p.defaultModel }))
  }

  const save = () => {
    commitSettings({
      ...draft,
      baseUrl: draft.baseUrl.trim(),
      apiKey: draft.apiKey.trim(),
      model: draft.model.trim(),
    })
    setSystemPrompt(promptDraft.trim() ? promptDraft : DEFAULT_SYSTEM_PROMPT)
    pushToast(
      'success',
      'Settings saved',
      'Stored in your browser only — never sent to any server but the provider you chose.',
    )
    setOpen(false)
  }

  const forget = () => {
    clearSettings()
    commitSettings({
      provider: 'openai',
      baseUrl: PROVIDERS.openai.baseUrl,
      model: PROVIDERS.openai.defaultModel,
      apiKey: '',
    })
    setDraft((d) => ({ ...d, apiKey: '' }))
    pushToast('info', 'API key removed from this browser')
  }

  const test = async () => {
    if (!hasUsableSettings(draft)) {
      pushToast('error', 'Fill in Base URL, API key and Model first')
      return
    }
    setTesting(true)
    try {
      const reply = await testConnection({
        baseUrl: draft.baseUrl,
        apiKey: draft.apiKey,
        model: draft.model,
        protocol: PROVIDERS[draft.provider].protocol,
      })
      pushToast('success', 'Connection OK ✓', `${draft.model} replied: “${reply}”`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err)
      const tip = err instanceof ApiError ? err.tip : undefined
      pushToast('error', 'Connection failed', tip ? `${msg} — ${tip}` : msg)
    } finally {
      setTesting(false)
    }
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
            🔒 <strong>BYOK &amp; privacy:</strong> your API key is stored only in this browser's{' '}
            <code>localStorage</code> and sent directly to the provider. Use keys with spending
            limits where possible.
          </div>

          <label className="field">
            <span>Provider</span>
            <select value={draft.provider} onChange={(e) => pickProvider(e.target.value as ProviderId)}>
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
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
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

          <label className="field">
            <span>System Prompt (advanced)</span>
            <textarea
              rows={7}
              spellCheck={false}
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              placeholder={DEFAULT_SYSTEM_PROMPT}
            />
            <div className="prompt-actions">
              <span className="hint">
                Controls how the AI formats its output. Keep the three JSON keys or parsing will fail.
              </span>
              <button
                type="button"
                className="mini-btn"
                onClick={() => setPromptDraft(DEFAULT_SYSTEM_PROMPT)}
              >
                <RotateCcw size={12} /> Reset to default
              </button>
            </div>
          </label>

          <div className="modal-actions">
            <button className="btn ghost" onClick={forget}>
              Remove key
            </button>
            <button className="btn secondary" onClick={test} disabled={testing}>
              <Plug size={14} /> {testing ? 'Testing…' : 'Test Connection'}
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
