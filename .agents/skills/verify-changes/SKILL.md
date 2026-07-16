---
name: verify-changes
description: Validate BrainRot repository changes with process-safe, change-scoped local checks while leaving the complete lint, build, and Playwright gate to required pull request CI. Use after implementation, before committing or opening a PR, or when diagnosing test and build failures.
---

# Verify Changes

Verification-only commands may run without creating a branch. Before applying any fix discovered during verification, confirm the current branch is a task branch; if it is `main`, another default branch, or detached HEAD, stop and apply the `start-session` skill before editing.

## Protect local resources

1. Before starting a server or browser process, inspect running processes and the target port for an equivalent instance.
2. Reuse a healthy existing instance when appropriate. Do not start a second server because a port is busy.
3. Prefer Playwright's managed `webServer` flow over a manually launched development server.
4. If a manual process is necessary, record its PID and cleanup command before starting it.
5. Stop only processes created for this task. Report any process intentionally left running; normally there should be none.

## Validate locally at affected scope

1. Inspect the diff and map each changed behavior to the smallest relevant test file or browser probe.
2. Run only tests that exercise changed files and behavior. For games, run that game's focused spec plus a filtered load probe for the changed model; do not load every unrelated game.
3. Verify game controls and essential UI at the primary 1280×720 desktop viewport, including keyboard input and mouse input where appropriate. Test mobile or touch layouts only when the implementation provides or claims that support. Reuse one managed server/browser session when possible.
4. For Next.js code, read the relevant local documentation under node_modules/next/dist/docs/ before evaluating API usage.
5. For Three.js runtime or asset changes, run `npm run sync:three-runtime -- --check`, `npm run validate:game-assets`, and `npm run test:game-assets`. For a new or substantially revised Three.js game, also run `npm run inspect:threejs -- --game <id> --model <id> --state active-play` and manually review its screenshot.
6. Run `npm run lint` locally when JavaScript, TypeScript, tests, or repository/runtime configuration changes.
7. Run `npm run build` locally when application code, routing, dependencies, Next.js configuration, or shared runtime behavior changes. Standalone game-only changes do not require a local production build.
8. Run the full `npm test` suite locally only for test or CI infrastructure changes, changes whose impact cannot be bounded reliably, or explicit user requests. Otherwise use the affected Playwright specs:

       npm test -- <affected-specs>

9. Treat any required affected-scope failure as blocking unless evidence shows it is unrelated and pre-existing; report that evidence explicitly.
10. Clean up owned servers, browser sessions, and temporary processes before finishing.

## Rely on the pull request gate

1. GitHub Actions runs lint, the production build, and the complete Playwright suite for every pull request.
2. Agents may publish a PR after the applicable local checks pass. Do not duplicate the full CI gate locally unless one of the exceptions above applies.
3. The required aggregate CI check is authoritative before merge. Use its merged HTML report and retained traces when diagnosing failures.
