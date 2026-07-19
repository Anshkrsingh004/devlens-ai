import { ScanSearch } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/shared/Container";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { siteConfig } from "@/config/site";

interface SiteHeaderProps {
  /** Where the wordmark links to — home when signed out, dashboard when in. */
  homeHref?: string;
  /**
   * Account controls, injected by the caller.
   *
   * Passed as a slot rather than imported, so this component stays purely
   * presentational and never reaches into `features/` or `server/`
   * (PROJECT_STRUCTURE.md §7). The session read happens in app/, which is
   * the layer allowed to compose across features.
   */
  accountSlot?: ReactNode;
}

export function SiteHeader({ homeHref = "/", accountSlot }: SiteHeaderProps) {
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-sm">
      <Container>
        <div className="flex h-14 items-center justify-between">
          <Link
            href={homeHref}
            className="focus-visible:ring-ring flex items-center gap-2 rounded-sm font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <ScanSearch className="size-5" aria-hidden="true" />
            <span>{siteConfig.name}</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {accountSlot}
          </div>
        </div>
      </Container>
    </header>
  );
}
