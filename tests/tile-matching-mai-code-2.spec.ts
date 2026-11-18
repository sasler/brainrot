import { expect, test } from "@playwright/test";

type RelayState = {
  screen: "title" | "play" | "pause" | "complete";
  locked: boolean;
  score: number;
  moves: number;
  hasMove: boolean;
  size: number;
  width: number;
  height: number;
};

const GAME = "/games/tile-matching/mai-code-2/index.html?test=1";

async function state(page: import("@playwright/test").Page) {
  return page.evaluate(() => window.__RELAY_TEST__.getState()) as Promise<RelayState>;
}

test.describe("MAI Code 2 Tile Matching", {
  tag: ["@spec:tile-matching-mai-code-2", "@game:tile-matching/mai-code-2"],
}, () => {
  test("loads a desktop-ready board and resolves mouse and keyboard input", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(GAME);

    await expect(page.getByRole("heading", { name: /relay.*ctrl/i })).toBeVisible();
    await page.getByRole("button", { name: "Open the relay" }).click();
    await expect(page.locator("#hud")).not.toHaveClass(/dim/);
    await expect.poll(async () => (await state(page)).screen).toBe("play");

    const initial = await state(page);
    expect(initial.width).toBe(1280);
    expect(initial.height).toBe(720);
    expect(initial.size).toBeGreaterThanOrEqual(500);
    expect(initial.hasMove).toBe(true);

    const move = await page.evaluate(() => window.__RELAY_TEST__.findMove());
    expect(move).not.toBeNull();
    const canvas = page.locator("#board");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await canvas.click({ position: relayPoint(move![0], initial) });
    await canvas.click({ position: relayPoint(move![1], initial) });

    await expect.poll(async () => (await state(page)).locked).toBe(false);
    const advanced = await state(page);
    expect(advanced.score).toBeGreaterThan(0);
    expect(advanced.moves).toBe(initial.moves - 1);

    await page.keyboard.press("p");
    await expect(page.getByRole("heading", { name: "Signal paused" })).toBeVisible();
    await page.keyboard.press("p");
    await expect.poll(async () => (await state(page)).screen).toBe("play");
    expect(errors).toEqual([]);
  });
});

function relayPoint([row, column]: [number, number], game: RelayState) {
  const x = (game.width - game.size) / 2 + (column + .5) * game.size / 8;
  const y = (game.height - game.size) / 2 + 8 + (row + .5) * game.size / 8;
  return { x, y };
}

declare global {
  interface Window {
    __RELAY_TEST__: {
      getState(): RelayState;
      findMove(): [[number, number], [number, number]] | null;
    };
  }
}
