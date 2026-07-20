import { z } from "zod";

import { LANGUAGES, type Language } from "@/config/languages";
import { MAX_SOURCE_CHARS, MIN_SOURCE_CHARS } from "@/config/limits";

/**
 * Review request input.
 *
 * Imported by both the client form and the route handler, so oversized or
 * malformed input is rejected before the network call AND again on the
 * server. Sharing one schema is what makes those two checks agree — a form
 * that accepts what the API rejects is a classic and confusing bug.
 */

export const SOURCE_TYPES = ["PASTE", "UPLOAD"] as const;

export const reviewInputSchema = z.object({
  language: z.enum(LANGUAGES),

  sourceCode: z
    .string()
    .min(
      MIN_SOURCE_CHARS,
      `Add at least ${MIN_SOURCE_CHARS} characters of code`,
    )
    .max(
      MAX_SOURCE_CHARS,
      `Code must be ${MAX_SOURCE_CHARS.toLocaleString()} characters or fewer`,
    )
    // Whitespace-only input passes a length check but is not code.
    .refine((value) => value.trim().length >= MIN_SOURCE_CHARS, {
      message: "Add some code to review",
    }),

  sourceType: z.enum(SOURCE_TYPES).default("PASTE"),

  /** Optional; the model suggests one when omitted. */
  title: z.string().trim().min(1).max(120).optional(),
});

export type ReviewInput = z.input<typeof reviewInputSchema>;
export type ParsedReviewInput = z.output<typeof reviewInputSchema>;
export type { Language };

/** Human-readable labels, used by the language selector and the prompt. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  CPP: "C++",
  PYTHON: "Python",
  JAVA: "Java",
  JAVASCRIPT: "JavaScript",
  TYPESCRIPT: "TypeScript",
};
