import { test, expect } from "@playwright/test";
test("projected families remain world anchored, bounded and recoverable during sharp steering", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?dev=1");
  await page.waitForSelector("#start:not([disabled])");
  await page.locator("#start").click();
  const result = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    b.transport.pause();
    b.seek(0);
    const registry = new Map(),
      rows = [];
    let maximum = 0;
    for (let t = 0.2; t < 219; t += 0.2) {
      const turn = t % 12 < 3 ? 0.75 : t % 12 < 6 ? -0.75 : 0;
      const input = {
        x: turn,
        tilt: t % 20 < 5 ? 0.6 : t % 20 < 10 ? -0.6 : 0,
        held: t % 18 > 13,
      };
      b.world.render(t, input, false, b.features, false, null, 1.4);
      const w = b.world.diagnostics(),
        l = w.landscapes;
      maximum = Math.max(maximum, l.active.length);
      if (
        l.floorMasks.some((mask: any) => mask.parameters[1] > 0.75 + 1e-6) ||
        l.activeGain > 1 + 1e-6
      )
        throw Error("Visibility/dim exceeds normalized bound at140% exposure");
      if (l.active.length > l.familyLimit)
        throw Error("Exceeded family budget");
      for (const p of l.scheduled.filter(Boolean)) {
        const old = registry.get(p.id);
        if (old && JSON.stringify(old) !== JSON.stringify(p))
          throw Error("Anchor moved");
        registry.set(p.id, p);
      }
      for (const p of l.active) {
        if (
          Math.hypot(p.anchor.x - w.camera[0], p.anchor.z - w.camera[2]) -
            p.anchor.radius <
          38 - 1e-6
        )
          throw Error("Near support violation");
        if (p.lod < 0 || p.lod > 1) throw Error("LOD gain");
      }
      if (Math.abs(t - 64) < 0.1 || Math.abs(t - 99) < 0.1) rows.push(l);
    }
    b.world.reset(28);
    b.world.render(28, { x: 0 }, false, b.features);
    b.world.render(30, { x: 0 }, false, b.features);
    const saved = b.world.snapshot(),
      before = b.world.diagnostics().landscapes.scheduled;
    b.world.reset();
    b.world.restore(saved);
    b.world.render(30, { x: 0 }, false, b.features);
    const after = b.world.diagnostics().landscapes.scheduled;
    b.world.reset();
    const reset = b.world.diagnostics().landscapes.scheduled;
    return { count: registry.size, maximum, rows, before, after, reset };
  });
  expect(result.count).toBeGreaterThan(15);
  expect(result.maximum).toBeLessThanOrEqual(4);
  expect(result.after).toEqual(result.before);
  expect(result.reset.every((x: any) => x === null)).toBe(true);
  expect(errors).toEqual([]);
});
