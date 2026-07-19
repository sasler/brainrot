import { expect, test, type Page } from "@playwright/test";

type MarbleSnapshot = {
  state: string;
  seed: number;
  courseIndex: number;
  courseName: string;
  elapsed: number;
  checkpointIndex: number;
  courseDesign: { difficulty: number; theme: string; mechanic: string; requiredJumps: number; platforms: number; railPlatforms: number; assistedRailPlatforms: number; checkpoints: number; windZones: number; minWidth: number; maxHeight: number };
  marble: { x: number; y: number; z: number; vx: number; vy: number; vz: number; speed: number; grounded: boolean };
  groundedPlatform: string | null;
  fallsInSection: number;
  totalFalls: number;
  assistActive: boolean;
  liftAvailable: boolean;
  seedsCollected: number;
  seedCount: number;
  unlockedCourses: number;
  petals: number;
  celebration: string;
  movingPlatforms: Array<{ id: string; x: number; y: number; z: number }>;
};

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__: {
      seed(seed: number): void;
      setState(state: "title" | "active-play" | "fail" | "win" | "stress"): MarbleSnapshot;
      advance(seconds: number): MarbleSnapshot;
      snapshot(): MarbleSnapshot;
    };
    __THREE_GAME_DIAGNOSTICS__: {
      snapshot(): {
        renderer: { calls: number; triangles: number; geometries: number; textures: number };
        scene: { meshes: number; materials: number; instancedMeshes: number };
        settings: { dpr: number; shadows: boolean; postPasses: number };
      };
    };
    __MARBLE_MADNESS_TEST__: {
      startCourse(index: number): MarbleSnapshot;
      setInput(x?: number, z?: number, brake?: boolean): MarbleSnapshot;
      clearInput(): MarbleSnapshot;
      jump(): MarbleSnapshot;
      setMarble(data: { position?: Partial<{ x: number; y: number; z: number }>; velocity?: Partial<{ x: number; y: number; z: number }> }): MarbleSnapshot;
      triggerFall(): MarbleSnapshot;
      reachCheckpoint(index: number): MarbleSnapshot;
      collectSeed(index: number): MarbleSnapshot;
      completeCourse(): MarbleSnapshot;
      gardenLift(): MarbleSnapshot;
      snapshot(): MarbleSnapshot;
    };
  }
}

