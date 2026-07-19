import { test, expect } from "@playwright/test";

const games = [
  "snake",
  "pac-man",
  "minesweeper",
  "tetris",
  "reversi",
  "breakout",
  "2048",
  "endless-runner",
  "marble-madness",
  "maze-3d",
  "mini-golf",
  "tile-matching",
  "space-invaders",
  "sudoku",
  "outrun-racer",
  "coastal-rush-86",
  "clockwork-caper",
  "kart-racing",
];

test.describe("BrainRot Games — Smoke Tests", () => {
  test("landing page loads with hero and game cards", async ({ page }) => {
    await page.goto("/");

    // Hero section
    await expect(page.locator("h1")).toContainText("BRAINROT");
    await expect(page.locator("h1")).toContainText("GAMES");

    // Tagline
    await expect(page.getByText("100% AI-generated")).toBeVisible();

    // Arena section with 18 game cards
    const arena = page.locator("#arena");
    const gameCards = arena.locator('a[href^="/games/"]');
    await expect(gameCards).toHaveCount(18);

    // Game card titles present in arena section
    await expect(
      arena.locator('a[href="/games/snake"]').getByRole("heading", { name: "Snake" }),
    ).toBeVisible();
    await expect(
      arena.locator('a[href="/games/pac-man"]').getByRole("heading", { name: "Pac-Man" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/minesweeper"]')
        .getByRole("heading", { name: "Minesweeper" }),
    ).toBeVisible();
    await expect(
      arena.locator('a[href="/games/tetris"]').getByRole("heading", { name: "Tetris" }),
    ).toBeVisible();
    await expect(
      arena.locator('a[href="/games/reversi"]').getByRole("heading", { name: "Reversi" }),
    ).toBeVisible();
    await expect(
      arena.locator('a[href="/games/breakout"]').getByRole("heading", { name: "Breakout" }),
    ).toBeVisible();
    await expect(
      arena.locator('a[href="/games/2048"]').getByRole("heading", { name: "2048" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/endless-runner"]')
        .getByRole("heading", { name: "Endless Runner" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/marble-madness"]')
        .getByRole("heading", { name: "Marble Madness" }),
    ).toBeVisible();
    await expect(
      arena.locator('a[href="/games/maze-3d"]').getByRole("heading", { name: "3D Maze" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/mini-golf"]')
        .getByRole("heading", { name: "Mini Golf 3D" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/tile-matching"]')
        .getByRole("heading", { name: "Tile Matching" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/space-invaders"]')
        .getByRole("heading", { name: "Space Invaders" }),
    ).toBeVisible();
    await expect(
      arena.locator('a[href="/games/sudoku"]').getByRole("heading", { name: "Sudoku" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/outrun-racer"]')
        .getByRole("heading", { name: "Neon Horizon Racer" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/coastal-rush-86"]')
        .getByRole("heading", { name: "Coastal Rush '86" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/clockwork-caper"]')
        .getByRole("heading", { name: "Clockwork Caper" }),
    ).toBeVisible();
    await expect(
      arena
        .locator('a[href="/games/kart-racing"]')
        .getByRole("heading", { name: "Sunbeam Kart Rally" }),
    ).toBeVisible();
  });

  test("navbar has correct links", async ({ page }) => {
    await page.goto("/");

    // Brand link
    await expect(page.locator("nav").getByText("BRAINROT")).toBeVisible();

    // GitHub link
    const githubLink = page.locator('nav a[href*="github.com"]');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute(
      "href",
      "https://github.com/sasler/BrainRot",
    );
  });

  for (const game of games) {
    test(`game detail page loads for ${game} with versions`, async ({ page }) => {
      await page.goto(`/games/${game}`);

      // AI implementations section (games have versions now)
      await expect(
        page.getByRole("heading", { name: "AI IMPLEMENTATIONS" }),
      ).toBeVisible();

      if (["outrun-racer", "coastal-rush-86"].includes(game)) {
        await expect(page.getByRole("heading", { name: "OpenAI GPT 5.5", exact: true })).toBeVisible();
        return;
      }

      if (game === "clockwork-caper") {
        await expect(page.getByRole("heading", { name: "OpenAI GPT 5.6 Sol", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "OpenAI GPT 5.6 Terra", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "OpenAI GPT 5.6 Luna", exact: true })).toBeVisible();
        return;
      }

      if (game === "kart-racing") {
        await expect(page.getByRole("heading", { name: "OpenAI GPT 5.6 Sol", exact: true })).toBeVisible();
        return;
      }

      await expect(page.getByRole("heading", { name: "Claude Sonnet 4.6" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "OpenAI GPT 5.4", exact: true })).toBeVisible();

      if (!["pac-man", "sudoku"].includes(game)) {
        await expect(page.getByRole("heading", { name: "Claude Opus 4.6" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "OpenAI GPT 5.4 Mini" })).toBeVisible();
      }
    });
  }

  test("navigation from landing to game page works", async ({ page }) => {
    await page.goto("/");

    // Click the Snake card
    await page.locator('a[href="/games/snake"]').click();
    await expect(page).toHaveURL("/games/snake");
    await expect(page.locator("h1")).toContainText("Snake");
  });

  test("navigation back to home from game page works", async ({ page }) => {
    await page.goto("/games/tetris");

    // Click Home in breadcrumb
    await page.getByRole("main").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });

  test("API endpoint returns game data", async ({ request }) => {
    const response = await request.get("/api/games");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.games).toHaveLength(18);
    expect(data.games.map((g: { id: string }) => g.id)).toEqual([
      "snake",
      "minesweeper",
      "tetris",
      "reversi",
      "breakout",
      "2048",
      "endless-runner",
      "marble-madness",
      "maze-3d",
      "mini-golf",
      "tile-matching",
      "space-invaders",
      "pac-man",
      "sudoku",
      "outrun-racer",
      "coastal-rush-86",
      "clockwork-caper",
      "kart-racing",
    ]);
  });

  test("how it works section is present", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("HOW IT WORKS")).toBeVisible();
    await expect(page.getByText("Choose a Game")).toBeVisible();
    await expect(page.getByText("Pick an AI Version")).toBeVisible();
    await expect(page.getByText("Play & Compare")).toBeVisible();
  });

  test("footer is present with correct info", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.locator("footer").getByText("Built for testing AI models"),
    ).toBeVisible();
    await expect(
      page.locator("footer").locator('a[href*="github.com"]'),
    ).toBeVisible();
  });

  test("404 page works for invalid game", async ({ page }) => {
    const response = await page.goto("/games/nonexistent");
    expect(response?.status()).toBe(404);
  });
});
