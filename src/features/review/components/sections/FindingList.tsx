import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  SEVERITY_RANK,
  type Finding,
} from "../../schemas/review-result.schema";

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
  CRITICAL: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
  HIGH: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  MEDIUM:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  LOW: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

/**
 * Renders bugs, security issues, performance issues AND code smells.
 *
 * All four are the same shape in the schema, so they get one component
 * instead of four near-identical ones. This is the clearest example in the
 * codebase of the schema design paying for itself in the UI.
 */
export function FindingList({
  findings,
  emptyMessage,
}: {
  findings: Finding[];
  emptyMessage: string;
}) {
  if (findings.length === 0) {
    // An empty category is a real result, not a missing one — say so rather
    // than rendering nothing and leaving the reader unsure.
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  // Most severe first: a CRITICAL buried under three LOWs gets missed.
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );

  return (
    <ul className="space-y-4">
      {sorted.map((finding, index) => (
        <li
          key={`${finding.title}-${index}`}
          className="border-l-2 pl-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", SEVERITY_STYLES[finding.severity])}
            >
              {finding.severity}
            </Badge>
            <h3 className="font-medium">{finding.title}</h3>
            {finding.line > 0 ? (
              <span className="text-muted-foreground text-xs tabular-nums">
                line {finding.line}
              </span>
            ) : null}
          </div>

          <p className="text-muted-foreground mt-1.5 text-sm text-pretty">
            {finding.description}
          </p>

          <p className="mt-2 text-sm text-pretty">
            <span className="font-medium">Fix: </span>
            <span className="text-muted-foreground">{finding.suggestion}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
