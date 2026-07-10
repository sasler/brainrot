---
name: verify-changes
description: Validate BrainRot repository changes with process-safe targeted checks, responsive browser verification, lint, production build, and Playwright. Use after implementation, before committing or opening a PR, or when diagnosing test and build failures.
---

# Verify Changes

Verification-only commands may run without creating a branch. Before applying any fix discovered during verification, confirm the current branch is a task branch; if it is `main`, another default branch, or detached HEAD, stop and apply the `start-session` skill before editing.

## Protect local resources

1. Before starting a server or browser process, inspect running processes and the target port for an equivalent instance.
2. Reuse a healthy existing instance when appropriate. Do not start a second server because a port is busy.
3. Prefer Playwright's managed `webServer` flow over a manually launched development server.
4. If a manual process is necessary, record its PID and cleanup command before starting it.
5. Stop only processes created for this task. Report any process intentionally left running; normally there should be none.

## Validate at affected scope

1. Inspect the diff and map each changed behavior to the smallest relevant test file or browser probe.
2. Run only tests that exercise changed files and behavior. For games, run that game's focused spec plus a filtered load probe for the changed model; do not load every unrelated game.
3. Verify game controls and essential UI at 320×480 and a desktop viewport. Reuse one managed server/browser session when possible.
4. For Next.js code, read the relevant local documentation under node_modules/next/dist/docs/ before evaluating API usage.
5. Before a PR, run lint and the production build, then affected Playwright specs:

       npm run lint
       npm run build
       npx playwright test <affected-specs>

6. Do not run bare npx playwright test by default. Reserve the full Playwright suite for CI, explicit user requests, changes to shared test/runtime infrastructure, or changes whose impact cannot be bounded reliably.
7. Treat any required affected-scope failure as blocking unless evidence shows it is unrelated and pre-existing; report that evidence explicitly.
8. Clean up owned servers, browser sessions, and temporary processes before finishing.