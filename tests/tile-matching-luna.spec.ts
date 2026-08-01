import { expect, test, type Page } from "@playwright/test";

type Cell = { r: number; c: number };
type Tile = { type: number; special: number; id: number } | null;
type Snapshot = {
  grid: number;
  board: Tile[][];
  mask: number[][];
  blockers: number[][];
  score: number;
  moves: number;
  timeLeft: number;
  level: number;
  levelName: string;
  mode: string;
  objective: { kind: string; target: number; progress: number; complete: boolean; scoreTarget?: number; pulseTarget?: number; collected: number[] };
  chain: number;
  bestChain: number;
  blockerCleared: number;
  pulse: number;
  pulseUses: number;
  pulseArmed: boolean;
  pulseDirection: string;
  pendingGravity: string | null;
  gravity: string;
  cursor: Cell;
  selection: Cell | null;
  hasMove: boolean;
  matchCount: number;
  seed: number;
  boardRevision: number;
  muted: boolean;
  campaign: { unlocked: number; stars: number[]; bestScore: number[]; bestChain: number[] };
  feedback: { particles: number; rings: number; beams: number; floaters: number; pulse: { direction: string; life: number; chipped: number } | null };
  active: boolean;
  locked: boolean;
  paused: boolean;
  screen: string;
  layout: { width: number; height: number; boardX: number; boardY: number; boardSize: number; cell: number; mode: string };
};

type LunaApi = {
  constants: { GRID: number; BEAM_ROW: number; BEAM_COL: number; BURST: number; CORE: number; FUSION: Record<string, number> };
  snapshot(): Snapshot;
  setSeed(seed: number): boolean;
  startMission(index: number): boolean;
  startEndless(): boolean;
  setSpeed(value: number): void;
  setBoard(board: number[][], specials?: Array<Cell & { special: number }>): boolean;
  setMask(mask: number[][]): boolean;
  setBlockers(entries: Array<Cell & { layers?: number }>): boolean;
  setMoves(value: number): void;
  setTime(value: number): void;
  setScore(value: number): void;
  setPulse(value: number): void;
  setObjective(spec: { kind: string; target?: number; colors?: number[]; perColor?: number; scoreTarget?: number; pulseTarget?: number }): void;
  swap(r1: number, c1: number, r2: number, c2: number): Promise<boolean>;
  detonate(r: number, c: number): Promise<boolean>;
  resolve(): Promise<Snapshot>;
  collapse(): Snapshot;
  shuffle(manual?: boolean): boolean;
  hint(force?: boolean): { a: Cell; b: Cell; score: number; reason: string } | null;
  bestMove(): { a: Cell; b: Cell; score: number; reason: string } | null;
  pulse(direction: string): Promise<boolean>;
  setMuted(value: boolean): void;
  finishTurn(): Promise<void>;
  advance(ms: number): Snapshot;
  audioEvents(): string[];
  clearAudioEvents(): void;
  cellRect(r: number, c: number): { x: number; y: number; w: number; h: number };
};

declare global {
  interface Window { __lunarArrayTest: LunaApi; __lunaAudioStarts?: number }
}

const GAME = "/games/tile-matching/gpt-5-6-luna/index.html";
const GRID = 8;
const stableBoard = Array.from({ length: GRID }, (_, r) =>
  Array.from({ length: GRID }, (_, c) => (r + c) % 6),
);
const clone = (board: number[][]) => board.map((row) => row.slice());

function fourMatchBoard() {
  const board = clone(stableBoard);
  board[3] = [1, 1, 2, 1, 4, 5, 0, 2];
  board[2][2] = 1;
  return board;
}

function lMatchBoard() {
  const board = clone(stableBoard);
  board[4][4] = 5;
  board[4][3] = 1;
  board[4][5] = 1;
  board[3][4] = 1;
  board[2][4] = 1;
  board[5][4] = 1;
  return board;
}

function fiveMatchBoard() {
  const board = clone(stableBoard);
  board[6] = [2, 2, 5, 2, 2, 4, 5, 0];
  board[5][2] = 2;
  return board;
}

const deadBoard = Array.from({ length: GRID }, (_, r) =>
  Array.from({ length: GRID }, (_, c) => (r * 3 + c * 2) % 6),
);

