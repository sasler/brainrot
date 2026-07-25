import { expect, test, type Page } from "@playwright/test";

type Item = "boost" | "dart";

type RallySnapshot = {
  mode: string;
  seed: number;
  opponentCount: number;
  racerCount: number;
  raceTime: number;
  laps: number;
  track: {
    length: number; samples: number; sectors: number; targetLapSeconds: number;
    turns: { left: number; right: number };
    elevationRange: number; maxCurvature: number; minCornerRadius: number;
  };
  camera: { fov: number };
  player: {
    x: number; y: number; z: number; speed: number; velocity: number; slip: number; heading: number;
    lap: number; rank: number; progressIndex: number; checkpointCount: number; item: Item | null;
    boost: number; boostKind: string | null; drift: number; driftTier: number; drifting: boolean;
    solar: number; draft: number; shoulder: boolean; offroad: boolean; finished: boolean;
    stun: number; recovery: number; sideDistance: number; wheelClearance: number;
  };
  racers: Array<{
    id: number; ai: boolean; lap: number; rank: number; progressIndex: number;
    item: Item | null; finished: boolean; speed: number; sideDistance: number;
    shoulder: boolean; offroad: boolean;
  }>;
  environment: {
    artDirection: string; roadTreatment: string; terrainTreatment: string; distantBackdrop: string;
    landmarks: string[];
    terrainBlend: { blendWidth: number; maxRoadGap: number };
    wheelGrounding: string;
    sceneryGrounding: { maxClearance: number; maxGap: number; detached: string[]; values: Array<{ label: string; clearance: number }> };
    treeRoadClearance: number; sunlitFraction: number; passiveHazards: number;
  };
  physics: { collisionCount: number; contactModel: string; maxWheelClearance: number };
  objects: {
    itemBoxes: number; itemTypes: Item[]; itemStyles: { boost: string; dart: string };
    projectiles: number; particles: number; audioLayers: number;
  };
};

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__: {
      seed(seed: number): void;
      setState(state: "title" | "active-play" | "fail" | "win" | "stress"): RallySnapshot;
      advance(seconds: number): RallySnapshot;
      snapshot(): RallySnapshot;
    };
    __THREE_GAME_DIAGNOSTICS__: {
      snapshot(): {
        renderer: { calls: number; triangles: number; geometries: number; textures: number };
        scene: { meshes: number; materials: number; instancedMeshes: number };
        settings: { dpr: number; shadows: boolean; postPasses: number };
      };
    };
    __RALLY_TEST__: {
      start(count?: number): RallySnapshot;
      setOpponents(count: number): RallySnapshot;
      giveItem(item: Item): RallySnapshot;
      useItem(): RallySnapshot;
      setPlayerProgress(index: number, side?: number): RallySnapshot;
      setPlayerSpeed(speed: number): RallySnapshot;
      setSolar(value: number): RallySnapshot;
      setCheckpoints(count: number): RallySnapshot;
      completeLap(valid?: boolean): RallySnapshot;
      setOffroad(distance?: number): RallySnapshot;
      setCollision(): RallySnapshot;
      hitPlayer(kind?: "dart"): RallySnapshot;
      wheelSample(indices?: number[]): { maxClearance: number; values: Array<{ index: number; clearance: number; y: number; bank: number }> };
      trackPoints(): Array<{ x: number; z: number }>;
      trackProfile(): Array<{ index: number; y: number; grade: number; curvature: number; turn: number; sector: number }>;
      lightProfile(): Array<{ index: number; light: number; sector: string }>;
      groundingReport(): { maxClearance: number; maxGap: number; detached: string[]; values: Array<{ label: string; clearance: number }> };
      finishPlayer(): RallySnapshot;
      resetPlayer(): RallySnapshot;
      snapshot(): RallySnapshot;
    };
  }
}

const GAME = "/games/kart-racing/opus-5/index.html";

async function openGame(page: Page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto(`${GAME}?test=1`);
  await expect(page.locator("#startButton")).toBeEnabled();
  await expect.poll(() => page.evaluate(() => Boolean(window.__THREE_GAME_TEST_HOOKS__))).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(window.__RALLY_TEST__))).toBe(true);
}

