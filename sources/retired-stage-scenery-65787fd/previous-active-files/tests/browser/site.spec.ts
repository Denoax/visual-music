import { test, expect } from "@playwright/test";
const boot = async (page: any) => {
  await page.goto("/?dev=1");
  await expect(page.locator("#start")).toBeEnabled({ timeout: 45000 });
  await page
    .locator("#developer")
    .evaluate((e: HTMLElement) => (e.hidden = true));
};
const clickControl = async (page: any, id: string) => {
  if (!(await page.locator(id).isVisible()))
    await page.locator("#menu-button").click();
  await page.locator(id).click();
};
test("Direct entry preloads the four retrowave mountains and retained fin and starts one exact source at zero", async ({
  page,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await boot(page);
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.transport.sourceEvents.length,
    ),
  ).toBe(0);
  await page.evaluate(() => {
    const b = document.querySelector<HTMLButtonElement>("#start")!;
    b.click();
    b.click();
  });
  await expect(page.locator("#play")).toHaveText("Pause");
  const result = await page.evaluate(() => ({
    decode: (window as any).__BUMER__.decodeRecord(),
    events: (window as any).__BUMER__.transport.sourceEvents,
    world: (window as any).__BUMER__.world.diagnostics(),
  }));
  expect(result.decode.hash).toBe(
    "47119d6e77b41e51ef65fb2fc7fa46a2c3f7a75578a650f394b5df78137861a0",
  );
  expect(result.decode.channels).toBe(2);
  expect(result.decode.duration).toBeGreaterThan(219.6);
  expect(result.events.filter((e: any) => e.kind === "start")).toHaveLength(1);
  expect(result.events[0].offsetSeconds).toBe(0);
  expect(result.world.horizon.gain).toBe(0);
  expect(result.world.groundVisible).toBe(false);
  expect(result.world.cameraLens).toBe(25);
  expect(
    requests.some((u) =>
      /\/models\/(?!landscapes\/)|\/room\/|\/intro\/|mtc|link-start/.test(u),
    ),
  ).toBe(false);
  expect(
    requests.filter((u) => /\/models\/landscapes\/.*\.glb$/.test(u)),
  ).toHaveLength(5);
  expect(errors).toEqual([]);
});
test("Pause freezes fronts, route and music; resume and replay remain coherent", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
  await page.evaluate(() => (window as any).__BUMER__.seek(83));
  await clickControl(page, "#play");
  const snapshot = () =>
    page.evaluate(() => {
      const b = (window as any).__BUMER__;
      return { t: b.transport.position(), world: b.world.diagnostics() };
    });
  await expect
    .poll(async () => (await snapshot()).world.section)
    .toBe("wave_04");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const b = (window as any).__BUMER__;
        return b.world.snapshot().last === b.transport.visualPosition();
      }),
    )
    .toBe(true);
  const a = await snapshot();
  await page.waitForTimeout(300);
  const b = await snapshot();
  expect(b).toEqual(a);
  await clickControl(page, "#play");
  await expect.poll(async () => (await snapshot()).t).toBeGreaterThan(a.t);
  await clickControl(page, "#replay");
  await expect(page.locator("#start")).toBeVisible();
  await expect.poll(async () => (await snapshot()).world.coverage).toBe(0);
  expect((await snapshot()).t).toBe(0);
});
test("Volume, mute and reduced motion retain musical response with a stationary route", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
  await clickControl(page, "#settings-button");
  await page.locator("#mute").click();
  await expect(page.locator("#mute")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#volume").fill("35");
  await page.locator("#reduced").check();
  await page.locator("#settings .pane-close").click();
  const read = () =>
    page.evaluate(() => {
      const b = (window as any).__BUMER__;
      return {
        camera: b.world.diagnostics().camera,
        t: b.transport.position(),
        mute: b.transport.isMuted,
        volume: b.transport.volumeLevel,
      };
    });
  const a = await read();
  await page.waitForTimeout(300);
  const b = await read();
  expect(b.t).toBeGreaterThan(a.t);
  expect(b.camera[0]).toBe(a.camera[0]);
  expect(b.camera[2]).toBe(a.camera[2]);
  expect(b.mute).toBe(true);
  expect(b.volume).toBe(0.35);
});
test("Audio suspension and WebGL loss pause safely; restore needs deliberate resume", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
  await page.evaluate(() =>
    (window as any).__BUMER__.transport.audioContext.suspend(),
  );
  await expect(page.locator("#play")).toHaveText("Resume");
  await clickControl(page, "#play");
  await page.evaluate(() => (window as any).__BUMER__.world.loseContext());
  await expect(page.locator("#status")).toContainText("Graphics interrupted");
  await page.locator("#retry").click();
  await expect(page.locator("#play")).toBeEnabled({ timeout: 20000 });
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.state),
  ).toBe("paused");
  await clickControl(page, "#play");
  await expect(page.locator("#play")).toHaveText("Pause");
});
test("Portrait touch turns the path; held click accelerates; ended replay resets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await page.locator("#start").click();
  await page.evaluate(() => (window as any).__BUMER__.seek(28));
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 360, y: 430 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 370, y: 430 }],
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs((window as any).__BUMER__.world.diagnostics().camera[0]),
      ),
    )
    .toBeGreaterThan(0.1);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.mouse.move(340, 430);
  await page.mouse.down();
  const before = await page.evaluate(() =>
    (window as any).__BUMER__.world.snapshot(),
  );
  await page.waitForTimeout(250);
  const held = await page.evaluate(() =>
    (window as any).__BUMER__.world.snapshot(),
  );
  const travelled =
    Math.hypot(held.x - before.x, held.z - before.z) /
    (held.last - before.last);
  expect(travelled).toBeGreaterThan(40);
  expect(travelled).toBeLessThanOrEqual(260);
  expect(held.flight.pose.turbo).toBeGreaterThan(before.flight.pose.turbo);
  expect(held.flight.pose.yaw).not.toBe(before.flight.pose.yaw);
  await page.mouse.up();

  await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    b.seek(b.transport.duration - 0.04);
  });
  await expect(page.locator("#play")).toHaveText("Pause");
  await clickControl(page, "#replay");
  await expect(page.locator("#start")).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.position()),
  ).toBe(0);
});
test("Corrupt music blocks Start and a retry recovers the exact asset", async ({
  page,
}) => {
  await page.route("**/audio/around-the-world.mp3", (r) =>
    r.fulfill({ body: "corrupt", contentType: "audio/mpeg" }),
  );
  await page.goto("/?dev=1");
  await expect(page.locator("#status")).toContainText("does not match");
  await expect(page.locator("#start")).toBeDisabled();
  await page.unroute("**/audio/around-the-world.mp3");
  await page.locator("#retry").click();
  await expect(page.locator("#start")).toBeEnabled({ timeout: 45000 });
});

