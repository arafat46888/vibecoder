/** Client-side token & cost estimation for the chat input footer. */

export interface ModelPricing {
  inputPerMTok: number
  outputPerMTok: number
}

/** Approximate USD per million tokens (public list prices, mid-2026). Unknown models fall back to a generic estimate. */
export const PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { inputPerMTok: 2.5, outputPerMTok: 10 },
  'gpt-4o-mini': { inputPerMTok: 0.15, outputPerMTok: 0.6 },
  'gpt-4.1': { inputPerMTok: 2, outputPerMTok: 8 },
  'gpt-4.1-mini': { inputPerMTok: 0.4, outputPerMTok: 1.6 },
  'o4-mini': { inputPerMTok: 1.1, outputPerMTok: 4.4 },
  'claude-sonnet-4-20250514': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-3-5-sonnet-20240620': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-3-5-haiku-20241022': { inputPerMTok: 0.8, outputPerMTok: 4 },
  'llama-3.3-70b-versatile': { inputPerMTok: 0.59, outputPerMTok: 0.79 },
  'llama-3.1-8b-instant': { inputPerMTok: 0.05, outputPerMTok: 0.08 },
  'mixtral-8x7b-32768': { inputPerMTok: 0.27, outputPerMTok: 0.27 },
}

const FALLBACK: ModelPricing = { inputPerMTok: 1, outputPerMTok: 4 }

export function pricingFor(model: string): ModelPricing {
  if (PRICING[model]) return PRICING[model]
  const hit = Object.keys(PRICING).find((k) => model.includes(k) || k.includes(model))
  return hit ? PRICING[hit] : FALLBACK
}

/** Rough heuristic: ~4 chars per token. Good enough for a live estimator. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export interface CostEstimate {
  promptTokens: number
  estCompletionTokens: number
  totalTokens: number
  costUsd: number
  known: boolean
}

export function estimateCost(
  promptText: string,
  model: string,
  expectedOutputChars = 6000,
): CostEstimate {
  const promptTokens = estimateTokens(promptText)
  const estCompletionTokens = estimateTokens('x'.repeat(expectedOutputChars))
  const p = pricingFor(model)
  const known = !!PRICING[model]
  const costUsd =
    (promptTokens / 1_000_000) * p.inputPerMTok +
    (estCompletionTokens / 1_000_000) * p.outputPerMTok
  return {
    promptTokens,
    estCompletionTokens,
    totalTokens: promptTokens + estCompletionTokens,
    costUsd,
    known,
  }
}

export function formatUsd(v: number): string {
  if (v <= 0) return '$0.0000'
  if (v < 0.01) return `$${v.toFixed(5)}`
  return `$${v.toFixed(3)}`
}
