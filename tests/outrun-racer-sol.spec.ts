import { expect, test, type Page } from "@playwright/test";

type RacerSnapshot = {
  mode: string;
  assetsReady: boolean;
  raceTime: number;
  perfectGates: number;
  collisions: number;
  recoveries: number;
  track: { gates: number; laps: number; sectors: string[]; style: string };
  player: {
    x: number; z: number; heading: number; speed: number; lap: number; nextGate: number;
    rank: number; boost: number; drift: number; drifting: boolean; finished: boolean;
  };
  racers: Array<{ id: number; ai: boolean; rank: number; speed: number; finished: boolean }>;
  objects: { assetRoots: string[]; gates: number; obstacles: number; particles: number; audioLayers: number };
};

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__: {
      seed(seed: number): RacerSnapshot;
      setState(state: "title" | "active-play" | "fail" | "win" | "stress"): RacerSnapshot;
      advance(seconds: number): RacerSnapshot;
      snapshot(): RacerSnapshot;
    };
    __THREE_GAME_DIAGNOSTICS__: {
      snapshot(): {
        renderer: { calls: number; triangles: number; geometries: number; textures: number };
        scene: { meshes: number; materials: number; instancedMeshes: number };
        settings: { dpr: number; shadows: boolean; postPasses: number };
      };
    };
    __NEON_HORIZON_TEST__: {
      start(): RacerSnapshot;
      setPlayer(value?: { gate?: number; lap?: number; speed?: number; boost?: number; offset?: number }): RacerSnapshot;
      passGate(perfect?: boolean): RacerSnapshot;
      setCollision(kind?: "reef" | "rival"): RacerSnapshot;
      finish(): RacerSnapshot;
      recover(): RacerSnapshot;
      snapshot(): RacerSnapshot;
    };
  }
}

async function openGame(page: Page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/games/outrun-racer/gpt-5-6-sol/index.html?test=1");
  await expect(page.locator("#startButton")).toBeEnabled({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => Boolean(window.__THREE_GAME_TEST_HOOKS__))).toBe(true);
}

