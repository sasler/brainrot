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

## Metadata

- `games-metadata.json` is the **single source of truth** for games and versions.
- Always update it when adding or modifying game versions.
