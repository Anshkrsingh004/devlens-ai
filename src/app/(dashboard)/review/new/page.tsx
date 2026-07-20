import type { Metadata } from "next";

import { Container } from "@/components/shared/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReviewWorkspace } from "@/features/review/components/ReviewWorkspace";
import { requireSession } from "@/server/auth/guards";
import * as preferenceRepository from "@/server/repositories/preference.repository";

export const metadata: Metadata = { title: "New review" };

export default async function NewReviewPage() {
  const session = await requireSession();

  // Read on the server so the editor mounts with the user's preferred
  // language already selected, rather than flashing a default first.
  const preference = await preferenceRepository.findOrCreate(session.user.id);

  return (
    <Container className="max-w-4xl space-y-8 py-10">
      <PageHeader
        title="New review"
        description="Paste or upload code and get a structured engineering review."
      />
      <ReviewWorkspace defaultLanguage={preference.defaultLanguage} />
    </Container>
  );
}
