import { describe, expect, it } from "vitest";

import { reviewResultSchema } from "./review-result.schema";

/**
 * Contract tests for the most important schema in the application.
 *
 * The golden fixture is the shape Groq actually returned during the M3 spike,
 * so these assert against observed reality rather than what the schema was
 * hoped to be.
 */

function golden(overrides: Record<string, unknown> = {}) {
  return {
    overallScore: 72,
    summary: "A working binary search with an off-by-one boundary error.",
    bugs: [
      {
        severity: "HIGH",
        title: "Incorrect midpoint calculation",
        description: "Uses '/' which yields a float, causing a TypeError.",
        line: 4,
        suggestion: "Use integer division '//'.",
      },
    ],
    securityIssues: [],
    performanceIssues: [],
    codeSmells: [],
    maintainability: [
      {
        title: "Add type hints",
        description: "Improves readability.",
        impact: "MEDIUM",
      },
    ],
    bestPractices: [
      {
        title: "Add a docstring",
        description: "Explain the contract.",
        impact: "LOW",
      },
    ],
    timeComplexity: {
      value: "O(log n)",
      explanation: "Halves the range each step.",
    },
    spaceComplexity: { value: "O(1)", explanation: "Only scalar variables." },
    refactoredCode: "def binary_search(arr, target):\n    ...",
    commitMessage: "fix(search): correct midpoint division",
    prDescription: "## Summary\nFixes the midpoint calculation.",
    ...overrides,
  };
}

describe("reviewResultSchema", () => {
  it("accepts the golden fixture", () => {
    expect(reviewResultSchema.safeParse(golden()).success).toBe(true);
  });

  it("accepts empty arrays for every finding category", () => {
    const result = reviewResultSchema.safeParse(
      golden({ bugs: [], maintainability: [], bestPractices: [] }),
    );

    expect(result.success).toBe(true);
  });

  it('accepts "N/A" complexity for non-algorithmic code', () => {
    const result = reviewResultSchema.safeParse(
      golden({
        timeComplexity: {
          value: "N/A",
          explanation: "This is a configuration file, not an algorithm.",
        },
      }),
    );

    expect(result.success).toBe(true);
  });

  it("accepts line 0 for findings that are not line-specific", () => {
    const result = reviewResultSchema.safeParse(
      golden({
        bugs: [
          {
            severity: "LOW",
            title: "No error handling anywhere",
            description: "The module never handles failures.",
            line: 0,
            suggestion: "Add try/except around IO.",
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
  });

  it("rejects a score above the maximum", () => {
    expect(
      reviewResultSchema.safeParse(golden({ overallScore: 101 })).success,
    ).toBe(false);
  });

  it("rejects a negative score", () => {
    expect(
      reviewResultSchema.safeParse(golden({ overallScore: -1 })).success,
    ).toBe(false);
  });

  it("rejects a non-integer score", () => {
    expect(
      reviewResultSchema.safeParse(golden({ overallScore: 72.5 })).success,
    ).toBe(false);
  });

  it("rejects an unknown severity", () => {
    const result = reviewResultSchema.safeParse(
      golden({
        bugs: [
          {
            severity: "CATASTROPHIC",
            title: "x",
            description: "y",
            line: 1,
            suggestion: "z",
          },
        ],
      }),
    );

    expect(result.success).toBe(false);
  });

  it("rejects a missing section", () => {
    const { spaceComplexity, ...withoutSection } = golden();
    void spaceComplexity;

    expect(reviewResultSchema.safeParse(withoutSection).success).toBe(false);
  });

  it("rejects a negative line number", () => {
    const result = reviewResultSchema.safeParse(
      golden({
        bugs: [
          {
            severity: "LOW",
            title: "x",
            description: "y",
            line: -3,
            suggestion: "z",
          },
        ],
      }),
    );

    expect(result.success).toBe(false);
  });
});
