/**
 * Product limits derived from the Groq free tier.
 *
 * These are not arbitrary. Groq's free tier for `openai/gpt-oss-120b` allows
 * 8,000 tokens per minute, and a single review must fit inside that ceiling
 * in one request. Every value below is a slice of that budget.
 *
 * Centralised here so the same numbers drive input validation, the client
 * token meter, and the server-side budget guard — see DATABASE.md and
 * API.md, which both cite this file as the source of truth.
 */

/**
 * Rough characters-per-token ratio.
 *
 * Deliberately a heuristic rather than a real tokenizer dependency: we need a
 * conservative guard, not accuracy, and a tokenizer is a large dependency to
 * carry for a comparison against a threshold.
 */
export const CHARS_PER_TOKEN = 4;

/** Shortest input worth sending to a reviewer. */
export const MIN_SOURCE_CHARS = 10;

/**
 * Longest accepted source input, in characters (~2,000 tokens).
 *
 * Enforced in a single Zod schema shared by client and server, so oversized
 * input is rejected before it ever reaches the network.
 */
export const MAX_SOURCE_CHARS = 8_000;

/**
 * Per-request token budget, in tokens.
 *
 * `total` must stay below `ceiling`, leaving headroom for estimation error.
 * This invariant is asserted in limits.test.ts.
 */
export const TOKEN_BUDGET = {
  /** Groq free-tier tokens-per-minute ceiling for gpt-oss-120b. */
  ceiling: 8_000,
  /** System prompt plus scoring rubric. */
  systemPrompt: 600,
  /** JSON schema sent alongside the request. */
  jsonSchema: 500,
  /** User source code (MAX_SOURCE_CHARS / CHARS_PER_TOKEN). */
  sourceCode: 2_000,
  /** Reserved for the model's structured output. */
  reservedOutput: 4_000,
} as const;

/** Reviews a single user may run per day, protecting the shared account quota. */
export const DAILY_REVIEW_QUOTA = 10;

/** Estimate the token cost of a string. Intentionally conservative. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
