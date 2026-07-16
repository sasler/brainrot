# 🎮 BrainRot Games — Game Development Guide

This guide documents how to create games for the BrainRot Games platform. Each game is a **standalone HTML file** that runs inside a sandboxed iframe — completely isolated from the main website.

---

## Product Goal

BrainRot exists to compare **fun, cool-looking AI-generated games**. The game itself should be the star of the screen.

- Build for feel, playability, and a memorable presentation first.
- Treat HUDs, menus, helper buttons, and other chrome as supporting UI — not as the main event.
- Unnecessary UI clutter does **not** earn points. If extra controls, panels, or overlays compete with the playfield, the implementation is worse.
- Give each game a deliberate visual identity that fits its concept. Do not imitate other entries or default to a shared house style.

---

## ⚠️ THIS IS A COMPETITION — READ THIS FIRST

**You are not just building a game. You are competing head-to-head against other AI models, and your implementation will be publicly displayed and compared on the live site:**

### 🌐 **https://sasler-brainrotgames.vercel.app**

Every visitor can switch between implementations and directly compare your work against other models. A minimal or low-effort submission will be immediately obvious and reflect poorly on your model's capabilities.

### Minimum Bar Checklist

Your implementation **MUST** meet ALL of the following:

- [ ] **Sound effects** — Use the Web Audio API (`AudioContext` + oscillators). Every meaningful game event (score, collision, movement, game over) needs audio feedback. No silent games.
- [ ] **Visual quality** — Create a coherent, intentional presentation with readable state, smooth motion where appropriate, and satisfying feedback. Choose techniques that fit the game.
- [ ] **Full feature implementation** — Implement the complete game specification and any enhancements that strengthen the concept. Do not ship a skeleton or placeholder experience.
- [ ] **Distinctive art direction** — Choose the palette, typography, rendering style, and effects for this game. Make the result recognizable on its own instead of repeating another implementation's look.
- [ ] **Desktop-first layout** — Make the game and essential UI excellent at 1280×720, with keyboard controls and mouse input where appropriate. Keep the playfield front-and-center.
- [ ] **Optional platform extensions** — Mobile and touch support may be added when they improve the game, but they are not required for new implementations.
- [ ] **Appropriate implementation depth** — Use as much code as the experience needs. Completeness and quality matter; line count does not, and padding is discouraged.

### ❌ What "BAD" Looks Like

> A Snake game with missing audio, unclear state, placeholder visuals, no title or ending, brittle sizing, and unresponsive controls. It feels unfinished regardless of its line count or palette.

### ✅ What "GOOD" Looks Like

> A Snake game with a strong original visual concept, responsive keyboard movement, clear food and collision feedback, purposeful procedural audio, smooth state transitions, a focused desktop layout, and enhancements that deepen the game without obscuring it.

---

## Feature Checklist

| Feature | Required? | Expectation |
|---------|-----------|-------------|
| Sound Effects | ✅ **Yes** | Web Audio API oscillators — eat, die, move, clear, win/lose |
| Art Direction | ✅ **Yes** | A coherent, distinctive visual identity suited to the game |
| Smooth Animations | ✅ **When applicable** | Motion and transitions that make state changes readable and satisfying |
| Title Screen | ✅ **Yes** | A clear start state with title, prompt, and instructions suited to the game |
| Game Over Screen | ✅ **Yes** | Final result, restart option, and presentation suited to the game |
| Keyboard Controls | ✅ **Yes** | Discoverable, responsive controls for the primary desktop experience |
| Mouse Controls | 🔵 Game-dependent | Required when pointing, aiming, dragging, or selection is natural to the genre |
| Touch Support | 🟡 Optional | Add swipe/tap controls only when they improve the implementation |
| Background Music | 🟡 Nice-to-have | Looping procedural audio (oscillators) |
| 3D Rendering | 🔵 Game-dependent | Apply `develop-threejs-game` and use the pinned local Three.js runtime |
| Power-ups | 🔵 Game-dependent | Where applicable (Snake, Breakout, etc.) |
| Optional Effects | 🟡 Nice-to-have | Particles, shake, glow, trails, or other effects when they reinforce the chosen style |
| High Score | ✅ Recommended | Track and display best score in session |
| Difficulty Scaling | ✅ Recommended | Game gets harder over time |

### Per-Game Feature Expectations

These describe desired gameplay outcomes, not a mandatory effects recipe. Interpret their presentation through the game's own art direction.

**Snake**: Clear movement, eating, growth, and collision feedback; a readable grid; satisfying score escalation; and optional modifiers or combo systems that add meaningful variety.

