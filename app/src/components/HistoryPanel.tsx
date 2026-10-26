import { useState } from 'react'
import { Pencil, Trash2, X, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

/**
 * "My Apps" history drawer (feature §5.A): lists saved projects with
 * load / rename / delete actions. Persisted in localStorage.
 */
export default function HistoryPanel() {
  const open = useStore((s) => s.historyOpen)
  const setOpen = useStore((s) => s.setHistoryOpen)
  const history = useStore((s) => s.history)
  const loadProject = useStore((s) => s.loadProject)
  const deleteProject = useStore((s) => s.deleteProject)
  const renameProject = useStore((s) => s.renameProject)
  const navigate = useNavigate()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  if (!open) return null

  const startRename = (id: string, title: string) => {
    setEditingId(id)
    setEditValue(title)
  }

  const commitRename = () => {
    if (editingId) renameProject(editingId, editValue)
    setEditingId(null)
  }

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <aside
        className="history-panel"
        role="dialog"
        aria-label="Project history"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>
            <FolderOpen size={17} /> My Apps
          </h2>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close history">
            <X size={16} />
          </button>
        </header>

        {history.length === 0 ? (
          <div className="history-empty">
            <p>No saved apps yet.</p>
            <p className="muted">Generate something in the builder and it will appear here automatically.</p>
          </div>
        ) : (
          <ul className="history-list">
            {history.map((h) => (
              <li key={h.id} className="history-item">
                {editingId === h.id ? (
                  <div className="rename-row">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={commitRename}
                    />
                  </div>
                ) : (
                  <button
                    className="history-open"
                    title="Open this project"
                    onClick={() => {
                      loadProject(h.id)
                      navigate('/build')
                    }}
                  >
                    <strong>{h.title}</strong>
                    <span className="muted">
                      {new Date(h.timestamp).toLocaleString()} · {h.chat_history.length} messages ·{' '}
                      {Object.keys(h.generated_files).length} files
                    </span>
                  </button>
                )}
                <div className="history-actions">
                  <button
                    className="mini-btn"
                    title="Rename"
                    onClick={() => startRename(h.id, h.title)}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    className="mini-btn danger-icon"
                    title="Delete"
                    onClick={() => deleteProject(h.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
