"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Light/dark theme switch.
 *
 * Rendered in the site header and, from M7, the settings page — which is why
 * it lives in `shared/` rather than beside a single feature.
 *
 * The `mounted` guard is required, not defensive: the server cannot know the
 * visitor's stored theme, so rendering the resolved icon before hydration
 * produces a mismatch. Until mounted we render the same neutral placeholder
 * on both sides, keeping layout stable and avoiding a hydration error.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-hidden="true"
        tabIndex={-1}
        disabled
      >
        <Sun aria-hidden="true" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
