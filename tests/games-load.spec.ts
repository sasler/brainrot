import { test, expect } from "@playwright/test";

const ALL_GAMES = [
  { id: "snake", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini"] },
  { id: "minesweeper", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini"] },
  { id: "tetris", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini"] },
  { id: "reversi", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini"] },
  { id: "breakout", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini"] },
  { id: "2048", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini"] },
];

test.describe("Game HTML Files — Load Tests", () => {
  for (const game of ALL_GAMES) {
    for (const model of game.models) {
      test(`${game.id}/${model} loads without errors`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (err) => errors.push(err.message));

        await page.goto(`/games/${game.id}/${model}`);

        // The play page should load with iframe
        const iframe = page.locator("iframe");
        await expect(iframe).toBeVisible({ timeout: 10000 });

        // Verify the iframe src points to the correct game file
        const src = await iframe.getAttribute("src");
        expect(src).toContain(`/games/${game.id}/${model}/index.html`);

        // Wait for the iframe to finish loading (sandboxed frames block contentFrame access)
        await page.waitForFunction(
          (sel) => {
            const el = document.querySelector(sel) as HTMLIFrameElement | null;
            return el?.src ? true : false;
          },
          "iframe",
        );
        await page.waitForTimeout(500);

        // Check no page-level errors occurred
        expect(errors).toEqual([]);
      });
    }
  }
});
