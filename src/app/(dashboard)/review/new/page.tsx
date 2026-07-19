import type { Metadata } from "next";

import { Container } from "@/components/shared/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { PlainReviewForm } from "@/features/review/components/PlainReviewForm";
import { requireSession } from "@/server/auth/guards";

export const metadata: Metadata = { title: "New review" };

/**
 * M3 workspace — intentionally unstyled.
 *
 * The point of this milestone is a correct, persisted, schema-validated
 * review. M4 replaces this page with the Monaco editor and the 13 report
 * sections.
 */
export default async function NewReviewPage() {
  await requireSession();

  return (
    <Container className="max-w-3xl space-y-8 py-10">
      <PageHeader
        title="New review"
        description="Paste code and get a structured engineering review. The polished workspace arrives in M4 — this is the engine."
      />
      <PlainReviewForm />
    </Container>
  );
}
