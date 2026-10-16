import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 960, height: 600 }, reducedMotion: "reduce" });
test("Presented completion fades to thank you; no ambient loop, confetti or automatic replay under reduced motion", async ({
  page,
}) => {
  await page.goto("/?dev=1");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
  await page.locator("#start").press("Enter");
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().fieldEntered,
  );
  await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    b.seek(b.transport.duration - 0.08);
  });
  await expect(page.locator("#thank-you")).toBeVisible({ timeout: 45000 });
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().finish.pageGain === 1,
    {},
    { timeout: 30000 },
  );
  const sources = await page.evaluate(
    () => (window as any).__BUMER__.transport.sourceEvents.length,
  );
  await page.waitForFunction(
    () => (window as any).__BUMER__.lifecycle().raf === 0,
    {},
    { timeout: 30000 },
  );
  expect(await page.locator("button:visible").count()).toBe(0);
  expect(await page.locator(".thank-you-confetti").count()).toBe(0);
  await expect(page.locator("#thank-you")).toBeFocused();
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.transport.sourceEvents.length,
    ),
  ).toBe(sources);
  const end = await page.evaluate(
    () => (window as any).__BUMER__.transport.completionEvents,
  );
  expect(end.map((e: any) => e.kind)).toEqual(["graph_end", "presented_end"]);
  const scheduledEnd=await page.evaluate(()=>{const b=(window as any).__BUMER__,s=b.transport.sourceEvents.filter((e:any)=>e.kind==='start').at(-1);return s.contextSeconds+b.transport.duration-s.offsetSeconds;});
  expect(end[1].contextSeconds).toBeGreaterThanOrEqual(end[0].contextSeconds);
  expect(end[1].presentedContextSeconds).toBeGreaterThanOrEqual(scheduledEnd);
});
