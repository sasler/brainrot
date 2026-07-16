# Active-Play Verification

## Standard test interface

Expose these globals only when `?test=1` is present:

```ts
window.__THREE_GAME_TEST_HOOKS__ = {
  seed(seed: number): void;
  setState(state: "title" | "active-play" | "fail" | "win" | "stress"): void;
  advance(seconds: number): void;
  snapshot(): unknown;
};

window.__THREE_GAME_DIAGNOSTICS__ = {
  snapshot(): {
    renderer: { calls: number; triangles: number; geometries: number; textures: number };
    scene: { meshes: number; materials: number; instancedMeshes: number };
    settings: { dpr: number; shadows: boolean; postPasses: number };
  };
};
```

`seed` must make random visual/gameplay setup repeatable. `setState` must reach a representative state without synthetic DOM clicks. `advance` must advance deterministic simulation time without waiting in real time. `snapshot` must return serializable state.

Diagnostics should read current renderer and scene state, not stale construction-time values.

## Inspector

Run the game through its real play page:

```bash
npm run inspect:threejs -- --game <id> --model <id> --state active-play --seed 123
```

Optional flags:

- `--mobile`
- `--base-url http://127.0.0.1:3000`
- `--out artifacts/threejs-inspection/custom-run`

Review:

- iframe screenshot
- console and page errors
- failed requests
- external requests
- pixel contrast/color metrics
- Three.js diagnostics
- runtime and version-asset transfer

Metrics are advisory. Always inspect the image.

## Visual scorecard

Score each category from 0–3:

| Category | Review focus |
|---|---|
| Art direction | Coherent visual thesis, palette, shape language, and focal hierarchy |
| Authored gameplay forms | Distinct silhouettes and purposeful construction for gameplay families |
| Environment/composition | Layered world, landmarks, route framing, background, and intentional density |
| Materials/lighting | Reusable roles, readable values, depth, restrained emissive and shadow use |
| Motion/VFX | Stateful motion and event-driven effects that reinforce actions |
| Gameplay readability | Threats, goals, navigation, feedback, and controls remain clear |
| UI/world cohesion | HUD supports the world language and does not obstruct play |
| Performance evidence | Inspector evidence, deliberate DPR/shadows/passes, and justified budgets |

Interpretation:

- 0: absent or actively harmful
- 1: present but generic, incomplete, or inconsistent
- 2: deliberate, coherent, and release-ready
- 3: distinctive, highly resolved, and unusually strong

“Polished” requires:

- every category at least 2
- average at least 2.25
- an active-play screenshot
- no automatic failure

Automatic failures:

- primitive-dominant meaningful forms
- effects masking missing geometry or composition
- sparse unintentional worlds
- HUD obstruction of gameplay
- missing active-play evidence
- material runtime errors or remote runtime/asset requests
