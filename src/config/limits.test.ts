import { describe, expect, it } from "vitest";

import {
  CHARS_PER_TOKEN,
  MAX_SOURCE_CHARS,
  MIN_SOURCE_CHARS,
  TOKEN_BUDGET,
  estimateTokens,
} from "./limits";

/**
 * These are not trivial assertions. The whole product fits inside Groq's
 * 8,000 tokens-per-minute free tier, and every limit is a slice of that
 * budget. If someone later raises MAX_SOURCE_CHARS without adjusting the
 * budget, reviews start failing with 429s in production — a failure that is
 * slow and confusing to diagnose. These tests turn that into a red build.
 */
describe("token budget", () => {
  it("allocates strictly less than the provider ceiling", () => {
    const allocated =
      TOKEN_BUDGET.systemPrompt +
      TOKEN_BUDGET.jsonSchema +
      TOKEN_BUDGET.sourceCode +
      TOKEN_BUDGET.reservedOutput;

    expect(allocated).toBeLessThan(TOKEN_BUDGET.ceiling);
  });

  it("keeps headroom for estimation error", () => {
    const allocated =
      TOKEN_BUDGET.systemPrompt +
      TOKEN_BUDGET.jsonSchema +
      TOKEN_BUDGET.sourceCode +
      TOKEN_BUDGET.reservedOutput;

    expect(TOKEN_BUDGET.ceiling - allocated).toBeGreaterThanOrEqual(500);
  });

  it("keeps the character cap consistent with the source token allocation", () => {
    expect(MAX_SOURCE_CHARS / CHARS_PER_TOKEN).toBe(TOKEN_BUDGET.sourceCode);
  });

  it("accepts a minimum shorter than the maximum", () => {
    expect(MIN_SOURCE_CHARS).toBeLessThan(MAX_SOURCE_CHARS);
  });
});

describe("estimateTokens", () => {
  it("returns zero for empty input", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("rounds up so short strings are never free", () => {
    expect(estimateTokens("a")).toBe(1);
  });

  it("estimates the maximum input within its token allocation", () => {
    const maximumInput = "x".repeat(MAX_SOURCE_CHARS);

    expect(estimateTokens(maximumInput)).toBe(TOKEN_BUDGET.sourceCode);
  });
});
