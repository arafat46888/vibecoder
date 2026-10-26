import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Moon, Settings, Sun, Sparkles } from 'lucide-react'
import { useStore } from '../store/useStore'
import { GearButton } from '../components/TopBarBits'
import { CATEGORIES, SUGGESTIONS, TEMPLATES } from '../lib/templates'

/**
 * Landing page (PRD §4.1): hero with prompt box, quick suggestion chips and
 * a filterable template gallery. Submitting navigates to /build and auto-sends.
 */
export default function Home() {
  const navigate = useNavigate()
  const setPendingPrompt = useStore((s) => s.setPendingPrompt)
  const newProject = useStore((s) => s.newProject)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const historyCount = useStore((s) => s.history.length)
  const setHistoryOpen = useStore((s) => s.setHistoryOpen)

  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')

  const launch = (text: string) => {
    const p = text.trim()
    if (!p) return
    newProject()
    setPendingPrompt(p)
    navigate('/build')
  }

  const shown = TEMPLATES.filter((t) => category === 'All' || t.category === category)

  return (
    <div className="home">
      <nav className="home-nav">
        <span className="logo">
          <Sparkles size={18} /> Vibecraft<span className="logo-accent">AI</span>
        </span>
        <div className="home-nav-actions">
          {historyCount > 0 && (
            <button className="btn ghost" onClick={() => setHistoryOpen(true)}>
              My Apps ({historyCount})
            </button>
          )}
          <button className="icon-btn" onClick={toggleTheme} title="Toggle dark/light mode" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <GearButton />
        </div>
      </nav>

      <header className="hero">
        <h1>
          Build Apps with <span className="grad-text">AI</span>
        </h1>
        <p className="sub">
          Describe it, watch it appear. Bring your own API key — your prompts, code and keys never
          leave your browser. No servers, no subscriptions.
        </p>

        <form
          className="hero-prompt"
          onSubmit={(e) => {
            e.preventDefault()
            launch(prompt)
          }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                launch(prompt)
              }
            }}
            placeholder="e.g. A solar system explorer with animated orbiting planets…"
            rows={3}
          />
          <button type="submit" className="btn primary lg" disabled={!prompt.trim()}>
            Start building <ArrowRight size={16} />
          </button>
        </form>

        <div className="chips">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => setPrompt(s)}>
              ✨ {s}
            </button>
          ))}
        </div>
      </header>

      <section className="gallery" aria-label="Template gallery">
        <div className="gallery-head">
          <h2>Template Gallery</h2>
          <div className="filters">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`filter-btn${category === c ? ' active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid">
          {shown.map((t) => (
            <button
              key={t.id}
              className="card"
              onClick={() => launch(t.prompt)}
              title={`Build: ${t.prompt.slice(0, 120)}…`}
            >
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

      <footer className="home-footer">
        <p>
          <Settings size={13} /> BYOK architecture: works with OpenAI, Anthropic, Groq, Ollama or any
          OpenAI-compatible endpoint. 100% client-side.
        </p>
      </footer>
    </div>
  )
}
