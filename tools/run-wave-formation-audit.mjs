/** Real shared-runtime formation shader audit. Apply $reference-led-design.
 * Uses a temporary owned native browser; saves actual arithmetic results, not
 * visual/listening/foreground-performance approval. */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const out = "evidence/black-sky-wave-colour";
const preview = "http://127.0.0.1:4177/";
const reportPath = `${out}/wave-formations-gpu-audit.json`;
const errors = [];
const record = {
  startedUtc: new Date().toISOString(),
  preview,
  headed: true,
  softwareRequested: false,
  errors,
};
const args = [
  "--no-sandbox",
  "--enable-automation",
  "--ozone-platform=x11",
  "--use-gl=angle",
  "--use-angle=gl",
];
let browser;
await mkdir(out, { recursive: true });
try {
  const html = await fetch(`${preview}tools/audit-wave-formations.html`).then(
    async (r) => {
      if (!r.ok) throw Error(`HTTP ${r.status}`);
      return r.text();
    },
  );
  record.servedAuditSha256 = createHash("sha256").update(html).digest("hex");
  browser = await chromium.launch({
    headless: false,
    executablePath:
      process.env.BUMER_CHROME ||
      "/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
    args,
  });
  record.chromiumVersion = browser.version();
  record.browserArgs = args;
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  page.on("pageerror", (e) => errors.push(e.stack ?? e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error")
      errors.push({ message: msg.text(), location: msg.location() });
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push({ url: response.url(), status: response.status() });
  });
  page.setDefaultNavigationTimeout(300000);
  const cdp = await page.context().newCDPSession(page);
  const command = await cdp.send("Browser.getBrowserCommandLine");
  const profile = command.arguments
    .find((arg) => arg.startsWith("--user-data-dir="))
    ?.slice(16);
  if (!profile?.startsWith("/tmp/playwright_chromiumdev_profile-"))
    throw Error("Temporary audit profile ownership not proven");
  record.temporaryOwnedProfile = true;
  await page.goto(`${preview}tools/audit-wave-formations.html`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => /^Wave shader audit: (passed|failed)$/.test(document.title),
    null,
    { timeout: 300000 },
  );
  record.result = JSON.parse(await page.locator("#result").textContent());
  const renderer = record.result.renderer ?? "";
  if (/swiftshader|llvmpipe|software|lavapipe/i.test(renderer))
    throw Error(`Hardware requested but software backend: ${renderer}`);
  if (!/NVIDIA|GeForce/i.test(renderer))
    throw Error(`Required NVIDIA renderer not established: ${renderer}`);
  await page.screenshot({
    path: `${out}/wave-formations-gpu-audit.png`,
    fullPage: false,
  });
  if (record.result.status !== "passed")
    throw Error("Formation shader arithmetic audit failed");
  if (errors.length) throw Error("Audit page reported browser errors");
  record.status = "passed";
  console.log(JSON.stringify(record.result, null, 2));
} catch (error) {
  record.status = "failed";
  record.failure = error.stack ?? String(error);
  process.exitCode = 1;
  console.error(record.failure);
} finally {
  if (browser) await browser.close();
  record.finishedUtc = new Date().toISOString();
  await writeFile(reportPath, JSON.stringify(record, null, 2) + "\n");
}
