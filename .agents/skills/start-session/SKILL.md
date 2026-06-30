---
name: start-session
description: Prepare a BrainRot repository work session on a new task branch created from the latest remote main branch. Use when starting a new task, initializing a fresh coding session, or when the user asks to create a branch before implementation.
---

# Start a Work Session

This workflow is mandatory before every task that may modify repository files, create commits, or push changes. Create the task branch before changing files. Never commit or push task work directly to `main` or another default branch.

## Choose the branch name

Use `<type>/<task-slug>` with a short lowercase hyphenated slug:

- `feat/` for new behavior
- `fix/` for bug fixes
- `docs/` for documentation-only work
- `chore/` for tooling or repository maintenance
- `refactor/` for behavior-preserving restructuring
- `test/` for test-only changes

## Create the branch

1. Inspect `git status --short --branch` and `git status --porcelain`.
2. Stop if tracked or untracked changes exist. Do not stash, discard, or carry them onto a new base without explicit user direction.
3. Confirm the `origin` remote and `origin/main` are expected for this repository.
4. Run `git fetch origin main`. If it fails, stop; do not claim a branch is based on latest main or fall back to stale local state.
5. Check for the proposed branch locally and on `origin`. If it already exists, stop and request a different name.
6. Run `git switch --create <branch> origin/main`.
7. Verify the current branch is `<branch>` and that `HEAD` equals the fetched `origin/main` commit before implementation begins.
8. Keep all task edits, commits, and pushes on this branch and publish them through a pull request.

Do not run this workflow when the user explicitly asks to continue an existing branch.