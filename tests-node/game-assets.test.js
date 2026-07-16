const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  BUDGETS,
  validateAssetDirectory,
  validateRepositoryAssets,
} = require("../scripts/game-assets");

function png(width = 32, height = 32) {
  const buffer = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brainrot-assets-"));
  const gameId = "test-game";
  const modelId = "test-model";
  const assetsDir = path.join(root, "public", "games", gameId, modelId, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, "texture.png"), png());
  const manifest = {
    schemaVersion: 1,
    ownerModelId: modelId,
    assets: [
      {
        path: "texture.png",
        kind: "image",
        source: "procedural-export",
        generator: "node test fixture",
        prompt: "Generate a deterministic 32px texture",
        purpose: "Validation fixture",
        usageRights: "Created for repository testing and redistributable",
      },
    ],
  };
  fs.writeFileSync(
    path.join(assetsDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return {
    root,
    gameId,
    modelId,
    assetsDir,
    manifest,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function validate(fixture) {
  return validateAssetDirectory({
    assetsDir: fixture.assetsDir,
    gameId: fixture.gameId,
    modelId: fixture.modelId,
    registeredModelIds: new Set([fixture.modelId]),
  });
}

test("accepts a valid manifest and generates metadata summary", () => {
  const fixture = createFixture();
  try {
    const result = validate(fixture);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.summary, {
      files: 1,
      bytes: 24,
      kinds: ["image"],
    });

    const metadata = {
      games: [
        {
          id: fixture.gameId,
          versions: [{ modelId: fixture.modelId }],
        },
      ],
    };
    const repositoryResult = validateRepositoryAssets({
      rootDir: fixture.root,
      metadata,
    });
    assert.deepEqual(repositoryResult.errors, []);
    assert.deepEqual(
      repositoryResult.summaries.get(`${fixture.gameId}/${fixture.modelId}`),
      result.summary,
    );
  } finally {
    fixture.cleanup();
  }
});

test("rejects missing provenance", () => {
  const fixture = createFixture();
  try {
    delete fixture.manifest.assets[0].prompt;
    fs.writeFileSync(
      path.join(fixture.assetsDir, "manifest.json"),
      JSON.stringify(fixture.manifest),
    );
    assert.ok(validate(fixture).errors.some((error) => error.includes("prompt is required")));
  } finally {
    fixture.cleanup();
  }
});

test("rejects undeclared files", () => {
  const fixture = createFixture();
  try {
    fs.writeFileSync(path.join(fixture.assetsDir, "extra.glb"), Buffer.from("glTF"));
    assert.ok(validate(fixture).errors.some((error) => error.includes("undeclared file extra.glb")));
  } finally {
    fixture.cleanup();
  }
});

test("rejects owner mismatch", () => {
  const fixture = createFixture();
  try {
    fixture.manifest.ownerModelId = "another-model";
    fs.writeFileSync(
      path.join(fixture.assetsDir, "manifest.json"),
      JSON.stringify(fixture.manifest),
    );
    assert.ok(validate(fixture).errors.some((error) => error.includes("ownerModelId")));
  } finally {
    fixture.cleanup();
  }
});

test("rejects asset directories for games missing from metadata", () => {
  const fixture = createFixture();
  try {
    const metadata = { games: [] };
    const result = validateRepositoryAssets({
      rootDir: fixture.root,
      metadata,
    });
    assert.ok(
      result.errors.some((error) =>
        error.includes("does not belong to a registered game version"),
      ),
    );
  } finally {
    fixture.cleanup();
  }
});

test("rejects unsupported formats", () => {
  const fixture = createFixture();
  try {
    fs.writeFileSync(path.join(fixture.assetsDir, "texture.gif"), Buffer.from("GIF89a"));
    fixture.manifest.assets = [
      {
        ...fixture.manifest.assets[0],
        path: "texture.gif",
      },
    ];
    fs.rmSync(path.join(fixture.assetsDir, "texture.png"));
    fs.writeFileSync(
      path.join(fixture.assetsDir, "manifest.json"),
      JSON.stringify(fixture.manifest),
    );
    assert.ok(validate(fixture).errors.some((error) => error.includes("unsupported format .gif")));
  } finally {
    fixture.cleanup();
  }
});

test("rejects traversal attempts", () => {
  const fixture = createFixture();
  try {
    fixture.manifest.assets[0].path = "../texture.png";
    fs.writeFileSync(
      path.join(fixture.assetsDir, "manifest.json"),
      JSON.stringify(fixture.manifest),
    );
    assert.ok(validate(fixture).errors.some((error) => error.includes("path traversal")));
  } finally {
    fixture.cleanup();
  }
});

test("requires inspector evidence for budget exceptions", () => {
  const fixture = createFixture();
  try {
    const modelPath = path.join(fixture.assetsDir, "large.glb");
    fs.writeFileSync(modelPath, Buffer.alloc(BUDGETS.glbBytes + 1));
    fixture.manifest.assets = [
      {
        ...fixture.manifest.assets[0],
        path: "large.glb",
        kind: "model",
      },
    ];
    fs.rmSync(path.join(fixture.assetsDir, "texture.png"));
    fs.writeFileSync(
      path.join(fixture.assetsDir, "manifest.json"),
      JSON.stringify(fixture.manifest),
    );
    assert.ok(validate(fixture).errors.some((error) => error.includes("6 MiB GLB target")));

    fixture.manifest.budgetException = {
      reason: "The authored silhouette requires this mesh density.",
      inspectorReport: "docs/threejs-inspections/large-model/report.json",
    };
    const reportPath = path.join(
      fixture.root,
      "docs",
      "threejs-inspections",
      "large-model",
      "report.json",
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, "{}\n");
    fs.writeFileSync(
      path.join(fixture.assetsDir, "manifest.json"),
      JSON.stringify(fixture.manifest),
    );
    assert.deepEqual(validate(fixture).errors, []);
  } finally {
    fixture.cleanup();
  }
});

test("rejects non-normalized budget exception report paths", () => {
  const fixture = createFixture();
  try {
    for (const inspectorReport of [
      "docs\\threejs-inspections\\report.json",
      "docs/./threejs-inspections/report.json",
      "docs//threejs-inspections/report.json",
      "../threejs-inspections/report.json",
    ]) {
      fixture.manifest.budgetException = {
        reason: "Test invalid evidence path handling.",
        inspectorReport,
      };
      fs.writeFileSync(
        path.join(fixture.assetsDir, "manifest.json"),
        JSON.stringify(fixture.manifest),
      );
      assert.ok(
        validate(fixture).errors.some((error) =>
          error.includes("budgetException requires a local inspectorReport path"),
        ),
        inspectorReport,
      );
    }
  } finally {
    fixture.cleanup();
  }
});
