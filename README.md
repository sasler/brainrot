# 🧠 BrainRot Games

A web platform where different AI models compete by implementing classic web games. Play each version, compare them side-by-side, and judge which AI builds the best games.

**Live at:** Self-hosted (Next.js)  
**Repo:** [github.com/sasler/BrainRot](https://github.com/sasler/BrainRot)

## 🎮 Games

| Game | Description | Versions |
|------|-------------|----------|
| 🐍 Snake | Navigate the serpent through a digital grid. Consume pixels to grow, but one wrong move means total annihilation. | 5 |
| 💣 Minesweeper | Every click is a calculated gamble. Use logic to uncover safe tiles while avoiding hidden explosives. | 5 |
| 🧱 Tetris | Falling tetrominoes demand split-second decisions. Stack them perfectly or watch entropy consume the board. | 5 |
| ⚫ Reversi | A war of strategic placement. Flip your opponent's pieces and dominate the 8×8 battlefield. | 5 |
| 🏓 Breakout | Shatter neon bricks with a blazing ball. Catch power-ups, chain combos, and clear every level before your lives run out. | 5 |
| 🔢 2048 | Slide, merge, and strategize on a 4×4 grid. Chase the elusive 2048 tile before the board fills up. | 5 |
| 🏃 Endless Runner 3D | A neon-soaked 3D sprint through an endless cyberpunk corridor with obstacles, collectibles, and power-ups. | 5 |
| 🔮 Marble Madness | Roll a glowing marble across neon platforms suspended in space. Master physics, dodge hazards, and race the clock. | 5 |
| 🧭 3D Maze | Navigate a procedurally generated labyrinth in first-person 3D. Find the glowing exit before time runs out. | 5 |
| ⛳ Mini Golf 3D | Aim, pull back, and sink it in this neon-drenched 3D mini golf adventure. Five holes of increasing challenge await. | 4 |

## 🤖 Competing AI Models

| Model | Snake | Minesweeper | Tetris | Reversi | Breakout | 2048 | Endless Runner | Marble Madness | 3D Maze | Mini Golf 3D |
|-------|-------|-------------|--------|---------|----------|------|----------------|----------------|---------|--------------|
| Claude Opus 4.6 | 732 lines | 908 lines | 1,037 lines | 1,272 lines | 990 lines | 870 lines | 994 lines | 1,017 lines | 1,045 lines | 1,201 lines |
| Claude Sonnet 4.6 | 741 lines | 734 lines | 909 lines | 1,026 lines | 784 lines | 649 lines | 1,044 lines | 1,265 lines | 1,157 lines | 1,219 lines |
| GPT 5.4 | 1,522 lines | 1,676 lines | 2,024 lines | 1,318 lines | 1,278 lines | 708 lines | 1,766 lines | 2,278 lines | 1,626 lines | 2,099 lines |
| GPT 5.4 Mini | 1,172 lines | 1,081 lines | 1,155 lines | 1,274 lines | 534 lines | 476 lines | 1,207 lines | 1,579 lines | 1,339 lines | 1,247 lines |
| Gemini 3.1 Pro | 60 lines | 184 lines | 394 lines | 230 lines | 63 lines | 58 lines | 43 lines | 45 lines | 64 lines | N/A |

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

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS 4
- **Fonts:** Geist Sans & Mono (local)
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
    └── mini-golf/{model}/      # Mini Golf 3D implementations
games-metadata.json             # Game & version registry
GAME_DEVELOPMENT_GUIDE.md       # Guide for AI models
```

## 🎯 Adding New Games or AI Versions

See [`GAME_DEVELOPMENT_GUIDE.md`](GAME_DEVELOPMENT_GUIDE.md) for the full specification. In short:

1. Create a single `index.html` at `public/games/{game}/{model}/index.html`
2. All HTML, CSS, and JS must be inline (no external deps)
3. Must use a dark theme with neon accents
4. Must be responsive and work in a sandboxed iframe
5. Register the version in `games-metadata.json`

## 📜 License

MIT
