import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional trailing actions, e.g. a primary button. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Consistent page title block.
 *
 * Exists so every page does not invent its own heading markup and spacing.
 * Renders a single `<h1>`, which keeps the document outline correct for
 * screen readers — a guarantee that is easy to lose when each page hand-rolls
 * its own header.
 *
 * Consumed by the dashboard, settings and review pages from M2 onward.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
