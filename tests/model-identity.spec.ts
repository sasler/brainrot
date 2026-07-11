import { expect, test } from "@playwright/test";
import { getGames, getModelReviews } from "../src/lib/games";
import {
  MODEL_CATALOG,
  compareModels,
  isKnownModelId,
} from "../src/lib/modelCatalog";

test.describe("Model identity system", () => {
  test("catalog covers every model and uses unique public names", () => {
    const entries = Object.values(MODEL_CATALOG);
    expect(new Set(entries.map((entry) => entry.displayName)).size).toBe(entries.length);

    const modelIds = new Set([
      ...getGames().flatMap((game) => game.versions.map((version) => version.modelId)),
      ...getModelReviews().map((entry) => entry.modelId),
    ]);

    for (const modelId of modelIds) expect(isKnownModelId(modelId)).toBe(true);
  });

  test("normalized game and review models are alphabetized", () => {
    for (const game of getGames()) {
      expect(game.versions).toEqual([...game.versions].sort(compareModels));
    }
    expect(getModelReviews()).toEqual([...getModelReviews()].sort(compareModels));
  });

  test("cards expose the catalog names, families, and colors", async ({ page }) => {
    await page.goto("/games/tile-matching");

    const cards = page.locator('[data-model-id][data-model-color]');
    await expect(cards).toHaveCount(6);
    await expect(cards.locator("h3")).toHaveText([
      "Claude Opus 4.6",
      "Claude Sonnet 4.6",
      "OpenAI GPT 5.4",
      "OpenAI GPT 5.4 Mini",
      "OpenAI GPT 5.5",
      "OpenAI GPT 5.6 Sol",
    ]);

    await expect(page.locator('[data-model-id="gpt-5-4"]')).toHaveAttribute(
      "data-model-color",
      "#10A37F",
    );
    await expect(page.locator('[data-model-id="gpt-5-6-sol"]')).toContainText(
      "OpenAI GPT",
    );
  });

  for (const viewport of [
    { name: "mobile", width: 320, height: 480 },
    { name: "desktop", width: 1280, height: 800 },
  ]) {
    test(`long model names fit the ${viewport.name} layout`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/games/coastal-rush-86");
      await expect(
        page.getByRole("heading", { name: "Microsoft MAI-Code-1-Flash" }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width,
      );
    });
  }

  test("model cards retain a visible keyboard focus treatment", async ({ page }) => {
    await page.goto("/games/tile-matching");
    const firstCard = page.locator('[data-model-id][data-model-color]').first();
    await firstCard.focus();
    await expect(firstCard).toBeFocused();
    expect(await firstCard.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
      "none",
    );
  });
});
