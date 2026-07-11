import { expect, test } from "@playwright/test";

test.describe("Model explorer", () => {
  test("groups models by company with frontier labs first", async ({ page }) => {
    await page.goto("/models");
    await expect(page.getByRole("heading", { name: "Meet the minds behind the games." })).toBeVisible();
    const companies = await page.locator("[data-company]").evaluateAll((sections) =>
      sections.map((section) => section.getAttribute("data-company")),
    );
    expect(companies.slice(0, 3)).toEqual(["Anthropic", "Google", "OpenAI"]);
    expect(companies).toEqual(expect.arrayContaining(["Alibaba", "Microsoft", "MiniMax", "Tencent"]));
    expect(companies.slice(3)).toEqual(
      [...companies.slice(3)].sort((a, b) => (a ?? "").localeCompare(b ?? "", "en", { numeric: true })),
    );
    await expect(page.locator('[data-company="Google"] [data-model-id="gemini-3-1-pro"]')).toBeVisible();
    await expect(page.locator('[data-company="Google"] [data-model-id="gemma-4-12b"]')).toBeVisible();
    await expect(page.locator('[data-company="OpenAI"] [data-model-id="gpt-5-4"]')).toBeVisible();
    const gpt = page.locator('[data-model-id="gpt-5-4"]');
    await expect(gpt).toContainText("OpenAI GPT 5.4");
    await expect(gpt).toContainText("games shipped");
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
