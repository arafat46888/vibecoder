import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Code, Download, FolderOpen, MessageSquare, Monitor, Moon, Plus, Rocket, Sun, House as HomeIcon } from 'lucide-react'
import { useStore } from '../store/useStore'
import ChatPanel from '../components/ChatPanel'
import Workspace from '../components/Workspace'
import HistoryPanel from '../components/HistoryPanel'
import { GearButton, ProviderBadge } from '../components/TopBarBits'
import { downloadZip, exportToCodeSandbox } from '../lib/deploy'
import { slugify } from '../lib/history'
import { pushToast } from '../components/toast'

/**
 * The split-screen builder (PRD §4.3): chat on the left, Sandpack workspace on
 * the right, draggable divider, editable project title, deploy menu and a
 * mobile bottom tab bar.
 */
export default function Builder() {
  const navigate = useNavigate()
  const projectName = useStore((s) => s.projectName)
  const setProjectName = useStore((s) => s.setProjectName)
  const files = useStore((s) => s.files)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const setHistoryOpen = useStore((s) => s.setHistoryOpen)
  const historyCount = useStore((s) => s.history.length)
  const saveCurrentProject = useStore((s) => s.saveCurrentProject)

  const chatWidthPct = useStore((s) => s.chatWidthPct)
  const setChatWidthPct = useStore((s) => s.setChatWidthPct)
  const fullscreenPreview = useStore((s) => s.fullscreenPreview)
  const setFullscreenPreview = useStore((s) => s.setFullscreenPreview)
  const mobileTab = useStore((s) => s.mobileTab)
  const setMobileTab = useStore((s) => s.setMobileTab)

  const [titleDraft, setTitleDraft] = useState(projectName)
  const [deployOpen, setDeployOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  useEffect(() => setTitleDraft(projectName), [projectName])

  // ---- resizable panels ----
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      draggingRef.current = true
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [],
  )
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current || !rootRef.current) return
      const rect = rootRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setChatWidthPct(pct)
    },
    [setChatWidthPct],
  )
  const onPointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  // ---- deploy menu close on outside click ----
  useEffect(() => {
    if (!deployOpen) return
    const close = () => setDeployOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [deployOpen])

  // Esc exits fullscreen preview
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenPreview(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setFullscreenPreview])

  const doDownload = () => {
    if (!files) {
      pushToast('info', 'Nothing to export yet — generate an app first')
      return
    }
    saveCurrentProject()
    void downloadZip(files, slugify(projectName))
    pushToast('success', 'ZIP downloaded', `${projectName}.zip contains index.html, theme.css & script.js`)
    setDeployOpen(false)
  }

  const doCodeSandbox = () => {
    if (!files) {
      pushToast('info', 'Nothing to export yet — generate an app first')
      return
    }
    window.open(exportToCodeSandbox(files), '_blank', 'noopener')
    setDeployOpen(false)
  }

  return (
    <div className="builder" ref={rootRef}>
      <header className="topbar">
        <button className="btn ghost" onClick={() => navigate('/')} title="Back to Home">
          <HomeIcon size={14} /> Home
        </button>
        <button className="btn ghost" onClick={() => navigate('/')} title="Start a new project">
          <Plus size={14} /> New
        </button>

        <input
          className="project-title"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => setProjectName(titleDraft.trim() || 'my-app')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          aria-label="Project title"
          spellCheck={false}
        />

        <div className="topbar-right">
          <ProviderBadge />
          <button className="icon-btn" onClick={toggleTheme} title="Toggle dark/light mode" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="icon-btn" onClick={() => setHistoryOpen(true)} title="My Apps / history" aria-label="History">
            <FolderOpen size={16} />
            {historyCount > 0 && <span className="count-badge">{historyCount}</span>}
          </button>
          <div className="deploy-wrap">
            <button className="btn primary" onClick={(e) => { e.stopPropagation(); setDeployOpen((v) => !v) }}>
              <Rocket size={14} /> Deploy
            </button>
            {deployOpen && (
              <div className="deploy-menu" onClick={(e) => e.stopPropagation()}>
                <button onClick={doDownload}>
                  <Download size={14} /> Download as ZIP
                </button>
                <button onClick={doCodeSandbox}>
                  <Code size={14} /> Open in CodeSandbox
                </button>
              </div>
            )}
          </div>
          <GearButton />
        </div>
      </header>

      <main className={`split${fullscreenPreview ? ' fs-preview' : ''}`}>
        {!fullscreenPreview && (
          <>
            <div
              className="pane chat-pane mobile-visible"
              style={{ flexBasis: `${chatWidthPct}%` }}
              data-active={mobileTab === 'chat'}
            >
              <ChatPanel />
            </div>
            <div
              className="divider"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              title="Drag to resize"
            />
          </>
        )}
        <div className="pane ws-pane mobile-visible" data-active={mobileTab !== 'chat'}>
          <Workspace
            fullscreen={fullscreenPreview}
            onToggleFullscreen={() => setFullscreenPreview(!fullscreenPreview)}
          />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="mobile-tabs" aria-label="Panels">
        <button className={mobileTab === 'chat' ? 'active' : ''} onClick={() => { setFullscreenPreview(false); setMobileTab('chat') }}>
          <MessageSquare size={16} /> Chat
        </button>
        <button className={mobileTab === 'preview' ? 'active' : ''} onClick={() => { setFullscreenPreview(false); setMobileTab('preview') }}>
          <Monitor size={16} /> Preview
        </button>
        <button className={mobileTab === 'code' ? 'active' : ''} onClick={() => { setFullscreenPreview(false); setMobileTab('code') }}>
          <Code size={16} /> Code
        </button>
      </nav>

      <HistoryPanel />
    </div>
  )
}
