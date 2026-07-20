import {
  Bug,
  FileCode2,
  GaugeCircle,
  GitPullRequest,
  ShieldAlert,
  Timer,
} from "lucide-react";

import Link from "next/link";

import { AppChrome } from "@/app/_components/AppChrome";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

/**
 * Public landing page.
 *
 * The only rendered surface in M0. It intentionally links nowhere that does
 * not yet exist — sign-in arrives in M2 — so the application has no dead
 * routes at any point.
 */

const reviewCapabilities = [
  {
    icon: Bug,
    title: "Bugs",
    description:
      "Logic errors, edge cases and off-by-one mistakes, each with the line it affects and a concrete fix.",
  },
  {
    icon: ShieldAlert,
    title: "Security",
    description:
      "Injection risks, unsafe input handling and leaked secrets, graded by severity.",
  },
  {
    icon: GaugeCircle,
    title: "Performance",
    description:
      "Redundant work, avoidable allocations and hot paths worth restructuring.",
  },
  {
    icon: Timer,
    title: "Complexity",
    description:
      'Time and space complexity with the reasoning — and an honest "N/A" when the code is not algorithmic.',
  },
  {
    icon: FileCode2,
    title: "Refactor",
    description:
      "A cleaner version of the code, alongside maintainability and best-practice notes.",
  },
  {
    icon: GitPullRequest,
    title: "Ship it",
    description:
      "A suggested commit message and pull request description, ready to paste.",
  },
] as const;

const steps = [
  {
    title: "Paste or upload",
    description: "Drop in a file or paste a snippet, then pick the language.",
  },
  {
    title: "Get a structured report",
    description:
      "Not a chat transcript — a scored report with fixed sections you can scan.",
  },
  {
    title: "Keep the history",
    description:
      "Every review is saved, searchable, and exportable to Markdown or PDF.",
  },
] as const;

const languages = [
  "C++",
  "Python",
  "Java",
  "JavaScript",
  "TypeScript",
] as const;

export default function LandingPage() {
  return (
    <AppChrome>
      <section className="border-b">
        <Container className="py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-muted-foreground mb-4 text-sm font-medium tracking-wide uppercase">
              {siteConfig.tagline}
            </p>

            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Code review that reads like a senior engineer wrote it
            </h1>

            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-pretty">
              {siteConfig.description}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <a href="#capabilities">See what you get</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/demo">See a real review</Link>
              </Button>
            </div>

            <p className="text-muted-foreground mt-10 text-sm">
              Supports {languages.slice(0, -1).join(", ")} and{" "}
              {languages.at(-1)}.
            </p>
          </div>
        </Container>
      </section>

      <section id="capabilities" className="scroll-mt-14 border-b">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Every review, the same thirteen sections
            </h2>
            <p className="text-muted-foreground mt-3 text-pretty">
              A fixed structure means you can compare two reviews, skim for what
              matters, and never wonder what the model decided to skip.
            </p>
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviewCapabilities.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <Card className="h-full">
                  <CardHeader>
                    <Icon
                      className="text-muted-foreground size-5"
                      aria-hidden="true"
                    />
                    <CardTitle>{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm text-pretty">
                      {description}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section id="how-it-works" className="scroll-mt-14">
        <Container className="py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              How it works
            </h2>
          </div>

          <ol className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="space-y-2">
                <span className="bg-muted flex size-8 items-center justify-center rounded-full text-sm font-medium">
                  {index + 1}
                </span>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-muted-foreground text-sm text-pretty">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </AppChrome>
  );
}
