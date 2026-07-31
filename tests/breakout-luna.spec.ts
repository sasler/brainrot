import { expect, test, type Page } from "@playwright/test";

const GAME_PATH = "/games/breakout/gpt-5-6-luna/index.html";
const TEST_PATH = `${GAME_PATH}?test=1`;

type LunaSnapshot = {
  screen: string;
  score: number;
  highScore: number;
  level: number;
  lives: number;
  combo: number;
  bricksRemaining: number;
  paddle: { x: number; targetX: number; y: number; w: number };
  balls: Array<{ x: number; y: number; vx: number; vy: number; stuck: boolean; nova: boolean }>;
  activePowerups: Record<string, number>;
  layout: { width: number; height: number; boardX: number; boardY: number; boardW: number; boardH: number; brickTop: number; paddleY: number };
  medals: string[];
};

async function snapshot(page: Page): Promise<LunaSnapshot> {
  return page.evaluate(() => {
    const api = (window as typeof window & {
      __lunaBreakoutTest: { snapshot: () => LunaSnapshot };
    }).__lunaBreakoutTest;
    return api.snapshot();
  });
}

async function advance(page: Page, milliseconds: number) {
  return page.evaluate((ms) => {
    const api = (window as typeof window & { __lunaBreakoutTest: { advance: (value: number) => LunaSnapshot } }).__lunaBreakoutTest;
    return api.advance(ms);
  }, milliseconds);
}

test.describe("GPT 5.6 Luna Breakout", {
  tag: ["@spec:breakout-luna", "@game:breakout/gpt-5-6-luna"],
}, () => {
  test("loads the lunar title state without page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(GAME_PATH);

    await expect(page).toHaveTitle("LUNAR SHATTER // BREAKOUT");
    await expect(page.locator('[data-testid="breakout-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-button"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("starts audio, moves by pointer, and supports pause and mute", async ({ page }) => {
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

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(TEST_PATH);
    await page.locator('[data-testid="start-button"]').click();
    await advance(page, 1600);

    const before = await snapshot(page);
    await page.mouse.move(120, 400);
    await page.waitForTimeout(100);
    const after = await snapshot(page);

    expect(after.screen).toBe("playing");
    expect(after.paddle.targetX).toBeLessThan(before.paddle.targetX);
    expect(after.paddle.x).toBeLessThan(before.paddle.x);
    await page.keyboard.press("Space");
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __lunaAudioStarts?: number }).__lunaAudioStarts ?? 0)).toBeGreaterThan(0);

    await page.locator('[data-testid="pause-button"]').click();
    await expect(page.locator("#statusText")).toHaveText("HOLDING POSITION");
    await page.locator("#resumeButton").click();
    await page.keyboard.press("m");
    expect((await snapshot(page)).muted).toBe(true);
    await page.locator('[data-testid="audio-button"]').click();
    expect((await snapshot(page)).muted).toBe(false);
  });

  test("exposes deterministic collision, combo, power-up, shield, and game-over hooks", async ({ page }) => {
    await page.goto(TEST_PATH);
    await page.locator('[data-testid="start-button"]').click();
    await advance(page, 1600);

    const initial = await snapshot(page);
    const brick = {
      x: initial.layout.boardX + initial.layout.boardW / 2 - 32,
      y: initial.layout.brickTop + 28,
      w: 64,
      h: 25,
      type: "crystal",
      hp: 1,
    };
    await page.evaluate((entry) => {
      const api = (window as typeof window & { __lunaBreakoutTest: { setBricks: (value: unknown[]) => void; setBall: (value: unknown) => void } }).__lunaBreakoutTest;
      api.setBricks([entry]);
      api.setBall({ x: entry.x + entry.w / 2, y: entry.y + 48, vx: 0, vy: -340, stuck: false });
    }, brick);
    const collision = await advance(page, 220);

    expect(collision.score).toBeGreaterThan(0);
    expect(collision.combo).toBe(1);
    expect(collision.bricksRemaining).toBe(0);
    expect(collision.highScore).toBe(collision.score);

    const effects = await page.evaluate(() => {
      const api = (window as typeof window & { __lunaBreakoutTest: { forcePowerUp: (type: string) => LunaSnapshot } }).__lunaBreakoutTest;
      const lens = api.forcePowerUp("lens");
      const nova = api.forcePowerUp("nova");
      return { lens, nova };
    });
    expect(effects.lens.activePowerups.lens).toBeGreaterThan(0);
    expect(effects.lens.paddle.w).toBeGreaterThan(initial.paddle.w);
    expect(effects.nova.activePowerups.nova).toBeGreaterThan(0);
    expect(effects.nova.balls[0].nova).toBe(true);

    await page.evaluate(() => {
      const api = (window as typeof window & { __lunaBreakoutTest: { setLives: (value: number) => void; forcePowerUp: (type: string) => void; setBall: (value: unknown) => void; clearAudioEvents: () => void } }).__lunaBreakoutTest;
      api.setLives(1);
      api.forcePowerUp("aegis");
      api.clearAudioEvents();
      api.setBall({ x: 640, y: 760, vx: 0, vy: 340, stuck: false });
    });
    const shieldSave = await advance(page, 40);
    expect(shieldSave.screen).toBe("playing");
    expect(shieldSave.lives).toBe(1);
    expect(shieldSave.activePowerups.aegis).toBeUndefined();
    expect(await page.evaluate(() => (window as typeof window & { __lunaBreakoutTest: { audioEvents: () => Array<{ name: string }> } }).__lunaBreakoutTest.audioEvents().some((event) => event.name === "shieldSave"))).toBe(true);

    await page.evaluate(() => {
      const api = (window as typeof window & { __lunaBreakoutTest: { setBall: (value: unknown) => void } }).__lunaBreakoutTest;
      api.setBall({ x: 640, y: 760, vx: 0, vy: 340, stuck: false });
    });
    const over = await advance(page, 40);
    expect(over.screen).toBe("gameover");
    expect(over.lives).toBe(0);
    await expect(page.locator('[data-testid="restart-button"]')).toBeVisible();
  });

  test("presents the final rank and medal summary after the last stage clears", async ({ page }) => {
    await page.goto(TEST_PATH);
    await page.locator('[data-testid="start-button"]').click();
    await advance(page, 1600);

    await page.evaluate(() => {
      const api = (window as typeof window & { __lunaBreakoutTest: { setLevel: (value: number) => void; setBricks: (value: unknown[]) => void; setBall: (value: unknown) => void } }).__lunaBreakoutTest;
      api.setLevel(6);
      api.setBricks([{ x: 600, y: 170, w: 64, h: 25, type: "standard", hp: 1 }]);
      api.setBall({ x: 632, y: 220, vx: 0, vy: -340, stuck: false });
    });
    await advance(page, 260);

    await expect(page.locator("#victoryOverlay")).toBeVisible();
    await expect(page.locator("#finalRank")).toHaveText(/[B-S]-RANK/);
    await expect(page.locator("#victoryMedals")).toHaveText("6 / 6");
  });

  test("keeps the playfield inside desktop and compact viewports", async ({ page }) => {
    for (const viewport of [{ width: 1280, height: 720 }, { width: 320, height: 480 }]) {
      await page.setViewportSize(viewport);
      await page.goto(TEST_PATH);
      const canvas = page.locator('[data-testid="breakout-canvas"]');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height);
    }
  });
});
