import { expect, test, type Locator, type Page } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 320, height: 480 };

async function instrumentAudioStarts(page: Page) {
  await page.addInitScript(() => {
    const root = window as typeof window & { __brainrotAudioStarts?: number };

    root.__brainrotAudioStarts = 0;

    if (!("OscillatorNode" in window)) {
      return;
    }

    const proto = window.OscillatorNode.prototype;
    const originalStart = proto.start;

    if ((proto.start as typeof proto.start & { __brainrotWrapped?: boolean }).__brainrotWrapped) {
      return;
    }

    const wrappedStart: typeof proto.start & { __brainrotWrapped?: boolean } = function (...args) {
      root.__brainrotAudioStarts = (root.__brainrotAudioStarts ?? 0) + 1;
      return originalStart.apply(this, args);
    };

    wrappedStart.__brainrotWrapped = true;
    proto.start = wrappedStart;
  });
}

async function openStandaloneGame(page: Page, path: string) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto(path);
}

async function readRemainingCounts(page: Page) {
  return page.locator("#numberPad .number-remaining").evaluateAll((nodes) =>
    nodes.map((node) => Number(node.textContent?.trim() ?? "0")),
  );
}

function total(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

async function expectFullyInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (!box || !viewport) {
    return;
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

test.describe("Gameplay-first layout regressions", () => {
  for (const model of ["gpt-5-5", "gpt-5-4", "gpt-5-4-mini", "gpt-5-6-sol", "opus-4-8", "fable-5"]) {
    test(`Coastal Rush '86 ${model} keeps the road and touch controls reachable`, async ({
      page,
    }) => {
      await openStandaloneGame(page, `/games/coastal-rush-86/${model}/index.html`);

      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible();
      await expectFullyInViewport(page, canvas);

      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(250);

      expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        MOBILE_VIEWPORT.height + 1,
      );

      const visibleControls = page.locator(
        '[data-key]:visible, [data-touch]:visible, [data-touch-control]:visible',
      );
      const controlCount = await visibleControls.count();
      expect(controlCount).toBeGreaterThan(0);

      for (let index = 0; index < controlCount; index += 1) {
        await expectFullyInViewport(page, visibleControls.nth(index));
      }
    });
  }

  for (const model of ["gpt-5-4", "gpt-5-5"]) {
    test(`Pac-Man ${model} keeps swipe-first controls and the maze in view`, async ({ page }) => {
      await instrumentAudioStarts(page);
      await openStandaloneGame(page, `/games/pac-man/${model}/index.html`);

      const overlay = page.locator("#overlay");
      const canvas = page.locator("canvas").first();
      await expect(page.locator("#tipChip")).toHaveText(/swipe anywhere/i);
      await expect(overlay).toContainText(/Arrow keys|WASD/i);
      await expect(overlay).toContainText(/Swipe (anywhere|to steer)/i);
      await expectFullyInViewport(page, canvas);

      await page.locator("#primaryButton").click();

      await expect(overlay).not.toHaveClass(/active/);
      await expect(page.locator(".touch-wrap, #touchToggle, #touchPad, .marquee")).toHaveCount(0);
      await expect(page.locator("#audioToggle")).not.toHaveClass(/muted/);
      await expectFullyInViewport(page, canvas);
      expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        MOBILE_VIEWPORT.height + 1,
      );
      await expect.poll(() => page.evaluate(() => (window as typeof window & { __brainrotAudioStarts?: number }).__brainrotAudioStarts ?? 0)).toBeGreaterThan(0);
    });
  }

  test("GPT 5.5 Pac-Man and ghosts move after the ready countdown", async ({ page }) => {
    await openStandaloneGame(page, "/games/pac-man/gpt-5-5/index.html");
    await page.locator("#primaryButton").click();
    await page.waitForTimeout(1900);

    const before = await page.evaluate(() => ({
      player: { x: player.x, y: player.y },
      ghost: { x: ghosts[0].x, y: ghosts[0].y },
    }));

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(500);

    const after = await page.evaluate(() => ({
      player: { x: player.x, y: player.y },
      ghost: { x: ghosts[0].x, y: ghosts[0].y },
    }));

    expect(Math.hypot(after.player.x - before.player.x, after.player.y - before.player.y)).toBeGreaterThan(10);
    expect(Math.hypot(after.ghost.x - before.ghost.x, after.ghost.y - before.ghost.y)).toBeGreaterThan(10);
  });

  test("GPT 5.5 Pac-Man accepts another direction after stopping at a wall", async ({ page }) => {
    await openStandaloneGame(page, "/games/pac-man/gpt-5-5/index.html");
    await page.locator("#primaryButton").click();
    await page.waitForTimeout(1900);

    await page.evaluate(() => {
      player.x = tileCenter(12);
      player.y = tileCenter(20);
      player.dir = DIR.up;
      player.wanted = DIR.up;
      player.decisionTile = undefined;
    });
    await expect.poll(() => page.evaluate(() => player.dir.name)).toBe("none");

    const stopped = await page.evaluate(() => ({ x: player.x, y: player.y }));
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(500);
    const turned = await page.evaluate(() => ({ x: player.x, y: player.y, dir: player.dir.name }));

    expect(turned.dir).toBe("left");
    expect(Math.hypot(turned.x - stopped.x, turned.y - stopped.y)).toBeGreaterThan(10);
  });

  test("Sudoku keeps the board and number pad playable together without scrolling", async ({
    page,
  }) => {
    await instrumentAudioStarts(page);
    await openStandaloneGame(page, "/games/sudoku/gpt-5-4/index.html");

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("#startBtn").click();

    const startOverlay = page.locator("#startOverlay");
    const board = page.locator("#board");
    const numberPad = page.locator("#numberPad");
    const utilityRow = page.locator(".utility-row");
    const remainingBadges = page.locator("#numberPad .number-remaining");

    await expect(startOverlay).not.toBeVisible();
    await expect(board).toBeVisible();
    await expect(numberPad).toBeVisible();
    await expect(remainingBadges).toHaveCount(9);
    await expect(page.locator(".utility-drawer[open]")).toHaveCount(0);

    await expectFullyInViewport(page, board);
    await expectFullyInViewport(page, numberPad);

    const boardBox = await board.boundingBox();
    const numberPadBox = await numberPad.boundingBox();
    const utilityRowBox = await utilityRow.boundingBox();

    expect(boardBox).not.toBeNull();
    expect(numberPadBox).not.toBeNull();
    expect(utilityRowBox).not.toBeNull();

    if (boardBox && numberPadBox && utilityRowBox) {
      expect(utilityRowBox.y).toBeGreaterThanOrEqual(
        Math.max(boardBox.y + boardBox.height, numberPadBox.y + numberPadBox.height) - 1,
      );
    }

    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);

    const countsBefore = await readRemainingCounts(page);
    await page.locator("#hintBtn").click();

    await expect.poll(() => page.evaluate(() => (window as typeof window & { __brainrotAudioStarts?: number }).__brainrotAudioStarts ?? 0)).toBeGreaterThan(0);

    await expect.poll(async () => {
      const countsAfter = await readRemainingCounts(page);
      return total(countsBefore) - total(countsAfter);
    }).toBe(1);
  });
});
