import { useEffect, useMemo, useRef, useState } from 'react'
import { Sandpack, type SandpackProviderProps } from '@codesandbox/sandpack-react'
import { Check, Copy, FileCode2, Maximize2, Minimize2, Monitor, RotateCcw, Terminal, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ProjectFiles } from '../lib/parseResponse'
import { pushToast } from './toast'

/** Injected into the preview to capture runtime/console errors for "Fix bug". */
const ERROR_BRIDGE = `
(function () {
  var send = function (kind, msg) {
    try { parent.postMessage({ source: 'sandpack-preview-bridge', kind: kind, message: String(msg) }, '*'); } catch (e) {}
  };
  window.addEventListener('error', function (e) { send('error', (e.message || 'Script error') + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0)); });
  window.addEventListener('unhandledrejection', function (e) { send('error', 'Unhandled promise rejection: ' + (e && e.reason ? e.reason : '')); });
  var origError = console.error;
  console.error = function () { send('error', Array.prototype.slice.call(arguments).join(' ')); return origError.apply(console, arguments); };
})();`

function withBridge(files: ProjectFiles): ProjectFiles {
  const html = files['index.html'] ?? ''
  if (html.includes('sandpack-preview-bridge')) return files
  const injected = `<script>${ERROR_BRIDGE}<\/script>`
  const next = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${injected}</body>`)
    : `${html}${injected}`
  return { ...files, 'index.html': next }
}

const FILE_ICONS: Record<string, string> = {
  'index.html': '📄',
  'theme.css': '🎨',
  'script.js': '⚡',
}

interface WorkspaceProps {
  fullscreen?: boolean
  onToggleFullscreen?: () => void
}

/**
 * Right panel of the builder (PRD §4.3): Preview (Sandpack) + Code tabs,
 * debounced updates, copy button, fullscreen mode and a console-error drawer.
 */
export default function Workspace({ fullscreen = false, onToggleFullscreen }: WorkspaceProps) {
  const files = useStore((s) => s.files)
  const status = useStore((s) => s.status)
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [activeFile, setActiveFile] = useState('index.html')
  const [copied, setCopied] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const resetKeyRef = useRef(0)

  // Debounce Sandpack file updates so the iframe doesn't rebuild per keystroke
  // or mid-stream chunk — only when generation has finished (PRD §9 risk).
  const busy = status === 'thinking' || status === 'writing'
  const [debouncedFiles, setDebouncedFiles] = useState<ProjectFiles | null>(files)
  useEffect(() => {
    if (busy) return // keep showing the last stable version while streaming
    if (!files) {
      setDebouncedFiles(null)
      return
    }
    const t = setTimeout(() => setDebouncedFiles(files), 500)
    return () => clearTimeout(t)
  }, [files, busy])

  // Listen for runtime errors posted from the preview iframe bridge
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { source?: string; kind?: string; message?: string }
      if (d && d.source === 'sandpack-preview-bridge' && d.kind === 'error') {
        setErrors((prev) => {
          const msg = d.message ?? 'Unknown error'
          if (prev.includes(msg)) return prev
          const next = [...prev, msg].slice(-20)
          window.__sandpackConsoleErrors = next
          return next
        })
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  // Clear captured errors whenever a new stable build is rendered
  useEffect(() => {
    setErrors([])
    window.__sandpackConsoleErrors = []
  }, [debouncedFiles])

  const sandpackFiles = useMemo(
    () => (debouncedFiles ? withBridge(debouncedFiles) : null),
    [debouncedFiles],
  )

  const copyActive = async () => {
    if (!debouncedFiles) return
    try {
      await navigator.clipboard.writeText(debouncedFiles[activeFile] ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      pushToast('error', 'Clipboard blocked by the browser')
    }
  }

  const fixBugs = useStore((s) => s.fixBug)

  return (
    <section className={`workspace${fullscreen ? ' workspace-fullscreen' : ''}`} aria-label="Workspace">
      <div className="ws-toolbar">
        <div className="ws-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'preview'}
            className={`ws-tab${tab === 'preview' ? ' active' : ''}`}
            onClick={() => setTab('preview')}
          >
            <Monitor size={14} /> Preview
          </button>
          <button
            role="tab"
            aria-selected={tab === 'code'}
            className={`ws-tab${tab === 'code' ? ' active' : ''}`}
            onClick={() => setTab('code')}
          >
            <FileCode2 size={14} /> Code
          </button>
        </div>

        <div className="ws-actions">
          {errors.length > 0 && (
            <button className="mini-btn err-badge-btn" onClick={() => setDrawerOpen((v) => !v)}>
              <Terminal size={13} /> {errors.length} error{errors.length > 1 ? 's' : ''}
            </button>
          )}
          {tab === 'code' && (
            <button className="mini-btn" onClick={copyActive} title={`Copy ${activeFile}`}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          {!fullscreen && onToggleFullscreen && tab === 'preview' && (
            <button className="mini-btn" onClick={onToggleFullscreen} title="Fullscreen preview">
              <Maximize2 size={13} />
            </button>
          )}
          {fullscreen && onToggleFullscreen && (
            <button className="mini-btn" onClick={onToggleFullscreen} title="Exit fullscreen">
              <Minimize2 size={13} /> Exit
            </button>
          )}
        </div>
      </div>

      {drawerOpen && errors.length > 0 && (
        <div className="err-drawer">
          <div className="err-drawer-head">
            <strong>Preview console</strong>
            <div>
              <button className="mini-btn" onClick={() => fixBugs(errors.join('\n'))}>
                <RotateCcw size={12} /> Send to AI to fix
              </button>
              <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <X size={14} />
              </button>
            </div>
          </div>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="ws-body">
        {!sandpackFiles ? (
          <div className="ws-empty">
            <div className="ws-empty-icon">🪐</div>
            <p>Your live preview will appear here.</p>
            <p className="muted">Describe an app in the chat and press Send.</p>
            {busy && <div className="spinner" />}
          </div>
        ) : tab === 'preview' ? (
          <Sandpack
            key={resetKeyRef.current}
            template="static"
            theme="dark"
            files={sandpackFiles as SandpackProviderProps['files']}
            options={{
              showNavigator: true,
              showTabs: false,
              autorun: true,
              recompileMode: "delayed",
              recompileDelay: 400,
              closableTabs: false,
              editorHeight: '100%',
              containerClassName: 'sp-container',
            }}
          />
        ) : (
          <div className="code-view">
            <aside className="file-tree" aria-label="Files">
              {Object.keys(debouncedFiles!).map((f) => (
                <button
                  key={f}
                  className={`file-item${f === activeFile ? ' active' : ''}`}
                  onClick={() => setActiveFile(f)}
                >
                  <span>{FILE_ICONS[f] ?? '📄'}</span> {f}
                </button>
              ))}
            </aside>
            <pre className="code-pre">
              <code>{debouncedFiles![activeFile] ?? ''}</code>
            </pre>
          </div>
        )}
      </div>
    </section>
  )
}
