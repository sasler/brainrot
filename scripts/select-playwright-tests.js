const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const AREA_SITE = "@area:site";
const AREA_RATINGS = "@area:ratings";
const AREA_THREEJS = "@area:threejs";
const SPEC_GAMES_LOAD = "@spec:games-load";

const FULL_SUITE_PATTERNS = [
  /^\.github\/workflows\//,
  /^eslint\.config\./,
  /^next\.config\./,
  /^package(?:-lock)?\.json$/,
  /^playwright\.config\./,
  /^postcss\.config\./,
  /^scripts\/select-playwright-tests\.js$/,
  /^tests\/(?![^/]+\.spec\.[cm]?[jt]sx?$)/,
  /^tests-node\/select-playwright-tests\.test\.js$/,
  /^tsconfig(?:\.[^/]+)?\.json$/,
];

const NO_PLAYWRIGHT_PATTERNS = [
  /^\.agents\//,
  /^\.gitignore$/,
  /^AGENTS\.md$/,
  /^CLAUDE\.md$/,
  /^GAME_DEVELOPMENT_GUIDE\.md$/,
  /^README\.md$/,
  /^public\/games\/README\.md$/,
  /^public\/games\/TEMPLATE\//,
  /^reviews\//,
  /^tests-node\/(?!select-playwright-tests\.test\.js$)/,
  /\.md$/,
];

const THREE_TOOLING_PATTERNS = [
  /^public\/test-fixtures\/three-runtime\//,
  /^scripts\/(?:game-assets|inspect-threejs|sync-three-runtime|validate-game-assets)\.js$/,
];

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function gameTag(gameId, modelId) {
  return `@game:${gameId}/${modelId}`;
}

function specTag(filePath) {
  const match = normalizePath(filePath).match(/^tests\/([^/]+)\.spec\.[cm]?[jt]sx?$/);
  return match ? `@spec:${match[1]}` : null;
}

function metadataVersionKeys(metadata) {
  return new Set(metadataVersionsByKey(metadata).keys());
}

function metadataVersionsByKey(metadata) {
  const versions = new Map();
  for (const game of metadata?.games ?? []) {
    if (typeof game?.id !== "string") continue;
    for (const version of game.versions ?? []) {
      if (typeof version?.modelId === "string") {
        versions.set(`${game.id}/${version.modelId}`, version);
      }
    }
  }
  return versions;
}

function changedMetadataVersions(baseMetadata, headMetadata) {
  const before = metadataVersionsByKey(baseMetadata);
  const after = metadataVersionsByKey(headMetadata);
  return new Set(
    [...new Set([...before.keys(), ...after.keys()])].filter((key) => {
      if (!before.has(key) || !after.has(key)) return true;
      return before.get(key)?.path !== after.get(key)?.path;
    }),
  );
}

function findThreeRuntimeConsumers(rootDir) {
  const gamesRoot = path.join(rootDir, "public", "games");
  const consumers = new Set();
  if (!fs.existsSync(gamesRoot)) return consumers;

  for (const gameEntry of fs.readdirSync(gamesRoot, { withFileTypes: true })) {
    if (!gameEntry.isDirectory() || gameEntry.name === "TEMPLATE") continue;
    const gameRoot = path.join(gamesRoot, gameEntry.name);
    for (const modelEntry of fs.readdirSync(gameRoot, { withFileTypes: true })) {
      if (!modelEntry.isDirectory()) continue;
      const gameFile = path.join(gameRoot, modelEntry.name, "index.html");
      if (!fs.existsSync(gameFile)) continue;
      const source = fs.readFileSync(gameFile, "utf8");
      if (/\/vendor\/three\/|three\.(?:module|core)\.min\.js/.test(source)) {
        consumers.add(`${gameEntry.name}/${modelEntry.name}`);
      }
    }
  }
  return consumers;
}

