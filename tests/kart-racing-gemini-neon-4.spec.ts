import { expect, test, type Page } from "@playwright/test";

type Item = "boost" | "dart";

type NeonKartSnapshot = {
  mode: string;
  seed: number;
  opponentCount: number;
  racerCount: number;
  raceTime: number;
  laps: number;
  assetsLoaded: number;
  track: {
    length: number;
    samples: number;
    sectors: number;
    turns: { left: number; right: number };
    elevationRange: number;
    maxCurvature: number;
    minCornerRadius: number;
  };
  camera: { fov: number };
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
    item: Item | null;
    boost: number;
    boostKind: string | null;
    drift: number;
    driftTier: number;
    drifting: boolean;
    shoulder: boolean;
    offroad: boolean;
    finished: boolean;
    stun: number;
    recovery: number;
    sideDistance: number;
    wheelClearance: number;
  };
  racers: Array<{
    id: number;
    ai: boolean;
    lap: number;
    rank: number;
    progressIndex: number;
    item: Item | null;
    finished: boolean;
    speed: number;
    sideDistance: number;
    shoulder: boolean;
    offroad: boolean;
  }>;
  environment: {
    artDirection: string;
    landmarks: string[];
    terrainBlend: { blendWidth: number; maxRoadGap: number };
    treeRoadClearance: number;
    grandstandFacing: number;
    groundingMaxClearance: number;
  };
  physics: {
    collisionCount: number;
    contactModel: string;
  };
  objects: {
    itemBoxes: number;
    itemTypes: Item[];
    boostPads: number;
    projectiles: number;
    particles: number;
    audioLayers: number;
  };
};

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__: {
      seed(seed: number): void;
      setState(state: "title" | "active-play" | "fail" | "win" | "stress"): NeonKartSnapshot;
      advance(seconds: number): NeonKartSnapshot;
      snapshot(): NeonKartSnapshot;
    };
    __THREE_GAME_DIAGNOSTICS__: {
      snapshot(): {
        renderer: { calls: number; triangles: number; geometries: number; textures: number };
        scene: { meshes: number; materials: number; instancedMeshes: number };
        settings: { dpr: number; shadows: boolean; postPasses: number };
      };
    };
    __NEON_KART_TEST__: {
      start(count?: number): NeonKartSnapshot;
      setOpponents(count: number): NeonKartSnapshot;
      setPlayerProgress(index: number, side?: number): NeonKartSnapshot;
      setPlayerSpeed(speed: number): NeonKartSnapshot;
      giveItem(item: Item): NeonKartSnapshot;
      useItem(): NeonKartSnapshot;
      hitPlayer(): NeonKartSnapshot;
      setCollision(): NeonKartSnapshot;
      completeLap(valid?: boolean): NeonKartSnapshot;
      resetPlayer(): NeonKartSnapshot;
      finishPlayer(): NeonKartSnapshot;
      trackPoints(): Array<{ x: number; z: number }>;
      trackProfile(): Array<{ index: number; y: number; grade: number; curvature: number; turn: number; bank: number; sector: number }>;
      groundingReport(): { maxClearance: number; values: Array<{ label: string; clearance: number }> };
      snapshot(): NeonKartSnapshot;
    };
  }
}

const GAME = "/games/kart-racing/gemini-neon-4/index.html";

async function openGame(page: Page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto(`${GAME}?test=1`);
  await expect(page.locator("#startButton")).toBeEnabled();
  await expect.poll(() => page.evaluate(() => Boolean(window.__THREE_GAME_TEST_HOOKS__))).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.__NEON_KART_TEST__))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__NEON_KART_TEST__.snapshot().assetsLoaded)).toBe(6);
}

