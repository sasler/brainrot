import { expect, test, type Page } from "@playwright/test";

type Tile = { type: number; special: number; id: number } | null;

type SolSnapshot = {
  board: Tile[][];
  eclipse: number[][];
  score: number;
  moves: number;
  level: number;
  target: number;
  stageStartScore: number;
  stageGoal: number;
  combo: number;
  surge: number;
  surgeTurns: number;
  eclipseTotal: number;
  eclipseBonusAwarded: boolean;
  reducedMotion: boolean;
  particleCount: number;
  effectBudget: number;
  active: boolean;
  locked: boolean;
  screen: string;
  matchCount: number;
  hasMove: boolean;
  hint: { a: Cell; b: Cell; score: number; reason: string } | null;
  layout: { width: number; height: number; boardX: number; boardY: number; boardSize: number; cell: number };
};

type Cell = { r: number; c: number };

type SolTestApi = {
  constants: {
    NONE: number;
    BEAM_ROW: number;
    BEAM_COL: number;
    CORONA: number;
    CORE: number;
    START_MOVES: number;
    FIRST_ORBIT_GOAL: number;
    ORBIT_MOVE_REWARD: number;
    ECLIPSE_MOVE_REWARD: number;
    SURGE_TURN_COUNT: number;
  };
  snapshot(): SolSnapshot;
  setSeed(seed: number): boolean;
  setBoard(matrix: number[][], specials?: Array<Cell & { special: number }>): boolean;
  setMoves(moves: number): void;
  setScore(score: number): void;
  setLevel(level: number): void;
  setObjective(target: number, eclipse?: Array<Cell & { layers?: number }>): void;
  swap(r1: number, c1: number, r2: number, c2: number): Promise<boolean>;
  resolve(): Promise<SolSnapshot>;
  shuffle(charge?: boolean): Promise<boolean>;
  activateSurge(): void;
  startRun(): void;
  endRun(message?: string): void;
  completeOrbit(): Promise<void>;
  finishTurn(): Promise<void>;
  requestHint(force?: boolean): Promise<{ a: Cell; b: Cell; score: number; reason: string } | null>;
  bestMove(): { a: Cell; b: Cell; score: number; reason: string } | null;
};

declare global {
  interface Window {
    __solFlareTest: SolTestApi;
    __solAudioStarts?: number;
  }
}

const stableBoard = [
  [0, 1, 2, 3, 4, 5, 6, 0],
  [1, 2, 3, 4, 5, 6, 0, 1],
  [2, 3, 4, 5, 6, 0, 1, 2],
  [3, 4, 5, 6, 0, 1, 2, 3],
  [4, 5, 6, 0, 1, 2, 3, 4],
  [5, 6, 0, 1, 2, 3, 4, 5],
  [6, 0, 1, 2, 3, 4, 5, 6],
  [0, 1, 2, 3, 4, 5, 6, 0],
];

function fourMatchBoard() {
  const board = stableBoard.map((row) => row.slice());
  board[3] = [1, 1, 2, 1, 4, 5, 6, 0];
  board[2][2] = 1;
  return board;
}

async function openGame(page: Page, viewport = { width: 900, height: 760 }) {
  await page.setViewportSize(viewport);
  await page.goto("/games/tile-matching/gpt-5-6-sol/index.html?test=1");
  await expect(page.locator("#titleScreen")).toHaveClass(/active/);
  await expect.poll(() => page.evaluate(() => Boolean(window.__solFlareTest))).toBe(true);
}

async function snapshot(page: Page) {
  return page.evaluate(() => window.__solFlareTest.snapshot());
}

