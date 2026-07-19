import type { Metadata } from "next";

import { Container } from "@/components/shared/Container";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireSession } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();

  const firstName = session.user.name.split(" ")[0] || "there";

  return (
    <Container className="space-y-8 py-10">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your reviews will appear here."
      />

      {/*
        Deliberately empty. Reviews cannot exist until the AI engine ships in
        M3, so promising a "New review" button here would link to nothing.
      */}
      <EmptyState
        title="No reviews yet"
        description="The review workspace arrives in the next milestone. Your account, session and database are all working."
      />
    </Container>
  );
}