test.describe("Google Gemini Neon 4 Sunbeam Kart Rally", {
  tag: ["@spec:kart-racing-gemini-neon-4", "@game:kart-racing/gemini-neon-4"],
}, () => {
  test("loads pinned local Three.js runtime and all six Blender GLB assets without external requests or errors", async ({ page }) => {
    const external: string[] = [];
    const runtime: string[] = [];
    const assets: string[] = [];
    const errors: string[] = [];

    page.on("request", (req) => {
      const url = new URL(req.url());
      if (url.protocol.startsWith("http") && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
        external.push(req.url());
      }
      if (url.pathname.startsWith("/vendor/three/")) runtime.push(url.pathname);
      if (url.pathname.startsWith("/games/kart-racing/gemini-neon-4/assets/")) assets.push(url.pathname);
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await openGame(page);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    expect(runtime).toContain("/vendor/three/0.185.1/three.module.min.js");
    expect(runtime).toContain("/vendor/three/0.185.1/addons/loaders/GLTFLoader.js");
    expect(assets).toEqual(
      expect.arrayContaining([
        "/games/kart-racing/gemini-neon-4/assets/kart.glb",
        "/games/kart-racing/gemini-neon-4/assets/windmill.glb",
        "/games/kart-racing/gemini-neon-4/assets/festival_arch.glb",
        "/games/kart-racing/gemini-neon-4/assets/cottage.glb",
        "/games/kart-racing/gemini-neon-4/assets/grandstand.glb",
        "/games/kart-racing/gemini-neon-4/assets/props_pack.glb",
      ]),
    );

    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("active-play"));
    const diag = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.snapshot());
    expect(diag.settings.shadows).toBe(true);
    expect(diag.settings.postPasses).toBe(2);
    expect(diag.settings.dpr).toBeGreaterThan(0);
    expect(diag.settings.dpr).toBeLessThanOrEqual(1.5);
    expect(diag.scene.instancedMeshes).toBeGreaterThanOrEqual(10);
    expect(diag.renderer.calls).toBeGreaterThan(10);
    expect(diag.renderer.triangles).toBeGreaterThan(5000);
  });

  test("keeps deterministic test hooks private in normal play", async ({ page }) => {
    await page.goto(GAME);
    await expect(page.locator("#startButton")).toBeEnabled();
    expect(await page.evaluate(() => "__THREE_GAME_TEST_HOOKS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__THREE_GAME_DIAGNOSTICS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__NEON_KART_TEST__" in window)).toBe(false);
  });

  test("starts cleanly when Web Audio is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
      Object.defineProperty(window as Window & { webkitAudioContext?: unknown }, "webkitAudioContext", {
        value: undefined,
        configurable: true,
      });
    });
    await page.goto(GAME);
    await page.locator("#startButton").click();
    await expect(page.locator("#titleScreen")).toBeHidden();
    await expect(page.locator("#hud")).toBeVisible();
    await expect(page.locator("#countdown")).toBeVisible();
  });

  test("fields one through five rivals and builds a six-sector banked circuit", async ({ page }) => {
    await openGame(page);
    for (let count = 1; count <= 5; count++) {
      const snap = await page.evaluate((n) => window.__NEON_KART_TEST__.setOpponents(n), count);
      expect(snap.racerCount).toBe(count + 1);
      expect(snap.racers.filter((r) => r.ai)).toHaveLength(count);
    }

    const snap = await page.evaluate(() => window.__NEON_KART_TEST__.start(5));
    expect(snap.laps).toBe(3);
    expect(snap.track.samples).toBe(720);
    expect(snap.track.sectors).toBe(6);
    expect(snap.track.length).toBeGreaterThanOrEqual(1250);
    expect(snap.track.length).toBeLessThanOrEqual(1500);
    expect(snap.track.elevationRange).toBeGreaterThan(30);
    expect(snap.track.turns.left).toBeGreaterThan(100);
    expect(snap.track.turns.right).toBeGreaterThan(100);
    expect(snap.environment.grandstandFacing).toBeGreaterThan(0.95);
    expect(snap.environment.treeRoadClearance).toBeGreaterThanOrEqual(6);
    expect(snap.environment.groundingMaxClearance).toBeLessThanOrEqual(0.05);

    // Banking raises outside edge on both left and right corners
    const banking = await page.evaluate(() => {
      const api = window.__NEON_KART_TEST__;
      const prof = api.trackProfile();
      const leftCorner = [...prof].sort((a, b) => b.turn - a.turn)[0];
      const rightCorner = [...prof].sort((a, b) => a.turn - b.turn)[0];
      const yAt = (idx: number, side: number) => api.setPlayerProgress(idx, side).player.y;
      return {
        leftOuterRise: yAt(leftCorner.index, -5) - yAt(leftCorner.index, 5),
        rightOuterRise: yAt(rightCorner.index, 5) - yAt(rightCorner.index, -5),
      };
    });
    expect(banking.leftOuterRise).toBeGreaterThan(0.4);
    expect(banking.rightOuterRise).toBeGreaterThan(0.4);
  });

  test("maps steering to the visible chase-camera left and right directions", async ({ page }) => {
    await openGame(page);
    const drive = async (key: string) => {
      await page.evaluate(() => {
        window.__NEON_KART_TEST__.start(1);
        window.__NEON_KART_TEST__.setPlayerProgress(10, 0);
        window.__NEON_KART_TEST__.setPlayerSpeed(18);
      });
      await page.keyboard.down("w");
      await page.keyboard.down(key);
      const res = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.9));
      await page.keyboard.up(key);
      await page.keyboard.up("w");
      return res;
    };

    const right = await drive("d");
    const left = await drive("a");
    // +sideDistance is track-left; pressing D must carry kart to negative sideDistance
    expect(right.player.sideDistance).toBeLessThan(-3);
    expect(left.player.sideDistance).toBeGreaterThan(3);
  });

  test("charges a 3-tier drift and unleashes mini-turbo on release, canceling on off-road", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__NEON_KART_TEST__.start(1);
      window.__NEON_KART_TEST__.setPlayerProgress(245, 3.0);
      window.__NEON_KART_TEST__.setPlayerSpeed(24);
    });
    await page.keyboard.down("w");
    await page.keyboard.down("d");
    await page.keyboard.down(" ");
    const sliding = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.58));
    expect(sliding.player.drifting).toBe(true);
    expect(sliding.player.driftTier).toBeGreaterThanOrEqual(1);
    await page.keyboard.up(" ");
    const released = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.08));
    await page.keyboard.up("d");
    await page.keyboard.up("w");
    expect(released.player.drifting).toBe(false);
    expect(released.player.boost).toBeGreaterThan(0.5);
    expect(released.camera.fov).toBeGreaterThan(64);

    // Continuing full-lock into off-road grass forfeits an active drift without turbo
    await page.evaluate(() => {
      window.__NEON_KART_TEST__.start(1);
      window.__NEON_KART_TEST__.setPlayerProgress(16, -2.0);
      window.__NEON_KART_TEST__.setPlayerSpeed(24);
    });
    await page.keyboard.down("w");
    await page.keyboard.down("d");
    await page.keyboard.down(" ");
    const offroadCancel = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1.1));
    await page.keyboard.up(" ");
    await page.keyboard.up("d");
    await page.keyboard.up("w");
    expect(offroadCancel.player.offroad).toBe(true);
    expect(offroadCancel.player.drifting).toBe(false);
    expect(offroadCancel.player.boost).toBe(0);
  });

  test("differentiates shoulder vs off-road drag, resolves OBB collisions, and recovers cleanly", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__NEON_KART_TEST__.start(5);
      window.__NEON_KART_TEST__.setPlayerProgress(18, 9.0);
      window.__NEON_KART_TEST__.setPlayerSpeed(24);
    });
    await page.keyboard.down("w");
    const shoulder = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.7));
    await page.keyboard.up("w");
    expect(shoulder.player.shoulder).toBe(true);
    expect(shoulder.player.offroad).toBe(false);

    await page.evaluate(() => {
      window.__NEON_KART_TEST__.setPlayerProgress(18, 13.5);
      window.__NEON_KART_TEST__.setPlayerSpeed(24);
    });
    await page.keyboard.down("w");
    const grass = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.8));
    await page.keyboard.up("w");
    expect(grass.player.offroad).toBe(true);
    expect(grass.player.speed).toBeLessThan(shoulder.player.speed);

    const recovered = await page.evaluate(() => window.__NEON_KART_TEST__.resetPlayer());
    expect(recovered.player.offroad).toBe(false);
    expect(recovered.player.recovery).toBeGreaterThan(0);

    const hit = await page.evaluate(() => window.__NEON_KART_TEST__.setCollision());
    expect(hit.physics.contactModel).toBe("obb-sat-impulse");
    expect(hit.physics.collisionCount).toBeGreaterThan(0);
  });

  test("fires Sunburst boost and Spark Dart projectile with stun recovery", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__NEON_KART_TEST__.start(5));

    const boosted = await page.evaluate(() => {
      window.__NEON_KART_TEST__.giveItem("boost");
      return window.__NEON_KART_TEST__.useItem();
    });
    expect(boosted.player.boostKind).toBe("sunburst");
    expect(boosted.player.boost).toBeGreaterThan(1.5);
    expect(boosted.player.item).toBeNull();

    const fired = await page.evaluate(() => {
      window.__NEON_KART_TEST__.giveItem("dart");
      return window.__NEON_KART_TEST__.useItem();
    });
    expect(fired.objects.projectiles).toBe(1);
    expect(fired.player.item).toBeNull();

    const zapped = await page.evaluate(() => window.__NEON_KART_TEST__.hitPlayer());
    expect(zapped.player.stun).toBeGreaterThan(0.5);
    const healed = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.85));
    expect(healed.player.stun).toBe(0);
  });

  test("enforces ordered sector checkpoints before counting a lap and completes a full AI-contested lap", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__NEON_KART_TEST__.start(5));
    const skipped = await page.evaluate(() => window.__NEON_KART_TEST__.completeLap(false));
    expect(skipped.player.lap).toBe(1);
    await expect(page.locator("#flash")).toContainText("MISSED SECTOR");

    const accepted = await page.evaluate(() => window.__NEON_KART_TEST__.completeLap(true));
    expect(accepted.player.lap).toBe(2);
    expect(accepted.player.checkpointCount).toBe(0);

    // Deterministic seeded snapshot repeatability
    const first = await page.evaluate(() => {
      window.__THREE_GAME_TEST_HOOKS__.seed(7777);
      return window.__THREE_GAME_TEST_HOOKS__.setState("active-play");
    });
    const second = await page.evaluate(() => {
      window.__THREE_GAME_TEST_HOOKS__.seed(7777);
      return window.__THREE_GAME_TEST_HOOKS__.setState("active-play");
    });
    expect(second.player).toEqual(first.player);
    expect(second.racers).toEqual(first.racers);
  });

  test("pauses, resumes, finishes with full 6-racer standings, and keeps HUD/title inside desktop bounds", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__NEON_KART_TEST__.start(5));

    // Check lean HUD fits cleanly inside 1280x720 without scrolling
    for (const sel of ["#raceInfo", "#itemSlot", "#utility", "#minimapShell", "#dash"]) {
      const box = await page.locator(sel).boundingBox();
      expect(box, `${sel} should be visible`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(1281);
      expect(box!.y + box!.height).toBeLessThanOrEqual(721);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(721);

    // Pause / Resume
    await page.keyboard.press("Escape");
    await expect(page.locator("#pauseScreen")).toBeVisible();
    await page.keyboard.press("p");
    await expect(page.locator("#pauseScreen")).toBeHidden();

    // Finish standings
    const finished = await page.evaluate(() => window.__NEON_KART_TEST__.finishPlayer());
    expect(finished.player.finished).toBe(true);
    await expect(page.locator("#resultScreen")).toBeVisible();
    await expect(page.locator("#standings .standing")).toHaveCount(6);
    await expect(page.locator("#standings .standing.you")).toHaveCount(1);

    await page.locator("#againButton").click();
    await expect(page.locator("#resultScreen")).toBeHidden();
    await expect(page.locator("#hud")).toBeVisible();

    // Title screen fits inside real 1280x544 play-page iframe height
    await page.setViewportSize({ width: 1280, height: 544 });
    await page.goto(GAME);
    await expect(page.locator("#titleScreen .brief")).toBeVisible();
    const panel = await page.locator("#titleScreen .panel").boundingBox();
    expect(panel).not.toBeNull();
    expect(panel!.y).toBeGreaterThanOrEqual(0);
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(545);
  });
});
