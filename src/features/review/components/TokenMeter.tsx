"use client";

import { MAX_SOURCE_CHARS, estimateTokens } from "@/config/limits";
import { cn } from "@/lib/utils";

interface TokenMeterProps {
  sourceCode: string;
}

/**
 * Makes an invisible constraint visible.
 *
 * The 8,000-character cap exists because Groq's free tier allows 8,000 tokens
 * per minute. Without a meter the limit is only discovered by hitting it,
 * which reads as the app being broken rather than as a known boundary.
 */
export function TokenMeter({ sourceCode }: TokenMeterProps) {
  const used = sourceCode.length;
  const percent = Math.min(100, (used / MAX_SOURCE_CHARS) * 100);
  const isOver = used > MAX_SOURCE_CHARS;
  const isNear = !isOver && percent >= 80;

  return (
    <div className="space-y-1.5">
      <div
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={MAX_SOURCE_CHARS}
        aria-valuenow={Math.min(used, MAX_SOURCE_CHARS)}
        aria-label="Character limit used"
      >
        <div
          className={cn(
            "h-full transition-all",
            isOver && "bg-destructive",
            isNear && "bg-amber-500",
            !isOver && !isNear && "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p
        className={cn(
          "text-sm",
          isOver ? "text-destructive" : "text-muted-foreground",
        )}
        // Announced to screen readers when it changes, but politely — this
        // updates on every keystroke.
        aria-live="polite"
      >
        {used.toLocaleString()} / {MAX_SOURCE_CHARS.toLocaleString()} characters
        {" · "}
        <span className="tabular-nums">
          ~{estimateTokens(sourceCode).toLocaleString()} tokens
        </span>
        {isOver ? " — too long to review" : ""}
      </p>
    </div>
  );
}
