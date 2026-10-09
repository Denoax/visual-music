import { test, expect } from "@playwright/test";
function wav(seconds = 12) {
  const rate = 8000,
    size = rate * seconds * 2;
  const b = Buffer.alloc(44 + size);
  b.write("RIFF");
  b.writeUInt32LE(36 + size, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(size, 40);
  for (let i = 0; i < size / 2; i++)
    b.writeInt16LE(Math.sin((i / rate) * 2 * Math.PI * 220) * 1000, 44 + i * 2);
  return b;
}
test("scene loads, silent study seeks/replays and controls fit portrait", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page.locator("#ignition")).toBeEnabled({ timeout: 45000 });
  await expect(page.locator("#fallback")).toBeHidden();
  await page.locator("#study").click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  for (const time of [35, 75, 105, 116, 126]) {
    await page.locator("#seek").fill(String(time));
    await expect(page.locator("#time")).toHaveText(
      `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`,
    );
  }
  await page.locator("#replay").click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#settings-button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.locator("#reduced").check();
  await page.getByRole("button", { name: "Close settings" }).click();
  expect(errors).toEqual([]);
});
test("local decoding keeps unreviewed song cues inactive and supports transport and editor", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#ignition")).toBeEnabled({ timeout: 45000 });
  await page.locator("#audio-file").setInputFiles({
    name: "synthetic-fixture.wav",
    mimeType: "audio/wav",
    buffer: wav(),
  });
  await expect(page.locator("#status")).toContainText("Recording decoded");
  await expect(page.locator("#track-title")).toHaveText(
    "synthetic-fixture.wav",
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.locator("#seek").fill("8");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator("#scene-name")).toHaveText("Ignition");
  await page.locator("#replay").click();
  await expect(page.locator("#time")).toHaveText("0:00");
  await page.locator("#settings-button").click();
  await page.locator("#import-cues").click({ noWaitAfter: true });
  await page.locator("#cue-file").setInputFiles({
    name: "bad-cues.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      '{"schema_version":1,"review_status":"reviewed","track_sha256":"wrong"}',
    ),
  });
  await expect(page.locator("#status")).toContainText("different audio");
  await page.locator("#open-editor").click();
  await expect(page.locator("#editor-identity")).toContainText("SHA-256");
  await page.locator("#mark-beat").click();
  await expect(page.locator("#status")).toContainText("beat candidates");
});

test("failed scene assets leave local audio usable and volume has a touch-accessible control", async ({
  page,
}) => {
  await page.route("**/assets/textures/asphalt_02_diff_1k.jpg", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.locator("#fallback")).toBeVisible();
  await expect(page.locator("#study")).toBeDisabled();
  await page.locator("#audio-file").setInputFiles({
    name: "synthetic-fixture.wav",
    mimeType: "audio/wav",
    buffer: wav(),
  });
  await expect(page.locator("#status")).toContainText("Recording decoded");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#settings-button").click();
  await page.locator("#volume-settings").fill("0.3");
  await expect(page.locator("#volume")).toHaveValue("0.3");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});
