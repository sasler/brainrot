import { expect, test, type Page } from "@playwright/test";

type Item = "boost" | "bolt";
type KartSnapshot = {
  mode: string;
  seed: number;
  opponentCount: number;
  racerCount: number;
  raceTime: number;
  laps: number;
  track: {
    length: number; samples: number; sectors: number; targetLapSeconds: number; passiveHazards: number;
    turns: { left: number; right: number }; elevationRange: number; maxCurvature: number;
  };
  camera: { fov: number };
  player: {
    x: number; y: number; z: number; speed: number; velocity: number; slip: number; heading: number;
    lap: number; rank: number; progressIndex: number; checkpointCount: number; item: Item | null;
    shield: number; boost: number; drift: number; drifting: boolean; shoulder: boolean; offroad: boolean; finished: boolean;
    stun: number; recovery: number; wheelClearance: number;
  };
  racers: Array<{ id: number; ai: boolean; lap: number; rank: number; progressIndex: number; item: Item | null; finished: boolean; speed: number; sideDistance: number; shoulder: boolean; offroad: boolean }>;
  environment: {
    artDirection: string; roadTreatment: string; terrainTreatment: string; terrainBlend: { maxStep: number; maxRoadGap: number; blendWidth: number }; distantBackdrop: string; landmarks: string[];
    wheelGrounding: string; sceneryGrounding: {
      maxClearance: number; maxGap: number; values: Array<{ label: string; clearance: number }>;
    }; treeRoadClearance: number; grandstandFacingAlignment: number; passiveHazards: number;
  };
  physics: { collisionCount: number; maxWheelClearance: number; contactModel: string };
  objects: { itemBoxes: number; pickupTypes: Item[]; pickupStyles: { boost: string; bolt: string }; projectiles: number; jams: number; particles: number; audioLayers: number };
};

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__: {
      seed(seed: number): void;
      setState(state: "title" | "active-play" | "fail" | "win" | "stress"): KartSnapshot;
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
      giveItem(item: Item): KartSnapshot;
      useItem(): KartSnapshot;
      setPlayerProgress(index: number, side?: number): KartSnapshot;
      setPlayerSpeed(speed: number): KartSnapshot;
      setCheckpoints(values: boolean[]): KartSnapshot;
      completeLap(valid?: boolean): KartSnapshot;
      setOffroad(distance?: number): KartSnapshot;
      setCollision(): KartSnapshot;
      hitPlayer(kind?: "bolt"): KartSnapshot;
      wheelSample(indices?: number[]): { maxClearance: number; values: Array<{ index: number; clearance: number; y: number; bank: number }> };
      trackPoints(): Array<{ x: number; z: number }>;
      trackProfile(): Array<{ index: number; y: number; grade: number; curvature: number; turn: number }>;
      groundingReport(): { maxClearance: number; maxGap: number; values: Array<{ label: string; clearance: number }> };
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

test.describe("GPT 5.6 Sol Sunbeam Kart Rally rebuild", () => {
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
    expect(runtime.some(path => path.includes("cdn"))).toBe(false);
    const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.snapshot());
    expect(diagnostics.settings).toEqual({ dpr: 1, shadows: true, postPasses: 2 });
    expect(diagnostics.scene.instancedMeshes).toBeGreaterThanOrEqual(8);
    expect(diagnostics.renderer.geometries).toBeLessThan(120);
  });

  test("keeps deterministic controls private in normal play", async ({ page }) => {
    await page.goto("/games/kart-racing/gpt-5-6-sol/index.html");
    await expect(page.locator("#startButton")).toBeEnabled();
    expect(await page.evaluate(() => "__THREE_GAME_TEST_HOOKS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__SUNBEAM_TEST__" in window)).toBe(false);
  });

  test("starts when Web Audio is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
      Object.defineProperty(window as Window & { webkitAudioContext?: unknown }, "webkitAudioContext", { value: undefined, configurable: true });
    });
    await page.goto("/games/kart-racing/gpt-5-6-sol/index.html");
    await expect(page.locator("#startButton")).toHaveText("Start the rally", { ignoreCase: true });
    await page.locator("#startButton").click();
    await expect(page.locator("#titleScreen")).toBeHidden();
    await expect(page.locator("#hud")).toBeVisible();
  });

  test("supports one through five rivals and a six-kart default grid", async ({ page }) => {
    await openGame(page);
    for (let count = 1; count <= 5; count++) {
      const snapshot = await page.evaluate(value => window.__SUNBEAM_TEST__.setOpponents(value), count);
      expect(snapshot.racerCount).toBe(count + 1);
      expect(snapshot.racers.filter(racer => racer.ai)).toHaveLength(count);
    }
    expect((await page.evaluate(() => window.__SUNBEAM_TEST__.setOpponents(5))).racerCount).toBe(6);
  });

  test("builds a long five-sector circuit with substantial left and right turns", async ({ page }) => {
    await openGame(page);
    const snapshot = await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    expect(snapshot.track.length).toBeGreaterThanOrEqual(1250);
    expect(snapshot.track.length).toBeLessThanOrEqual(1450);
    expect(snapshot.track.samples).toBe(720);
    expect(snapshot.track.sectors).toBe(5);
    expect(snapshot.track.targetLapSeconds).toBeGreaterThanOrEqual(55);
    expect(snapshot.track.targetLapSeconds).toBeLessThanOrEqual(70);
    expect(snapshot.track.passiveHazards).toBe(0);
    expect(snapshot.track.turns.left).toBeGreaterThan(100);
    expect(snapshot.track.turns.right).toBeGreaterThan(100);
    expect(snapshot.track.maxCurvature).toBeLessThan(.55);
    expect(snapshot.track.elevationRange).toBeGreaterThan(30);
    expect(snapshot.environment.passiveHazards).toBe(0);
    expect(snapshot.environment.landmarks).toEqual(["festival", "village", "windmill", "forest", "bridge", "vineyard"]);
    expect(snapshot.environment.roadTreatment).toBe("dark-aggregate-banked-ribbon-with-forgiving-shoulder");
    expect(snapshot.environment.terrainTreatment).toBe("wide-blended-rolling-roadbed-meadow");
    expect(snapshot.environment.distantBackdrop).toBe("terrain-hills-no-mountain-meshes");
  });

  test("holds speed on the windmill climb instead of applying an uphill sector penalty", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(1));
    const climb = await page.evaluate(() => {
      const profile = window.__SUNBEAM_TEST__.trackProfile();
      return profile.filter(sample => sample.curvature < .06).sort((a, b) => b.grade - a.grade)[0];
    });
    expect(climb.grade).toBeGreaterThan(.06);
    await page.evaluate(index => {
      window.__SUNBEAM_TEST__.setPlayerProgress(index, 0);
      window.__SUNBEAM_TEST__.setPlayerSpeed(28);
    }, climb.index);
    await page.keyboard.down("w");
    const result = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.45));
    await page.keyboard.up("w");
    expect(result.player.speed).toBeGreaterThan(25);
  });

  test("does not report a missed sector when the starting grid crosses the line", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => { window.__SUNBEAM_TEST__.start(2); window.__SUNBEAM_TEST__.setPlayerProgress(718, 0); window.__SUNBEAM_TEST__.setPlayerSpeed(26); });
    await page.keyboard.down("w");
    const result = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.6));
    await page.keyboard.up("w");
    expect(result.player.lap).toBe(1);
    expect(result.player.checkpointCount).toBe(0);
    await expect(page.locator("#message")).not.toContainText("MISSED");
  });

  test("accelerates beyond the old speed ceiling and releases a drift turbo", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(1));
    await page.keyboard.down("w");
    let snapshot = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1.6));
    expect(snapshot.player.speed).toBeGreaterThan(16);
    await page.keyboard.up("w");
    await page.evaluate(() => { window.__SUNBEAM_TEST__.setPlayerProgress(20, 0); return window.__SUNBEAM_TEST__.setPlayerSpeed(24); });
    await page.keyboard.down("d"); await page.keyboard.down(" ");
    snapshot = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.45));
    expect(snapshot.player.drifting).toBe(true);
    expect(snapshot.player.drift).toBeGreaterThan(.35);
    await page.keyboard.up(" ");
    snapshot = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.08));
    await page.keyboard.up("d");
    expect(snapshot.player.boost).toBeGreaterThan(0);
    expect(snapshot.camera.fov).toBeGreaterThan(64);
    const itemBoost = await page.evaluate(() => { window.__SUNBEAM_TEST__.giveItem("boost"); return window.__SUNBEAM_TEST__.useItem(); });
    expect(itemBoost.player.velocity).toBeGreaterThan(34);
  });

  test("maps left and right input to the matching chase-camera direction", async ({ page }) => {
    await openGame(page);
    const initial = await page.evaluate(() => window.__SUNBEAM_TEST__.start(1));
    await page.keyboard.down("w"); await page.keyboard.down("d");
    const right = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.9));
    await page.keyboard.up("d"); await page.keyboard.up("w");
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(1));
    await page.keyboard.down("w"); await page.keyboard.down("a");
    const left = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.9));
    await page.keyboard.up("a"); await page.keyboard.up("w");
    expect(right.player.heading).toBeLessThan(initial.player.heading);
    expect(left.player.heading).toBeGreaterThan(initial.player.heading);
    expect(right.player.x).toBeGreaterThan(left.player.x);
  });

  test("completes the longer checkpoint-valid lap at the intended race pace", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const hooks = window.__THREE_GAME_TEST_HOOKS__;
      const testControls = window.__SUNBEAM_TEST__;
      const centerline = testControls.trackPoints();
      const key = (type: "keydown" | "keyup", code: string) => dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
      let steer = "", drifting = false;
      const setSteer = (next: string) => { if (next === steer) return; if (steer) key("keyup", steer); steer = next; if (steer) key("keydown", steer); };
      key("keydown", "KeyW");
      let snapshot = testControls.start(5);
      for (let step = 0; step < 2600 && snapshot.player.lap < 2; step++) {
        const player = snapshot.player;
        const target = centerline[(player.progressIndex + 22) % centerline.length];
        const desired = Math.atan2(target.x - player.x, target.z - player.z);
        const delta = Math.atan2(Math.sin(desired - player.heading), Math.cos(desired - player.heading));
        setSteer(delta > .025 ? "KeyA" : delta < -.025 ? "KeyD" : "");
        const wantsDrift = Math.abs(delta) > .14 && player.speed > 14 && !player.offroad;
        if (wantsDrift !== drifting) { key(wantsDrift ? "keydown" : "keyup", "Space"); drifting = wantsDrift; }
        snapshot = hooks.advance(.05);
      }
      setSteer(""); key("keyup", "KeyW"); if (drifting) key("keyup", "Space");
      return snapshot;
    });
    expect(result.player.lap).toBe(2);
    expect(result.player.offroad).toBe(false);
    expect(result.raceTime).toBeGreaterThanOrEqual(55);
    expect(result.raceTime).toBeLessThanOrEqual(70);
  });

  test("keeps wheel-radius contact on flat, banked, climbing, and descending samples", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(3));
    const sample = await page.evaluate(() => window.__SUNBEAM_TEST__.wheelSample([0, 145, 285, 430, 575]));
    expect(sample.values).toHaveLength(5);
    expect(sample.values.some(value => Math.abs(value.bank) > .03)).toBe(true);
    expect(sample.maxClearance).toBeLessThanOrEqual(.03);
    const snapshot = await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot());
    expect(snapshot.environment.wheelGrounding).toBe("radius-contact-suspension");
    expect(snapshot.physics.maxWheelClearance).toBeLessThanOrEqual(.03);
  });

  test("keeps authored scenery foundations at or below the rendered terrain", async ({ page }) => {
    await openGame(page);
    const grounding = await page.evaluate(() => window.__SUNBEAM_TEST__.groundingReport());
    expect(grounding.values.length).toBeGreaterThanOrEqual(15);
    expect(grounding.values.map(value => value.label)).toEqual(expect.arrayContaining(["windmill", "house-118", "tent-0", "grandstand--1"]));
    expect(grounding.maxClearance).toBeLessThanOrEqual(.03);
    const snapshot = await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot());
    expect(snapshot.environment.treeRoadClearance).toBeGreaterThanOrEqual(6);
    expect(snapshot.environment.grandstandFacingAlignment).toBeGreaterThan(.99);
    expect(snapshot.environment.terrainBlend.blendWidth).toBeGreaterThanOrEqual(100);
    expect(snapshot.environment.terrainBlend.maxRoadGap).toBeLessThan(.2);
    expect(snapshot.environment.terrainBlend.maxStep).toBeLessThan(3.5);
  });

  test("resolves physical kart contact with SAT impulses", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    const contact = await page.evaluate(() => window.__SUNBEAM_TEST__.setCollision());
    expect(contact.physics.contactModel).toBe("obb-sat-impulse");
    expect(contact.physics.collisionCount).toBeGreaterThan(0);
    expect(contact.player.velocity).toBeLessThan(30);
    expect(contact.player.velocity).toBeGreaterThan(8);
  });

  test("slows off-road and recovers cleanly without obstacle traps", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(3));
    await page.keyboard.down("w");
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1.4));
    const before = await page.evaluate(() => window.__SUNBEAM_TEST__.setOffroad());
    const slowed = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.8));
    await page.keyboard.up("w");
    expect(slowed.player.offroad).toBe(true);
    expect(slowed.player.velocity).toBeLessThan(before.player.velocity + 3);
    const reset = await page.evaluate(() => window.__SUNBEAM_TEST__.resetPlayer());
    expect(reset.player.recovery).toBeGreaterThan(0);
    const settled = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.03));
    expect(settled.player.offroad).toBe(false);
  });

  test("keeps the brown road shoulder fast and reserves heavy drag for grass", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => { window.__SUNBEAM_TEST__.start(2); window.__SUNBEAM_TEST__.setPlayerProgress(170, 14.5); window.__SUNBEAM_TEST__.setPlayerSpeed(25); });
    await page.keyboard.down("w");
    const shoulder = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.7));
    await page.keyboard.up("w");
    expect(shoulder.player.shoulder).toBe(true);
    expect(shoulder.player.offroad).toBe(false);
    expect(shoulder.player.speed).toBeGreaterThan(23.5);
  });

  test("keeps stronger AI opponents on the racing surface", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => { window.__SUNBEAM_TEST__.start(5); window.__SUNBEAM_TEST__.setPlayerProgress(360, 0); return window.__THREE_GAME_TEST_HOOKS__.advance(8); });
    const snapshot = await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot());
    const rivals = snapshot.racers.filter(racer => racer.ai);
    expect(rivals.every(racer => !racer.shoulder && !racer.offroad && Math.abs(racer.sideDistance) < 8)).toBe(true);
    expect(Math.max(...rivals.map(racer => racer.speed))).toBeGreaterThan(26);
  });

  test("uses only visually distinct boost and spark pickups", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    const snapshot = await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot());
    expect(snapshot.objects.pickupTypes).toEqual(["bolt", "boost"]);
    expect(snapshot.objects.pickupStyles).toEqual({ boost: "gold-sun-double-ring", bolt: "cyan-arrow-diamond" });
    expect(snapshot.objects.jams).toBe(0);
    await page.evaluate(() => { window.__SUNBEAM_TEST__.giveItem("boost"); window.__SUNBEAM_TEST__.useItem(); });
    expect((await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot())).player.boost).toBeGreaterThan(1);
    await page.evaluate(() => { window.__SUNBEAM_TEST__.giveItem("bolt"); window.__SUNBEAM_TEST__.useItem(); });
    expect((await page.evaluate(() => window.__SUNBEAM_TEST__.snapshot())).objects.projectiles).toBe(1);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    const hit = await page.evaluate(() => window.__SUNBEAM_TEST__.hitPlayer("bolt"));
    expect(hit.player.stun).toBeGreaterThan(.4);
    const recovered = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(.65));
    expect(recovered.player.stun).toBe(0);
  });

  test("requires every ordered sector before awarding a lap", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(2));
    expect((await page.evaluate(() => window.__SUNBEAM_TEST__.completeLap(false))).player.lap).toBe(1);
    const accepted = await page.evaluate(() => window.__SUNBEAM_TEST__.completeLap(true));
    expect(accepted.player.lap).toBe(2);
    expect(accepted.player.checkpointCount).toBe(0);
  });

  test("produces repeatable seeded active-play snapshots", async ({ page }) => {
    await openGame(page);
    const first = await page.evaluate(() => { window.__THREE_GAME_TEST_HOOKS__.seed(12345); return window.__THREE_GAME_TEST_HOOKS__.setState("active-play"); });
    const second = await page.evaluate(() => { window.__THREE_GAME_TEST_HOOKS__.seed(12345); return window.__THREE_GAME_TEST_HOOKS__.setState("active-play"); });
    expect(second.player).toEqual(first.player);
    expect(second.racers).toEqual(first.racers);
  });

  test("pauses, resumes, and renders six final standings", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    await page.keyboard.press("Escape");
    await expect(page.locator("#pauseScreen")).toBeVisible();
    await page.keyboard.press("p");
    await expect(page.locator("#pauseScreen")).toBeHidden();
    const result = await page.evaluate(() => window.__SUNBEAM_TEST__.finishPlayer());
    expect(result.player.finished).toBe(true);
    await expect(page.locator("#resultScreen")).toBeVisible();
    await expect(page.locator("#standings .standing")).toHaveCount(6);
  });

  test("keeps the lean HUD within the 1280x720 playfield", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__SUNBEAM_TEST__.start(5));
    for (const selector of ["#game", "#raceInfo", "#item", "#speedometer", "#minimapShell", "#utility"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(1281); expect(box!.y + box!.height).toBeLessThanOrEqual(721);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(721);
  });
});
