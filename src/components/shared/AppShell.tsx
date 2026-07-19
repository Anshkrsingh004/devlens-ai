import type { ReactNode } from "react";

import { SiteFooter } from "@/components/shared/SiteFooter";
import { SiteHeader } from "@/components/shared/SiteHeader";

interface AppShellProps {
  children: ReactNode;
  /** Forwarded to SiteHeader. See AppChrome for how it is populated. */
  accountSlot?: ReactNode;
  homeHref?: string;
}

/**
 * The application frame: header, main content, footer.
 *
 * Purely presentational — it renders whatever account controls it is given
 * rather than reading a session itself. That keeps `components/shared` free
 * of data fetching and importable from anywhere.
 *
 * `<main>` is a landmark element and carries the sole `flex-1`, so short
 * pages still push the footer to the bottom of the viewport.
 */
export function AppShell({ children, accountSlot, homeHref }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader accountSlot={accountSlot} homeHref={homeHref} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
