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
const GAME_REVIEW_COMMENT_COUNT = 3;

const MODEL_NAMES = {
  "opus-4-6": "Claude Opus 4.6",
  "opus-4-8": "Claude Opus 4.8",
  "fable-5": "Claude Fable 5",
  "sonnet-4-6": "Claude Sonnet 4.6",
  "gpt-5-4": "GPT 5.4",
  "gpt-5-4-mini": "GPT 5.4 Mini",
  "gpt-5-5": "GPT 5.5",
  "gpt-5-6-sol": "GPT 5.6 Sol",
  "gpt-5-6-terra": "GPT 5.6 Terra",
  "gpt-5-6-luna": "GPT 5.6 Luna",
  "gemini-3-1-pro": "Gemini 3.1 Pro",
  "qwen3.6-35b-a3b": "Qwen3.6 35B A3B",
};

if (!reviewsDir) {
  console.error("Usage: node scripts/assemble-reviews.js <reviews-dir>");
  process.exit(1);
}

if (!fs.existsSync(reviewsDir) || !fs.statSync(reviewsDir).isDirectory()) {
  console.error(`Reviews directory not found: ${reviewsDir}`);
  process.exit(1);
}

const reviewFiles = fs
  .readdirSync(reviewsDir, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.startsWith("reviews-") &&
      entry.name.endsWith(".json")
  )
  .map((entry) => entry.name)
  .sort();

if (reviewFiles.length === 0) {
  console.error(`No reviews-{modelId}.json files found in ${reviewsDir}`);
  process.exit(1);
}

// Load metadata
const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));
const validTargets = new Map(
  metadata.games.map((game) => [
    game.id,
    new Set(game.versions.map((version) => version.modelId)),
  ]),
);

// Collect all reviews from all reviewer files
// Structure: gameReviews[gameId][targetModelId] = [{ from, comments }]
const allGameReviews = {};
// Structure: modelReviews[targetModelId] = [{ from, comments }]
const allModelReviews = {};

let totalGameComments = 0;
let totalModelComments = 0;
const reviewerTargets = new Set();

for (const filename of reviewFiles) {
  const filepath = path.join(reviewsDir, filename);
  const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  const reviewer = data.reviewer;
  const reviewerModelId = filename.slice("reviews-".length, -".json".length);
  const expectedReviewer = MODEL_NAMES[reviewerModelId];

  if (!expectedReviewer || reviewer !== expectedReviewer) {
    throw new Error(
      `${filename}: expected canonical reviewer file reviews-{modelId}.json with matching reviewer name`,
    );
  }

  if (
    !data.gameReviews ||
    typeof data.gameReviews !== "object" ||
    Array.isArray(data.gameReviews)
  ) {
    throw new Error(`${filename}: gameReviews must be an object`);
  }

  console.log(`📖 Loading reviews from ${reviewer}...`);

  // Process game reviews
  for (const [gameId, targets] of Object.entries(data.gameReviews)) {
    const validModels = validTargets.get(gameId);
    if (!validModels) {
      throw new Error(`${filename}: unknown game target ${gameId}`);
    }
    if (!targets || typeof targets !== "object" || Array.isArray(targets)) {
      throw new Error(`${filename}: ${gameId} targets must be an object`);
    }

    if (!allGameReviews[gameId]) allGameReviews[gameId] = {};
    for (const [targetModelId, comments] of Object.entries(targets)) {
      if (!validModels.has(targetModelId)) {
        throw new Error(
          `${filename}: unknown target ${gameId}/${targetModelId}`,
        );
      }
      if (targetModelId === reviewerModelId) {
        throw new Error(
          `${filename}: reviewer ${reviewerModelId} cannot review its own ${gameId} implementation`,
        );
      }
      if (
        !Array.isArray(comments) ||
        comments.length !== GAME_REVIEW_COMMENT_COUNT ||
        comments.some(
          (comment) => typeof comment !== "string" || comment.trim().length === 0,
        )
      ) {
        throw new Error(
          `${filename}: ${gameId}/${targetModelId} must contain exactly ${GAME_REVIEW_COMMENT_COUNT} non-empty comments`,
        );
      }

      const reviewerTarget = `${reviewer}|${gameId}|${targetModelId}`;
      if (reviewerTargets.has(reviewerTarget)) {
        throw new Error(
          `${filename}: duplicate reviewer target ${reviewer}/${gameId}/${targetModelId}`,
        );
      }
      reviewerTargets.add(reviewerTarget);

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
