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
  pulse(direction: string): boolean;
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
    await expect.poll(() => page.evaluate(() => window.__lunaAudioStarts ?? 0)).toBeGreaterThan(0);
    await expect(page.locator("#missionName")).toHaveText("Perilune");
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
    expect((await snapshot(page)).timeLeft).toBeCloseTo(117, 0);
    await page.keyboard.press("p");
    expect((await snapshot(page)).paused).toBe(true);
    await page.evaluate(() => window.__lunarArrayTest.advance(5000));
    expect((await snapshot(page)).timeLeft).toBeCloseTo(117, 0);
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
      const emit = (type: string, point: { x: number; y: number }) => canvas.dispatchEvent(new PointerEvent(type, {
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
