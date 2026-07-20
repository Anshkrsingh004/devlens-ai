import { CopyButton } from "../CopyButton";

/**
 * Short copyable text: the commit message and PR description.
 *
 * Both exist to be pasted elsewhere, so the copy button is the primary
 * action rather than a convenience — displaying them without one would mean
 * the user hand-selects text from a code block.
 */
export function TextSection({
  content,
  copyLabel,
  copySubject,
  mono = false,
}: {
  content: string;
  copyLabel: string;
  copySubject: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-3">
      <pre
        className={
          mono
            ? "bg-muted overflow-x-auto rounded-md p-3 font-mono text-sm"
            : "bg-muted overflow-x-auto rounded-md p-3 text-sm whitespace-pre-wrap"
        }
      >
        {content}
      </pre>
      <CopyButton value={content} label={copyLabel} subject={copySubject} />
    </div>
  );
}