/** Drives a lap on the centreline using only real key events. */
async function driveLap(page: Page, rivals: number) {
  return page.evaluate((count) => {
    const hooks = window.__THREE_GAME_TEST_HOOKS__;
    const rally = window.__RALLY_TEST__;
    const centreline = rally.trackPoints();
    const key = (type: "keydown" | "keyup", code: string) =>
      dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
    let steer = "";
    const setSteer = (next: string) => {
      if (next === steer) return;
      if (steer) key("keyup", steer);
      steer = next;
      if (steer) key("keydown", steer);
    };

    key("keydown", "KeyW");
    let snapshot = rally.start(count);
    let worstOnRoad = 0;
    for (let step = 0; step < 3000 && snapshot.player.lap < 2; step++) {
      const player = snapshot.player;
      const target = centreline[(player.progressIndex + 14) % centreline.length];
      const desired = Math.atan2(target.x - player.x, target.z - player.z);
      const delta = Math.atan2(Math.sin(desired - player.heading), Math.cos(desired - player.heading));
      setSteer(delta > 0.02 ? "KeyD" : delta < -0.02 ? "KeyA" : "");
      if (!player.offroad) worstOnRoad = Math.max(worstOnRoad, player.wheelClearance);
      snapshot = hooks.advance(0.05);
    }
    setSteer("");
    key("keyup", "KeyW");
    return { snapshot, worstOnRoad };
  }, rivals);
}

