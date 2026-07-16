const fs = require("node:fs");
const path = require("node:path");

const MANIFEST_NAME = "manifest.json";
const SCHEMA_VERSION = 1;
const MIB = 1024 * 1024;
const BUDGETS = {
  initialBytes: 8 * MIB,
  totalBytes: 12 * MIB,
  glbBytes: 6 * MIB,
  imageEdge: 2048,
};
const EXTENSIONS = new Map([
  [".glb", "model"],
  [".png", "image"],
  [".jpg", "image"],
  [".jpeg", "image"],
  [".webp", "image"],
]);
const SOURCES = new Set(["ai-generated", "procedural-export"]);
const LOAD_PHASES = new Set(["initial", "deferred"]);

function issue(errors, scope, message) {
  errors.push(`${scope}: ${message}`);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeAssetPath(value) {
  if (!isNonEmptyString(value)) return { error: "path must be a non-empty string" };
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return { error: "remote URLs are prohibited" };
  if (value.includes("\\")) return { error: "backslashes are prohibited; use forward slashes" };
  if (path.posix.isAbsolute(value)) return { error: "absolute paths are prohibited" };

  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return { error: "path traversal and empty path segments are prohibited" };
  }

  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized.startsWith("../")) {
    return { error: "path traversal is prohibited" };
  }
  return { value: normalized };
}

function walkAssetFiles(root, errors, scope, relative = "") {
  const files = [];
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const childRelative = relative
      ? `${relative}/${entry.name}`
      : entry.name;
    const childPath = path.join(root, ...childRelative.split("/"));
    const stats = fs.lstatSync(childPath);
    if (stats.isSymbolicLink()) {
      issue(errors, scope, `symlinks are prohibited (${childRelative})`);
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...walkAssetFiles(root, errors, scope, childRelative));
    } else if (entry.isFile() && childRelative !== MANIFEST_NAME) {
      files.push(childRelative);
    }
  }
  return files.sort();
}

function readPngDimensions(buffer) {
  if (
    buffer.length < 24 ||
    buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a" ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    throw new Error("invalid PNG header");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("invalid JPEG header");
  }
  let offset = 2;
  const sofMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buffer.length) break;
    if (sofMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions not found");
}

function readWebpDimensions(buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("invalid WebP header");
  }
  const chunk = buffer.toString("ascii", 12, 16);
  const data = 20;
  if (chunk === "VP8X") {
    return {
      width: buffer.readUIntLE(data + 4, 3) + 1,
      height: buffer.readUIntLE(data + 7, 3) + 1,
    };
  }
  if (
    chunk === "VP8 " &&
    buffer.length >= data + 10 &&
    buffer[data + 3] === 0x9d &&
    buffer[data + 4] === 0x01 &&
    buffer[data + 5] === 0x2a
  ) {
    return {
      width: buffer.readUInt16LE(data + 6) & 0x3fff,
      height: buffer.readUInt16LE(data + 8) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && buffer.length >= data + 5 && buffer[data] === 0x2f) {
    const b1 = buffer[data + 1];
    const b2 = buffer[data + 2];
    const b3 = buffer[data + 3];
    const b4 = buffer[data + 4];
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | (b2 >> 6)),
    };
  }
  throw new Error(`unsupported WebP chunk ${chunk}`);
}

function readImageDimensions(filePath, extension) {
  const buffer = fs.readFileSync(filePath);
  if (extension === ".png") return readPngDimensions(buffer);
  if (extension === ".jpg" || extension === ".jpeg") return readJpegDimensions(buffer);
  if (extension === ".webp") return readWebpDimensions(buffer);
  throw new Error(`unsupported image extension ${extension}`);
}

function validBudgetException(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    isNonEmptyString(value.reason) &&
    isNonEmptyString(value.inspectorReport) &&
    !/^[a-z][a-z\d+.-]*:/i.test(value.inspectorReport) &&
    !path.posix.isAbsolute(value.inspectorReport) &&
    !value.inspectorReport.split("/").includes(".."),
  );
}