test.describe("GPT 5.6 Sol Neon Horizon Racer", () => {
  test("loads the pinned runtime and Blender-authored assets without external requests", async ({ page }) => {
    const external: string[] = [], errors: string[] = [], assets: string[] = [];
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) external.push(request.url());
      if (url.pathname.includes("/assets/")) assets.push(url.pathname);
    });
    page.on("pageerror", error => errors.push(error.message));
    await openGame(page);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    expect(assets).toEqual(expect.arrayContaining([
      "/games/outrun-racer/gpt-5-6-sol/assets/horizon-fleet.glb",
      "/games/outrun-racer/gpt-5-6-sol/assets/horizon-course-kit.glb",
    ]));
    const snapshot = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.snapshot());
    expect(snapshot.assetsReady).toBe(true);
    expect(snapshot.objects.assetRoots).toEqual(expect.arrayContaining([
      "PlayerManta", "RivalNeedle", "RivalHammer", "GateAssembly", "FinishCrown", "CourseBuoy", "Monolith_A", "SolarTurbine",
    ]));
  });

  test("keeps deterministic mutation controls private in normal play", async ({ page }) => {
    await page.goto("/games/outrun-racer/gpt-5-6-sol/index.html");
    await expect(page.locator("#startButton")).toBeEnabled({ timeout: 20_000 });
    expect(await page.evaluate(() => "__THREE_GAME_TEST_HOOKS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__NEON_HORIZON_TEST__" in window)).toBe(false);
  });

  test("builds a six-racer, three-lap open-water championship", async ({ page }) => {
    await openGame(page);
    const snapshot = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("active-play"));
    expect(snapshot.mode).toBe("race");
    expect(snapshot.track).toEqual({
      gates: 12,
      laps: 3,
      sectors: ["Pearl Causeway", "Prism Reef", "Eclipse Array"],
      style: "open-water-checkpoint-circuit",
    });
    expect(snapshot.racers).toHaveLength(6);
    expect(snapshot.racers.filter(racer => racer.ai)).toHaveLength(5);
    expect(snapshot.objects.gates).toBe(12);
    expect(snapshot.objects.obstacles).toBeGreaterThanOrEqual(6);
  });

  test("accelerates, steers in both directions, and releases a charged drift", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__NEON_HORIZON_TEST__.start());
    await page.keyboard.down("w");
    let snapshot = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1.2));
    await page.keyboard.up("w");
    expect(snapshot.player.speed).toBeGreaterThan(14);

    await page.evaluate(() => window.__NEON_HORIZON_TEST__.setPlayer({ gate: 2, speed: 25, boost: 30 }));
    const initial = await page.evaluate(() => window.__NEON_HORIZON_TEST__.snapshot());
    await page.keyboard.down("d"); await page.keyboard.down(" ");
    snapshot = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.72));
    expect(snapshot.player.heading).toBeLessThan(initial.player.heading);
    expect(snapshot.player.drifting).toBe(true);
    expect(snapshot.player.drift).toBeGreaterThan(.3);
    await page.keyboard.up(" ");
    const released = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.08));
    await page.keyboard.up("d");
    expect(released.player.drifting).toBe(false);
    expect(released.player.drift).toBe(0);
    expect(released.player.boost).toBeGreaterThan(30);

    await page.evaluate(() => window.__NEON_HORIZON_TEST__.setPlayer({ gate: 2, speed: 25 }));
    const reset = await page.evaluate(() => window.__NEON_HORIZON_TEST__.snapshot());
    await page.keyboard.down("a");
    const left = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.4));
    await page.keyboard.up("a");
    expect(left.player.heading).toBeGreaterThan(reset.player.heading);
  });

  test("rewards centered gates and preserves checkpoint order", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__NEON_HORIZON_TEST__.start());
    const before = await page.evaluate(() => window.__NEON_HORIZON_TEST__.setPlayer({ gate: 1, speed: 20, boost: 20 }));
    const perfect = await page.evaluate(() => window.__NEON_HORIZON_TEST__.passGate(true));
    expect(perfect.player.nextGate).toBe(2);
    expect(perfect.player.boost).toBeGreaterThan(before.player.boost);
    expect(perfect.perfectGates).toBe(1);
    const next = await page.evaluate(() => window.__NEON_HORIZON_TEST__.passGate(false));
    expect(next.player.nextGate).toBe(3);
  });

  test("makes reef and rival contact recoverable instead of ending the race", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => { window.__NEON_HORIZON_TEST__.start(); window.__NEON_HORIZON_TEST__.setPlayer({ speed: 28 }); });
    const reef = await page.evaluate(() => window.__NEON_HORIZON_TEST__.setCollision("reef"));
    expect(reef.mode).toBe("race");
    expect(reef.collisions).toBe(1);
    expect(reef.player.speed).toBeLessThan(15);
    const recovered = await page.evaluate(() => window.__NEON_HORIZON_TEST__.recover());
    expect(recovered.recoveries).toBe(1);
    expect(recovered.player.speed).toBe(12);
  });

  test("finishes after the third checkpoint-valid lap", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__NEON_HORIZON_TEST__.start());
    const finished = await page.evaluate(() => window.__NEON_HORIZON_TEST__.finish());
    expect(finished.mode).toBe("finished");
    expect(finished.player.finished).toBe(true);
    await expect(page.locator("#finishScreen")).toBeVisible();
    await expect(page.locator("#resultPlace")).toContainText("/ 6");
  });

  test("clears held driving inputs when focus is lost", async ({ page }) => {
    await openGame(page);
    const before = await page.evaluate(() => window.__NEON_HORIZON_TEST__.start());
    await page.evaluate(() => {
      dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
      dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
      dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
      dispatchEvent(new Event("blur"));
    });
    const after = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.5));
    expect(after.player.speed).toBeLessThan(before.player.speed);
    expect(after.player.speed).toBeGreaterThan(0);
    expect(after.player.heading).toBeCloseTo(before.player.heading, 4);
    expect(after.player.drifting).toBe(false);
  });

  test("starts cleanly when Web Audio is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
      Object.defineProperty(window, "webkitAudioContext", { value: undefined, configurable: true });
    });
    await page.goto("/games/outrun-racer/gpt-5-6-sol/index.html");
    await expect(page.locator("#startButton")).toBeEnabled({ timeout: 20_000 });
    await page.locator("#startButton").click();
    await expect(page.locator("#titleScreen")).toBeHidden();
    await expect(page.locator("#hud")).toHaveClass(/visible/);
  });

  test("reports deliberate renderer settings and live scene metrics", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("active-play"));
    const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.snapshot());
    expect(diagnostics.settings.shadows).toBe(true);
    expect(diagnostics.settings.postPasses).toBe(1);
    expect(diagnostics.settings.dpr).toBeLessThanOrEqual(1.5);
    expect(diagnostics.scene.meshes).toBeGreaterThan(100);
    expect(diagnostics.renderer.triangles).toBeGreaterThan(1_000);
  });
});
