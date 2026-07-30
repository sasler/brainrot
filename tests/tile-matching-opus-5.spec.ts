import { expect, test, type Page } from "@playwright/test";

type Cell = { r: number; c: number };
type Tile = { type: number; special: number; id: number } | null;
type Hint = { a: Cell; b: Cell; score: number; reason: string };

type Objective = {
  kind: "score" | "rime" | "collect" | "dual";
  target: number;
  progress: number;
  complete: boolean;
  colors?: number[];
  perColor?: number;
  scoreTarget?: number;
  collected: number[];
};

type Snapshot = {
  grid: number;
  board: Tile[][];
  mask: number[][];
  rime: number[][];
  encased: number[][];
  score: number;
  moves: number;
  level: number;
  levelName: string;
  types: number;
  objective: Objective;
  chain: number;
  bestChain: number;
  rimeCleared: number;
  rushScore: number;
  stars: number;
  bestStars: number[];
  hasMove: boolean;
  matchCount: number;
  hint: Hint | null;
  active: boolean;
  locked: boolean;
  paused: boolean;
  rushing: boolean;
  screen: string;
  reducedMotion: boolean;
  particleCount: number;
  effectBudget: number;
  layout: {
    width: number;
    height: number;
    boardX: number;
    boardY: number;
    boardSize: number;
    cell: number;
    mode: "rails" | "stack";
  };
};

type LevelRow = {
  index: number;
  name: string;
  moves: number;
  types: number;
  objective: { kind: string; target: number; colors?: number[]; scoreTarget?: number };
  openCells: number;
  holes: number;
  rimeCells: number;
  rimeLayers: number;
  encased: number;
  refillOk: boolean;
  star2: number;
  star3: number;
};

type NorthlightTest = {
  constants: {
    GRID: number;
    TYPES: number;
    LEVEL_COUNT: number;
    NONE: number;
    FRACTURE_ROW: number;
    FRACTURE_COL: number;
    BLOOM: number;
    CORE: number;
    RIME_SCORE: number;
    RUSH_MOVE_SCORE: number;
    MAX_CHAIN_MULT: number;
    SHUFFLE_COST: number;
    FUSION: Record<string, number>;
  };
  snapshot(): Snapshot;
  setSeed(seed: number): boolean;
  setSpeed(multiplier: number): void;
  startCampaign(): void;
  startLevel(index: number): void;
  levelTable(): LevelRow[];
  setBoard(matrix: number[][], specials?: Array<Cell & { special: number }>): boolean;
  setMask(mask: number[][]): boolean;
  setRime(cells: Array<Cell & { layers?: number }>): void;
  setEncased(cells: Array<Cell & { layers?: number }>): void;
  setMoves(value: number): void;
  setScore(value: number): void;
  setObjective(spec: { kind: string; target?: number; colors?: number[]; perColor?: number; scoreTarget?: number }): void;
  swap(r1: number, c1: number, r2: number, c2: number): Promise<boolean>;
  detonate(r: number, c: number): Promise<boolean>;
  resolve(): Promise<Snapshot>;
  collapse(): Promise<Snapshot>;
  shuffle(manual?: boolean): Promise<boolean>;
  hint(force?: boolean): Promise<Hint | null>;
  bestMove(): Hint | null;
  finishTurn(): Promise<void>;
  runAuroraRush(): Promise<Snapshot>;
  completeLevel(): void;
  failLevel(message?: string): void;
  nextLevel(): void;
  restartLevel(): void;
  audioEvents(): string[];
  clearAudioEvents(): void;
  cellRect(r: number, c: number): { x: number; y: number; w: number; h: number };
};

declare global {
  interface Window {
    __northlightTest: NorthlightTest;
    __northlightAudioStarts?: number;
  }
}

const GRID = 9;

/** Diagonal ramp over seven types — adjacent cells never repeat, so the board has no match anywhere. */
const stableBoard: number[][] = Array.from({ length: GRID }, (_, r) =>
  Array.from({ length: GRID }, (_, c) => (r + c) % 7),
);

const clone = (board: number[][]) => board.map((row) => row.slice());

/** Swapping (2,2) with (3,2) completes a horizontal run of four in row 3. */
function fourMatchBoard() {
  const board = clone(stableBoard);
  board[3] = [1, 1, 2, 1, 4, 5, 6, 0, 1];
  board[2][2] = 1;
  return board;
}

/** Swapping (5,1) with (5,2) completes a vertical run of four in column 2. */
function verticalFourBoard() {
  const board = clone(stableBoard);
  board[3][2] = 3;
  board[4][2] = 3;
  board[6][2] = 3;
  board[5][1] = 3;
  return board;
}

