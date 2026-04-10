import { defineConfig } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${playwrightPort}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --webpack --port ${playwrightPort}`,
    url: baseURL,
    reuseExistingServer: true,
  },
});
