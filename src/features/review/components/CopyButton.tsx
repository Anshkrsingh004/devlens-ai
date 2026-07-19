"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  /** The text placed on the clipboard. */
  value: string;
  /** Button label. Kept short — this usually sits beside other controls. */
  label?: string;
  /** What was copied, used in the success toast: "Report copied". */
  subject?: string;
}

/** How long the button shows its confirmed state before reverting. */
const CONFIRMATION_MS = 2000;

/**
 * Copy-to-clipboard control with confirmation.
 *
 * Lives in `features/review` for now because it has a single consumer.
 * It moves to `components/shared` when M6 adds copy-as-Markdown — promotion
 * happens on the second consumer, not in anticipation of one
 * (PROJECT_STRUCTURE.md §1).
 */
export function CopyButton({
  value,
  label = "Copy",
  subject = "Copied",
}: CopyButtonProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Without this, unmounting during the confirmation window leaves a timer
  // that calls setState on a dead component.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      // Requires a secure context: HTTPS in production, localhost in dev.
      // Over plain HTTP the API is undefined, hence the explicit guard.
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(value);

      setHasCopied(true);
      toast.success(`${subject} to clipboard`);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(
        () => setHasCopied(false),
        CONFIRMATION_MS,
      );
    } catch {
      // Denied permission, an insecure origin, or a browser without the API.
      toast.error("Could not copy", {
        description: "Select the text and copy it manually.",
      });
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      // The label already changes, but screen readers need the state announced
      // rather than inferred from an icon swap.
      aria-label={
        hasCopied ? `${subject} to clipboard` : `${label} to clipboard`
      }
    >
      {hasCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {hasCopied ? "Copied" : label}
    </Button>
  );
}
