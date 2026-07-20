import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  /** Describes the region for screen readers. */
  label?: string;
  className?: string;
  /** Caps the height and scrolls; omit to render the block in full. */
  maxHeight?: number;
}

/**
 * Read-only code display.
 *
 * Deliberately not Monaco: a second editor instance per report would add
 * hundreds of kilobytes to render text nobody can edit. Monospace with
 * horizontal scrolling is enough, and it keeps long lines from breaking the
 * page layout.
 */
export function CodeBlock({
  code,
  className,
  label = "Code",
  maxHeight = 480,
}: CodeBlockProps) {
  return (
    <pre
      // Focusable so keyboard users can scroll it. axe flags a scrollable
      // region that cannot receive focus as a serious violation, and it is a
      // real barrier: without this the content is simply unreachable.
      tabIndex={0}
      role="region"
      aria-label={label}
      className={cn(
        "bg-muted overflow-auto rounded-md p-4 text-xs leading-relaxed",
        className,
      )}
      style={{ maxHeight }}
    >
      <code>{code}</code>
    </pre>
  );
}
