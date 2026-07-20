import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ReviewList } from "@/features/history/components/ReviewList";
import { requireSession } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = session.user.name.split(" ")[0] || "there";

  return (
    <Container className="max-w-4xl space-y-8 py-10">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your review history."
        actions={
          <Button asChild>
            <Link href="/review/new">
              <Plus aria-hidden="true" />
              New review
            </Link>
          </Button>
        }
      />
      <ReviewList />
    </Container>
  );
}