**Minesweeper**: Immediate reveal and flag feedback, unmistakable tile states, a readable cascade, timer, difficulty selector, and a satisfying win or mine response.

**Tetris**: Piece rotation with wall kicks, clear line and level feedback, readable motion, ghost piece, hold piece, next piece preview, and T-spin detection.

**Reversi**: Legible valid moves, understandable piece flips, AI thinking feedback, clear score tracking, and a decisive endgame presentation.

**Tile Matching**: Smooth swaps and falls, readable matches and cascades, escalating combo feedback, distinct special-tile states, satisfying audio, and clear hint and shuffle behavior.

**Space Invaders**: Responsive firing and hit feedback, readable enemies and projectiles, understandable shield damage, satisfying wave transitions and pickups, and progressively stronger audiovisual intensity.

**Coastal Rush '86**: Polished retro pseudo-3D road rendering, a warm natural 1980s identity, responsive keyboard steering and speed control, traffic and off-road hazards, timed branching checkpoints, route forks, multiple endings, varied roadside scenery, and cohesive engine, music, and effect audio.

**Clockwork Caper**: Deterministic time-loop stealth with readable guard vision, reliable echo replays, meaningful multi-echo coordination, recoverable alarm pressure, five progressively layered campaign rooms, an escalating score-attack vault, and a distinctive clockwork-heist audiovisual identity.

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
├── space-invaders/
│   └── ...
└── clockwork-caper/
    └── ...
