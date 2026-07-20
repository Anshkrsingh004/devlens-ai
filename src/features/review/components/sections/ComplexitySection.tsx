import type { Complexity } from "../../schemas/review-result.schema";

/**
 * Time and space complexity.
 *
 * "N/A" is a first-class value, not a failure. For a React component or a
 * config file, complexity is a meaningless question, and a model asked for it
 * anyway will invent a plausible O(n). Rendering N/A distinctly — muted
 * rather than in the emphasised mono style — makes the honest answer read as
 * deliberate rather than broken.
 */
function ComplexityValue({
  label,
  complexity,
}: {
  label: string;
  complexity: Complexity;
}) {
  const isNotApplicable = complexity.value.trim().toUpperCase() === "N/A";

  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p
        className={
          isNotApplicable
            ? "text-muted-foreground mt-0.5 text-lg"
            : "mt-0.5 font-mono text-lg font-medium"
        }
      >
        {complexity.value}
      </p>
      <p className="text-muted-foreground mt-1 text-sm text-pretty">
        {complexity.explanation}
      </p>
    </div>
  );
}

export function ComplexitySection({
  time,
  space,
}: {
  time: Complexity;
  space: Complexity;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <ComplexityValue label="Time" complexity={time} />
      <ComplexityValue label="Space" complexity={space} />
    </div>
  );
}
