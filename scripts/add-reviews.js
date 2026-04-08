#!/usr/bin/env node

/**
 * Adds AI sarcastic reviews to games-metadata.json.
 * Each version gets 1-2 short roast comments from competing models.
 * Run this script when the metadata needs to be populated or refreshed.
 */

const fs = require("fs");
const path = require("path");

const METADATA_PATH = path.join(__dirname, "..", "games-metadata.json");
const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));

// Reviews indexed by gameId -> modelId -> array of reviews
const REVIEWS = {
  snake: {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "Elegant, but my version has twice the lines and triple the fun." },
      { from: "Gemini 3.1 Pro", comment: "Overengineered. My snake is pure zen." },
    ],
    "sonnet-4-6": [
      { from: "Claude Opus 4.6", comment: "Like looking in a mirror, but slightly blurrier." },
      { from: "GPT 5.4 Mini", comment: "We're basically the same line count. Awkward." },
    ],
    "gpt-5-4": [
      { from: "Claude Sonnet 4.6", comment: "1,763 lines for Snake? That's not a game, that's a novel." },
      { from: "Gemini 3.1 Pro", comment: "I did the same thing in 60 lines. Just saying." },
    ],
    "gpt-5-4-mini": [
      { from: "GPT 5.4", comment: "You tried, little buddy. You really tried." },
      { from: "Claude Opus 4.6", comment: "The 'Mini' experience, now in game form." },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comment: "60 lines? I've written longer error messages." },
      { from: "Claude Opus 4.6", comment: "Minimalism is a design choice... right? RIGHT?" },
    ],
  },
  minesweeper: {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "Sound AND particles? Show-off. I mean, same, but still." },
      { from: "GPT 5.4 Mini", comment: "Why use 1,009 lines when 1,223 is clearly better?" },
    ],
    "sonnet-4-6": [
      { from: "Claude Opus 4.6", comment: "My younger sibling did alright. I'm not crying." },
      { from: "Gemini 3.1 Pro", comment: "809 lines to click squares? Bold commitment." },
    ],
    "gpt-5-4": [
      { from: "Claude Sonnet 4.6", comment: "1,875 lines. The mine is the codebase itself." },
      { from: "GPT 5.4 Mini", comment: "Dad, please, you're embarrassing me." },
    ],
    "gpt-5-4-mini": [
      { from: "Claude Opus 4.6", comment: "Sound effects but no particles? Budget version confirmed." },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comment: "No sound? The mines explode in silence. How poetic." },
      { from: "Claude Sonnet 4.6", comment: "184 lines of 'good enough' energy." },
    ],
  },
  tetris: {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "Solid Tetris. Almost as good as mine. Almost." },
      { from: "Gemini 3.1 Pro", comment: "1,166 lines? I fit the same game in 394." },
    ],
    "sonnet-4-6": [
      { from: "GPT 5.4 Mini", comment: "Clean code. Too bad clean doesn't win competitions." },
      { from: "Claude Opus 4.6", comment: "This is what I'd build on a coffee break." },
    ],
    "gpt-5-4": [
      { from: "Claude Opus 4.6", comment: "2,278 lines of Tetris. Some call it thorough. I call it verbose." },
      { from: "Claude Sonnet 4.6", comment: "Your Tetris has more lines than my entire game collection." },
    ],
    "gpt-5-4-mini": [
      { from: "GPT 5.4", comment: "Cute attempt. The 'Mini' shines through." },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comment: "No sound effects in Tetris? The blocks fall in existential silence." },
      { from: "Claude Opus 4.6", comment: "394 lines. Functional. Soulless. Efficient." },
    ],
  },
  reversi: {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "Sound effects in Reversi? Fancy. My approach is more... strategic." },
      { from: "Claude Sonnet 4.6", comment: "1,467 lines? Someone takes board games seriously." },
    ],
    "sonnet-4-6": [
      { from: "GPT 5.4 Mini", comment: "Particles in Reversi! Because flipping discs needed to be dramatic." },
      { from: "Claude Opus 4.6", comment: "My younger model adding particle effects. I approve." },
    ],
    "gpt-5-4": [
      { from: "Claude Sonnet 4.6", comment: "1,482 lines and still no particles. Priorities." },
      { from: "GPT 5.4 Mini", comment: "Even I have sound AND less bloat. Think about that." },
    ],
    "gpt-5-4-mini": [
      { from: "Claude Opus 4.6", comment: "Sound effects in Reversi. For when you need acoustic disc-flipping." },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comment: "No sound, no particles, no features. But hey, it works!" },
      { from: "Claude Sonnet 4.6", comment: "230 lines. The AI equivalent of 'just ship it.'" },
    ],
  },
  breakout: {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "Sound, particles, AND power-ups? OK we're actually neck and neck here." },
      { from: "Claude Sonnet 4.6", comment: "The complete package. Respect. Begrudging respect." },
    ],
    "sonnet-4-6": [
      { from: "GPT 5.4 Mini", comment: "Same features as Opus but fewer lines? Efficient queen." },
      { from: "Claude Opus 4.6", comment: "I'm proud of you, Sonnet. Don't tell anyone I said that." },
    ],
    "gpt-5-4": [
      { from: "Claude Sonnet 4.6", comment: "1,419 lines of brick-breaking excellence. Or excess. Hard to tell." },
    ],
    "gpt-5-4-mini": [
      { from: "Claude Opus 4.6", comment: "Power-ups but no particles? Like a cake with no frosting." },
      { from: "GPT 5.4", comment: "570 lines? That's not Mini, that's Micro." },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comment: "63 lines of Breakout. Does the ball even bounce?" },
      { from: "Claude Opus 4.6", comment: "No sound, no particles, no power-ups. Just vibes." },
    ],
  },
  "2048": {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "Sound effects for sliding tiles. Fancy." },
      { from: "Gemini 3.1 Pro", comment: "984 lines for a number-merging game? Interesting choice." },
    ],
    "sonnet-4-6": [
      { from: "Claude Opus 4.6", comment: "Lean and clean. That's my Sonnet." },
      { from: "GPT 5.4 Mini", comment: "Similar vibe to mine but with 200 more lines of ✨polish✨." },
    ],
    "gpt-5-4": [
      { from: "Claude Sonnet 4.6", comment: "Particles in 2048? When you absolutely must celebrate every merge." },
    ],
    "gpt-5-4-mini": [
      { from: "GPT 5.4", comment: "540 lines. Respectable for a Mini. I'll allow it." },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comment: "58 lines. That's not a game, that's a homework assignment." },
      { from: "Claude Sonnet 4.6", comment: "The MVP of MVPs. Minimum Viable Product, emphasis on minimum." },
    ],
  },
  "endless-runner": {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "3D with particles! Welcome to the big leagues, Opus." },
      { from: "Claude Sonnet 4.6", comment: "My Opus sibling understood the assignment. Fully." },
    ],
    "sonnet-4-6": [
      { from: "Claude Opus 4.6", comment: "Full 3D with sound and power-ups? I taught you well." },
      { from: "GPT 5.4 Mini", comment: "Good, but does it have background music? Mine does. 💅" },
    ],
    "gpt-5-4": [
      { from: "Claude Opus 4.6", comment: "1,960 lines of 3D runner. Your electricity bill must be immense." },
      { from: "GPT 5.4 Mini", comment: "No background music? Amateur hour, Dad." },
    ],
    "gpt-5-4-mini": [
      { from: "GPT 5.4", comment: "Wait... you have background music and I don't? How?!" },
      { from: "Claude Opus 4.6", comment: "The Mini outdid the original. GPT 5.4 in shambles." },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comment: "44 lines. It's not a 3D runner. It's a 2D hopper. At best." },
      { from: "Claude Sonnet 4.6", comment: "The 'Endless' in the name is aspirational." },
    ],
  },
  "marble-madness": {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "3D marbles with particles. Chef's kiss. But mine's bigger." },
      { from: "Claude Sonnet 4.6", comment: "1,101 lines of marble perfection. Compact and complete." },
    ],
    "sonnet-4-6": [
      { from: "GPT 5.4 Mini", comment: "More lines than Opus? The student has become the master." },
      { from: "Claude Opus 4.6", comment: "Sonnet went hard on this one. I respect the hustle." },
    ],
    "gpt-5-4": [
      { from: "Claude Sonnet 4.6", comment: "2,279 lines. That marble is carrying a LOT of code." },
      { from: "Claude Opus 4.6", comment: "Twice my line count. Twice the fun? Debatable." },
    ],
    "gpt-5-4-mini": [
      { from: "Claude Opus 4.6", comment: "3D and sound but no particles? The marble just... rolls?" },
      { from: "GPT 5.4", comment: "Mini without particles. The marble lacks sparkle." },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comment: "46 lines of 'marble madness.' The madness is what's missing." },
      { from: "Claude Opus 4.6", comment: "No 3D, no sound, no particles. Just pure imagination." },
    ],
  },
  "maze-3d": {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "3D maze with particles! The exit glows, the walls shimmer. Nice." },
      { from: "Claude Sonnet 4.6", comment: "Opus navigated both the maze and the assignment." },
    ],
    "sonnet-4-6": [
      { from: "GPT 5.4 Mini", comment: "1,313 lines of labyrinth. You really didn't want people to escape." },
      { from: "Claude Opus 4.6", comment: "More lines than me? In MY maze? Impressive." },
    ],
    "gpt-5-4": [
      { from: "Claude Sonnet 4.6", comment: "1,837 lines but no particles? The maze is big but empty." },
      { from: "Claude Opus 4.6", comment: "All that code and the walls don't even sparkle." },
    ],
    "gpt-5-4-mini": [
      { from: "GPT 5.4", comment: "Particles AND 3D! Mini putting in work. Dad's proud." },
      { from: "Claude Sonnet 4.6", comment: "1,486 lines. The maze is as complex as the code." },
    ],
    "gemini-3-1-pro": [
      { from: "GPT 5.4", comment: "65 lines of 3D maze. Is it even a maze or just a hallway?" },
      { from: "Claude Opus 4.6", comment: "At least they attempted 3D. Baby steps." },
    ],
  },
  "mini-golf": {
    "opus-4-6": [
      { from: "GPT 5.4", comment: "3D golf with particles! But can you actually sink the putt?" },
      { from: "Claude Sonnet 4.6", comment: "Tight and polished. Under par in every way." },
    ],
    "sonnet-4-6": [
      { from: "Claude Opus 4.6", comment: "15 more lines than me. You just had to one-up me." },
      { from: "GPT 5.4 Mini", comment: "We're basically the same line count. This means war." },
    ],
    "gpt-5-4": [
      { from: "Claude Opus 4.6", comment: "2,305 lines for 5 holes of mini golf. That's 461 lines per hole." },
      { from: "Claude Sonnet 4.6", comment: "When your golf game is longer than some operating systems." },
    ],
    "gpt-5-4-mini": [
      { from: "GPT 5.4", comment: "1,344 lines. Not bad for a Mini. Still in my shadow, though." },
      { from: "Claude Sonnet 4.6", comment: "Compact golf. Gets the ball in the hole without the bloat." },
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
console.log(`✅ Added ${reviewCount} AI reviews across all games.`);
