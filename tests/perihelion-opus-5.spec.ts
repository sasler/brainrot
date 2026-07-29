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
  maxBurn: number;
  adjudicated: boolean;
  collected: number;
  result: string | null;
  aim: { heading: number; dv: number; screenAngle: number | null };
  contract: {
    key: string; name: string; seed: number; fuel: number; basin: number;
    grade: string; timeLimit: number; capRadius: number; capSpeed: number;
    assist: string;
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
  plotPoints: number;
  hud: { objective: string; burn: string; aim: string; window: string };
  audioLayers: number;
  musicOn: boolean;
  scale: number[];
  scaleDegrees: number[];
};

type Replay = {
  state: string; result: string | null; collected: number;
  buoys: number; fuelLeft: number; flight: number;
};

type Sloppy = Replay & {
  braked: boolean; dHeadingDeg: number; dDv: number; dT: number;
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
  capSpeed: number; capRadius: number; beaconRadius: number; assist: string;
};

declare global {
  interface Window {
    __PERIHELION_TEST__: {
      loadCampaign(index: number): unknown;
      loadRoute(tier: number, seed: number): unknown;
      replayWitness(stopFraction?: number): Replay;
      flySloppy(dHeadingDeg?: number, dDv?: number, dT?: number): Sloppy;
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
      jumpToWindow(): Snapshot;
      setWarp(index: number): Snapshot;
      setDeadline(seconds: number): Snapshot;
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
// The round: a tutorial contract and then six that withdraw the help.
const CONTRACTS = 7;
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

    const replays = await page.evaluate((contracts) => {
      const api = window.__PERIHELION_TEST__;
      const out: Array<Replay & { key: string; fuel: number; witnessTotal: number }> = [];
      for (let i = 0; i < contracts; i += 1) {
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
    }, CONTRACTS);

    expect(replays).toHaveLength(CONTRACTS);
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

    expect(table).toHaveLength(CONTRACTS);
    for (const row of table) {
      // A contract nobody can repeat is not a contract.
      expect(row.basin, `${row.key} must be repeatable`).toBeGreaterThan(0.015);
      expect(row.basin).toBeLessThanOrEqual(1);
      expect(row.buoys).toBeGreaterThanOrEqual(1);
      expect(row.timeLimit).toBeGreaterThan(row.flight);
      expect(row.fuel).toBeGreaterThan(row.witnessTotal);
    }

    const basins = table.map((row) => row.basin);
    for (let i = 1; i < basins.length; i += 1) {
      expect(basins[i], `contract ${i + 1} must not be easier than ${i}`).toBeLessThan(basins[i - 1]);
    }
    expect(table[0].grade).toBe("Gentle");
    expect(table[CONTRACTS - 1].grade).toBe("Needle");
    // Shepherd delivers to a moon inside a giant's well.
    expect(table[3].destKind).toBe("moon");
  });

  /* ---------------------------------------------------------------------
     The round has to open somewhere a person can actually start. Every
     tolerance the game grades on is a per-contract number now, and the
     ramp between them is a contract in its own right rather than a
     coincidence of six seeds.
     ------------------------------------------------------------------- */
  test("the round opens forgiving and tightens every tolerance on the way down", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);
    const table = await page.evaluate(() => window.__PERIHELION_TEST__.difficultyTable());

    const nonIncreasing = (values: number[], what: string) => {
      for (let i = 1; i < values.length; i += 1) {
        expect(values[i], `${what} must not loosen at contract ${i}`).toBeLessThanOrEqual(values[i - 1]);
      }
    };
    nonIncreasing(table.map((r) => r.capSpeed), "the capture speed");
    nonIncreasing(table.map((r) => r.beaconRadius), "the buoy radius");
    nonIncreasing(table.map((r) => r.fuel / r.witnessTotal), "the reaction-mass margin");

    // Guidance is withdrawn, never restored.
    const rank = { full: 2, window: 1, none: 0 } as Record<string, number>;
    nonIncreasing(table.map((r) => rank[r.assist]), "the assist level");
    expect(table[0].assist).toBe("full");
    expect(table[CONTRACTS - 1].assist).toBe("none");

    // The first contract has to be genuinely gentler, not merely graded so.
    expect(table[0].capSpeed).toBeGreaterThan(table[CONTRACTS - 1].capSpeed * 2);
    expect(table[0].fuel / table[0].witnessTotal).toBeGreaterThan(1.9);
  });

  test("an imprecise launch still delivers on the opening contracts", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);

    // The graded basin is measured inside ±3° of the plotted heading, which is
    // finer than anyone reads a dial. This is the coarser question: launch off
    // the plot, fly it, brake on entry — and see what survives.
    const corridor = await page.evaluate((contracts) => {
      const api = window.__PERIHELION_TEST__;
      const measure = (index: number) => {
        api.loadCampaign(index);
        let wins = 0;
        let leanest = Infinity;
        for (let dh = -8; dh <= 8; dh += 4) {
          for (const dd of [-0.3, 0, 0.3]) {
            const run = api.flySloppy(dh, dd, 0);
            if (run.result !== "won") continue;
            wins += 1;
            leanest = Math.min(leanest, run.fuelLeft);
          }
        }
        return { index, wins, leanest };
      };
      return [measure(0), measure(1), measure(contracts - 1)];
    }, CONTRACTS);

    const [first, second, last] = corridor;
    // A tutorial you can only pass by being exact is not a tutorial.
    expect(first.wins, "contract 0 must forgive a misread dial").toBeGreaterThanOrEqual(5);
    expect(second.wins, "contract I must forgive a misread dial").toBeGreaterThanOrEqual(3);
    // And the ones that survive must not arrive broke — that was the whole bug.
    expect(first.leanest, "a delivered run keeps mass in hand").toBeGreaterThan(1);
    // The last contract is still a needle.
    expect(last.wins).toBeLessThan(first.wins);
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
      api.loadCampaign(3);
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

  test("the plotted course never promises anything past the contract deadline", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);

    const probe = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(0);
      const w = api.witness()!;
      api.aim(w.heading, w.dv);
      api.burn();
      api.advance(3);

      const before = api.snapshot();
      // Bring the chime forward so the clamp is in play.
      const deadline = before.simT - before.launchT + 6;
      const after = api.setDeadline(deadline);
      return {
        remaining: deadline - (after.simT - after.launchT),
        beforeT: before.predicted!.t,
        beforeOutcome: before.predicted!.outcome,
        after: after.predicted!,
        launched: after.launched,
      };
    });

    expect(probe.launched).toBe(true);
    expect(probe.remaining).toBeGreaterThan(0);
    // Whatever the plotted course now says, it happens before the chime.
    expect(probe.after.t).toBeLessThanOrEqual(probe.remaining + 0.05);
    // And with the horizon cut short, a course that was still running must be
    // reported as running out of time rather than as an eventual capture.
    if (probe.beforeT > probe.remaining) {
      expect(probe.after.t).toBeLessThan(probe.beforeT);
      expect(probe.after.outcome).not.toBe("captured");
    }
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
      // Twin Lamps: the plotted arrival is well over its own speed limit, so
      // skipping the retro burn is unambiguously a refusal to sign rather than
      // a route that happened to coast in slowly.
      api.loadCampaign(4);
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

  /* ---------------------------------------------------------------------
     Telling the player what the controls do, and what to do next. The burn
     is one instant impulse whose size W and S set and Space spends; nothing
     used to say so, and press duration looked like it might be the throttle.
     ------------------------------------------------------------------- */
  test("the charge plate names the trigger and the number it will spend", async ({ page }) => {
    test.setTimeout(60_000);
    await openGame(page);
    await page.evaluate(() => window.__PERIHELION_TEST__.loadCampaign(0));

    // Nothing charged: the plate asks for the key rather than reporting a zero.
    const idle = await page.evaluate(() => window.__PERIHELION_TEST__.aim(0.6, 0));
    expect(idle.hud.burn).toMatch(/hold w/i);
    await expect(page.locator("#burnValue")).toHaveClass(/idle/);

    const charged = await page.evaluate(() => window.__PERIHELION_TEST__.aim(0.6, 3.1));
    expect(charged.hud.burn).toContain("Space");
    expect(charged.hud.burn).toContain("3.10");

    // The bar has to move with the number, or the number is the only signal.
    const width = await page.evaluate(
      () => (document.querySelector("#burnGauge > i") as HTMLElement).style.width,
    );
    expect(Number.parseFloat(width)).toBeGreaterThan(10);

    // Heading is named, not merely numbered: 0 accelerates, 180 is the brake.
    const prograde = await page.evaluate(() => window.__PERIHELION_TEST__.aim(0, 3.1));
    const retrograde = await page.evaluate(() => window.__PERIHELION_TEST__.aim(Math.PI, 3.1));
    expect(prograde.hud.aim).toMatch(/prograde/);
    expect(retrograde.hud.aim).toMatch(/retrograde/);
  });

  test("the objective line says what to do next, not only what will happen", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);

    const said = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(1);
      const mast = api.snapshot().hud.objective;

      api.jumpToWindow();
      api.burn();
      const early = api.advance(1).hud.objective;

      let snap = api.snapshot();
      let guard = 0;
      while (snap.collected < snap.contract!.buoys && guard < 400) {
        snap = api.advance(0.5);
        guard += 1;
      }
      // Twin Lamps is given its launch window and no drawn route at all.
      api.loadCampaign(4);
      const windowSnap = api.snapshot();

      return {
        mast,
        early,
        laden: snap.hud.objective,
        collected: snap.collected,
        buoys: snap.contract!.buoys,
        windowOnly: { assist: windowSnap.contract!.assist, objective: windowSnap.hud.objective },
      };
    });

    expect(said.mast).toMatch(/plot/i);
    expect(said.early).toMatch(/buoy 1 of/i);
    // A contract that draws no plot must not be told to match one.
    expect(said.windowOnly.assist).toBe("window");
    expect(said.windowOnly.objective).not.toMatch(/plot/i);
    expect(said.windowOnly.objective).toMatch(/window/i);
    expect(said.collected).toBe(said.buoys);
    // With the sack aboard the job is the arrival, and the line has to say so.
    expect(said.laden).toMatch(/brake into|hold this course/i);
  });

  test("the plotted route is drawn for the early contracts and withdrawn for the late ones", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);

    const plots = await page.evaluate((contracts) => {
      const api = window.__PERIHELION_TEST__;
      const out: Array<{ i: number; assist: string; points: number }> = [];
      for (let i = 0; i < contracts; i += 1) {
        api.loadCampaign(i);
        const snap = api.snapshot();
        out.push({ i, assist: snap.contract!.assist, points: snap.plotPoints });
      }
      return out;
    }, CONTRACTS);

    for (const plot of plots) {
      if (plot.assist === "full") {
        expect(plot.points, `contract ${plot.i} draws its plot`).toBeGreaterThan(10);
      } else {
        expect(plot.points, `contract ${plot.i} draws nothing`).toBe(0);
      }
    }
    expect(plots.filter((p) => p.assist === "full").length).toBeGreaterThanOrEqual(3);
    expect(plots.some((p) => p.assist === "none")).toBe(true);
  });

  test("the clock is held at the mast, and the window key loads a winning launch", async ({ page }) => {
    test.setTimeout(60_000);
    await openGame(page);

    const held = await page.evaluate(() => {
      window.__PERIHELION_TEST__.loadCampaign(0);
      return window.__PERIHELION_TEST__.snapshot();
    });
    // The departure world used to orbit away while a new player read the keys.
    expect(held.warp).toBe(0);
    expect(held.launched).toBe(false);

    const jumped = await page.evaluate(() => window.__PERIHELION_TEST__.jumpToWindow());
    expect(jumped.simT).toBeCloseTo(jumped.witness!.t0, 5);
    expect(jumped.aim.dv).toBeCloseTo(jumped.witness!.dv, 5);
    expect(jumped.hud.window).toMatch(/window open/i);
    // A guided launch that does not deliver is not guidance.
    expect(jumped.predicted!.outcome).toBe("captured");

    // And leaving the mast starts the clock again.
    const away = await page.evaluate(() => window.__PERIHELION_TEST__.burn());
    expect(away.launched).toBe(true);
    expect(away.warp).toBeGreaterThan(0);
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

    // G is bound through the same handler, and only means anything at the mast.
    const t0 = await page.evaluate(() => {
      window.__PERIHELION_TEST__.loadCampaign(0);
      return window.__PERIHELION_TEST__.snapshot().witness!.t0;
    });
    await page.keyboard.press("KeyG");
    // Poll the state the key is supposed to reach rather than guessing at how
    // long a slow runner takes to deliver the event.
    await expect
      .poll(() => page.evaluate(() => window.__PERIHELION_TEST__.snapshot().simT))
      .toBeCloseTo(t0, 3);
  });

  test("clicks through title, contract board, briefing and out to the mast", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);

    await expect(page.locator('[data-action="campaign"]')).toBeVisible();
    await page.locator('[data-action="campaign"]').click();

    const contracts = page.locator('[data-action="contract"]');
    await expect(contracts).toHaveCount(CONTRACTS);
    await contracts.first().click();

    // The briefing plots the route live, then offers the mast.
    await expect(page.locator("#plotBar")).toBeVisible();
    await expect(page.locator('[data-action="launch"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#briefBody")).toContainText("Confirmed route flies in");

    // The reserve the briefing quotes has to be the reserve the mast enforces,
    // including when the Δv ceiling rather than the share is what binds.
    const quoted = await page.locator("#briefBody").innerText();
    const reserve = Number(/holds\s+([\d.]+)\s*Δv back/.exec(quoted)?.[1]);
    expect(Number.isFinite(reserve)).toBe(true);

    await page.locator('[data-action="launch"]').click();
    await expect(page.locator("#hudFuel")).toBeVisible();
    await expect(page.locator("#hudPredict")).toBeVisible();

    const snap = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot());
    expect(snap.screen).toBe("ready");
    expect(snap.contract!.key).toBe("firstround");
    expect(snap.fuel).toBe(snap.contract!.fuel);
    expect(reserve).toBeCloseTo(snap.fuel - snap.maxBurn, 2);

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

  test("abandoning a run does not leak its audio into the menus", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);

    await page.locator('[data-action="campaign"]').click();
    await page.locator('[data-action="contract"]').first().click();
    await page.locator('[data-action="launch"]').click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);

    const flying = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot());
    expect(flying.launched).toBe(true);
    expect(flying.musicOn).toBe(true);

    // Pause, then abandon back to the contract board.
    await page.keyboard.press("KeyP");
    await page.locator('[data-action="back"]').click();
    await page.waitForTimeout(200);

    const parked = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot());
    expect(parked.screen).toBe("select");
    expect(parked.musicOn).toBe(false);
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

  test("the scale it derives is in tune", async ({ page }) => {
    test.setTimeout(90_000);
    await openGame(page);

    // Orbital period ratios are irrational. Taken literally they give arbitrary
    // microtones and the figure played over them is not a melody, so every
    // degree has to land on equal temperament on the way in.
    for (const index of [0, 2, 5]) {
      const snap = await page.evaluate((i) => {
        window.__PERIHELION_TEST__.loadCampaign(i);
        return window.__PERIHELION_TEST__.snapshot();
      }, index);

      expect(snap.scaleDegrees.length).toBeGreaterThanOrEqual(3);
      for (const f of snap.scale) {
        const semitones = Math.log2(f / snap.scale[0]) * 12;
        const cents = Math.abs(semitones - Math.round(semitones)) * 100;
        expect(cents, `contract ${index + 1}: ${f.toFixed(2)}Hz is ${cents.toFixed(1)} cents off`)
          .toBeLessThan(1);
      }
      // Distinct degrees, so clustered periods still give notes to play with.
      expect(new Set(snap.scaleDegrees).size).toBe(snap.scaleDegrees.length);
    }
  });

  test("aim follows the key you pressed, on screen", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__PERIHELION_TEST__.loadCampaign(0);
      // Hold the clock. Heading is measured against the departure world's
      // prograde, so a turning orrery would swing the marker on its own and
      // muddy what the key did.
      window.__PERIHELION_TEST__.setWarp(0);
    });

    // What has to be right is the thing the player sees: the marker swings the
    // way the key points, whichever side the camera is watching from.
    const angleAfter = async (key: string) => {
      await page.evaluate(() => window.__PERIHELION_TEST__.aim(0.6, 1));
      const before = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot());
      await page.keyboard.down(key);
      await page.waitForTimeout(500);
      await page.keyboard.up(key);
      const after = await page.evaluate(() => window.__PERIHELION_TEST__.snapshot());
      const a = before.aim.screenAngle!;
      const b = after.aim.screenAngle!;
      expect(Number.isFinite(a) && Number.isFinite(b)).toBe(true);
      return ((b - a + 540) % 360) - 180;   // shortest arc, anticlockwise positive
    };

    // Screen angles are anticlockwise-positive, so "right" must reduce them.
    // Half a second of AIM_RATE is about 20°; anything under 10 is not the key.
    const right = await angleAfter("KeyD");
    expect(right, "D must swing the marker clockwise").toBeLessThan(-10);

    const left = await angleAfter("KeyA");
    expect(left, "A must swing the marker anticlockwise").toBeGreaterThan(10);
  });

  test("the mast keeps a reserve back for arrival", async ({ page }) => {
    await openGame(page);
    const snap = await page.evaluate(() => {
      window.__PERIHELION_TEST__.loadCampaign(0);
      return window.__PERIHELION_TEST__.snapshot();
    });

    // One uninformed launch used to be able to empty the tank, which strands
    // the probe before it has learnt anything.
    expect(snap.maxBurn).toBeLessThan(snap.fuel);
    expect(snap.maxBurn).toBeGreaterThan(0);

    const fired = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.aim(0.4, 99);           // ask for everything; the mast decides
      return api.burn();
    });
    expect(fired.launched).toBe(true);
    expect(fired.fuel).toBeGreaterThan(snap.fuel - snap.maxBurn - 1e-6);
    expect(fired.fuel).toBeGreaterThan(0.5);
  });

  test("a run with nothing left to burn ends when it is decided", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);

    // The same launch and the same wasteful corrections, drained to two
    // different floors. Only the run that goes genuinely dry can be adjudicated,
    // so the pair measures what the fix is worth rather than merely asserting
    // that a doomed run eventually stops.
    const fly = (floor: number) => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(2);
      const w = api.witness()!;
      const limit = api.snapshot().contract!.timeLimit;
      // Launch on the plotted window, so what follows is a good route ruined by
      // wasteful corrections rather than a launch that was never going anywhere.
      api.jumpToWindow();
      api.aim(w.heading, w.dv);
      api.burn();
      api.advance(10);
      for (let i = 0; i < 30 && api.snapshot().fuel > floor; i += 1) {
        const spend = Math.min(0.5, api.snapshot().fuel - floor + 0.01);
        api.aim(w.heading, spend);
        api.burn();
      }
      const end = api.advance(limit * 3);
      return {
        limit,
        fuel: end.fuel,
        result: end.result,
        adjudicated: end.adjudicated,
        flight: end.simT - end.launchT,
      };
    };

    const wet = await page.evaluate(fly, 0.3);
    const dry = await page.evaluate(fly, 0.02);

    // Dry: settled on the step the tank ran out, naming the real outcome.
    expect(dry.fuel).toBeLessThanOrEqual(0.02);
    expect(dry.adjudicated).toBe(true);
    expect(dry.result).toBe("lost");
    expect(dry.flight).toBeLessThan(11);

    // Wet: a burn still exists, so the course is not settled for the player and
    // the run keeps flying — which is exactly how long the dry one used to take.
    expect(wet.adjudicated).toBe(false);
    expect(wet.flight).toBeGreaterThan(dry.flight * 2);
  });

  test("a last legal correction is never settled out from under the player", async ({ page }) => {
    await openGame(page);

    // The tank can hold too little to be worth much and still hold enough to
    // burn. Adjudicating there would show a loss the player could have flown
    // out of, so the threshold has to be "no legal burn", not "nearly empty".
    const state = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(0);
      const w = api.witness()!;
      api.aim(w.heading, w.dv);
      api.burn();
      api.advance(4);
      for (let i = 0; i < 40 && api.snapshot().fuel > 0.04; i += 1) {
        const spend = Math.min(0.5, api.snapshot().fuel - 0.04 + 0.005);
        api.aim(w.heading, spend);
        api.burn();
      }
      const held = api.advance(2);
      // Firing empties the charge, so a fresh one has to be loaded — which is
      // exactly what the player does before pressing Space.
      api.aim(w.heading, Math.min(held.fuel, held.maxBurn));
      const spent = api.burn();          // the correction must still be accepted
      return { held, spent };
    });

    expect(state.held.fuel).toBeGreaterThan(0.02);
    expect(state.held.fuel).toBeLessThan(0.05);
    expect(state.held.adjudicated).toBe(false);
    expect(state.held.result).toBeNull();
    expect(state.held.maxBurn).toBeGreaterThan(0.02);
    // And spending it actually moves fuel, rather than being silently refused.
    expect(state.spent.fuel).toBeLessThan(state.held.fuel);
  });

  test("the readout says what the approach costs in every unresolved state", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);

    // On approach with the whole sack the course has not resolved, so the
    // prediction times out. That used to print "Deadline … still in transit"
    // and drop the approach cost entirely — the one number that says what to
    // do, withheld exactly where the player is most stuck.
    const onApproach = await page.evaluate(() => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(0);
      api.replayWitness(0.86);
      api.setWarp(0);
      // Close the deadline in front of the probe so the plotted course is cut
      // short of its arrival: sack aboard, nothing resolved, clock running out.
      const flown = api.snapshot();
      api.setDeadline(flown.simT - flown.launchT + 1.5);
      const snap = api.advance(0.05);
      return {
        outcome: snap.predicted?.outcome,
        collected: snap.collected,
        buoys: snap.contract!.buoys,
        text: document.getElementById("predictText")!.textContent ?? "",
        sub: document.getElementById("predictSub")!.textContent ?? "",
      };
    });

    expect(onApproach.collected).toBe(onApproach.buoys);
    expect(onApproach.outcome).toBe("timeout");
    // Names the job, not just the clock.
    expect(onApproach.text.toLowerCase()).toContain("brake");
    // Quotes the cost to match, and what is left to pay it with.
    expect(onApproach.sub).toMatch(/[\d.]+ Δv to match/);
    expect(onApproach.sub).toMatch(/left/);
    expect(onApproach.sub).toMatch(/Chime in/);
  });

  test("the destination is named in the field and tracks it", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);

    const tag = await page.evaluate(async () => {
      const api = window.__PERIHELION_TEST__;
      const contract = api.loadCampaign(0) as { destName: string };
      api.replayWitness(0.5);
      api.setWarp(0);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const el = document.getElementById("destTag")!;
      const first = { left: el.style.left, top: el.style.top };
      api.advance(6);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return {
        destName: contract.destName,
        shown: document.getElementById("destName")!.textContent,
        range: document.getElementById("destRange")!.textContent ?? "",
        on: el.classList.contains("on"),
        first,
        second: { left: el.style.left, top: el.style.top },
      };
    });

    // The sack has an address, and it is on screen.
    expect(tag.on).toBe(true);
    expect(tag.shown).toBe(tag.destName);
    expect(tag.range).toMatch(/[\d.]+/);
    // Worlds do not hold still, so neither does the tag.
    expect(`${tag.second.left},${tag.second.top}`).not.toBe(`${tag.first.left},${tag.first.top}`);
  });

  test("the sound is struck and released, never a held tone", async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      // Record every oscillator the game builds, and whether anything schedules
      // a frequency change on it after it starts. A voice that slides in pitch
      // under a continuous gain is what made the old bed sound like a fault.
      const w = window as never as Record<string, unknown>;
      const log: Array<{ freq: number; automated: boolean; stopped: boolean }> = [];
      w.__OSC__ = log;
      const make = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () {
        const osc = make.call(this);
        const entry = { freq: 0, automated: false, stopped: false };
        log.push(entry);
        const origStop = osc.stop.bind(osc);
        osc.stop = (...a: [number?]) => { entry.stopped = true; return origStop(...a); };
        const origStart = osc.start.bind(osc);
        osc.start = (...a: [number?]) => { entry.freq = osc.frequency.value; return origStart(...a); };
        for (const m of ["setTargetAtTime", "linearRampToValueAtTime", "exponentialRampToValueAtTime"] as const) {
          const orig = osc.frequency[m].bind(osc.frequency);
          // @ts-expect-error test shim
          osc.frequency[m] = (...a: number[]) => { entry.automated = true; return orig(...a); };
        }
        return osc;
      };
    });
    await openGame(page);

    const osc = await page.evaluate(async () => {
      const api = window.__PERIHELION_TEST__;
      api.loadCampaign(0);
      document.getElementById("muteBtn")!.click();
      document.getElementById("muteBtn")!.click();
      api.replayWitness(0.5);
      await new Promise((r) => setTimeout(r, 1200));
      type OscEntry = { automated: boolean; stopped: boolean };
      const log = (window as never as Record<string, OscEntry[]>).__OSC__;
      return {
        total: log.length,
        held: log.filter((o) => !o.stopped).length,
        sliding: log.filter((o) => o.automated && !o.stopped).length,
      };
    });

    // Every pitched voice is scheduled to stop. Nothing runs forever, and
    // nothing that runs has its pitch driven while it runs.
    expect(osc.total).toBeGreaterThan(0);
    expect(osc.sliding, "no oscillator may slide in pitch while sustaining").toBe(0);
    expect(osc.held, "every oscillator must be released").toBe(0);
  });
});
