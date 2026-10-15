import { test, expect } from "@playwright/test";
import {
  MIN_LOADING_SECONDS,
  READY_REVEAL_SECONDS,
} from "../../core/loading-model.mjs";
test.use({ video: process.env.BUMER_LOADER_RECORD === "1" ? "on" : "off" });

test("loader waits for the minimum and real tasks, stops before Play and enters once", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/analysis/features.json", async (route) => {
    await pending;
    await route.continue();
  });
  await page.addInitScript(() => {
    (window as any).__musicStarts = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      (window as any).__musicStarts++;
      return start.apply(this, args);
    };
  });
  await page.goto("/?dev=1");
  const landing = page.locator("#entrance"),
    spinner = page.locator(".landing-spinner svg");
  await expect(landing).toHaveAttribute("data-phase", "loading");
  await expect(page.locator("#start")).toBeDisabled();
  await expect(page.locator(".landing-rail,.landing-ball")).toHaveCount(0);
  const first = await spinner.evaluate((e) => getComputedStyle(e).transform);
  if (process.env.BUMER_LOADER_INSPECT)
    await page.screenshot({ path: test.info().outputPath("loading.png") });
  await page.waitForTimeout(220);
  expect(await spinner.evaluate((e) => getComputedStyle(e).transform)).not.toBe(
    first,
  );
  expect(await page.evaluate(() => (window as any).__musicStarts)).toBe(0);
  // The developer API is exposed only after all real gates finish. Keep this
  // gate pending beyond the minimum using the visible page's monotonic clock.
  const pendingSince = await page.evaluate(() => performance.now());
  await page.waitForFunction(
    (start) => performance.now() - start >= 3600,
    pendingSince,
  );
  await expect(page.locator("#start")).toBeDisabled();
  await expect(landing).toHaveAttribute("data-spinning", "true");
  release();
  await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
  await page.locator("#developer").evaluate((e: HTMLElement) => {
    e.hidden = true;
  });
  const visibleSeconds = await page.evaluate(
    () => (window as any).__BUMER__.lifecycle().visibleSeconds,
  );
  expect(visibleSeconds).toBeGreaterThanOrEqual(
    MIN_LOADING_SECONDS + READY_REVEAL_SECONDS,
  );
  await expect(landing).toHaveAttribute("data-spinning", "false");
  await expect(landing).toHaveAttribute("aria-busy", "false");
  const stopped = await spinner.evaluate((e) => getComputedStyle(e).transform);
  await page.waitForTimeout(220);
  expect(await spinner.evaluate((e) => getComputedStyle(e).transform)).toBe(
    stopped,
  );
  await expect(page.locator(".landing-invitation")).toHaveCSS("opacity", "1");
  if (process.env.BUMER_LOADER_INSPECT)
    await page.screenshot({ path: test.info().outputPath("ready.png") });
  expect(await page.evaluate(() => (window as any).__musicStarts)).toBe(0);
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
    {},
    { timeout: 60000 },
  );
  expect(await page.evaluate(() => (window as any).__musicStarts)).toBe(1);
  await expect(landing).toBeHidden();
  expect(errors).toEqual([]);
});

test("ready assets still keep Play unavailable for the minimum duration", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?dev=1");
  await page.waitForFunction(
    () => (window as any).__BUMER__?.lifecycle().loading.realReady,
  );
  const first = await page.evaluate(() =>
    (window as any).__BUMER__.lifecycle(),
  );
  if (first.visibleSeconds < MIN_LOADING_SECONDS) {
    await expect(page.locator("#start")).toBeDisabled();
    expect(first.loading.spinning).toBe(true);
  }
  if (
    process.env.BUMER_LOADER_INSPECT &&
    first.visibleSeconds < MIN_LOADING_SECONDS
  )
    await page.screenshot({ path: test.info().outputPath("minimum-hold.png") });
  await expect(page.locator("#start")).toBeEnabled();
  const settled = await page.evaluate(() =>
    (window as any).__BUMER__.lifecycle(),
  );
  console.log(
    "LOADER_MINIMUM_TIMING",
    JSON.stringify({
      firstReadyVisibleSeconds: first.visibleSeconds,
      playEnabledVisibleSeconds: settled.visibleSeconds,
    }),
  );
  if (process.env.BUMER_LOADER_INSPECT)
    await page.screenshot({
      path: test.info().outputPath("minimum-ready.png"),
    });
  expect(settled.visibleSeconds).toBeGreaterThanOrEqual(
    MIN_LOADING_SECONDS + READY_REVEAL_SECONDS,
  );
  expect(
    (
      await page.evaluate(
        () => (window as any).__BUMER__.transport.sourceEvents,
      )
    ).filter((e: any) => e.kind === "start"),
  ).toHaveLength(0);
});

