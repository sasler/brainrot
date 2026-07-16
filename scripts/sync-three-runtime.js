#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const THREE_VERSION = "0.185.1";
const SOURCE_ROOT = path.join(ROOT, "node_modules", "three");
const TARGET_ROOT = path.join(ROOT, "public", "vendor", "three", THREE_VERSION);
const CHECK_ONLY = process.argv.includes("--check");

const FILES = [
  ["build/three.module.min.js", "three.module.min.js"],
  ["build/three.core.min.js", "three.core.min.js"],
  ["examples/jsm/loaders/GLTFLoader.js", "addons/loaders/GLTFLoader.js"],
  ["examples/jsm/utils/BufferGeometryUtils.js", "addons/utils/BufferGeometryUtils.js"],
  ["examples/jsm/utils/SkeletonUtils.js", "addons/utils/SkeletonUtils.js"],
  ["LICENSE", "LICENSE"],
];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

const packagePath = path.join(SOURCE_ROOT, "package.json");
if (!fs.existsSync(packagePath)) {
  fail("node_modules/three is missing. Run npm install first.");
  return;
}

const installedVersion = JSON.parse(fs.readFileSync(packagePath, "utf8")).version;
if (installedVersion !== THREE_VERSION) {
  fail(`Expected three@${THREE_VERSION}, found ${installedVersion}.`);
  return;
}

let changed = 0;
for (const [sourceRelative, targetRelative] of FILES) {
  const source = path.join(SOURCE_ROOT, sourceRelative);
  const target = path.join(TARGET_ROOT, targetRelative);
  if (!fs.existsSync(source)) {
    fail(`Missing source file ${sourceRelative} in three@${THREE_VERSION}.`);
    continue;
  }

  const sourceBytes = fs.readFileSync(source);
  const targetBytes = fs.existsSync(target) ? fs.readFileSync(target) : null;
  const matches = targetBytes && sourceBytes.equals(targetBytes);

  if (CHECK_ONLY) {
    if (!matches) fail(`Vendored runtime is out of sync: ${targetRelative}`);
    continue;
  }

  if (!matches) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    changed++;
    console.log(`📦 Synced ${targetRelative}`);
  }
}

if (!process.exitCode) {
  console.log(
    CHECK_ONLY
      ? `✅ three@${THREE_VERSION} vendored runtime is synchronized.`
      : `✅ three@${THREE_VERSION} runtime synchronized (${changed} files changed).`,
  );
}
