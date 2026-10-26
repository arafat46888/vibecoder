import { create } from 'zustand'
import type { Settings } from '../lib/providers'
import { PROVIDERS, loadSettings, saveSettings as persistSettings } from '../lib/providers'
import type { ProjectFiles } from '../lib/parseResponse'
import { ensureReferences, parseAiResponse } from '../lib/parseResponse'
import { ApiError, buildUserMessage, streamChat } from '../lib/ai'
import { autoTitle, loadHistory, persistHistory, type HistoryItem } from '../lib/history'
import { pushToast } from '../components/toast'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system-note'
  content: string
  /** true while the assistant message is still streaming */
  pending?: boolean
  error?: boolean
}

export type AppStatus = 'idle' | 'thinking' | 'writing' | 'done' | 'error'

const DEFAULT_SYSTEM_PROMPT = `You are an expert web developer. You must output a valid JSON object containing three keys: "index.html", "theme.css", and "script.js".
DO NOT wrap the JSON in markdown code blocks (no \`\`\`json). DO NOT include any conversational text.
Ensure all CSS and JS are linked correctly in the HTML file. Use modern, beautiful CSS with animations. Keep the code concise but fully functional.`

interface AppState {
  // ---- settings (BYOK) ----
  settings: Settings
  settingsModalOpen: boolean
  setSettingsModalOpen: (v: boolean) => void
  commitSettings: (s: Settings) => void

  // ---- system prompt customization ----
  systemPrompt: string
  setSystemPrompt: (p: string) => void

  // ---- theme ----
  theme: 'dark' | 'light'
  toggleTheme: () => void

  // ---- chat ----
  messages: ChatMessage[]
  addMessage: (m: Omit<ChatMessage, 'id'>) => string
  appendToMessage: (id: string, text: string) => void
  finalizeMessage: (id: string, patch?: Partial<ChatMessage>) => void
  clearChat: () => void

  status: AppStatus
  setStatus: (s: AppStatus) => void

  files: ProjectFiles | null
  projectName: string
  projectId: string | null
  setProjectName: (n: string) => void
  setPendingPrompt: (p: string | null) => void
  pendingPrompt: string | null

  // ---- generation actions ----
  sendPrompt: (text: string) => Promise<void>
  stopGeneration: () => void
  regenerateLast: () => void
  fixBug: (errors: string) => void

  // ---- history ("My Apps") ----
  history: HistoryItem[]
  historyOpen: boolean
  setHistoryOpen: (v: boolean) => void
  saveCurrentProject: () => void
  loadProject: (id: string) => void
  deleteProject: (id: string) => void
  renameProject: (id: string, title: string) => void
  newProject: () => void

  // ---- layout ----
  chatWidthPct: number
  setChatWidthPct: (pct: number) => void
  fullscreenPreview: boolean
  setFullscreenPreview: (v: boolean) => void
  mobileTab: 'chat' | 'preview' | 'code'
  setMobileTab: (t: 'chat' | 'preview' | 'code') => void
}

let counter = 0
const uid = () => `m${Date.now().toString(36)}-${(counter++).toString(36)}`

// ---------- persistence helpers ----------
const SYS_KEY = 'ai-builder-system-prompt'
const THEME_KEY = 'ai-builder-theme'
const PANEL_KEY = 'ai-builder-panel-width'
const DRAFT_KEY = 'ai-builder-draft'

function loadSystemPrompt(): string {
  try {
    return localStorage.getItem(SYS_KEY) || DEFAULT_SYSTEM_PROMPT
  } catch {
    return DEFAULT_SYSTEM_PROMPT
  }
}

function initialTheme(): 'dark' | 'light' {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore */
  }
}

function initialPanelPct(): number {
  try {
    const v = Number(localStorage.getItem(PANEL_KEY))
    if (v >= 20 && v <= 80) return v
  } catch {
    /* ignore */
  }
  return 42
}

/** Auto-save draft (feature: restore state after refresh mid-session). */
function saveDraft(s: Pick<AppState, 'messages' | 'files' | 'projectName' | 'projectId' | 'status'>) {
  try {
    // Never leave a half-streamed message marked pending in the draft.
    const messages = s.messages.map((m) => (m.pending ? { ...m, pending: false } : m))
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ messages, files: s.files, projectName: s.projectName, projectId: s.projectId }),
    )
  } catch {
    /* storage full — ignore */
  }
}

