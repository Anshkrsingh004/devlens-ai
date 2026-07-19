"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MAX_SOURCE_CHARS } from "@/config/limits";

import { CopyButton } from "./CopyButton";

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

  // Formatted once and reused by the display, the copy button and the
  // download, so all three are guaranteed to contain identical text.
  const formattedResult = result ? JSON.stringify(result, null, 2) : "";

  /**
   * Save the report as a file.
   *
   * Offered alongside copy because the clipboard holds one item — anything
   * copied afterwards destroys the review. A file survives.
   *
   * Proper Markdown and PDF export arrive in M6; this is raw JSON.
   */
  function handleDownload() {
    const blob = new Blob([formattedResult], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `devlens-review-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();

    // Without revoking, the blob is retained for the lifetime of the document.
    URL.revokeObjectURL(url);
  }

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
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Completed in {elapsed ? (elapsed / 1000).toFixed(1) : "?"}s
            </p>

            <div className="flex items-center gap-2">
              <CopyButton
                value={formattedResult}
                label="Copy JSON"
                subject="Report copied"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download aria-hidden="true" />
                Download
              </Button>
            </div>
          </div>

          <pre className="bg-muted max-h-[600px] overflow-auto rounded-md p-4 text-xs">
            {formattedResult}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