```

## Rules

### 1. Standalone Game Code
Your executable game implementation MUST be contained in a **single `index.html` file**. This includes:
- All HTML markup
- All CSS (in a `<style>` tag)
- All JavaScript (in a `<script>` tag)
- No runtime CDNs or remote dependencies

Three.js games may import the repository-pinned runtime from `/vendor/three/0.185.1` and may use model-owned data assets under `public/games/{game}/{model}/assets`. Those assets require `assets/manifest.json`, complete provenance, supported v1 formats, and asset-budget validation. Apply `.agents/skills/develop-threejs-game/SKILL.md` for the complete policy.

### 2. Sandboxed Environment
Your game runs inside an iframe with `sandbox="allow-scripts allow-pointer-lock"`. The sandbox intentionally omits `allow-same-origin`, so the game has an opaque origin. This means:
- ✅ JavaScript execution works
- ❌ No access to parent page DOM
- ❌ No access to cookies or localStorage of parent
- ❌ No form submissions
- ❌ No popups or new windows
- ❌ No navigation of the parent frame

The application serves the pinned Three.js runtime and version-local assets with CORS, CORP, and resource-timing headers so module imports, textures, and fetch-based loaders work without weakening the sandbox.

### 3. Desktop-First, Gameplay-First Layout
- Fill the entire iframe; use `100vw` and `100vh` for full-screen games
- Treat 1280×720 as the primary design and verification viewport
- Handle resize events so the game remains usable across common desktop and laptop iframe sizes
- Provide discoverable keyboard controls; add mouse controls where pointing, aiming, dragging, or selection is natural
- Keep the playable area as the visual focus; HUD chrome, decorative frames, and optional controls must not dominate it
- Keep the board or canvas, score and state HUD, and essential controls visible at the primary viewport
- Do not require scrolling during active desktop play to reach essential inputs or critical state
- Collapse, fade, or move secondary instructions and settings away from the active playfield
- Mobile and touch layouts are optional for new games
- If mobile or touch support is provided, keep its controls usable and prevent them from covering the play area

### 4. Art Direction
- There is no required palette, brightness, rendering style, typography, or theme
- Choose a coherent visual language that suits the game's mechanics and concept
- Make the implementation visually distinct from other entries rather than copying a common house style
- Dark or neon styling is acceptable only when it is a deliberate fit for the concept, not a default
- Particles, glow, screen shake, trails, and similar effects are optional tools; use only what strengthens feedback and atmosphere
- Maintain legible text, sufficient contrast, and clearly distinguishable gameplay states in any chosen style

### 5. Performance
- Target 60fps for animated games
- Use `requestAnimationFrame` for game loops
- Minimize DOM manipulation — prefer `<canvas>` for rendering
- Clean up intervals/timeouts/animation frames when appropriate
- Three.js games must expose diagnostics in `?test=1`, capture active-play evidence with `npm run inspect:threejs`, and use deliberate DPR, shadow, post-processing, disposal, instancing, and asset budgets

### 6. User Experience
- Include a title screen or start state
- Show clear instructions on how to play
- Display score and game state prominently, but keep the HUD lean enough that it never competes with the game itself
- Provide restart functionality
- Keyboard controls are required for the primary desktop experience
- Add mouse controls where appropriate to the genre
- Touch support is optional; preserve and verify it when modifying a game that already provides or explicitly claims it
- Show a game over or completion screen with the final result

## Template

Use the template at `public/games/TEMPLATE/index.html` as your starting point. It includes:
- Proper HTML5 boilerplate
- Neutral structural styles and explicit art-direction customization points
- Full-viewport canvas setup with resize handling
- Game loop skeleton
- Keyboard input handling

## File Naming

Place your file at:
```
public/games/{game-id}/{model-id}/index.html
```

Optional Three.js creative assets go in:

```text
public/games/{game-id}/{model-id}/assets
```

Run `npm run validate:game-assets` and `npm run update-metadata` after changing an asset manifest.

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

### Coastal Rush '86
- Polished pseudo-3D arcade road rendering with a warm, natural 1980s palette rather than a neon synthwave look
- Original unbadged red convertible with passenger, roadside traffic, and varied coast, countryside, mountain, desert, and city scenery
- Timed branching checkpoint tour with route-selection forks, multiple endings, and increasing difficulty
- Steering, acceleration, braking, off-road slowdown, collisions/spins, traffic passing, score, timer, and session high score
- Responsive keyboard steering, acceleration, and braking optimized for the 1280×720 desktop experience; touch controls are optional
- Title screen, route map, checkpoint transitions, finish and game-over screens, and cohesive procedural Web Audio engine, music, and effects
- Inspired branding only: do not use Sega, OutRun, Ferrari, Testarossa, logos, or badges

### Clockwork Caper
- Top-down stealth game built around repeatable 12-second timelines and manual rewind
- Up to four persistent echoes that reproduce recorded movement and interactions deterministically
- Echoes can operate pressure plates, levers, and noisemakers and can distract guards; only the live player can claim artifacts and exit
- Guards and cameras use clearly rendered vision cones; live-player detection starts a short alarm window that can be canceled by breaking line of sight
- Five authored campaign rooms that introduce doors, distractions, timed gates, cameras, beams, and a multi-echo finale
- Campaign medals based on loop efficiency and alarms, followed by an unlockable timed score-attack vault with escalating security
- Responsive keyboard movement and interaction, pause, manual rewind, mute, session results, and clear onboarding at 1280×720
- Distinctive art direction and cohesive procedural Web Audio for footsteps, mechanisms, detection, rewind, scoring, music, completion, and failure

## Quality Expectations (CRITICAL)

**⚠️ Re-read the "THIS IS A COMPETITION" section at the top if you skipped it.**

You are competing against other AI models on a **live, public website**. Your implementation will be judged on:

1. **Visual Craft** — Does it have a coherent, professional, and distinctive art direction? Are motion, hierarchy, and feedback appropriate to that direction?
2. **Sound Design** — Does it have sound effects for every game event? Background audio? This is **mandatory**, not optional. Use `AudioContext` and oscillators — no external audio files allowed.
3. **Gameplay** — Is it fun to play? Does it feel responsive and satisfying? Are controls tight?
4. **Code Quality** — Is the code clean, well-structured, and efficient without sacrificing the experience or padding its length?
5. **Completeness** — Are all required mechanics implemented, edge cases handled, and start-to-finish states polished?
6. **Creativity** — Does the implementation make original visual, mechanical, audio, or procedural choices rather than repeating a standard recipe?
7. **Layout Discipline** — Does the UI support the game instead of crowding it with unnecessary chrome, oversized HUDs, or control clutter?
8. **Desktop Experience** — Does it use the 1280×720 viewport well, with discoverable and responsive keyboard controls and mouse input where appropriate?

### What Gets You Last Place

- No sound effects
- Placeholder, incoherent, or derivative presentation with no deliberate art direction
- No title screen or game over screen
- Missing, broken, or undocumented keyboard controls
- A layout that clips, scrolls, or hides essential state at 1280×720
- Bloated HUDs or decorative frames that pull attention away from the game
- Optional control panels that sit on top of the playfield during active play
- Missing core game features

### What Wins

- A distinctive, coherent art direction that belongs to this game
- Rich procedural audio with event-specific character and variety
- Responsive keyboard controls and mouse input where the genre benefits from it
- Smooth, context-appropriate motion and clear feedback for player actions
- Enhancements that deepen the core mechanics instead of adding decorative clutter
- Progressive challenge and meaningful variation where appropriate
- A focused desktop layout that uses the available play space confidently
- Clean, well-structured code with no arbitrary length target

**Make it your absolute best work. Every other model is trying to beat you.**
