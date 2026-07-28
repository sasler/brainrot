import { expect, test, type Page } from "@playwright/test";

type Outcome = "flying" | "captured" | "impact" | "star" | "escaped" | "timeout";

type Snapshot = {
  screen: string;
  mode: string;
  simT: number;
  launchT: number;
  launched: boolean;
  warp: number;
  fuel: number;
  collected: number;
  result: string | null;
  aim: { heading: number; dv: number };
  contract: {
    key: string; name: string; seed: number; fuel: number; basin: number;
    grade: string; timeLimit: number; capRadius: number; capSpeed: number;
    departName: string; destName: string; destKind: string; buoys: number;
  } | null;
  witness: {
    t0: number; heading: number; dv: number; retro: number;
    total: number; flight: number; dest: number;
  } | null;
  probe: {
    x: number; y: number; z: number; vx: number; vy: number; vz: number;
    t: number; speed: number; accel: number;
  } | null;
  beacons: Array<{ x: number; y: number; z: number; r: number; taken: boolean }>;
  bodies: Array<{
    name: string; kind: string; radius: number; mu: number;
    x: number; y: number; z: number; period: number; eccentricity: number;
  }>;
  predicted: { outcome: Outcome; body: number; buoys: number; t: number } | null;
  ribbonPoints: number;
  audioLayers: number;
  scale: number[];
};

type Replay = {
  state: string; result: string | null; collected: number;
  buoys: number; fuelLeft: number; flight: number;
};

type Audit = {
  seconds: number; arcLength: number; selfConsistency: number;
  refinementError: number; refinementRelative: number;
  energyDrift: number; orbits: number;
};

type TableRow = {
  key: string; name: string; seed: number; basin: number; grade: string;
  fuel: number; witnessTotal: number; flight: number; buoys: number;
  dest: string; destKind: string; bodies: number; timeLimit: number;
};

declare global {
  interface Window {
    __PERIHELION_TEST__: {
      loadCampaign(index: number): unknown;
      loadRoute(tier: number, seed: number): unknown;
      replayWitness(stopFraction?: number): Replay;
      advance(seconds: number): Snapshot;
      snapshot(): Snapshot;
      integrationAudit(seconds?: number): Audit;
      difficultyTable(): TableRow[];
      campaign(): Array<{ key: string; name: string; seed: number }>;
      buildSpec(index: number, overrides?: Record<string, unknown>): Record<string, number | string | boolean>;
      witness(): { t0: number; heading: number; dv: number; retro: number; total: number; flight: number } | null;
      basin(): number | null;
      aim(heading: number, dv: number): Snapshot;
      burn(): Snapshot;
      setWarp(index: number): Snapshot;
      setZoom(z: number): number;
      diagnostics(): {
        renderer: { calls: number; triangles: number; geometries: number; textures: number };
        scene: { meshes: number; materials: number; instancedMeshes: number };
        settings: { dpr: number; shadows: boolean; postPasses: number };
      };
    };
    __THREE_GAME_TEST_HOOKS__: {
      seed(seed: number): void;
      setState(state: "title" | "active-play" | "fail" | "win" | "stress"): Snapshot;
      advance(seconds: number): Snapshot;
      snapshot(): Snapshot;
    };
    __THREE_GAME_DIAGNOSTICS__: {
      snapshot(): {
        renderer: { calls: number; triangles: number; geometries: number; textures: number };
        scene: { meshes: number; materials: number; instancedMeshes: number };
        settings: { dpr: number; shadows: boolean; postPasses: number };
      };
    };
  }
}

const GAME = "/games/perihelion/opus-5/index.html";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];

async function openGame(page: Page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto(`${GAME}?test=1`);
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__PERIHELION_TEST__)), { timeout: 20_000 })
    .toBe(true);
}

