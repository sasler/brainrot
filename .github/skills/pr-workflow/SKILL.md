---
name: pr-workflow
description: Automates the full PR lifecycle after a task is complete. Creates a branch, commits, pushes, opens a PR, waits for GitHub Copilot code review, triages feedback, dispatches model-matched sub-agents to fix valid issues, and replies to review comments.
---

# PR Workflow Skill

Automates the end-of-task PR lifecycle for the BrainRot Games repository. Invoke this workflow AFTER your main task is complete and all changes are ready to ship.

## Step 1: Create & Push PR

1. Ensure you have uncommitted changes — if not, abort.
2. Create a new branch from `main` with a descriptive name (e.g., `fix/paddle-collision`, `feat/add-leaderboard`).
3. Stage all changes and commit with a clear message. **The commit message MUST start with a [Gitmoji](https://gitmoji.dev) emoji** (e.g., `✨ Add new feature`, `🐛 Fix bug`, `🔧 Update config`). Always include the Co-authored-by trailer:
   ```
   ✨ Add star rating system

   Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
   ```
4. Push the branch to origin.
5. Open a PR via `gh pr create --fill` (or provide an explicit `--title` and `--body` summarizing the changes). **The PR title MUST start with a Gitmoji emoji** matching the primary change type.

## Step 2: Wait for Copilot Code Review

After the PR is created, the GitHub Copilot reviewer will automatically start a code review. Poll for it:

1. Use the GitHub MCP tools (`pull_request_read` with method `get_reviews`) or `gh pr reviews` to check for reviews.
2. The reviewer's login is **`copilot-pull-request-reviewer`**.
3. The review can take several minutes. Poll with increasing intervals:
   - Start at **30 seconds**
   - Increase to **60 seconds**
   - Cap at **120 seconds**
4. Continue polling until a review from `copilot-pull-request-reviewer` appears with a submitted status.

## Step 3: Fetch & Triage Review Comments

Once the review is submitted:

1. Fetch all inline review comments/suggestions using `pull_request_read` with method `get_review_comments` or equivalent.
2. **Critically evaluate each comment** — the reviewer is NOT always right. For each comment, decide:

   | Verdict | Criteria |
   |---------|----------|
   | **VALID** | Fixes a real bug or performance issue |
   | **VALID** | Improves code quality meaningfully |
   | **SKIP** | Style preference or nitpick with no functional impact |
   | **SKIP** | Would break existing functionality |
   | **SKIP** | Misunderstands the codebase context |

3. Log your triage decision for each comment before proceeding.

## Step 4: Dispatch Fixes with Model-Matched Sub-Agents

For each comment triaged as **VALID**:

1. Determine which game file is affected by the comment.
2. Look up `games-metadata.json` to find the **original model** that generated that file.
3. Launch a sub-agent using the `task` tool with the `model` parameter matching the original AI model:

   | `games-metadata.json` model value | Sub-agent `model` parameter |
   |-----------------------------------|-----------------------------|
   | `opus-4-6` | `claude-opus-4.6` |
   | `sonnet-4-6` | `claude-sonnet-4.6` |
   | `gpt-5-4` | `gpt-5.4` |
   | `gpt-5-4-mini` | `gpt-5.4-mini` |

4. Pass the reviewer's comment **VERBATIM** to the sub-agent — do NOT add your own suggestions or interpretation.
5. Instruct the sub-agent to address the reviewer's comment in the specified file.
6. For non-game files (tests, config, shared utilities, etc.), use any appropriate model.

## Step 5: Reply to Review Comments

After each fix is implemented, reply to the corresponding inline PR review comment:

- State **which AI model** was used to implement the fix.
- Include a **brief description** of what was changed.
- Example reply:
  > Fixed in abc1234. Claude Opus 4.6 added an early return guard to stop the animation loop when the title screen is dismissed.

## Step 6: Push & Finalize

1. Stage and commit all fixes with a Gitmoji-prefixed message and the Co-authored-by trailer:
   ```
   🐛 Fix review feedback on breakout collision

   Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
   ```
2. Push to the PR branch.
3. Run tests if applicable to verify fixes don't break anything.

## Important Notes

- **Invoke this workflow only after the main task is complete.**
- Always check for uncommitted changes before starting.
- If the Copilot review finds no issues, note that the review was clean and finish.
- If ALL review comments are invalid/skippable, document why each was skipped and finish without code changes.
- **Model matching is critical** — it preserves the integrity of the AI model competition that underpins this repository.
