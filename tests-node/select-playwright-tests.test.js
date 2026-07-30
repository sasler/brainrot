const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const {
  AREA_RATINGS,
  AREA_SITE,
  AREA_THREEJS,
  changedMetadataVersions,
  parseNameStatus,
  selectPlaywrightImpact,
} = require("../scripts/select-playwright-tests");

const rootDir = path.resolve(__dirname, "..");

function change(...paths) {
  return [{ status: "M", paths }];
}

function metadata(entries) {
  const games = new Map();
  for (const key of entries) {
    const [gameId, modelId] = key.split("/");
    const game = games.get(gameId) ?? { id: gameId, versions: [] };
    game.versions.push({ modelId });
    games.set(gameId, game);
  }
  return { games: [...games.values()] };
}

test("selects only the exact changed game implementation", () => {
  const result = selectPlaywrightImpact({
    changes: change("public/games/maze-3d/gpt-5-6-sol/index.html"),
    rootDir,
  });
  assert.equal(result.mode, "scoped");
  assert.deepEqual(result.tags, ["@game:maze-3d/gpt-5-6-sol"]);
});

test("combines multiple changed game implementations", () => {
  const result = selectPlaywrightImpact({
    changes: change(
      "public/games/tetris/gpt-5-6-luna/index.html",
      "public/games/tile-matching/opus-5/index.html",
    ),
    rootDir,
  });
  assert.deepEqual(result.tags, [
    "@game:tetris/gpt-5-6-luna",
    "@game:tile-matching/opus-5",
  ]);
});

test("maps shared application changes to site and ratings tests", () => {
  const result = selectPlaywrightImpact({
    changes: change("src/components/Navbar.tsx"),
    rootDir,
  });
  assert.deepEqual(result.tags, [AREA_RATINGS, AREA_SITE]);
});

test("maps Three.js tooling to pipeline tests", () => {
  const result = selectPlaywrightImpact({
    changes: change("scripts/inspect-threejs.js"),
    rootDir,
  });
  assert.deepEqual(result.tags, [AREA_THREEJS]);
});

test("maps pinned Three.js runtime changes to the pipeline and its consumers", () => {
  const result = selectPlaywrightImpact({
    changes: change("public/vendor/three/0.185.1/three.module.min.js"),
    rootDir,
  });
  assert.equal(result.mode, "scoped");
  assert.ok(result.tags.includes(AREA_THREEJS));
  assert.ok(result.tags.includes("@game:mini-golf/gpt-5-6-sol"));
  assert.ok(result.tags.includes("@game:outrun-racer/opus-5"));
  assert.ok(!result.tags.includes("@game:maze-3d/gpt-5-6-sol"));
});

test("selects a changed spec by its unique spec tag", () => {
  const result = selectPlaywrightImpact({
    changes: change("tests/ratings-feedback.spec.ts"),
    rootDir,
  });
  assert.deepEqual(result.tags, ["@spec:ratings-feedback"]);
});

test("metadata review changes stay scoped to shared application tests", () => {
  const versions = metadata(["snake/opus-4-6"]);
  const result = selectPlaywrightImpact({
    changes: change("games-metadata.json"),
    baseMetadata: versions,
    headMetadata: versions,
    rootDir,
  });
  assert.deepEqual(result.tags, [AREA_RATINGS, AREA_SITE]);
});

test("metadata version additions and removals select exact game tags", () => {
  const before = metadata(["snake/opus-4-6", "tetris/old-model"]);
  const after = metadata(["snake/opus-4-6", "tetris/new-model"]);
  assert.deepEqual(
    [...changedMetadataVersions(before, after)].sort(),
    ["tetris/new-model", "tetris/old-model"],
  );
  const result = selectPlaywrightImpact({
    changes: change("games-metadata.json"),
    baseMetadata: before,
    headMetadata: after,
    rootDir,
  });
  assert.deepEqual(result.tags, [
    AREA_RATINGS,
    AREA_SITE,
    "@game:tetris/new-model",
    "@game:tetris/old-model",
  ]);
});

test("rename records inspect both old and new paths", () => {
  const parsed = parseNameStatus(
    "R100\0public/games/tetris/old/index.html\0public/games/tetris/new/index.html\0",
  );
  assert.deepEqual(parsed, [{
    status: "R100",
    paths: [
      "public/games/tetris/old/index.html",
      "public/games/tetris/new/index.html",
    ],
  }]);
  const result = selectPlaywrightImpact({ changes: parsed, rootDir });
  assert.deepEqual(result.tags, ["@game:tetris/new", "@game:tetris/old"]);
});

test("deleted game files still select their former implementation", () => {
  const result = selectPlaywrightImpact({
    changes: [{
      status: "D",
      paths: ["public/games/sudoku/sonnet-4-6/index.html"],
    }],
    rootDir,
  });
  assert.deepEqual(result.tags, ["@game:sudoku/sonnet-4-6"]);
});

test("documentation-only changes skip Playwright", () => {
  const result = selectPlaywrightImpact({
    changes: change("README.md", ".agents/skills/verify-changes/SKILL.md"),
    rootDir,
  });
  assert.equal(result.mode, "none");
});

test("unknown executable paths fail safe to the full suite", () => {
  const result = selectPlaywrightImpact({
    changes: change("scripts/new-runtime-tool.js"),
    rootDir,
  });
  assert.equal(result.mode, "full");
});

test("test and CI infrastructure changes require the full suite", () => {
  for (const filePath of [
    ".github/workflows/pr-checks.yml",
    "package.json",
    "playwright.config.ts",
    "scripts/select-playwright-tests.js",
  ]) {
    const result = selectPlaywrightImpact({ changes: change(filePath), rootDir });
    assert.equal(result.mode, "full", filePath);
  }
});

test("forced full mode ignores the changed paths", () => {
  const result = selectPlaywrightImpact({
    changes: change("README.md"),
    rootDir,
    forceFull: true,
  });
  assert.equal(result.mode, "full");
});

function collectSpecs(suite, output = []) {
  output.push(...(suite.specs ?? []));
  for (const child of suite.suites ?? []) collectSpecs(child, output);
  return output;
}

test("every collected Playwright test has one spec tag and an impact tag", () => {
  const cliPath = path.join(rootDir, "node_modules", "playwright", "cli.js");
  const listed = spawnSync(
    process.execPath,
    [cliPath, "test", "--list", "--reporter=json"],
    { cwd: rootDir, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  assert.equal(listed.status, 0, listed.stderr || listed.stdout);
  const report = JSON.parse(listed.stdout);
  const specs = report.suites.flatMap((suite) => collectSpecs(suite));
  assert.ok(specs.length > 0);
  for (const spec of specs) {
    const specTags = spec.tags.filter((tag) => tag.startsWith("spec:"));
    const impactTags = spec.tags.filter(
      (tag) => tag.startsWith("game:") || tag.startsWith("area:"),
    );
    assert.equal(specTags.length, 1, `${spec.file}:${spec.line} ${spec.title}`);
    assert.ok(impactTags.length > 0, `${spec.file}:${spec.line} ${spec.title}`);
  }
});
