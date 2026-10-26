import type { ProjectFiles } from './parseResponse'

/**
 * System prompt (PRD §5.4). Instructs the model to answer with a strict JSON
 * object containing index.html / theme.css / script.js.
 */
export const SYSTEM_PROMPT = `You are an expert web developer AI. The user will ask you to build or modify a web application.

Return ONLY a valid JSON object — no markdown fences, no explanations, no comments outside the JSON. The JSON must have exactly these three keys:
- "index.html": a complete HTML document that links "theme.css" and "script.js" with relative paths (<link rel="stylesheet" href="theme.css"> and <script src="script.js"></script>). Do not inline large CSS/JS in the HTML.
- "theme.css": all styles for the app.
- "script.js": all JavaScript for the app (no ES module imports; it runs directly in the browser).

Rules:
1. Output must start with "{" and end with "}". Escape newlines and quotes properly inside JSON strings.
2. The app must be fully self-contained: no external CSS/JS libraries and no remote images (use CSS shapes, gradients, emoji or inline SVG instead). Google Fonts may be imported via @import in theme.css.
3. Make it polished, modern, responsive and visually appealing by default.
4. When the user's current code is provided, keep its structure, apply only the requested change, and return ALL THREE files again.`

export function buildUserMessage(prompt: string, currentFiles: ProjectFiles | null): string {
  if (!currentFiles || Object.keys(currentFiles).length === 0) {
    return `Build this app:\n\n${prompt}`
  }
  // Iterative editing (PRD §4.4): send original code + the new prompt.
  return (
    `Here is the current code of my app:\n\n` +
    `<file name="index.html">\n${currentFiles['index.html'] ?? ''}\n</file>\n\n` +
    `<file name="theme.css">\n${currentFiles['theme.css'] ?? ''}\n</file>\n\n` +
    `<file name="script.js">\n${currentFiles['script.js'] ?? ''}\n</file>\n\n` +
    `Apply this change and return the updated app as the same three-file JSON object:\n\n${prompt}`
  )
}

export interface StreamHandlers {
  onToken: (text: string) => void
  signal?: AbortSignal
}

export class ApiError extends Error {
  status: number
  tip?: string
  constructor(status: number, message: string, tip?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.tip = tip
  }
}

export interface ResolvedConnection {
  baseUrl: string
  apiKey: string
  model: string
  protocol: 'openai' | 'anthropic'
}

/**
 * Streams a chat completion from any configured provider using native fetch
 * (PRD §5.3). Returns the full assistant text. Throws ApiError on failure.
 * API keys are only ever sent directly to the provider chosen by the user.
 */
export async function streamChat(
  settings: ResolvedConnection,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  handlers: StreamHandlers,
): Promise<string> {
  const base = settings.baseUrl.replace(/\/+$/, '')
  const isAnthropic = settings.protocol === 'anthropic'

  let url: string
  let headers: Record<string, string>
  let body: Record<string, unknown>

  if (isAnthropic) {
    url = `${base}/messages`
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      // Required for direct browser calls (PRD §5.3 / §9 CORS risk)
      'anthropic-dangerous-direct-browser-access': 'true',
    }
    const system = messages.find((m) => m.role === 'system')?.content ?? ''
    body = {
      model: settings.model,
      max_tokens: 8192,
      stream: true,
      system,
      messages: messages.filter((m) => m.role !== 'system'),
    }
  } else {
    url = `${base}/chat/completions`
    headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    }
    body = {
      model: settings.model,
      stream: true,
      temperature: 0.4,
      messages,
    }
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: handlers.signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(
      0,
      'Network or CORS error: the request never reached the provider (or was blocked by the browser).',
      'If you are calling a custom/local endpoint, make sure CORS is enabled for browser origins. For Ollama run: OLLAMA_ORIGINS=* ollama serve. For LM Studio enable CORS in server settings. Alternatively use a provider that supports browser calls (OpenAI, Groq, Anthropic).',
    )
  }

  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j?.error?.message ?? j?.message ?? JSON.stringify(j).slice(0, 300)
    } catch {
      try {
        detail = (await res.text()).slice(0, 300)
      } catch {
        /* ignore */
      }
    }
    const tips: Record<number, string> = {
      401: 'Your API key was rejected. Open Settings and double-check the key.',
      403: 'Access forbidden — the key may lack permissions for this model, or CORS/billing restrictions apply.',
      404: 'Model or endpoint not found. Check the Model name and Base URL in Settings.',
      429: 'Rate limit exceeded or out of quota. Wait a moment and try again.',
    }
    throw new ApiError(res.status, `Provider returned HTTP ${res.status}. ${detail}`, tips[res.status])
  }

  if (!res.body) throw new ApiError(0, 'The provider returned an empty response body.')

  // Parse the SSE stream via ReadableStream (PRD §5.1 – streaming)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx: number
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const token: string = isAnthropic
          ? json.type === 'content_block_delta'
            ? json.delta?.text ?? ''
            : ''
          : json.choices?.[0]?.delta?.content ?? ''
        if (token) {
          full += token
          handlers.onToken(token)
        }
      } catch {
        /* skip malformed keep-alive chunks */
      }
    }
  }
  return full
}
