import { z } from "zod";

import { SCORE_MAX, SCORE_MIN } from "@/config/limits";

/**
 * THE contract of the application.
 *
 * Groq produces this shape, Zod validates it, the UI renders it, and export
 * serialises it. Authored once here and derived into the Groq JSON Schema via
 * `z.toJSONSchema()`, so there is no hand-maintained duplicate to drift.
 *
 * ---------------------------------------------------------------------------
 * STRICT MODE RULES — violating these breaks the API call, not just a type:
 *
 *   1. No optional fields. Strict structured output requires every property
 *      to be `required` with `additionalProperties: false`.
 *   2. No unions. `line` is always a number; 0 means "not line-specific".
 *   3. Empty arrays represent "nothing found", never a missing key.
 *   4. "N/A" is a legal complexity value — see below.
 * ---------------------------------------------------------------------------
 */

export { SCORE_MAX, SCORE_MIN };

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const IMPACTS = ["LOW", "MEDIUM", "HIGH"] as const;

/** Caps that keep a single response inside the token budget. */
const MAX_FINDINGS_PER_CATEGORY = 10;
const MAX_SUGGESTIONS_PER_CATEGORY = 10;

/**
 * Bugs, security issues, performance issues and code smells all share this
 * shape. That is deliberate: one shape means one `FindingList` component in
 * M4 rather than four near-identical ones.
 */
export const findingSchema = z.object({
  severity: z.enum(SEVERITIES),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
  /** 1-based line number, or 0 when the finding is not line-specific. */
  line: z.number().int().min(0),
  suggestion: z.string().min(1).max(600),
});

/**
 * Maintainability notes and best practices share this shape.
 *
 * They originally had two different shapes, and the model reliably emitted
 * finding-shaped objects into the narrower one, which strict mode rejected
 * with `additionalProperties 'severity', 'suggestion', 'line' not allowed`.
 *
 * Fewer distinct shapes means less for the model to confuse — and one
 * `SuggestionList` component in M4 instead of two.
 */
export const suggestionSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
  impact: z.enum(IMPACTS),
});

/**
 * Complexity, with an honest escape hatch.
 *
 * Asked for the complexity of a React component or a config file, a model
 * will invent a plausible O(n). Permitting "N/A" with a reason converts a
 * hallucination into a truthful answer, and the UI renders it as such.
 */
export const complexitySchema = z.object({
  value: z.string().min(1).max(32),
  explanation: z.string().min(1).max(400),
});

export const reviewResultSchema = z.object({
  overallScore: z.number().int().min(SCORE_MIN).max(SCORE_MAX),
  summary: z.string().min(1).max(1200),

  bugs: z.array(findingSchema).max(MAX_FINDINGS_PER_CATEGORY),
  securityIssues: z.array(findingSchema).max(MAX_FINDINGS_PER_CATEGORY),
  performanceIssues: z.array(findingSchema).max(MAX_FINDINGS_PER_CATEGORY),
  codeSmells: z.array(findingSchema).max(MAX_FINDINGS_PER_CATEGORY),

  maintainability: z.array(suggestionSchema).max(MAX_SUGGESTIONS_PER_CATEGORY),
  bestPractices: z.array(suggestionSchema).max(MAX_SUGGESTIONS_PER_CATEGORY),

  timeComplexity: complexitySchema,
  spaceComplexity: complexitySchema,

  /** Empty string when the user has disabled the refactor section. */
  refactoredCode: z.string().max(6000),
  /** Conventional Commits format, enforced by the prompt. */
  commitMessage: z.string().min(1).max(120),
  prDescription: z.string().min(1).max(2500),
});

export type Finding = z.infer<typeof findingSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type Complexity = z.infer<typeof complexitySchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;

/** Severity ordering for sorting findings most-severe-first in the UI. */
export const SEVERITY_RANK: Record<Finding["severity"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};
