import type { Metadata } from "next";

import { Container } from "@/components/shared/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsForm } from "@/features/settings/components/SettingsForm";
import { requireSession } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();

  return (
    <Container className="max-w-2xl space-y-8 py-10">
      <PageHeader
        title="Settings"
        description={`Signed in as ${session.user.email}`}
      />
      <SettingsForm />
    </Container>
  );
}