/** Swapping (5,4) with (4,4) makes a row of three and a column of three that share (4,4). */
function lShapeBoard() {
  const board = clone(stableBoard);
  board[4][4] = 6;
  board[4][3] = 1;
  board[4][5] = 1;
  board[3][4] = 1;
  board[2][4] = 1;
  board[5][4] = 1;
  return board;
}

/** Swapping (5,2) with (6,2) completes a horizontal run of five in row 6. */
function fiveLineBoard() {
  const board = clone(stableBoard);
  board[6] = [2, 2, 5, 2, 2, 4, 5, 6, 0];
  board[5][2] = 2;
  return board;
}

/** A board that already holds exactly one three-match, at (4,2)-(4,4). */
function matchBoard() {
  const board = clone(stableBoard);
  board[4][2] = 1;
  board[4][3] = 1;
  board[4][4] = 1;
  return board;
}

const fullMask = () => Array.from({ length: GRID }, () => new Array(GRID).fill(1));

async function openGame(page: Page, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.goto("/games/tile-matching/opus-5/index.html?test=1");
  await expect(page.locator("#titleScreen")).toHaveClass(/active/);
  await expect.poll(() => page.evaluate(() => Boolean(window.__northlightTest))).toBe(true);
}

async function playLevel(page: Page, index = 0) {
  await page.evaluate((value) => {
    window.__northlightTest.setSeed(7);
    window.__northlightTest.startLevel(value);
  }, index);
}

const snapshot = (page: Page) => page.evaluate(() => window.__northlightTest.snapshot());

/**
 * A swap charges its move before the cascade resolves, so polling on `moves` alone can return
 * while the board is still locked. Hold out for the whole turn to finish.
 */
async function settledMoves(page: Page, expected: number, timeout = 20_000) {
  await expect
    .poll(async () => {
      const state = await snapshot(page);
      return state.locked ? null : state.moves;
    }, { timeout })
    .toBe(expected);
}

const totalCleared = (state: Snapshot) => state.objective.collected.reduce((sum, value) => sum + value, 0);

const boardIsFull = (state: Snapshot) =>
  state.board.every((row, r) => row.every((tile, c) => (state.mask[r][c] === 1 ? Boolean(tile) : tile === null)));

