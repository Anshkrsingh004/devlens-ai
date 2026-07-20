import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type {
  Finding,
  ReviewResult,
  Suggestion,
} from "@/features/review/schemas/review-result.schema";

/**
 * PDF document layout.
 *
 * @react-pdf/renderer supports only a small CSS subset and its own primitives,
 * so this deliberately does NOT reuse the Tailwind report components. Trying
 * to share them would fail at runtime in ways that are hard to diagnose.
 *
 * Imported only through a dynamic import so the library — which is large —
 * never reaches the initial bundle.
 */

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, lineHeight: 1.5, color: "#111" },
  title: { fontSize: 18, marginBottom: 4 },
  meta: { fontSize: 9, color: "#666", marginBottom: 16 },
  score: { fontSize: 28, marginBottom: 2 },
  h2: {
    fontSize: 13,
    marginTop: 16,
    marginBottom: 6,
    borderBottom: "1pt solid #ddd",
    paddingBottom: 3,
  },
  finding: { marginBottom: 10 },
  findingTitle: { fontSize: 10.5 },
  severity: { fontSize: 8, color: "#b45309" },
  muted: { color: "#555" },
  fix: { marginTop: 2 },
  // `wrap` on long code keeps lines inside the page instead of clipping.
  code: {
    fontFamily: "Courier",
    fontSize: 8,
    backgroundColor: "#f5f5f5",
    padding: 8,
    marginTop: 4,
  },
  caveat: { fontSize: 8, color: "#666", fontStyle: "italic", marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
});

function Findings({ title, findings }: { title: string; findings: Finding[] }) {
  return (
    <View>
      <Text style={styles.h2}>{title}</Text>
      {findings.length === 0 ? (
        <Text style={styles.muted}>None found.</Text>
      ) : (
        findings.map((finding, index) => (
          <View key={index} style={styles.finding} wrap={false}>
            <Text style={styles.severity}>
              {finding.severity}
              {finding.line > 0 ? ` · line ${finding.line}` : ""}
            </Text>
            <Text style={styles.findingTitle}>{finding.title}</Text>
            <Text style={styles.muted}>{finding.description}</Text>
            <Text style={styles.fix}>Fix: {finding.suggestion}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function Suggestions({
  title,
  suggestions,
}: {
  title: string;
  suggestions: Suggestion[];
}) {
  return (
    <View>
      <Text style={styles.h2}>{title}</Text>
      {suggestions.length === 0 ? (
        <Text style={styles.muted}>None.</Text>
      ) : (
        suggestions.map((suggestion, index) => (
          <View key={index} style={styles.finding} wrap={false}>
            <Text style={styles.findingTitle}>
              {suggestion.title} ({suggestion.impact} impact)
            </Text>
            <Text style={styles.muted}>{suggestion.description}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export function ReviewPdf({
  result,
  title,
  language,
  createdAt,
}: {
  result: ReviewResult;
  title: string;
  language: string;
  createdAt: string;
}) {
  return (
    <Document title={title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {language} · {new Date(createdAt).toISOString().slice(0, 10)}
        </Text>

        <Text style={styles.score}>{result.overallScore}/100</Text>
        <Text style={styles.muted}>{result.summary}</Text>

        <Findings title="Bugs" findings={result.bugs} />
        <Findings title="Security" findings={result.securityIssues} />
        <Findings title="Performance" findings={result.performanceIssues} />
        <Findings title="Code smells" findings={result.codeSmells} />
        <Suggestions
          title="Maintainability"
          suggestions={result.maintainability}
        />
        <Suggestions
          title="Best practices"
          suggestions={result.bestPractices}
        />

        <Text style={styles.h2}>Complexity</Text>
        <Text>
          Time: {result.timeComplexity.value} —{" "}
          {result.timeComplexity.explanation}
        </Text>
        <Text>
          Space: {result.spaceComplexity.value} —{" "}
          {result.spaceComplexity.explanation}
        </Text>

        {result.refactoredCode.trim() ? (
          <View>
            <Text style={styles.h2}>Refactored code</Text>
            <Text style={styles.caveat}>
              Generated code is a suggestion, not verified output. Review before
              use.
            </Text>
            <Text style={styles.code}>{result.refactoredCode}</Text>
          </View>
        ) : null}

        <Text style={styles.h2}>Commit message</Text>
        <Text style={styles.code}>{result.commitMessage}</Text>

        <Text style={styles.h2}>Pull request description</Text>
        <Text style={styles.muted}>{result.prDescription}</Text>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `DevLens AI · ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
