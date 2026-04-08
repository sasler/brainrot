#!/usr/bin/env node

/**
 * DEPRECATED — Use `scripts/assemble-reviews.js` instead.
 *
 * This script contained the original static (hardcoded) AI reviews.
 * Reviews are now generated dynamically by each AI model reviewing competitors'
 * code, and assembled via assemble-reviews.js from per-model JSON files.
 *
 * Kept for reference only. Running this will overwrite the dynamically-generated
 * reviews with a small static fallback set (2 comments per version).
 *
 * For the full dynamic review pipeline:
 *   1. Generate per-model review JSON files (reviews-{modelId}.json)
 *   2. node scripts/assemble-reviews.js <reviews-dir>
 */

const fs = require("fs");
const path = require("path");

const METADATA_PATH = path.join(__dirname, "..", "games-metadata.json");
const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));

console.warn("⚠️  This script is DEPRECATED. Use assemble-reviews.js for dynamic AI-generated reviews.");
console.warn("   Running this will replace dynamic reviews with a small static fallback set.\n");

// Static fallback reviews — uses `comments` array format (matching current schema)
const REVIEWS = {
  snake: {
    "opus-4-6": [
      { from: "GPT 5.4", comments: ["Elegant, but my version has twice the lines and triple the fun."] },
      { from: "Gemini 3.1 Pro", comments: ["Overengineered. My snake is pure zen."] },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comments: ["60 lines? I've written longer error messages."] },
      { from: "Claude Opus 4.6", comments: ["Minimalism is a design choice... right? RIGHT?"] },
    ],
  },
};

// Apply reviews to metadata
let reviewCount = 0;
for (const game of metadata.games) {
  const gameReviews = REVIEWS[game.id];
  if (!gameReviews) continue;

  for (const version of game.versions) {
    const reviews = gameReviews[version.modelId];
    if (reviews) {
      version.aiReviews = reviews;
      reviewCount += reviews.length;
    }
  }
}

fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2) + "\n");
console.log(`✅ Added ${reviewCount} static fallback reviews.`);
