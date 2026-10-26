import { create } from 'zustand'
import type { Settings } from '../lib/providers'
import { loadSettings, saveSettings as persistSettings } from '../lib/providers'
import type { ProjectFiles } from '../lib/parseResponse'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system-note'
  content: string
  /** true while the assistant message is still streaming */
  pending?: boolean
  error?: boolean
}

export type AppStatus = 'idle' | 'thinking' | 'writing' | 'done' | 'error'

interface AppState {
  settings: Settings
  settingsModalOpen: boolean
  setSettingsModalOpen: (v: boolean) => void
  updateSettings: (patch: Partial<Settings>) => void
  commitSettings: (s: Settings) => void

  messages: ChatMessage[]
  addMessage: (m: Omit<ChatMessage, 'id'>) => string
  appendToMessage: (id: string, text: string) => void
  finalizeMessage: (id: string, patch?: Partial<ChatMessage>) => void
  clearChat: () => void

  status: AppStatus
  setStatus: (s: AppStatus) => void

  files: ProjectFiles | null
  projectName: string
  setProject: (files: ProjectFiles, name?: string) => void

  pendingPrompt: string | null
  setPendingPrompt: (p: string | null) => void
}

let counter = 0
const uid = () => `m${Date.now().toString(36)}-${(counter++).toString(36)}`

export const useStore = create<AppState>((set) => ({
  settings: loadSettings(),

  settingsModalOpen: false,
  setSettingsModalOpen: (v) => set({ settingsModalOpen: v }),
  updateSettings: (patch) => set((st) => ({ settings: { ...st.settings, ...patch } })),
  commitSettings: (s) => {
    persistSettings(s)
    set({ settings: s })
  },

  messages: [],
  addMessage: (m) => {
    const id = uid()
    set((st) => ({ messages: [...st.messages, { ...m, id }] }))
    return id
  },
  appendToMessage: (id, text) =>
    set((st) => ({
      messages: st.messages.map((mm) => (mm.id === id ? { ...mm, content: mm.content + text } : mm)),
    })),
  finalizeMessage: (id, patch) =>
    set((st) => ({
      messages: st.messages.map((mm) =>
        mm.id === id ? { ...mm, ...(patch ?? {}), pending: false } : mm,
      ),
    })),
  clearChat: () => set({ messages: [] }),

  status: 'idle',
  setStatus: (s) => set({ status: s }),

  files: null,
  projectName: 'my-app',
  setProject: (files, name) => set((st) => ({ files, projectName: name ?? st.projectName })),

  pendingPrompt: null,
  setPendingPrompt: (p) => set({ pendingPrompt: p }),
}))

// Keep multiple tabs in sync with localStorage changes.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'ai-builder-settings') {
      useStore.setState({ settings: loadSettings() })
    }
  })
}

export const getState = useStore.getState
