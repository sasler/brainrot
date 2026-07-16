import { expect, test, type Page } from "@playwright/test";

type MazeSnapshot = {
  mode: string;
  seed: number;
  time: number;
  score: number;
  cores: number;
  fragments: number;
  pulse: number;
  stamina: number;
  exitActive: boolean;
  guardian: { mode: string; stunned: number; x: number; y: number } | null;
  player: { x: number; y: number };
  gates: boolean[];
  gateWalls: boolean[];
  minimap: {
    explored: number;
    total: number;
    playerVisible: boolean;
    coreVisibility: boolean[];
    exitVisible: boolean;
  };
  won: boolean;
  audit: { reachable: boolean; separated: boolean; walkable: number; total: number; seed: number } | null;
};

declare global {
  interface Window {
    __helioAudioStarts?: number;
    __helioVaultTest: {
      setSeed(seed: number): void;
      startRun(seed?: number): MazeSnapshot;
      snapshot(): MazeSnapshot;
      graphAudit(): NonNullable<MazeSnapshot["audit"]>;
      collectCore(index: number): boolean;
      collectFragment(index: number): boolean;
      usePulse(): boolean;
      triggerContact(): MazeSnapshot;
      teleportTo(kind: "core" | "exit" | "guardian" | "well", index?: number): MazeSnapshot;
      setPulse(value: number): void;
      setGuardianNear(): MazeSnapshot;
      activateExit(): MazeSnapshot;
      expire(): MazeSnapshot;
      reachExit(): MazeSnapshot;
      advance(seconds: number): MazeSnapshot;
      constants: {
        RUN_TIME: number;
        PULSE_COST: number;
        PULSE_RADIUS: number;
        CONTACT_TIME_LOSS: number;
        GRID: number;
      };
    };
  }
}

async function openGame(page: Page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto("/games/maze-3d/gpt-5-6-sol/index.html?test=1");
  await expect(page.locator("#startButton")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(window.__helioVaultTest))).toBe(true);
}

async function startGame(page: Page, seed = 56_056) {
  await page.evaluate((value) => window.__helioVaultTest.startRun(value), seed);
  await expect(page.locator("#titleScreen")).toBeHidden();
  await expect(page.locator("#hud")).toHaveClass(/visible/);
}

