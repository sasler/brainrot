import { test, expect } from "@playwright/test";
import { getGames } from "../src/lib/games";

const EXPECTED_PAGE_ERRORS = new Map<string, string[]>([
  [
    "outrun-racer/gpt-5-4-mini",
    ["Identifier 'buildInitialGates' has already been declared"],
  ],
]);

test.describe("Game HTML Files — Load Tests", {
  tag: "@spec:games-load",
}, () => {
  for (const game of getGames()) {
    for (const version of game.versions) {
      const model = version.modelId;
      const gameKey = `${game.id}/${model}`;
      const expectedErrors = EXPECTED_PAGE_ERRORS.get(gameKey) ?? [];
      const expectation = expectedErrors.length > 0
        ? "reports only its tracked runtime error"
        : "loads without errors";
      test(`${gameKey} ${expectation}`, {
        tag: `@game:${game.id}/${model}`,
      }, async ({ page }) => {
        if (expectedErrors.length > 0) {
          test.info().annotations.push({
            type: "known-runtime-error",
            description: expectedErrors.join("; "),
          });
        }
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

        // Keep the runtime-error baseline exact so fixes and regressions both surface.
        expect(errors).toEqual(expectedErrors);
      });
    }
  }
});
