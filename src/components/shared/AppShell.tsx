import type { ReactNode } from "react";

import { SiteFooter } from "@/components/shared/SiteFooter";
import { SiteHeader } from "@/components/shared/SiteHeader";

interface AppShellProps {
  children: ReactNode;
}

/**
 * The application frame: header, main content, footer.
 *
 * Every page mounts inside this. Centralising the frame means a change to
 * global chrome happens in one file rather than in every layout.
 *
 * `<main>` is a landmark element and carries the sole `flex-1`, so short
 * pages still push the footer to the bottom of the viewport.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