test("Global floor lighting, native pointer and camera projection survive pause, scored camera restore and replay", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
  await page.evaluate(() => (window as any).__BUMER__.seek(168));
  await page.mouse.move(790, 620);
  await page.waitForTimeout(250);
  await clickControl(page, "#play");
  const read = () =>
    page.evaluate(() => {
      let b = (window as any).__BUMER__;
      return {
        world: b.world.diagnostics(),
        saved: b.world.snapshot(),
        audit: b.world.audit(),
      };
    });
  await expect
    .poll(async () => (await read()).world.drawingBuffer)
    .toEqual([1440, 900]);
  const pausedTime = await page.evaluate(() =>
    (window as any).__BUMER__.transport.visualPosition(),
  );
  await expect.poll(async () => (await read()).saved.last).toBe(pausedTime);
  const a = await read();
  expect(a.world.drawingBuffer).toEqual(a.world.size);
  expect(a.world.mode).toBe("growing-circles-overview");
  expect(a.world.overview).toBe(0);
  expect(a.world.flight.shot).toBe("restart");
  expect(a.saved).not.toHaveProperty("cursor");
  expect(a.world).not.toHaveProperty("cursor");
  expect(a.world.floor.nearCaps).toBeLessThanOrEqual(768);
  expect(a.world.floor.denseAdded).toBeGreaterThan(0);
  expect(
    await page.locator("#world").evaluate((e) => getComputedStyle(e).cursor),
  ).not.toBe("none");
  await page.waitForTimeout(200);
  const b = await read();
  expect(b.saved).toEqual(a.saved);
  expect(b.world).toEqual(a.world);
  await page.evaluate(() => (window as any).__BUMER__.world.loseContext());
  await expect(page.locator("#status")).toContainText("Graphics interrupted");
  await page.locator("#retry").click();
  await expect(page.locator("#play")).toBeEnabled({ timeout: 20000 });
  const restored = await read();
  expect(restored.saved.floor).toEqual(a.saved.floor);
  expect(restored.saved).not.toHaveProperty("cursor");
  expect(restored.world.mode).toBe("growing-circles-overview");
  expect(restored.world.drawingBuffer).toEqual(restored.world.size);
  await clickControl(page, "#replay");
  await expect.poll(async () => (await read()).world.overview).toBe(0);
  const reset = await read();
  expect(reset.saved.floor.kind).toBe(0);
  expect(reset.saved.floor.phase).toBe(0);
  expect(reset.world.floor.denseAdded).toBe(0);
  expect(reset.world.overview).toBe(0);
});

