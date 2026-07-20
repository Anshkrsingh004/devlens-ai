// @vitest-environment node

import { describe, expect, it } from "vitest";

import { buildSystemPrompt, buildUserPrompt } from "./prompt-builder";

describe("buildUserPrompt", () => {
  const sourceCode = "def add(a, b):\n    return a + b";

  it("prefixes line numbers so findings can cite them accurately", () => {
    const prompt = buildUserPrompt({ language: "PYTHON", sourceCode });

    expect(prompt).toContain("1 | def add(a, b):");
    expect(prompt).toContain("2 |     return a + b");
  });

  it("names the language in human-readable form", () => {
    expect(buildUserPrompt({ language: "CPP", sourceCode })).toContain("C++");
    expect(buildUserPrompt({ language: "TYPESCRIPT", sourceCode })).toContain(
      "TypeScript",
    );
  });

  it("requests a refactor by default", () => {
    const prompt = buildUserPrompt({ language: "PYTHON", sourceCode });

    expect(prompt).toContain("Provide a complete refactored version");
  });

  it("asks for an empty refactor when the user disabled it", () => {
    const prompt = buildUserPrompt({
      language: "PYTHON",
      sourceCode,
      includeRefactor: false,
    });

    // This is the token-saving switch: roughly 1,500 output tokens reclaimed.
    expect(prompt).toContain("empty string");
    expect(prompt).not.toContain("Provide a complete refactored version");
  });

  it("preserves the source verbatim, including blank lines", () => {
    const withBlank = "line one\n\nline three";
    const prompt = buildUserPrompt({
      language: "PYTHON",
      sourceCode: withBlank,
    });

    expect(prompt).toContain("1 | line one");
    expect(prompt).toContain("2 | ");
    expect(prompt).toContain("3 | line three");
  });
});

describe("buildSystemPrompt", () => {
  it("states the score range, so the model does not invent a scale", () => {
    // The M3 spike returned overallScore 4 for mediocre code because the
    // scale was unstated. This assertion guards that regression.
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("0-100");
  });

  it("permits N/A complexity for non-algorithmic code", () => {
    expect(buildSystemPrompt()).toContain('"N/A"');
  });

  it("spells out which fields each section shape takes", () => {
    // Groq rejected a whole response when the model put finding fields into
    // bestPractices. The prompt now states both shapes explicitly.
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("SECTION SHAPES");
    expect(prompt).toContain("NO severity");
  });

  it("varies the instructions by depth", () => {
    const concise = buildSystemPrompt("CONCISE");
    const thorough = buildSystemPrompt("THOROUGH");

    expect(concise).not.toBe(thorough);
    expect(concise).toContain("highest-impact");
    expect(thorough).toContain("exhaustive");
  });
});

describe("buildSystemPrompt — security coverage", () => {
  /**
   * A review of an Express transfer endpoint missed that any authenticated
   * user could transfer from any account, because the prompt never asked
   * about access control. Broken Access Control is OWASP #1 and is easy to
   * miss precisely because the surrounding code looks orderly.
   */
  it("asks explicitly about access control", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("ACCESS CONTROL");
    expect(prompt).toContain("broken access control");
  });

  it("requires missing transactions to be reported as a finding", () => {
    // Previously atomicity was mentioned only in the summary, and findings
    // are what a reviewer scans.
    expect(buildSystemPrompt()).toContain("ATOMICITY");
  });

  it("caps the score when CRITICAL findings exist", () => {
    // The same endpoint scored 45/100 despite an unauthenticated money
    // transfer — "notable defects" rather than "dangerous".
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("caps the score at 39");
    expect(prompt).toContain("0-19 band");
  });

  it("requires the refactor to fix every critical and high finding", () => {
    expect(buildSystemPrompt()).toContain(
      "FIX EVERY CRITICAL AND HIGH FINDING",
    );
  });

  it("warns against the refactor defects seen in practice", () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain("dead code");
    expect(prompt).toContain('"if (!balance)"');
  });
});
