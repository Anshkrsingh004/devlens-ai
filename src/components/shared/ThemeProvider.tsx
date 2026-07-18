"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wraps next-themes so the rest of the app never imports it directly.
 *
 * Exists as its own component because the provider must be a Client
 * Component, while the root layout stays a Server Component. Keeping the
 * `"use client"` boundary here means the layout — and everything else it
 * renders — remains server-rendered.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
