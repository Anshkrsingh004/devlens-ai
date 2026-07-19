import "server-only";

import {
  MAX_SOURCE_CHARS,
  TOKEN_BUDGET,
  estimateTokens,
} from "@/config/limits";
import { errors } from "@/lib/errors";

/**
 * Token budget guard.
 *
 * Groq's free tier allows 8,000 tokens per minute. Rejecting oversized input
 * here — before the request — turns a confusing provider 429 into a clear,
 * actionable message, and avoids spending quota on a call that would fail.
 *
 * The estimate is a deliberate chars/4 heuristic rather than a real
 * tokenizer: we need a conservative guard, not accuracy, and a tokenizer is a
 * large dependency to carry for a threshold comparison.
 *
 * Measured against the spike: an 11-line Python function cost 881 prompt
 * tokens and 1,520 completion tokens (945 of which were hidden reasoning
 * tokens). Reasoning cost scales with problem difficulty, which is why the
 * caps stay conservative even though the measured usage sat well under
 * budget.
 */

export interface BudgetEstimate {
  sourceChars: number;
  sourceTokens: number;
  estimatedTotal: number;
  ceiling: number;
  remaining: number;
}

/** Non-throwing estimate — also powers the client-side token meter in M4. */
export function estimateBudget(sourceCode: string): BudgetEstimate {
  const sourceTokens = estimateTokens(sourceCode);

  const estimatedTotal =
    TOKEN_BUDGET.systemPrompt +
    TOKEN_BUDGET.jsonSchema +
    sourceTokens +
    TOKEN_BUDGET.reservedOutput;

  return {
    sourceChars: sourceCode.length,
    sourceTokens,
    estimatedTotal,
    ceiling: TOKEN_BUDGET.ceiling,
    remaining: Math.max(0, TOKEN_BUDGET.ceiling - estimatedTotal),
  };
}

/**
 * Throw if the input cannot fit the budget.
 *
 * @throws AppError with code INPUT_TOO_LARGE
 */
export function assertWithinBudget(sourceCode: string): BudgetEstimate {
  if (sourceCode.length > MAX_SOURCE_CHARS) {
    throw errors.inputTooLarge(MAX_SOURCE_CHARS, sourceCode.length);
  }

  const estimate = estimateBudget(sourceCode);

  // Defence in depth: the character cap should already guarantee this, but a
  // future change to the budget constants could break that assumption
  // silently. limits.test.ts asserts the same invariant at build time.
  if (estimate.estimatedTotal > TOKEN_BUDGET.ceiling) {
    throw errors.inputTooLarge(MAX_SOURCE_CHARS, sourceCode.length);
  }

  return estimate;
}
