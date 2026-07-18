import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Horizontal layout constraint: max width plus responsive gutters.
 *
 * Exists so page width is decided in one file rather than re-invented with
 * ad-hoc `max-w-*` classes on every page. Every page in the app mounts
 * inside one of these, directly or via AppShell.
 */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
