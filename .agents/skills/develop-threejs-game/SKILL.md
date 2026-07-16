---
name: develop-threejs-game
description: Build, substantially revise, or visually review BrainRot Three.js games. Use for any game implementation that imports Three.js or creates a THREE.WebGLRenderer, including art direction, authored 3D forms, local GLB/image assets, rendering budgets, test hooks, diagnostics, and active-play visual verification.
---

# Develop a Three.js Game

Apply `develop-game` first. Its branch safety, exact-model ownership, standalone game architecture, metadata, audio, controls, and documentation requirements still apply. This skill adds the Three.js visual-quality and asset pipeline.

## Route the work

1. Confirm the exact model owns the target game version before changing its HTML or creative assets.
2. Read `GAME_DEVELOPMENT_GUIDE.md`.
3. Read [art-direction.md](references/art-direction.md) before designing or revising visuals.
4. Read [technical-art.md](references/technical-art.md) before adding geometry, materials, lighting, post-processing, or assets.
5. Read [verification.md](references/verification.md) before exposing test hooks or evaluating polish.
6. Keep infrastructure changes separate from model-owned game changes whenever possible.

## Build for authored visual quality

- Define a compact art-direction sentence and a small set of material roles before implementation.
- Design gameplay objects by silhouette and interaction family. Repeated primitive combinations are construction tools, not the finished visual language.
- Compose the world in layers: playable ground, structural forms, interaction landmarks, distant/background forms, atmosphere, and restrained effects.
- Make hazards, objectives, pickups, cover, boundaries, and exits readable through shape, scale, value, motion, and placement before relying on glow or labels.
- Use event-driven VFX for gameplay events. Continuous bloom, particles, fog, or screen effects must not conceal sparse geometry or weak composition.
- Keep the HUD subordinate to the playfield and visually related to the world.

## Use the shared runtime

New Three.js games must use the pinned local runtime. Runtime CDNs are prohibited.

```html
<script type="importmap">
{
  "imports": {
    "three": "/vendor/three/0.185.1/three.module.min.js",
    "three/addons/": "/vendor/three/0.185.1/addons/"
  }
}
</script>
<script type="module">
  import * as THREE from "three";
  import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
</script>
```

The iframe sandbox intentionally remains opaque-origin. Load version-local assets with relative URLs such as `./assets/arena.glb`; repository headers provide CORS, CORP, and resource timing access.

## Manage assets

- Store creative assets only in `public/games/{game}/{model}/assets`.
- Keep executable game code in `index.html`; assets are data only.
- Supported v1 formats are `.glb`, `.png`, `.jpg`, `.jpeg`, and `.webp`.
- Add `assets/manifest.json` and declare every file. Third-party downloaded assets and remote asset URLs are prohibited.
- Use generated or procedural-exported assets with complete provenance and a usage-rights statement.
- Run `npm run validate:game-assets` after any asset change.
- Treat missing image/model credentials as optional capability loss, never as a blocker for procedural Three.js work.

See [technical-art.md](references/technical-art.md) for the manifest schema and budgets.

## Expose test-only controls

For new or substantially revised Three.js games, expose the standardized globals only when the game URL contains `?test=1`.

```js
if (new URLSearchParams(location.search).get("test") === "1") {
  window.__THREE_GAME_TEST_HOOKS__ = {
    seed(seed) {},
    setState(state) {},
    advance(seconds) {},
    snapshot() {},
  };

  window.__THREE_GAME_DIAGNOSTICS__ = {
    snapshot() {
      return {
        renderer: { calls: 0, triangles: 0, geometries: 0, textures: 0 },
        scene: { meshes: 0, materials: 0, instancedMeshes: 0 },
        settings: { dpr: 1, shadows: false, postPasses: 0 },
      };
    },
  };
}
```

Do not expose mutating test controls in normal play.

## Verify active play

1. Run the game through the real sandboxed play page.
2. Capture active play, not only the title screen.
3. Run `npm run inspect:threejs -- --game <id> --model <id> --state active-play`.
4. Review the screenshot and inspector report. Metrics are evidence, not a substitute for visual judgment.
5. Apply the scorecard in [verification.md](references/verification.md).
6. Apply `verify-changes` for the repository validation handoff.

A game may be described as polished only when every scorecard category is at least 2, the average is at least 2.25, an active-play screenshot exists, and no automatic failure applies.

## Attribution

This skill substantially adapts concepts from Majid Manzarpour's MIT-licensed `threejs-game-skills`, especially its model recipes and technical-art guidance. See [UPSTREAM-NOTICE.md](references/UPSTREAM-NOTICE.md).
