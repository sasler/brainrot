import { expect, test, type Page } from "@playwright/test";

type MiniGolfSnapshot = {
  state: string;
  currentHole: number;
  holeCount: number;
  holeName: string;
  par: number;
  strokes: number;
  totalStrokes: number;
  ball: { x: number; y: number; z: number; speed: number; stopped: boolean };
  cup: { x: number; z: number };
  mechanics: { rails: number; bumpers: number; waters: number; movers: number; portals: number };
};

declare global {
  interface Window {
    __miniGolfTest: {
      currentHole: number;
      state: string;
      ballPosition: { x: number; y: number; z: number };
      ballVelocity: { x: number; y: number; z: number };
      strokeCount: number;
      loadHole(index: number): void;
      launchShot(direction: { x: number; z: number }, power: number): boolean;
      advance(seconds: number): void;
      completeCurrentHole(): void;
      snapshot(): MiniGolfSnapshot;
    };
  }
}

async function openGame(page: Page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto("/games/mini-golf/gpt-5-6-sol/index.html?test=1");
  await expect(page.locator("#startButton")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(window.__miniGolfTest))).toBe(true);
}

async function startGame(page: Page) {
  await page.locator("#startButton").click();
  await expect(page.locator("#titleScreen")).toBeHidden();
  await expect(page.locator("#hud")).toBeVisible();
}

