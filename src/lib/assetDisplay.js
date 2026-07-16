function formatAssetBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib >= 10 ? Math.round(kib) : kib.toFixed(1)} KiB`;
  const mib = kib / 1024;
  return `${mib >= 10 ? Math.round(mib) : mib.toFixed(1)} MiB`;
}

function formatAssetSummary(assets) {
  if (!assets || !Number.isFinite(assets.files) || !Number.isFinite(assets.bytes)) {
    return null;
  }
  return `${assets.files} ${assets.files === 1 ? "asset" : "assets"} · ${formatAssetBytes(assets.bytes)}`;
}

module.exports = {
  formatAssetBytes,
  formatAssetSummary,
};
