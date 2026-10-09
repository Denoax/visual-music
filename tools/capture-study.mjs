/** Browser evidence only. The silent scene study is never exact-song sync evidence. */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = new URL("../evidence/", import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.BUMER_CHROME,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: process.argv.includes("--video")
    ? { dir: output, size: { width: 1440, height: 900 } }
    : undefined,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5173/?study=0");
await page.locator("#ignition").isEnabled();
await page.waitForFunction(
  () => !document.querySelector("#ignition").disabled,
  { timeout: 45000 },
);
await page.evaluate(() => document.fonts.ready);
const states = [
  ["entrance", 0],
  ["chorus", 35],
  ["bridge", 75],
  ["venue", 105],
  ["finale", 116],
  ["outro", 126],
];
for (const [orientation, width, height] of [
  ["desktop", 1440, 900],
  ["portrait", 390, 844],
]) {
  await page.setViewportSize({ width, height });
  for (const [name, time] of states) {
    await page.locator("#seek").fill(String(time));
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({ path: `${output}${name}-${orientation}.png` });
    console.log(`${name}-${orientation}`);
  }
}
if (process.argv.includes("--video")) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#replay").click();
  for (let elapsed = 0; elapsed < 135; elapsed += 15) {
    await page.waitForTimeout(15000);
    console.log(`Silent study capture: ${elapsed + 15}s`);
  }
  await context.close();
  await page.video().saveAs(`${output}silent-study-full.webm`);
} else await context.close();
await writeFile(
  `${output}capture.json`,
  JSON.stringify(
    {
      browser: browser.version(),
      method:
        "Playwright headless Chromium, software-rendered; frame inspection only; no physical-device or soundtrack-sync claim",
      viewports: [
        [1440, 900],
        [390, 844],
      ],
      states,
      consoleErrors: errors,
      fullSilentStudyCaptured: process.argv.includes("--video"),
    },
    null,
    2,
  ),
);
await browser.close();
if (errors.length) {
  console.error(errors);
  process.exitCode = 1;
}