test.describe("GPT 5.6 Sol HELIOVAULT maze", () => {
  test("loads as a self-contained Three.js experience without external requests", async ({ page }) => {
    const externalRequests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      const loopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
      if (url.protocol.startsWith("http") && !loopback) externalRequests.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await openGame(page);

    await expect(page.locator("#stage canvas")).toBeVisible();
    await expect(page.locator("#titleScreen")).toContainText("HELIOVAULT");
    expect(await page.evaluate(() => (window as typeof window & { THREE?: { REVISION?: string } }).THREE?.REVISION)).toBe("160");
    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("does not expose deterministic test controls in normal play", async ({ page }) => {
    await page.goto("/games/maze-3d/gpt-5-6-sol/index.html");
    await expect(page.locator("#startButton")).toBeVisible();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => "__helioVaultTest" in window)).toBe(false);
  });

  test("starts procedural audio from the title-screen gesture", async ({ page }) => {
    await page.addInitScript(() => {
      window.__helioAudioStarts = 0;
      const prototype = OscillatorNode.prototype;
      const original = prototype.start;
      prototype.start = function (...args) {
        window.__helioAudioStarts = (window.__helioAudioStarts ?? 0) + 1;
        return original.apply(this, args as Parameters<OscillatorNode["start"]>);
      };
    });
    await page.goto("/games/maze-3d/gpt-5-6-sol/index.html?test=1");
    await expect(page.locator("#startButton")).toBeVisible();
    await page.locator("#startButton").click();
    await expect.poll(() => page.evaluate(() => window.__helioAudioStarts ?? 0)).toBeGreaterThan(2);
  });

  test("generates deterministic, connected mazes with separated objectives", async ({ page }) => {
    await openGame(page);
    const first = await page.evaluate(() => window.__helioVaultTest.startRun(902_106));
    const second = await page.evaluate(() => window.__helioVaultTest.startRun(902_106));
    const third = await page.evaluate(() => window.__helioVaultTest.startRun(902_107));

    expect(first.audit).toEqual(second.audit);
    expect(first.audit?.reachable).toBe(true);
    expect(first.audit?.separated).toBe(true);
    expect(first.audit?.walkable).toBe(first.audit?.total);
    expect(first.audit?.walkable).toBeGreaterThan(150);
    expect(third.audit?.seed).not.toBe(first.audit?.seed);
    expect(first.gates.length).toBeGreaterThanOrEqual(2);
  });

  test("moves forward into the corridor that the camera initially faces", async ({ page }) => {
    await openGame(page);
    await startGame(page);
    const before = await page.evaluate(() => window.__helioVaultTest.snapshot().player);

    await page.keyboard.down("w");
    try {
      const after = await page.evaluate(() => window.__helioVaultTest.advance(1).player);
      expect(after).not.toEqual(before);
    } finally {
      await page.keyboard.up("w");
    }
  });

  test("opens shortcuts, awakens the guardian, and activates the gate after three cores", async ({ page }) => {
    await openGame(page);
    await startGame(page);

    const { before, states } = await page.evaluate(() => {
      const snapshots: MazeSnapshot[] = [];
      const before = window.__helioVaultTest.snapshot();
      for (let index = 0; index < 3; index += 1) {
        window.__helioVaultTest.collectCore(index);
        snapshots.push(window.__helioVaultTest.snapshot());
      }
      return { before, states: snapshots };
    });

    expect(before.gateWalls[0]).toBe(true);
    expect(states[0].cores).toBe(1);
    expect(states[0].guardian?.mode).not.toBe("dormant");
    expect(states[0].gates[0]).toBe(true);
    expect(states[0].gateWalls[0]).toBe(false);
    expect(states[1].gates[1]).toBe(true);
    expect(states[1].gateWalls[1]).toBe(false);
    expect(states[2].cores).toBe(3);
    expect(states[2].exitActive).toBe(true);
    await expect(page.locator(".core-dot.on")).toHaveCount(3);
  });

  test("reveals the minimap progressively while keeping objectives behind fog of war", async ({ page }) => {
    await openGame(page);
    await startGame(page);
    await expect(page.locator("#minimap")).toBeVisible();

    const result = await page.evaluate(() => {
      const initial = window.__helioVaultTest.snapshot();
      window.__helioVaultTest.setPulse(100);
      window.__helioVaultTest.usePulse();
      const pulsed = window.__helioVaultTest.snapshot();
      const atCore = window.__helioVaultTest.teleportTo("core", 0);
      return { initial, pulsed, atCore };
    });

    expect(result.initial.minimap.playerVisible).toBe(true);
    expect(result.initial.minimap.explored).toBeGreaterThan(0);
    expect(result.initial.minimap.explored).toBeLessThan(result.initial.minimap.total / 4);
    expect(result.initial.minimap.coreVisibility.every((visible) => !visible)).toBe(true);
    expect(result.initial.minimap.exitVisible).toBe(false);
    expect(result.pulsed.minimap.explored).toBeGreaterThan(result.initial.minimap.explored);
    expect(result.atCore.minimap.coreVisibility[0]).toBe(true);
  });

  test("uses pulse charge, rejects an empty pulse, and stuns a nearby guardian", async ({ page }) => {
    await openGame(page);
    await startGame(page);

    const result = await page.evaluate(() => {
      window.__helioVaultTest.collectCore(0);
      window.__helioVaultTest.setGuardianNear();
      window.__helioVaultTest.setPulse(100);
      const fired = window.__helioVaultTest.usePulse();
      const after = window.__helioVaultTest.snapshot();
      window.__helioVaultTest.setPulse(10);
      const rejected = window.__helioVaultTest.usePulse();
      return { fired, after, rejected, constants: window.__helioVaultTest.constants };
    });

    expect(result.fired).toBe(true);
    expect(result.after.pulse).toBe(100 - result.constants.PULSE_COST);
    expect(result.after.guardian?.mode).toBe("stunned");
    expect(result.after.guardian?.stunned).toBeGreaterThan(3);
    expect(result.rejected).toBe(false);
  });

  test("makes guardian contact costly but recoverable", async ({ page }) => {
    await openGame(page);
    await startGame(page);

    const { before, after, loss } = await page.evaluate(() => {
      window.__helioVaultTest.collectCore(0);
      const before = window.__helioVaultTest.snapshot();
      const after = window.__helioVaultTest.triggerContact();
      return { before, after, loss: window.__helioVaultTest.constants.CONTACT_TIME_LOSS };
    });

    expect(after.mode).toBe("playing");
    expect(after.time).toBeCloseTo(before.time - loss, 3);
    expect(after.score).toBeLessThan(before.score);
    expect(after.player).toEqual({ x: 1, y: 1 });
  });

  test("does not extract early, then awards the active-gate victory", async ({ page }) => {
    await openGame(page);
    await startGame(page);

    const early = await page.evaluate(() => {
      window.__helioVaultTest.reachExit();
      return window.__helioVaultTest.snapshot();
    });
    expect(early.mode).toBe("playing");
    expect(early.exitActive).toBe(false);

    const finish = await page.evaluate(() => {
      window.__helioVaultTest.activateExit();
      return window.__helioVaultTest.reachExit();
    });
    expect(finish.mode).toBe("result");
    expect(finish.won).toBe(true);
    expect(finish.score).toBeGreaterThan(11_000);
    await expect(page.locator("#resultScreen")).toBeVisible();
    await expect(page.locator("#resultTitle")).toContainText("YOU STOLE");
  });

  test("ends in totality when the timer expires and restarts cleanly", async ({ page }) => {
    await openGame(page);
    await startGame(page);

    const expired = await page.evaluate(() => window.__helioVaultTest.expire());
    expect(expired.mode).toBe("result");
    expect(expired.won).toBe(false);
    await expect(page.locator("#resultTitle")).toContainText("LIGHT");

    const reset = await page.evaluate(() => window.__helioVaultTest.startRun(56_056));
    expect(reset.mode).toBe("playing");
    expect(reset.time).toBe(reset.audit ? 210 : 0);
    expect(reset.cores).toBe(0);
    expect(reset.fragments).toBe(0);
    expect(reset.exitActive).toBe(false);
  });

  test("keeps the viewport, touch controls, and essential HUD reachable at 320x480", async ({ page }) => {
    await openGame(page, { width: 320, height: 480 });
    await startGame(page);

    await expect(page.locator("#stage canvas")).toBeVisible();
    await expect(page.locator("#touch")).toHaveClass(/playing/);
    await expect(page.locator("#stickZone")).toBeVisible();
    await expect(page.locator("#pulseButton")).toBeVisible();
    await expect(page.locator("#minimapShell")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(481);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    for (const selector of ["#stickZone", "#pulseButton", "#pauseButton", "#muteButton", "#minimapShell"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(321);
      expect(box!.y + box!.height).toBeLessThanOrEqual(481);
    }
  });
});
