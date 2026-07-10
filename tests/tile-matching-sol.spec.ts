import { expect, test, type Page } from "@playwright/test";

type SolSnapshot = {
  board: Array<Array<{ type: number; special: number; id: number } | null>>;
  score: number;
  moves: number;
  level: number;
  combo: number;
  surge: number;
  surgeTime: number;
  active: boolean;
  locked: boolean;
  screen: string;
  matchCount: number;
  hasMove: boolean;
};

type SolTestApi = {
  constants: {
    NONE: number;
    BEAM_ROW: number;
    BEAM_COL: number;
    CORONA: number;
    CORE: number;
  };
  snapshot(): SolSnapshot;
  setSeed(seed: number): boolean;
  setBoard(matrix: number[][], specials?: Array<{ r: number; c: number; special: number }>): boolean;
  setMoves(moves: number): void;
  setObjective(target: number, eclipse?: Array<{ r: number; c: number; layers?: number }>): void;
  swap(r1: number, c1: number, r2: number, c2: number): Promise<boolean>;
  resolve(): Promise<SolSnapshot>;
  shuffle(charge?: boolean): Promise<boolean>;
  activateSurge(): void;
  startRun(): void;
  endRun(): void;
  completeLevel(): void;
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

async function openGame(page: Page, viewport = { width: 900, height: 760 }) {
  await page.setViewportSize(viewport);
  await page.goto("/games/tile-matching/gpt-5-6-sol/index.html?test=1");
  await expect(page.locator("#titleScreen")).toHaveClass(/active/);
  await expect.poll(() => page.evaluate(() => Boolean(window.__solFlareTest))).toBe(true);
}

async function snapshot(page: Page) {
  return page.evaluate(() => window.__solFlareTest.snapshot());
}

test.describe("GPT 5.6 Sol Tile Matching", () => {
  test("starts with procedural audio and a playable board", async ({ page }) => {
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

    await page.locator("#startButton").click();

    await expect(page.locator("#titleScreen")).not.toHaveClass(/active/);
    await expect.poll(() => page.evaluate(() => window.__solAudioStarts ?? 0)).toBeGreaterThan(0);
    const state = await snapshot(page);
    expect(state.active).toBe(true);
    expect(state.moves).toBeGreaterThan(0);
    expect(state.board).toHaveLength(8);
    expect(state.board.every((row) => row.length === 8 && row.every(Boolean))).toBe(true);
    expect(state.matchCount).toBe(0);
    expect(state.hasMove).toBe(true);
  });

  test("rejects an invalid swap without spending a move", async ({ page }) => {
    await openGame(page);
    await page.evaluate((board) => {
      window.__solFlareTest.setBoard(board);
      window.__solFlareTest.setMoves(12);
    }, stableBoard);

    const accepted = await page.evaluate(() => window.__solFlareTest.swap(0, 0, 0, 1));
    const state = await snapshot(page);

    expect(accepted).toBe(false);
    expect(state.moves).toBe(12);
    expect(state.board[0][0]?.type).toBe(0);
    expect(state.board[0][1]?.type).toBe(1);
  });

  test("creates a beam from a four-match and resolves cascades", async ({ page }) => {
    await openGame(page);
    const board = stableBoard.map((row) => row.slice());
    board[3] = [1, 1, 2, 1, 4, 5, 6, 0];
    board[2][2] = 1;
    await page.evaluate((matrix) => {
      window.__solFlareTest.setSeed(55);
      window.__solFlareTest.setBoard(matrix);
      window.__solFlareTest.setMoves(9);
    }, board);

    const accepted = await page.evaluate(() => window.__solFlareTest.swap(2, 2, 3, 2));
    const state = await snapshot(page);

    expect(accepted).toBe(true);
    expect(state.moves).toBe(8);
    expect(state.score).toBeGreaterThan(0);
    expect(state.board.flat().some((tile) => tile?.special === 1)).toBe(true);
    expect(state.matchCount).toBe(0);
  });

  test("forges corona and Sol-core specials from T and five matches", async ({ page }) => {
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

  test("combines a Sol core with a beam into a board-scale reaction", async ({ page }) => {
    await openGame(page);
    await page.evaluate((board) => {
      const { CORE, BEAM_ROW } = window.__solFlareTest.constants;
      window.__solFlareTest.setSeed(9);
      window.__solFlareTest.setBoard(board, [
        { r: 4, c: 3, special: CORE },
        { r: 4, c: 4, special: BEAM_ROW },
      ]);
      window.__solFlareTest.setMoves(10);
    }, stableBoard);

    const accepted = await page.evaluate(() => window.__solFlareTest.swap(4, 3, 4, 4));
    const state = await snapshot(page);

    expect(accepted).toBe(true);
    expect(state.moves).toBe(9);
    expect(state.score).toBeGreaterThan(1_000);
    expect(state.surge).toBeGreaterThan(0);
    expect(state.board.every((row) => row.every(Boolean))).toBe(true);
    expect(state.matchCount).toBe(0);
  });

  test("activates Solar Surge and doubles the live-state presentation", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__solFlareTest.startRun();
      window.__solFlareTest.activateSurge();
    });

    await expect(page.locator("body")).toHaveClass(/surge-active/);
    await expect(page.locator("#surgeState")).toContainText("×2");
    expect((await snapshot(page)).surgeTime).toBeGreaterThan(0);
  });

  test("shows level-clear and game-over restart flows", async ({ page }) => {
    await openGame(page);
    await page.evaluate(() => {
      window.__solFlareTest.startRun();
      window.__solFlareTest.completeLevel();
    });
    await expect(page.locator("#levelScreen")).toHaveClass(/active/);
    await page.locator("#nextButton").click();
    expect((await snapshot(page)).level).toBe(2);

    await page.evaluate(() => window.__solFlareTest.endRun());
    await expect(page.locator("#gameOverScreen")).toHaveClass(/active/);
    await page.locator("#restartButton").click();
    await expect(page.locator("#gameOverScreen")).not.toHaveClass(/active/);
    expect((await snapshot(page)).level).toBe(1);
  });

  test("keeps board and essential controls visible at 320 by 480", async ({ page }) => {
    await openGame(page, { width: 320, height: 480 });
    await page.locator("#startButton").click();

    const viewport = page.viewportSize();
    const canvasBox = await page.locator("#game").boundingBox();
    const hintBox = await page.locator("#hintButton").boundingBox();
    const shuffleBox = await page.locator("#shuffleButton").boundingBox();

    expect(viewport).not.toBeNull();
    expect(canvasBox).not.toBeNull();
    expect(hintBox).not.toBeNull();
    expect(shuffleBox).not.toBeNull();
    expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(481);
    if (viewport && canvasBox && hintBox && shuffleBox) {
      for (const box of [canvasBox, hintBox, shuffleBox]) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      }
    }
  });
});