async function openGame(page: Page, testMode = true) {
  const initializationErrors: string[] = [];
  page.on("pageerror", error => initializationErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") initializationErrors.push(message.text()); });
  page.on("requestfailed", request => initializationErrors.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on("response", response => { if (response.status() >= 400) initializationErrors.push(`${response.status()} ${response.url()}`); });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/games/marble-madness/gpt-5-6-sol/index.html${testMode ? "?test=1" : ""}`);
  await expect(page.locator("#startButton")).toBeVisible();
  if (testMode) {
    await page.waitForTimeout(250);
    if (!await page.evaluate(() => Boolean(window.__THREE_GAME_TEST_HOOKS__))) {
      throw new Error(`Game initialization failed: ${initializationErrors.join(" | ") || "test hooks were not installed"}`);
    }
    await expect.poll(() => page.evaluate(() => Boolean(window.__THREE_GAME_TEST_HOOKS__))).toBe(true);
    await expect.poll(() => page.evaluate(() => Boolean(window.__MARBLE_MADNESS_TEST__))).toBe(true);
  }
}

test.describe("GPT 5.6 Sol Marble Madness", () => {
  test("uses the pinned local Three.js runtime without external requests or errors", async ({ page }) => {
    const external: string[] = [], runtime: string[] = [], errors: string[] = [];
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) external.push(request.url());
      if (url.pathname.startsWith("/vendor/three/")) runtime.push(url.pathname);
    });
    page.on("pageerror", error => errors.push(error.message));
    await openGame(page);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    expect(runtime).toContain("/vendor/three/0.185.1/three.module.min.js");
    expect(runtime).toContain("/vendor/three/0.185.1/three.core.min.js");
    const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.snapshot());
    expect(diagnostics.settings).toEqual({ dpr: 1, shadows: true, postPasses: 0 });
    expect(diagnostics.scene.meshes).toBeGreaterThan(50);
    expect(diagnostics.scene.instancedMeshes).toBeGreaterThanOrEqual(2);
  });

  test("keeps deterministic controls private in normal play", async ({ page }) => {
    await openGame(page, false);
    expect(await page.evaluate(() => "__THREE_GAME_TEST_HOOKS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__THREE_GAME_DIAGNOSTICS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__MARBLE_MADNESS_TEST__" in window)).toBe(false);
  });

  test("starts without Web Audio and uses the full desktop playfield", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
      Object.defineProperty(window as Window & { webkitAudioContext?: unknown }, "webkitAudioContext", { value: undefined, configurable: true });
    });
    await openGame(page, false);
    await page.locator("#startButton").click();
    await expect(page.locator("#titleScreen")).toBeHidden();
    await expect(page.locator("#hud")).toBeVisible();
    expect(await page.locator("canvas").evaluate(canvas => ({ width: canvas.clientWidth, height: canvas.clientHeight }))).toEqual({ width: 1280, height: 720 });
  });

  test("makes the opening course wide and forgiving without sealing every edge", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.startCourse(0));
    expect(result.courseName).toBe("Dawn Terrace");
    expect(result.courseDesign.minWidth).toBeGreaterThanOrEqual(13);
    expect(result.courseDesign.railPlatforms).toBeGreaterThanOrEqual(2);
    expect(result.courseDesign.railPlatforms).toBeLessThan(result.courseDesign.platforms);
    expect(result.courseDesign.requiredJumps).toBe(2);
    expect(result.courseDesign.maxHeight).toBeGreaterThanOrEqual(3);
    expect(result.courseDesign.checkpoints).toBeGreaterThanOrEqual(3);
    expect(result.seedCount).toBe(3);
  });

  test("implements a real grounded Space jump with an airborne arc", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.startCourse(0));
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.05));
    const grounded = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.snapshot());
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.jump());
    const rising = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.12));
    expect(grounded.marble.grounded).toBe(true);
    expect(rising.marble.grounded).toBe(false);
    expect(rising.marble.y).toBeGreaterThan(grounded.marble.y + .5);
    expect(rising.marble.vy).toBeGreaterThan(4);
    const landed = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1));
    expect(landed.marble.grounded).toBe(true);
  });

  test("allows the marble to fall from visibly unrailed platform sides", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.startCourse(1));
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.setMarble({ position: { x: 9, y: 3.4, z: -23 }, velocity: { x: 3, y: 0, z: 0 } }));
    const result = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1.25));
    expect(result.totalFalls).toBe(1);
  });

  test("gives every course a distinct theme and progressively harder geometry", async ({ page }) => {
    await openGame(page);
    const designs = [];
    for (let course = 0; course < 6; course++) designs.push(await page.evaluate(index => window.__MARBLE_MADNESS_TEST__.startCourse(index), course));
    expect(new Set(designs.map(result => result.courseDesign.theme)).size).toBe(6);
    expect(designs.map(result => result.courseDesign.difficulty)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(designs.map(result => result.courseDesign.requiredJumps)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(designs[5].courseDesign.maxHeight).toBeGreaterThan(designs[0].courseDesign.maxHeight * 5);
    expect(designs[5].courseDesign.minWidth).toBeLessThan(designs[0].courseDesign.minWidth);
    expect(designs[3].courseDesign.windZones).toBeGreaterThan(0);
    expect(designs[2].movingPlatforms.length).toBeGreaterThanOrEqual(2);
  });

  test("provides responsive assisted steering, a speed cap, and strong braking", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.startCourse(0));
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.setInput(0, -1, false));
    const rolling = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1.25));
    expect(rolling.marble.z).toBeLessThan(6);
    expect(rolling.marble.speed).toBeGreaterThan(2);
    expect(rolling.marble.speed).toBeLessThanOrEqual(10.61);
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.setInput(0, 0, true));
    const braking = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.7));
    expect(braking.marble.speed).toBeLessThan(rolling.marble.speed * .35);
  });

  test("keeps the marble grounded and carries it with moving platforms", async ({ page }) => {
    await openGame(page);
    const started = await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.startCourse(2));
    const bridge = started.movingPlatforms.find(platform => platform.id === "moving-bridge");
    expect(bridge).toBeTruthy();
    await page.evaluate(platform => window.__MARBLE_MADNESS_TEST__.setMarble({ position: { x: platform!.x, y: platform!.y + 1.29, z: platform!.z }, velocity: { x: 0, y: 0, z: 0 } }), bridge);
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.05));
    const before = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.snapshot());
    const after = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.6));
    expect(before.groundedPlatform).toBe("moving-bridge");
    expect(after.groundedPlatform).toBe("moving-bridge");
    expect(Math.abs(after.marble.x - before.marble.x)).toBeGreaterThan(.3);
    expect(after.marble.y).toBeGreaterThan(1.4);
  });

  test("respawns quickly at the last checkpoint without losing Sun Seeds", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.startCourse(1));
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.collectSeed(0));
    const checkpoint = await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.reachCheckpoint(1));
    expect(checkpoint.checkpointIndex).toBe(1);
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.triggerFall());
    const recovered = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.75));
    expect(recovered.state).toBe("playing");
    expect(recovered.checkpointIndex).toBe(1);
    expect(recovered.seedsCollected).toBeGreaterThanOrEqual(1);
    expect(recovered.totalFalls).toBe(1);
  });

  test("grows assistance after two falls and offers a Garden Lift after three", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.startCourse(3));
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.triggerFall());
      await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.75));
    }
    let result = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.snapshot());
    expect(result.assistActive).toBe(true);
    expect(result.courseDesign.assistedRailPlatforms).toBeGreaterThan(0);
    expect(result.liftAvailable).toBe(false);
    await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.triggerFall());
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.75));
    result = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.snapshot());
    expect(result.liftAvailable).toBe(true);
    const lifted = await page.evaluate(() => window.__MARBLE_MADNESS_TEST__.gardenLift());
    expect(lifted.checkpointIndex).toBe(1);
    expect(lifted.liftAvailable).toBe(false);
  });

  test("unlocks all six short courses through guaranteed completion", async ({ page }) => {
    await openGame(page);
    let result: MarbleSnapshot | undefined;
    for (let course = 0; course < 6; course++) {
      result = await page.evaluate(index => {
        window.__MARBLE_MADNESS_TEST__.startCourse(index);
        window.__MARBLE_MADNESS_TEST__.collectSeed(0);
        return window.__MARBLE_MADNESS_TEST__.completeCourse();
      }, course);
      expect(result.courseIndex).toBe(course);
      expect(result.state).toBe("courseComplete");
      expect(result.unlockedCourses).toBe(Math.min(6, course + 2));
    }
    expect(result?.petals).toBe(6);
    expect(result?.celebration).toBe("garden-complete");
  });

  test("replays deterministically from an explicit seed", async ({ page }) => {
    await openGame(page);
    const run = async () => page.evaluate(() => {
      window.__THREE_GAME_TEST_HOOKS__.seed(12345);
      window.__MARBLE_MADNESS_TEST__.startCourse(0);
      window.__MARBLE_MADNESS_TEST__.setInput(.25, -1, false);
      return window.__THREE_GAME_TEST_HOOKS__.advance(.8);
    });
    const first = await run(), second = await run();
    expect(second.marble).toEqual(first.marble);
    expect(second.checkpointIndex).toBe(first.checkpointIndex);
  });
});
