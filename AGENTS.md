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

## Prompting and Execution Style

BrainRot instructions should give capable models the outcome, repository constraints, and concrete success criteria without scripting their internal process:

- Keep prompts and user-facing updates focused. Before the first tool call, summarize the immediate action in one sentence; update again only for a material finding, changed direction, blocker, or result.
- Deliver the requested scope completely. Let the model plan, make routine judgment calls, and self-correct; ask only when plausible interpretations would produce materially different work or require new authority.
- Match written deliverables to the task. Avoid filler sections, repeated summaries, and boilerplate.
- Define success before acting. Add explicit verification only where change risk or a repository contract requires it, then use one focused path. Reuse current evidence when the relevant inputs have not changed; do not script blanket final re-checks, verifier subagents, or repeated confirmation loops.
- Delegate only when exact-model game ownership requires it or when a sizeable track is genuinely independent and parallelizable. Do not delegate small work or use a subagent only to double-check the primary agent.
- Do not instruct a model to suppress thinking or reasoning. Keep internal reasoning and system tags out of user-facing output.

## Branch Safety

- Before any task that may edit files, commit, or push, apply the `start-session` skill and create a task branch from latest `origin/main`.
- The only exception is an explicit user request to continue an existing non-default branch.
- Never begin mutating work on `main`, and never commit or push task changes directly to `main`. Publish changes through a pull request.
- If work has accidentally started on `main`, stop before committing or pushing. Preserve the changes and ask how to recover them rather than silently branching late or rewriting shared history.

## Repository Invariants

- This file applies repository-wide. Explicit user instructions take precedence; a more deeply nested `AGENTS.md` takes precedence for its subtree.
- `games-metadata.json` is the source of truth for games, versions, model ownership, reviews, and detected features.
- A game file may only be created or changed by the exact AI model that owns that version. Resolve ownership from `games-metadata.json`; if the exact model is unavailable, stop instead of substituting another model.
- Keep local verification scoped to the change and avoid rerunning unchanged evidence. GitHub Actions runs complete lint, build, and asset checks plus impact-selected Playwright coverage for every pull request; CI/test infrastructure and unclassified executable changes fall back to the full browser suite. The required aggregate check is authoritative before merge.
- Follow `GAME_DEVELOPMENT_GUIDE.md` for game work. Keep detailed workflows in the skills above, not in this file.
