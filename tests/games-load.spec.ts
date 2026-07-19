import { test, expect } from "@playwright/test";

const ALL_GAMES = [
  { id: "snake", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gemini-3-1-pro", "gemma-4-12b", "mai-code-1-flash", "hy3"] },
  { id: "minesweeper", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gemini-3-1-pro"] },
  { id: "tetris", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gemini-3-1-pro", "gpt-5-6-luna"] },
  { id: "reversi", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gemini-3-1-pro", "gpt-5-6-sol"] },
  { id: "breakout", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gemini-3-1-pro"] },
  { id: "2048", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-5", "gpt-5-4-mini", "gemini-3-1-pro", "qwen-3-6-27b"] },
  { id: "endless-runner", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-5", "gpt-5-4-mini", "gemini-3-1-pro"] },
  { id: "marble-madness", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gemini-3-1-pro", "gpt-5-6-sol"] },
  { id: "maze-3d", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gemini-3-1-pro", "hy3", "gpt-5-6-terra", "gpt-5-6-sol"] },
  { id: "mini-golf", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gpt-5-6-sol"] },
  { id: "tile-matching", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gpt-5-5", "gpt-5-6-sol"] },
  { id: "space-invaders", models: ["opus-4-6", "sonnet-4-6", "gpt-5-4", "gpt-5-4-mini", "gpt-5-5"] },
  { id: "pac-man", models: ["sonnet-4-6", "gpt-5-4", "gpt-5-5"] },
  { id: "sudoku", models: ["sonnet-4-6", "gpt-5-4"] },
  { id: "outrun-racer", models: ["gemma-4-12b"] },
  { id: "coastal-rush-86", models: ["gpt-5-5", "gpt-5-4", "gpt-5-4-mini", "gpt-5-6-sol", "fable-5"] },
  { id: "clockwork-caper", models: ["gpt-5-6-sol", "gpt-5-6-terra", "gpt-5-6-luna"] },
  { id: "kart-racing", models: ["gpt-5-6-sol"] },
];

test.describe("Game HTML Files — Load Tests", () => {
  for (const game of ALL_GAMES) {
    for (const model of game.models) {
      test(`${game.id}/${model} loads without errors`, async ({ page }) => {
        test.setTimeout(60_000);
        const errors: string[] = [];
        page.on("pageerror", (err) => errors.push(err.message));

        await page.goto(`/games/${game.id}/${model}`);

        // The play page should load with iframe
        const iframe = page.locator("iframe");
        await expect(iframe).toBeVisible({ timeout: 10000 });

        // Verify the iframe src points to the correct game file
        const src = await iframe.getAttribute("src");
        expect(src).toContain(`/games/${game.id}/${model}/index.html`);

        await page.waitForTimeout(500);

        // Check no page-level errors occurred
        expect(errors).toEqual([]);
      });
    }
  }
});