test("Fast reversals and controls preserve the floor and native pointer without a replacement orb", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
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
    await page.locator("#play").evaluate((e) => getComputedStyle(e).cursor),
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
  await page.locator("#start").click();
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

test("Focused keyboard completes a full turn with all-direction floor, fixed origins and stable world stars", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
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
    frames[0].world.heading + 2,
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
  await page.locator("#start").click();
  await page.mouse.move(1100, 550);
  await page.waitForTimeout(1200);
  await clickControl(page, "#play");
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

test("Owned settings preserve audio, keyboard semantics, reset values and short viewport access", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await boot(page);
  await page.locator("#start").click();
  const before = await page.evaluate(() =>
    (window as any).__BUMER__.transport.position(),
  );
  await clickControl(page, "#settings-button");
  await expect(page.locator("#settings")).toBeVisible();
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.position()),
  ).toBeGreaterThan(before);
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.state),
  ).toBe("playing");
  await page.locator("#volume").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#volume")).toHaveValue("69");
  await page.locator("#brightness").fill("120");
  await page.locator("#reset-settings").click();
  await expect(page.locator("#volume")).toHaveValue("70");
  await expect(page.locator("#brightness")).toHaveValue("100");
  await page.keyboard.press("Escape");
  await expect(page.locator("#settings")).not.toBeVisible();
  await clickControl(page, "#settings-button");
  await page.locator("#settings .pane-close").click();
  await clickControl(page, "#settings-button");
  await expect(page.locator("#settings")).toBeVisible();
  await page.keyboard.press("Escape");
  const d = await page.evaluate(() =>
    (window as any).__BUMER__.world.diagnostics(),
  );
  expect(d.camera[1]).toBeGreaterThan(-16.5);
  expect(d.camera[1]).toBeLessThan(24.75);
  expect(d.groundVisible).toBe(false);
  expect(d.stars.shortViewportSupported).toBe(true);
  expect(d.stars.count).toBe(726);
});

test("The tail stays lit until presented completion; interruption freezes the outro and replay stays explicit", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
  await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    b.seek(b.transport.duration - 0.8);
  });
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.world.diagnostics().reveal.exit,
    ),
  ).toBe(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).__BUMER__.transport.state))
    .toBe("ended");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator("#play")).toHaveText("Resume");
  const paused = await page.evaluate(
    () => (window as any).__BUMER__.transport.presentationEndAge,
  );
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.transport.presentationEndAge,
    ),
  ).toBe(paused);
  await page.locator("#play").click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__BUMER__.world.diagnostics().reveal.exit,
      ),
    )
    .toBe(1);
  const state = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    return {
      events: b.transport.sourceEvents,
      completion: b.transport.completionEvents,
      state: b.transport.state,
    };
  });
  // One initial start and one deliberate development seek. Exit/resume adds none.
  expect(state.events.filter((e: any) => e.kind === "start")).toHaveLength(2);
  expect(state.completion.map((e: any) => e.kind)).toEqual([
    "graph_end",
    "presented_end",
  ]);
  expect(state.state).toBe("ended");
});

