import { test, expect, type Page } from "@playwright/test";
const ready = async (page: Page) => {
  await page.goto("/?dev=1");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 45000 });
};
test("bundled song starts with one gesture, pauses, seeks and resumes without phase loss", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__createdAudioSources = 0;
    const original = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      (window as any).__createdAudioSources++;
      return original.call(this);
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await ready(page);
  await expect(page.locator("#audio-file")).toBeHidden();
  await expect(page.locator("#start-label")).toHaveText("Play");
  const initial = await page.evaluate(() => {
    const t = (window as any).__BUMER__.transport;
    return {
      state: t.state,
      hash: t.hash,
      duration: t.duration,
      context: t.audioContext.state,
      sources: (window as any).__createdAudioSources,
    };
  });
  expect(initial.state).toBe("ready");
  expect(initial.hash).toBe(
    "67d55f6e9551e77002fecb2752b835761da84a5db2a7679e91599e4dc94c2780",
  );
  expect(initial.duration).toBeCloseTo(244.297, 2);
  // Browser autoplay policy can run an empty graph; no source may start before Play.
  expect(initial.sources).toBe(0);
  await page.locator("#start").click();
  await expect(page.locator("#play")).toHaveAttribute("aria-label", "Pause");
  expect(await page.evaluate(() => (window as any).__createdAudioSources)).toBe(
    1,
  );
  await page.waitForFunction(
    () => (window as any).__BUMER__.transport.position() > 0.3,
  );
  await page.locator("#play").click();
  const paused = await page.evaluate(() =>
    (window as any).__BUMER__.transport.position(),
  );
  await page.evaluate(() => (window as any).__BUMER__.seek(211));
  await page.waitForFunction(
    () => (window as any).__BUMER__.getFrame()?.seconds === 211,
  );
  const direct = await page.evaluate(() =>
    (window as any).__BUMER__.getFrame(),
  );
  expect(direct.release).toBeGreaterThan(0.9);
  await page.locator("#play").click();
  await page.waitForFunction(
    () => (window as any).__BUMER__.transport.position() > 211.2,
  );
  await page.locator("#play").click();
  await page.locator("#volume").fill("0.3");
  await page.locator("#mute").click();
  await expect(page.locator("#mute")).toHaveAttribute("aria-pressed", "true");
  expect(paused).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test("failed audio offers retry and rejects a different file before it becomes playable", async ({
  page,
}) => {
  await page.route("**/audio/chernyy-bumer.mp3", (r) => r.abort());
  await page.goto("/?dev=1");
  await expect(page.locator("#recovery")).toBeVisible();
  await expect(page.locator("#start")).toBeDisabled();
  await page.locator("#audio-file").setInputFiles({
    name: "wrong.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("wrong bytes"),
  });
  await expect(page.locator("#recovery-message")).toContainText(
    "does not match",
  );
  await page.unroute("**/audio/chernyy-bumer.mp3");
  await page.locator("#retry-audio").click();
  await expect(page.locator("#start")).toBeEnabled({ timeout: 45000 });
  await expect(page.locator("#recovery")).toBeHidden();
});
test("context loss pauses audio and restore preserves the loaded song and position", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#start").click();
  await page.waitForFunction(
    () => (window as any).__BUMER__.transport.position() > 0.2,
  );
  await page.evaluate(() => {
    const w = (window as any).__BUMER__.world();
    w.renderer.getContext().getExtension("WEBGL_lose_context").loseContext();
  });
  await expect(page.locator("#recovery")).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.state),
  ).toBe("paused");
  const offset = await page.evaluate(() =>
    (window as any).__BUMER__.transport.position(),
  );
  await page.locator("#retry-scene").click();
  await expect(page.locator("#recovery")).toBeHidden({ timeout: 45000 });
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.position()),
  ).toBe(offset);
  await expect(page.locator("#play")).toBeEnabled();
});
test("portrait, gentle motion, keyboard controls and actual ending remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(page.locator("#quality")).toHaveValue("low");
  await page.locator("#start").click();
  await page.waitForFunction(
    () => (window as any).__BUMER__.transport.position() > 0.2,
  );
  await page.locator("#world").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#play")).toHaveAttribute("aria-label", "Play");
  await page.locator("#settings-button").click();
  await page.locator("#reduced").check();
  await page.locator(".close").click();
  await page.evaluate(() => (window as any).__BUMER__.seek(43));
  await page.waitForFunction(
    () => (window as any).__BUMER__.getFrame()?.seconds === 43,
  );
  const a = await page.evaluate(
    () => (window as any).__BUMER__.getFrame().position,
  );
  await page.evaluate(() => (window as any).__BUMER__.seek(211));
  await page.waitForFunction(
    () => (window as any).__BUMER__.getFrame()?.seconds === 211,
  );
  expect(
    await page.evaluate(() => (window as any).__BUMER__.getFrame().position),
  ).toEqual(a);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.evaluate(() => {
    const t = (window as any).__BUMER__.transport;
    (window as any).__BUMER__.seek(t.duration - 0.2);
  });
  await page.locator("#play").click();
  await expect(page.locator("#ending")).toBeVisible({ timeout: 10000 });
  await page.locator("#replay").click();
  await expect(page.locator("#play")).toHaveAttribute("aria-label", "Pause");
});
test("visibility and suspended-context recovery never keep a source running", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#start").click();
  await page.waitForFunction(
    () => (window as any).__BUMER__.transport.position() > 0.2,
  );
  await page.evaluate(async () => {
    await (window as any).__BUMER__.transport.audioContext.suspend();
  });
  await expect(page.locator("#play")).toHaveAttribute("aria-label", "Play");
  await page.locator("#play").click();
  await expect(page.locator("#play")).toHaveAttribute("aria-label", "Pause");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#play")).toHaveAttribute("aria-label", "Play");
});
test("renderer failure retains bundled audio and meaningful recovery controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const native = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes("webgl")) return null;
      return native.apply(this, [type, ...args] as any);
    } as any;
  });
  await ready(page);
  await expect(page.locator("#recovery")).toBeVisible();
  await expect(page.locator("#recovery-message")).toContainText(
    "Audio and playback",
  );
  await page.locator("#start").click();
  await expect(page.locator("#play")).toHaveAttribute("aria-label", "Pause");
  await page.waitForFunction(
    () => (window as any).__BUMER__.transport.position() > 0.2,
  );
  await page.locator("#play").click();
  await page.evaluate(() => (window as any).__BUMER__.seek(73));
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.position()),
  ).toBe(73);
});
test("visible sculptures accept a bounded burst without changing the recording clock", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => (window as any).__BUMER__.seek(25));
  await page.locator("#start").click();
  await page.waitForFunction(
    () => (window as any).__BUMER__.getFrame()?.seconds > 25,
  );
  const hit = await page.evaluate(() => {
    const api = (window as any).__BUMER__,
      frame = api.getFrame(),
      world = api.world();
    for (const x of [-0.8, -0.5, -0.2, 0.2, 0.5, 0.8])
      for (const y of [-0.6, -0.3, 0, 0.3])
        if (world.tap(x, y, frame))
          return { x, y, position: api.transport.position() };
    return null;
  });
  expect(hit).not.toBeNull();
  await page.mouse.click((hit!.x + 1) * 720, (1 - hit!.y) * 450);
  const position = await page.evaluate(() =>
    (window as any).__BUMER__.transport.position(),
  );
  expect(position).toBeGreaterThanOrEqual(hit!.position);
  expect(position - hit!.position).toBeLessThan(1);
});