async function openGame(page: Page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto(`${GAME}?test=1`);
  await expect(page).toHaveTitle("LUNAR ARRAY // GPT 5.6 Luna");
  await expect(page.locator("#titleScreen")).toHaveClass(/active/);
  await expect.poll(() => page.evaluate(() => Boolean(window.__lunarArrayTest))).toBe(true);
}

const snapshot = (page: Page) => page.evaluate(() => window.__lunarArrayTest.snapshot());

async function startMission(page: Page, index = 0) {
  await page.evaluate((mission) => {
    window.__lunarArrayTest.setSeed(7);
    window.__lunarArrayTest.setSpeed(50);
    window.__lunarArrayTest.startMission(mission);
  }, index);
}

async function settle(page: Page) {
  await expect.poll(async () => (await snapshot(page)).locked).toBe(false);
}

test.describe("GPT 5.6 Luna Tile Matching — Lunar Array", {
  tag: ["@spec:tile-matching-luna", "@game:tile-matching/gpt-5-6-luna"],
}, () => {
  test("boots an 8x8 legal board with procedural audio", async ({ page }) => {
    await page.addInitScript(() => {
      window.__lunaAudioStarts = 0;
      if (!("OscillatorNode" in window)) return;
      const original = window.OscillatorNode.prototype.start;
      window.OscillatorNode.prototype.start = function (...args) {
        window.__lunaAudioStarts = (window.__lunaAudioStarts ?? 0) + 1;
        return original.apply(this, args);
      };
    });
    await openGame(page);
    await startMission(page);
    const state = await snapshot(page);
    expect(state.grid).toBe(8);
    expect(state.levelName).toBe("Perilune");
    expect(state.moves).toBe(22);
    expect(state.objective.kind).toBe("score");
    expect(state.objective.target).toBe(3000);
    expect(state.matchCount).toBe(0);
    expect(state.hasMove).toBe(true);
    expect(state.board.flat().filter(Boolean)).toHaveLength(64);
    await expect.poll(() => page.evaluate(() => window.__lunaAudioStarts ?? 0)).toBeGreaterThan(2);
    await expect(page.locator("#missionName")).toHaveText("Perilune");
    await expect(page.locator("#hud")).not.toHaveAttribute("aria-live");
  });

  test("charges only valid swaps and cascades into a full board", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setMoves(12);
      window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
    }, stableBoard);
    expect(await page.evaluate(() => window.__lunarArrayTest.swap(0, 0, 0, 1))).toBe(false);
    expect((await snapshot(page)).moves).toBe(12);
    await page.evaluate((board) => window.__lunarArrayTest.setBoard(board), fourMatchBoard());
    expect(await page.evaluate(() => window.__lunarArrayTest.swap(2, 2, 3, 2))).toBe(true);
    await settle(page);
    const state = await snapshot(page);
    expect(state.moves).toBe(11);
    expect(state.score).toBeGreaterThan(0);
    expect(state.board.flat().filter(Boolean).length).toBeGreaterThanOrEqual(60);
    expect(state.hasMove).toBe(true);
  });

  test("forges beam, moonburst, and eclipse core specials", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    const constants = await page.evaluate(() => window.__lunarArrayTest.constants);
    const cases = [
      { board: fourMatchBoard(), swap: [2, 2, 3, 2] as const, specials: [constants.BEAM_ROW, constants.BEAM_COL] },
      { board: lMatchBoard(), swap: [5, 4, 4, 4] as const, specials: [constants.BURST] },
      { board: fiveMatchBoard(), swap: [5, 2, 6, 2] as const, specials: [constants.CORE] },
    ];
    for (const entry of cases) {
      await page.evaluate((board) => {
        window.__lunarArrayTest.setSeed(11);
        window.__lunarArrayTest.setBoard(board);
        window.__lunarArrayTest.setMoves(20);
        window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
      }, entry.board);
      expect(await page.evaluate(([r1, c1, r2, c2]) => window.__lunarArrayTest.swap(r1, c1, r2, c2), entry.swap)).toBe(true);
      await settle(page);
      const specials = (await snapshot(page)).board.flat().filter((tile) => tile && entry.specials.includes(tile.special));
      expect(specials.length).toBeGreaterThan(0);
    }
  });

  test("runs each special fusion and records its audio cue", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    const constants = await page.evaluate(() => window.__lunarArrayTest.constants);
    const cases = [
      [constants.BEAM_ROW, constants.BEAM_COL, "fusion:beam_beam"],
      [constants.BEAM_ROW, constants.BURST, "fusion:beam_burst"],
      [constants.BURST, constants.BURST, "fusion:burst_burst"],
      [constants.CORE, constants.BEAM_ROW, "fusion:core_beam"],
      [constants.CORE, constants.BURST, "fusion:core_burst"],
      [constants.CORE, constants.CORE, "fusion:core_core"],
    ] as const;
    for (const [first, second, event] of cases) {
      await page.evaluate(([board, a, b]) => {
        window.__lunarArrayTest.setBoard(board, [{ r: 3, c: 3, special: a }, { r: 3, c: 4, special: b }]);
        window.__lunarArrayTest.setMoves(20);
        window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
        window.__lunarArrayTest.clearAudioEvents();
      }, [stableBoard, first, second]);
      expect(await page.evaluate(() => window.__lunarArrayTest.swap(3, 3, 3, 4))).toBe(true);
      await settle(page);
      expect(await page.evaluate(() => window.__lunarArrayTest.audioEvents())).toContain(event);
      expect((await snapshot(page)).score).toBeGreaterThan(0);
    }
  });

  test("activates a CORE when swapped with an ordinary gem of any color", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    const constants = await page.evaluate(() => window.__lunarArrayTest.constants);
    await page.evaluate(([board, core]) => {
      window.__lunarArrayTest.setBoard(board, [{ r: 3, c: 3, special: core }]);
      window.__lunarArrayTest.setMoves(20);
      window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
      window.__lunarArrayTest.clearAudioEvents();
    }, [stableBoard, constants.CORE]);
    const ordinaryType = stableBoard[3][4];
    expect(await page.evaluate(() => window.__lunarArrayTest.swap(3, 3, 3, 4))).toBe(true);
    await settle(page);
    const state = await snapshot(page);
    expect(state.score).toBeGreaterThan(700);
    expect(state.objective.collected[ordinaryType]).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__lunarArrayTest.audioEvents())).toContain("core:color");
  });

  test("explains and animates the armed Lunar Pulse", async ({ page }) => {
    await openGame(page);
    await startMission(page, 4);
    await page.evaluate(() => window.__lunarArrayTest.setPulse(100));
    const help = page.locator("#pulseHelp");
    await expect(help).toContainText("Space");
    await expect(help).toContainText("arrows");
    await expect(help).toContainText("1 blocker layer");
    await expect(help).toContainText("refill");
    await page.evaluate(() => window.__lunarArrayTest.armPulse());
    await expect(help).toContainText("Enter");
    await expect(page.locator("#pulseButton")).toContainText("ARMED");
    await page.evaluate(() => window.__lunarArrayTest.pulse("up"));
    const state = await snapshot(page);
    expect(state.feedback.pulse).toMatchObject({ direction: "up" });
    expect(state.gravity).toBe("up");
  });

  test("preserves authored one-layer and two-layer moon-dust lock state", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    await page.evaluate(() => window.__lunarArrayTest.setBlockers([{ r: 2, c: 2, layers: 1 }, { r: 2, c: 3, layers: 2 }]));
    const before = await snapshot(page);
    expect(before.blockers[2][2]).toBe(1);
    expect(before.blockers[2][3]).toBe(2);
    await page.evaluate(() => window.__lunarArrayTest.advance(180));
    const after = await snapshot(page);
    expect(after.blockers[2][2]).toBe(1);
    expect(after.blockers[2][3]).toBe(2);
  });

  test("keeps Eclipse Gate's blocker target attainable", async ({ page }) => {
    await openGame(page);
    await startMission(page, 6);
    const state = await snapshot(page);
    expect(state.objective.target).toBe(4);
    expect(state.blockers.flat().filter((layers) => layers > 0)).toHaveLength(4);
  });

  test("uses Lunar Pulse to chip edge blockers and redirect the next refill", async ({ page }) => {
    await openGame(page);
    await startMission(page, 4);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setBlockers([{ r: 0, c: 0, layers: 2 }, { r: 0, c: 1, layers: 1 }]);
      window.__lunarArrayTest.setMoves(12);
      window.__lunarArrayTest.setPulse(100);
      window.__lunarArrayTest.setObjective({ kind: "blockers", target: 99, pulseTarget: 1 });
    }, fourMatchBoard());
    const before = await snapshot(page);
    expect(await page.evaluate(() => window.__lunarArrayTest.pulse("up"))).toBe(true);
    const after = await snapshot(page);
    expect(after.moves).toBe(before.moves);
    expect(after.pulse).toBe(0);
    expect(after.pulseUses).toBe(1);
    expect(after.gravity).toBe("up");
    expect(after.blockers[0][0]).toBe(1);
    expect(after.blockers[0][1]).toBe(0);
    await page.evaluate(() => window.__lunarArrayTest.collapse());
    expect((await snapshot(page)).gravity).toBe("down");
  });

  test("completes a mission when the final condition is supplied by Pulse", async ({ page }) => {
    await openGame(page);
    await startMission(page, 4);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setBlockers([{ r: 0, c: 0, layers: 1 }]);
      window.__lunarArrayTest.setPulse(100);
      window.__lunarArrayTest.setObjective({ kind: "blockers", target: 1, pulseTarget: 1 });
    }, stableBoard);
    expect(await page.evaluate(() => window.__lunarArrayTest.pulse("up"))).toBe(true);
    await expect.poll(async () => (await snapshot(page)).screen).toBe("complete");
    expect((await snapshot(page)).active).toBe(false);
  });

  test("keeps hints free, charges manual shuffles, and recovers dead boards", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setMoves(12);
      window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
    }, fourMatchBoard());
    expect(await page.evaluate(() => window.__lunarArrayTest.hint(true))).not.toBeNull();
    expect((await snapshot(page)).moves).toBe(12);
    expect(await page.evaluate(() => window.__lunarArrayTest.shuffle(true))).toBe(true);
    const state = await snapshot(page);
    expect(state.moves).toBe(11);
    expect(state.matchCount).toBe(0);
    expect(state.hasMove).toBe(true);
    expect(state.hint).toBeNull();
  });

  test("does not churn the campaign live summary when its value is stable", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    const mutations = await page.evaluate(() => {
      const summary = document.querySelector("#campaignSummary")!;
      const observer = new MutationObserver(() => {});
      observer.observe(summary, { childList: true, characterData: true, subtree: true });
      for (let index = 0; index < 5; index += 1) window.__lunarArrayTest.advance(0);
      const count = observer.takeRecords().length;
      observer.disconnect();
      return count;
    });
    expect(mutations).toBe(0);
  });

  test("keeps pure move search deterministic and recovers a locked dead board for free", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setMoves(9);
      window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
    }, fourMatchBoard());
    const before = await snapshot(page);
    const search = await page.evaluate(() => ({ hint: window.__lunarArrayTest.hint(), best: window.__lunarArrayTest.bestMove() }));
    expect(search.hint).not.toBeNull();
    expect(search.best).not.toBeNull();
    const afterSearch = await snapshot(page);
    expect(afterSearch.board).toEqual(before.board);
    expect(afterSearch.seed).toBe(before.seed);
    expect(afterSearch.boardRevision).toBe(before.boardRevision);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setBlockers([{ r: 0, c: 0, layers: 2 }, { r: 0, c: 1, layers: 1 }]);
    }, deadBoard);
    const beforeRecovery = await snapshot(page);
    expect(beforeRecovery.hasMove).toBe(false);
    await page.evaluate(() => window.__lunarArrayTest.finishTurn());
    await settle(page);
    const recovered = await snapshot(page);
    expect(recovered.hasMove).toBe(true);
    expect(recovered.moves).toBe(beforeRecovery.moves);
    expect(recovered.blockers[0][0]).toBe(2);
    expect(recovered.blockers[0][1]).toBe(1);
    expect(recovered.boardRevision).toBeGreaterThan(beforeRecovery.boardRevision);
  });

  test("records session campaign progress, unlocks the next mission, and preserves replay records", async ({ page }) => {
    await openGame(page);
    await startMission(page, 0);
    await page.evaluate(() => {
      window.__lunarArrayTest.setObjective({ kind: "score", target: 0 });
      window.__lunarArrayTest.setScore(4200);
      window.__lunarArrayTest.completeMission();
    });
    await expect.poll(async () => (await snapshot(page)).screen).toBe("complete");
    const completed = await snapshot(page);
    expect(completed.campaign.unlocked).toBe(2);
    expect(completed.campaign.stars[0]).toBe(2);
    expect(completed.campaign.bestScore[0]).toBe(4200);
    await page.evaluate(() => window.__lunarArrayTest.startMission(0));
    const replay = await snapshot(page);
    expect(replay.campaign.unlocked).toBe(2);
    expect(replay.campaign.stars[0]).toBe(2);
    expect(replay.campaign.bestScore[0]).toBe(4200);
    expect(await page.locator("#missionMap .mission-chip").nth(1).isDisabled()).toBe(false);
  });

  test("skips masked and blocked cells for cursor and pointer selection", async ({ page }) => {
    await openGame(page);
    await startMission(page, 3);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setBlockers([{ r: 2, c: 2, layers: 1 }]);
    }, stableBoard);
    await page.locator("#board").focus();
    const initial = await snapshot(page);
    expect(initial.selection).toBeNull();
    await page.keyboard.press("ArrowUp");
    const moved = await snapshot(page);
    expect(moved.cursor).not.toEqual({ r: 2, c: 2 });
    const blocked = await page.evaluate(() => window.__lunarArrayTest.cellRect(2, 2));
    await page.mouse.click(blocked.x + blocked.w / 2, blocked.y + blocked.h / 2);
    expect((await snapshot(page)).selection).toBeNull();
  });

  test("mutes and restores the shared audio bus and exposes fusion feedback", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    await page.evaluate(() => window.__lunarArrayTest.setMuted(true));
    expect((await snapshot(page)).muted).toBe(true);
    expect(await page.locator("#audioButton").getAttribute("title")).toBe("Unmute (M)");
    await page.keyboard.press("m");
    expect((await snapshot(page)).muted).toBe(false);
    expect(await page.locator("#audioButton").getAttribute("title")).toBe("Mute (M)");
    const constants = await page.evaluate(() => window.__lunarArrayTest.constants);
    await page.evaluate(([board, first, second]) => {
      window.__lunarArrayTest.setBoard(board, [{ r: 3, c: 3, special: first }, { r: 3, c: 4, special: second }]);
      window.__lunarArrayTest.setMoves(20);
      window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
    }, [stableBoard, constants.BEAM_ROW, constants.BEAM_COL]);
    expect(await page.evaluate(() => window.__lunarArrayTest.swap(3, 3, 3, 4))).toBe(true);
    const feedback = (await snapshot(page)).feedback;
    expect(feedback.beams + feedback.rings + feedback.floaters).toBeGreaterThan(0);
  });

  test("ends a campaign when the final move is spent on a shuffle", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setMoves(1);
      window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
    }, fourMatchBoard());
    expect(await page.evaluate(() => window.__lunarArrayTest.shuffle(true))).toBe(true);
    await expect.poll(async () => (await snapshot(page)).screen).toBe("failed");
    const state = await snapshot(page);
    expect(state.moves).toBe(0);
    expect(state.active).toBe(false);
  });

  test("pauses Orbit Run time and ends at 120 seconds", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__lunarArrayTest.setSpeed(50);
      window.__lunarArrayTest.startEndless();
      window.__lunarArrayTest.setTime(120);
    });
    expect((await snapshot(page)).mode).toBe("endless");
    await page.evaluate(() => window.__lunarArrayTest.advance(3000));
    expect((await snapshot(page)).timeLeft).toBe(117);
    await page.keyboard.press("p");
    expect((await snapshot(page)).paused).toBe(true);
    await page.evaluate(() => window.__lunarArrayTest.advance(5000));
    expect((await snapshot(page)).timeLeft).toBe(117);
    await page.keyboard.press("p");
    await page.evaluate(() => window.__lunarArrayTest.advance(117000));
    await expect.poll(async () => (await snapshot(page)).screen).toBe("endless");
    expect((await snapshot(page)).active).toBe(false);
  });

  test("supports pointer swapping and keeps the active layout inside 1280x720", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setMoves(10);
      window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
    }, fourMatchBoard());
    const from = await page.evaluate(() => window.__lunarArrayTest.cellRect(2, 2));
    const to = await page.evaluate(() => window.__lunarArrayTest.cellRect(3, 2));
    await page.mouse.click(from.x + from.w / 2, from.y + from.h / 2);
    await page.mouse.click(to.x + to.w / 2, to.y + to.h / 2);
    await settle(page);
    expect((await snapshot(page)).score).toBeGreaterThan(0);
    for (const selector of ["#board", "#missionName", "#objectiveValue", "#movesValue", "#scoreValue", "#pulseButton"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(1280);
      expect(box!.y + box!.height).toBeLessThanOrEqual(720);
    }
  });

  test("supports keyboard cursor swaps and touch drags", async ({ page }) => {
    await openGame(page);
    await startMission(page);
    await page.evaluate((board) => {
      window.__lunarArrayTest.setBoard(board);
      window.__lunarArrayTest.setMoves(10);
      window.__lunarArrayTest.setObjective({ kind: "score", target: 999999 });
    }, fourMatchBoard());
    await page.locator("#board").focus();
    const best = await page.evaluate(() => window.__lunarArrayTest.bestMove());
    expect(best).not.toBeNull();
    if (!best) return;
    const moveCursor = async (target: Cell) => {
      let cursor = (await snapshot(page)).cursor;
      while (cursor.r > target.r) { await page.keyboard.press("ArrowUp"); cursor = (await snapshot(page)).cursor; }
      while (cursor.r < target.r) { await page.keyboard.press("ArrowDown"); cursor = (await snapshot(page)).cursor; }
      while (cursor.c > target.c) { await page.keyboard.press("ArrowLeft"); cursor = (await snapshot(page)).cursor; }
      while (cursor.c < target.c) { await page.keyboard.press("ArrowRight"); cursor = (await snapshot(page)).cursor; }
    };
    await moveCursor(best.a);
    await page.keyboard.press("Enter");
    expect((await snapshot(page)).selection).toEqual(best.a);
    await moveCursor(best.b);
    expect((await snapshot(page)).selection).toEqual(best.a);
    await page.keyboard.press("Enter");
    await settle(page);
    expect((await snapshot(page)).score).toBeGreaterThan(0);

    await page.evaluate((board) => window.__lunarArrayTest.setBoard(board), fourMatchBoard());
    const [from, to] = await page.evaluate(() => [
      window.__lunarArrayTest.cellRect(2, 2),
      window.__lunarArrayTest.cellRect(3, 2),
    ]);
    await page.evaluate(([start, end]) => {
      const canvas = document.querySelector<HTMLCanvasElement>("#board");
      if (!canvas) throw new Error("board canvas missing");
      const emit = (type: string, point: { x: number; y: number; w: number; h: number }) => canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        clientX: point.x + point.w / 2,
        clientY: point.y + point.h / 2,
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
      }));
      emit("pointerdown", start);
      emit("pointermove", end);
      emit("pointerup", end);
    }, [from, to]);
    await settle(page);
    expect((await snapshot(page)).score).toBeGreaterThan(0);
  });

  test("stacks the HUD rails cleanly on a phone viewport", async ({ page }) => {
    await openGame(page, { width: 390, height: 844 });
    await startMission(page);
    const leftRail = await page.locator("#leftRail").boundingBox();
    const rightRail = await page.locator("#rightRail").boundingBox();
    const board = await page.locator("#board").boundingBox();
    expect(leftRail).not.toBeNull();
    expect(rightRail).not.toBeNull();
    expect(board).not.toBeNull();
    if (leftRail && rightRail && board) {
      expect(leftRail.x + leftRail.width).toBeLessThan(rightRail.x);
      expect(board.x).toBeGreaterThanOrEqual(0);
      expect(board.x + board.width).toBeLessThanOrEqual(390);
      expect(board.y + board.height).toBeLessThanOrEqual(844);
    }
  });

  test("does not expose the deterministic API outside test mode", async ({ page }) => {
    await page.goto(GAME);
    await expect(page.locator("#titleScreen")).toHaveClass(/active/);
    expect(await page.evaluate(() => "__lunarArrayTest" in window)).toBe(false);
  });
});