test("Space pauses the completed ambient world; Replay alone resets the song and route", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
  await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    b.seek(b.transport.duration - 0.04);
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__BUMER__.transport.hasPresentedEnd),
    )
    .toBe(true);
  await page.locator("#world").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#play")).toHaveText("Resume");
  const frozen = await page.evaluate(
    () => (window as any).__BUMER__.transport.presentationEndAge,
  );
  await page.waitForTimeout(180);
  expect(
    await page.evaluate(
      () => (window as any).__BUMER__.transport.presentationEndAge,
    ),
  ).toBe(frozen);
  await page.keyboard.press("Space");
  await expect(page.locator("#play")).toHaveText("Pause");
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.state),
  ).toBe("ended");
  await clickControl(page, "#replay");
  await page.locator("#start").click();
  expect(
    await page.evaluate(() =>
      (window as any).__BUMER__.transport.visualPosition(),
    ),
  ).toBeLessThan(0.3);
  expect(
    await page.evaluate(() => (window as any).__BUMER__.world.snapshot().last),
  ).toBeLessThan(0.3);
});

test("Frontmost owned pane controls navigation selection and Escape without stopping music", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
  await clickControl(page, "#settings-button");
  await clickControl(page, "#credits-button");
  await expect(page.locator("#credits-button")).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect(page.locator("#settings-button")).toHaveAttribute(
    "data-active",
    "false",
  );
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.state),
  ).toBe("playing");
  await page.keyboard.press("Escape");
  await expect(page.locator("#credits")).not.toBeVisible();
  await expect(page.locator("#settings")).toBeVisible();
  await expect(page.locator("#settings-button")).toHaveAttribute(
    "data-active",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("#settings")).not.toBeVisible();
});

test("Start's owned GPU lens keeps native text, stops capture while hidden and returns on replay", async ({
  page,
}) => {
  await boot(page);
  await expect(page.locator("#start")).toHaveAttribute(
    "data-glass-mode",
    "gpu",
  );
  const read = () =>
    page.evaluate(
      () => (window as any).__BUMER__.world.diagnostics().startGlass,
    );
  expect((await read()).encodedOutput).toBe(true);
  expect((await read()).nativeLabel).toBe(true);
  await page.locator("#start").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#play")).toHaveText("Pause");
  await expect.poll(async () => (await read()).mode).toBe("inactive");
  const captures = (await read()).captures;
  await page.waitForTimeout(120);
  expect((await read()).captures).toBe(captures);
  await clickControl(page, "#replay");
  await expect(page.locator("#start")).toBeVisible();
  await expect.poll(async () => (await read()).mode).toBe("gpu-final-output");
  const starts = await page.evaluate(() =>
    (window as any).__BUMER__.transport.sourceEvents.filter(
      (e: any) => e.kind === "start",
    ),
  );
  expect(starts).toHaveLength(1);
});

test("Active borrowed-light anchors survive a paused graphics interruption and deliberate resume", async ({
  page,
}) => {
  await boot(page);
  await page.locator("#start").click();
  await page.evaluate(() => (window as any).__BUMER__.seek(78));
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__BUMER__.world.diagnostics().actors.family,
      ),
    )
    .toBe("gather");
  await clickControl(page, "#play");
  await expect(page.locator("#play")).toHaveText("Resume");
  const anchors = await page.evaluate(
    () => (window as any).__BUMER__.world.snapshot().actors,
  );
  await page.evaluate(() => (window as any).__BUMER__.world.loseContext());
  await expect(page.locator("#retry")).toBeVisible();
  await page.locator("#retry").click();
  await expect(page.locator("#play")).toBeEnabled({ timeout: 20000 });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__BUMER__.world.snapshot().actors),
    )
    .toEqual(anchors);
  expect(
    await page.evaluate(() => (window as any).__BUMER__.transport.state),
  ).toBe("paused");
  await clickControl(page, "#play");
  await expect(page.locator("#play")).toHaveText("Pause");
  const result = await page.evaluate(() => {
    const b = (window as any).__BUMER__;
    return {
      world: b.world.diagnostics(),
      sources: b.transport.sourceEvents.filter((e: any) => e.kind === "start"),
    };
  });
  expect(result.world.camera[1]).toBe(33);
  expect(result.world.actors.depthTest).toBe(true);
  expect(result.sources[0].offsetSeconds).toBe(0);
});
