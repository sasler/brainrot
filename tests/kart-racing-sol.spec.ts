import { expect, test, type Page } from "@playwright/test";

type KartSnapshot = {
  mode: string;
  seed: number;
  opponentCount: number;
  racerCount: number;
  raceTime: number;
  laps: number;
  finishOrder: number[];
  player: {
    x: number;
    y: number;
    z: number;
    speed: number;
    heading: number;
    lap: number;
    rank: number;
    progressIndex: number;
    checkpointCount: number;
    item: "boost" | "shield" | "bolt" | "jam" | null;
    shield: number;
    boost: number;
    drift: number;
    drifting: boolean;
    offroad: boolean;
    shortcut: boolean;
    finished: boolean;
  };
  racers: Array<{
    id: number;
    ai: boolean;
    lap: number;
    rank: number;
    progressIndex: number;
    item: string | null;
    finished: boolean;
  }>;
  environment: {
    trackMinY: number;
    trackMaxY: number;
    maxGrade: number;
    terrainSupport: string;
    windmillHill: string;
    skyTreatment: string;
    lightingTreatment: string;
    playerMarker: string;
    minimumTreeTrackClearance: number;
    minimumTreeShortcutClearance: number;
    minimumFlowerTrackClearance: number;
    minimumFlowerShortcutClearance: number;
    minimumFruitTrackClearance: number;
    minimumFruitShortcutClearance: number;
    minimumLandmarkTrackClearance: number;
    minimumLandmarkShortcutClearance: number;
    minimumBridgeRailTrackClearance: number;
  };
  objects: {
    itemBoxes: number;
    projectiles: number;
    puddles: number;
    particles: number;
    audioLayers: number;
  };
};

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__: {
      seed(seed: number): void;
      setState(state: "title" | "active-play" | "fail" | "win" | "stress"): void;
      advance(seconds: number): KartSnapshot;
      snapshot(): KartSnapshot;
    };
    __THREE_GAME_DIAGNOSTICS__: {
      snapshot(): {
        renderer: { calls: number; triangles: number; geometries: number; textures: number };
        scene: { meshes: number; materials: number; instancedMeshes: number };
        settings: { dpr: number; shadows: boolean; postPasses: number };
      };
    };
    __SUNBEAM_TEST__: {
      start(count?: number): KartSnapshot;
      setOpponents(count: number): KartSnapshot;
      giveItem(item: "boost" | "shield" | "bolt" | "jam"): KartSnapshot;
      useItem(): KartSnapshot;
      setPlayerProgress(index: number, side?: number): KartSnapshot;
      setCheckpoints(values: boolean[]): KartSnapshot;
      completeLap(valid?: boolean): KartSnapshot;
      setOffroad(distance?: number): KartSnapshot;
      setShortcut(index?: number): KartSnapshot;
      finishPlayer(): KartSnapshot;
      resetPlayer(): KartSnapshot;
      snapshot(): KartSnapshot;
    };
  }
}

async function openGame(page: Page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto("/games/kart-racing/gpt-5-6-sol/index.html?test=1");
  await expect(page.locator("#startButton")).toBeVisible();
  await expect(page.locator("#startButton")).toBeEnabled();
  await expect.poll(() => page.evaluate(() => Boolean(window.__THREE_GAME_TEST_HOOKS__))).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.__SUNBEAM_TEST__))).toBe(true);
}

