import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SectionCardProps {
  title: string;
  icon: LucideIcon;
  /** Shown beside the title, e.g. a finding count. */
  badge?: ReactNode;
  description?: string;
  children: ReactNode;
}

/**
 * Uniform frame for every report section.
 *
 * All 13 sections use this, so heading level, spacing and icon treatment are
 * decided once. Each renders an h2, keeping the document outline correct for
 * screen readers navigating by heading.
 */
export function SectionCard({
  title,
  icon: Icon,
  badge,
  description,
  children,
}: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" aria-hidden="true" />
          {/* A real h2 rather than CardTitle's div: all 13 sections sit under
              the page h1, and screen-reader users navigate reports by
              heading. */}
          <h2 className="text-base leading-none font-semibold">{title}</h2>
          {badge}
        </div>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
