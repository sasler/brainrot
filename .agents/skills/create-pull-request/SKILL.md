---
name: create-pull-request
description: Prepare and publish a compliant BrainRot pull request by checking scope, metadata, documentation, tests, commit conventions, branch safety, push state, and PR content. Use when the user asks to commit, push, publish, open, or create a pull request for completed work.
---

# Create a Pull Request

## Confirm readiness

1. Confirm the user requested publication and the task is complete.
2. Confirm the task branch was created before implementation by the `start-session` workflow. Inspect branch, status, diff, and recent commits.
3. Stop if on `main`, another default branch, detached HEAD, or an unrelated branch. Never commit or push task changes directly to a default branch, and do not silently retrofit a branch after work has accumulated.
4. Ensure only task-scoped changes will be staged. Preserve unrelated user changes.
5. If game files changed, run `npm run update-metadata` and verify line counts and feature flags.
6. Update README tables, project structure, and other documentation affected by games, models, counts, commands, or repository layout.
7. Apply the complete `verify-changes` gate. Do not publish with failing required checks.

## Commit and publish

1. Review the staged diff before committing.
2. Start the commit subject with an actual Unicode Gitmoji matching the primary change.
3. Include the existing required trailer exactly:

   ```text
   Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
   ```

4. Push the current branch with upstream tracking. Never force-push unless the user explicitly authorizes it.
5. Prefer the harness's connected GitHub tools to create the PR; fall back to `gh pr create` when needed.
6. Start the PR title with an actual Unicode Gitmoji. Include a concise summary and the exact validation commands and outcomes in the body.
7. Return the PR URL and current check state.

PR review handling is separate. Do not wait or poll for reviews unless the user asks; apply `address-pr-review-comments` when feedback arrives.