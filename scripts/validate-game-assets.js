#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { validateRepositoryAssets } = require("./game-assets");

const ROOT = path.resolve(__dirname, "..");
const metadata = JSON.parse(
  fs.readFileSync(path.join(ROOT, "games-metadata.json"), "utf8"),
);
const { errors, summaries } = validateRepositoryAssets({
  rootDir: ROOT,
  metadata,
});

if (errors.length > 0) {
  console.error("❌ Game asset validation failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const files = [...summaries.values()].reduce((total, summary) => total + summary.files, 0);
const bytes = [...summaries.values()].reduce((total, summary) => total + summary.bytes, 0);
console.log(
  `✅ Validated ${summaries.size} asset manifests (${files} files, ${bytes} bytes).`,
);
