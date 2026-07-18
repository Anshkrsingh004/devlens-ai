import { ScanSearch } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/shared/Container";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { siteConfig } from "@/config/site";

/**
 * Global site header: wordmark plus theme control.
 *
 * A Server Component — only the nested ThemeToggle is interactive, so the
 * client boundary stays as small as possible.
 *
 * Navigation and the user menu are added in M2, once there is a session to
 * render them from. Nothing here anticipates that work.
 */
export function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-sm">
      <Container>
        <div className="flex h-14 items-center justify-between">
          <Link
            href="/"
            className="focus-visible:ring-ring flex items-center gap-2 rounded-sm font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <ScanSearch className="size-5" aria-hidden="true" />
            <span>{siteConfig.name}</span>
          </Link>

          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
