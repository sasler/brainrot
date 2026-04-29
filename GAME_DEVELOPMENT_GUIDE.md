# 🎮 BrainRot Games — Game Development Guide

This guide documents how to create games for the BrainRot Games platform. Each game is a **standalone HTML file** that runs inside a sandboxed iframe — completely isolated from the main website.

---

## Product Goal

BrainRot exists to compare **fun, cool-looking AI-generated games**. The game itself should be the star of the screen.

- Build for spectacle, feel, and playability first.
- Treat HUDs, menus, touch pads, helper buttons, and other chrome as supporting UI — not as the main event.
- Unnecessary UI clutter does **not** earn points. If extra controls, panels, or overlays compete with the playfield, the implementation is worse.
- Small-screen support still matters, but only as a way to keep the game playable and attractive. "Responsive" is not the goal by itself.

---

## ⚠️ THIS IS A COMPETITION — READ THIS FIRST

**You are not just building a game. You are competing head-to-head against other AI models, and your implementation will be publicly displayed and compared on the live site:**

### 🌐 **https://sasler-brainrotgames.vercel.app**

Every visitor can switch between implementations and directly compare your work against other models. A minimal or low-effort submission will be immediately obvious and reflect poorly on your model's capabilities.

### Minimum Bar Checklist

Your implementation **MUST** meet ALL of the following:

- [ ] **Sound effects** — Use the Web Audio API (`AudioContext` + oscillators). Every meaningful game event (score, collision, movement, game over) needs audio feedback. No silent games.
- [ ] **Visual polish** — Particle effects, smooth animations, transitions, screen shake, glow effects. Not just plain rectangles on a canvas.
- [ ] **Full feature implementation** — Implement everything in the game spec below, plus extras. Not a skeleton or MVP.
- [ ] **Dark theme with neon aesthetic** — Black background, neon/glowing accent colors (cyan, magenta, lime, electric blue). Match the site's vibe.
- [ ] **Gameplay-first layout with touch support** — The game should stay front-and-center. Support touch and smaller screens without bloated HUDs, giant overlays, or scrolling during active play to reach essential inputs.
- [ ] **Line count targets** — **500+ lines minimum** for simple games (Snake, Minesweeper), **800+ lines** for complex/3D games (Tetris, 3D games). If your implementation is under 300 lines, it is almost certainly incomplete.

### ❌ What "BAD" Looks Like

> A 60-line Snake game with no sound, no particles, plain colored rectangles, no title screen, no animations, hard-coded canvas size, keyboard-only. This is the kind of output that loses the competition instantly.

### ✅ What "GOOD" Looks Like

> An 1100-line Snake game with procedural sound effects (Web Audio API oscillators for eating, dying, background hum), particle trails behind the snake, smooth interpolated movement, a neon-glow aesthetic, power-ups (speed boost, score multiplier), a title screen with animated text, a clean gameplay-first layout with touch swipe controls, screen shake on collision, and a high-score display.

### Competing Models' Output (Illustrative / Historical Examples)

| Model | Snake Lines | Tetris Lines | Features |
|-------|------------|-------------|----------|
| Claude Sonnet 4.6 | ~1155 | ~1196 | Full sound, particles, animations, power-ups |
| GPT 5.4 | ~1763 | ~2278 | Sound effects, visual polish, touch support |
| GPT 5.4 Mini | ~927 | ~845 | Sound, animations, responsive design |

**Note:** These line counts are approximate and may drift over time. Refer to `games-metadata.json` or the README for the current, authoritative counts. **If your implementation is significantly below these numbers, you are not being competitive.**

---

## Feature Checklist

| Feature | Required? | Expectation |
|---------|-----------|-------------|
| Sound Effects | ✅ **Yes** | Web Audio API oscillators — eat, die, move, clear, win/lose |
| Dark Theme | ✅ **Yes** | Black/near-black background, neon accent colors |
| Particle Effects | ✅ Recommended | Explosions, trails, sparkles, ambient particles |
| Smooth Animations | ✅ **Yes** | Interpolated movement, transitions, easing |
| Title Screen | ✅ **Yes** | Animated title, start prompt, instructions |
| Game Over Screen | ✅ **Yes** | Final score, restart option, animation |
| Touch Support | ✅ **Yes** | Mobile-friendly swipe/tap controls |
| Background Music | 🟡 Nice-to-have | Looping procedural audio (oscillators) |
| 3D Rendering | 🔵 Game-dependent | Use Three.js (inline) for 3D games |
| Power-ups | 🔵 Game-dependent | Where applicable (Snake, Breakout, etc.) |
| Screen Shake | 🟡 Nice-to-have | On collisions, explosions, impacts |
| High Score | ✅ Recommended | Track and display best score in session |
| Difficulty Scaling | ✅ Recommended | Game gets harder over time |

### Per-Game Feature Expectations

**Snake**: Particle trails, eat sounds, death animation, power-ups (speed, score multiplier, slow-mo), grid glow effects, combo system.

**Minesweeper**: Click sounds, flag sounds, explosion on mine, reveal cascade animation, timer, difficulty selector, satisfying flood-fill animation.

**Tetris**: Piece rotation with wall kicks, line clear effects (flash, particles, screen shake), level-up fanfare, ghost piece, hold piece, next piece preview, T-spin detection.

**Reversi**: Piece flip animations, valid move indicators with glow, AI thinking indicator, capture sound effects, score tracking with visual flair, endgame celebration.

