import { expect, test, type Page } from "@playwright/test";

const GAME = "/games/outrun-racer/opus-5/index.html";

type Snapshot = {
  mode: string;
  seed: number;
  raceTime: number;
  assetsReady: boolean;
  track: {
    lines: number; nodes: number; laps: number; gates: number;
    branches: number; bollards: number; length: number; startLineS: number; style: string;
  };
  player: {
    line: number; s: number; lateral: number; halfWidth: number; speed: number;
    charge: number; boosting: boolean; tucking: boolean; airborne: boolean; hop: number;
    lap: number; rank: number; gates: number; progress: number; finished: boolean;
    branch: string | null; edgeStreak: number; bank: number; upY: number; sector: number;
  };
  racers: Array<{
    id: string; ai: boolean; line: number; lap: number; rank: number;
    speed: number; charge: number; progress: number; finished: boolean;
    traits: { aggression: number; discipline: number; reflex: number; grip: number };
  }>;
  economy: { edge: number; gate: number; prop: number; draft: number; spent: number };
  stats: { topSpeed: number; gatesThreaded: number; bestLap: number; longestEdge: number; chargeEarned: number };
  objects: { assetRoots: string[]; particles: number; towers: number; anchors: number };
};

type Diagnostics = {
  renderer: { calls: number; triangles: number; geometries: number; textures: number };
  scene: { meshes: number; materials: number; instancedMeshes: number };
  settings: { dpr: number; shadows: boolean; postPasses: number; audioPaused: boolean };
};

/**
 * Scoped to this spec rather than declared globally: several existing specs
 * already augment `Window` with their own incompatible hook signatures, and
 * adding another would only deepen that conflict.
 */
type SkyweaveWindow = Window & {
  __THREE_GAME_TEST_HOOKS__: {
    seed(seed: number): Snapshot;
    setState(state: "title" | "active-play" | "fail" | "win" | "stress"): Snapshot;
    advance(seconds: number): Snapshot;
    snapshot(): Snapshot;
  };
  __THREE_GAME_DIAGNOSTICS__: { snapshot(): Diagnostics };
  __SKYWEAVE_TEST__: {
    placeAt(line: number, distance: number, lateral?: number): Snapshot;
    placeInverted(): Snapshot;
    setSpeed(v: number): Snapshot;
    setCharge(c: number): Snapshot;
    press(code: string, down?: boolean): Snapshot;
    release(): Snapshot;
    hop(): Snapshot;
    boost(): Snapshot;
    holdCentre(seconds: number, opts?: { tuck?: boolean; boost?: boolean; throttle?: number; brake?: number }): Snapshot;
    setEdgeRide(): Snapshot;
    threadGate(centred?: boolean): Snapshot;
    setDraft(): Snapshot;
    setScrape(): Snapshot;
    takeBranch(which?: number): Snapshot;
    runBranch(which?: number): { entered: number; exited: number; s: number; snapshot: Snapshot };
    finishRace(rank?: number): Snapshot;
    trackReport(): {
      length: number; samples: number; maxBank: number; minBank: number;
      invertedSamples: number; startLineS: number;
      branchLengths: Array<{ name: string; raced: number; mainSpan: number }>;
      junctions: Array<{
        line: number; name: string; forkSide: number; mergeSide: number;
        mainEnter: number; mainExit: number; enterS: number; exitS: number;
      }>;
    };
    junctionReport(): Array<{
      name: string; forkSide: number; mergeSide: number; screenSide: number;
      enter: { bankGap: number; upGap: number; widthGap: number };
      exit: { bankGap: number; upGap: number; widthGap: number };
      undrawn: number;
    }>;
    propReport(): {
      worst: Record<string, number>;
      placed: Record<string, number>;
      degenerate: number;
      junctionTrusses: number;
      anchorsInJunction: number;
      bollardsInGore: number;
      branchGatesInGore: number;
    };
  };
};

