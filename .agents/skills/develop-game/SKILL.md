---
name: develop-game
description: Create, improve, or fix BrainRot game implementations while enforcing exact AI model ownership, standalone-file architecture, quality requirements, responsive gameplay, metadata maintenance, and documentation updates. Use for any change under public/games or any new game/version request.
---

# Develop a Game

## Enforce model ownership first

1. Read `GAME_DEVELOPMENT_GUIDE.md` before implementation.
2. For an existing file, locate its game and version in `games-metadata.json` and record the owning `model` and `modelId`.
3. For a new version, use the exact target model requested for that version.
4. Ensure the implementation agent is that exact model. If not, delegate through the harness with an exact model override.
5. Stop if the exact model is unavailable. Never use a related, newer, smaller, or orchestrating model as a substitute.

## Implement to the competition standard

- Keep each version in `public/games/{game}/{model}/index.html` as one standalone HTML file with inline HTML, CSS, and JavaScript.
- Reject implementations under 300 lines. Target at least 500 lines for simple games and 800 lines for complex games.
- Include Web Audio API sound effects, particle effects, a deliberate dark neon presentation, touch support, a title screen, and a game-over or completion screen.
- Prioritize gameplay over decorative chrome. Avoid skeletal rectangles, static layouts, and oversized HUDs.
- Verify essential gameplay and controls at 320×480 without scrolling, hidden controls, impossible taps, or overlays covering the play area.
- Keep performance, sandbox restrictions, controls, and game-specific requirements aligned with `GAME_DEVELOPMENT_GUIDE.md`.

## Maintain repository data

1. Register new versions in `games-metadata.json`.
2. Run `npm run update-metadata` after creating or changing game files.
3. Verify the updated line counts and detected feature flags against the implementation.
4. Update README tables and project structure whenever games, models, counts, or layout change.
5. After every implementation in a batch is complete, apply the `generate-ai-reviews` skill before creating the PR.

Apply the `verify-changes` skill for targeted gameplay checks and final validation.