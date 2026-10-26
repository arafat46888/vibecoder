import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { PROVIDERS } from '../lib/providers'
import { ApiError, SYSTEM_PROMPT, buildUserMessage, streamChat } from '../lib/ai'
import { ensureReferences, parseAiResponse } from '../lib/parseResponse'
import { pushToast } from './toast'

/**
 * Left panel of the builder (PRD §4.3): chat history, streaming responses,
 * loading states and the prompt input.
 */
export default function ChatPanel() {
  const navigate = useNavigate()
  const messages = useStore((s) => s.messages)
  const addMessage = useStore((s) => s.addMessage)
  const appendToMessage = useStore((s) => s.appendToMessage)
  const finalizeMessage = useStore((s) => s.finalizeMessage)
  const status = useStore((s) => s.status)
  const setStatus = useStore((s) => s.setStatus)
  const files = useStore((s) => s.files)
  const setProject = useStore((s) => s.setProject)
  const pendingPrompt = useStore((s) => s.pendingPrompt)
  const setPendingPrompt = useStore((s) => s.setPendingPrompt)
  const setSettingsModalOpen = useStore((s) => s.setSettingsModalOpen)

  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll while streaming
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, status])

  async function send(text: string) {
    const prompt = text.trim()
    if (!prompt || status === 'thinking' || status === 'writing') return

    const st = useStore.getState()
    const settings = st.settings
    if (!settings.apiKey) {
      pushToast('error', 'No API key configured', 'Open Settings (⚙️), paste your provider key and save.')
      setSettingsModalOpen(true)
      return
    }

    setInput('')
    addMessage({ role: 'user', content: prompt })
    const assistantId = addMessage({ role: 'assistant', content: '', pending: true })
    setStatus('thinking')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const full = await streamChat(
        {
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model: settings.model,
          protocol: PROVIDERS[settings.provider].protocol,
        },
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(prompt, useStore.getState().files) },
        ],
        {
          signal: controller.signal,
          onToken: (tok) => {
            const s2 = useStore.getState()
            if (s2.status === 'thinking') setStatus('writing')
            appendToMessage(assistantId, tok)
          },
        },
      )

      const parsed = parseAiResponse(full)
      if (parsed.files) {
        const normalized = ensureReferences(parsed.files)
        setProject(normalized)
        finalizeMessage(assistantId, {
          content: '✅ Done! I updated index.html, theme.css and script.js — check the preview →',
        })
        setStatus('done')
        setTimeout(() => setStatus('idle'), 1800)
      } else {
        // Invalid JSON fallback (PRD §6): show message + raw AI text.
        finalizeMessage(assistantId, {
          content:
            '⚠️ The model did not return valid JSON for the three app files. Raw response:\n\n' +
            '```\n' +
            full.slice(0, 4000) +
            (full.length > 4000 ? '\n…truncated' : '') +
            '\n```',
          error: true,
        })
        setStatus('error')
        pushToast('error', 'Could not parse the AI response', 'Try a stronger model (e.g. gpt-4o) or rephrase the prompt.')
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        finalizeMessage(assistantId, { content: '⏹ Generation stopped by user.' })
        setStatus('idle')
        return
      }
      const msg = err instanceof ApiError ? err.message : String(err)
      const tip = err instanceof ApiError ? err.tip : undefined
      finalizeMessage(assistantId, { content: `❌ ${msg}${tip ? `\n\n💡 ${tip}` : ''}`, error: true })
      setStatus('error')
      pushToast('error', `Request failed${err instanceof ApiError && err.status ? ` (HTTP ${err.status})` : ''}`, tip ?? msg)
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  // Auto-send prompts handed over from the landing page / templates
  useEffect(() => {
    if (pendingPrompt) {
      setPendingPrompt(null)
      void send(pendingPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt])

  const busy = status === 'thinking' || status === 'writing'

  return (
    <section className="chat-panel" aria-label="Chat">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && !busy && (
          <div className="chat-empty">
            <p>👋 Describe the app you want to build, then hit Send.</p>
            <p className="muted">
              Follow-ups like “make the background blue” edit the existing code.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`bubble bubble-${m.role}${m.error ? ' bubble-error' : ''}`}>
            {m.role === 'assistant' && m.pending && m.content === '' ? (
              <span className="loading">
                <span className="dot" /> <span className="dot" /> <span className="dot" />
                &nbsp;Contacting {PROVIDERS[useStore.getState().settings.provider].label}…
              </span>
            ) : m.role === 'assistant' ? (
              <pre className="bubble-text">{m.content}</pre>
            ) : (
              <pre className="bubble-text">{m.content}</pre>
            )}
          </div>
        ))}

        {status === 'writing' && (
          <div className="status-line">✍️ Writing code… (index.html, theme.css, script.js)</div>
        )}
        {status === 'thinking' && <div className="status-line">🧠 Creating theme.css… thinking about structure…</div>}
        {status === 'done' && <div className="status-line ok">🎨 Rendering live preview…</div>}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void send(input)
            }
          }}
          placeholder={files ? 'e.g. Make the background blue…' : 'e.g. A solar system with orbiting planets…'}
          rows={3}
          disabled={busy}
        />
        <div className="chat-input-actions">
          <span className="muted kbd-hint">Ctrl/⌘ + Enter to send</span>
          {busy ? (
            <button type="button" className="btn danger" onClick={() => abortRef.current?.abort()}>
              Stop
            </button>
          ) : (
            <button type="submit" className="btn primary" disabled={!input.trim()}>
              Send ➤
            </button>
          )}
        </div>
      </form>

      <div className="chat-footer">
        <button className="link-btn" onClick={() => navigate('/')}>
          ← Start a new project
        </button>
      </div>
    </section>
  )
}
