import type { ReactNode } from "react";

import { AppChrome } from "@/app/_components/AppChrome";
import { requireSession } from "@/server/auth/guards";

/**
 * Layout for every authenticated page.
 *
 * The session guard lives here rather than in each page, so adding a new
 * private route requires no additional auth code — the most common place a
 * check gets forgotten.
 *
 * This is a real check: `requireSession` validates the session server-side.
 * The middleware redirect is only an optimisation on top of it.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();

  return <AppChrome>{children}</AppChrome>;
}
