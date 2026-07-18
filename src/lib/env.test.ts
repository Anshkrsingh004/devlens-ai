// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server-side environment behaviour.
 *
 * `env.ts` validates at module load, so each case re-imports the module under
 * a different environment. This is what proves the M0 acceptance criterion:
 * a missing or malformed variable fails loudly with a readable message rather
 * than surfacing as `undefined` somewhere far away.
 *
 * The browser half of this contract is covered in env.browser.test.ts.
 */
describe("env (server runtime)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes a validated client environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://devlens.example.com");

    const { clientEnv } = await import("./env");

    expect(clientEnv.NEXT_PUBLIC_APP_URL).toBe("https://devlens.example.com");
  });

  it("names the offending variable when one is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    await expect(import("./env")).rejects.toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("rejects a malformed URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-url");

    await expect(import("./env")).rejects.toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("points the reader at .env.example", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-url");

    await expect(import("./env")).rejects.toThrow(/\.env\.example/);
  });

  it("resolves server environment when running on the server", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    const { getServerEnv } = await import("./env");

    expect(getServerEnv().NODE_ENV).toBe("test");
  });
});
