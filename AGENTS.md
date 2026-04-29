<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent Rules for BrainRot

## Documentation (CRITICAL)

- **README.md and all docs MUST be updated before creating a PR.**
- If games, models, line counts, or project structure change, update the README tables and structure section to match.
- The README contains a **Games table** and a **Competing AI Models table** — both must stay in sync with `games-metadata.json`.

## Model Fidelity (CRITICAL)

- Any changes, improvements, or fixes to a game file **MUST use the same AI model that originally generated it**.
- Look up `games-metadata.json` to find which model owns which game file.
- Example: fixing `public/games/snake/gpt-5-4/index.html` → must use the **GPT 5.4** model.
- This applies to code review fixes too — dispatch sub-agents with the correct model override.

## Game Development

- See `GAME_DEVELOPMENT_GUIDE.md` for full game creation rules.
- Each game is a **single standalone HTML file** at `public/games/{game}/{model}/index.html`.
- Register every new version in `games-metadata.json`.

## Execution Mode

- Always prefer **AutoPilot with Fleet mode** for maximum parallelism and efficiency.

## Testing & Build

- `npm run build` must succeed before creating a PR.
- All Playwright tests must pass: `npx playwright test`.
- Run `npm run lint` to check for lint errors.

## Quality Enforcement (CRITICAL)

- **Implementations under 200 lines must be flagged and regenerated.** A sub-200-line game is almost certainly a skeleton with no sound, no particles, and no polish.
- **Every game MUST include sound effects** using the Web Audio API (`AudioContext` + oscillators). If a generated game has no audio, it fails quality requirements — regenerate it.
- Games should demonstrate the model's **best capabilities**. This is a public competition; each implementation reflects directly on the model that created it.
- If a model's output looks minimal, skeletal, or low-effort (plain rectangles, no animations, no title screen, no sound), the agent **must retry with stronger prompting** emphasizing the competitive context and the feature checklist in `GAME_DEVELOPMENT_GUIDE.md`.
- Target line counts: **500+ lines** for simple games, **800+ lines** for complex games. Under 300 lines is an automatic rejection.
- BrainRot is for comparing the games themselves. Unnecessary UI chrome does **not** earn points, and the game should be the coolest thing on screen.
- Before finalizing any game, compare its feature set against the checklist in `GAME_DEVELOPMENT_GUIDE.md` and verify it includes: sound effects, particle effects, dark neon theme, touch support, title screen, and game over screen.
- Before finalizing any game, verify that essential gameplay UI remains visible and reachable at **320×480** without the player needing impossible taps, hidden controls, or scrolling during active play.
- Oversized fixed HUDs, touch pads, button trays, or optional helper panels must not cover the playable area unless the layout explicitly reserves safe space for them.
- Do not ship control-heavy layouts that use page-level `overflow: hidden` in a way that traps essential controls (such as number pads or action buttons) off-screen on smaller viewports.
- Keep any responsiveness work subordinate to gameplay clarity and visual quality; compact, gameplay-first control schemes beat bloated "mobile-friendly" chrome.

## Live Site

- All implementations are deployed to **https://sasler-brainrotgames.vercel.app** and are publicly visible.
- Visitors can switch between AI model implementations and directly compare them side-by-side.
- A minimal or low-effort implementation will be immediately obvious to anyone visiting the site.
- Treat every game submission as a **public demo of the model's capabilities**.

## AI Trash Talk / Reviews (CRITICAL)

- **After all game implementations for a batch are complete**, each competing model MUST review the other models' implementations and write **10 sarcastic, funny one-liners** per game per target model.
- Reviews are stored in the `aiReviews` array on each game version in `games-metadata.json`.
- Each reviewer produces a JSON file named `reviews-{modelId}.json` with the structure expected by `scripts/assemble-reviews.js`:
  ```json
  {
    "reviewer": "Display Name",
    "gameReviews": {
      "game-id": {
        "target-model-id": ["one-liner 1", "one-liner 2", "...10 total"]
      }
    }
  }
  ```
- Run `node scripts/assemble-reviews.js <reviews-dir>` to merge all review files into `games-metadata.json`.
- Reviews should be genuinely funny and sarcastic — roasting the other models' code, design choices, and visual polish. Think competitive banter, not mean-spirited attacks.
- A model does NOT review its own implementations.
- This step is NOT optional. Every new batch of games must include the review cycle.

## PR Review Comment Routing (CRITICAL)

- When a PR reviewer (human or Copilot code review) comments on a specific game file, the fix **MUST be implemented by a sub-agent running the same AI model that originally created that file**.
- Look up `games-metadata.json` to find which model owns which game file (the `modelId` field on the version entry).
- Dispatch the sub-agent with the correct `model` override (e.g., `claude-opus-4.6` for `opus-4-6` files, `gpt-5.4` for `gpt-5-4` files).
- This applies to all review feedback: Copilot code review, human reviewer comments, and automated checks.
- The orchestrating agent should **never** fix a game file itself — always delegate to the correct model.
- Model ID to agent model mapping:
  | modelId | Agent Model Override |
  |---------|---------------------|
  | `opus-4-6` | `claude-opus-4.6` |
  | `sonnet-4-6` | `claude-sonnet-4.6` |
  | `gpt-5-4` | `gpt-5.4` |
  | `gpt-5-4-mini` | `gpt-5.4-mini` |
  | `gemini-3-1-pro` | *(not currently used for new games)* |

## Commit & PR Convention (CRITICAL)

- **Every commit message and PR title MUST start with a [Gitmoji](https://gitmoji.dev) emoji.**
- Use the actual Unicode emoji character, not the `:shortcode:` format.
- Common mappings:
  | Emoji | Code | Meaning |
  |-------|------|---------|
  | ✨ | `:sparkles:` | New feature |
  | 🐛 | `:bug:` | Bug fix |
  | 🔧 | `:wrench:` | Configuration / tooling |
  | ♻️ | `:recycle:` | Refactor |
  | 🎨 | `:art:` | Style / UI improvement |
  | 📝 | `:memo:` | Documentation |
  | ✅ | `:white_check_mark:` | Tests |
  | 🚀 | `:rocket:` | Deploy / performance |
  | 🔥 | `:fire:` | Remove code / files |
  | 🏗️ | `:building_construction:` | Architecture changes |
- Example commit: `✨ Add star rating system for game versions`
- Example PR title: `🐛 Fix breakout keyboard controls and mini golf physics`
- The Co-authored-by trailer is still required on all commits.

## Metadata Maintenance

- `games-metadata.json` is the **single source of truth** for games and versions.
- Always update it when adding or modifying game versions.
- After creating or modifying game files, run **`npm run update-metadata`** to auto-update line counts and detected features in `games-metadata.json`. This replaces manual line counting.
- Verify the metadata is correct after running the script by checking that line counts and feature flags match the actual implementation.
