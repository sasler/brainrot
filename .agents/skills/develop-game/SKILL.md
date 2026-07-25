---
name: develop-game
description: Create, improve, or fix BrainRot game implementations while enforcing exact AI model ownership, standalone-file architecture, quality requirements, desktop-first gameplay, metadata maintenance, and documentation updates. Use for any change under public/games or any new game/version request.
---

# Develop a Game

## Protect the default branch

Before changing any game or metadata file, confirm the current branch is a task branch. If it is `main`, another default branch, or detached HEAD, stop and apply the `start-session` skill. Never commit or push game work directly to the default branch.

## Enforce model ownership first

1. Read `GAME_DEVELOPMENT_GUIDE.md` before implementation.
2. For an existing file, locate its game and version in `games-metadata.json` and record the owning `model` and `modelId`.
3. For a new version, use the exact target model requested for that version.
4. Ensure the implementation agent is that exact model. If not, delegate through the harness with an exact model override.
5. Stop if the exact model is unavailable. Never use a related, newer, smaller, or orchestrating model as a substitute.

## Implement to the competition standard

- If the implementation imports Three.js or creates a `THREE.WebGLRenderer`, apply the `develop-threejs-game` skill before changing it. That skill owns the shared runtime, creative asset policy, visual scorecard, diagnostics, and active-play inspection workflow.
- Keep each version in `public/games/{game}/{model}/index.html` as one standalone HTML file with inline HTML, CSS, and JavaScript.
- Three.js versions may additionally use data-only assets under `public/games/{game}/{model}/assets` when they follow the `develop-threejs-game` manifest and ownership policy.
- Judge implementation depth by the completed experience, not an arbitrary line count. Do not pad code to reach a target.
- Include Web Audio API sound effects, polished and readable feedback, a deliberate art direction, a title screen, and a game-over or completion screen. Choose visual techniques that serve the concept instead of applying a standard effects checklist.
- Prioritize gameplay over decorative chrome. Avoid skeletal presentation, static layouts where motion is needed, and oversized HUDs.
- Design and verify the primary experience at 1280×720 with discoverable keyboard controls and mouse input where appropriate.
- Mobile and touch support are optional for new games. Preserve and verify them when changing an implementation that already provides or explicitly claims them.
- Keep performance, sandbox restrictions, controls, and game-specific requirements aligned with `GAME_DEVELOPMENT_GUIDE.md`.

## Maintain repository data

1. Register new versions in `games-metadata.json`.
2. Run `npm run update-metadata` after creating or changing game files.
3. Verify the updated line counts and detected feature flags against the implementation.
4. Update README tables and project structure whenever games, models, counts, or layout change.

After implementation, apply one targeted path from `verify-changes`, reusing current metadata and gameplay evidence where its inputs have not changed.
