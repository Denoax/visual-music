import { test, expect } from "@playwright/test";
test("Real M1 ramps gently sooner, releases, cancels capture and cannot latch through Settings", async ({
  page,
}) => {
  await page.goto("/?dev=1");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
  await page.locator("#developer").evaluate((e) => (e.hidden = true));
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
  );
  await page.evaluate(() => (window as any).__BUMER__.seek(84));
  await page.mouse.move(720, 450);
  const snapshot = () =>
    page.evaluate(() => (window as any).__BUMER__.world.snapshot().flight);
  await page.mouse.down();
  await page.waitForTimeout(120);
  const held = await snapshot(),
    edge = held.history.findLast((e: any) => e.input.held);
  expect(held.input.held).toBe(true);
  expect(held.state.turbo).toBeGreaterThan(1.02);
  expect(held.state.turbo).toBeLessThanOrEqual(2);
  const expected =
    2 -
    Math.exp(
      -(held.state.seconds - Math.floor(edge.seconds * 240 + 1e-8) / 240) /
        0.45,
    );
  expect(Math.abs(held.state.turbo - expected)).toBeLessThan(0.003);
  await page.mouse.up();
  await page.waitForTimeout(220);
  const released = await snapshot();
  expect(released.input.held).toBe(false);
  expect(released.state.turbo).toBeLessThan(held.state.turbo);
  await page
    .locator("#world")
    .evaluate((c) =>
      c.addEventListener(
        "pointerdown",
        (e: any) => ((window as any).__testPointer = e.pointerId),
        { once: true },
      ),
    );
  await page.mouse.down();
  // Pointer capture changes are processed before the next native pointer
  // event; make capture current before testing a genuine release/lost event.
  await page.mouse.move(722, 450);
  await page
    .locator("#world")
    .evaluate((c: any) =>
      c.releasePointerCapture((window as any).__testPointer),
    );
  await page.mouse.move(724, 450);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__BUMER__.pointer.state.held),
    )
    .toBe(false);
  await page.mouse.up();
  await page.locator("#settings-button").press("Enter");
  expect(
    await page.evaluate(() => (window as any).__BUMER__.pointer.state.held),
  ).toBe(false);
  await page.locator("#settings .pane-close").press("Enter");
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__BUMER__.pointer.state.held),
    )
    .toBe(false);
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.state),
  ).toBe("paused");
  await page.mouse.up();
});
