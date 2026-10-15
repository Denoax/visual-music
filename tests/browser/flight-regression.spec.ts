import { test, expect } from "@playwright/test";
const boot = async (page: any) => {
  await page.goto("/?dev=1");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
  await page
    .locator("#developer")
    .evaluate((e: HTMLElement) => (e.hidden = true));
};
const clickControl = async (page: any, id: string) => {
  if (id !== "#settings-button" && !(await page.locator(id).isVisible()))
    await page.locator("#settings-button").press("Enter");
  await page.locator(id).press("Enter");
};
test("Fast reversals and controls preserve the floor and native pointer without a replacement orb", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
  );
  await page.evaluate(() => (window as any).__BUMER__.seek(122));
  for (const [x, y] of [
    [240, 690],
    [1200, 660],
    [400, 720],
    [1000, 80],
    [710, 580],
  ]) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(100);
    const d = await page.evaluate(() =>
      (window as any).__BUMER__.world.diagnostics(),
    );
    expect(d).not.toHaveProperty("cursor");
    expect(d.floor.depthTest).toBe(true);
    expect(d.background).toContain("black zenith");
    expect(d.clearance).toBeGreaterThanOrEqual(3.19);
    expect(
      await page.locator("#world").evaluate((e) => getComputedStyle(e).cursor),
    ).not.toBe("none");
  }
  await page.mouse.move(1280, 855);
  expect(
    await page.locator("#pause").evaluate((e) => getComputedStyle(e).cursor),
  ).not.toBe("none");
  await clickControl(page, "#settings-button");
  await page.locator("#reduced").check();
  await page.locator("#settings .pane-close").click();
  await page.evaluate(() => (window as any).__BUMER__.seek(168));
  let d = await page.evaluate(() =>
    (window as any).__BUMER__.world.diagnostics(),
  );
  expect(d.overview).toBe(0);
  expect(d).not.toHaveProperty("cursor");
  expect(d.floor.nearCaps).toBeLessThanOrEqual(768);
});

test("Secondary touch cancellation does not steal a primary drag; primary cancel resets safely", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 240, y: 450 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 270, y: 490 }],
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__BUMER__.pointer.state.present),
    )
    .toBe(true);
  await page.evaluate(() =>
    document.querySelector("canvas")!.dispatchEvent(
      new PointerEvent("pointercancel", {
        pointerId: 999,
        pointerType: "touch",
        isPrimary: false,
      }),
    ),
  );
  expect(
    await page.evaluate(() => (window as any).__BUMER__.pointer.state.present),
  ).toBe(true);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__BUMER__.pointer.state.present),
    )
    .toBe(false);
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.world.diagnostics().drawingBuffer,
    ),
  ).toEqual([390, 844]);
});

test("Focused keyboard steers the travelled path with all-direction floor, fixed origins and stable world stars", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
  );
  await page.evaluate(() => (window as any).__BUMER__.seek(52));
  await page.locator("#world").focus();
  await page.keyboard.down("KeyD");
  const frames: any[] = [];
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(2600);
    frames.push(
      await page.evaluate(() => {
        const b = (window as any).__BUMER__;
        return { world: b.world.diagnostics(), stars: b.world.audit().stars };
      }),
    );
  }
  await page.keyboard.up("KeyD");
  expect(frames.at(-1).world.heading).toBeGreaterThan(
    frames[0].world.heading + 1.0,
  );
  expect(
    Math.max(...frames.map((f) => Math.abs(f.world.camera[0]))),
  ).toBeGreaterThan(20);
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    expect(f.world.clearance).toBeGreaterThanOrEqual(3.19);
    expect(f.world.stars.count).toBe(1452);
    expect(f.world.flight.originCount).toBeLessThan(24);
    if (i) {
      for (const e of frames[i - 1].world.flight.origins) {
        const live = f.world.flight.origins.find((o: any) => o.id === e.id);
        if (live) expect(live).toEqual(e);
      }
      const previous = new Map(frames[i - 1].stars.map((s: any) => [s.id, s]));
      for (const s of f.stars)
        if (previous.has(s.id))
          expect({ ...s, life: 0 }).toEqual({ ...previous.get(s.id), life: 0 });
    }
  }
  await clickControl(page, "#settings-button");
  await page.locator("#volume").focus();
  await page.keyboard.press("ArrowRight");
  expect(
    await page.evaluate(() => (window as any).__BUMER__.pointer.state.turn),
  ).toBe(0);
});

test("Regressing presentation estimates hold the interactive route rather than resetting it", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
  );
  await page.mouse.move(1100, 550);
  await page.waitForTimeout(1200);
  await clickControl(page, "#pause");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const b = (window as any).__BUMER__;
        return b.world.snapshot().last === b.transport.visualPosition();
      }),
    )
    .toBe(true);
  const result = await page.evaluate(() => {
    const b = (window as any).__BUMER__,
      before = b.world.snapshot();
    b.world.render(
      before.last - 0.04,
      b.pointer.state,
      false,
      b.features,
      false,
    );
    const after = b.world.snapshot();
    return { before, after };
  });
  expect(result.after.flight).toEqual(result.before.flight);
  expect(result.after.last).toBe(result.before.last);
  expect(result.after.floor).toEqual(result.before.floor);
  expect(result.after).not.toHaveProperty("cursor");
  await page.evaluate(() => (window as any).__BUMER__.seek(0));
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.world.snapshot().flight.pose.yaw,
    ),
  ).toBe(-Math.PI / 6);
});
