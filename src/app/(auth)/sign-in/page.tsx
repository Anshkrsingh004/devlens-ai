import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { getOptionalSession } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getOptionalSession()) {
    redirect("/dashboard");
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to see your review history."
      footerPrompt="Don't have an account?"
      footerLinkLabel="Create one"
      footerLinkHref="/sign-up"
    >
      <SignInForm />
    </AuthCard>
  );
}
