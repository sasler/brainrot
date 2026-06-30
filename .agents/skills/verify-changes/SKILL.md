---
name: verify-changes
description: Validate BrainRot repository changes with process-safe targeted checks, responsive browser verification, lint, production build, and Playwright. Use after implementation, before committing or opening a PR, or when diagnosing test and build failures.
---

# Verify Changes

## Protect local resources

1. Before starting a server or browser process, inspect running processes and the target port for an equivalent instance.
2. Reuse a healthy existing instance when appropriate. Do not start a second server because a port is busy.
3. Prefer Playwright's managed `webServer` flow over a manually launched development server.
4. If a manual process is necessary, record its PID and cleanup command before starting it.
5. Stop only processes created for this task. Report any process intentionally left running; normally there should be none.

## Validate narrowly, then fully

1. Inspect the diff and identify the smallest relevant checks.
2. Run targeted tests or a single browser probe first. For games, verify controls and essential UI at 320×480 as well as a desktop viewport.
3. For Next.js code, read the relevant local documentation under `node_modules/next/dist/docs/` before evaluating API usage.
4. Before a PR, run the complete gate:

   ```text
   npm run lint
   npm run build
   npx playwright test
   ```

5. Treat any failure as blocking unless evidence shows it is unrelated and pre-existing; report that evidence explicitly.
6. Clean up owned servers, browser sessions, and temporary processes before finishing.