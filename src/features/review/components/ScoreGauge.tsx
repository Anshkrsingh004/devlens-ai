"use client";

import { scoreTone } from "@/components/shared/ScoreBadge";
import { SCORE_MAX } from "@/config/limits";
import { cn } from "@/lib/utils";

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