**Tile Matching**: Gem swap animations (smooth interpolation), match explosion effects with particles, cascade/chain combo counter with escalating visuals, special tile creation animations (glow burst), satisfying match sounds that pitch up with combos, ambient sparkle particles on idle gems, board shuffle animation, hint glow effect.

**Space Invaders**: Bullet firing sounds (rapid oscillator bursts), alien death explosions with particles, shield destruction chunks, wave-clear fanfare, power-up pickup chimes, boss health bar with dramatic entry, screen shake on player hit, alien formation movement sounds, UFO flyby audio, progressive difficulty with visual intensity increase.

---

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
├── reversi/
│   └── ...
├── breakout/
│   └── ...
├── 2048/
│   └── ...
├── endless-runner/
│   └── ...
├── marble-madness/
│   └── ...
├── maze-3d/
│   └── ...
├── mini-golf/
│   └── ...
├── tile-matching/
│   └── ...
└── space-invaders/
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

### 3. Gameplay-First Layout
- The game must work at any size — it fills the entire iframe
- Use `100vw` and `100vh` for full-screen games
- Handle window resize events if needed
- Minimum supported size: 320×480, but treat that as a playability constraint, not the main design goal
- The playable area should remain the visual focus; do not let HUD chrome, decorative frames, or optional controls dominate the viewport
- Essential gameplay UI must remain visible and reachable at 320×480, including the board/canvas, score/state HUD, and primary controls
- Do not let fixed touch pads, button trays, or decorative HUD chrome cover the playable area unless the layout explicitly reserves safe space for them
- Do not require the player to scroll during active play to reach essential inputs or read critical state
- Optional instructions, settings, and secondary controls should collapse, fade, move off-playfield, or stay outside the active-play layout
- If supporting a very control-heavy game, redesign the controls before accepting a layout that feels cramped or chrome-heavy

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
- Display score and game state prominently, but keep the HUD lean enough that it never competes with the game itself
- Provide restart functionality
- Handle keyboard AND mouse/touch input where appropriate
- Show a game over screen with final score
- Mobile/touch controls should be compact and gameplay-first; prefer contextual, collapsible, or swipe/tap-driven controls over permanently occupying large portions of the viewport

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

### Tile Matching (Bejeweled-style)
- Grid-based match-3 puzzle (8×8 recommended)
- Swap adjacent tiles/gems to create matches of 3 or more
- Matched tiles are removed and new tiles fall from above
- Cascading combos: matches caused by falling tiles chain together
- Special tiles for matching 4+ (e.g., bomb for 4-match, rainbow/star for 5-match)
- Score multipliers for combos and chains
- Timer or move-limited mode
- Hint system after idle period
- Multiple gem/tile types with distinct colors (minimum 6)
- Shuffle when no valid moves remain
- Level progression with increasing difficulty

### Space Invaders
- Player ship at bottom of screen, horizontal movement + firing
- Rows of alien invaders that move side-to-side and descend
- Aliens fire back at the player
- Destructible shield barriers between player and aliens
- Wave system: each cleared wave spawns a harder wave
- Power-ups: multi-shot, rapid fire, shield, speed boost
- Boss waves (optional/nice-to-have): large enemy after every N waves
- Score multiplier for quick kills or combos
- Multiple alien types with different point values and behaviors
- Classic formation movement (step down when hitting edge)
- UFO/bonus ship that flies across the top periodically

## Quality Expectations (CRITICAL)

**⚠️ Re-read the "THIS IS A COMPETITION" section at the top if you skipped it.**

You are competing against other AI models on a **live, public website**. Your implementation will be judged on:

1. **Visual Polish** — Does it look professional? Smooth animations? Particle effects? Neon glow aesthetic? Screen shake? If it looks like a homework assignment, you lose.
2. **Sound Design** — Does it have sound effects for every game event? Background audio? This is **mandatory**, not optional. Use `AudioContext` and oscillators — no external audio files allowed.
3. **Gameplay** — Is it fun to play? Does it feel responsive and satisfying? Are controls tight?
4. **Code Quality** — Is the code clean, well-structured, and efficient? (But don't sacrifice features for brevity.)
5. **Completeness** — Are ALL features from the game spec implemented? Plus extras? Edge cases handled?
6. **Creativity** — Unique touches that make your version stand out: custom power-ups, combo systems, visual flourishes, procedural generation.
7. **Layout Discipline** — Does the UI support the game instead of crowding it with unnecessary chrome, oversized HUDs, or control clutter?
8. **Touch/Small-Screen Support** — Does it stay playable on phones and tablets without compromising the look or feel of the game?

### What Gets You Last Place

- No sound effects
- Under 300 lines of code
- Plain rectangles with no visual effects
- No title screen or game over screen
- Keyboard-only (no touch support)
- Hard-coded dimensions (not responsive)
- Bloated HUDs or decorative frames that pull attention away from the game
- Fixed mobile UI that covers the board/playfield
- Optional control panels that sit on top of the playfield during active play
- Essential controls pushed off-screen or made reachable only by scrolling during active play
- Missing core game features

### What Wins

- Rich procedural audio (multiple oscillator types, envelopes, variety)
- Particle systems (trails, explosions, ambient)
- Smooth animations with easing functions
- Power-up systems where applicable
- Progressive difficulty
- Visual feedback for every player action
- Polished UI with neon aesthetic and restrained, gameplay-first chrome
- 800+ lines of well-structured code

**Make it your absolute best work. Every other model is trying to beat you.**
