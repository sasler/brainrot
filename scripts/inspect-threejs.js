#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const ALLOWED_STATES = new Set(["title", "active-play", "fail", "win", "stress"]);

function parseArgs(argv) {
  const options = {
    baseUrl: "http://127.0.0.1:3000",
    state: "active-play",
    mobile: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--mobile") {
      options.mobile = true;
      continue;
    }
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const key = argument.slice(2);
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    if (key === "game") options.game = value;
    else if (key === "model") options.model = value;
    else if (key === "state") options.state = value;
    else if (key === "seed") options.seed = Number(value);
    else if (key === "base-url") options.baseUrl = value.replace(/\/+$/, "");
    else if (key === "out") options.out = value;
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (!options.game || !options.model) {
    throw new Error("--game and --model are required");
  }
  if (!ALLOWED_STATES.has(options.state)) {
    throw new Error(`--state must be one of ${[...ALLOWED_STATES].join(", ")}`);
  }
  if (options.seed !== undefined && !Number.isFinite(options.seed)) {
    throw new Error("--seed must be a finite number");
  }
  return options;
}

async function measureScreenshot(page, screenshotPath) {
  const dataUrl = `data:image/png;base64,${fs.readFileSync(screenshotPath).toString("base64")}`;
  return page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    let sumSquares = 0;
    let min = 255;
    let max = 0;
    const buckets = new Set();
    const stride = Math.max(1, Math.floor((canvas.width * canvas.height) / 50000));
    let samples = 0;
    for (let pixel = 0; pixel < canvas.width * canvas.height; pixel += stride) {
      const offset = pixel * 4;
      const luminance =
        0.2126 * pixels[offset] +
        0.7152 * pixels[offset + 1] +
        0.0722 * pixels[offset + 2];
      sum += luminance;
      sumSquares += luminance * luminance;
      min = Math.min(min, luminance);
      max = Math.max(max, luminance);
      buckets.add(
        `${pixels[offset] >> 5}:${pixels[offset + 1] >> 5}:${pixels[offset + 2] >> 5}`,
      );
      samples++;
    }
    const mean = sum / samples;
    return {
      width: canvas.width,
      height: canvas.height,
      luminanceMean: Number(mean.toFixed(2)),
      luminanceStdDev: Number(
        Math.sqrt(Math.max(0, sumSquares / samples - mean * mean)).toFixed(2),
      ),
      luminanceRange: Number((max - min).toFixed(2)),
      colorBuckets: buckets.size,
      sampledPixels: samples,
    };
  }, dataUrl);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.resolve(
    ROOT,
    options.out ??
      path.join(
        "artifacts",
        "threejs-inspection",
        `${options.game}-${options.model}-${timestamp}`,
      ),
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const screenshotPath = path.join(outputDir, "iframe.png");
  const reportPath = path.join(outputDir, "report.json");
  const viewport = options.mobile
    ? { width: 390, height: 844 }
    : { width: 1280, height: 720 };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: options.mobile ? 2 : 1,
    isMobile: options.mobile,
    hasTouch: options.mobile,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const externalRequests = [];
  const transfers = { runtimeBytes: 0, assetBytes: 0, entries: [] };
  const baseHost = new URL(options.baseUrl).host;

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText ?? "unknown",
      scope: request.frame() === page.mainFrame() ? "page" : "game",
    });
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.host !== baseHost
    ) {
      externalRequests.push({
        url: request.url(),
        scope: request.frame() === page.mainFrame() ? "page" : "game",
      });
    }
  });
  page.on("response", async (response) => {
    try {
      const url = new URL(response.url());
      const isRuntime = url.pathname.startsWith("/vendor/three/");
      const isAsset = url.pathname.startsWith(
        `/games/${options.game}/${options.model}/assets/`,
      );
      if (!isRuntime && !isAsset) return;
      const lengthHeader = Number(response.headers()["content-length"]);
      const bytes = Number.isFinite(lengthHeader) && lengthHeader >= 0
        ? lengthHeader
        : (await response.body()).byteLength;
      if (isRuntime) transfers.runtimeBytes += bytes;
      if (isAsset) transfers.assetBytes += bytes;
      transfers.entries.push({
        url: url.pathname,
        bytes,
        status: response.status(),
      });
    } catch {
      // Transfer metrics are advisory and may be unavailable for cached responses.
    }
  });

  const playUrl =
    `${options.baseUrl}/games/${encodeURIComponent(options.game)}/` +
    `${encodeURIComponent(options.model)}?test=1`;
  const startedAt = Date.now();
  let hooksAvailable = false;
  let diagnosticsAvailable = false;
  let testSnapshot = null;
  let diagnostics = null;
  const warnings = [];

  try {
    await page.goto(playUrl, { waitUntil: "networkidle", timeout: 30000 });
    const iframe = page.locator("iframe").first();
    await iframe.waitFor({ state: "visible", timeout: 15000 });
    const iframeElement = await iframe.elementHandle();
    const frame = await iframeElement.contentFrame();
    if (!frame) throw new Error("Could not access the game iframe");

    await frame.waitForLoadState("domcontentloaded");
    hooksAvailable = await frame.evaluate(
      () => typeof window.__THREE_GAME_TEST_HOOKS__ === "object",
    );
    diagnosticsAvailable = await frame.evaluate(
      () => typeof window.__THREE_GAME_DIAGNOSTICS__?.snapshot === "function",
    );

    if (hooksAvailable) {
      await frame.evaluate(
        ({ state, seed }) => {
          const hooks = window.__THREE_GAME_TEST_HOOKS__;
          if (seed !== undefined) hooks.seed(seed);
          hooks.setState(state);
          hooks.advance(0.25);
        },
        { state: options.state, seed: options.seed },
      );
      testSnapshot = await frame.evaluate(() =>
        window.__THREE_GAME_TEST_HOOKS__.snapshot(),
      );
    } else {
      warnings.push(
        "Standard test hooks are unavailable; state/seed control was skipped (grandfathered games may omit them).",
      );
    }

    await page.waitForTimeout(750);
    if (diagnosticsAvailable) {
      diagnostics = await frame.evaluate(() =>
        window.__THREE_GAME_DIAGNOSTICS__.snapshot(),
      );
    } else {
      warnings.push(
        "Three.js diagnostics are unavailable; renderer metrics remain advisory and incomplete.",
      );
    }

    await iframe.screenshot({ path: screenshotPath });
    const pixels = await measureScreenshot(page, screenshotPath);
    const pixelFailure =
      pixels.luminanceStdDev < 2 ||
      pixels.luminanceRange < 12 ||
      pixels.colorBuckets < 4;
    if (pixelFailure) {
      warnings.push("Screenshot pixel metrics suggest a blank or near-uniform frame.");
    }

    const gameExternalRequests = externalRequests.filter(
      (entry) => entry.scope === "game",
    );
    const gameFailedRequests = failedRequests.filter(
      (entry) => entry.scope === "game",
    );
    const hardFailures = [
      ...consoleErrors.map((message) => `console: ${message}`),
      ...pageErrors.map((message) => `page: ${message}`),
      ...gameFailedRequests.map(
        (entry) => `game request: ${entry.url} (${entry.error})`,
      ),
      ...gameExternalRequests.map((entry) => `external game request: ${entry.url}`),
      ...(pixelFailure ? ["screenshot appears blank or near-uniform"] : []),
    ];
    const report = {
      schemaVersion: 1,
      game: options.game,
      model: options.model,
      state: options.state,
      seed: options.seed ?? null,
      mobile: options.mobile,
      playUrl,
      viewport,
      elapsedMs: Date.now() - startedAt,
      screenshot: path.basename(screenshotPath),
      pixels,
      hooks: { available: hooksAvailable, snapshot: testSnapshot },
      diagnostics: { available: diagnosticsAvailable, snapshot: diagnostics },
      transfers,
      failures: {
        console: consoleErrors,
        page: pageErrors,
        network: failedRequests,
        externalRequests,
      },
      warnings,
      passedAutomaticChecks: hardFailures.length === 0,
      automaticFailures: hardFailures,
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`📸 Screenshot: ${screenshotPath}`);
    console.log(`🧪 Report: ${reportPath}`);
    console.log(
      report.passedAutomaticChecks
        ? "✅ Automatic inspection checks passed. Complete the visual scorecard manually."
        : `❌ ${hardFailures.length} automatic inspection checks failed.`,
    );
    if (!report.passedAutomaticChecks) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
