import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/Container";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ReportView } from "@/features/review/components/ReportView";
import { reviewResultSchema } from "@/features/review/schemas/review-result.schema";
import { requireSession } from "@/server/auth/guards";
import * as reviewService from "@/server/services/review.service";

export const metadata: Metadata = { title: "Review" };

/**
 * A saved review.
 *
 * Rendered on the server: the report is static once complete, so there is
 * nothing to fetch client-side and no loading state to design.
 */
export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const review = await reviewService.getReview(session.user.id, id);

  // Not found and not-owned are indistinguishable here by design — ownership
  // is enforced in the query, so this leaks nothing about which IDs exist.
  if (!review) notFound();

  // The stored payload is validated again on read. Trusting it because we
  // wrote it would mean a schema change silently rendering broken reports.
  const parsed = reviewResultSchema.safeParse(review.result);

  return (
    <Container className="max-w-4xl space-y-8 py-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft aria-hidden="true" />
            Back to reviews
          </Link>
        </Button>

        <PageHeader
          title={review.title}
          description={new Date(review.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        />
      </div>

      {review.status === "FAILED" ? (
        <EmptyState
          title="This review failed"
          description="The AI could not complete it. You can start a new review with the same code."
          action={
            <Button asChild>
              <Link href="/review/new">New review</Link>
            </Button>
          }
        />
      ) : parsed.success ? (
        <ReportView result={parsed.data} />
      ) : (
        <EmptyState
          title="This report could not be displayed"
          description="The stored result does not match the current report format."
        />
      )}
    </Container>
  );
}