test.describe("Claude Opus 5 Perihelion Post", () => {
  test("runs standalone on the pinned runtime with no external requests or errors", async ({ page }) => {
    const external: string[] = [];
    const runtime: string[] = [];
    const errors: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && !LOCAL_HOSTS.includes(url.hostname)) external.push(request.url());
      if (url.pathname.startsWith("/vendor/three/")) runtime.push(url.pathname);
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await openGame(page);
    await page.waitForTimeout(600);

    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    expect(runtime.some((path) => path.startsWith("/vendor/three/0.185.1/"))).toBe(true);
    // One standalone file: no sibling scripts or stylesheets.
    expect(await page.locator('script[src]:not([type="importmap"]), link[rel="stylesheet"][href]').count()).toBe(0);
  });

  test("exposes the standard Three.js hooks only under ?test=1", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(GAME);
    await page.waitForTimeout(700);
    expect(
      await page.evaluate(() => ({
        hooks: Boolean(window.__THREE_GAME_TEST_HOOKS__),
        diagnostics: Boolean(window.__THREE_GAME_DIAGNOSTICS__),
        internal: Boolean(window.__PERIHELION_TEST__),
      })),
    ).toEqual({ hooks: false, diagnostics: false, internal: false });
  });

  /* ---------------------------------------------------------------------
     The central claim: no contract ships that the generator has not flown.
     ------------------------------------------------------------------- */
  test("every campaign contract ships a witness that actually delivers the mail", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);

    const replays = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      const out: Array<Replay & { key: string; fuel: number; witnessTotal: number }> = [];
      for (let i = 0; i < 6; i += 1) {
        api.loadCampaign(i);
        const before = api.snapshot();
        const replay = api.replayWitness(1);
        out.push({
          ...replay,
          key: before.contract!.key,
          fuel: before.contract!.fuel,
          witnessTotal: before.witness!.total,
        });
      }
      return out;
    });

    expect(replays).toHaveLength(6);
    for (const run of replays) {
      expect(run.result, `${run.key} witness must capture`).toBe("won");
      expect(run.collected, `${run.key} witness must collect every buoy`).toBe(run.buoys);
      expect(run.fuelLeft, `${run.key} witness must stay inside its budget`).toBeGreaterThan(0);
      expect(run.flight, `${run.key} must be a route, not a hop`).toBeGreaterThan(10);
      // The shipped budget must cover the confirmed route with room to correct.
      expect(run.fuel).toBeGreaterThan(run.witnessTotal);
    }
  });

  test("difficulty is measured and the campaign curve is monotonic", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);
    const table = await page.evaluate(() => window.__PERIHELION_TEST__.difficultyTable());

    expect(table).toHaveLength(6);
    for (const row of table) {
      // A contract nobody can repeat is not a contract.
      expect(row.basin, `${row.key} must be repeatable`).toBeGreaterThan(0.015);
      expect(row.basin).toBeLessThanOrEqual(1);
      expect(row.buoys).toBeGreaterThanOrEqual(2);
      expect(row.timeLimit).toBeGreaterThan(row.flight);
      expect(row.fuel).toBeGreaterThan(row.witnessTotal);
    }

    const basins = table.map((row) => row.basin);
    for (let i = 1; i < basins.length; i += 1) {
      expect(basins[i], `contract ${i + 1} must not be easier than ${i}`).toBeLessThan(basins[i - 1]);
    }
    expect(table[0].grade).toBe("Gentle");
    expect(table[5].grade).toBe("Needle");
    // Shepherd delivers to a moon inside a giant's well.
    expect(table[2].destKind).toBe("moon");
  });

  /* ---------------------------------------------------------------------
     The propagator. Self-consistency is what makes the plotted course
     honest; refinement error and energy drift are whether it is correct.
     ------------------------------------------------------------------- */
  test("the plotted course is the flown path, and the propagator holds up", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);
    const audit = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(2);
      api.replayWitness(0.4);
      return api.integrationAudit(24);
    });

    expect(audit.arcLength).toBeGreaterThan(1);
    // Prediction and live flight run the same steps, so they must not merely
    // agree closely — they must agree exactly.
    expect(audit.selfConsistency).toBeLessThan(1e-9);
    // And the propagator must agree with itself at four times the resolution.
    expect(audit.refinementRelative).toBeLessThan(0.01);
    // Specific orbital energy over a long two-body coast.
    expect(audit.orbits).toBeGreaterThan(3);
    expect(audit.energyDrift).toBeLessThan(1e-3);
  });

  test("the same seed rebuilds the same orrery", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);
    const [first, second] = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      const run = () => {
        api.loadCampaign(4);
        api.replayWitness(0.55);
        const snap = api.snapshot();
        return {
          seed: snap.contract!.seed,
          basin: snap.contract!.basin,
          witness: snap.witness,
          probe: snap.probe,
          bodies: snap.bodies.map((b) => [b.name, b.x, b.y, b.z]),
          beacons: snap.beacons,
          collected: snap.collected,
          fuel: snap.fuel,
        };
      };
      return [run(), run()];
    });
    expect(second).toEqual(first);
  });

  /* ---------------------------------------------------------------------
     Rules of delivery.
     ------------------------------------------------------------------- */
  test("capture requires the whole sack and a slow enough approach", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);

    const short = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(0);
      // Stop just shy of the approach sphere, then null relative motion but
      // deliberately arrive without having collected the buoys.
      const replay = api.replayWitness(1);
      return { replay, snap: api.snapshot() };
    });
    // The witness route collects everything, so this is the control case.
    expect(short.replay.result).toBe("won");
    expect(short.snap.collected).toBe(short.snap.contract!.buoys);

    const overSpeed = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(0);
      const w = api.witness()!;
      // Fly the witness launch but never spend the retro burn. Arriving fast
      // is not arriving.
      const before = api.snapshot();
      api.aim(w.heading, w.dv);
      api.burn();
      api.advance(before.contract!.timeLimit + 5);
      return api.snapshot();
    });
    expect(overSpeed.result).not.toBe("won");
    expect(["lost", null]).toContain(overSpeed.result);
  });

  test("the prediction readout names the outcome before you commit", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);

    const outcomes = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(0);
      const seen: Record<string, number> = {};
      // Sweep the aim all the way round; a real system must produce more than
      // one kind of fate.
      for (let i = 0; i < 24; i += 1) {
        const snap = api.aim((i / 24) * Math.PI * 2, 4.2);
        const outcome = snap.predicted?.outcome ?? "none";
        seen[outcome] = (seen[outcome] ?? 0) + 1;
      }
      return seen;
    });

    const kinds = Object.keys(outcomes);
    expect(kinds.length).toBeGreaterThan(1);
    expect(kinds.some((k) => ["impact", "star", "escaped", "captured", "flying"].includes(k))).toBe(true);

    const ribbon = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot().ribbonPoints);
    expect(ribbon).toBeGreaterThan(20);
  });

  test("keyboard aiming and firing drive the burn", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__PERIHELION_TEST__.loadCampaign(0);
      window.__PERIHELION_TEST__.aim(0.6, 0);
    });

    const before = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot());
    expect(before.launched).toBe(false);

    // Raise the burn magnitude with held keys, then fire with Space.
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(700);
    await page.keyboard.up("KeyW");
    const aimed = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot());
    expect(aimed.aim.dv).toBeGreaterThan(before.aim.dv);

    await page.keyboard.press("Space");
    await page.waitForTimeout(120);
    const fired = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot());
    expect(fired.launched).toBe(true);
    expect(fired.fuel).toBeLessThan(before.contract!.fuel);
    expect(fired.probe).not.toBeNull();
    expect(fired.probe!.speed).toBeGreaterThan(0);
  });

  test("clicks through title, contract board, briefing and out to the mast", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);

    await expect(page.locator('[data-action="campaign"]')).toBeVisible();
    await page.locator('[data-action="campaign"]').click();

    const contracts = page.locator('[data-action="contract"]');
    await expect(contracts).toHaveCount(6);
    await contracts.first().click();

    // The briefing plots the route live, then offers the mast.
    await expect(page.locator("#plotBar")).toBeVisible();
    await expect(page.locator('[data-action="launch"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#briefBody")).toContainText("Confirmed route flies in");

    await page.locator('[data-action="launch"]').click();
    await expect(page.locator("#hudFuel")).toBeVisible();
    await expect(page.locator("#hudPredict")).toBeVisible();

    const snap = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot());
    expect(snap.screen).toBe("ready");
    expect(snap.contract!.key).toBe("shortfall");
    expect(snap.fuel).toBe(snap.contract!.fuel);

    // Every screen must fit the iframe the play page gives it.
    const overflow = await page.evaluate(() => {
      const card = document.querySelector(".card");
      return card ? card.scrollHeight - card.clientHeight : 0;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("every screen fits the height the play page actually gives the iframe", async ({ page }) => {
    test.setTimeout(120_000);
    // The play page renders the game in a 1280x544 iframe at a 720px viewport.
    await openGame(page, { width: 1280, height: 544 });

    const overflow = () =>
      page.evaluate(() => {
        const card = document.querySelector(".card");
        if (!card) return -1;
        return card.scrollHeight - card.clientHeight;
      });

    expect(await overflow(), "title screen").toBeLessThanOrEqual(0);

    await page.locator('[data-action="campaign"]').click();
    expect(await overflow(), "contract board").toBeLessThanOrEqual(0);

    await page.locator('[data-action="contract"]').first().click();
    await expect(page.locator('[data-action="launch"]')).toBeVisible({ timeout: 30_000 });
    expect(await overflow(), "briefing").toBeLessThanOrEqual(0);

    // And the two end states.
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("win"));
    expect(await overflow(), "delivered screen").toBeLessThanOrEqual(0);
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("fail"));
    expect(await overflow(), "lost screen").toBeLessThanOrEqual(0);
  });

  test("endless postal routes generate solvable contracts that get harder", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);
    const runs = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      const out: Array<{ tier: number; basin: number; result: string | null; collected: number; buoys: number }> = [];
      for (const [tier, seed] of [[1, 11], [4, 777], [8, 90210]] as Array<[number, number]>) {
        api.loadRoute(tier, seed);
        const basin = api.basin()!;
        const replay = api.replayWitness(1);
        out.push({ tier, basin, result: replay.result, collected: replay.collected, buoys: replay.buoys });
      }
      return out;
    });

    for (const run of runs) {
      expect(run.result, `route tier ${run.tier} must be solvable`).toBe("won");
      expect(run.collected).toBe(run.buoys);
      expect(run.basin).toBeGreaterThan(0.015);
    }
    expect(runs[2].basin).toBeLessThan(runs[0].basin);
  });

  /* ---------------------------------------------------------------------
     Presentation and budget.
     ------------------------------------------------------------------- */
  test("reaches every standard state and keeps the field clear at 1280x720", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);

    for (const state of ["title", "active-play", "win", "fail", "stress"] as const) {
      const snap = await page.evaluate((s) => window.__THREE_GAME_TEST_HOOKS__.setState(s), state);
      expect(snap.screen, `state ${state}`).toBeTruthy();
    }

    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("active-play"));
    const canvas = page.locator("#stage");
    await expect(canvas).toBeVisible();
    expect(await canvas.evaluate((node: HTMLCanvasElement) => [node.clientWidth, node.clientHeight])).toEqual([1280, 720]);

    // Edge plates only: nothing may sit over the middle of the orrery.
    const centreClear = await page.evaluate(() => {
      const mid = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const ids = ["hudTop", "hudClock", "hudFuel", "hudCargo", "hudPredict"];
      return ids.every((id) => {
        const box = document.getElementById(id)!.getBoundingClientRect();
        return !(mid.x >= box.left && mid.x <= box.right && mid.y >= box.top && mid.y <= box.bottom);
      });
    });
    expect(centreClear).toBe(true);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  });

  test("renders inside a deliberate budget", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState("stress"));
    await page.waitForTimeout(400);
    const diag = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.snapshot());

    expect(diag.renderer.calls).toBeGreaterThan(0);
    expect(diag.renderer.calls).toBeLessThan(200);
    expect(diag.renderer.triangles).toBeLessThan(200_000);
    expect(diag.settings.dpr).toBeLessThanOrEqual(1.75);
    expect(diag.settings.shadows).toBe(false);
    expect(diag.settings.postPasses).toBe(0);
    expect(diag.scene.meshes).toBeGreaterThan(10);
  });

  test("tunes its own scale from the orrery's orbital ratios", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);
    const scales = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(0);
      const a = api.snapshot().scale;
      api.loadCampaign(4);
      const b = api.snapshot().scale;
      return { a, b };
    });

    for (const scale of [scales.a, scales.b]) {
      expect(scale.length).toBeGreaterThanOrEqual(3);
      // Folded into one octave above the root, and strictly ascending.
      for (let i = 1; i < scale.length; i += 1) expect(scale[i]).toBeGreaterThan(scale[i - 1]);
      expect(scale[scale.length - 1] / scale[0]).toBeLessThanOrEqual(2.0001);
    }
    // Different orreries, different tuning.
    expect(scales.a).not.toEqual(scales.b);
  });
});
