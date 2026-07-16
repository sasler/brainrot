<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# BrainRot Agent Instructions

## Skills

`.agents/skills/` is the canonical skills directory for every agent harness, editor, and tool. Codex, Claude Code, GitHub Copilot, Cursor, Windsurf, Gemini CLI, VS Code, JetBrains, Aider, and other clients must use this same source of truth. Do not copy skills into client-specific directories.

If the client does not discover skills automatically, enumerate `.agents/skills/*/SKILL.md` and read every skill relevant to the task before acting.

| Skill | Use for |
|---|---|
| `start-session` | Starting a new task on a branch created from latest `origin/main` |
| `develop-game` | Adding or changing a game implementation |
| `develop-threejs-game` | Building or substantially revising a Three.js game, its model-owned assets, diagnostics, or visual-quality evidence |
| `verify-changes` | Running scoped local checks and applying the CI validation contract |
| `create-pull-request` | Committing, pushing, and opening a compliant PR |
| `address-pr-review-comments` | Triaging and resolving PR review feedback |
| `frontend-design` | Designing or substantially restyling frontend UI |
| `playwright-cli` | Interactive browser automation and visual inspection |

## Branch Safety

- Before any task that may edit files, commit, or push, apply the `start-session` skill and create a task branch from latest `origin/main`.
- The only exception is an explicit user request to continue an existing non-default branch.
- Never begin mutating work on `main`, and never commit or push task changes directly to `main`. Publish changes through a pull request.
- If work has accidentally started on `main`, stop before committing or pushing. Preserve the changes and ask how to recover them rather than silently branching late or rewriting shared history.

## Repository Invariants

- This file applies repository-wide. Explicit user instructions take precedence; a more deeply nested `AGENTS.md` takes precedence for its subtree.
- `games-metadata.json` is the source of truth for games, versions, model ownership, reviews, and detected features.
- A game file may only be created or changed by the exact AI model that owns that version. Resolve ownership from `games-metadata.json`; if the exact model is unavailable, stop instead of substituting another model.
- Keep local verification scoped to the change. GitHub Actions runs the complete lint, build, and Playwright gate for every pull request, and its required aggregate check is authoritative before merge.
- Follow `GAME_DEVELOPMENT_GUIDE.md` for game work. Keep detailed workflows in the skills above, not in this file.
