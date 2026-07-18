import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Global test setup.
 *
 * Registers jest-dom matchers and unmounts React trees between tests, so a
 * component rendered in one test cannot leak into the next one's queries.
 */
afterEach(() => {
  cleanup();
});