test.describe("GPT 5.6 Sol Sunbeam Kart Rally", () => {
  test("loads the pinned Three.js game without external requests or runtime errors", async ({ page }) => {
    const externalRequests: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      const loopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
      if (url.protocol.startsWith("http") && !loopback) externalRequests.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await openGame(page);
    await expect(page.locator("#game")).toBeVisible();
    await expect(page.locator("#titleScreen")).toContainText("SUNBEAM");
    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);

    const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.snapshot());
    expect(diagnostics.settings.dpr).toBeLessThanOrEqual(1.5);
    expect(diagnostics.settings.shadows).toBe(true);
    expect(diagnostics.settings.postPasses).toBe(0);
    expect(diagnostics.scene.instancedMeshes).toBeGreaterThanOrEqual(4);
  });

  test("keeps deterministic controls private during normal play", async ({ page }) => {
    await page.goto("/games/kart-racing/gpt-5-6-sol/index.html");
    await expect(page.locator("#startButton")).toBeVisible();
    expect(await page.evaluate(() => "__THREE_GAME_TEST_HOOKS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__SUNBEAM_TEST__" in window)).toBe(false);
  });

  test("starts even when Web Audio is unavailable after showing a real loading state", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
      Object.defineProperty(window as Window & { webkitAudioContext?: unknown }, "webkitAudioContext", { value: undefined, configurable: true });
    });
    await page.goto("/games/kart-racing/gpt-5-6-sol/index.html");
    const start = page.locator("#startButton");
    await expect(start).toBeEnabled();
    await expect(start).toHaveText("Start the Rally");
    await start.click();
    await expect(page.locator("#titleScreen")).toBeHidden();
    await expect(page.locator("#hud")).toBeVisible();
  });

  test("supports one through five opponents and defaults to a six-kart grid", async ({ page }) => {
    await openGame(page);
    for (let opponents = 1; opponents <= 5; opponents++) {
      const snapshot = await page.evaluate((count) => window.__SUNBEAM_TEST__.setOpponents(count), opponents);
      expect(snapshot.opponentCount).toBe(opponents);
      expect(snapshot.racerCount).toBe(opponents + 1);
      expect(snapshot.racers.filter((racer) => racer.ai)).toHaveLength(opponents);
    }
    const defaultGrid = await page.evaluate(() => window.__SUNBEAM_TEST__.setOpponents(5));
    expect(defaultGrid.racerCount).toBe(6);
  });

  test("accelerates, steers, charges a drift, and releases a mini turbo", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    const initial = await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot());

    await page.keyboard.down("w");
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.8));
    await page.keyboard.down("d");
    await page.keyboard.down(" ");
    const drifting = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.65));
    expect(drifting.player.speed).toBeGreaterThan(6);
    expect(drifting.player.heading).not.toBeCloseTo(initial.player.heading, 2);
    expect(drifting.player.drifting).toBe(true);
    expect(drifting.player.drift).toBeGreaterThan(0.35);

    await page.keyboard.up(" ");
    const boosted = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.15));
    await page.keyboard.up("d");
    await page.keyboard.up("w");
    expect(boosted.player.drifting).toBe(false);
    expect(boosted.player.drift).toBe(0);
    expect(boosted.player.boost).toBeGreaterThan(0);
  });

  test("maps left and right input to the matching chase-camera direction", async ({ page }) => {
    await openGame(page);
    const initial = await page.evaluate(() => window.__SUNBEAM_TEST__.start(1));

    await page.keyboard.down("w");
    await page.keyboard.down("d");
    const right = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.7));
    await page.keyboard.up("d");
    await page.keyboard.up("w");

    await page.evaluate(() => window.__SUNBEAM_TEST__.start(1));
    await page.keyboard.down("w");
    await page.keyboard.down("a");
    const left = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.7));
    await page.keyboard.up("a");
    await page.keyboard.up("w");

    expect(right.player.heading).toBeLessThan(initial.player.heading);
    expect(left.player.heading).toBeGreaterThan(initial.player.heading);
    expect(right.player.x).toBeGreaterThan(left.player.x);
  });

  test("completes a checkpoint-valid keyboard-controlled lap with five opponents", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const testControls = window.__SUNBEAM_TEST__;
      const hooks = window.__THREE_GAME_TEST_HOOKS__;
      testControls.start(1);
      const centerline: Array<{ x: number; z: number }> = [];
      for (let index = 0; index < 300; index++) {
        const player = testControls.setPlayerProgress(index).player;
        centerline.push({ x: player.x, z: player.z });
      }

      testControls.start(5);
      const key = (type: "keydown" | "keyup", code: string) => {
        dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
      };
      let heldSteer = "";
      let drifting = false;
      const setSteer = (next: string) => {
        if (heldSteer === next) return;
        if (heldSteer) key("keyup", heldSteer);
        heldSteer = next;
        if (heldSteer) key("keydown", heldSteer);
      };

      key("keydown", "KeyW");
      let snapshot = hooks.snapshot();
      for (let step = 0; step < 3600 && snapshot.player.lap < 2; step++) {
        const player = snapshot.player;
        const target = centerline[(player.progressIndex + 12) % centerline.length];
        const desired = Math.atan2(target.x - player.x, target.z - player.z);
        const delta = Math.atan2(Math.sin(desired - player.heading), Math.cos(desired - player.heading));
        setSteer(delta > 0.025 ? "KeyA" : delta < -0.025 ? "KeyD" : "");
        const wantsDrift = Math.abs(delta) > 0.16 && player.speed > 8 && !player.offroad;
        if (wantsDrift !== drifting) {
          key(wantsDrift ? "keydown" : "keyup", "Space");
          drifting = wantsDrift;
        }
        snapshot = hooks.advance(0.05);
      }
      setSteer("");
      key("keyup", "KeyW");
      if (drifting) key("keyup", "Space");
      return snapshot;
    });

    expect(result.racerCount).toBe(6);
    expect(result.player.lap).toBe(2);
    expect(result.player.offroad).toBe(false);
    expect(result.raceTime).toBeLessThan(35);
  });

  test("slows off-road and safely resets the player to the racing line", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(3));
    await page.keyboard.down("w");
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1));
    const before = await page.evaluate(() => window.__SUNBEAM_TEST__.setOffroad());
    const offroad = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.7));
    await page.keyboard.up("w");
    expect(offroad.player.offroad).toBe(true);
    expect(offroad.player.speed).toBeLessThan(before.player.speed + 5);

    const reset = await page.evaluate(() => window.__SUNBEAM_TEST__.resetPlayer());
    expect(reset.player.speed).toBe(0);
    expect(reset.player.offroad).toBe(true);
    const settled = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.02));
    expect(settled.player.offroad).toBe(false);
  });

  test("recognizes the authored dirt shortcut without treating it as open grass", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(3));
    await page.evaluate(() => window.__SUNBEAM_TEST__.setShortcut());
    const shortcut = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.03));
    expect(shortcut.player.shortcut).toBe(true);
    expect(shortcut.player.offroad).toBe(false);
    expect(shortcut.player.progressIndex).toBeGreaterThan(158);
    expect(shortcut.player.progressIndex).toBeLessThan(195);
  });

  test("keeps Windmill Hill grounded with a gentle supported road profile", async ({ page }) => {
    await openGame(page);
    const snapshot = await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    expect(snapshot.environment.trackMaxY).toBeLessThanOrEqual(3.1);
    expect(snapshot.environment.maxGrade).toBeLessThan(0.16);
    expect(snapshot.environment.terrainSupport).toBe("graded-corridor");
    expect(snapshot.environment.windmillHill).toBe("radial-mound");
    expect(snapshot.environment.skyTreatment).toBe("gradient-dome-clouds");
    expect(snapshot.environment.lightingTreatment).toBe("warm-sun-cool-fill");
    expect(snapshot.environment.playerMarker).toBe("sun-chevron-checkered-flag");
    expect(snapshot.environment.minimumTreeTrackClearance).toBeGreaterThanOrEqual(11.75);
    expect(snapshot.environment.minimumTreeShortcutClearance).toBeGreaterThanOrEqual(6.55);
    expect(snapshot.environment.minimumFlowerTrackClearance).toBeGreaterThanOrEqual(9.4);
    expect(snapshot.environment.minimumFlowerShortcutClearance).toBeGreaterThanOrEqual(4.3);
    expect(snapshot.environment.minimumFruitTrackClearance).toBeGreaterThanOrEqual(9.7);
    expect(snapshot.environment.minimumFruitShortcutClearance).toBeGreaterThanOrEqual(4.6);
    expect(snapshot.environment.minimumLandmarkTrackClearance).toBeGreaterThanOrEqual(14.7);
    expect(snapshot.environment.minimumLandmarkShortcutClearance).toBeGreaterThanOrEqual(10.3);
    expect(snapshot.environment.minimumBridgeRailTrackClearance).toBeGreaterThanOrEqual(9.55);
  });

  test("activates all four original items with distinct race effects", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));

    await page.evaluate(() => {
      window.__SUNBEAM_TEST__.giveItem("boost");
      return window.__SUNBEAM_TEST__.useItem();
    });
    expect((await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot())).player.boost).toBeGreaterThan(1);

    await page.evaluate(() => {
      window.__SUNBEAM_TEST__.giveItem("shield");
      return window.__SUNBEAM_TEST__.useItem();
    });
    expect((await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot())).player.shield).toBeGreaterThan(6);

    const bolt = await page.evaluate(() => {
      window.__SUNBEAM_TEST__.giveItem("bolt");
      return window.__SUNBEAM_TEST__.useItem();
    });
    expect(bolt.objects.projectiles).toBe(1);

    const jam = await page.evaluate(() => {
      window.__SUNBEAM_TEST__.giveItem("jam");
      return window.__SUNBEAM_TEST__.useItem();
    });
    expect(jam.objects.puddles).toBe(1);
  });

  test("collects a real track crate and uses it from the clickable HUD slot", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__SUNBEAM_TEST__.start(1);
      window.__SUNBEAM_TEST__.setPlayerProgress(36, 0);
      return window.__THREE_GAME_TEST_HOOKS__.advance(0.03);
    });
    const held = await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot());
    expect(held.player.item).not.toBeNull();
    await expect(page.locator("#item")).toBeEnabled();
    await expect(page.locator("#item")).toHaveClass(/ready/);
    await page.locator("#item").click();
    const used = await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot());
    expect(used.player.item).toBeNull();
    expect(used.player.boost + used.player.shield + used.objects.projectiles + used.objects.puddles).toBeGreaterThan(0);
    expect(used.objects.audioLayers).toBe(3);
  });

  test("requires all checkpoints before awarding a lap", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(2));

    const rejected = await page.evaluate(() => window.__SUNBEAM_TEST__.completeLap(false));
    expect(rejected.player.lap).toBe(1);
    expect(rejected.player.checkpointCount).toBe(2);

    const accepted = await page.evaluate(() => window.__SUNBEAM_TEST__.completeLap(true));
    expect(accepted.player.lap).toBe(2);
    expect(accepted.player.checkpointCount).toBe(0);
  });

  test("produces repeatable seeded active-play snapshots", async ({ page }) => {
    await openGame(page);
    const first = await page.evaluate(() => {
      window.__THREE_GAME_TEST_HOOKS__.seed(12345);
      window.__THREE_GAME_TEST_HOOKS__.setState("active-play");
      return window.__THREE_GAME_TEST_HOOKS__.snapshot();
    });
    const second = await page.evaluate(() => {
      window.__THREE_GAME_TEST_HOOKS__.seed(12345);
      window.__THREE_GAME_TEST_HOOKS__.setState("active-play");
      return window.__THREE_GAME_TEST_HOOKS__.snapshot();
    });
    expect(second.racers).toEqual(first.racers);
    expect(second.player).toEqual(first.player);
    expect(second.racerCount).toBe(6);
  });

  test("pauses, resumes, and renders final standings after a finish", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    await page.keyboard.press("Escape");
    await expect(page.locator("#pauseScreen")).toBeVisible();
    expect((await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot())).mode).toBe("paused");
    await page.keyboard.press("p");
    await expect(page.locator("#pauseScreen")).toBeHidden();

    const result = await page.evaluate(() => window.__SUNBEAM_TEST__.finishPlayer());
    expect(result.player.finished).toBe(true);
    expect(result.mode).toBe("result");
    await expect(page.locator("#resultScreen")).toBeVisible();
    await expect(page.locator("#standings .standing")).toHaveCount(6);
  });

  test("keeps the desktop playfield and lean HUD inside 1280x720", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    for (const selector of ["#game", "#raceInfo", "#item", "#minimapShell", "#drift", "#utility"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(1281);
      expect(box!.y + box!.height).toBeLessThanOrEqual(721);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(721);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
