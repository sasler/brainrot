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
  test("Pac-Man removes touch-pad chrome and points players to swipe-or-keyboard controls", async ({
    page,
  }) => {
    await instrumentAudioStarts(page);
    await openStandaloneGame(page, "/games/pac-man/gpt-5-4/index.html");

    const overlay = page.locator("#overlay");
    await expect(page.locator("#tipChip")).toHaveText(/Arrow keys \/ WASD \/ swipe anywhere/i);
    await expect(overlay).toContainText("Arrow keys or WASD steer instantly at lane centers.");
    await expect(overlay).toContainText("Swipe anywhere on mobile to steer without covering the maze.");

    await page.locator("#primaryButton").click();

    await expect(overlay).not.toHaveClass(/active/);
    await expect(page.locator(".touch-wrap, #touchToggle, #touchPad, .marquee")).toHaveCount(0);
    await expect(page.locator("#audioToggle")).not.toHaveClass(/muted/);
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __brainrotAudioStarts?: number }).__brainrotAudioStarts ?? 0)).toBeGreaterThan(0);
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
