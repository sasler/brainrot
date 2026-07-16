const assert = require("node:assert/strict");
const test = require("node:test");
const {
  formatAssetBytes,
  formatAssetSummary,
} = require("../src/lib/assetDisplay");

test("formats compact asset counts and sizes", () => {
  assert.equal(formatAssetBytes(512), "512 B");
  assert.equal(formatAssetBytes(1536), "1.5 KiB");
  assert.equal(formatAssetBytes(2.5 * 1024 * 1024), "2.5 MiB");
  assert.equal(
    formatAssetSummary({ files: 2, bytes: 1536, kinds: ["image", "model"] }),
    "2 assets · 1.5 KiB",
  );
});

test("omits the asset summary when metadata is absent", () => {
  assert.equal(formatAssetSummary(undefined), null);
});
