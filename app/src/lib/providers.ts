export type ProviderId = 'openai' | 'anthropic' | 'groq' | 'custom'

export interface ProviderPreset {
  id: ProviderId
  label: string
  baseUrl: string
  defaultModel: string
  /** 'openai' = /chat/completions protocol, 'anthropic' = /messages protocol */
  protocol: 'openai' | 'anthropic'
  models: string[]
  hint?: string
}

export const PROVIDERS: Record<ProviderId, ProviderPreset> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    protocol: 'openai',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    protocol: 'anthropic',
    models: [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20240620',
      'claude-3-5-haiku-20241022',
    ],
    hint: 'Anthropic allows direct browser calls via the "anthropic-dangerous-direct-browser-access" header.',
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    protocol: 'openai',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    hint: 'Groq has a generous free tier and is very fast.',
  },
  custom: {
    id: 'custom',
    label: 'Custom (OpenAI-Compatible)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    protocol: 'openai',
    models: ['llama3.1', 'qwen2.5-coder', 'deepseek-r1'],
    hint: 'Works with Ollama (http://localhost:11434/v1), LM Studio (http://localhost:1234/v1), OpenRouter, etc. The endpoint must allow CORS from this browser origin.',
  },
}

export interface Settings {
  provider: ProviderId
  baseUrl: string
  apiKey: string
  model: string
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'openai',
  baseUrl: PROVIDERS.openai.baseUrl,
  apiKey: '',
  model: PROVIDERS.openai.defaultModel,
}

const STORAGE_KEY = 'ai-builder-settings'

/** Persist settings to localStorage. Keys never leave the browser (PRD §4.2). */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasUsableSettings(s: Settings): boolean {
  return s.apiKey.trim().length > 0 && s.baseUrl.trim().length > 0 && s.model.trim().length > 0
}
