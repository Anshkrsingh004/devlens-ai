"use client";

import { AlertCircle, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MAX_SOURCE_CHARS, MIN_SOURCE_CHARS } from "@/config/limits";
import { ApiError } from "@/lib/api-client";

import { useCreateReview } from "../hooks/useCreateReview";
import type { Language } from "../schemas/review-input.schema";
import { CodeEditor } from "./CodeEditor";
import { FileDropzone } from "./FileDropzone";
import { LanguageSelect } from "./LanguageSelect";
import { ReportView } from "./ReportView";
import { ReviewSkeleton } from "./ReviewSkeleton";
import { TokenMeter } from "./TokenMeter";

/**
 * The review workspace: editor on the input side, report on the output side.
 *
 * Replaces M3's plain textarea. The engine underneath is unchanged — this
 * milestone is entirely presentation over a contract already proven in
 * production.
 */
export function ReviewWorkspace({
  defaultLanguage = "PYTHON",
}: {
  defaultLanguage?: Language;
}) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [sourceCode, setSourceCode] = useState("");
  const [sourceType, setSourceType] = useState<"PASTE" | "UPLOAD">("PASTE");

  const createReview = useCreateReview();

  const trimmedLength = sourceCode.trim().length;
  const isTooShort = trimmedLength < MIN_SOURCE_CHARS;
  const isTooLong = sourceCode.length > MAX_SOURCE_CHARS;
  const canSubmit = !isTooShort && !isTooLong && !createReview.isPending;

  function handleSubmit() {
    createReview.mutate(
      { language, sourceCode, sourceType },
      {
        onSuccess: (data) => {
          toast.success("Review complete", {
            description: `Scored ${data.overallScore}/100 · ${data.quota.remaining} reviews left today.`,
          });
        },
        onError: (error) => {
          const message =
            error instanceof ApiError
              ? error.message
              : "Something went wrong. Please try again.";

          toast.error("Review failed", { description: message });
        },
      },
    );
  }

  const error = createReview.error;
  const isRetryable = error instanceof ApiError ? error.isRetryable : true;

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-label="Code input">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <LanguageSelect
              value={language}
              onChange={setLanguage}
              disabled={createReview.isPending}
            />
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit} size="lg">
            <Sparkles aria-hidden="true" />
            {createReview.isPending ? "Reviewing…" : "Review code"}
          </Button>
        </div>

        <FileDropzone
          disabled={createReview.isPending}
          onFileLoaded={(contents, inferred) => {
            setSourceCode(contents);
            setSourceType("UPLOAD");
            if (inferred) setLanguage(inferred);
          }}
        />

        <CodeEditor
          value={sourceCode}
          onChange={(next) => {
            setSourceCode(next);
            // Editing an uploaded file makes it authored input again.
            if (sourceType === "UPLOAD") setSourceType("PASTE");
          }}
          language={language}
          disabled={createReview.isPending}
        />

        <TokenMeter sourceCode={sourceCode} />
      </section>

      {createReview.isPending ? (
        <section aria-label="Review in progress">
          <ReviewSkeleton />
        </section>
      ) : null}

      {error && !createReview.isPending ? (
        <section
          aria-label="Review error"
          className="border-destructive/40 bg-destructive/5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex gap-3">
            <AlertCircle
              className="text-destructive mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium">Review failed</p>
              <p className="text-muted-foreground text-sm text-pretty">
                {error instanceof ApiError
                  ? error.message
                  : "Something went wrong."}
              </p>
            </div>
          </div>

          {/* Only offered when retrying could actually help — a quota error
              will not resolve by clicking again. */}
          {isRetryable ? (
            <Button variant="outline" onClick={handleSubmit}>
              <RotateCcw aria-hidden="true" />
              Retry
            </Button>
          ) : null}
        </section>
      ) : null}

      {createReview.data && !createReview.isPending ? (
        <section aria-label="Review report">
          <ReportView result={createReview.data.result} />
        </section>
      ) : null}
    </div>
  );
}
