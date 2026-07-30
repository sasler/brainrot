import { expect, test, type Page, type Route } from "@playwright/test";
import { getGames } from "../src/lib/games";
import type { UserVerdict, VersionFeedback } from "../src/lib/ratings-feedback";

const storage = {
  available: true,
  writable: true,
  reason: null,
  missingEnvVars: [],
};

function versionFeedback(
  average: number | null,
  starCount: number,
  failCount: number,
  category?: "wont-load" | "controls-broken",
): VersionFeedback {
  const totalVerdicts = starCount + failCount;
  return {
    average,
    starCount,
    failCount,
    totalVerdicts,
    failRatio: totalVerdicts > 0 ? failCount / totalVerdicts : 0,
    failed: totalVerdicts > 0 && failCount * 2 >= totalVerdicts,
    failureCategories: category ? { [category]: failCount } : {},
  };
}

async function mockFeedbackApi(
  page: Page,
  feedback: Record<string, VersionFeedback>,
  verdicts: Record<string, UserVerdict> = {},
  onPost?: (body: Record<string, unknown>, route: Route) => Promise<void>,
) {
  await page.route("**/api/ratings**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (onPost) return onPost(body, route);
      return route.fulfill({ status: 500, json: { error: "Unexpected POST" } });
    }
    if (url.pathname.endsWith("/user")) {
      return route.fulfill({ json: { verdicts, storage } });
    }
    return route.fulfill({ json: { feedback, storage } });
  });
}

test.describe("community failed version surfaces", {
  tag: ["@spec:community-failure-verdicts", "@area:site", "@area:ratings"],
}, () => {
  const game = getGames().find((candidate) => candidate.versions.length >= 2);

  test("has a game fixture with two implementations", () => {
    expect(
      game,
      "games-metadata.json must contain a game with at least two versions",
    ).toBeDefined();
  });

  if (!game) return;

  const failedVersion = game.versions[0];
  const activeVersion = game.versions[1];
  const failedKey = `${game.id}:${failedVersion.modelId}`;
  const activeKey = `${game.id}:${activeVersion.modelId}`;

  test("partitions failed versions while keeping their launch links", async ({ page }) => {
    await mockFeedbackApi(page, {
      [failedKey]: versionFeedback(null, 0, 1, "wont-load"),
      [activeKey]: versionFeedback(3.2, 5, 1),
    });

    await page.goto(`/games/${game.id}`);
    const failedSection = page.getByRole("region", {
      name: "FAILED IMPLEMENTATIONS",
    });
    await expect(failedSection).toBeVisible();
    await expect(
      failedSection.locator(`[data-model-id="${failedVersion.modelId}"]`),
    ).toHaveAttribute("href", `/games/${game.id}/${failedVersion.modelId}`);
    await expect(
      page.getByRole("region", { name: "ACTIVE IMPLEMENTATIONS" }).locator(
        `[data-model-id="${activeVersion.modelId}"]`,
      ),
    ).toBeVisible();
    await expect(failedSection).toContainText("1 of 1 reported failure");
  });

  test("separates failed contributions on the model catalogue", async ({ page }) => {
    await mockFeedbackApi(page, {
      [failedKey]: versionFeedback(null, 0, 1, "wont-load"),
    });

    await page.goto(`/models/${failedVersion.modelId}`);
    const failedSection = page.getByRole("region", {
      name: "Failed implementations",
    });
    await expect(failedSection).toBeVisible();
    await expect(
      failedSection.locator(`[data-game-id="${game.id}"]`),
    ).toHaveAttribute("href", `/games/${game.id}/${failedVersion.modelId}`);
  });

  test("excludes failed versions from the homepage best rating", async ({ page }) => {
    await mockFeedbackApi(page, {
      [failedKey]: versionFeedback(5, 4, 4, "controls-broken"),
      [activeKey]: versionFeedback(3.2, 5, 1),
    });

    await page.goto("/");
    const card = page.locator(`a[href="/games/${game.id}"]`);
    await expect(card).toContainText("3.2");
    await expect(card).toContainText("1 failed");
  });

  test("records an optional category and lets a failed voter switch to stars", async ({ page }) => {
    let submittedVerdict: unknown;
    const initialFeedback = versionFeedback(null, 0, 1, "wont-load");
    await mockFeedbackApi(
      page,
      { [failedKey]: initialFeedback },
      { [failedKey]: { type: "fail", category: "wont-load" } },
      async (body, route) => {
        submittedVerdict = body.verdict;
        await route.fulfill({
          json: {
            feedback: versionFeedback(4, 1, 0),
            userVerdict: body.verdict,
            storage,
          },
        });
      },
    );

    await page.goto(`/games/${game.id}/${failedVersion.modelId}`);
    await expect(page.locator("iframe")).toBeVisible();
    await expect(page.locator('[data-failure-status="failed"]')).toBeVisible();
    const changeButton = page.getByRole("button", {
      name: "CHANGE TO A STAR RATING",
    });
    await changeButton.focus();
    await page.keyboard.press("Enter");
    const fourStars = page.getByRole("button", { name: "Rate 4 stars" });
    await expect(fourStars).toBeEnabled();
    await fourStars.click();
    await expect.poll(() => submittedVerdict).toEqual({
      type: "rating",
      stars: 4,
    });
  });

  test("opens the failure chooser by keyboard and submits its category", async ({ page }) => {
    let submittedVerdict: unknown;
    await mockFeedbackApi(page, {}, {}, async (body, route) => {
      submittedVerdict = body.verdict;
      await route.fulfill({
        json: {
          feedback: versionFeedback(null, 0, 1, "controls-broken"),
          userVerdict: body.verdict,
          storage,
        },
      });
    });

    await page.goto(`/games/${game.id}/${failedVersion.modelId}`);
    const failureButton = page.getByRole("button", { name: "DOESN'T WORK" });
    await failureButton.focus();
    await page.keyboard.press("Enter");
    const category = page.getByRole("button", { name: "Controls broken" });
    await expect(category).toBeVisible();
    await category.click();
    await expect.poll(() => submittedVerdict).toEqual({
      type: "fail",
      category: "controls-broken",
    });
  });

  test("does not classify versions when storage is unavailable", async ({ page }) => {
    await page.route("**/api/ratings**", async (route) => {
      const unavailable = {
        available: false,
        writable: false,
        reason: "Ratings storage is unavailable.",
        missingEnvVars: ["REDIS_URL"],
      };
      await route.fulfill({
        json: route.request().url().includes("/user")
          ? { verdicts: {}, storage: unavailable }
          : { feedback: {}, storage: unavailable },
      });
    });

    await page.goto(`/games/${game.id}`);
    await expect(page.getByText("AI IMPLEMENTATIONS", { exact: true })).toBeVisible();
    await expect(page.getByText("FAILED IMPLEMENTATIONS", { exact: true })).toHaveCount(0);
  });
});
