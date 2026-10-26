import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Ban, RefreshCw, Wrench, Zap, Bug } from 'lucide-react'
import { useStore } from '../store/useStore'
import { PROVIDERS } from '../lib/providers'
import { estimateCost, formatUsd } from '../lib/tokens'

declare global {
  interface Window {
    /** Console errors captured from the Sandpack preview iframe (for "Fix bug"). */
    __sandpackConsoleErrors?: string[]
  }
}

/**
 * Left panel of the builder (PRD §4.3): chat history, streaming responses,
 * loading states, quick model selector, token/cost estimator, stop & regenerate.
 */
export default function ChatPanel({ onShowErrors }: { onShowErrors?: () => void }) {
  const messages = useStore((s) => s.messages)
  const status = useStore((s) => s.status)
  const files = useStore((s) => s.files)
  const settings = useStore((s) => s.settings)
  const commitSettings = useStore((s) => s.commitSettings)
  const sendPrompt = useStore((s) => s.sendPrompt)
  const stopGeneration = useStore((s) => s.stopGeneration)
  const regenerateLast = useStore((s) => s.regenerateLast)
  const fixBug = useStore((s) => s.fixBug)
  const pendingPrompt = useStore((s) => s.pendingPrompt)
  const setPendingPrompt = useStore((s) => s.setPendingPrompt)

  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll while streaming
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, status])

  // Auto-send prompts handed over from the landing page / templates
  useEffect(() => {
    if (pendingPrompt) {
      const p = pendingPrompt
      setPendingPrompt(null)
      void sendPrompt(p)
    }
  }, [pendingPrompt, setPendingPrompt, sendPrompt])

  const busy = status === 'thinking' || status === 'writing'

  // Token / cost estimate for the pending request (feature #6)
  const estimate = useMemo(() => {
    const promptText = input.trim()
    if (!promptText) return null
    const currentCode = files
      ? Object.values(files).join('\n').slice(0, 20000)
      : ''
    return estimateCost(`system+${currentCode}+${promptText}`, settings.model)
  }, [input, files, settings.model])

  const preset = PROVIDERS[settings.provider]

  const submit = () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    void sendPrompt(text)
  }

  // Index of the last assistant message (for the Regenerate button)
  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i
    }
    return -1
  }, [messages])

  return (
    <section className="chat-panel" aria-label="Chat">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && !busy && (
          <div className="chat-empty">
            <p>👋 Describe the app you want to build, then hit Send.</p>
            <p className="muted">
              Follow-ups like “make the background blue” edit the existing code iteratively.
            </p>
          </div>
        )}

        {messages.map((m, idx) => (
          <div
            key={m.id}
            className={`bubble bubble-${m.role}${m.error ? ' bubble-error' : ''}`}
          >
            {m.role === 'assistant' && m.pending && m.content === '' ? (
              <span className="loading">
                <span className="dot" /> <span className="dot" /> <span className="dot" />
                &nbsp;Contacting {preset.label}…
              </span>
            ) : (
              <pre className="bubble-text">{m.content}</pre>
            )}
            {m.role === 'assistant' && !m.pending && idx === lastAssistantIdx && !busy && (
              <div className="msg-actions">
                <button
                  className="mini-btn"
                  title="Regenerate response"
                  onClick={() => regenerateLast()}
                >
                  <RefreshCw size={13} /> Regenerate
                </button>
                {files && (
                  <button
                    className="mini-btn"
                    title="Ask the AI to fix the console errors captured in the preview"
                    onClick={() => {
                      const errs = window.__sandpackConsoleErrors ?? []
                      if (errs.length === 0) {
                        onShowErrors?.()
                        return
                      }
                      fixBug(errs.join('\n'))
                    }}
                  >
                    <Wrench size={13} /> Fix bug
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {status === 'thinking' && (
          <div className="status-line">🧠 Creating theme.css… thinking about structure…</div>
        )}
        {status === 'writing' && (
          <div className="status-line">✍️ Writing code… (index.html, theme.css, script.js)</div>
        )}
        {status === 'done' && <div className="status-line ok">🎨 Rendering live preview…</div>}
      </div>

      {/* Quick model selector + error log access (above the input) */}
      <div className="chat-toolbar">
        <label className="model-quick" title="Quick model switch">
          <Zap size={13} />
          <select
            value={settings.model}
            onChange={(e) => commitSettings({ ...settings, model: e.target.value })}
            disabled={busy}
          >
            {[...new Set([settings.model, ...preset.models])].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {files && (
          <button className="mini-btn" onClick={onShowErrors} title="Preview console errors">
            <Bug size={13} /> Console
            {(window.__sandpackConsoleErrors?.length ?? 0) > 0 && (
              <span className="err-badge">{window.__sandpackConsoleErrors!.length}</span>
            )}
          </button>
        )}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={files ? 'e.g. Make the background blue…' : 'e.g. A solar system with orbiting planets…'}
          rows={3}
          disabled={busy}
        />
        <div className="chat-input-actions">
          {estimate ? (
            <span className="token-est" title="Approximate tokens & cost for this request (client-side estimate)">
              ≈{estimate.totalTokens.toLocaleString()} tok · {formatUsd(estimate.costUsd)}
              {!estimate.known && '*'}
            </span>
          ) : (
            <span className="muted kbd-hint">Ctrl/⌘ + Enter to send</span>
          )}
          {busy ? (
            <button type="button" className="btn danger" onClick={stopGeneration}>
              <Ban size={14} /> Stop
            </button>
          ) : (
            <button type="submit" className="btn primary" disabled={!input.trim()} title="Send">
              <ArrowUp size={15} /> Send
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
