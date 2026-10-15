import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 960, height: 600 }, reducedMotion: "reduce" });
const boot = async (page: any) => {
  await page.goto("/?dev=1");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
  await page
    .locator("#developer")
    .evaluate((e: HTMLElement) => (e.hidden = true));
};
const enter = async (page: any) => {
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
    {},
    { timeout: 90000 },
  );
};
test("Silent real readiness, one Continue source and Settings-only music controls", async ({
  page,
}) => {
  const errors: string[] = [],
    requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  await boot(page);
  const before = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    return {
      decode: b.decodeRecord(),
      sources: b.transport.sourceEvents.length,
      loading: b.lifecycle().loading,
    };
  });
  expect(before.sources).toBe(0);
  expect(before.loading.realReady).toBe(true);
  expect(before.decode.channels).toBe(2);
  expect(before.decode.hash).toBe(
    "47119d6e77b41e51ef65fb2fc7fa46a2c3f7a75578a650f394b5df78137861a0",
  );
  await enter(page);
  await page.locator("#start").evaluate((b: HTMLButtonElement) => {
    b.click();
    b.click();
  });
  const events = await page.evaluate(() =>
    (window as any).__BUMER__.transport.sourceEvents.filter(
      (e: any) => e.kind === "start",
    ),
  );
  expect(events).toHaveLength(1);
  expect(events[0].offsetSeconds).toBe(0);
  expect(
    await page.locator("#menu-button,#replay,#credits-button,#play").count(),
  ).toBe(0);
  await expect(page.locator("button:visible")).toHaveCount(1);
  await expect(page.locator("button:visible")).toHaveText("Settings");
  expect(requests.some((u) => /\/models\/|\/room\/|\/intro\//.test(u))).toBe(
    false,
  );
  expect(errors).toEqual([]);
});
test("Settings keeps time running; native volume/mute, pause and focus remain usable", async ({
  page,
}) => {
  await boot(page);
  await enter(page);
  await page.locator("#settings-button").press("Enter");
  await expect(page.locator("#pause")).toBeVisible();
  const time = () =>
    page.evaluate(() => (window as any).__BUMER__.transport.position());
  const a = await time();
  await expect.poll(time, { timeout: 30000 }).toBeGreaterThan(a + 0.1);
  await page.locator("#mute").press("Enter");
  await expect(page.locator("#mute")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#volume").fill("35");
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.volumeLevel),
  ).toBe(0.35);
  await page.locator("#pause").press("Enter");
  const frozen = await time();
  await page.waitForTimeout(150);
  expect(await time()).toBe(frozen);
  await page.locator("#pause").press("Enter");
  await expect.poll(time, { timeout: 30000 }).toBeGreaterThan(frozen);
  await page.locator("#settings .pane-close").press("Enter");
  await expect(page.locator("#settings")).not.toBeVisible();
  await expect(page.locator("#settings-button")).toBeFocused();
});
test("Failed bytes remain retryable while graphics prepare; entry interruption never silently starts music", async ({
  page,
}) => {
  let first = true;
  await page.route("**/audio/around-the-world.mp3", async (route) => {
    if (first) {
      first = false;
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/?dev=1");
  await expect(page.locator("#retry")).toBeVisible({ timeout: 30000 });
  await expect(page.locator("#start")).toBeDisabled();
  await page.locator("#retry").press("Enter");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
  await page
    .locator("#start")
    .evaluate((el: HTMLElement) =>
      el.addEventListener(
        "click",
        () => window.dispatchEvent(new Event("blur")),
        { once: true },
      ),
    );
  await page.locator("#start").press("Enter");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 30000 });
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.lifecycle().fieldEntered,
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.position()),
  ).toBe(0);
  await enter(page);
  expect(
    await page.evaluate(
      () =>
        (window as any).__BUMER__.transport.sourceEvents
          .filter((e: any) => e.kind === "start")
          .at(-1).offsetSeconds,
    ),
  ).toBe(0);
});
test("WebGL restore preserves route and frozen music before deliberate resume", async ({
  page,
}) => {
  await boot(page);
  await enter(page);
  await page.evaluate(() => (window as any).__BUMER__.world.loseContext());
  await expect(page.locator("#retry")).toBeVisible({ timeout: 30000 });
  const frozen = await page.evaluate(() =>
    (window as any).__BUMER__.transport.position(),
  );
  await page.locator("#retry").press("Enter");
  await expect(page.locator("#retry")).toBeHidden({ timeout: 120000 });
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.position()),
  ).toBe(frozen);
  await page.locator("#settings-button").press("Enter");
  await page.locator("#pause").press("Enter");
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__BUMER__.transport.position()),
      { timeout: 30000 },
    )
    .toBeGreaterThan(frozen);
});
