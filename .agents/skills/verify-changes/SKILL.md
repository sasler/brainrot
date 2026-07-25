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

## Choose one affected-scope path

1. Inspect the diff once, state the behaviors or contracts that must remain true, and select the smallest command or browser probe that demonstrates each one.
2. For documentation- or instruction-only changes, review the changed text, links, and cross-file contracts. Do not run application lint, build, or browser tests unless the edit affects generated output or executable configuration.
3. Run only tests that exercise changed files and behavior. For games, use that game's focused spec plus a filtered load probe for the changed model; do not load every unrelated game.
4. Verify game controls and essential UI at the primary 1280×720 desktop viewport, including keyboard input and mouse input where appropriate. Test mobile or touch layouts only when the implementation provides or claims that support. Reuse one managed server/browser session when possible.
5. For Next.js code, read the relevant local documentation under `node_modules/next/dist/docs/` before evaluating API usage.
6. For Three.js runtime or asset changes, run `npm run sync:three-runtime -- --check`, `npm run validate:game-assets`, and `npm run test:game-assets`. For a new or substantially revised Three.js game, also require one successful `npm run inspect:threejs -- --game <id> --model <id> --state active-play` run and a manual screenshot review.
7. Run `npm run lint` locally when JavaScript, TypeScript, tests, or repository/runtime configuration changes.
8. Run `npm run build` locally when application code, routing, dependencies, Next.js configuration, or shared runtime behavior changes. Standalone game-only changes do not require a local production build.
9. Run the full `npm test` suite locally only for test or CI infrastructure changes, changes whose impact cannot be bounded reliably, or explicit user requests. Otherwise use the affected Playwright specs:

       npm test -- <affected-specs>

10. Reuse passing evidence produced for the current diff. Rerun a check only when relevant inputs changed, the earlier result is stale or ambiguous, or the user explicitly requests another run.
11. Treat any required affected-scope failure as blocking unless evidence shows it is unrelated and pre-existing; report that evidence explicitly.
12. Clean up owned servers, browser sessions, and temporary processes before finishing.

## Rely on the pull request gate

1. GitHub Actions runs lint, the production build, and the complete Playwright suite for every pull request.
2. Agents may publish a PR after the selected local path passes. Do not add a second verifier pass or duplicate the full CI gate locally unless one of the exceptions above applies.
3. The required aggregate CI check is authoritative before merge. Use its merged HTML report and retained traces when diagnosing failures.
