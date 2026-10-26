import { useState } from 'react'
import { useStore } from '../store/useStore'
import ChatPanel from '../components/ChatPanel'
import Workspace from '../components/Workspace'
import GearButton, { BackHome, ProviderBadge } from '../components/TopBarBits'
import { downloadZip, exportToCodeSandbox } from '../lib/deploy'
import { pushToast } from '../components/toast'

/** Split-screen builder (PRD §4.3). */
export default function Builder() {
  const files = useStore((s) => s.files)
  const projectName = useStore((s) => s.projectName)
  const [view, setView] = useState<'preview' | 'code'>('preview')
  const [menuOpen, setMenuOpen] = useState(false)

  const onZip = async () => {
    setMenuOpen(false)
    if (!files) return
    await downloadZip(files, projectName)
    pushToast('success', 'ZIP downloaded')
  }

  const onSandbox = () => {
    setMenuOpen(false)
    if (!files) return
    window.open(exportToCodeSandbox(files), '_blank', 'noopener')
  }

  return (
    <div className="builder">
      <header className="topbar">
        <div className="topbar-left">
          <BackHome />
          <div className="brand small">🫠 Builder</div>
        </div>
        <div className="segmented">
          <button className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>
            Preview
          </button>
          <button className={view === 'code' ? 'active' : ''} onClick={() => setView('code')}>
            Code
          </button>
        </div>
        <div className="topbar-right">
          <div className="menu-wrap">
            <button className="btn primary" disabled={!files} onClick={() => setMenuOpen((v) => !v)}>
              Deploy ▾
            </button>
            {menuOpen && files && (
              <div className="menu" onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => void onZip()}>⬇️ Download ZIP</button>
                <button onClick={onSandbox}>📦 Open in CodeSandbox</button>
              </div>
            )}
          </div>
          <ProviderBadge />
          <GearButton />
        </div>
      </header>
      <main className="split">
        <ChatPanel />
        <Workspace view={view} />
      </main>
    </div>
  )
}
