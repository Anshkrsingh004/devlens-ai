import {
  reviewResultSchema,
  type ReviewResult,
} from "@/features/review/schemas/review-result.schema";

import rawDemos from "../data/demos.json";

/**
 * Public sample reviews.
 *
 * These are real Groq output, captured once and committed. Serving them from
 * a fixture means a visitor can see what the tool produces without signing
 * up, and — more importantly — without consuming the shared daily quota.
 *
 * With roughly 45 reviews available per day account-wide, a demo that called
 * the API would let a handful of curious visitors exhaust the allowance for
 * everyone, including whoever is looking at it during an interview.
 */

export interface Demo {
  slug: string;
  title: string;
  language: string;
  blurb: string;
  sourceCode: string;
  result: ReviewResult;
}

/**
 * Validated at module load against the same schema the AI output must satisfy.
 *
 * If the schema changes and a fixture is not regenerated, the build fails
 * here rather than rendering a broken demo page to a visitor.
 */
export const demos: Demo[] = rawDemos.map((demo) => {
  const parsed = reviewResultSchema.safeParse(demo.result);

  if (!parsed.success) {
    throw new Error(
      `Demo "${demo.slug}" no longer matches ReviewResultSchema. ` +
        `Regenerate src/features/demo/data/demos.json.`,
    );
  }

  return { ...demo, result: parsed.data };
});

export function getDemo(slug: string): Demo | undefined {
  return demos.find((demo) => demo.slug === slug);
}
