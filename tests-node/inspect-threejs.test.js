const assert = require("node:assert/strict");
const test = require("node:test");
const {
  isInspectedResource,
  resourceHttpFailure,
} = require("../scripts/inspect-threejs");

test("classifies only pinned runtime and version-local assets as inspected resources", () => {
  assert.equal(
    isInspectedResource(
      new URL("http://localhost/vendor/three/0.185.1/three.module.min.js"),
      "maze-3d",
      "model",
    ),
    true,
  );
  assert.equal(
    isInspectedResource(
      new URL("http://localhost/games/maze-3d/model/assets/arena.glb"),
      "maze-3d",
      "model",
    ),
    true,
  );
  assert.equal(
    isInspectedResource(
      new URL("http://localhost/games/another/model/assets/arena.glb"),
      "maze-3d",
      "model",
    ),
    false,
  );
});

test("turns HTTP error responses for inspected resources into failures", () => {
  assert.deepEqual(
    resourceHttpFailure({
      status: 404,
      url: new URL("http://localhost/games/maze-3d/model/assets/missing.glb"),
      game: "maze-3d",
      model: "model",
    }),
    {
      url: "/games/maze-3d/model/assets/missing.glb",
      status: 404,
    },
  );
  assert.equal(
    resourceHttpFailure({
      status: 200,
      url: new URL("http://localhost/games/maze-3d/model/assets/arena.glb"),
      game: "maze-3d",
      model: "model",
    }),
    null,
  );
  assert.equal(
    resourceHttpFailure({
      status: 500,
      url: new URL("http://localhost/api/ratings"),
      game: "maze-3d",
      model: "model",
    }),
    null,
  );
});
