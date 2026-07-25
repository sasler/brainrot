---
name: create-pull-request
description: Prepare and publish a compliant BrainRot pull request by checking scope, metadata, documentation, tests, commit conventions, branch safety, push state, and PR content. Use when the user asks to commit, push, publish, open, or create a pull request for completed work.
---

# Create a Pull Request

## Publication success criteria

Publish when all of these are true:

- The user authorized publication and the requested work is complete.
- The task branch was created before implementation by `start-session`; it is not a default, detached, or unrelated branch.
- The diff is task-scoped and unrelated user changes remain unstaged.
- Game-file changes have current `npm run update-metadata` evidence with line counts and feature flags checked against the implementation.
- README tables, project structure, and other affected documentation are current.
- The applicable `verify-changes` path passed for the current diff. Reuse that evidence; rerun it only if relevant files changed or the result is stale or ambiguous.

Stop rather than silently retrofitting a branch after work has accumulated. Never commit or push task changes directly to a default branch.

## Commit and publish

1. Review the staged diff once before committing.
2. Start the commit subject with an actual Unicode Gitmoji matching the primary change.
3. Include the existing required trailer exactly:

   ```text
   Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
   ```

4. Push the current branch with upstream tracking. Never force-push unless the user explicitly authorizes it.
5. Prefer the harness's connected GitHub tools to create the PR; fall back to `gh pr create` when needed.
6. Start the PR title with an actual Unicode Gitmoji. Include a concise summary and the exact local validation commands and outcomes in the body.
7. Confirm the required pull request workflow started. Do not wait for completion unless the user requested it, the task changes CI/test infrastructure, or a failure needs diagnosis.
8. Return the PR URL and current check state. The required aggregate CI check must pass before merge.

PR review handling is separate. Do not wait or poll for reviews unless the user asks; apply `address-pr-review-comments` when feedback arrives.
