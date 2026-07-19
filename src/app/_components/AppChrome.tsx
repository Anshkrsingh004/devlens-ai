import Link from "next/link";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { getOptionalSession } from "@/server/auth/guards";

/**
 * Session-aware application frame.
 *
 * This is the one place that combines a session read with UI composition, so
 * `AppShell` and `SiteHeader` can stay presentational and every layout gets
 * consistent chrome from a single implementation.
 *
 * It lives under `app/` because that is the only layer permitted to compose
 * across `features/` and `server/` (PROJECT_STRUCTURE.md §7). The underscore
 * prefix keeps the folder out of Next.js routing.
 *
 * Reading the session on the server means the correct signed-in state is in
 * the initial HTML — a client-side fetch would flash the wrong state on every
 * page load.
 */
export async function AppChrome({ children }: { children: ReactNode }) {
  const session = await getOptionalSession();

  return (
    <AppShell
      homeHref={session ? "/dashboard" : "/"}
      accountSlot={
        session ? (
          <>
            {/*
              The primary action, present on every authenticated page. Without
              it /review/new is only reachable by typing the URL — the feature
              exists but nobody can find it.
            */}
            <Button asChild size="sm" variant="ghost">
              <Link href="/review/new">New review</Link>
            </Button>
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              image={session.user.image ?? null}
            />
          </>
        ) : (
          <Button asChild size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        )
      }
    >
      {children}
    </AppShell>
  );
}
