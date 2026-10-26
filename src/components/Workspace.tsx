import { useMemo } from 'react'
import {
  SandpackCodeViewer,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react'
import { useStore } from '../store/useStore'

/**
 * Right panel of the builder: live Sandpack preview or file tree + code viewer.
 * Sandpack only receives files once the AI response is complete (PRD §9).
 */
export default function Workspace({ view }: { view: 'preview' | 'code' }) {
  const files = useStore((s) => s.files)
  const status = useStore((s) => s.status)
  const busy = status === 'thinking' || status === 'writing'

  const sandpackFiles = useMemo(() => {
    if (!files) return null
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(files)) out[`/${k}`] = v
    return out
  }, [files])

  if (!sandpackFiles) {
    return (
      <section className="workspace empty">
        {busy ? (
          <div className="placeholder">
            <div className="spinner" />
            <p>Generating your app…</p>
          </div>
        ) : (
          <div className="placeholder">
            <p>🪄 Your app preview appears here.</p>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="workspace">
      {busy && <div className="workspace-overlay">Updating…</div>}
      <SandpackProvider
        template="static"
        theme="dark"
        files={sandpackFiles}
        options={{ activeFile: '/index.html', visibleFiles: Object.keys(sandpackFiles) }}
      >
        <SandpackLayout className="sp-layout">
          {view === 'preview' ? (
            <SandpackPreview className="sp-preview" showOpenInCodeSandbox={false} showRefreshButton />
          ) : (
            <>
              <SandpackFileExplorer className="sp-files" autoHiddenFiles />
              <SandpackCodeViewer showLineNumbers wrapContent />
            </>
          )}
        </SandpackLayout>
      </SandpackProvider>
    </section>
  )
}
