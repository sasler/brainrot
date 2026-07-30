import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);

test("pinned Three.js and GLTFLoader import in an opaque sandbox iframe", {
  tag: ["@spec:threejs-pipeline", "@area:threejs"],
}, async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      browserErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto("/");
  const moduleResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/vendor/three/0.185.1/three.module.min.js"),
  );
  const loaderResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/vendor/three/0.185.1/addons/loaders/GLTFLoader.js"),
  );

  await page.evaluate(() => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.src = "/test-fixtures/three-runtime/index.html";
    document.body.append(iframe);
  });

  const [moduleResponse, loaderResponse] = await Promise.all([
    moduleResponsePromise,
    loaderResponsePromise,
  ]);
  const fixtureFrame = page.frames().find((frame) =>
    frame.url().includes("/test-fixtures/three-runtime/index.html"),
  );
  expect(fixtureFrame).toBeDefined();

  await expect
    .poll(async () => ({
      runtime: await fixtureFrame!.evaluate(() => {
        const runtimeWindow = window as typeof window & {
          __THREE_RUNTIME_TEST__?: {
            revision: string;
            loader: string;
            imported: boolean;
          };
        };
        return runtimeWindow.__THREE_RUNTIME_TEST__ ?? null;
      }),
      errors: browserErrors,
    }))
    .toEqual({
      runtime: {
        revision: "185",
        loader: "GLTFLoader",
        imported: true,
      },
      errors: [],
    });

  expect(
    await page.locator("iframe").evaluate((iframe) => iframe.contentDocument === null),
  ).toBe(true);
  for (const response of [moduleResponse, loaderResponse]) {
    expect(response.status()).toBe(200);
    expect(response.headers()["access-control-allow-origin"]).toBe("*");
    expect(response.headers()["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(response.headers()["timing-allow-origin"]).toBe("*");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  }
});

test("play page forwards test mode without weakening the iframe sandbox", {
  tag: ["@spec:threejs-pipeline", "@area:site", "@game:maze-3d/gpt-5-6-sol"],
}, async ({
  page,
}) => {
  await page.goto("/games/maze-3d/gpt-5-6-sol?test=1");
  const iframe = page.locator("iframe");
  await expect(iframe).toHaveAttribute(
    "sandbox",
    "allow-scripts allow-pointer-lock",
  );
  await expect(iframe).toHaveAttribute(
    "src",
    "/games/maze-3d/gpt-5-6-sol/index.html?test=1",
  );
  await expect(page.locator("[data-asset-summary]")).toHaveCount(0);
});

test("Three.js inspector creates a report and iframe screenshot", {
  tag: ["@spec:threejs-pipeline", "@area:threejs", "@game:maze-3d/gpt-5-6-sol"],
}, async ({
  baseURL,
}, testInfo) => {
  const outputDir = testInfo.outputPath("threejs-inspection");
  const scriptPath = path.resolve("scripts", "inspect-threejs.js");
  const result = await execFileAsync(
    process.execPath,
    [
      scriptPath,
      "--game",
      "maze-3d",
      "--model",
      "gpt-5-6-sol",
      "--base-url",
      baseURL!,
      "--out",
      outputDir,
    ],
    {
      cwd: path.resolve("."),
      timeout: 60000,
    },
  );

  expect(result.stdout).toContain("Automatic inspection checks passed");
  const reportPath = path.join(outputDir, "report.json");
  const screenshotPath = path.join(outputDir, "iframe.png");
  expect(fs.existsSync(reportPath)).toBe(true);
  expect(fs.statSync(screenshotPath).size).toBeGreaterThan(1000);

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  expect(report.game).toBe("maze-3d");
  expect(report.model).toBe("gpt-5-6-sol");
  expect(report.passedAutomaticChecks).toBe(true);
  expect(report.pixels.colorBuckets).toBeGreaterThan(3);
  expect(report.hooks.available).toBe(false);
  expect(report.warnings).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Standard test hooks are unavailable"),
    ]),
  );
});
