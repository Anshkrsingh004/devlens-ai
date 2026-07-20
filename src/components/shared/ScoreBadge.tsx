import { SCORE_MAX } from "@/config/limits";
import { cn } from "@/lib/utils";

/**
 * Score presentation, shared by the report gauge and the history cards.
 *
 * Promoted here from `features/review` when M5's ReviewCard became the second
 * consumer — the "promote on the second consumer" rule in
 * PROJECT_STRUCTURE.md §1, applied at the moment it triggered rather than in
 * anticipation.
 *
 * The bands mirror the rubric in the system prompt. If those change, these
 * must change with them, or the colour tells a different story from the
 * number.
 */
export function scoreTone(score: number): {
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

/** Compact score for lists and headers. */
export function ScoreBadge({ score }: { score: number }) {
  const tone = scoreTone(score);

  return (
    <span className={cn("text-sm font-semibold tabular-nums", tone.text)}>
      {score}
      <span className="text-muted-foreground font-normal">/{SCORE_MAX}</span>
    </span>
  );
}
