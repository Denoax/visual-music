import { test, expect } from "@playwright/test";
test("reduced-motion idle stays pixel-static through a fresh current-clock render", async ({
  page,
}) => {
  await page.goto("/?dev=1");
  await page.waitForSelector("#start:not([disabled])");
  await page.locator("#settings-button").click();
  await page.locator("#reduced").check();
  await page.locator("#settings .settings-close").click();
  await page.locator("#start").click();
  await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    b.seek(b.transport.duration - 0.04);
  });
  await page.waitForFunction(
    () => (window as any).__BUMER__.transport.presentationEndAge >= 8,
  );
  async function frame() {
    await page.evaluate(() => {
      const b = (window as any).__BUMER__;
      b.world.render(
        b.transport.visualPosition(),
        { x: 0 },
        true,
        b.features,
        false,
        b.transport.presentationEndAge,
        1,
      );
    });
    return page.locator("#world").screenshot();
  }
  const before = await frame();
  await page.waitForTimeout(220);
  const after = await frame();
  expect(after.equals(before)).toBe(true);
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.world.diagnostics().visual.phase,
    ),
  ).toBe("idle");
});
test("natural return and idle pause, graphics recovery and Replay preserve the sole audio owner", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?dev=1");
  await page.waitForSelector("#start:not([disabled])");
  await page.locator("#start").click();
  await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    b.seek(b.transport.duration - 0.04);
  });
  await page.waitForFunction(
    () => (window as any).__BUMER__.transport.presentationEndAge >= 8,
  );
  await page.locator("#play").click();
  await expect(page.locator("#play")).toHaveText("Resume");
  const a = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    return {
      age: b.transport.presentationEndAge,
      pose: b.world.diagnostics().camera,
      sources: b.transport.sourceEvents.filter((e: any) => e.kind === "start")
        .length,
    };
  });
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.transport.presentationEndAge,
    ),
  ).toBe(a.age);
  await page.evaluate(() => (window as any).__BUMER__.world.loseContext());
  await expect(page.locator("#retry")).toBeVisible();
  await page.locator("#retry").click();
  await expect(page.locator("#retry")).toBeHidden();
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.transport.presentationEndAge,
    ),
  ).toBe(a.age);
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.world.diagnostics().camera,
    ),
  ).toEqual(a.pose);
  await page.locator("#play").click();
  await page.waitForTimeout(160);
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.transport.presentationEndAge,
    ),
  ).toBeGreaterThan(a.age);
  expect(
    await page.evaluate(
      () =>
        (window as any).__BUMER__.transport.sourceEvents.filter(
          (e: any) => e.kind === "start",
        ).length,
    ),
  ).toBe(a.sources);
  await page.locator("#replay").click();
  await expect(page.locator("#start")).toBeVisible();
  await page.locator("#start").click();
  expect(
    await page.evaluate(() =>
      (window as any).__BUMER__.transport.visualPosition(),
    ),
  ).toBeLessThan(0.3);
  expect(errors).toEqual([]);
});
