import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = "evidence/ui-loops/02-glass";
for (const portrait of [false, true])
  for (const mode of ["gpu", "solid", "forced"] as const) {
    test(`glass remains readable and native: ${portrait ? "portrait" : "desktop"} ${mode}`, async ({
      page,
    }) => {
      const view = portrait ? "portrait" : "desktop";
      await page.setViewportSize(
        portrait ? { width: 360, height: 568 } : { width: 1440, height: 900 },
      );
      await page.emulateMedia({
        reducedMotion: portrait ? "reduce" : "no-preference",
        forcedColors: mode === "forced" ? "active" : "none",
      });
      if (mode === "solid") {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setEmulatedMedia", {
          features: [
            { name: "prefers-reduced-transparency", value: "reduce" },
            {
              name: "prefers-reduced-motion",
              value: portrait ? "reduce" : "no-preference",
            },
          ],
        });
      }
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/?dev=1");
      await expect(page.locator("#start")).toBeEnabled({ timeout: 120000 });
      await page.locator("#developer").evaluate((e) => (e.hidden = true));
      await expect(page.locator("#settings-button")).toHaveCSS("opacity", "1");
      await expect(page.locator(".landing-invitation")).toHaveCSS("opacity", "1");
      const expectedMode = mode === "gpu" ? "gpu" : "solid";
      await expect(page.locator("#start")).toHaveAttribute(
        "data-glass-mode",
        expectedMode,
      );
      const record = await page.evaluate(() => {
        const b = (window as any).__BUMER__;
        return {
          renderer: b.world.diagnostics().renderer,
          glass: b.world.diagnostics().startGlass,
          transparency: matchMedia("(prefers-reduced-transparency: reduce)")
            .matches,
          forcedColors: matchMedia("(forced-colors: active)").matches,
          buttons: ["start", "settings-button"].map((id) => {
            const e = document.getElementById(id)!;
            const s = getComputedStyle(e);
            const r = e.getBoundingClientRect();
            return {
              id,
              bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
              background: s.backgroundColor,
              text: s.color,
              backdrop: s.backdropFilter,
            };
          }),
        };
      });
      if (mode === "solid") {
        expect(record.transparency).toBe(true);
        expect(record.buttons[0].background).toBe("rgb(21, 21, 21)");
        expect(record.buttons[0].backdrop).toBe("none");
      }
      if (mode === "forced") expect(record.forcedColors).toBe(true);
      await mkdir(out, { recursive: true });
      await page.screenshot({ path: `${out}/${view}-${mode}.png` });
      const play = page.locator("#start");
      const before = (await play.boundingBox())!;
      await play.focus();
      await expect(play).toBeFocused();
      expect(
        await play.evaluate((e) => getComputedStyle(e).outlineStyle),
      ).not.toBe("none");
      await play.hover();
      await page.mouse.down();
      await expect
        .poll(async () => (await play.boundingBox())!.width)
        .toBeLessThan(before.width);
      await page.mouse.up();
      await page.waitForFunction(
        () => (window as any).__BUMER__.lifecycle().fieldEntered,
      );
      expect(
        await page.evaluate(() =>
          (window as any).__BUMER__.transport.sourceEvents
            .filter((e: any) => e.kind === "start")
            .map((e: any) => e.offsetSeconds),
        ),
      ).toEqual([0]);
      await page.locator("#settings-button").press("Enter");
      await expect(page.locator("#settings")).toBeVisible();
      const t = await page.evaluate(() =>
        (window as any).__BUMER__.transport.position(),
      );
      await expect
        .poll(() =>
          page.evaluate(() => (window as any).__BUMER__.transport.position()),
        )
        .toBeGreaterThan(t);
      await page.locator("#settings .pane-close").press("Enter");
      await expect(page.locator("#settings-button")).toBeFocused();
      expect(errors).toEqual([]);
      await writeFile(
        `${out}/${view}-${mode}.json`,
        JSON.stringify(
          { ...record, errors, nativeFocusPressAndSettings: "passed" },
          null,
          2,
        ) + "\n",
      );
    });
  }
