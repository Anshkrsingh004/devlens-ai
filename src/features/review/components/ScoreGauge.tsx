"use client";

import { SCORE_MAX } from "../schemas/review-result.schema";
import { cn } from "@/lib/utils";

/**
 * Score thresholds, mirroring the rubric bands in the system prompt.
 *
 * If the prompt's bands change, these must change with them — otherwise the
 * colour tells a different story from the number.
 */
function scoreTone(score: number): {
  ring: string;
  text: string;
  label: string;
} {
  if (score >= 90)
    return {
      ring: "stroke-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      label: "Production ready",
    };
  if (score >= 75)
    return {
      ring: "stroke-green-500",
      text: "text-green-600 dark:text-green-400",
      label: "Solid",
    };
  if (score >= 60)
    return {
      ring: "stroke-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      label: "Needs work",
    };
  if (score >= 40)
    return {
      ring: "stroke-orange-500",
      text: "text-orange-600 dark:text-orange-400",
      label: "Notable defects",
    };
  return {
    ring: "stroke-red-500",
    text: "text-red-600 dark:text-red-400",
    label: "Serious problems",
  };
}

/** Compact score for lists and headers. Reused by M5's review cards. */
export function ScoreBadge({ score }: { score: number }) {
  const tone = scoreTone(score);

  return (
    <span className={cn("text-sm font-semibold tabular-nums", tone.text)}>
      {score}
      <span className="text-muted-foreground font-normal">/{SCORE_MAX}</span>
    </span>
  );
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Large circular score display for the report header.
 *
 * An SVG ring rather than a progress bar: the score is a judgement, not a
 * measure of completion, and a bar implies something is filling up.
 */
export function ScoreGauge({ score }: { score: number }) {
  const tone = scoreTone(score);
  const offset = CIRCUMFERENCE - (score / SCORE_MAX) * CIRCUMFERENCE;

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            className="stroke-muted"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            className={cn(
              tone.ring,
              "transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none",
            )}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn("text-2xl font-semibold tabular-nums", tone.text)}
          >
            {score}
          </span>
          <span className="text-muted-foreground text-xs">/{SCORE_MAX}</span>
        </div>
      </div>

      <div>
        <p className={cn("font-medium", tone.text)}>{tone.label}</p>
        <p className="text-muted-foreground text-sm">Overall score</p>
      </div>
    </div>
  );
}
