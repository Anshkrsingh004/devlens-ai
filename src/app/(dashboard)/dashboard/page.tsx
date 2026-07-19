import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/Container";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = session.user.name.split(" ")[0] || "there";

  return (
    <Container className="space-y-8 py-10">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Paste code and get a structured engineering review."
        actions={
          <Button asChild>
            <Link href="/review/new">
              <Plus aria-hidden="true" />
              New review
            </Link>
          </Button>
        }
      />

      {/*
        Reviews are created but not yet listed — the history list, search and
        favorites arrive in M5. Until then this state is always shown, so it
        must point somewhere useful rather than being a dead end.
      */}
      <EmptyState
        title="No review history yet"
        description="Saved reviews will be listed here in the next milestone. Start a review now to see the full report."
        action={
          <Button asChild>
            <Link href="/review/new">Start a review</Link>
          </Button>
        }
      />
    </Container>
  );
}