test.describe("Claude Opus 5 Tile Matching — Northlight", {
  tag: ["@spec:tile-matching-opus-5", "@game:tile-matching/opus-5"],
}, () => {
  test("boots night one deterministically with audio and a legal board", async ({ page }) => {
    await page.addInitScript(() => {
      window.__northlightAudioStarts = 0;
      if (!("OscillatorNode" in window)) return;
      const prototype = window.OscillatorNode.prototype;
      const original = prototype.start;
      prototype.start = function (...args) {
        window.__northlightAudioStarts = (window.__northlightAudioStarts ?? 0) + 1;
        return original.apply(this, args);
      };
    });
    await openGame(page);

    for (const seed of [1, 42, 2026]) {
      await page.evaluate((value) => {
        window.__northlightTest.setSeed(value);
        window.__northlightTest.startLevel(0);
      }, seed);

      const state = await snapshot(page);
      expect(state.grid).toBe(9);
      expect(state.level).toBe(0);
      expect(state.levelName).toBe("First Light");
      expect(state.moves).toBe(20);
      expect(state.objective.kind).toBe("score");
      expect(state.objective.target).toBe(3000);
      expect(state.matchCount).toBe(0);
      expect(state.hasMove).toBe(true);
      expect(state.screen).toBe("play");
      expect(boardIsFull(state)).toBe(true);
    }

    await expect(page.locator("#nightName")).toHaveText("First Light");
    await expect(page.locator("#objectiveValue")).toContainText("0 / 3,000");
    await expect(page.locator("#movesValue")).toHaveText("20");
    await expect.poll(() => page.evaluate(() => window.__northlightAudioStarts ?? 0)).toBeGreaterThan(0);
  });

  test("charges one move for a valid swap and nothing for a rejection", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate((board) => {
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setMoves(12);
      window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
    }, stableBoard);

    expect(await page.evaluate(() => window.__northlightTest.swap(0, 0, 0, 1))).toBe(false);
    expect((await snapshot(page)).moves).toBe(12);

    await page.evaluate((board) => {
      window.__northlightTest.setSeed(55);
      window.__northlightTest.setBoard(board);
    }, fourMatchBoard());

    expect(await page.evaluate(() => window.__northlightTest.swap(2, 2, 3, 2))).toBe(true);
    const state = await snapshot(page);
    expect(state.moves).toBe(11);
    expect(state.score).toBeGreaterThan(0);
    expect(state.matchCount).toBe(0);
    expect(boardIsFull(state)).toBe(true);
  });

  test("forges fractures on the matched axis, blooms on corners and cores on fives", async ({ page }) => {
    await openGame(page);
    await playLevel(page);
    const constants = await page.evaluate(() => window.__northlightTest.constants);

    const cases = [
      { board: fourMatchBoard(), swap: [2, 2, 3, 2], special: constants.FRACTURE_ROW, at: { r: 3, c: 2 } },
      { board: verticalFourBoard(), swap: [5, 1, 5, 2], special: constants.FRACTURE_COL, at: { r: 5, c: 2 } },
      { board: lShapeBoard(), swap: [5, 4, 4, 4], special: constants.BLOOM, at: { r: 4, c: 4 } },
      { board: fiveLineBoard(), swap: [5, 2, 6, 2], special: constants.CORE, at: { r: 6, c: 2 } },
    ];

    for (const entry of cases) {
      await page.evaluate((board) => {
        window.__northlightTest.setSeed(11);
        window.__northlightTest.setBoard(board);
        window.__northlightTest.setMoves(20);
        window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
      }, entry.board);

      const accepted = await page.evaluate(
        ([r1, c1, r2, c2]) => window.__northlightTest.swap(r1, c1, r2, c2),
        entry.swap,
      );
      expect(accepted, `swap for special ${entry.special}`).toBe(true);

      const state = await snapshot(page);
      const specials = state.board.flat().filter((tile) => tile?.special === entry.special);
      expect(specials.length, `special ${entry.special} forged`).toBeGreaterThan(0);
    }
  });

  test("runs the whole special-combination matrix", async ({ page }) => {
    await openGame(page);
    await playLevel(page);
    const constants = await page.evaluate(() => window.__northlightTest.constants);

    const cases = [
      { name: "LINE_LINE", audio: "fuse:crosscut", bonus: constants.FUSION.LINE_LINE, minCleared: 17, specials: [constants.FRACTURE_ROW, constants.FRACTURE_COL] },
      { name: "LINE_BLOOM", audio: "fuse:split", bonus: constants.FUSION.LINE_BLOOM, minCleared: 45, specials: [constants.FRACTURE_ROW, constants.BLOOM] },
      { name: "BLOOM_BLOOM", audio: "fuse:whiteout", bonus: constants.FUSION.BLOOM_BLOOM, minCleared: 41, specials: [constants.BLOOM, constants.BLOOM] },
      { name: "CORE_LINE", audio: "fuse:volley", bonus: constants.FUSION.CORE_LINE, minCleared: 20, specials: [constants.CORE, constants.FRACTURE_ROW] },
      { name: "CORE_BLOOM", audio: "fuse:storm", bonus: constants.FUSION.CORE_BLOOM, minCleared: 20, specials: [constants.CORE, constants.BLOOM] },
      { name: "CORE_CORE", audio: "fuse:eclipse", bonus: constants.FUSION.CORE_CORE, minCleared: 81, specials: [constants.CORE, constants.CORE] },
    ];

    for (const entry of cases) {
      await page.evaluate(
        ({ board, specials }) => {
          window.__northlightTest.setSeed(3);
          window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
          window.__northlightTest.setBoard(board, [
            { r: 4, c: 3, special: specials[0] },
            { r: 4, c: 4, special: specials[1] },
          ]);
          window.__northlightTest.setMoves(10);
          window.__northlightTest.setScore(0);
          window.__northlightTest.clearAudioEvents();
        },
        { board: stableBoard, specials: entry.specials },
      );

      expect(await page.evaluate(() => window.__northlightTest.swap(4, 3, 4, 4)), entry.name).toBe(true);

      const state = await snapshot(page);
      const events = await page.evaluate(() => window.__northlightTest.audioEvents());

      expect(events, `${entry.name} audio`).toContain(entry.audio);
      expect(state.moves, `${entry.name} move cost`).toBe(9);
      expect(state.score, `${entry.name} score`).toBeGreaterThanOrEqual(entry.bonus);
      expect(totalCleared(state), `${entry.name} cleared`).toBeGreaterThanOrEqual(entry.minCleared);
      expect(state.matchCount, `${entry.name} settled`).toBe(0);
      expect(boardIsFull(state), `${entry.name} refilled`).toBe(true);
    }
  });

  test("gravity never crosses a hole and every column segment refills from its own top", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    const mask = fullMask();
    for (let r = 0; r < GRID; r += 1) mask[r][4] = 0; // a full-height wall
    mask[3][1] = 0;
    mask[4][1] = 0;
    for (let r = 3; r <= 5; r += 1) for (let c = 6; c <= 7; c += 1) mask[r][c] = 0; // a donut hole

    await page.evaluate(
      ({ board, maskValue }) => {
        window.__northlightTest.setSeed(19);
        window.__northlightTest.setMask(maskValue);
        window.__northlightTest.setBoard(board);
        window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
        window.__northlightTest.setMoves(20);
      },
      { board: stableBoard, maskValue: mask },
    );

    const before = await snapshot(page);
    expect(before.board[0][4]).toBeNull();
    expect(before.board[4][6]).toBeNull();
    expect(before.board[7][7]).not.toBeNull();

    // Blow a hole in the segment that is trapped under the donut, then let gravity and refill run.
    const bloom = (await page.evaluate(() => window.__northlightTest.constants)).BLOOM;
    await page.evaluate(
      ({ r, c, special }) => window.__northlightTest.setBoard(
        window.__northlightTest.snapshot().board.map((row) => row.map((tile) => (tile ? tile.type : 0))),
        [{ r, c, special }],
      ),
      { r: 7, c: 7, special: bloom },
    );
    expect(await page.evaluate(() => window.__northlightTest.detonate(7, 7))).toBe(true);
    const after = await snapshot(page);

    expect(boardIsFull(after)).toBe(true);
    for (let r = 0; r < GRID; r += 1) expect(after.board[r][4], `hole ${r},4`).toBeNull();
    for (let r = 3; r <= 5; r += 1) {
      for (let c = 6; c <= 7; c += 1) expect(after.board[r][c], `hole ${r},${c}`).toBeNull();
    }

    // Cells trapped under a hole are still reachable, so the segment below it must be populated.
    for (let r = 6; r <= 8; r += 1) {
      for (let c = 6; c <= 7; c += 1) expect(after.board[r][c], `segment ${r},${c}`).not.toBeNull();
    }
    expect(after.board[5][1]).not.toBeNull();
  });

  test("rime loses exactly one layer per clear and drives its objective home", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate((board) => {
      window.__northlightTest.setSeed(23);
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setObjective({ kind: "rime", target: 5 });
      window.__northlightTest.setRime([
        { r: 4, c: 2, layers: 2 },
        { r: 4, c: 3, layers: 1 },
        { r: 4, c: 4, layers: 2 },
      ]);
      window.__northlightTest.setMoves(20);
    }, matchBoard());

    const before = await snapshot(page);
    const beforeLayers = before.rime.flat().reduce((sum, value) => sum + value, 0);
    expect(beforeLayers).toBe(5);
    expect(before.objective.target).toBe(5);

    const after = await page.evaluate(() => window.__northlightTest.resolve());
    const afterLayers = after.rime.flat().reduce((sum, value) => sum + value, 0);

    expect(after.rime[4][3]).toBe(0);
    expect(after.rime[4][2]).toBeLessThan(2);
    expect(after.rime[4][4]).toBeLessThan(2);
    expect(after.rimeCleared).toBe(beforeLayers - afterLayers);
    expect(after.rimeCleared).toBeGreaterThanOrEqual(3);
    expect(after.objective.progress).toBe(after.rimeCleared);
    expect(after.score).toBeGreaterThanOrEqual(3 * 200);

    await page.evaluate(() => {
      window.__northlightTest.setRime([]);
      window.__northlightTest.setObjective({ kind: "rime", target: 1 });
    });
    await page.evaluate(() => window.__northlightTest.setRime([{ r: 4, c: 3, layers: 1 }]));
    await page.evaluate((board) => window.__northlightTest.setBoard(board), matchBoard());
    const done = await page.evaluate(() => window.__northlightTest.resolve());
    expect(done.objective.complete).toBe(true);
  });

  test("drift ice blocks swaps, walls gravity and shatters from neighbouring clears", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate((board) => {
      window.__northlightTest.setSeed(31);
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
      window.__northlightTest.setEncased([{ r: 4, c: 5, layers: 2 }]);
      window.__northlightTest.setMoves(20);
      window.__northlightTest.clearAudioEvents();
    }, matchBoard());

    expect(await page.evaluate(() => window.__northlightTest.swap(4, 5, 4, 6))).toBe(false);
    expect((await snapshot(page)).moves).toBe(20);

    // (4,4) is part of the standing match and sits next to the encased cell.
    const first = await page.evaluate(() => window.__northlightTest.resolve());
    expect(first.encased[4][5]).toBeLessThanOrEqual(1);

    await page.evaluate((board) => {
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setEncased([{ r: 4, c: 5, layers: 1 }]);
      window.__northlightTest.clearAudioEvents();
    }, matchBoard());

    const second = await page.evaluate(() => window.__northlightTest.resolve());
    expect(second.encased[4][5]).toBe(0);
    expect(await page.evaluate(() => window.__northlightTest.audioEvents())).toContain("ice");
    expect(boardIsFull(second)).toBe(true);
  });

  test("collect objectives count only the named crystals", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate((board) => {
      window.__northlightTest.setSeed(5);
      window.__northlightTest.setObjective({ kind: "collect", colors: [1], perColor: 6, target: 6 });
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setMoves(20);
    }, matchBoard());

    const state = await page.evaluate(() => window.__northlightTest.resolve());
    expect(state.objective.collected[1]).toBeGreaterThanOrEqual(3);
    expect(state.objective.progress).toBe(Math.min(state.objective.collected[1], 6));

    // A dual-colour order caps each colour independently.
    await page.evaluate(() => {
      window.__northlightTest.setObjective({ kind: "collect", colors: [2, 3], perColor: 4, target: 8 });
    });
    const dual = await snapshot(page);
    expect(dual.objective.target).toBe(8);
    expect(dual.objective.progress).toBe(0);
  });

  test("cascades multiply the score and climb the audio ladder", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate((board) => {
      window.__northlightTest.setSeed(2);
      window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setMoves(30);
      window.__northlightTest.setScore(0);
      window.__northlightTest.clearAudioEvents();
    }, stableBoard);

    // A core against a plain gem clears a whole colour, which reliably cascades.
    await page.evaluate(
      ({ board, core }) => {
        window.__northlightTest.setBoard(board, [{ r: 4, c: 4, special: core }]);
      },
      { board: stableBoard, core: (await page.evaluate(() => window.__northlightTest.constants)).CORE },
    );

    expect(await page.evaluate(() => window.__northlightTest.swap(4, 4, 4, 5))).toBe(true);
    const state = await snapshot(page);
    const events = await page.evaluate(() => window.__northlightTest.audioEvents());

    expect(state.score).toBeGreaterThan(0);
    expect(state.bestChain).toBeGreaterThanOrEqual(1);
    expect(events).toContain("fire:core");
    expect(state.chain).toBe(0);
    expect(state.matchCount).toBe(0);
  });

  test("aurora rush spends every remaining move and finishes the night", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate((board) => {
      window.__northlightTest.setSeed(13);
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setObjective({ kind: "score", target: 1 });
      window.__northlightTest.setMoves(5);
      window.__northlightTest.setScore(0);
      window.__northlightTest.clearAudioEvents();
    }, stableBoard);

    const state = await page.evaluate(() => window.__northlightTest.runAuroraRush());
    const events = await page.evaluate(() => window.__northlightTest.audioEvents());

    expect(state.moves).toBe(0);
    expect(state.rushing).toBe(false);
    expect(state.score).toBeGreaterThanOrEqual(5 * 500);
    expect(state.rushScore).toBeGreaterThanOrEqual(5 * 500);
    expect(events.filter((id) => id === "rush").length).toBeGreaterThanOrEqual(5);
    expect(state.matchCount).toBe(0);
  });

  test("awards stars by threshold and walks the campaign forward", async ({ page }) => {
    await openGame(page);
    await playLevel(page);
    const table = await page.evaluate(() => window.__northlightTest.levelTable());

    for (const [score, expected] of [
      [table[0].star2 - 1, 1],
      [table[0].star2, 2],
      [table[0].star3, 3],
    ] as Array<[number, number]>) {
      await page.evaluate((value) => window.__northlightTest.setScore(value), score);
      expect((await snapshot(page)).stars, `score ${score}`).toBe(expected);
    }

    await page.evaluate(() => window.__northlightTest.completeLevel());
    await expect(page.locator("#completeScreen")).toHaveClass(/active/);
    await expect(page.locator("#completeStars")).toContainText("★");

    await page.locator("#nextLevelButton").click();
    await expect.poll(async () => (await snapshot(page)).level).toBe(1);
    const second = await snapshot(page);
    expect(second.levelName).toBe("Thin Ice");
    expect(second.moves).toBe(table[1].moves);
    expect(second.objective.kind).toBe("rime");
  });

  test("fails when the moves run out and retries cleanly", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate((board) => {
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setMoves(0);
      window.__northlightTest.setScore(400);
    }, stableBoard);

    await page.evaluate(() => window.__northlightTest.finishTurn());
    await expect(page.locator("#failedScreen")).toHaveClass(/active/);
    await expect(page.locator("#failedCopy")).toContainText("ran out of moves");

    await page.locator("#retryButton").click();
    await expect.poll(async () => (await snapshot(page)).screen).toBe("play");

    const state = await snapshot(page);
    expect(state.level).toBe(0);
    expect(state.moves).toBe(20);
    expect(state.score).toBe(0);
    expect(state.active).toBe(true);
    expect(state.hasMove).toBe(true);
  });

  test("keeps hints free, charges one move for a manual shuffle, and reshuffles dead boards for nothing", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate((board) => {
      window.__northlightTest.setSeed(77);
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
      window.__northlightTest.setMoves(12);
    }, fourMatchBoard());

    expect(await page.evaluate(() => window.__northlightTest.hint(true))).not.toBeNull();
    expect((await snapshot(page)).moves).toBe(12);

    await expect(page.locator("#shuffleButton")).toBeEnabled();
    expect(await page.evaluate(() => window.__northlightTest.shuffle(true))).toBe(true);
    const shuffled = await snapshot(page);
    expect(shuffled.moves).toBe(11);
    expect(shuffled.matchCount).toBe(0);
    expect(shuffled.hasMove).toBe(true);

    // A dead board recovers on its own without spending anything.
    await page.evaluate(() => {
      window.__northlightTest.setSeed(91);
      window.__northlightTest.setMoves(4);
    });
    await page.evaluate(() => window.__northlightTest.finishTurn());
    const recovered = await snapshot(page);
    expect(recovered.moves).toBe(4);
    expect(recovered.hasMove).toBe(true);
  });

  test("ranks a core fusion above an ordinary match", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate(
      ({ board, core, bloom }) => {
        window.__northlightTest.setBoard(board, [
          { r: 7, c: 5, special: core },
          { r: 7, c: 6, special: bloom },
        ]);
      },
      {
        board: fourMatchBoard(),
        core: (await page.evaluate(() => window.__northlightTest.constants)).CORE,
        bloom: (await page.evaluate(() => window.__northlightTest.constants)).BLOOM,
      },
    );

    const best = await page.evaluate(() => window.__northlightTest.bestMove());
    expect(best?.reason).toBe("core fusion");
    expect(best?.a.r).toBe(7);
    expect(best?.b.r).toBe(7);
  });

  test("supports dragging, click-to-click, keyboard swaps and tap-to-detonate", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    const setup = async () => {
      await page.evaluate((board) => {
        window.__northlightTest.setSeed(44);
        // Real animation speed: this test is about input reaching a board that is genuinely busy.
        window.__northlightTest.setSpeed(1);
        window.__northlightTest.setBoard(board);
        window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
        window.__northlightTest.setMoves(10);
      }, fourMatchBoard());
    };

    const centre = async (r: number, c: number) => {
      const rect = await page.evaluate(([rr, cc]) => window.__northlightTest.cellRect(rr, cc), [r, c]);
      return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    };

    // Drag.
    await setup();
    const from = await centre(2, 2);
    const to = await centre(3, 2);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await page.mouse.up();
    await settledMoves(page, 9);

    // Click, then click the neighbour.
    await setup();
    await page.mouse.click(from.x, from.y);
    await page.mouse.click(to.x, to.y);
    await settledMoves(page, 9);

    // Keyboard: move the cursor from (0,0), hold with Enter, then push with an arrow.
    await page.evaluate((board) => {
      window.__northlightTest.setSeed(44);
      window.__northlightTest.startLevel(0);
      window.__northlightTest.setSpeed(1);
      window.__northlightTest.setBoard(board);
      window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
      window.__northlightTest.setMoves(10);
    }, fourMatchBoard());
    for (let i = 0; i < 2; i += 1) await page.keyboard.press("ArrowDown");
    for (let i = 0; i < 2; i += 1) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await settledMoves(page, 9);

    // Tap-to-detonate a bloom.
    await page.evaluate(
      ({ board, bloom }) => {
        window.__northlightTest.setBoard(board, [{ r: 4, c: 4, special: bloom }]);
        window.__northlightTest.setMoves(10);
        window.__northlightTest.setScore(0);
      },
      { board: stableBoard, bloom: (await page.evaluate(() => window.__northlightTest.constants)).BLOOM },
    );
    expect(await page.evaluate(() => window.__northlightTest.detonate(4, 4))).toBe(true);
    const blown = await snapshot(page);
    expect(blown.moves).toBe(9);
    expect(totalCleared(blown)).toBeGreaterThanOrEqual(13);
  });

  test("ships twelve rising nights with rotating objectives and refillable shapes", async ({ page }) => {
    await openGame(page);
    const table = await page.evaluate(() => window.__northlightTest.levelTable());

    expect(table).toHaveLength(12);

    const kinds = table.map((row) => row.objective.kind);
    expect(kinds.filter((kind) => kind === "score").length).toBeGreaterThanOrEqual(4);
    expect(kinds.filter((kind) => kind === "rime").length).toBeGreaterThanOrEqual(4);
    expect(kinds.filter((kind) => kind === "collect").length).toBeGreaterThanOrEqual(3);
    expect(kinds).toContain("dual");

    expect(table.filter((row) => row.holes > 0).length).toBeGreaterThanOrEqual(6);
    expect(table.filter((row) => row.encased > 0).length).toBeGreaterThanOrEqual(2);
    expect(table.filter((row) => row.rimeLayers > row.rimeCells).length).toBeGreaterThanOrEqual(2);

    let previousTypes = 0;
    for (const row of table) {
      expect(row.refillOk, `${row.name} refillable`).toBe(true);
      expect(row.openCells, `${row.name} open cells`).toBeGreaterThanOrEqual(40);
      expect(row.openCells + row.holes).toBe(81);
      expect(row.types).toBeGreaterThanOrEqual(5);
      expect(row.types).toBeLessThanOrEqual(7);
      expect(row.types, `${row.name} type ramp`).toBeGreaterThanOrEqual(previousTypes);
      previousTypes = row.types;
      expect(row.moves).toBeGreaterThan(0);
      expect(row.objective.target).toBeGreaterThan(0);
      expect(row.star3).toBeGreaterThan(row.star2);
      expect(row.star2).toBeGreaterThan(0);
    }
  });

  test("fills the 1280 by 720 desktop viewport with rails and no overflow", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    const state = await snapshot(page);
    expect(state.layout.mode).toBe("rails");
    expect(state.layout.boardSize).toBeGreaterThanOrEqual(600);
    expect(state.layout.boardX).toBeGreaterThanOrEqual(0);
    expect(state.layout.boardX + state.layout.boardSize).toBeLessThanOrEqual(1280);
    expect(state.layout.boardY + state.layout.boardSize).toBeLessThanOrEqual(720);

    const selectors = [
      "#nightName", "#objectiveValue", "#objectiveFill", "#movesValue",
      "#scoreValue", "#chainFill", "#legend", "#keyHints",
      "#hintButton", "#shuffleButton", "#audioButton", "#pauseButton",
    ];
    for (const selector of selectors) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      if (!box) continue;
      expect(box.x, selector).toBeGreaterThanOrEqual(-1);
      expect(box.y, selector).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(1281);
      expect(box.y + box.height, selector).toBeLessThanOrEqual(721);
    }

    // The rails must not sit on top of the board.
    const left = await page.locator("#railLeft").boundingBox();
    const right = await page.locator("#railRight").boundingBox();
    expect(left!.x + left!.width).toBeLessThanOrEqual(state.layout.boardX + 1);
    expect(right!.x).toBeGreaterThanOrEqual(state.layout.boardX + state.layout.boardSize - 1);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(721);
  });

  test("stacks the HUD at 320 by 480 without overflow or console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await openGame(page, { width: 320, height: 480 });
    await page.locator("#startButton").click();
    await expect.poll(async () => (await snapshot(page)).screen, { timeout: 10_000 }).toBe("play");

    const state = await snapshot(page);
    expect(state.layout.mode).toBe("stack");
    expect(state.layout.boardX).toBeGreaterThanOrEqual(0);
    expect(state.layout.boardY).toBeGreaterThanOrEqual(0);
    expect(state.layout.boardX + state.layout.boardSize).toBeLessThanOrEqual(320);
    expect(state.layout.boardY + state.layout.boardSize).toBeLessThanOrEqual(480);
    expect(state.effectBudget).toBe(340);

    for (const selector of ["#board", "#nightName", "#objectiveValue", "#movesValue", "#scoreValue", "#hintButton", "#shuffleButton"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      if (!box) continue;
      expect(box.x, selector).toBeGreaterThanOrEqual(-1);
      expect(box.y, selector).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, selector).toBeLessThanOrEqual(321);
      expect(box.y + box.height, selector).toBeLessThanOrEqual(481);
    }

    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(481);
    expect(errors).toEqual([]);
  });

  test("honours reduced motion and its 110-particle budget", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openGame(page);
    await playLevel(page);

    const state = await snapshot(page);
    expect(state.reducedMotion).toBe(true);
    expect(state.effectBudget).toBe(110);
    expect(state.particleCount).toBeLessThanOrEqual(110);
    await expect(page.locator("#app")).toHaveCSS("animation-duration", "0.001s");
  });

  test("a core caught in a fusion blast clears the fused colour, not the dominant one", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    // Checkerboard: type 0 fills every other cell, so it is unambiguously the dominant colour.
    const board = Array.from({ length: GRID }, (_, r) =>
      Array.from({ length: GRID }, (_, c) => ((r + c) % 2 === 0 ? 0 : 1 + ((r * 3 + c) % 3))),
    );
    board[4][5] = 4; // the gem the core is fused with
    board[6][3] = 4; // a fracture riding the same colour, aimed at row 6

    const constants = await page.evaluate(() => window.__northlightTest.constants);
    await page.evaluate(
      ({ matrix, CORE, FRACTURE_ROW }) => {
        window.__northlightTest.setSeed(64);
        window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
        window.__northlightTest.setBoard(matrix, [
          { r: 4, c: 4, special: CORE },
          { r: 6, c: 3, special: FRACTURE_ROW },
          { r: 6, c: 7, special: CORE }, // swept up by the fracture, fires second
        ]);
        window.__northlightTest.setMoves(10);
        window.__northlightTest.setScore(0);
      },
      { matrix: board, CORE: constants.CORE, FRACTURE_ROW: constants.FRACTURE_ROW },
    );

    const before = await snapshot(page);
    const dominant = before.board.flat().filter((tile) => tile?.type === 0 && tile.special === 0).length;
    expect(dominant).toBeGreaterThan(35);

    expect(await page.evaluate(() => window.__northlightTest.swap(4, 4, 4, 5))).toBe(true);

    const after = await snapshot(page);
    expect(after.objective.collected[4]).toBeGreaterThanOrEqual(2);
    // The second core must inherit colour 4. If it fell back to the dominant colour it would
    // have swept every type-0 gem off the board in one go.
    expect(after.objective.collected[0]).toBeLessThan(dominant);
  });

  test("ignores retry and shuffle hotkeys while a turn is still resolving", async ({ page }) => {
    await openGame(page);
    await playLevel(page);

    await page.evaluate((matrix) => {
      window.__northlightTest.setSeed(101);
      window.__northlightTest.setSpeed(0.5); // stretch the cascade so the keys land mid-flight
      window.__northlightTest.setBoard(matrix);
      window.__northlightTest.setObjective({ kind: "score", target: 9_999_999 });
      window.__northlightTest.setMoves(10);
    }, fourMatchBoard());

    // Start the swap without awaiting it, so the board is mid-resolution.
    await page.evaluate(() => { void window.__northlightTest.swap(2, 2, 3, 2); });
    await expect.poll(async () => (await snapshot(page)).locked).toBe(true);

    await page.keyboard.press("s");
    await page.keyboard.press("S");
    await page.keyboard.press("r");
    await page.keyboard.press("R");

    await expect.poll(async () => (await snapshot(page)).locked, { timeout: 15_000 }).toBe(false);
    await page.evaluate(() => window.__northlightTest.setSpeed(30));

    const state = await snapshot(page);
    expect(state.level, "retry must not have restarted the night").toBe(0);
    expect(state.moves, "only the swap may charge a move").toBe(9);
    expect(state.matchCount).toBe(0);
    expect(boardIsFull(state)).toBe(true);

    // Once the turn is over the same keys work normally.
    await page.keyboard.press("s");
    await settledMoves(page, 8);
  });

  test("replays identically from a seed, because effects never touch the gameplay stream", async ({ page }) => {
    await openGame(page);

    const run = () =>
      page.evaluate(async () => {
        const t = window.__northlightTest;
        t.setSpeed(30);
        t.setSeed(8181);
        t.startLevel(4);
        const trace: string[] = [];
        for (let turn = 0; turn < 12; turn += 1) {
          const move = t.bestMove();
          if (!move) { await t.shuffle(false); trace.push("shuffle"); continue; }
          await t.swap(move.a.r, move.a.c, move.b.r, move.b.c);
          const s = t.snapshot();
          trace.push(`${move.a.r}${move.a.c}${move.b.r}${move.b.c}:${s.score}:${s.rimeCleared}:${s.moves}`);
        }
        const s = t.snapshot();
        return { trace, board: s.board.map((row) => row.map((tile) => (tile ? `${tile.type}.${tile.special}` : "-")).join("")) };
      });

    const first = await run();
    const second = await run();

    expect(first.trace.length).toBeGreaterThan(0);
    expect(second.trace).toEqual(first.trace);
    expect(second.board).toEqual(first.board);
  });

  test("exposes no test hooks without the test flag", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/games/tile-matching/opus-5/index.html");
    await expect(page.locator("#titleScreen")).toHaveClass(/active/);
    await expect(page.locator("#nightStrip .night-chip")).toHaveCount(12);

    expect(await page.evaluate(() => "__northlightTest" in window)).toBe(false);
    expect(errors).toEqual([]);
  });
});
