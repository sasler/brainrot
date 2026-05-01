# 🧠 BrainRot Games

A web platform for comparing fun, cool-looking AI-generated games. Play each version side-by-side and judge which model makes the best actual game experience — not the biggest pile of UI chrome.

**Live at:** [sasler-brainrotgames.vercel.app](https://sasler-brainrotgames.vercel.app)  
**Repo:** [github.com/sasler/BrainRot](https://github.com/sasler/BrainRot)

## 🎮 Games

| Game | Description | Versions |
|------|-------------|----------|
| 🐍 Snake | Navigate the serpent through a digital grid. Consume pixels to grow, but one wrong move means total annihilation. | 5 |
| 👻 Pac-Man | Dash through a neon maze, gobble pellets, outsmart relentless ghosts, and flip the hunt with power surges. | 2 |
| 💣 Minesweeper | Every click is a calculated gamble. Use logic to uncover safe tiles while avoiding hidden explosives. | 5 |
| 🧱 Tetris | Falling tetrominoes demand split-second decisions. Stack them perfectly or watch entropy consume the board. | 5 |
| ⚫ Reversi | A war of strategic placement. Flip your opponent's pieces and dominate the 8×8 battlefield. | 5 |
| 🏓 Breakout | Shatter neon bricks with a blazing ball. Catch power-ups, chain combos, and clear every level before your lives run out. | 6 |
| 🔢 2048 | Slide, merge, and strategize on a 4×4 grid. Chase the elusive 2048 tile before the board fills up. | 5 |
| 🏃 Endless Runner 3D | A neon-soaked 3D sprint through an endless cyberpunk corridor with obstacles, collectibles, and power-ups. | 6 |
| 🔮 Marble Madness | Roll a glowing marble across neon platforms suspended in space. Master physics, dodge hazards, and race the clock. | 5 |
| 🧭 3D Maze | Navigate a procedurally generated labyrinth in first-person 3D. Find the glowing exit before time runs out. | 5 |
| ⛳ Mini Golf 3D | Aim, pull back, and sink it in this neon-drenched 3D mini golf adventure. Five holes of increasing challenge await. | 4 |
| 💎 Tile Matching | Swap, match, and chain your way to the top. Line up three or more gems to trigger cascading combos and dazzling special tiles. | 5 |
| 👾 Space Invaders | Defend Earth from waves of descending alien invaders. Blast through formations, grab power-ups, and survive the onslaught. | 5 |
| 🔢 Sudoku | Solve a glowing logic grid under pressure with notes, streaks, and satisfying neon feedback for every sharp deduction. | 2 |

## 🤖 Competing AI Models

| Model | Snake | Minesweeper | Tetris | Reversi | Breakout | 2048 | Endless Runner | Marble Madness | 3D Maze | Mini Golf 3D | Tile Matching | Space Invaders | Pac-Man | Sudoku |
|-------|-------|-------------|--------|---------|----------|------|----------------|----------------|---------|--------------|---------------|----------------|---------|--------|
| Claude Opus 4.6 | 852 lines | 1,009 lines | 1,166 lines | 1,467 lines | 1,133 lines | 984 lines | 1,092 lines | 1,101 lines | 1,162 lines | 1,347 lines | 1,820 lines | 1,547 lines | N/A | N/A |
| Claude Sonnet 4.6 | 828 lines | 809 lines | 973 lines | 1,167 lines | 900 lines | 727 lines | 1,108 lines | 1,384 lines | 1,313 lines | 1,362 lines | 1,239 lines | 1,203 lines | 937 lines | 814 lines |
| GPT 5.4 | 1,763 lines | 1,875 lines | 2,278 lines | 1,482 lines | 1,419 lines | 779 lines | 1,960 lines | 2,279 lines | 1,837 lines | 2,400 lines | 2,852 lines | 2,919 lines | 2,135 lines | 3,371 lines |
| GPT 5.5 | N/A | N/A | N/A | N/A | N/A | N/A | 2,365 lines | N/A | N/A | N/A | 2,413 lines | 1,643 lines | N/A | N/A |
| GPT 5.4 Mini | 1,309 lines | 1,223 lines | 1,267 lines | 1,389 lines | 570 lines | 541 lines | 1,309 lines | 1,687 lines | 1,486 lines | 1,345 lines | 2,093 lines | 862 lines | N/A | N/A |
| Gemini 3.1 Pro | 60 lines | 184 lines | 394 lines | 230 lines | 63 lines | 58 lines | 44 lines | 46 lines | 65 lines | N/A | N/A | N/A | N/A | N/A |
| Minimax M2.7 | N/A | N/A | N/A | N/A | 1032 lines | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

Each game is a standalone HTML file (HTML + CSS + JS inline) running in a sandboxed iframe — fully isolated from the main site.

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev -- --webpack

# Production build
npm run build

# Start production server
npm start

# Run smoke tests
npx playwright test
```

## ⭐ Ratings Setup

The star rating system uses **Redis**. The app supports either:

1. `REDIS_URL`, or
2. the older REST-style Vercel KV variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

If you only provide `KV_REST_API_READ_ONLY_TOKEN`, the site can show rating summaries but voting stays disabled. If you use a standard Redis integration that gives you `REDIS_URL`, the app can read and write ratings through that connection directly. After adding the environment variable in Vercel, redeploy the project.

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS 4
- **Fonts:** Geist Sans & Mono (local)
- **Ratings:** Direct Redis via `REDIS_URL` or Vercel KV via Upstash REST
- **Games:** Standalone HTML/JS in sandboxed iframes
- **Testing:** Playwright
- **Theme:** Dark with neon accents

## 📁 Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Landing page (game catalog)
│   ├── games/[game]/           # Game detail page
│   └── games/[game]/[model]/   # Play page (iframe)
├── components/                 # UI components
└── lib/                        # Game registry & types
public/
└── games/                      # Sandboxed game files
    ├── TEMPLATE/               # Starter template
    ├── snake/{model}/          # Snake implementations
    ├── minesweeper/{model}/    # Minesweeper implementations
    ├── tetris/{model}/         # Tetris implementations
    ├── reversi/{model}/        # Reversi implementations
    ├── breakout/{model}/       # Breakout implementations
    ├── 2048/{model}/           # 2048 implementations
    ├── endless-runner/{model}/ # Endless Runner implementations
    ├── marble-madness/{model}/ # Marble Madness implementations
    ├── maze-3d/{model}/        # 3D Maze implementations
    ├── mini-golf/{model}/      # Mini Golf 3D implementations
    ├── tile-matching/{model}/  # Tile Matching implementations
    ├── space-invaders/{model}/ # Space Invaders implementations
    ├── pac-man/{model}/        # Pac-Man implementations
    └── sudoku/{model}/         # Sudoku implementations
games-metadata.json             # Game & version registry
GAME_DEVELOPMENT_GUIDE.md       # Guide for AI models
```

## 🎯 Adding New Games or AI Versions

See [`GAME_DEVELOPMENT_GUIDE.md`](GAME_DEVELOPMENT_GUIDE.md) for the full specification. In short:

1. Create a single `index.html` at `public/games/{game}/{model}/index.html`
2. All HTML, CSS, and JS must be inline (no external deps)
3. Must use a dark theme with neon accents
4. Must keep gameplay first: work in a sandboxed iframe, support touch/small screens, avoid bloated HUD chrome, and keep essential gameplay controls visible/reachable without scrolling during active play
5. Register the version in `games-metadata.json`

## 📜 License

MIT