function validateAssetDirectory({
  assetsDir,
  gameId,
  modelId,
  registeredModelIds,
  rootDir = path.resolve(assetsDir, "..", "..", "..", "..", ".."),
}) {
  const scope = `${gameId}/${modelId}`;
  const errors = [];
  const summary = { files: 0, bytes: 0, kinds: [] };
  const manifestPath = path.join(assetsDir, MANIFEST_NAME);

  if (!fs.existsSync(manifestPath)) {
    issue(errors, scope, `missing ${MANIFEST_NAME}`);
    return { errors, summary: null };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    issue(errors, scope, `invalid manifest JSON (${error.message})`);
    return { errors, summary: null };
  }

  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    issue(errors, scope, `schemaVersion must be ${SCHEMA_VERSION}`);
  }
  if (manifest.ownerModelId !== modelId) {
    issue(errors, scope, `ownerModelId must match directory model "${modelId}"`);
  }
  if (registeredModelIds && !registeredModelIds.has(modelId)) {
    issue(errors, scope, "asset directory does not belong to a registered game version");
  }
  if (!Array.isArray(manifest.assets)) {
    issue(errors, scope, "assets must be an array");
    return { errors, summary: null };
  }
  const exceptionSyntaxValid = validBudgetException(manifest.budgetException);
  let exceptionEvidenceExists = false;
  if (manifest.budgetException !== undefined && !exceptionSyntaxValid) {
    issue(errors, scope, "budgetException requires a local inspectorReport path and non-empty reason");
  } else if (exceptionSyntaxValid) {
    const evidencePath = path.resolve(
      rootDir,
      ...manifest.budgetException.inspectorReport.split("/"),
    );
    const insideRoot =
      evidencePath === rootDir || evidencePath.startsWith(`${rootDir}${path.sep}`);
    exceptionEvidenceExists =
      insideRoot && fs.existsSync(evidencePath) && fs.statSync(evidencePath).isFile();
    if (!exceptionEvidenceExists) {
      issue(
        errors,
        scope,
        `budgetException inspector evidence is missing (${manifest.budgetException.inspectorReport})`,
      );
    }
  }

  const declared = new Map();
  let initialBytes = 0;
  const kinds = new Set();
  const budgetProblems = [];
  const requiredText = ["generator", "prompt", "purpose", "usageRights"];

  manifest.assets.forEach((asset, index) => {
    const assetScope = `${scope} asset[${index}]`;
    if (!asset || typeof asset !== "object") {
      issue(errors, assetScope, "entry must be an object");
      return;
    }

    const normalized = normalizeAssetPath(asset.path);
    if (normalized.error) {
      issue(errors, assetScope, normalized.error);
      return;
    }
    const assetPath = normalized.value;
    if (declared.has(assetPath)) {
      issue(errors, assetScope, `duplicate declaration for ${assetPath}`);
      return;
    }
    declared.set(assetPath, asset);

    const extension = path.posix.extname(assetPath).toLowerCase();
    const expectedKind = EXTENSIONS.get(extension);
    if (!expectedKind) {
      issue(errors, assetScope, `unsupported format ${extension || "(none)"}`);
    }
    if (asset.kind !== "model" && asset.kind !== "image") {
      issue(errors, assetScope, 'kind must be "model" or "image"');
    } else if (expectedKind && asset.kind !== expectedKind) {
      issue(errors, assetScope, `kind must be "${expectedKind}" for ${extension}`);
    }
    if (!SOURCES.has(asset.source)) {
      issue(errors, assetScope, 'source must be "ai-generated" or "procedural-export"');
    }
    for (const field of requiredText) {
      if (!isNonEmptyString(asset[field])) issue(errors, assetScope, `${field} is required`);
    }
    if (asset.load !== undefined && !LOAD_PHASES.has(asset.load)) {
      issue(errors, assetScope, 'load must be "initial" or "deferred"');
    }
    if (asset.taskId !== undefined && !isNonEmptyString(asset.taskId)) {
      issue(errors, assetScope, "taskId must be a non-empty string when present");
    }
    if (
      asset.seed !== undefined &&
      typeof asset.seed !== "number" &&
      !isNonEmptyString(asset.seed)
    ) {
      issue(errors, assetScope, "seed must be a number or non-empty string when present");
    }

    const filePath = path.join(assetsDir, ...assetPath.split("/"));
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      issue(errors, assetScope, `declared file is missing (${assetPath})`);
      return;
    }

    const bytes = fs.statSync(filePath).size;
    summary.files++;
    summary.bytes += bytes;
    if ((asset.load ?? "initial") === "initial") initialBytes += bytes;
    if (asset.kind === "model" || asset.kind === "image") kinds.add(asset.kind);

    if (extension === ".glb" && bytes > BUDGETS.glbBytes) {
      budgetProblems.push(`${assetPath} exceeds the 6 MiB GLB target`);
    }
    if (expectedKind === "image") {
      try {
        const dimensions = readImageDimensions(filePath, extension);
        if (
          dimensions.width > BUDGETS.imageEdge ||
          dimensions.height > BUDGETS.imageEdge
        ) {
          budgetProblems.push(
            `${assetPath} is ${dimensions.width}×${dimensions.height}; max edge is 2048px`,
          );
        }
      } catch (error) {
        issue(errors, assetScope, `could not inspect image dimensions (${error.message})`);
      }
    }
  });

  const actualFiles = walkAssetFiles(assetsDir, errors, scope);
  for (const actual of actualFiles) {
    if (!declared.has(actual)) issue(errors, scope, `undeclared file ${actual}`);
  }

  if (initialBytes > BUDGETS.initialBytes) {
    budgetProblems.push("initial asset transfer exceeds 8 MiB");
  }
  if (summary.bytes > BUDGETS.totalBytes) {
    budgetProblems.push("total assets exceed 12 MiB");
  }
  if (budgetProblems.length > 0 && !(exceptionSyntaxValid && exceptionEvidenceExists)) {
    for (const problem of budgetProblems) {
      issue(errors, scope, `${problem}; document a budgetException with inspector evidence`);
    }
  }

  summary.kinds = [...kinds].sort();
  return { errors, summary };
}

