import { expect, test } from "@playwright/test";

const IMPLEMENTATIONS: Array<{
  model: string;
  state: string;
  echoAttribute: string;
  startSelector?: string;
  loopCounter?: string;
}> = [
  { model: "gpt-5-6-sol", state: "body[data-screen]", echoAttribute: "data-echo" },
  {
    model: "gpt-5-6-terra",
    state: "#readout[data-screen]",
    echoAttribute: "data-echo",
    startSelector: '[data-start="campaign"]',
  },
  {
    model: "gpt-5-6-luna",
    state: "#app[data-screen]",
    echoAttribute: "data-echoes",
    startSelector: '[data-action="campaign"]',
    loopCounter: "#hudLoops",
  },
];

test.describe("Clockwork Caper", () => {
  for (const implementation of IMPLEMENTATIONS) {
    test(`${implementation.model} exposes the playable loop contract`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      await page.goto(`/games/clockwork-caper/${implementation.model}`);

      const iframe = page.locator("iframe");
      await expect(iframe).toBeVisible();
      const handle = await iframe.elementHandle();
      const frame = await handle?.contentFrame();
      expect(frame).not.toBeNull();
      if (!frame) throw new Error("Clockwork Caper iframe did not attach");

      const canvas = frame.locator("canvas");
      await expect(canvas).toBeVisible();
      await expect
        .poll(() => canvas.evaluate((node) => [node.width >= 900, node.height >= 500]))
        .toEqual([true, true]);
      expect(
        await frame.locator('script[src], link[rel="stylesheet"][href]').count(),
      ).toBe(0);

      const state = frame.locator(implementation.state);
      await expect(state).toHaveAttribute("data-screen", "title");
      if (implementation.startSelector) {
        await frame.locator(implementation.startSelector).click();
      } else {
        await canvas.click({ position: { x: 5, y: 5 } });
        await page.keyboard.press("Enter");
      }
      await expect.poll(() => state.getAttribute("data-screen")).not.toBe("title");
      if (implementation.loopCounter) {
        await expect(frame.locator(implementation.loopCounter)).toHaveText("1 / 2");
      }

      await canvas.click({ force: true, position: { x: 5, y: 5 } });
      await page.keyboard.press("ArrowRight", { delay: 300 });
      await page.keyboard.press("r");
      await expect
        .poll(async () => Number(await state.getAttribute(implementation.echoAttribute)))
        .toBeGreaterThanOrEqual(1);
      if (implementation.loopCounter) {
        await expect(frame.locator(implementation.loopCounter)).toHaveText("2 / 2");
      }

      await page.keyboard.press("Escape");
      await expect(state).toHaveAttribute("data-screen", "paused");
      expect(errors).toEqual([]);
    });
  }
});
