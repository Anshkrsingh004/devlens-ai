import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppChrome } from "@/app/_components/AppChrome";
import { Container } from "@/components/shared/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getLanguageConfig } from "@/config/languages";
import { demos } from "@/features/demo/lib/demos";

export const metadata: Metadata = {
  title: "Example reviews",
  description:
    "Real DevLens AI reviews of deliberately flawed code — no sign-up required.",
};

/**
 * Public sample reviews.
 *
 * Deliberately requires no authentication: the fastest way to judge a review
 * tool is to read a review, and asking someone to create an account first is
 * the surest way to lose them.
 */
export default function DemoIndexPage() {
  return (
    <AppChrome>
      <Container className="max-w-4xl space-y-8 py-10">
        <PageHeader
          title="Example reviews"
          description="Real output from DevLens AI on deliberately flawed code. No sign-up needed."
        />

        <ul className="space-y-4">
          {demos.map((demo) => (
            <li key={demo.slug}>
              <Card className="hover:bg-muted/40 relative gap-0 p-5 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/demo/${demo.slug}`}
                      className="focus-visible:ring-ring rounded-sm before:absolute before:inset-0 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <h2 className="font-medium">{demo.title}</h2>
                    </Link>
                    <p className="text-muted-foreground mt-1.5 text-sm text-pretty">
                      {demo.blurb}
                    </p>
                    <Badge variant="secondary" className="mt-3 text-xs">
                      {getLanguageConfig(demo.language as never).label}
                    </Badge>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <ScoreBadge score={demo.result.overallScore} />
                    <ArrowRight
                      className="text-muted-foreground size-4"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </AppChrome>
  );
}
