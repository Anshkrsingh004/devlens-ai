// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Browser-side environment behaviour.
 *
 * This is a security guarantee, not a convenience: server variables must never
 * be reachable from client code. If `getServerEnv()` ever silently returned a
 * value here, a secret added in a later milestone could be read from the
 * browser bundle. The test exists so that regression fails the build.
 */
describe("env (browser runtime)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("still exposes client environment", async () => {
    const { clientEnv } = await import("./env");

    expect(clientEnv.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("refuses to expose server environment", async () => {
    const { getServerEnv } = await import("./env");

    expect(() => getServerEnv()).toThrow(/called in the browser/);
  });
});
