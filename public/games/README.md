# Games Directory

This directory contains all game implementations for BrainRot Games. Each game version keeps executable code in a **standalone `index.html`** file that runs inside a sandboxed iframe, fully isolated from the main website.

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
├── space-invaders/        ← 👾 Space Invaders
├── clockwork-caper/       ← 🕰️ Clockwork Caper
└── kart-racing/           ← 🏁 Sunbeam Kart Rally
```

## Rules for Adding Games

1. **Standalone code** — all executable game HTML, CSS, and JavaScript stays in `index.html`
2. **No remote dependencies** — runtime CDNs and remote creative assets are prohibited
3. **Distinctive art direction** — choose a coherent visual identity suited to the game; no shared palette or theme is required
4. **Desktop-first** — optimize for keyboard play at 1280×720 and use mouse input where appropriate; mobile and touch support are optional
5. **Sandboxed** — runs with `sandbox="allow-scripts allow-pointer-lock"` and no `allow-same-origin`, so it has no parent DOM access

Three.js games must apply `.agents/skills/develop-threejs-game/SKILL.md`. New versions import the pinned runtime from `/vendor/three/0.185.1`; optional model-owned `.glb` and image assets live under `{game}/{model}/assets` with a validated provenance manifest. Existing self-contained or CDN-based versions are grandfathered until their exact owning model revises them.

Current authoritative line counts and detected features live in [`games-metadata.json`](../../games-metadata.json). See [`GAME_DEVELOPMENT_GUIDE.md`](../../GAME_DEVELOPMENT_GUIDE.md) in the project root for full specifications and the template.
