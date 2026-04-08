#!/usr/bin/env node

/**
 * Scans all game HTML files in public/games/ and updates games-metadata.json
 * with correct line counts and auto-detected features.
 *
 * Usage: node scripts/update-metadata.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const METADATA_PATH = path.join(ROOT, "games-metadata.json");

// Feature detection patterns
const FEATURE_PATTERNS = [
  {
    id: "sound",
    patterns: [/AudioContext/i, /createOscillator/i, /new\s+Audio\(/i, /playSound/i],
  },
  {
    id: "music",
    patterns: [/background.*music/i, /bgm/i, /playMusic/i, /musicPlay/i, /loopAudio/i],
  },
  {
    id: "3d",
    patterns: [/THREE\./i, /three\.js/i, /WebGLRenderer/i, /PerspectiveCamera/i],
  },
  {
    id: "particles",
    patterns: [/particle/i],
  },
  {
    id: "powerups",
    patterns: [/power.?up/i, /powerUp/i, /power_up/i],
  },
];

function detectFeatures(content) {
  const features = [];
  for (const feat of FEATURE_PATTERNS) {
    if (feat.patterns.some((p) => p.test(content))) {
      features.push(feat.id);
    }
  }
  return features;
}

function main() {
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));
  let updated = 0;

  for (const game of metadata.games) {
    for (const version of game.versions) {
      const filePath = path.join(ROOT, "public", version.path.replace(/^\//, ""));

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Missing file: ${version.path}`);
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const actualLines = content.split("\n").length;
      const features = detectFeatures(content);

      // Update line count if different
      if (version.linesOfCode !== actualLines) {
        console.log(
          `📏 ${game.id}/${version.modelId}: ${version.linesOfCode} → ${actualLines} lines`
        );
        version.linesOfCode = actualLines;
        updated++;
      }

      // Update features
      const oldFeatures = JSON.stringify(version.features || []);
      const newFeatures = JSON.stringify(features);
      if (oldFeatures !== newFeatures) {
        console.log(
          `🏷️  ${game.id}/${version.modelId}: features → [${features.join(", ")}]`
        );
        version.features = features;
        updated++;
      }
    }
  }

  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2) + "\n");
  console.log(`\n✅ Done. ${updated} fields updated.`);
}

main();
