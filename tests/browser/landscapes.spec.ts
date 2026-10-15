import { test, expect } from "@playwright/test";

test("Former scenery chapters stay floor-only through steering, restore and replay", async ({
  page,
}) => {
  const errors: string[] = [],
    models: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    if (/\/models\/|\.(glb|gltf)(?:\?|$)/i.test(request.url()))
      models.push(request.url());
  });
  await page.goto("/?dev=1");
  await page.waitForSelector("#start:not([disabled])");
  await page.locator("#start").click();
  const rows = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    b.transport.pause();
    b.world.reset();
    const samples = [];
    for (const t of [28, 64, 78, 99, 131, 145, 173, 198, 210]) {
      b.world.render(t, { x: 0.6, tilt: -0.3, held: true }, false, b.features);
      const before = b.world.snapshot();
      b.world.reset();
      b.world.restore(before);
      b.world.render(t, { x: 0.6, tilt: -0.3, held: true }, false, b.features);
      samples.push({
        t,
        before,
        after: b.world.snapshot(),
        world: b.world.diagnostics(),
        lightInputs: b.world.audit().lights,
      });
    }
    b.world.reset();
    b.world.render(0, { x: 0 }, false, b.features);
    samples.push({
      t: 0,
      before: b.world.snapshot(),
      after: b.world.snapshot(),
      world: b.world.diagnostics(),
      lightInputs: b.world.audit().lights,
    });
    return samples;
  });
  for (const row of rows) {
    expect(row.before).toEqual(row.after);
    expect(row.world).not.toHaveProperty("actors");
    expect(row.world).not.toHaveProperty("landscapes");
    expect(row.before).not.toHaveProperty("actors");
    expect(row.before).not.toHaveProperty("landscapes");
    expect(row.lightInputs.borrow).toEqual([0, 0, 0, 0]);
    expect(
      row.lightInputs.structureParameters.every((p: number[]) =>
        p.every((x) => x === 0),
      ),
    ).toBe(true);
  }
  expect(models).toEqual([]);
  expect(errors).toEqual([]);
});
