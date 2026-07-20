import { describe, expect, it } from "vitest";

import type { ReviewResult } from "@/features/review/schemas/review-result.schema";

import { markdownFilename, toMarkdown } from "./to-markdown";

function result(overrides: Partial<ReviewResult> = {}): ReviewResult {
  return {
    overallScore: 72,
    summary: "A working implementation with a boundary error.",
    bugs: [
      {
        severity: "HIGH",
        title: "Off-by-one in the loop",
        description: "Iterates one past the end.",
        line: 12,
        suggestion: "Use `<` instead of `<=`.",
      },
    ],
    securityIssues: [],
    performanceIssues: [],
    codeSmells: [],
    maintainability: [
      {
        title: "Add type hints",
        description: "Improves clarity.",
        impact: "MEDIUM",
      },
    ],
    bestPractices: [],
    timeComplexity: { value: "O(log n)", explanation: "Halves each step." },
    spaceComplexity: { value: "O(1)", explanation: "Scalars only." },
    refactoredCode: "def search(items, target):\n    return -1",
    commitMessage: "fix(search): correct loop boundary",
    prDescription: "## Summary\nFixes the boundary.",
    ...overrides,
  };
}

const meta = {
  title: "Binary search",
  language: "PYTHON",
  createdAt: new Date("2026-07-20T10:30:00Z"),
  overallScore: 72,
};

describe("toMarkdown", () => {
  it("includes every section heading", () => {
    const md = toMarkdown(result(), meta);

    for (const heading of [
      "# Binary search",
      "## Summary",
      "## Bugs",
      "## Security",
      "## Performance",
      "## Code smells",
      "## Maintainability",
      "## Best practices",
      "## Complexity",
      "## Refactored code",
      "## Commit message",
      "## Pull request description",
    ]) {
      expect(md).toContain(heading);
    }
  });

  it("states 'None found.' for empty categories rather than omitting them", () => {
    // An absent section is ambiguous — did it find nothing, or fail to run?
    const md = toMarkdown(result(), meta);

    expect(md).toContain("## Security\n\nNone found.");
  });

  it("renders findings with severity and line number", () => {
    const md = toMarkdown(result(), meta);

    expect(md).toContain("### HIGH — Off-by-one in the loop _(line 12)_");
    expect(md).toContain("**Fix:** Use `<` instead of `<=`.");
  });

  it("omits the line reference when a finding is not line-specific", () => {
    const md = toMarkdown(
      result({
        bugs: [
          {
            severity: "LOW",
            title: "No error handling",
            description: "Applies throughout.",
            line: 0,
            suggestion: "Add try/except.",
          },
        ],
      }),
      meta,
    );

    expect(md).toContain("### LOW — No error handling");
    expect(md).not.toContain("line 0");
  });

  it("omits the refactor section when the user disabled it", () => {
    const md = toMarkdown(result({ refactoredCode: "" }), meta);

    expect(md).not.toContain("## Refactored code");
  });

  it("warns that generated code is unverified", () => {
    // The README documents that refactors can contain subtle bugs; an
    // exported file travels away from that context, so it carries the caveat.
    expect(toMarkdown(result(), meta)).toContain("not verified output");
  });

  it("escapes code fences that themselves contain backticks", () => {
    // A refactor containing a Markdown example would otherwise close the
    // fence early and render the rest of the document as prose.
    const md = toMarkdown(
      result({ refactoredCode: "text\n```\ninner\n```\nmore" }),
      meta,
    );

    expect(md).toContain("````python");
  });

  it("escapes pipes so table cells cannot be broken", () => {
    const md = toMarkdown(result(), { ...meta, language: "a|b" });

    expect(md).toContain("a\\|b");
  });
});

describe("markdownFilename", () => {
  it("slugifies the title and appends the date", () => {
    expect(markdownFilename("Binary Search!", "2026-07-20T10:30:00Z")).toBe(
      "devlens-binary-search-2026-07-20.md",
    );
  });

  it("falls back when the title has no usable characters", () => {
    expect(markdownFilename("!!!", "2026-07-20T10:30:00Z")).toBe(
      "devlens-review-2026-07-20.md",
    );
  });

  it("truncates very long titles", () => {
    const name = markdownFilename("x".repeat(200), "2026-07-20T10:30:00Z");

    expect(name.length).toBeLessThan(70);
  });
});
