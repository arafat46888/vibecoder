import type { ChatMessage } from '../store/useStore'
import type { ProjectFiles } from './parseResponse'

/** A saved project (PRD §5.A – Project History / "My Apps"). */
export interface HistoryItem {
  id: string
  title: string
  timestamp: number
  chat_history: ChatMessage[]
  generated_files: ProjectFiles
}

const KEY = 'ai-builder-history'
const MAX_ITEMS = 100

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : []
  } catch {
    return []
  }
}

export function persistHistory(items: HistoryItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    /* storage full — ignore */
  }
}

/** Derive a readable project title from the first user prompt. */
export function autoTitle(prompt: string): string {
  const clean = prompt.replace(/\s+/g, ' ').trim()
  if (!clean) return 'untitled-app'
  const short = clean.length > 42 ? clean.slice(0, 42).trimEnd() + '…' : clean
  return short.charAt(0).toUpperCase() + short.slice(1)
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'ai-app'
  )
}
