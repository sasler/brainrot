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
- Before finalizing any game, compare its feature set against the checklist in `GAME_DEVELOPMENT_GUIDE.md` and verify it includes: sound effects, particle effects, dark neon theme, touch support, title screen, and game over screen.

## Live Site

- All implementations are deployed to **https://sasler-brainrotgames.vercel.app** and are publicly visible.
- Visitors can switch between AI model implementations and directly compare them side-by-side.
- A minimal or low-effort implementation will be immediately obvious to anyone visiting the site.
- Treat every game submission as a **public demo of the model's capabilities**.

## Metadata Maintenance

- `games-metadata.json` is the **single source of truth** for games and versions.
- Always update it when adding or modifying game versions.
- After creating or modifying game files, run **`npm run update-metadata`** to auto-update line counts and detected features in `games-metadata.json`. This replaces manual line counting.
- Verify the metadata is correct after running the script by checking that line counts and feature flags match the actual implementation.