function isMatch(filePath, patterns) {
  return patterns.some((pattern) => pattern.test(filePath));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function selectPlaywrightImpact({
  changes,
  baseMetadata = { games: [] },
  headMetadata = { games: [] },
  rootDir = process.cwd(),
  forceFull = false,
}) {
  if (forceFull) {
    return {
      mode: "full",
      tags: [],
      grep: "",
      summary: "Full Playwright suite requested explicitly.",
    };
  }

  const tags = new Set();
  const reasons = new Set();
  let metadataChanged = false;

  for (const change of changes) {
    for (const rawPath of change.paths) {
      const filePath = normalizePath(rawPath);

      if (isMatch(filePath, FULL_SUITE_PATTERNS)) {
        return {
          mode: "full",
          tags: [],
          grep: "",
          summary: `Full Playwright suite required by ${filePath}.`,
        };
      }

      const changedSpecTag = specTag(filePath);
      if (changedSpecTag) {
        tags.add(changedSpecTag);
        reasons.add(`changed spec ${filePath}`);
        continue;
      }

      const gameMatch = filePath.match(/^public\/games\/([^/]+)\/([^/]+)\//);
      if (gameMatch && gameMatch[1] !== "TEMPLATE") {
        tags.add(gameTag(gameMatch[1], gameMatch[2]));
        reasons.add(`game ${gameMatch[1]}/${gameMatch[2]}`);
        continue;
      }

      if (filePath === "games-metadata.json") {
        metadataChanged = true;
        tags.add(AREA_SITE);
        tags.add(AREA_RATINGS);
        reasons.add("game metadata");
        continue;
      }

      if (filePath.startsWith("public/vendor/three/")) {
        tags.add(AREA_THREEJS);
        for (const consumer of findThreeRuntimeConsumers(rootDir)) {
          const [gameId, modelId] = consumer.split("/");
          tags.add(gameTag(gameId, modelId));
        }
        reasons.add("pinned Three.js runtime");
        continue;
      }

      if (isMatch(filePath, THREE_TOOLING_PATTERNS)) {
        tags.add(AREA_THREEJS);
        reasons.add("Three.js tooling");
        continue;
      }

      if (filePath.startsWith("src/")) {
        tags.add(AREA_SITE);
        tags.add(AREA_RATINGS);
        tags.add(SPEC_GAMES_LOAD);
        reasons.add("shared application source");
        continue;
      }

      if (/^public\/[^/]+$/.test(filePath)) {
        tags.add(AREA_SITE);
        reasons.add("shared public asset");
        continue;
      }

      if (isMatch(filePath, NO_PLAYWRIGHT_PATTERNS)) continue;

      return {
        mode: "full",
        tags: [],
        grep: "",
        summary: `Full Playwright suite required by unclassified path ${filePath}.`,
      };
    }
  }

  if (metadataChanged) {
    for (const key of changedMetadataVersions(baseMetadata, headMetadata)) {
      const [gameId, modelId] = key.split("/");
      tags.add(gameTag(gameId, modelId));
      reasons.add(`metadata version ${key}`);
    }
  }

  const selectedTags = [...tags].sort();
  if (selectedTags.length === 0) {
    return {
      mode: "none",
      tags: [],
      grep: "",
      summary: "No Playwright-impacting files changed.",
    };
  }

  return {
    mode: "scoped",
    tags: selectedTags,
    grep: selectedTags.map(escapeRegex).join("|"),
    summary: `Selected ${selectedTags.join(", ")} (${[...reasons].join("; ")}).`,
  };
}

function parseNameStatus(output) {
  const tokens = output.split("\0");
  if (tokens.at(-1) === "") tokens.pop();
  const changes = [];
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    const pathCount = /^[RC]/.test(status) ? 2 : 1;
    const paths = tokens.slice(index, index + pathCount).map(normalizePath);
    index += pathCount;
    changes.push({ status, paths });
  }
  return changes;
}

function readMetadataAtRef(rootDir, ref) {
  try {
    const output = execFileSync("git", ["show", `${ref}:games-metadata.json`], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(output);
  } catch {
    return { games: [] };
  }
}

function readChanges(rootDir, base, head) {
  const output = execFileSync(
    "git",
    ["diff", "--name-status", "-z", "--find-renames", `${base}...${head}`],
    { cwd: rootDir, encoding: "utf8" },
  );
  return parseNameStatus(output);
}

function parseArgs(argv) {
  const args = { forceFull: false, json: false };
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value === "--force-full") args.forceFull = true;
    else if (value === "--json") args.json = true;
    else if (["--base", "--head", "--github-output"].includes(value)) {
      args[value.slice(2).replace("-", "_")] = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return args;
}

function writeGitHubOutput(filePath, result) {
  const lines = [
    `mode=${result.mode}`,
    `grep=${result.grep}`,
    `summary=${result.summary.replaceAll("\n", " ")}`,
  ];
  fs.appendFileSync(filePath, `${lines.join("\n")}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  let changes = [];
  let baseMetadata = { games: [] };
  let headMetadata = { games: [] };

  if (!args.forceFull) {
    if (!args.base || !args.head) {
      throw new Error("--base and --head are required unless --force-full is used");
    }
    changes = readChanges(rootDir, args.base, args.head);
    baseMetadata = readMetadataAtRef(rootDir, args.base);
    headMetadata = readMetadataAtRef(rootDir, args.head);
  }

  const result = selectPlaywrightImpact({
    changes,
    baseMetadata,
    headMetadata,
    rootDir,
    forceFull: args.forceFull,
  });

  if (args.github_output) writeGitHubOutput(args.github_output, result);
  if (args.json) console.log(JSON.stringify({ ...result, changes }, null, 2));
  else console.log(`${result.mode}: ${result.summary}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  AREA_RATINGS,
  AREA_SITE,
  AREA_THREEJS,
  SPEC_GAMES_LOAD,
  changedMetadataVersions,
  findThreeRuntimeConsumers,
  gameTag,
  metadataVersionKeys,
  normalizePath,
  parseNameStatus,
  selectPlaywrightImpact,
  specTag,
};
