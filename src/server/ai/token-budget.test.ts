// @vitest-environment node

import { describe, expect, it } from "vitest";

import { MAX_SOURCE_CHARS, TOKEN_BUDGET } from "@/config/limits";
import { isAppError } from "@/lib/errors";

import { assertWithinBudget, estimateBudget } from "./token-budget";

/**
 * Boundary tests. The budget guard is the difference between a clear
 * "too long" message and an opaque provider 429, so the edges matter more
 * than the middle.
 */
describe("assertWithinBudget", () => {
  it("accepts input exactly at the character limit", () => {
    expect(() =>
      assertWithinBudget("x".repeat(MAX_SOURCE_CHARS)),
    ).not.toThrow();
  });

  it("rejects input one character over the limit", () => {
    expect(() =>
      assertWithinBudget("x".repeat(MAX_SOURCE_CHARS + 1)),
    ).toThrow();
  });

  it("throws INPUT_TOO_LARGE with the limit and actual size", () => {
    const oversized = "x".repeat(MAX_SOURCE_CHARS + 500);

    try {
      assertWithinBudget(oversized);
      expect.unreachable("should have thrown");
    } catch (error) {
      if (!isAppError(error)) throw error;
      expect(error.code).toBe("INPUT_TOO_LARGE");
      expect(error.details).toMatchObject({
        limit: MAX_SOURCE_CHARS,
        actual: oversized.length,
      });
    }
  });

  it("accepts a realistic short function", () => {
    const code = "def add(a, b):\n    return a + b\n";
    expect(() => assertWithinBudget(code)).not.toThrow();
  });
});

describe("estimateBudget", () => {
  it("reports zero source tokens for empty input", () => {
    expect(estimateBudget("").sourceTokens).toBe(0);
  });

  it("keeps the maximum input inside the provider ceiling", () => {
    const estimate = estimateBudget("x".repeat(MAX_SOURCE_CHARS));

    expect(estimate.estimatedTotal).toBeLessThanOrEqual(TOKEN_BUDGET.ceiling);
    expect(estimate.remaining).toBeGreaterThanOrEqual(0);
  });

  it("grows the estimate as input grows", () => {
    const small = estimateBudget("x".repeat(100));
    const large = estimateBudget("x".repeat(4000));

    expect(large.estimatedTotal).toBeGreaterThan(small.estimatedTotal);
  });
});
