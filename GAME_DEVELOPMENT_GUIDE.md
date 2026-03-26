# 🎮 BrainRot Games — Game Development Guide

This guide documents how to create games for the BrainRot Games platform. Each game is a **standalone HTML file** that runs inside a sandboxed iframe — completely isolated from the main website.

## Architecture

```
public/games/
├── TEMPLATE/
│   └── index.html          ← Starter template
├── snake/
│   ├── sonnet-4-6/
│   │   └── index.html      ← Claude Sonnet 4.6's implementation
│   ├── gpt-5-4/
│   │   └── index.html      ← GPT 5.4's implementation
│   └── gpt-5-4-mini/
│       └── index.html      ← GPT 5.4 Mini's implementation
├── minesweeper/
│   └── ...
├── tetris/
│   └── ...
└── reversi/
    └── ...
```

## Rules

### 1. Single File Only
Your entire game MUST be contained in a **single `index.html` file**. This includes:
- All HTML markup
- All CSS (in a `<style>` tag)
- All JavaScript (in a `<script>` tag)
- No external dependencies, CDNs, or imports

### 2. Sandboxed Environment
Your game runs inside an iframe with `sandbox="allow-scripts"`. This means:
- ✅ JavaScript execution works
- ❌ No access to parent page DOM
- ❌ No access to cookies or localStorage of parent
- ❌ No form submissions
- ❌ No popups or new windows
- ❌ No navigation of the parent frame

### 3. Responsive Design
- The game must work at any size — it fills the entire iframe
- Use `100vw` and `100vh` for full-screen games
- Handle window resize events if needed
- Minimum supported size: 320×480 (mobile portrait)

### 4. Dark Theme Required
- Background must be dark (black or very dark gray)
- Use colors that look good on dark backgrounds
- Match the overall BrainRot Games aesthetic: dark, neon accents

### 5. Performance
- Target 60fps for animated games
- Use `requestAnimationFrame` for game loops
- Minimize DOM manipulation — prefer `<canvas>` for rendering
- Clean up intervals/timeouts/animation frames when appropriate

### 6. User Experience
- Include a title screen or start state
- Show clear instructions on how to play
- Display score and game state prominently
- Provide restart functionality
- Handle keyboard AND mouse/touch input where appropriate
- Show a game over screen with final score

## Template

Use the template at `public/games/TEMPLATE/index.html` as your starting point. It includes:
- Proper HTML5 boilerplate
- Dark theme base styles
- Canvas setup with responsive sizing
- Game loop skeleton
- Keyboard input handling

## File Naming

Place your file at:
```
public/games/{game-id}/{model-id}/index.html
```

Where:
- `{game-id}` is the game slug: `snake`, `minesweeper`, `tetris`, `reversi`
- `{model-id}` is your model identifier: `sonnet-4-6`, `gpt-5-4`, `gpt-5-4-mini`

## Metadata

After creating the game, update `games-metadata.json` in the project root to register your version:

```json
{
  "model": "Your Model Name",
  "modelId": "your-model-id",
  "date": "YYYY-MM-DD",
  "tokens": 12345,
  "linesOfCode": 450,
  "path": "/games/{game-id}/{model-id}/index.html"
}
```

Add this to the `versions` array of the appropriate game.

## Game Specifications

### Snake
- Grid-based movement (not pixel-based)
- Arrow key controls
- Food spawns randomly
- Snake grows when eating food
- Game over on wall collision or self collision
- Score display
- Increasing speed as score increases (optional)

### Minesweeper
- Standard grid (e.g., 16×16 with 40 mines for intermediate)
- Left click to reveal, right click to flag
- Number display showing adjacent mines
- First click is always safe
- Timer and mine counter
- Flood fill for empty cells
- Win detection

### Tetris
- Standard 10×20 board
- 7 standard tetrominoes (I, O, T, S, Z, J, L)
- Arrow keys: left/right to move, up to rotate, down for soft drop
- Space for hard drop
- Line clearing with score
- Next piece preview
- Level system with increasing speed
- Ghost piece (optional)

### Reversi (Othello)
- 8×8 board
- Player vs AI opponent
- Click to place pieces
- Valid move highlighting
- Automatic piece flipping
- Score display for both players
- AI opponent (minimax or similar)
- Game over detection with winner announcement

## Quality Expectations

You are competing against other AI models. Your implementation will be judged on:

1. **Visual Polish** — Does it look professional? Smooth animations? Nice UI?
2. **Gameplay** — Is it fun to play? Does it feel responsive?
3. **Code Quality** — Is the code clean, well-structured, and efficient?
4. **Completeness** — Are all features implemented? Edge cases handled?
5. **Creativity** — Any unique touches that make your version stand out?

Make it your best work. This is a competition.
