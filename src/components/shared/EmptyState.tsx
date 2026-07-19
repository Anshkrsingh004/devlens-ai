import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call to action — omitted when there is nothing useful to do. */
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent "nothing here yet" treatment.
 *
 * Empty states appear in at least four places (dashboard, search results,
 * favorites, workspace), and an unstyled blank area reads as a bug rather
 * than a state. Centralised so all four say the same thing the same way.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      <h2 className="font-medium">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-md text-sm text-pretty">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
