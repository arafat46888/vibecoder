import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { CATEGORIES, SUGGESTIONS, TEMPLATES } from '../lib/templates'
import GearButton, { ProviderBadge } from '../components/TopBarBits'

/** Landing page / template gallery (PRD §4.1). */
export default function Landing() {
  const navigate = useNavigate()
  const setPendingPrompt = useStore((s) => s.setPendingPrompt)
  const clearChat = useStore((s) => s.clearChat)
  const setStatus = useStore((s) => s.setStatus)
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')

  const start = (text: string) => {
    const p = text.trim()
    if (!p) return
    clearChat()
    setStatus('idle')
    useStore.setState({ files: null })
    setPendingPrompt(p)
    navigate('/builder')
  }

  const visible = category === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.category === category)

  return (
    <div className="landing">
      <header className="topbar">
        <div className="brand">🫠 AI Web App Builder</div>
        <div className="topbar-right">
          <ProviderBadge />
          <GearButton />
        </div>
      </header>

      <section className="hero">
        <h1>Build Apps with AI</h1>
        <p className="sub">
          Describe it, watch it appear, iterate in plain English. Bring your own key — everything runs in your browser.
        </p>
        <form
          className="hero-input"
          onSubmit={(e) => {
            e.preventDefault()
            start(prompt)
          }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                start(prompt)
              }
            }}
            placeholder="A habit tracker with streaks and a dark theme…"
            rows={3}
          />
          <button type="submit" className="btn primary" disabled={!prompt.trim()}>
            Build it ➤
          </button>
        </form>
        <div className="chips">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => setPrompt(s)}>
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="gallery">
        <div className="gallery-head">
          <h2>Templates</h2>
          <div className="tabs">
            {CATEGORIES.map((c) => (
              <button key={c} className={`tab${c === category ? ' active' : ''}`} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid">
          {visible.map((t) => (
            <button key={t.id} className="card" onClick={() => start(t.prompt)}>
              <div className="thumb" style={{ background: t.gradient }}>
                <span>{t.emoji}</span>
              </div>
              <div className="card-body">
                <strong>{t.name}</strong>
                <span className="tag">{t.category}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