test.describe("GPT 5.6 Sol Tile Matching", {
  tag: ["@spec:tile-matching-sol", "@game:tile-matching/gpt-5-6-sol"],
}, () => {
  test("starts with 36 moves, clear rewards, audio, and a deterministic legal board", async ({ page }) => {
    await page.addInitScript(() => {
      window.__solAudioStarts = 0;
      if (!("OscillatorNode" in window)) return;
      const prototype = window.OscillatorNode.prototype;
      const original = prototype.start;
      prototype.start = function (...args) {
        window.__solAudioStarts = (window.__solAudioStarts ?? 0) + 1;
        return original.apply(this, args);
      };
    });
    await openGame(page);

    for (const seed of [1, 42, 2026]) {
      await page.evaluate((value) => {
        window.__solFlareTest.setSeed(value);
        window.__solFlareTest.startRun();
      }, seed);
      const state = await snapshot(page);
      expect(state.moves).toBe(36);
      expect(state.target).toBe(6_500);
      expect(state.stageGoal).toBe(6_500);
      expect(state.matchCount).toBe(0);
      expect(state.hasMove).toBe(true);
      expect(state.board).toHaveLength(8);
      expect(state.board.every((row) => row.length === 8 && row.every(Boolean))).toBe(true);
    }

    await expect(page.locator("#objectiveCopy")).toContainText("0 / 6,500");
    await expect(page.locator("#rewardCopy")).toContainText("+12 moves");
    await expect(page.locator("#eclipseCopy")).toContainText("orbit 02");
    await expect.poll(() => page.evaluate(() => window.__solAudioStarts ?? 0)).toBeGreaterThan(0);
    await page.evaluate(() => window.__solFlareTest.setObjective(0));
    expect((await snapshot(page)).stageGoal).toBe(1);
  });

  test("charges one move only for valid swaps and nothing for rejection", async ({ page }) => {
    await openGame(page);
    await page.evaluate((board) => {
      window.__solFlareTest.setBoard(board);
      window.__solFlareTest.setMoves(12);
    }, stableBoard);

    expect(await page.evaluate(() => window.__solFlareTest.swap(0, 0, 0, 1))).toBe(false);
    expect((await snapshot(page)).moves).toBe(12);

    await page.evaluate((board) => {
      window.__solFlareTest.setSeed(55);
      window.__solFlareTest.setBoard(board);
      window.__solFlareTest.setObjective(999_999);
    }, fourMatchBoard());
    expect(await page.evaluate(() => window.__solFlareTest.swap(2, 2, 3, 2))).toBe(true);
    const state = await snapshot(page);
    expect(state.moves).toBe(11);
    expect(state.score).toBeGreaterThan(0);
    expect(state.board.flat().some((tile) => tile?.special === 1)).toBe(true);
    expect(state.matchCount).toBe(0);
  });

  test("forges corona and Sol Core specials", async ({ page }) => {
    await openGame(page);
    const coronaBoard = stableBoard.map((row) => row.slice());
    coronaBoard[3][2] = 1;
    coronaBoard[3][3] = 1;
    coronaBoard[3][4] = 1;
    coronaBoard[2][3] = 1;
    coronaBoard[4][3] = 1;
    await page.evaluate((matrix) => {
      window.__solFlareTest.setSeed(21);
      window.__solFlareTest.setBoard(matrix);
    }, coronaBoard);
    let state = await page.evaluate(() => window.__solFlareTest.resolve());
    expect(state.board.flat().some((tile) => tile?.special === 3)).toBe(true);

    const coreBoard = stableBoard.map((row) => row.slice());
    coreBoard[4] = [2, 2, 2, 2, 2, 0, 1, 3];
    await page.evaluate((matrix) => {
      window.__solFlareTest.setSeed(34);
      window.__solFlareTest.setBoard(matrix);
    }, coreBoard);
    state = await page.evaluate(() => window.__solFlareTest.resolve());
    expect(state.board.flat().some((tile) => tile?.special === 4)).toBe(true);
    expect(state.matchCount).toBe(0);
  });

  test("keeps special-to-special fusion reactions", async ({ page }) => {
    await openGame(page);
    await page.evaluate((board) => {
      const { CORE, BEAM_ROW } = window.__solFlareTest.constants;
      window.__solFlareTest.setSeed(9);
      window.__solFlareTest.setBoard(board, [
        { r: 4, c: 3, special: CORE },
        { r: 4, c: 4, special: BEAM_ROW },
      ]);
      window.__solFlareTest.setMoves(10);
      window.__solFlareTest.setObjective(999_999);
    }, stableBoard);

    expect(await page.evaluate(() => window.__solFlareTest.swap(4, 3, 4, 4))).toBe(true);
    const state = await snapshot(page);
    expect(state.moves).toBe(9);
    expect(state.level).toBe(1);
    expect(state.score).toBeGreaterThan(1_000);
    expect(state.board.every((row) => row.every(Boolean))).toBe(true);
    expect(state.matchCount).toBe(0);
  });

  test("awards exactly +12, preserves the board, and scales orbit targets", async ({ page }) => {
    await openGame(page);
    await page.evaluate((board) => {
      const { CORE } = window.__solFlareTest.constants;
      window.__solFlareTest.setBoard(board, [{ r: 4, c: 3, special: CORE }]);
      window.__solFlareTest.setMoves(3);
    }, stableBoard);
    const before = await snapshot(page);
    const coreBefore = before.board[4][3];

    await page.evaluate(() => window.__solFlareTest.completeOrbit());
    let after = await snapshot(page);
    expect(after.level).toBe(2);
    expect(after.moves).toBe(15);
    expect(after.stageGoal).toBe(10_600);
    expect(after.board[4][3]?.id).toBe(coreBefore?.id);
    expect(after.board[4][3]?.special).toBe(4);
    expect(after.eclipseTotal).toBeGreaterThan(0);
    expect(after.active).toBe(true);

    await page.evaluate(() => window.__solFlareTest.completeOrbit());
    after = await snapshot(page);
    expect(after.level).toBe(3);
    expect(after.moves).toBe(27);
    expect(after.stageGoal).toBe(13_300);
    expect(after.board[4][3]?.id).toBe(coreBefore?.id);
  });

  test("eclipse is optional and its +3 reward is one-time", async ({ page }) => {
    await openGame(page);
    await page.evaluate((board) => {
      window.__solFlareTest.setSeed(55);
      window.__solFlareTest.setBoard(board);
      window.__solFlareTest.setLevel(2);
      window.__solFlareTest.setMoves(10);
      window.__solFlareTest.setObjective(999_999, [{ r: 3, c: 0, layers: 1 }]);
    }, fourMatchBoard());

    await page.evaluate(() => window.__solFlareTest.swap(2, 2, 3, 2));
    let state = await snapshot(page);
    expect(state.moves).toBe(12);
    expect(state.eclipseBonusAwarded).toBe(true);
    expect(state.eclipse.flat().reduce((sum, layers) => sum + layers, 0)).toBe(0);
    await page.evaluate(() => window.__solFlareTest.resolve());
    state = await snapshot(page);
    expect(state.moves).toBe(12);

    await page.evaluate((board) => {
      const { CORE } = window.__solFlareTest.constants;
      window.__solFlareTest.setLevel(1);
      window.__solFlareTest.setBoard(board, [{ r: 4, c: 3, special: CORE }]);
      window.__solFlareTest.setMoves(5);
      window.__solFlareTest.setScore(6_500);
      window.__solFlareTest.setObjective(6_500, [{ r: 0, c: 0, layers: 2 }]);
    }, stableBoard);
    await page.evaluate(() => window.__solFlareTest.finishTurn());
    state = await snapshot(page);
    expect(state.level).toBe(2);
    expect(state.moves).toBe(17);
    expect(state.board[4][3]?.special).toBe(4);
  });

  test("Solar Surge doubles three successful turns only", async ({ page }) => {
    await openGame(page);
    const board = fourMatchBoard();
    await page.evaluate((matrix) => {
      window.__solFlareTest.setSeed(88);
      window.__solFlareTest.setBoard(matrix);
      window.__solFlareTest.setMoves(20);
      window.__solFlareTest.setScore(0);
      window.__solFlareTest.setObjective(999_999);
    }, board);
    await page.evaluate(() => window.__solFlareTest.swap(2, 2, 3, 2));
    const baseline = (await snapshot(page)).score;

    await page.evaluate((matrix) => {
      window.__solFlareTest.setSeed(88);
      window.__solFlareTest.setBoard(matrix);
      window.__solFlareTest.setMoves(20);
      window.__solFlareTest.setScore(0);
      window.__solFlareTest.activateSurge();
    }, stableBoard);
    await page.evaluate(() => window.__solFlareTest.requestHint(true));
    expect(await page.evaluate(() => window.__solFlareTest.swap(0, 0, 0, 1))).toBe(false);
    expect((await snapshot(page)).surgeTurns).toBe(3);

    for (const remaining of [2, 1, 0]) {
      await page.evaluate((matrix) => {
        window.__solFlareTest.setSeed(88);
        window.__solFlareTest.setBoard(matrix);
      }, board);
      await page.evaluate(() => window.__solFlareTest.swap(2, 2, 3, 2));
      expect((await snapshot(page)).surgeTurns).toBe(remaining);
    }
    const surged = await snapshot(page);
    expect(surged.score).toBeGreaterThanOrEqual(baseline * 6);
    expect(surged.surge).toBe(0);
    await expect(page.locator("body")).not.toHaveClass(/surge-active/);
  });

  test("keeps hints free, charges manual shuffle two, and auto-shuffles dead boards free", async ({ page }) => {
    await openGame(page);
    await page.evaluate((board) => {
      window.__solFlareTest.setSeed(77);
      window.__solFlareTest.setBoard(board);
      window.__solFlareTest.setMoves(12);
    }, stableBoard);
    expect((await snapshot(page)).hasMove).toBe(false);
    expect(await page.evaluate(() => window.__solFlareTest.requestHint(true))).not.toBeNull();
    let state = await snapshot(page);
    expect(state.moves).toBe(12);
    expect(state.hasMove).toBe(true);

    await page.evaluate((board) => {
      window.__solFlareTest.setSeed(91);
      window.__solFlareTest.setBoard(board);
      window.__solFlareTest.setMoves(2);
    }, stableBoard);
    await expect(page.locator("#shuffleButton")).toBeEnabled();
    expect(await page.evaluate(() => window.__solFlareTest.shuffle(true))).toBe(true);
    state = await snapshot(page);
    expect(state.moves).toBe(0);
    expect(state.hasMove).toBe(true);
    expect(state.matchCount).toBe(0);
  });

  test("ranks high-value fusion above scan-order matches", async ({ page }) => {
    await openGame(page);
    const board = fourMatchBoard();
    await page.evaluate((matrix) => {
      const { CORE, BEAM_ROW } = window.__solFlareTest.constants;
      window.__solFlareTest.setBoard(matrix, [
        { r: 7, c: 5, special: CORE },
        { r: 7, c: 6, special: BEAM_ROW },
      ]);
    }, board);
    const best = await page.evaluate(() => window.__solFlareTest.bestMove());
    expect(best?.a.r).toBe(7);
    expect(best?.b.r).toBe(7);
    expect(best?.reason).toBe("core fusion");
  });

  test("supports drag and keyboard swaps", async ({ page }) => {
    await openGame(page);
    const board = fourMatchBoard();
    await page.evaluate((matrix) => {
      window.__solFlareTest.setBoard(matrix);
      window.__solFlareTest.setMoves(10);
      window.__solFlareTest.setObjective(999_999);
    }, board);
    const state = await snapshot(page);
    const from = { x: state.layout.boardX + 2.5 * state.layout.cell, y: state.layout.boardY + 2.5 * state.layout.cell };
    const to = { x: state.layout.boardX + 2.5 * state.layout.cell, y: state.layout.boardY + 3.5 * state.layout.cell };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => (await snapshot(page)).moves).toBe(9);

    await page.evaluate((matrix) => {
      window.__solFlareTest.setBoard(matrix);
      window.__solFlareTest.setMoves(10);
    }, board);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await snapshot(page)).moves).toBe(9);
  });

  test("recovers cleanly from game over", async ({ page }) => {
    await openGame(page);
    await page.evaluate((board) => {
      window.__solFlareTest.setBoard(board);
      window.__solFlareTest.setMoves(0);
    }, stableBoard);
    await page.evaluate(() => window.__solFlareTest.finishTurn());
    await expect(page.locator("#gameOverScreen")).toHaveClass(/active/);
    await expect(page.locator("#gameOverCopy")).toContainText("ran out of moves");
    await page.locator("#restartButton").click();
    await expect(page.locator("#gameOverScreen")).not.toHaveClass(/active/);
    const state = await snapshot(page);
    expect(state.level).toBe(1);
    expect(state.moves).toBe(36);
    expect(state.active).toBe(true);
  });

  test("keeps the full HUD and controls visible at 320 by 480 without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await openGame(page, { width: 320, height: 480 });
    await page.locator("#startButton").click();

    const state = await snapshot(page);
    expect(state.layout.boardX).toBeGreaterThanOrEqual(0);
    expect(state.layout.boardY).toBeGreaterThanOrEqual(0);
    expect(state.layout.boardX + state.layout.boardSize).toBeLessThanOrEqual(320);
    expect(state.layout.boardY + state.layout.boardSize).toBeLessThanOrEqual(480);
    for (const selector of ["#game", "#objectiveCopy", "#eclipseBadge", "#surgeState", "#hintButton", "#shuffleButton"]) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.y).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(321);
        expect(box.y + box.height).toBeLessThanOrEqual(481);
      }
    }
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(481);
    expect(state.effectBudget).toBe(320);
    expect(errors).toEqual([]);
  });

  test("honors reduced motion and its 120-particle budget", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openGame(page, { width: 900, height: 760 });
    await page.locator("#startButton").click();
    const state = await snapshot(page);
    expect(state.reducedMotion).toBe(true);
    expect(state.effectBudget).toBe(120);
    expect(state.particleCount).toBeLessThanOrEqual(120);
    await expect(page.locator("#app")).toHaveCSS("animation-duration", "0.001s");
  });
});