function validateRepositoryAssets({ rootDir, metadata }) {
  const errors = [];
  const summaries = new Map();
  const gamesRoot = path.join(rootDir, "public", "games");
  const registered = new Map(
    metadata.games.map((game) => [
      game.id,
      new Set(game.versions.map((version) => version.modelId)),
    ]),
  );

  if (!fs.existsSync(gamesRoot)) return { errors, summaries };
  for (const gameEntry of fs.readdirSync(gamesRoot, { withFileTypes: true })) {
    if (!gameEntry.isDirectory()) continue;
    const gameRoot = path.join(gamesRoot, gameEntry.name);
    for (const modelEntry of fs.readdirSync(gameRoot, { withFileTypes: true })) {
      if (!modelEntry.isDirectory()) continue;
      const assetsDir = path.join(gameRoot, modelEntry.name, "assets");
      if (!fs.existsSync(assetsDir)) continue;
      const result = validateAssetDirectory({
        assetsDir,
        gameId: gameEntry.name,
        modelId: modelEntry.name,
        registeredModelIds: registered.get(gameEntry.name),
        rootDir,
      });
      errors.push(...result.errors);
      if (result.summary) {
        summaries.set(`${gameEntry.name}/${modelEntry.name}`, result.summary);
      }
    }
  }
  return { errors, summaries };
}

module.exports = {
  BUDGETS,
  validateAssetDirectory,
  validateRepositoryAssets,
};
