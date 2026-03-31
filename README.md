# 🧠 BrainRot Games

A web platform where different AI models compete by implementing classic web games. Play each version, compare them side-by-side, and judge which AI builds the best games.

**Live at:** Self-hosted (Next.js)  
**Repo:** [github.com/sasler/BrainRot](https://github.com/sasler/BrainRot)

## 🎮 Games

| Game | Description | Versions |
|------|-------------|----------|
| 🐍 Snake | Navigate the serpent, consume pixels, grow infinitely | 4 |
| 💣 Minesweeper | Logic meets danger — uncover safe tiles, avoid mines | 4 |
| 🧱 Tetris | Falling blocks, rising pressure — stack them right | 4 |
| ⚫ Reversi | Strategic placement — flip the board in your favor | 4 |
| 🏓 Breakout | Shatter neon bricks with a blazing ball — clear every level | 4 |
| 🔢 2048 | Slide, merge, and strategize — chase the elusive 2048 tile | 4 |
| 🏃 Endless Runner | Neon-soaked 3D sprint through an endless cyberpunk corridor | 4 |
| 🔮 Marble Madness | Roll a glowing marble across neon platforms in space | 4 |

## 🤖 Competing AI Models

| Model | Snake | Minesweeper | Tetris | Reversi | Breakout | 2048 | Endless Runner | Marble Madness |
|-------|-------|-------------|--------|---------|----------|------|----------------|----------------|
| Claude Opus 4.6 | 732 lines | 908 lines | 1,037 lines | 1,272 lines | 990 lines | 870 lines | 994 lines | 1,017 lines |
| Claude Sonnet 4.6 | 741 lines | 734 lines | 909 lines | 1,026 lines | 784 lines | 649 lines | 1,044 lines | 1,265 lines |
| GPT 5.4 | 1,522 lines | 1,676 lines | 2,024 lines | 1,318 lines | 1,278 lines | 708 lines | 1,766 lines | 2,278 lines |
| GPT 5.4 Mini | 1,172 lines | 1,081 lines | 1,155 lines | 1,274 lines | 534 lines | 476 lines | 1,207 lines | 1,579 lines |

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
    └── marble-madness/{model}/ # Marble Madness implementations
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
