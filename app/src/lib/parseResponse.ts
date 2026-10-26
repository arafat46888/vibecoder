export type ProjectFiles = Record<string, string>

export interface ParseResult {
  files: ProjectFiles | null
  /** Raw text fallback when JSON parsing fails (PRD §6 error handling) */
  raw: string
}

const FILE_KEYS = ['index.html', 'theme.css', 'script.js'] as const

/** Strip a leading ```json / ``` fence if present. */
function stripFences(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return fence ? fence[1].trim() : text.trim()
}

/** Pull the first balanced {...} object out of arbitrary text. */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
    } else {
      if (ch === '"') inStr = true
      else if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) return text.slice(start, i + 1)
      }
    }
  }
  return null
}

function looksLikeFile(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function normalizeKeys(obj: Record<string, unknown>): ProjectFiles | null {
  // Map any key naming variants onto our canonical three files.
  const out: ProjectFiles = {}
  const alias = (k: string) => k.toLowerCase().replace(/[^a-z.]/g, '')
  for (const [key, value] of Object.entries(obj)) {
    const a = alias(key)
    if (!looksLikeFile(value)) continue
    if (a.includes('html')) out['index.html'] = value
    else if (a.includes('css')) out['theme.css'] = value
    else if (a.includes('js')) out['script.js'] = value
  }
  return Object.keys(out).length > 0 ? out : null
}

/** Best-effort recovery from broken JSON using per-key regexes. */
function salvage(text: string): ProjectFiles | null {
  const out: ProjectFiles = {}
  for (const key of FILE_KEYS) {
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^\\\\"])*)"`, 'g')
    let best: RegExpMatchArray | null = null
    let m: RegExpMatchArray | null
    while ((m = re.exec(text))) {
      if (!best || m[1].length > best[1].length) best = m
    }
    if (best) {
      try {
        out[key] = JSON.parse(`"${best[1]}"`) as string
      } catch {
        /* skip */
      }
    }
  }
  return Object.keys(out).length >= 2 ? out : null
}

/**
 * Robust parser (PRD §9 – "AI sometimes wraps JSON in Markdown").
 * Tries: plain JSON → fenced block → brace extraction → salvage regexes.
 */
export function parseAiResponse(fullText: string): ParseResult {
  const candidates: string[] = []
  const trimmed = fullText.trim()
  candidates.push(trimmed)
  const unfenced = stripFences(trimmed)
  if (unfenced !== trimmed) candidates.push(unfenced)
  const braced = extractJsonObject(unfenced)
  if (braced) candidates.push(braced)

  for (const c of candidates) {
    if (!c) continue
    try {
      const obj = JSON.parse(c)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const files = normalizeKeys(obj as Record<string, unknown>)
        if (files) return { files, raw: fullText }
      }
    } catch {
      /* try next candidate */
    }
  }

  const salvaged = salvage(unfenced)
  if (salvaged) return { files: salvaged, raw: fullText }

  return { files: null, raw: fullText }
}

/** Ensure index.html references theme.css & script.js relatively (Sandpack needs it). */
export function ensureReferences(files: ProjectFiles): ProjectFiles {
  let html = files['index.html'] ?? '<!doctype html><html><head></head><body></body></html>'
  if (!/<link[^>]+["']\.?\/?theme\.css["']/i.test(html)) {
    if (/<head>/i.test(html)) html = html.replace(/<head>/i, '<head>\n<link rel="stylesheet" href="theme.css" />')
    else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>/i, (m) => `${m}<head><link rel="stylesheet" href="theme.css" /></head>`)
    else html = `<link rel="stylesheet" href="theme.css" />\n${html}`
  }
  if (!/<script[^>]+src=["']\.?\/?script\.js["']/i.test(html)) {
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, '<script src="script.js"></script>\n</body>')
    else html = `${html}\n<script src="script.js"></script>`
  }
  return {
    'index.html': html,
    'theme.css': files['theme.css'] ?? '',
    'script.js': files['script.js'] ?? '',
  }
}