function loadDraft(): { messages: ChatMessage[]; files: ProjectFiles | null; projectName: string; projectId: string | null } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d || !Array.isArray(d.messages)) return null
    return {
      messages: d.messages,
      files: d.files ?? null,
      projectName: d.projectName ?? 'my-app',
      projectId: d.projectId ?? null,
    }
  } catch {
    return null
  }
}

let abortController: AbortController | null = null

export const useStore = create<AppState>((set, get) => {
  const draft = loadDraft()

  const persist = () => {
    const s = get()
    saveDraft(s)
  }

  return {
    settings: loadSettings(),
    settingsModalOpen: false,
    setSettingsModalOpen: (v) => set({ settingsModalOpen: v }),
    commitSettings: (s) => {
      persistSettings(s)
      set({ settings: s })
    },

    systemPrompt: loadSystemPrompt(),
    setSystemPrompt: (p) => {
      try {
        localStorage.setItem(SYS_KEY, p.trim() ? p : DEFAULT_SYSTEM_PROMPT)
      } catch {
        /* ignore */
      }
      set({ systemPrompt: p })
    },

    theme: 'dark',
    toggleTheme: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      set({ theme: next })
    },

    messages: draft?.messages ?? [],
    addMessage: (m) => {
      const id = uid()
      set((st) => ({ messages: [...st.messages, { ...m, id }] }))
      persist()
      return id
    },
    appendToMessage: (id, text) => {
      set((st) => ({
        messages: st.messages.map((mm) => (mm.id === id ? { ...mm, content: mm.content + text } : mm)),
      }))
    },
    finalizeMessage: (id, patch) => {
      set((st) => ({
        messages: st.messages.map((mm) =>
          mm.id === id ? { ...mm, ...(patch ?? {}), pending: false } : mm,
        ),
      }))
      persist()
    },
    clearChat: () => {
      set({ messages: [] })
      persist()
    },

    status: 'idle',
    setStatus: (s) => set({ status: s }),

    files: draft?.files ?? null,
    projectName: draft?.projectName ?? 'my-app',
    projectId: draft?.projectId ?? null,
    setProjectName: (n) => {
      set({ projectName: n })
      const id = get().projectId
      if (id) {
        set((st) => ({
          history: st.history.map((h) => (h.id === id ? { ...h, title: n } : h)),
        }))
        persistHistory(get().history)
      }
      persist()
    },

    pendingPrompt: null,
    setPendingPrompt: (p) => set({ pendingPrompt: p }),

    // ---------------- generation ----------------
    sendPrompt: async (text) => {
      const prompt = text.trim()
      const st = get()
      if (!prompt || st.status === 'thinking' || st.status === 'writing') return

      const settings = st.settings
      if (!settings.apiKey.trim()) {
        pushToast('error', 'No API key configured', 'Open Settings (⚙️), paste your provider key and save.')
        set({ settingsModalOpen: true })
        return
      }

      get().addMessage({ role: 'user', content: prompt })
      const assistantId = get().addMessage({ role: 'assistant', content: '', pending: true })
      set({ status: 'thinking' })

      const controller = new AbortController()
      abortController = controller

      const currentFiles = get().files
      const sysPrompt = get().systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT

      try {
        const full = await streamChat(
          {
            baseUrl: settings.baseUrl,
            apiKey: settings.apiKey,
            model: settings.model,
            protocol: PROVIDERS[settings.provider].protocol,
          },
          [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: buildUserMessage(
              prompt,
              currentFiles,
              get()
                .messages.filter((mm) => mm.role === 'user' || mm.role === 'assistant')
                .map((mm) => ({ role: mm.role as 'user' | 'assistant', content: mm.content })),
            ) },
          ],
          {
            signal: controller.signal,
            onToken: (tok) => {
              if (get().status === 'thinking') set({ status: 'writing' })
              get().appendToMessage(assistantId, tok)
            },
          },
        )

        const parsed = parseAiResponse(full)
        if (parsed.files) {
          const normalized = ensureReferences(parsed.files)
          const isFirst = !get().projectId && !get().files
          const projectId = get().projectId ?? uid()
          const name = isFirst ? autoTitle(prompt) : get().projectName
          set({ files: normalized, projectId, projectName: name })
          get().finalizeMessage(assistantId, {
            content: '✅ Done! I updated index.html, theme.css and script.js — check the preview →',
          })
          set({ status: 'done' })
          get().saveCurrentProject()
          setTimeout(() => {
            if (get().status === 'done') set({ status: 'idle' })
          }, 1800)
        } else {
          get().finalizeMessage(assistantId, {
            content:
              '⚠️ The model did not return valid JSON for the three app files. Raw response:\n\n```\n' +
              full.slice(0, 4000) +
              (full.length > 4000 ? '\n…truncated' : '') +
              '\n```',
            error: true,
          })
          set({ status: 'error' })
          pushToast('error', 'Could not parse the AI response', 'Try a stronger model (e.g. gpt-4o) or rephrase the prompt.')
          setTimeout(() => set({ status: 'idle' }), 2500)
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          get().finalizeMessage(assistantId, { content: '⏹ Generation stopped by user.' })
          set({ status: 'idle' })
          return
        }
        const msg = err instanceof ApiError ? err.message : String(err)
        const tip = err instanceof ApiError ? err.tip : undefined
        get().finalizeMessage(assistantId, {
          content: `❌ ${msg}${tip ? `\n\n💡 ${tip}` : ''}`,
          error: true,
        })
        set({ status: 'error' })
        pushToast(
          'error',
          `Request failed${err instanceof ApiError && err.status ? ` (HTTP ${err.status})` : ''}`,
          tip ?? msg,
        )
        setTimeout(() => {
          if (get().status === 'error') set({ status: 'idle' })
        }, 2500)
      } finally {
        abortController = null
        persist()
      }
    },

    stopGeneration: () => {
      abortController?.abort()
      abortController = null
      set({ status: 'idle' })
    },

    regenerateLast: () => {
      const msgs = get().messages
      // find last non-error user message
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') {
          void get().sendPrompt(msgs[i].content)
          return
        }
      }
    },

    fixBug: (errors) => {
      const trimmed = errors.trim().slice(0, 4000)
      void get().sendPrompt(
        `The app has runtime/console errors. Fix them and return the corrected three-file JSON.\n\nConsole errors:\n${trimmed}`,
      )
    },

    // ---------------- history ----------------
    history: loadHistory(),
    historyOpen: false,
    setHistoryOpen: (v) => set({ historyOpen: v }),

    saveCurrentProject: () => {
      const s = get()
      if (!s.files || Object.keys(s.files).length === 0) return
      const item: HistoryItem = {
        id: s.projectId ?? uid(),
        title: s.projectName,
        timestamp: Date.now(),
        chat_history: s.messages.filter((m) => !m.pending),
        generated_files: s.files,
      }
      const rest = s.history.filter((h) => h.id !== item.id)
      const next = [item, ...rest].slice(0, 100)
      persistHistory(next)
      set({ history: next, projectId: item.id })
    },

    loadProject: (id) => {
      const item = get().history.find((h) => h.id === id)
      if (!item) return
      set({
        messages: item.chat_history.map((m) => ({ ...m, pending: false })),
        files: item.generated_files,
        projectName: item.title,
        projectId: item.id,
        historyOpen: false,
        status: 'idle',
      })
      persist()
    },

    deleteProject: (id) => {
      const next = get().history.filter((h) => h.id !== id)
      persistHistory(next)
      set({ history: next })
      if (get().projectId === id) {
        set({ projectId: null })
        try {
          localStorage.removeItem(DRAFT_KEY)
        } catch {
          /* ignore */
        }
      }
      pushToast('info', 'Project deleted')
    },

    renameProject: (id, title) => {
      const clean = title.trim()
      if (!clean) return
      const next = get().history.map((h) => (h.id === id ? { ...h, title: clean } : h))
      persistHistory(next)
      set({ history: next })
      if (get().projectId === id) set({ projectName: clean })
    },

    newProject: () => {
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        /* ignore */
      }
      set({ messages: [], files: null, projectName: 'my-app', projectId: null, status: 'idle' })
    },

    // ---------------- layout ----------------
    chatWidthPct: initialPanelPct(),
    setChatWidthPct: (pct) => {
      const clamped = Math.min(80, Math.max(20, pct))
      set({ chatWidthPct: clamped })
      try {
        localStorage.setItem(PANEL_KEY, String(clamped))
      } catch {
        /* ignore */
      }
    },

    fullscreenPreview: false,
    setFullscreenPreview: (v) => set({ fullscreenPreview: v }),

    mobileTab: 'chat',
    setMobileTab: (t) => set({ mobileTab: t }),
  }
})

// Apply theme on startup & keep multiple tabs in sync with localStorage changes.
applyTheme(initialTheme())
useStore.setState({ theme: initialTheme() })

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'ai-builder-settings') useStore.setState({ settings: loadSettings() })
    if (e.key === 'ai-builder-history') useStore.setState({ history: loadHistory() })
  })
}

export const getState = useStore.getState
export { DEFAULT_SYSTEM_PROMPT }