async function openGame(page: Page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${GAME}?test=1`);
  await expect(page.locator("#startButton")).toBeEnabled({ timeout: 25_000 });
  await expect
    .poll(() => page.evaluate(() => Boolean((window as unknown as SkyweaveWindow).__THREE_GAME_TEST_HOOKS__)), {
      timeout: 25_000,
    })
    .toBe(true);
}

/** Reset to a clean, stationary start on the main line for a focused probe. */
async function primed(page: Page, seed = 7) {
  return page.evaluate((s) => {
    const w = window as unknown as SkyweaveWindow;
    w.__THREE_GAME_TEST_HOOKS__.seed(s);
    w.__THREE_GAME_TEST_HOOKS__.setState("active-play");
    w.__SKYWEAVE_TEST__.release();
    w.__SKYWEAVE_TEST__.placeAt(0, 300, 0);
    w.__SKYWEAVE_TEST__.setSpeed(0);
    return w.__SKYWEAVE_TEST__.setCharge(0);
  }, seed);
}

test.describe("Claude Opus 5 Neon Horizon Racer: Skyweave", () => {
  test("loads the pinned runtime and Blender-authored assets without external requests", async ({ page }) => {
    const external: string[] = [];
    const errors: string[] = [];
    const assets: string[] = [];
    const runtime: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
        external.push(request.url());
      }
      if (url.pathname.includes("/assets/")) assets.push(url.pathname);
      if (url.pathname.startsWith("/vendor/three/")) runtime.push(url.pathname);
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

    await openGame(page);

    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    expect(runtime).toEqual(expect.arrayContaining(["/vendor/three/0.185.1/three.module.min.js"]));
    expect(assets).toEqual(expect.arrayContaining([
      "/games/outrun-racer/opus-5/assets/skyweave-fleet.glb",
      "/games/outrun-racer/opus-5/assets/skyweave-structures.glb",
    ]));

    const snapshot = await page.evaluate(() =>
      (window as unknown as SkyweaveWindow).__THREE_GAME_TEST_HOOKS__.snapshot());
    expect(snapshot.assetsReady).toBe(true);
    expect(snapshot.objects.assetRoots).toEqual(expect.arrayContaining([
      "PlayerSkiff", "RivalLance", "RivalDelta", "RivalHauler",
      "GateArch", "BranchPylon", "RibbonAnchor", "CanopyTruss", "HazardBollard",
      "TowerBlock_A", "TowerBlock_B", "TowerBlock_C",
    ]));
    // one standalone file: no external scripts or stylesheets beyond the importmap
    expect(await page.locator('script[src]:not([type="importmap"]), link[rel="stylesheet"][href]').count()).toBe(0);
  });

  test("keeps deterministic mutation controls private in normal play", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(GAME);
    await expect(page.locator("#startButton")).toBeEnabled({ timeout: 25_000 });
    expect(await page.evaluate(() => "__THREE_GAME_TEST_HOOKS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__THREE_GAME_DIAGNOSTICS__" in window)).toBe(false);
    expect(await page.evaluate(() => "__SKYWEAVE_TEST__" in window)).toBe(false);
  });

  test("builds a closed ribbon circuit that rolls through full inversion", async ({ page }) => {
    await openGame(page);
    const { snapshot, report } = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      return {
        snapshot: w.__THREE_GAME_TEST_HOOKS__.setState("active-play"),
        report: w.__SKYWEAVE_TEST__.trackReport(),
      };
    });

    expect(snapshot.mode).toBe("race");
    expect(snapshot.track.style).toBe("suspended-ribbon-circuit");
    expect(snapshot.track.lines).toBe(3);
    expect(snapshot.track.branches).toBe(2);
    expect(snapshot.track.laps).toBe(3);
    expect(snapshot.track.gates).toBeGreaterThanOrEqual(9);
    expect(snapshot.track.bollards).toBeGreaterThan(10);
    expect(snapshot.track.length).toBeGreaterThan(2000);
    expect(snapshot.racers).toHaveLength(4);
    expect(snapshot.racers.filter((r) => r.ai)).toHaveLength(3);

    // Two authored corkscrews, so the deck genuinely passes overhead.
    expect(report.maxBank).toBeGreaterThan(Math.PI * 1.8);
    expect(report.invertedSamples).toBeGreaterThan(40);
    expect(report.branchLengths).toHaveLength(2);
    for (const branch of report.branchLengths) expect(branch.raced).toBeGreaterThan(100);
  });

  test("a full race covers three complete circuits", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      H.seed(5);
      H.setState("title");
      (document.getElementById("startButton") as HTMLButtonElement).click();
      const opening = H.snapshot();
      const laps: number[] = [];
      let previous = opening.player.lap;
      let guard = 0;
      let snap = opening;
      while (snap.mode !== "finished" && guard++ < 90) {
        snap = T.holdCentre(4);
        if (snap.player.lap !== previous) { laps.push(snap.player.lap); previous = snap.player.lap; }
      }
      return {
        openingS: opening.player.s,
        openingLap: opening.player.lap,
        laps,
        finished: snap.player.finished,
        circuits: snap.player.progress / snap.track.length,
        bestLap: snap.stats.bestLap,
        raceTime: snap.raceTime,
      };
    });

    // The grid must line up past the start line; behind it, the opening
    // crossing would bank a lap that was never raced.
    expect(result.openingS).toBeGreaterThan(0);
    expect(result.openingLap).toBe(1);
    expect(result.laps).toEqual([2, 3, 4]);
    expect(result.finished).toBe(true);
    expect(result.circuits).toBeGreaterThan(2.9);
    expect(result.circuits).toBeLessThan(3.3);
    expect(result.bestLap).toBeGreaterThan(5);
    expect(result.raceTime).toBeGreaterThan(result.bestLap * 2);
  });

  test("seeding rebuilds the world reproducibly", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const run = (seed: number) => {
        w.__THREE_GAME_TEST_HOOKS__.seed(seed);
        w.__THREE_GAME_TEST_HOOKS__.setState("active-play");
        w.__SKYWEAVE_TEST__.release();
        // Throttle only. Holding a steer key pins the craft against a rail,
        // where the run saturates and stops sampling the seeded hazard
        // scatter it is supposed to be probing.
        w.__SKYWEAVE_TEST__.press("KeyW");
        const snap = w.__THREE_GAME_TEST_HOOKS__.advance(6);
        w.__SKYWEAVE_TEST__.release();
        return snap;
      };
      const a = run(11);
      const b = run(11);
      const c = run(12);
      return {
        sameSeed: JSON.stringify(a.player) === JSON.stringify(b.player),
        differentSeed: JSON.stringify(a.player) !== JSON.stringify(c.player),
        traitsA: a.racers.map((r) => r.traits.reflex),
        traitsC: c.racers.map((r) => r.traits.reflex),
        seedEcho: c.seed,
      };
    });
    expect(result.sameSeed).toBe(true);
    expect(result.differentSeed).toBe(true);
    expect(result.seedEcho).toBe(12);
    expect(result.traitsA).not.toEqual(result.traitsC);
  });

  test("throttle builds speed and steering moves the craft both ways", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      const reset = () => {
        H.seed(7); H.setState("active-play"); T.release();
        T.placeAt(0, 300, 0); T.setSpeed(0); T.setCharge(0);
      };
      reset();
      T.press("KeyW");
      const rolling = H.advance(6).player.speed;
      T.press("KeyD");
      const right = H.advance(1.4).player.lateral;
      T.press("KeyD", false);
      T.press("KeyA");
      const left = H.advance(2.4).player.lateral;
      T.release();
      const braked = H.advance(0).player.speed;
      T.press("KeyS");
      const afterBrake = H.advance(1.5).player.speed;
      T.release();
      return { rolling, right, left, braked, afterBrake };
    });
    expect(result.rolling).toBeGreaterThan(30);
    expect(result.right).toBeGreaterThan(1);
    expect(result.left).toBeLessThan(result.right);
    expect(result.afterBrake).toBeLessThan(result.braked);
  });

  test("tucking raises the ceiling and costs steering authority", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      const reset = () => {
        H.seed(7); H.setState("active-play"); T.release();
        T.placeAt(0, 300, 0); T.setSpeed(0); T.setCharge(0);
      };
      // Terminal speed is measured on the centre line: 25 s of lateral drift
      // would otherwise pin the craft to a rail and mask the tuck ceiling.
      reset();
      const plain = T.holdCentre(25).player.speed;
      reset();
      const tucked = T.holdCentre(25, { tuck: true }).player;
      reset();
      const boosted = T.holdCentre(25, { boost: true }).player.speed;

      reset();
      T.press("KeyW"); H.advance(10); T.press("KeyD");
      const openSteer = Math.abs(H.advance(1.5).player.lateral);
      reset();
      T.press("KeyW"); T.press("ShiftLeft"); H.advance(10); T.press("KeyD");
      const tuckSteer = Math.abs(H.advance(1.5).player.lateral);
      T.release();
      return { plain, tucked: tucked.speed, tucking: tucked.tucking, boosted, openSteer, tuckSteer };
    });
    expect(result.tucking).toBe(true);
    expect(result.tucked).toBeGreaterThan(result.plain);
    expect(result.boosted).toBeGreaterThan(result.tucked);
    expect(result.tuckSteer).toBeLessThan(result.openSteer);
  });

  test("hopping leaves the deck and lands again", async ({ page }) => {
    await openGame(page);
    await primed(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      T.press("KeyW");
      H.advance(6);
      const launched = T.hop().player;
      const mid = H.advance(0.2).player;
      const landed = H.advance(1.4).player;
      T.release();
      return { launched, mid, landed };
    });
    expect(result.launched.airborne).toBe(true);
    expect(result.mid.hop).toBeGreaterThan(0.2);
    expect(result.landed.airborne).toBe(false);
    expect(result.landed.hop).toBe(0);
  });

  test("each charge source credits only itself and boost spends the meter", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      const reset = () => {
        H.seed(7); H.setState("active-play"); T.release();
        T.placeAt(0, 300, 0); T.setSpeed(0); T.setCharge(0);
      };
      reset(); const edge = T.setEdgeRide().economy;
      reset(); const centred = T.threadGate(true);
      reset(); const offCentre = T.threadGate(false).economy;
      reset(); const draft = T.setDraft().economy;

      reset();
      T.press("KeyW");
      H.advance(12);
      T.setCharge(1);
      const before = H.snapshot().player;
      T.press("Space");
      const boosted = H.advance(2.5);
      T.release();
      return { edge, centred: centred.economy, gates: centred.player.gates, offCentre, draft, before, boosted };
    });

    expect(result.edge.edge).toBeGreaterThan(0);
    expect(result.edge.gate).toBe(0);
    expect(result.centred.gate).toBeGreaterThan(0);
    expect(result.gates).toBeGreaterThan(0);
    // A centred thread pays more than a shoulder-of-the-arch one.
    expect(result.centred.gate).toBeGreaterThan(result.offCentre.gate);
    expect(result.draft.draft).toBeGreaterThan(0);

    expect(result.boosted.player.boosting).toBe(true);
    expect(result.boosted.player.speed).toBeGreaterThan(result.before.speed);
    expect(result.boosted.player.charge).toBeLessThan(1);
    expect(result.boosted.economy.spent).toBeGreaterThan(0);
  });

  test("rail contact scrubs speed but the run always recovers", async ({ page }) => {
    await openGame(page);
    await primed(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      T.press("KeyW");
      const before = H.advance(10).player.speed;
      const scraped = T.setScrape().player;
      const recovered = H.advance(5).player;
      T.release();
      return { before, scraped, recovered, mode: H.snapshot().mode };
    });
    expect(result.mode).toBe("race");
    expect(result.scraped.finished).toBe(false);
    expect(Math.abs(result.recovered.lateral)).toBeLessThanOrEqual(result.recovered.halfWidth);
    expect(result.recovered.speed).toBeGreaterThan(result.before * 0.5);
    expect(Number.isFinite(result.recovered.speed)).toBe(true);
  });

  test("the craft stays mag-locked through a full inversion", async ({ page }) => {
    await openGame(page);
    await primed(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      const placed = T.placeInverted().player;
      T.press("KeyW");
      const after = H.advance(0.8).player;
      T.release();
      return { placed, after };
    });
    expect(result.placed.upY).toBeLessThan(-0.7);
    expect(Math.abs(result.placed.lateral)).toBeLessThanOrEqual(result.placed.halfWidth);
    expect(Number.isFinite(result.after.lateral)).toBe(true);
    expect(Number.isFinite(result.after.speed)).toBe(true);
    expect(Math.abs(result.after.lateral)).toBeLessThanOrEqual(result.after.halfWidth);
  });

  test("both branch lines fork away and rejoin the main circuit", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      const run = (which: number) => {
        H.seed(7); H.setState("active-play"); T.release();
        const r = T.runBranch(which);
        return { entered: r.entered, exited: r.exited, branch: r.snapshot.player.branch };
      };
      return { one: run(1), two: run(2) };
    });
    expect(result.one.entered).toBe(1);
    expect(result.one.exited).toBe(0);
    expect(result.two.entered).toBe(2);
    expect(result.two.exited).toBe(0);
    expect(result.one.branch).toBeNull();
  });

  test("the fork prompt names the side the branch actually leaves on", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      H.seed(7);
      H.setState("active-play");
      T.release();
      const junctions = T.trackReport().junctions;
      const prompts = junctions.map((j) => {
        // Sit far enough back that the prompt is up, then read what it says.
        T.placeAt(0, j.mainEnter - 60, 0);
        T.setSpeed(58);
        return {
          name: j.name,
          forkSide: j.forkSide,
          hint: document.getElementById("branchHint")?.textContent ?? "",
          shown: document.getElementById("branchPrompt")?.classList.contains("show") ?? false,
          named: document.getElementById("branchName")?.textContent ?? "",
        };
      });
      return { prompts, geometry: T.junctionReport() };
    });

    for (const prompt of result.prompts) {
      expect(prompt.shown).toBe(true);
      expect(prompt.named).toBe(prompt.name);
      expect(prompt.hint).toContain(prompt.forkSide > 0 ? "right" : "left");
      expect(prompt.hint).not.toContain(prompt.forkSide > 0 ? "left" : "right");
    }
    // And the wording matches where the branch is actually drawn on screen.
    for (const junction of result.geometry) {
      expect(junction.screenSide).toBe(junction.forkSide);
    }
  });

  test("committing to a fork needs the signposted side, not the other one", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      const attempt = (which: number, sign: number) => {
        H.seed(7);
        H.setState("active-play");
        T.release();
        const junction = T.trackReport().junctions[which - 1];
        T.placeAt(0, junction.mainEnter - 30, sign * junction.forkSide * 6.2);
        T.setSpeed(60);
        T.press("KeyW");
        const snap = H.advance(1.2);
        T.release();
        return snap.player.line;
      };
      return {
        toward: [attempt(1, 1), attempt(2, 1)],
        away: [attempt(1, -1), attempt(2, -1)],
      };
    });
    // Leaning toward the chevrons takes the branch; leaning away stays on the
    // main road. Before the fix this was inverted against the geometry.
    expect(result.toward).toEqual([1, 2]);
    expect(result.away).toEqual([0, 0]);
  });

  test("branch decks meet the road in one plane with nothing left undrawn", async ({ page }) => {
    await openGame(page);
    const report = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      w.__THREE_GAME_TEST_HOOKS__.setState("active-play");
      return w.__SKYWEAVE_TEST__.junctionReport();
    });

    expect(report).toHaveLength(2);
    for (const junction of report) {
      for (const seam of [junction.enter, junction.exit]) {
        // Roll is welded exactly; the residual is the honest yaw of a fork.
        expect(seam.bankGap).toBeLessThan(1e-6);
        expect(seam.widthGap).toBeLessThan(1e-6);
        expect(seam.upGap).toBeLessThan(0.2);
      }
      expect(junction.undrawn).toBeLessThan(0.01);
    }
  });

  test("every deck-mounted structure stands on the deck it belongs to", async ({ page }) => {
    await openGame(page);
    const report = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      w.__THREE_GAME_TEST_HOOKS__.seed(7);
      w.__THREE_GAME_TEST_HOOKS__.setState("active-play");
      return w.__SKYWEAVE_TEST__.propReport();
    });

    for (const [kind, overhang] of Object.entries(report.worst)) {
      expect(`${kind}:${overhang < 0.75}`).toBe(`${kind}:true`);
    }
    // A prop scaled to a non-finite value is still "placed" but never drawn,
    // which is exactly how the fork signposts went missing once already.
    expect(report.degenerate).toBe(0);
    expect(report.placed.StartGantry).toBe(1);
    expect(report.placed.BranchPylon).toBe(4);
    expect(report.placed.CanopyTruss).toBeGreaterThan(4);
    expect(report.placed.GateArch).toBeGreaterThanOrEqual(9);
    expect(report.junctionTrusses).toBe(0);
    expect(report.anchorsInJunction).toBe(0);
    expect(report.bollardsInGore).toBe(0);
    expect(report.branchGatesInGore).toBe(0);
  });

  test("the start and finish line sits on the lap boundary and is its own structure", async ({ page }) => {
    await openGame(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const snapshot = w.__THREE_GAME_TEST_HOOKS__.setState("active-play");
      const report = w.__SKYWEAVE_TEST__.trackReport();
      return {
        roots: snapshot.objects.assetRoots,
        startLineS: snapshot.track.startLineS,
        length: report.length,
      };
    });
    expect(result.roots).toContain("StartGantry");
    expect(result.startLineS).toBe(0);

    // The opening grid still lines up past the line, and no checkpoint crowds it.
    const spacing = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      w.__THREE_GAME_TEST_HOOKS__.setState("title");
      (document.getElementById("startButton") as HTMLButtonElement).click();
      return w.__THREE_GAME_TEST_HOOKS__.snapshot().player.s;
    });
    expect(spacing).toBeGreaterThan(0);
    expect(spacing).toBeLessThan(result.length * 0.5);
  });

  test("crossing the line raises the finish banner before the board replaces it", async ({ page }) => {
    await openGame(page);
    const crossing = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      H.seed(5);
      H.setState("title");
      (document.getElementById("startButton") as HTMLButtonElement).click();
      let snap = H.snapshot();
      let guard = 0;
      while (!snap.player.finished && guard++ < 220) snap = T.holdCentre(2);
      return {
        finished: snap.player.finished,
        mode: snap.mode,
        banner: document.getElementById("finishBanner")?.classList.contains("show") ?? false,
        place: document.getElementById("finishPlace")?.textContent ?? "",
        wait: document.getElementById("finishWait")?.textContent ?? "",
        lapSuffix: document.getElementById("lapSuffix")?.textContent ?? "",
      };
    });

    expect(crossing.finished).toBe(true);
    // The banner is up while the run is still going: the board must not be the
    // first sign that three laps are over.
    expect(crossing.mode).toBe("race");
    expect(crossing.banner).toBe(true);
    expect(crossing.place).toMatch(/^[1-4](st|nd|rd|th)$/);
    expect(crossing.lapSuffix).toContain("final");
    await expect(page.locator("#finishScreen")).toBeHidden();

    // And the board arrives on its own within the outro hold.
    const settled = await page.evaluate(() =>
      (window as unknown as SkyweaveWindow).__THREE_GAME_TEST_HOOKS__.advance(6));
    expect(settled.mode).toBe("finished");
    await expect(page.locator("#finishScreen")).toBeVisible();
    await expect(page.locator("#finishBanner")).not.toHaveClass(/show/);
    await expect(page.locator("#finishOrder .r")).toHaveCount(4);
  });

  test("finishing shows the placement board and restarting re-arms the countdown", async ({ page }) => {
    await openGame(page);
    const won = await page.evaluate(() =>
      (window as unknown as SkyweaveWindow).__THREE_GAME_TEST_HOOKS__.setState("win"));
    expect(won.mode).toBe("finished");
    expect(won.player.rank).toBe(1);
    await expect(page.locator("#finishScreen")).toBeVisible();
    await expect(page.locator("#placeBig")).toContainText("1");
    await expect(page.locator("#finishOrder .r")).toHaveCount(4);

    const lost = await page.evaluate(() =>
      (window as unknown as SkyweaveWindow).__THREE_GAME_TEST_HOOKS__.setState("fail"));
    expect(lost.player.rank).toBe(4);
    await expect(page.locator("#placeBig")).toContainText("4");

    await page.locator("#restartButton").click();
    await expect(page.locator("#finishScreen")).toBeHidden();
    await expect(page.locator("#hud")).toHaveClass(/visible/);
    await expect(page.locator("#countdown")).toHaveText("3");
    expect(await page.evaluate(() =>
      (window as unknown as SkyweaveWindow).__THREE_GAME_TEST_HOOKS__.snapshot().mode)).toBe("countdown");
  });

  test("pausing halts the simulation and silences the run", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => (window as unknown as SkyweaveWindow).__THREE_GAME_TEST_HOOKS__.setState("active-play"));
    await page.keyboard.press("Escape");
    await expect(page.locator("#pauseBadge")).toHaveClass(/show/);
    const paused = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const before = w.__THREE_GAME_TEST_HOOKS__.snapshot();
      const after = w.__THREE_GAME_TEST_HOOKS__.advance(2);
      return {
        mode: after.mode,
        moved: Math.abs(after.player.s - before.player.s),
        audioPaused: w.__THREE_GAME_DIAGNOSTICS__.snapshot().settings.audioPaused,
      };
    });
    expect(paused.mode).toBe("paused");
    expect(paused.moved).toBeLessThan(0.001);
    expect(paused.audioPaused).toBe(true);

    await page.keyboard.press("Escape");
    await expect(page.locator("#pauseBadge")).not.toHaveClass(/show/);
    expect(await page.evaluate(() =>
      (window as unknown as SkyweaveWindow).__THREE_GAME_DIAGNOSTICS__.snapshot().settings.audioPaused)).toBe(false);
  });

  test("starts cleanly when Web Audio is unavailable", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
      Object.defineProperty(window, "webkitAudioContext", { value: undefined, configurable: true });
    });
    await openGame(page);
    await page.locator("#startButton").click();
    await expect(page.locator("#hud")).toHaveClass(/visible/);
    const snapshot = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      w.__SKYWEAVE_TEST__.press("KeyW");
      const s = w.__THREE_GAME_TEST_HOOKS__.advance(4);
      w.__SKYWEAVE_TEST__.release();
      return s;
    });
    expect(["countdown", "race"]).toContain(snapshot.mode);
    expect(errors).toEqual([]);
  });

  test("losing focus releases every held control", async ({ page }) => {
    await openGame(page);
    await primed(page);
    const result = await page.evaluate(() => {
      const w = window as unknown as SkyweaveWindow;
      const H = w.__THREE_GAME_TEST_HOOKS__;
      const T = w.__SKYWEAVE_TEST__;
      T.press("KeyW"); T.press("KeyD"); T.press("ShiftLeft");
      const held = H.advance(5).player;
      window.dispatchEvent(new Event("blur"));
      const drifting = H.advance(2).player;
      return { held, drifting };
    });
    expect(result.held.speed).toBeGreaterThan(20);
    expect(result.drifting.tucking).toBe(false);
    expect(result.drifting.boosting).toBe(false);
    expect(result.drifting.speed).toBeLessThan(result.held.speed);
    expect(result.drifting.speed).toBeGreaterThan(0);
  });

  test("renders with deliberate budgets and an instanced world", async ({ page }) => {
    await openGame(page);
    const diagnostics = await page.evaluate(async () => {
      const w = window as unknown as SkyweaveWindow;
      w.__THREE_GAME_TEST_HOOKS__.setState("active-play");
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return w.__THREE_GAME_DIAGNOSTICS__.snapshot();
    });
    expect(diagnostics.settings.dpr).toBeLessThanOrEqual(1.5);
    expect(diagnostics.settings.shadows).toBe(false);
    expect(diagnostics.settings.postPasses).toBe(0);
    // Skyline, ribbon anchors and deck hazards are all instanced kits.
    expect(diagnostics.scene.instancedMeshes).toBeGreaterThanOrEqual(3);
    expect(diagnostics.scene.meshes).toBeGreaterThan(40);
    expect(diagnostics.renderer.calls).toBeGreaterThan(0);
    expect(diagnostics.renderer.triangles).toBeGreaterThan(10_000);
  });
});
