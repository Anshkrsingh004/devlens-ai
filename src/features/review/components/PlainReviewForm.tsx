"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MAX_SOURCE_CHARS } from "@/config/limits";

import {
  LANGUAGES,
  LANGUAGE_LABELS,
  type Language,
} from "../schemas/review-input.schema";

/**
 * Deliberately plain review form — M3 only.
 *
 * No Monaco, no styling, no report components. This exists so the AI engine
 * can be proven end-to-end without also debugging an editor: when something
 * breaks here, it is unambiguously an AI-layer problem.
 *
 * M4 replaces this entirely with the real workspace. Nothing here is intended
 * to survive, which is why it is a single file with local state rather than
 * hooks and a query client.
 */
export function PlainReviewForm() {
  const [language, setLanguage] = useState<Language>("PYTHON");
  const [sourceCode, setSourceCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const overLimit = sourceCode.length > MAX_SOURCE_CHARS;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const startedAt = Date.now();

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, sourceCode, sourceType: "PASTE" }),
      });

      const payload = await response.json();
      setElapsed(Date.now() - startedAt);

      if (!response.ok) {
        setError(
          `${payload.error?.code ?? response.status}: ${payload.error?.message ?? "Request failed"}`,
        );
        return;
      }

      setResult(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="language" className="block text-sm font-medium">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            {LANGUAGES.map((value) => (
              <option key={value} value={value}>
                {LANGUAGE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="sourceCode" className="block text-sm font-medium">
            Code
          </label>
          <textarea
            id="sourceCode"
            value={sourceCode}
            onChange={(event) => setSourceCode(event.target.value)}
            rows={16}
            spellCheck={false}
            className="border-input bg-background w-full rounded-md border p-3 font-mono text-sm"
            placeholder="Paste code here…"
          />
          <p
            className={
              overLimit
                ? "text-destructive text-sm"
                : "text-muted-foreground text-sm"
            }
          >
            {sourceCode.length.toLocaleString()} /{" "}
            {MAX_SOURCE_CHARS.toLocaleString()} characters
            {overLimit ? " — too long" : ""}
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting || overLimit}>
          {isSubmitting ? "Reviewing…" : "Review code"}
        </Button>
      </form>

      {error ? (
        <pre className="border-destructive/40 bg-destructive/10 text-destructive overflow-x-auto rounded-md border p-4 text-sm whitespace-pre-wrap">
          {error}
        </pre>
      ) : null}

      {result ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Completed in {elapsed ? (elapsed / 1000).toFixed(1) : "?"}s
          </p>
          <pre className="bg-muted max-h-[600px] overflow-auto rounded-md p-4 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