test.describe("GPT 5.6 Sol TOTALITY mini golf", {
  tag: ["@spec:mini-golf-sol", "@game:mini-golf/gpt-5-6-sol"],
}, () => {
  test("loads as a self-contained Three.js game with no external requests", async ({ page }) => {
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      const isLoopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
      if (url.protocol.startsWith("http") && !isLoopback) {
        externalRequests.push(request.url());
      }
    });

    await openGame(page);

    await expect(page.locator("#gameCanvas")).toBeVisible();
    await expect(page.locator("#titleScreen")).toContainText("TOTALITY");
    expect(externalRequests).toEqual([]);
  });

  test("does not expose test controls during normal gameplay", async ({ page }) => {
    await page.goto("/games/mini-golf/gpt-5-6-sol/index.html");
    await expect(page.locator("#startButton")).toBeVisible();
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => "__miniGolfTest" in window)).toBe(false);
  });

  test("registers nine progressively varied, reachable course definitions", async ({ page }) => {
    await openGame(page);
    await startGame(page);

    const snapshots = await page.evaluate(() => {
      const values: MiniGolfSnapshot[] = [];
      for (let index = 0; index < 9; index += 1) {
        window.__miniGolfTest.loadHole(index);
        values.push(window.__miniGolfTest.snapshot());
      }
      return values;
    });

    expect(snapshots).toHaveLength(9);
    expect(new Set(snapshots.map((value) => value.holeName)).size).toBe(9);
    expect(snapshots[3].mechanics.bumpers).toBeGreaterThan(0);
    expect(snapshots[4].mechanics.movers).toBeGreaterThan(0);
    expect(snapshots[5].mechanics.waters).toBeGreaterThan(0);
    expect(snapshots[7].mechanics.portals).toBeGreaterThan(0);
    expect(snapshots[8].par).toBe(5);
  });

  test("launches one deterministic shot, counts it once, and rebounds from rails", async ({ page }) => {
    await openGame(page);
    await startGame(page);
    await page.evaluate(() => {
      window.__miniGolfTest.loadHole(0);
      window.__miniGolfTest.launchShot({ x: -0.82, z: 1 }, 0.82);
    });

    const rebounded = await page.evaluate(() => {
      for (let step = 0; step < 1200; step += 1) {
        window.__miniGolfTest.advance(1 / 120);
        if (window.__miniGolfTest.ballVelocity.x > 0) return true;
      }
      return false;
    });
    expect(rebounded).toBe(true);
    expect(await page.evaluate(() => window.__miniGolfTest.strokeCount)).toBe(1);
  });

  test("carries a full-power drive across the first fairway", async ({ page }) => {
    await openGame(page);
    await startGame(page);
    const startZ = await page.evaluate(() => {
      window.__miniGolfTest.loadHole(0);
      const z = window.__miniGolfTest.ballPosition.z;
      window.__miniGolfTest.launchShot({ x: 0, z: 1 }, 1);
      window.__miniGolfTest.advance(20);
      return z;
    });

    const finish = await page.evaluate(() => window.__miniGolfTest.snapshot());
    expect(finish.state === "result" || finish.ball.stopped).toBe(true);
    expect(finish.ball.z - startZ).toBeGreaterThan(14.5);
    expect(finish.strokes).toBe(1);
  });

  test("applies exactly one penalty and safely recovers from Umbra water", async ({ page }) => {
    await openGame(page);
    await startGame(page);
    const start = await page.evaluate(() => {
      window.__miniGolfTest.loadHole(5);
      const position = window.__miniGolfTest.ballPosition;
      window.__miniGolfTest.launchShot({ x: 0, z: 1 }, 0.92);
      return position;
    });

    await expect.poll(
      () => page.evaluate(() => window.__miniGolfTest.strokeCount),
      { timeout: 6000 },
    ).toBe(2);
    await expect.poll(() => page.evaluate(() => window.__miniGolfTest.snapshot().ball.stopped)).toBe(true);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__miniGolfTest.strokeCount)).toBe(2);
    const recovered = await page.evaluate(() => window.__miniGolfTest.ballPosition);
    expect(Math.hypot(recovered.x - start.x, recovered.z - start.z)).toBeLessThan(4.5);
  });

  test("climbs the Sunspot ramp and captures a low-speed putt", async ({ page }) => {
    await openGame(page);
    await startGame(page);

    await page.evaluate(() => {
      window.__miniGolfTest.loadHole(3);
      window.__miniGolfTest.launchShot({ x: 0, z: 1 }, 0.95);
    });
    const peakY = await page.evaluate(() => {
      let peak = window.__miniGolfTest.ballPosition.y;
      for (let step = 0; step < 1200; step += 1) {
        window.__miniGolfTest.advance(1 / 120);
        peak = Math.max(peak, window.__miniGolfTest.ballPosition.y);
      }
      return peak;
    });
    expect(peakY).toBeGreaterThan(0.75);

    await page.evaluate(() => window.__miniGolfTest.loadHole(0));
    await page.evaluate(() => {
      window.__miniGolfTest.launchShot({ x: 0, z: 1 }, 1);
      window.__miniGolfTest.advance(20);
      const snapshot = window.__miniGolfTest.snapshot();
      if (!snapshot.ball.stopped) throw new Error("Full-power setup shot did not stop");
      const dx = snapshot.cup.x - snapshot.ball.x;
      const dz = snapshot.cup.z - snapshot.ball.z;
      const distance = Math.hypot(dx, dz);
      const estimatedSpeed = distance * 1.48;
      const power = Math.max(0.1, Math.min(0.72, (estimatedSpeed - 3.1) / 14.4));
      window.__miniGolfTest.launchShot({ x: dx, z: dz }, power);
      window.__miniGolfTest.advance(20);
    });
    expect(await page.evaluate(() => window.__miniGolfTest.state)).toBe("result");
    await expect(page.locator("#holeScreen")).toBeVisible();
  });

  test("advances through all nine result transitions and renders the final scorecard", async ({ page }) => {
    await openGame(page);
    await startGame(page);

    const resultScreens = await page.evaluate(() => {
      const visibility: boolean[] = [];
      const holeScreen = document.getElementById("holeScreen");
      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      if (!holeScreen || !nextButton) throw new Error("Hole result controls are unavailable");
      for (let index = 0; index < 9; index += 1) {
        window.__miniGolfTest.completeCurrentHole();
        visibility.push(!holeScreen.classList.contains("hidden"));
        nextButton.click();
      }
      return visibility;
    });

    expect(resultScreens).toEqual(Array(9).fill(true));
    await expect(page.locator("#finalScreen")).toBeVisible();
    await expect(page.locator("#scorecardGrid .score-cell")).toHaveCount(9);
    await expect(page.locator("#rankTitle")).not.toBeEmpty();
  });

  test("keeps the playfield and touch-safe controls reachable at 320x480", async ({ page }) => {
    await openGame(page, { width: 320, height: 480 });
    await startGame(page);

    await expect(page.locator("#gameCanvas")).toBeVisible();
    await expect(page.locator("#utility")).toBeVisible();
    await expect(page.locator("#shotPanel")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(481);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    for (const selector of ["#overviewButton", "#recoverButton", "#muteButton"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(321);
      expect(box!.y + box!.height).toBeLessThanOrEqual(481);
    }
  });
});
