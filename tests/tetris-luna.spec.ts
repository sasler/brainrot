import { expect, test, type Page } from "@playwright/test";

const GAME_PATH = "/games/tetris/gpt-5-6-luna/index.html";

async function instrumentAudio(page: Page) {
  await page.addInitScript(() => {
    const root = window as typeof window & { __lunaAudioStarts?: number };
    root.__lunaAudioStarts = 0;
    if (!("OscillatorNode" in window)) return;
    const proto = window.OscillatorNode.prototype;
    const originalStart = proto.start;
    proto.start = function (...args) {
      root.__lunaAudioStarts = (root.__lunaAudioStarts ?? 0) + 1;
      return originalStart.apply(this, args);
    };
  });
}

async function expectInViewport(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!box || !viewport) return;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

test.describe("GPT 5.6 Luna Tetris", () => {
  test("loads standalone without page errors and exposes the lunar start state", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(GAME_PATH);
    await expect(page).toHaveTitle("LUNAR ECLIPSE // TETRIS");
    await expect(page.locator('[data-testid="tetris-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-button"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("starts audio and responds to keyboard and touch controls", async ({ page }) => {
    await instrumentAudio(page);
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto(GAME_PATH);
    await page.locator('[data-testid="start-button"]').click();
    await expect(page.locator("#statusText")).toHaveText("ORBITAL LOCK");
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __lunaAudioStarts?: number }).__lunaAudioStarts ?? 0)).toBeGreaterThan(0);

    const utility = page.locator(".mobile-utility");
    await expect(utility).toBeVisible();
    await expect(utility.locator("button")).toHaveCount(3);
    await utility.getByRole("button", { name: "Hold piece" }).click();
    await utility.getByRole("button", { name: "Pause game" }).click();
    await expect(page.locator("#statusText")).toHaveText("HOLDING POSITION");
    await utility.getByRole("button", { name: "Pause game" }).click();
    await utility.getByRole("button", { name: "Toggle audio" }).click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Space");
    await page.locator('[data-testid="touch-left"]').click();
    await page.locator('[data-testid="touch-rotate"]').click();
    await page.locator('[data-testid="touch-drop"]').click();
    await expect(page.locator("#scoreValue")).not.toHaveText("000000");
  });

  test("keeps the playfield and touch dock inside a 320x480 viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto(GAME_PATH);
    await expectInViewport(page, '[data-testid="tetris-board"]');
    await page.locator('[data-testid="start-button"]').click();
    await expectInViewport(page, "#touchPad");
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(480);
  });

  test("keeps a centered desktop board with no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(GAME_PATH);
    await expectInViewport(page, '[data-testid="tetris-board"]');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(800);
  });
});