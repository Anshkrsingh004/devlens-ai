import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Unit and component test configuration.
 *
 * Note the absence of `@vitejs/plugin-react`: that plugin exists for Fast
 * Refresh and Babel transforms, neither of which applies in tests. Vite's
 * built-in transformer handles the automatic JSX runtime on its own, so the
 * dependency — and its peer conflict with Vitest's Vite 8 — is avoided.
 *
 * End-to-end specs live in tests/e2e and are run by Playwright, not Vitest.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Next.js requires `jsx: "preserve"` in tsconfig, which leaves JSX
  // untransformed for Vite. Overriding the transformer here — rather than
  // changing tsconfig — keeps the Next build correct while letting Vitest
  // compile components.
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // `lib/env.ts` validates at module load, so anything importing it
    // transitively needs this present before the first import runs.
    env: {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
});
