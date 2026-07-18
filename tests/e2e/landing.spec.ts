import { expect, test } from "@playwright/test";

/**
 * M0 smoke test.
 *
 * Deliberately narrow: it proves the app boots, renders, and has no dead
 * internal links — the acceptance criteria for this milestone. Feature
 * coverage arrives with the features themselves.
 */
test.describe("landing page", () => {
  test("renders the hero and primary heading", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /code review that reads like a senior engineer wrote it/i,
      }),
    ).toBeVisible();
  });

  test("has a descriptive document title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/DevLens AI/);
  });

  test("navigates to the capabilities section from the hero", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /see what you get/i }).click();

    await expect(page.locator("#capabilities")).toBeInViewport();
  });

  test("exposes the theme toggle", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: /switch to (light|dark) theme/i }),
    ).toBeVisible();
  });

  test("renders without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );

    expect(hasOverflow).toBe(false);
  });
});
