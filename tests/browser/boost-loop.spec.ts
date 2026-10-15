import { test, expect } from "@playwright/test";
const enter = async (page: any) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?dev=1");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
  await page
    .locator("#developer")
    .evaluate((e: HTMLElement) => (e.hidden = true));
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
  );
  await page.evaluate(() => (window as any).__BUMER__.seek(84));
  await page.mouse.move(720, 450);
};
const held = (page: any) =>
  page.evaluate(() => (window as any).__BUMER__.pointer.state.held);
test("Canvas mouse chords engage and release M1 independently of other buttons", async ({
  page,
}) => {
  await enter(page);
  await page.evaluate(() => {
    (window as any).__chordEvents = [];
    for (const kind of ["pointerdown", "pointermove", "pointerup"])
      document.querySelector("#world")!.addEventListener(kind, (e: any) =>
        (window as any).__chordEvents.push({
          type: e.type,
          pointerId: e.pointerId,
          button: e.button,
          buttons: e.buttons,
          trusted: e.isTrusted,
          target: e.target.id,
        }),
      );
  });
  await page.mouse.down({ button: "right" });
  expect(await held(page)).toBe(false);
  await page.mouse.down({ button: "left" });
  await expect.poll(() => held(page)).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__BUMER__.world.diagnostics().flight.held,
      ),
    )
    .toBe(true);
  await page.mouse.up({ button: "left" });
  await expect.poll(() => held(page)).toBe(false);
  await page.mouse.up({ button: "right" });
  await page.mouse.down({ button: "left" });
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "left" });
  await expect.poll(() => held(page)).toBe(false);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__BUMER__.world.diagnostics().flight.held,
      ),
    )
    .toBe(false);
  await page.mouse.up({ button: "right" });
  // Losing a right-only capture invalidates the whole gesture, even before M1.
  await page.mouse.down({ button: "right" });
  await page.mouse.move(722, 450);
  await page.locator("#world").evaluate((canvas: any) => {
    const events = (window as any).__chordEvents;
    canvas.releasePointerCapture(
      events.findLast((e: any) => e.type === "pointerdown").pointerId,
    );
  });
  await page.mouse.move(724, 450);
  await page.mouse.down({ button: "left" });
  expect(await held(page)).toBe(false);
  await page.mouse.up({ button: "left" });
  await page.mouse.up({ button: "right" });
  await page.mouse.move(720, 450);
  await page.mouse.down();
  expect(await held(page)).toBe(true);
  await page.mouse.up();
  // An unrelated button press that moves onto the canvas is not a flight gesture.
  const settings = (await page.locator("#settings-button").boundingBox())!;
  await page.mouse.move(
    settings.x + settings.width / 2,
    settings.y + settings.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(720, 450);
  expect(await held(page)).toBe(false);
  await page.mouse.up();
  const events = await page.evaluate(() => (window as any).__chordEvents);
  expect(
    events.some(
      (e: any) =>
        e.type === "pointermove" &&
        e.button === 0 &&
        e.buttons === 3 &&
        e.trusted &&
        e.target === "world",
    ),
  ).toBe(true);
  expect(
    events.some(
      (e: any) =>
        e.type === "pointermove" &&
        e.button === 0 &&
        e.buttons === 2 &&
        e.trusted &&
        e.target === "world",
    ),
  ).toBe(true);
});

test("Paused and reduced-motion holds stay stationary and cannot latch through recovery", async ({
  page,
}) => {
  await enter(page);
  await page.locator("#world").press("Space");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const frozen = await page.evaluate(
    () => (window as any).__BUMER__.world.diagnostics().camera,
  );
  await page.mouse.down();
  expect(await held(page)).toBe(false);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.world.diagnostics().camera,
    ),
  ).toEqual(frozen);
  await page.locator("#world").press("Space");
  expect(await held(page)).toBe(false);
  await page.mouse.up();
  await page.locator("#settings-button").press("Enter");
  await page.locator("#reduced").check();
  await page.locator("#settings .pane-close").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.world.diagnostics().reducedOrigin !== null,
  );
  const start = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    return {
      t: b.transport.presentation().seconds,
      camera: b.world.diagnostics().camera,
    };
  });
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.waitForFunction(
    (t) => (window as any).__BUMER__.transport.presentation().seconds > t + 0.2,
    start.t,
  );
  const reduced = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    return {
      camera: b.world.diagnostics().camera,
      turbo: b.world.snapshot().flight.state.turbo,
    };
  });
  expect(reduced.camera).toEqual(start.camera);
  expect(reduced.turbo).toBe(1);
  await page.mouse.up();
  await page.locator("#settings-button").press("Enter");
  await page.locator("#reduced").uncheck();
  await page.locator("#settings .pane-close").press("Enter");
  expect(await held(page)).toBe(false);
  expect(frozen.every(Number.isFinite)).toBe(true);
});

test("held left click produces twice the normal rendered travel and releases smoothly", async ({
  page,
}) => {
  await enter(page);
  const sample = () =>
    page.evaluate(() => {
      const b = (window as any).__BUMER__,
        s = b.world.snapshot();
      return {
        seconds: s.last,
        camera: b.world.diagnostics().camera,
        turbo: s.flight.state.turbo,
      };
    });
  const waitAfter = (t: number, duration: number) =>
    page.waitForFunction(
      ({ t, duration }) =>
        (window as any).__BUMER__.world.snapshot().last >= t + duration,
      { t, duration },
    );
  const speed = (a: any, b: any) =>
    Math.hypot(b.camera[0] - a.camera[0], b.camera[2] - a.camera[2]) /
    (b.seconds - a.seconds);
  const baseStart = await sample();
  await waitAfter(baseStart.seconds, 0.4);
  const baseEnd = await sample();
  await page.mouse.down();
  await waitAfter(baseEnd.seconds, 1.4);
  const boostedStart = await sample();
  await waitAfter(boostedStart.seconds, 0.4);
  const boostedEnd = await sample();
  expect(await held(page)).toBe(true);
  expect(speed(baseStart, baseEnd)).toBeCloseTo(27.84375, 2);
  expect(
    speed(boostedStart, boostedEnd) / speed(baseStart, baseEnd),
  ).toBeGreaterThan(1.9);
  expect(boostedEnd.turbo).toBeLessThanOrEqual(2);
  await page.mouse.up();
  const release = await sample();
  await waitAfter(release.seconds, 2.6);
  const settled = await sample();
  expect(await held(page)).toBe(false);
  expect(settled.turbo).toBeLessThan(1.06);
  expect(settled.turbo).toBeGreaterThan(1);
});
