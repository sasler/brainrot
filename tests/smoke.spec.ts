import { test, expect } from "@playwright/test";

test.describe("BrainRot Games — Smoke Tests", () => {
  test("landing page loads with hero and game cards", async ({ page }) => {
    await page.goto("/");

    // Hero section
    await expect(page.locator("h1")).toContainText("BRAINROT");
    await expect(page.locator("h1")).toContainText("GAMES");

    // Tagline
    await expect(page.getByText("100% AI-generated")).toBeVisible();

    // Arena section with 8 game cards
    const gameCards = page.locator('a[href^="/games/"]');
    await expect(gameCards).toHaveCount(8);

    // Game names present in arena section
    const arena = page.locator("#arena");
    await expect(arena.getByText("Snake")).toBeVisible();
    await expect(arena.getByText("Minesweeper")).toBeVisible();
    await expect(arena.getByText("Tetris")).toBeVisible();
    await expect(arena.getByText("Reversi")).toBeVisible();
    await expect(arena.getByText("Breakout")).toBeVisible();
    await expect(arena.getByText("2048", { exact: true }).first()).toBeVisible();
    await expect(arena.getByText("Endless Runner")).toBeVisible();
    await expect(arena.getByText("Marble Madness")).toBeVisible();
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

  test("game detail page loads for each game with versions", async ({ page }) => {
    const games = ["snake", "minesweeper", "tetris", "reversi", "breakout", "2048", "endless-runner", "marble-madness"];

    for (const game of games) {
      await page.goto(`/games/${game}`);

      // Breadcrumb
      await expect(page.getByRole("main").getByRole("link", { name: "Home" })).toBeVisible();

      // AI implementations section (games have versions now)
      await expect(page.getByText("AI IMPLEMENTATIONS")).toBeVisible();

      // Should show version cards for all 4 models
      await expect(page.getByText("Claude Opus 4.6")).toBeVisible();
      await expect(page.getByText("Claude Sonnet 4.6")).toBeVisible();
      await expect(page.getByText("GPT 5.4", { exact: true })).toBeVisible();
      await expect(page.getByText("GPT 5.4 Mini")).toBeVisible();
    }
  });

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
    expect(data.games).toHaveLength(8);
    expect(data.games.map((g: { id: string }) => g.id)).toEqual([
      "snake",
      "minesweeper",
      "tetris",
      "reversi",
      "breakout",
      "2048",
      "endless-runner",
      "marble-madness",
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
