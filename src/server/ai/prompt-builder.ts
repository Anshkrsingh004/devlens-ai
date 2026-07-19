import "server-only";

import {
  LANGUAGE_LABELS,
  type Language,
} from "@/features/review/schemas/review-input.schema";
import { SYSTEM_PROMPT } from "@/server/ai/system-prompt";

/**
 * Prompt construction — a pure function, so it can be snapshot-tested without
 * a network call or a database.
 */

export type ReviewDepth = "CONCISE" | "BALANCED" | "THOROUGH";

interface BuildPromptOptions {
  language: Language;
  sourceCode: string;
  depth?: ReviewDepth;
  includeRefactor?: boolean;
}

/**
 * Depth changes token spend, not just wording — which is why it is a user
 * preference rather than a constant. THOROUGH costs materially more output
 * tokens against an 8,000 TPM ceiling.
 */
const DEPTH_INSTRUCTIONS: Record<ReviewDepth, string> = {
  CONCISE:
    "Report only the highest-impact findings. At most three per category. Keep every description to one or two sentences.",
  BALANCED:
    "Report the findings a careful reviewer would raise in a pull request. Skip trivial nitpicks.",
  THOROUGH:
    "Be exhaustive. Include minor style and naming issues alongside substantive problems.",
};

export function buildSystemPrompt(depth: ReviewDepth = "BALANCED"): string {
  return `${SYSTEM_PROMPT}\n\nDEPTH: ${DEPTH_INSTRUCTIONS[depth]}`;
}

export function buildUserPrompt({
  language,
  sourceCode,
  includeRefactor = true,
}: BuildPromptOptions): string {
  const label = LANGUAGE_LABELS[language];

  // Line numbers are prepended so the model can cite them accurately. Without
  // this it guesses, and a finding pointing at the wrong line is worse than
  // one pointing nowhere.
  const numbered = sourceCode
    .split("\n")
    .map((line, index) => `${index + 1} | ${line}`)
    .join("\n");

  const refactorInstruction = includeRefactor
    ? "Provide a complete refactored version in refactoredCode."
    : "Set refactoredCode to an empty string. The user has disabled it.";

  return `Review this ${label} code.

${refactorInstruction}

Line numbers are shown before each '|' for reference only — they are not part
of the source. Cite them in the 'line' field of your findings.

\`\`\`${label.toLowerCase()}
${numbered}
\`\`\``;
}
