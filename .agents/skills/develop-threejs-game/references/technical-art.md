# Technical Art, Runtime, and Asset Policy

## Runtime

Use the repository-pinned `three@0.185.1` runtime under `public/vendor/three/0.185.1`. The vendored module includes its `three.core.min.js` dependency, GLTFLoader, BufferGeometryUtils, SkeletonUtils, and the Three.js license. Do not use runtime CDNs. Synchronize vendored files from the exact npm package with:

```bash
npm run sync:three-runtime
```

The import map must map `three` and `three/addons/` to the local runtime.

## Asset location and manifest

Creative assets are allowed only under:

```text
public/games/{game}/{model}/assets
```

Every asset directory requires `manifest.json`:

```json
{
  "schemaVersion": 1,
  "ownerModelId": "model-id",
  "budgetException": {
    "reason": "Optional, only when a budget is exceeded.",
    "inspectorReport": "artifacts/threejs-inspection/report.json"
  },
  "assets": [
    {
      "path": "arena.glb",
      "kind": "model",
      "source": "ai-generated",
      "generator": "generator and version",
      "prompt": "Exact generation prompt or procedural recipe",
      "seed": 1234,
      "taskId": "optional provider task ID",
      "purpose": "Primary arena architecture",
      "usageRights": "Generated for this repository with rights to use and redistribute",
      "load": "initial"
    }
  ]
}
```

Required top-level fields are `schemaVersion`, `ownerModelId`, and `assets`. `budgetException` is optional. Required asset fields are `path`, `kind`, `source`, `generator`, `prompt`, `purpose`, and `usageRights`.

- `kind`: `model` or `image`
- `source`: `ai-generated` or `procedural-export`
- `load`: optional `initial` or `deferred`; omitted means `initial`
- optional provenance: `seed`, `taskId`

Remote URLs, path traversal, absolute paths, symlinks, third-party downloaded assets, undeclared files, and owner mismatches are prohibited.

## Supported formats and budgets

- `.glb`
- `.png`
- `.jpg`
- `.jpeg`
- `.webp`

Targets:

- initial asset transfer: at most 8 MiB
- total version assets: at most 12 MiB
- each GLB: at most 6 MiB
- each image edge: at most 2048 pixels

Exceeding a target requires a `budgetException` with a concrete reason and the repository-relative path to a committed inspector report that demonstrates the result.

## Modeling and optimization

- Reuse geometry and materials for repeated modules.
- Use `InstancedMesh` for numerous identical objects.
- Merge static geometry only when it improves calls without destroying useful culling or material separation.
- Prefer authored low/mid-poly silhouettes over hidden high-density meshes.
- Use LOD only when the visual transition is controlled and distance warrants it.
- Keep texture dimensions aligned with screen-space need; avoid large maps for tiny props.
- Dispose replaced geometries, materials, textures, render targets, and loaders' temporary resources when a state is torn down.

## Renderer budget

Budget from the real active-play frame:

- cap DPR deliberately; a typical desktop ceiling is 1.5–2, lower on mobile or stress state
- enable shadows only when they materially improve depth/readability
- minimize shadow-casting lights and tune map size
- keep post-processing passes restrained
- monitor renderer calls, triangles, geometries, and textures
- monitor scene meshes, materials, and instanced meshes

There is no universal automatic pass threshold. Record evidence with the inspector and explain exceptions. A stable frame with deliberate resource use matters more than chasing one metric.

## Loading and failure handling

- Load version assets through relative URLs.
- Show loading progress when initial assets can visibly delay play.
- Provide a coherent procedural fallback or readable failure screen for asset load failure.
- Never fetch creative assets from remote origins at runtime.
- Keep procedural Web Audio for sound; external audio files are outside the v1 asset policy.
