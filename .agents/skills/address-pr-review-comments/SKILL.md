---
name: address-pr-review-comments
description: Inspect, triage, implement, test, and reply to unresolved BrainRot pull request review comments while preserving exact model ownership for game files. Use for human, Copilot, or automated PR feedback and requested changes.
---

# Address PR Review Comments

## Collect and triage feedback

1. Confirm the PR and local branch, then inspect local status before changing files.
2. Prefer connected GitHub tools for PR metadata and comments. Use `gh` or its GraphQL API when thread resolution state or inline context is unavailable otherwise.
3. Fetch unresolved review threads, review summaries, and relevant check failures.
4. Record a verdict and rationale for each comment:
   - `VALID`: fixes a real bug, performance problem, accessibility issue, or meaningful maintainability problem.
   - `SKIP`: cosmetic preference without material value, incorrect codebase assumptions, duplication, or a change that would break intended behavior.

## Route valid fixes

1. For comments on `public/games/{game}/{model}/index.html`, resolve the version's exact `model` and `modelId` from `games-metadata.json`.
2. Dispatch the fix to that exact model using the harness's model-selection mechanism. Do not rely on a static routing table.
3. Pass the review comment verbatim with its file path and inline context. Do not replace it with the orchestrator's proposed solution.
4. If the exact model cannot be dispatched, leave that comment blocked and report it. The orchestrator or another model must not edit the game file.
5. Handle non-game files with an appropriate available model or the current agent.

## Verify and respond

1. Review every resulting diff. Run `npm run update-metadata` after game-file changes and verify its output.
2. Apply targeted checks followed by the complete `verify-changes` gate.
3. Commit fixes with a Gitmoji subject and the repository's required co-author trailer, then push normally.
4. Reply to each valid thread with the implementing model, concise fix summary, and commit identifier.
5. Reply to skipped comments with the triage rationale. Resolve a thread only after its fix or rationale is published.
6. Report any blocked comments and leave them unresolved.