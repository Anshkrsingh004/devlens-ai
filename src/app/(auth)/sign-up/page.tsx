import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { SignUpForm } from "@/features/auth/components/SignUpForm";
import { getOptionalSession } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  // An already-signed-in visitor has no use for this page.
  if (await getOptionalSession()) {
    redirect("/dashboard");
  }

  return (
    <AuthCard
      title="Create your account"
      description="Start reviewing code in under a minute."
      footerPrompt="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkHref="/sign-in"
    >
      <SignUpForm />
    </AuthCard>
  );
}
