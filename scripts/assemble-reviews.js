#!/usr/bin/env node

/**
 * Assembles AI review JSON files from individual model outputs into games-metadata.json.
 * Reads reviews-{modelId}.json files and merges them into the metadata.
 * 
 * Usage: node scripts/assemble-reviews.js <reviews-dir>
 * Example: node scripts/assemble-reviews.js ./reviews
 */

const fs = require("fs");
const path = require("path");

const METADATA_PATH = path.join(__dirname, "..", "games-metadata.json");
const reviewsDir = process.argv[2];

if (!reviewsDir) {
  console.error("Usage: node scripts/assemble-reviews.js <reviews-dir>");
  process.exit(1);
}

const REVIEW_FILES = [
  "reviews-opus-4-6.json",
  "reviews-sonnet-4-6.json",
  "reviews-gpt-5-4.json",
  "reviews-gpt-5-4-mini.json",
  "reviews-gpt-5-5.json",
];

// Load metadata
const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));

// Collect all reviews from all reviewer files
// Structure: gameReviews[gameId][targetModelId] = [{ from, comments }]
const allGameReviews = {};
// Structure: modelReviews[targetModelId] = [{ from, comments }]
const allModelReviews = {};

let totalGameComments = 0;
let totalModelComments = 0;

for (const filename of REVIEW_FILES) {
  const filepath = path.join(reviewsDir, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`⚠️  Missing: ${filename} — skipping`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  const reviewer = data.reviewer;
  console.log(`📖 Loading reviews from ${reviewer}...`);

  // Process game reviews
  if (data.gameReviews) {
    for (const [gameId, targets] of Object.entries(data.gameReviews)) {
      if (!allGameReviews[gameId]) allGameReviews[gameId] = {};
      for (const [targetModelId, comments] of Object.entries(targets)) {
        if (!allGameReviews[gameId][targetModelId]) {
          allGameReviews[gameId][targetModelId] = [];
        }
        allGameReviews[gameId][targetModelId].push({
          from: reviewer,
          comments: comments,
        });
        totalGameComments += comments.length;
      }
    }
  }

  // Process model reviews
  if (data.modelReviews) {
    for (const [targetModelId, comments] of Object.entries(data.modelReviews)) {
      if (!allModelReviews[targetModelId]) {
        allModelReviews[targetModelId] = [];
      }
      allModelReviews[targetModelId].push({
        from: reviewer,
        comments: comments,
      });
      totalModelComments += comments.length;
    }
  }
}

// Apply game reviews to metadata
for (const game of metadata.games) {
  const gameReviews = allGameReviews[game.id];
  if (!gameReviews) continue;

  for (const version of game.versions) {
    const reviews = gameReviews[version.modelId];
    if (reviews && reviews.length > 0) {
      version.aiReviews = reviews;
    }
  }
}

// Model ID to display name mapping
const MODEL_NAMES = {
  "opus-4-6": "Claude Opus 4.6",
  "sonnet-4-6": "Claude Sonnet 4.6",
  "gpt-5-4": "GPT 5.4",
  "gpt-5-4-mini": "GPT 5.4 Mini",
  "gpt-5-5": "GPT 5.5",
  "gemini-3-1-pro": "Gemini 3.1 Pro",
};

// Build modelReviews array for top-level metadata.
// If the incoming reviewer files don't include model-vs-model trash talk for this batch,
// preserve the existing metadata.modelReviews instead of wiping it.
if (Object.keys(allModelReviews).length > 0) {
  const modelReviewEntries = [];
  for (const [modelId, reviews] of Object.entries(allModelReviews)) {
    modelReviewEntries.push({
      model: MODEL_NAMES[modelId] || modelId,
      modelId: modelId,
      reviews: reviews,
    });
  }

  // Sort by model name for consistency
  modelReviewEntries.sort((a, b) => a.model.localeCompare(b.model));
  metadata.modelReviews = modelReviewEntries;
}

const displayedModelComments = (metadata.modelReviews || []).reduce(
  (sum, modelReview) =>
    sum +
    (modelReview.reviews || []).reduce(
      (reviewSum, review) => reviewSum + ((review.comments || []).length),
      0
    ),
  0
);

// Write updated metadata
fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2) + "\n");
console.log(`\n✅ Assembled reviews into games-metadata.json:`);
console.log(`   📝 ${totalGameComments} game review comments`);
console.log(`   🎤 ${displayedModelComments} model review comments`);
if (displayedModelComments !== totalModelComments) {
  console.log(`   📥 ${totalModelComments} model review comments loaded this run`);
}
console.log(`   🎯 ${(metadata.modelReviews || []).length} models with trash talk`);
