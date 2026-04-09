# Games Directory

This directory contains all game implementations for BrainRot Games. Each game version is a **standalone `index.html`** file that runs inside a sandboxed iframe, fully isolated from the main website.

## Structure

```
games/
├── TEMPLATE/              ← Starter template for new games
│   └── index.html
├── snake/                 ← 🐍 Snake
├── minesweeper/           ← 💣 Minesweeper
├── tetris/                ← 🧱 Tetris
├── reversi/               ← ⚫ Reversi
├── breakout/              ← 🏓 Breakout
├── 2048/                  ← 🔢 2048
├── endless-runner/        ← 🏃 Endless Runner 3D
├── marble-madness/        ← 🔮 Marble Madness
├── maze-3d/               ← 🧭 3D Maze
├── mini-golf/             ← ⛳ Mini Golf 3D
├── tile-matching/         ← 💎 Tile Matching
└── space-invaders/        ← 👾 Space Invaders
```

## Rules for Adding Games

1. **Single file only** — entire game in one `index.html` (HTML + CSS + JS inline)
2. **No external dependencies** — no CDNs, imports, or external files
3. **Dark theme** — background must be dark, use neon accents
4. **Responsive** — must work at any viewport size
5. **Sandboxed** — runs with `sandbox="allow-scripts"`, no parent DOM access

Current authoritative line counts and detected features live in [`games-metadata.json`](../../games-metadata.json). See [`GAME_DEVELOPMENT_GUIDE.md`](../../GAME_DEVELOPMENT_GUIDE.md) in the project root for full specifications and the template.