test.describe("Claude Opus 5 Sunbeam Kart Rally", () => {
  test("uses the pinned local Three.js runtime with no external requests or errors", async ({ page }) => {
    const external: string[] = [];
    const runtime: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
        external.push(request.url());
      }
      if (url.pathname.startsWith("/vendor/three/")) runtime.push(url.pathname);
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await openGame(page);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    expect(runtime).toContain("/vendor/three/0.185.1/three.module.min.js");
    expect(runtime).toContain("/vendor/three/0.185.1/three.core.min.js");
    expect(runtime).toContain("/vendor/three/0.185.1/addons/utils/BufferGeometryUtils.js");
  });

  test("renders through a deliberate budget: capped DPR, one shadow pass, two post passes", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("active-play"));
    const diagnostics = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.snapshot());
    expect(diagnostics.settings.shadows).toBe(true);
    expect(diagnostics.settings.postPasses).toBe(2);
    expect(diagnostics.settings.dpr).toBeGreaterThan(0);
    expect(diagnostics.settings.dpr).toBeLessThanOrEqual(1.5);
    expect(diagnostics.scene.instancedMeshes).toBeGreaterThanOrEqual(12);
    expect(diagnostics.renderer.geometries).toBeLessThan(120);
    expect(diagnostics.renderer.triangles).toBeGreaterThan(0);
  });

  test("keeps deterministic controls private during normal play", async ({ page }) => {
    await page.goto(GAME);
    await expect(page.locator("#startButton")).toBeEnabled();
    expect(await page.evaluate(() => "__THREE_GAME_TEST_HOOKS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__THREE_GAME_DIAGNOSTICS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__RALLY_TEST__" in window)).toBe(false);
  });

  test("starts and races when Web Audio is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
      Object.defineProperty(window as Window & { webkitAudioContext?: unknown }, "webkitAudioContext", {
        value: undefined, configurable: true,
      });
    });
    await page.goto(GAME);
    await expect(page.locator("#startButton")).toHaveText("Drop the flag", { ignoreCase: true });
    await page.locator("#startButton").click();
    await expect(page.locator("#titleScreen")).toBeHidden();
    await expect(page.locator("#hud")).toBeVisible();
    await expect(page.locator("#countdown")).toBeVisible();
  });

  test("fields one through five rivals on a six-kart grid", async ({ page }) => {
    await openGame(page);
    for (let count = 1; count <= 5; count++) {
      const snapshot = await page.evaluate((value) => window.__RALLY_TEST__.setOpponents(value), count);
      expect(snapshot.racerCount).toBe(count + 1);
      expect(snapshot.racers.filter((racer) => racer.ai)).toHaveLength(count);
      expect(snapshot.racers.filter((racer) => !racer.ai)).toHaveLength(1);
    }
  });

  test("builds one authored six-sector circuit with real corners and elevation", async ({ page }) => {
    await openGame(page);
    const snapshot = await page.evaluate(() => window.__RALLY_TEST__.start(5));
    expect(snapshot.track.samples).toBe(720);
    expect(snapshot.track.sectors).toBe(6);
    expect(snapshot.track.length).toBeGreaterThanOrEqual(1250);
    expect(snapshot.track.length).toBeLessThanOrEqual(1450);
    expect(snapshot.track.elevationRange).toBeGreaterThan(30);
    expect(snapshot.track.turns.left).toBeGreaterThan(100);
    expect(snapshot.track.turns.right).toBeGreaterThan(100);
    expect(snapshot.track.minCornerRadius).toBeGreaterThan(15);
    expect(snapshot.track.minCornerRadius).toBeLessThan(60);
    expect(snapshot.laps).toBe(3);
    expect(snapshot.environment.landmarks).toEqual([
      "harbour-gate", "olive-terraces", "windmill-ridge", "cypress-shade", "aqueduct-crossing", "vineyard-descent",
    ]);
    expect(snapshot.environment.artDirection).toBe("six-oclock-mediterranean-limestone-and-olive");
    expect(snapshot.environment.roadTreatment).toBe("pale-limestone-ribbon-with-ochre-dust-shoulder");
    expect(snapshot.environment.passiveHazards).toBe(0);
  });

  test("banks every corner with the outside edge high", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__RALLY_TEST__.start(1));
    const banking = await page.evaluate(() => {
      const rally = window.__RALLY_TEST__;
      const profile = rally.trackProfile();
      const leftHander = [...profile].sort((a, b) => b.turn - a.turn)[0];
      const rightHander = [...profile].sort((a, b) => a.turn - b.turn)[0];
      const heightAt = (index: number, side: number) => rally.setPlayerProgress(index, side).player.y;
      return {
        leftRise: heightAt(leftHander.index, 5) - heightAt(leftHander.index, -5),
        rightRise: heightAt(rightHander.index, -5) - heightAt(rightHander.index, 5),
      };
    });
    // On a left-hander the right edge is the outside, and vice versa.
    expect(banking.leftRise).toBeGreaterThan(0.5);
    expect(banking.rightRise).toBeGreaterThan(0.5);
  });

  test("charges the solar meter in the lit stripes and drains it in the shade", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const hooks = window.__THREE_GAME_TEST_HOOKS__;
      const rally = window.__RALLY_TEST__;
      const light = rally.lightProfile();
      const brightest = light.reduce((a, b) => (b.light > a.light ? b : a));
      const darkest = light.reduce((a, b) => (b.light < a.light ? b : a));
      rally.start(1);
      rally.setSolar(0.5);
      rally.setPlayerProgress(brightest.index, 0);
      rally.setPlayerSpeed(2);
      const lit = hooks.advance(2).player.solar;
      rally.setSolar(0.5);
      rally.setPlayerProgress(darkest.index, 0);
      rally.setPlayerSpeed(2);
      const shaded = hooks.advance(2).player.solar;
      return { lit, shaded, brightest: brightest.light, darkest: darkest.light, shadedSector: darkest.sector };
    });
    expect(result.brightest).toBeGreaterThan(0.9);
    expect(result.darkest).toBeLessThan(0.25);
    expect(result.lit).toBeGreaterThan(0.6);
    expect(result.shaded).toBeLessThan(0.3);

    const snapshot = await page.evaluate(() => window.__RALLY_TEST__.snapshot());
    // A meaningful slice of the circuit must actually be in shade.
    expect(snapshot.environment.sunlitFraction).toBeGreaterThan(0.45);
    expect(snapshot.environment.sunlitFraction).toBeLessThan(0.85);
  });

  test("charges a controllable drift through the hairpin and pays out a mini-turbo", async ({ page }) => {
    await openGame(page);
    const drift = await page.evaluate(() => {
      const hooks = window.__THREE_GAME_TEST_HOOKS__;
      const rally = window.__RALLY_TEST__;
      const centreline = rally.trackPoints();
      const profile = rally.trackProfile();
      // The tightest sustained corner is where a drift is worth attempting.
      let entry = 0, best = -1;
      for (let i = 0; i < profile.length; i++) {
        let total = 0;
        for (let k = 0; k < 40; k++) total += profile[(i + k) % profile.length].curvature;
        if (total > best) { best = total; entry = i; }
      }
      const key = (type: "keydown" | "keyup", code: string) =>
        dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
      let steer = "";
      const setSteer = (next: string) => {
        if (next === steer) return;
        if (steer) key("keyup", steer);
        steer = next;
        if (steer) key("keydown", steer);
      };

      rally.start(1);
      rally.setPlayerProgress((entry - 14 + profile.length) % profile.length, 0);
      rally.setPlayerSpeed(20);
      key("keydown", "KeyW");
      key("keydown", "Space");
      let snapshot = hooks.snapshot();
      let maxTier = 0, maxSide = 0, wentOffroad = false;
      for (let i = 0; i < 70; i++) {
        const player = snapshot.player;
        const target = centreline[(player.progressIndex + 12) % centreline.length];
        const desired = Math.atan2(target.x - player.x, target.z - player.z);
        const delta = Math.atan2(Math.sin(desired - player.heading), Math.cos(desired - player.heading));
        setSteer(delta > 0.01 ? "KeyD" : delta < -0.01 ? "KeyA" : steer || "KeyA");
        snapshot = hooks.advance(1 / 30);
        maxTier = Math.max(maxTier, snapshot.player.driftTier);
        maxSide = Math.max(maxSide, Math.abs(snapshot.player.sideDistance));
        if (snapshot.player.offroad) wentOffroad = true;
      }
      key("keyup", "Space");
      const released = hooks.advance(0.05);
      setSteer("");
      key("keyup", "KeyW");
      return { maxTier, maxSide, wentOffroad, released };
    });

    expect(drift.maxTier).toBeGreaterThanOrEqual(2);
    // A drift you steer must be holdable — it should not fire you off the road.
    expect(drift.wentOffroad).toBe(false);
    expect(drift.maxSide).toBeLessThan(6.2);
    expect(drift.released.player.drifting).toBe(false);
    expect(drift.released.player.boost).toBeGreaterThan(0.5);
    expect(drift.released.camera.fov).toBeGreaterThan(58);
  });

  test("forfeits the drift charge when the kart runs off the road", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__RALLY_TEST__.start(1);
      window.__RALLY_TEST__.setPlayerProgress(20, 0);
      window.__RALLY_TEST__.setPlayerSpeed(20);
    });
    await page.keyboard.down("w");
    await page.keyboard.down("d");
    await page.keyboard.down(" ");
    // Full lock on a straight charges the drift, then runs out of road.
    const result = await page.evaluate(() => {
      const hooks = window.__THREE_GAME_TEST_HOOKS__;
      let charged = 0;
      let snapshot = hooks.snapshot();
      for (let i = 0; i < 16 && !snapshot.player.offroad; i++) {
        snapshot = hooks.advance(0.08);
        charged = Math.max(charged, snapshot.player.drift);
      }
      return { charged, snapshot: hooks.advance(0.05) };
    });
    await page.keyboard.up(" ");
    await page.keyboard.up("d");
    await page.keyboard.up("w");
    expect(result.charged).toBeGreaterThan(0.34);
    expect(result.snapshot.player.offroad).toBe(true);
    expect(result.snapshot.player.drifting).toBe(false);
    expect(result.snapshot.player.boost).toBe(0);
  });

  test("maps left and right input to the matching world direction", async ({ page }) => {
    await openGame(page);
    const initial = await page.evaluate(() => window.__RALLY_TEST__.start(1));
    await page.keyboard.down("w");
    await page.keyboard.down("d");
    const right = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1));
    await page.keyboard.up("d");
    await page.keyboard.up("w");

    await page.evaluate(() => window.__RALLY_TEST__.start(1));
    await page.keyboard.down("w");
    await page.keyboard.down("a");
    const left = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(1));
    await page.keyboard.up("a");
    await page.keyboard.up("w");

    // The grid faces +Z, so steering right must swing the heading toward +X.
    expect(right.player.heading).toBeGreaterThan(initial.player.heading);
    expect(left.player.heading).toBeLessThan(initial.player.heading);
    expect(right.player.x).toBeGreaterThan(left.player.x);
  });

  test("releases held driving controls when the page loses focus", async ({ page }) => {
    await openGame(page);
    const initial = await page.evaluate(() => window.__RALLY_TEST__.start(1));
    await page.keyboard.down("w");
    await page.keyboard.down("d");
    await page.keyboard.down(" ");
    await page.evaluate(() => dispatchEvent(new Event("blur")));
    const result = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.6));
    expect(result.player.speed).toBeLessThan(1.5);
    expect(result.player.heading).toBeCloseTo(initial.player.heading, 3);
    expect(result.player.drifting).toBe(false);
  });

  test("completes a checkpoint-valid lap at the intended race pace", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);
    const { snapshot, worstOnRoad } = await driveLap(page, 5);
    expect(snapshot.player.lap).toBe(2);
    expect(snapshot.player.checkpointCount).toBe(0);
    expect(snapshot.player.offroad).toBe(false);
    expect(snapshot.raceTime).toBeGreaterThanOrEqual(48);
    expect(snapshot.raceTime).toBeLessThanOrEqual(75);
    // Chassis contact stays tight even while racing, not just when parked.
    expect(worstOnRoad).toBeLessThanOrEqual(0.35);
  });

  test("keeps every wheel on the surface across banked, climbing and descending samples", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__RALLY_TEST__.start(3));
    const sample = await page.evaluate(() => {
      const indices: number[] = [];
      for (let i = 0; i < 720; i += 30) indices.push(i);
      return window.__RALLY_TEST__.wheelSample(indices);
    });
    expect(sample.values.length).toBe(24);
    expect(sample.values.filter((value) => Math.abs(value.bank) > 0.03).length).toBeGreaterThanOrEqual(12);
    expect(sample.maxClearance).toBeLessThanOrEqual(0.05);
    const snapshot = await page.evaluate(() => window.__RALLY_TEST__.snapshot());
    expect(snapshot.environment.wheelGrounding).toBe("surface-basis-radius-contact");
  });

  test("keeps authored scenery founded on the terrain and clear of the road", async ({ page }) => {
    await openGame(page);
    const grounding = await page.evaluate(() => window.__RALLY_TEST__.groundingReport());
    expect(grounding.values.length).toBeGreaterThanOrEqual(20);
    expect(grounding.values.map((value) => value.label)).toEqual(
      expect.arrayContaining(["windmill", "gate-pier-1", "grandstand-east", "house-0", "tent-0"]),
    );
    // Nothing floats: every footprint sits at or below the ground it stands on.
    expect(grounding.maxClearance).toBeLessThanOrEqual(0.05);
    // ...and every authored landmark actually reached the scene graph.
    expect(grounding.detached).toEqual([]);

    const snapshot = await page.evaluate(() => window.__RALLY_TEST__.snapshot());
    expect(snapshot.environment.treeRoadClearance).toBeGreaterThanOrEqual(4);
    expect(snapshot.environment.terrainBlend.blendWidth).toBeGreaterThanOrEqual(100);
    expect(snapshot.environment.terrainBlend.maxRoadGap).toBeLessThan(0.2);
  });

  test("resolves kart contact with oriented-box SAT impulses", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__RALLY_TEST__.start(5));
    const contact = await page.evaluate(() => window.__RALLY_TEST__.setCollision());
    expect(contact.physics.contactModel).toBe("obb-sat-impulse");
    expect(contact.physics.collisionCount).toBeGreaterThan(0);
    // A rub costs the faster kart time without launching it off the island.
    expect(contact.player.speed).toBeLessThan(29);
    expect(contact.player.speed).toBeGreaterThan(5);
  });

  test("keeps the dust shoulder quick and reserves heavy drag for the scrub", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__RALLY_TEST__.start(2);
      window.__RALLY_TEST__.setPlayerProgress(60, 7.6);
      window.__RALLY_TEST__.setPlayerSpeed(21);
    });
    await page.keyboard.down("w");
    const shoulder = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.7));
    await page.keyboard.up("w");
    expect(shoulder.player.shoulder).toBe(true);
    expect(shoulder.player.offroad).toBe(false);
    expect(shoulder.player.speed).toBeGreaterThan(18);

    await page.evaluate(() => {
      window.__RALLY_TEST__.start(2);
      window.__RALLY_TEST__.setPlayerProgress(60, 0);
      window.__RALLY_TEST__.setPlayerSpeed(21);
      window.__RALLY_TEST__.setOffroad();
    });
    await page.keyboard.down("w");
    const scrub = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.7));
    await page.keyboard.up("w");
    expect(scrub.player.offroad).toBe(true);
    expect(scrub.player.speed).toBeLessThan(shoulder.player.speed);

    const recovered = await page.evaluate(() => window.__RALLY_TEST__.resetPlayer());
    expect(recovered.player.recovery).toBeGreaterThan(0);
    expect(recovered.player.offroad).toBe(false);
  });

  test("keeps rival karts racing on the surface at competitive pace", async ({ page }) => {
    test.setTimeout(90_000);
    const result = await (async () => {
      await openGame(page);
      return page.evaluate(() => {
        const hooks = window.__THREE_GAME_TEST_HOOKS__;
        const rally = window.__RALLY_TEST__;
        rally.start(5);
        rally.setPlayerProgress(360, 70);   // park the player clear of the pack
        let snapshot = hooks.advance(0.1);
        let offroadSamples = 0, total = 0, worstSide = 0;
        for (let i = 0; i < 1600; i++) {
          snapshot = hooks.advance(0.05);
          rally.setPlayerProgress(360, 70);
          for (const racer of snapshot.racers) {
            if (!racer.ai) continue;
            total++;
            if (racer.offroad) offroadSamples++;
            worstSide = Math.max(worstSide, Math.abs(racer.sideDistance));
          }
          if (snapshot.racers.filter((racer) => racer.ai).every((racer) => racer.lap >= 2)) break;
        }
        return {
          lapTime: snapshot.raceTime,
          offroadRatio: offroadSamples / total,
          worstSide,
          laps: snapshot.racers.filter((racer) => racer.ai).map((racer) => racer.lap),
          topSpeed: Math.max(...snapshot.racers.filter((racer) => racer.ai).map((racer) => racer.speed)),
        };
      });
    })();
    expect(result.laps.every((lap) => lap >= 2)).toBe(true);
    expect(result.lapTime).toBeLessThanOrEqual(85);
    expect(result.offroadRatio).toBeLessThan(0.05);
    expect(result.worstSide).toBeLessThan(12);
    expect(result.topSpeed).toBeGreaterThan(18);
  });

  test("carries exactly two position-weighted items with distinct silhouettes", async ({ page }) => {
    await openGame(page);
    const snapshot = await page.evaluate(() => window.__RALLY_TEST__.start(5));
    expect(snapshot.objects.itemTypes).toEqual(["boost", "dart"]);
    expect(snapshot.objects.itemStyles).toEqual({ boost: "gold-sun-double-ring", dart: "cyan-arrow-diamond" });
    expect(snapshot.objects.itemBoxes).toBeGreaterThan(0);

    // A Sunburst fired on a full solar meter must beat one fired on empty.
    const drained = await page.evaluate(() => {
      window.__RALLY_TEST__.start(5);
      window.__RALLY_TEST__.setSolar(0);
      window.__RALLY_TEST__.giveItem("boost");
      return window.__RALLY_TEST__.useItem();
    });
    const charged = await page.evaluate(() => {
      window.__RALLY_TEST__.start(5);
      window.__RALLY_TEST__.setSolar(1);
      window.__RALLY_TEST__.giveItem("boost");
      return window.__RALLY_TEST__.useItem();
    });
    expect(drained.player.boostKind).toBe("sunburst");
    expect(charged.player.boostKind).toBe("sunburst-charged");
    expect(charged.player.boost).toBeGreaterThan(drained.player.boost);

    const fired = await page.evaluate(() => {
      window.__RALLY_TEST__.start(5);
      window.__RALLY_TEST__.giveItem("dart");
      return window.__RALLY_TEST__.useItem();
    });
    expect(fired.objects.projectiles).toBe(1);
    expect(fired.player.item).toBeNull();

    const hit = await page.evaluate(() => window.__RALLY_TEST__.hitPlayer("dart"));
    expect(hit.player.stun).toBeGreaterThan(0.4);
    const recovered = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.advance(0.8));
    expect(recovered.player.stun).toBe(0);
  });

  test("requires every ordered sector gate before awarding a lap", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__RALLY_TEST__.start(2));
    const skipped = await page.evaluate(() => window.__RALLY_TEST__.completeLap(false));
    expect(skipped.player.lap).toBe(1);
    await expect(page.locator("#flash")).toContainText("MISSED SECTOR");

    const accepted = await page.evaluate(() => window.__RALLY_TEST__.completeLap(true));
    expect(accepted.player.lap).toBe(2);
    expect(accepted.player.checkpointCount).toBe(0);
  });

  test("produces repeatable seeded active-play snapshots", async ({ page }) => {
    await openGame(page);
    const first = await page.evaluate(() => {
      window.__THREE_GAME_TEST_HOOKS__.seed(4242);
      return window.__THREE_GAME_TEST_HOOKS__.setState("active-play");
    });
    const second = await page.evaluate(() => {
      window.__THREE_GAME_TEST_HOOKS__.seed(4242);
      return window.__THREE_GAME_TEST_HOOKS__.setState("active-play");
    });
    expect(second.player).toEqual(first.player);
    expect(second.racers).toEqual(first.racers);
    expect(second.seed).toBe(4242);
  });

  test("pauses, resumes and reports a full grid of final standings", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__RALLY_TEST__.start(5));
    await page.keyboard.press("Escape");
    await expect(page.locator("#pauseScreen")).toBeVisible();
    await page.keyboard.press("p");
    await expect(page.locator("#pauseScreen")).toBeHidden();

    const finished = await page.evaluate(() => window.__RALLY_TEST__.finishPlayer());
    expect(finished.player.finished).toBe(true);
    await expect(page.locator("#resultScreen")).toBeVisible();
    await expect(page.locator("#standings .standing")).toHaveCount(6);
    await expect(page.locator("#standings .standing.you")).toHaveCount(1);

    await page.locator("#againButton").click();
    await expect(page.locator("#resultScreen")).toBeHidden();
    await expect(page.locator("#hud")).toBeVisible();
  });

  test("keeps the lean HUD inside the 1280x720 playfield without scrolling", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => window.__RALLY_TEST__.start(5));
    for (const selector of ["#game", "#raceInfo", "#sectorLabel", "#item", "#dash", "#minimapShell", "#utility"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box, `${selector} should be laid out`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(1281);
      expect(box!.y + box!.height).toBeLessThanOrEqual(721);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(721);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1281);
  });

  test("shows the controls brief at the real play-page iframe height", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 544 });
    await page.goto(GAME);
    await expect(page.locator("#titleScreen .brief")).toBeVisible();
    await expect(page.locator("#titleScreen")).toContainText("Space");
    const panel = await page.locator("#titleScreen .panel").boundingBox();
    expect(panel).not.toBeNull();
    expect(panel!.y).toBeGreaterThanOrEqual(0);
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(545);
  });
});