test.describe("primary-touch portrait", () => {
  test.use({ viewport: { width: 360, height: 568 }, hasTouch: true });
  test("reduced motion has a stationary loader and one reachable touch entry", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      document.addEventListener("pointerdown", (e) => {
        if ((e.target as HTMLElement).closest("#start"))
          (window as any).__continuePointer = {
            type: e.pointerType,
            primary: e.isPrimary,
            trusted: e.isTrusted,
          };
      });
    });
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/analysis/features.json", async (route) => {
      await pending;
      await route.continue();
    });
    await page.goto("/?dev=1");
    await expect(page.locator(".landing-spinner svg")).toHaveCSS(
      "animation-name",
      "none",
    );
    await expect(page.locator("#start")).toBeDisabled();
    release();
    await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
    await page.locator("#developer").evaluate((e: HTMLElement) => {
      e.hidden = true;
    });
    const bounds = await page.locator("#start").boundingBox();
    expect(bounds!.y).toBeGreaterThan(0);
    expect(bounds!.y + bounds!.height).toBeLessThan(568);
    await page.locator("#start").focus();
    await expect(page.locator("#start")).toBeFocused();
    await expect(page.locator("#loading-announcement")).toHaveText(
      "Ready. Click to continue.",
    );
    if (process.env.BUMER_LOADER_INSPECT)
      await page.screenshot({
        path: test.info().outputPath("portrait-ready.png"),
      });
    await page.locator("#start").tap();
    await page.waitForFunction(
      () => (window as any).__BUMER__.lifecycle().fieldEntered,
    );
    expect(
      await page.evaluate(() => (window as any).__continuePointer),
    ).toEqual({ type: "touch", primary: true, trusted: true });
    expect(
      await page.evaluate(() =>
        (window as any).__BUMER__.transport.sourceEvents
          .filter((e: any) => e.kind === "start")
          .map((e: any) => e.offsetSeconds),
      ),
    ).toEqual([0]);
    expect(
      await page.evaluate(() => (window as any).__BUMER__.pointer.state.held),
    ).toBe(false);
  });
});

test("a stale first audio response cannot interrupt a successfully retried song", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let audioRequests = 0;
  let releaseFirstAudio!: () => void;
  let firstAudioRequested!: () => void;
  const firstAudioPending = new Promise<void>((resolve) => {
    releaseFirstAudio = resolve;
  });
  const firstAudioSeen = new Promise<void>((resolve) => {
    firstAudioRequested = resolve;
  });
  await page.route("**/audio/around-the-world.mp3", async (route) => {
    if (++audioRequests === 1) {
      firstAudioRequested();
      await firstAudioPending;
    }
    await route.continue();
  });
  let firstAnalysis = true;
  await page.route("**/analysis/features.json", async (route) => {
    if (firstAnalysis) {
      firstAnalysis = false;
      await firstAudioSeen;
      await route.abort();
    } else await route.continue();
  });
  await page.addInitScript(() => {
    (window as any).__audioBodiesRead = 0;
    const read = Response.prototype.arrayBuffer;
    Response.prototype.arrayBuffer = async function () {
      const bytes = await read.call(this);
      if (this.url.endsWith("/audio/around-the-world.mp3"))
        (window as any).__audioBodiesRead++;
      return bytes;
    };
  });
  await page.goto("/?dev=1");
  await expect(page.locator("#retry")).toBeVisible({ timeout: 30000 });
  await expect(page.locator("#entrance")).toHaveAttribute(
    "data-spinning",
    "false",
  );
  await expect(page.locator(".landing-spinner svg")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  await expect(page.locator("#start")).toBeDisabled();
  await page.locator("#retry").press("Enter");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
  await page.locator("#developer").evaluate((e: HTMLElement) => {
    e.hidden = true;
  });
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
  );
  const before = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    (window as any).__retriedBuffer = b.transport.decodedBuffer;
    return {
      position: b.transport.position(),
      sources: b.transport.sourceEvents,
      hash: b.transport.hash,
    };
  });
  releaseFirstAudio();
  // Observe the real stale response body being consumed; no wall-time guess about decoding.
  await page.waitForFunction(() => (window as any).__audioBodiesRead === 2);
  const after = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    return {
      state: b.transport.state,
      sameBuffer: b.transport.decodedBuffer === (window as any).__retriedBuffer,
      position: b.transport.position(),
      sources: b.transport.sourceEvents,
      hash: b.transport.hash,
    };
  });
  console.info("STALE_AUDIO_RESPONSE", JSON.stringify({ before, after }));
  expect(after.state).toBe("playing");
  expect(after.sameBuffer).toBe(true);
  expect(after.sources).toEqual(before.sources);
  expect(after.hash).toBe(before.hash);
  expect(after.position).toBeGreaterThanOrEqual(before.position);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__BUMER__.transport.position()),
    )
    .toBeGreaterThan(after.position);
  expect(errors).toEqual([]);
});

test("an already decoding old attempt cannot replace the retried recording", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    let attempts = 0;
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = async function (bytes) {
      const buffer = await decode.call(this, bytes);
      if (++attempts === 1) {
        (window as any).__firstDecodePending = true;
        await new Promise<void>((resolve) => {
          (window as any).__releaseFirstDecode = resolve;
        });
        (window as any).__firstDecodeReleased = true;
      }
      return buffer;
    };
  });
  let firstAnalysis = true;
  await page.route("**/analysis/features.json", async (route) => {
    if (firstAnalysis) {
      firstAnalysis = false;
      await page.waitForFunction(() => (window as any).__firstDecodePending);
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/?dev=1");
  await expect(page.locator("#retry")).toBeVisible({ timeout: 30000 });
  await page.locator("#retry").press("Enter");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
  await page.locator("#developer").evaluate((e: HTMLElement) => {
    e.hidden = true;
  });
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
  );
  const before = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    (window as any).__retriedBuffer = b.transport.decodedBuffer;
    return {
      position: b.transport.position(),
      sources: b.transport.sourceEvents,
    };
  });
  await page.evaluate(() => (window as any).__releaseFirstDecode());
  await page.waitForFunction(() => (window as any).__firstDecodeReleased);
  const after = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    return {
      state: b.transport.state,
      sameBuffer: b.transport.decodedBuffer === (window as any).__retriedBuffer,
      position: b.transport.position(),
      sources: b.transport.sourceEvents,
    };
  });
  console.info("STALE_IN_PROGRESS_DECODE", JSON.stringify({ before, after }));
  expect(after.state).toBe("playing");
  expect(after.sameBuffer).toBe(true);
  expect(after.sources).toEqual(before.sources);
  expect(after.position).toBeGreaterThanOrEqual(before.position);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__BUMER__.transport.position()),
    )
    .toBeGreaterThan(after.position);
});
