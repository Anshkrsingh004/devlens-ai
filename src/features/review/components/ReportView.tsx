"use client";

import {
  Bug,
  FileCode2,
  GaugeCircle,
  GitCommitHorizontal,
  GitPullRequest,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  Timer,
  Wrench,
} from "lucide-react";

import { CodeBlock } from "@/components/shared/CodeBlock";
import { SectionCard } from "@/components/shared/SectionCard";
import { Badge } from "@/components/ui/badge";

import type { ReviewResult } from "../schemas/review-result.schema";
import { CopyButton } from "./CopyButton";
import { ScoreGauge } from "./ScoreGauge";
import { ComplexitySection } from "./sections/ComplexitySection";
import { FindingList } from "./sections/FindingList";
import { SuggestionList } from "./sections/SuggestionList";
import { TextSection } from "./sections/TextSection";

/** Count badge, omitted at zero so empty sections stay visually quiet. */
function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="text-xs tabular-nums">
      {count}
    </Badge>
  );
}

/**
 * The full review report.
 *
 * Ordered by what a reviewer needs first: score and summary, then the things
 * that can hurt you (bugs, security), then the things that cost you
 * (performance, smells), then advice, then the artefacts you paste elsewhere.
 *
 * Note how few components this needs — four finding categories share
 * FindingList and two suggestion categories share SuggestionList, because
 * they share a shape in the schema.
 */
export function ReportView({ result }: { result: ReviewResult }) {
  return (
    <div className="space-y-6">
      <SectionCard title="Summary" icon={Sparkles}>
        <div className="space-y-5">
          <ScoreGauge score={result.overallScore} />
          <p className="text-sm text-pretty">{result.summary}</p>
        </div>
      </SectionCard>

      <SectionCard
        title="Bugs"
        icon={Bug}
        badge={<CountBadge count={result.bugs.length} />}
      >
        <FindingList
          findings={result.bugs}
          emptyMessage="No bugs found in this code."
        />
      </SectionCard>

      <SectionCard
        title="Security"
        icon={ShieldAlert}
        badge={<CountBadge count={result.securityIssues.length} />}
      >
        <FindingList
          findings={result.securityIssues}
          emptyMessage="No security issues found."
        />
      </SectionCard>

      <SectionCard
        title="Performance"
        icon={GaugeCircle}
        badge={<CountBadge count={result.performanceIssues.length} />}
      >
        <FindingList
          findings={result.performanceIssues}
          emptyMessage="No performance problems found."
        />
      </SectionCard>

      <SectionCard
        title="Code smells"
        icon={Wrench}
        badge={<CountBadge count={result.codeSmells.length} />}
      >
        <FindingList
          findings={result.codeSmells}
          emptyMessage="No code smells found."
        />
      </SectionCard>

      <SectionCard
        title="Maintainability"
        icon={Lightbulb}
        badge={<CountBadge count={result.maintainability.length} />}
      >
        <SuggestionList
          suggestions={result.maintainability}
          emptyMessage="No maintainability suggestions."
        />
      </SectionCard>

      <SectionCard
        title="Best practices"
        icon={Lightbulb}
        badge={<CountBadge count={result.bestPractices.length} />}
      >
        <SuggestionList
          suggestions={result.bestPractices}
          emptyMessage="No additional best-practice notes."
        />
      </SectionCard>

      <SectionCard
        title="Complexity"
        icon={Timer}
        description="Of the code as submitted, not the refactored version."
      >
        <ComplexitySection
          time={result.timeComplexity}
          space={result.spaceComplexity}
        />
      </SectionCard>

      {/*
        Omitted entirely when the user has disabled the refactor, rather than
        rendered as an empty box. The schema uses "" for that case.
      */}
      {result.refactoredCode.trim() ? (
        <SectionCard title="Refactored code" icon={FileCode2}>
          <div className="space-y-3">
            <CodeBlock code={result.refactoredCode} />
            <CopyButton
              value={result.refactoredCode}
              label="Copy code"
              subject="Code copied"
            />
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Commit message" icon={GitCommitHorizontal}>
        <TextSection
          content={result.commitMessage}
          copyLabel="Copy message"
          copySubject="Commit message copied"
          mono
        />
      </SectionCard>

      <SectionCard title="Pull request description" icon={GitPullRequest}>
        <TextSection
          content={result.prDescription}
          copyLabel="Copy description"
          copySubject="Description copied"
        />
      </SectionCard>
    </div>
  );
}
