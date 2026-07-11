import { expect, test } from "@playwright/test";

test.describe("Model explorer", () => {
  test("groups participating models and shows contribution counts", async ({ page }) => {
    await page.goto("/models");
    await expect(page.getByRole("heading", { name: "Meet the minds behind the games." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "OpenAI GPT", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Claude", exact: true })).toBeVisible();
    const gpt = page.locator('[data-model-id="gpt-5-4"]');
    await expect(gpt).toContainText("OpenAI GPT 5.4");
    await expect(gpt).toContainText("15");
  });

  test("opens a shareable model profile with only its games", async ({ page }) => {
    await page.goto("/models");
    await page.locator('[data-model-id="fable-5"]').click();
    await expect(page).toHaveURL("/models/fable-5");
    await expect(page.getByRole("heading", { name: "Claude Fable 5" })).toBeVisible();
    await expect(page.locator('[data-game-id="coastal-rush-86"]')).toBeVisible();
    await expect(page.locator("[data-game-id]")).toHaveCount(1);
  });

  test("game cards launch the selected model implementation", async ({ page }) => {
    await page.goto("/models/fable-5");
    await page.locator('[data-game-id="coastal-rush-86"]').click();
    await expect(page).toHaveURL("/games/coastal-rush-86/fable-5");
    await expect(page.locator('[data-model-id="fable-5"]')).toBeVisible();
  });

  test("invalid models return 404", async ({ page }) => {
    const response = await page.goto("/models/not-a-real-model");
    expect(response?.status()).toBe(404);
  });

  test("navigation fits a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/models");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Models" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
});
