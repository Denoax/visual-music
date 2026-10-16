import { focusOwnedPreview, foregroundState } from "./native-foreground.mjs";
import { RETURN_SECONDS, IDLE_PERIOD } from "../core/visual-return.mjs";
import { chromium } from "playwright";
import { mkdir, open, writeFile, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { finalize } from "./finalize-capture.mjs";
import {
  prepareRecordingOutput,
  recordingOutput,
} from "./recording-output.mjs";

const headless = process.argv.includes("--headless");
const portrait = process.argv.includes("--portrait"),
  name = portrait ? "portrait-full" : "desktop-full";
const out =
  process.argv.find((x) => x.startsWith("--out="))?.slice(6) ||
  "evidence/wave-focus/full-capture";
await mkdir(out, { recursive: true });
const prefix = `${out}/${name}`;
try {
  await stat(`${prefix}.webm`);
  throw Error("Choose a fresh capture path");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const sourceFiles = [
  "core/beauty.mjs",
  "core/visual-return.mjs",
  "src/scene/post-surface.ts",
  "src/scene/field-adapter-snippets.mjs",
  "src/scene/horizon.mjs",
  "assets/manifest.json",
  "show/dance-floor-only.as-built.json",
  "core/reference-camera.mjs",
  "show/camera-score.json",
  "show/reference-camera-score.json",
  "show/camera-origins.json",
  "src/scene/start-glass.ts",
  "src/show/microcues.ts",
  "src/show/paint.ts",
  "src/show/drivers.ts",
  "core/chunk-wave-exchange.mjs",
  "core/microcue-effects.mjs",
  "show/lyrical-sections.json",
  "show/microcues.json",
  "show/cadence-cues.json",
  "public/analysis/mixed-microfeatures.json",
  "src/main.ts",
  "src/scene/world.ts",
  "src/scene/field.ts",
  "src/scene/terrain.ts",
  "src/scene/stars.ts",
  "src/scene/flight.ts",
  "src/scene/softness.ts",
  "src/scene/gpu-timer.ts",
  "src/show/arrangement.ts",
  "src/show/floor.ts",
  "src/input.ts",
  "core/grid-flight.mjs",
  "core/music-controls.mjs",
  "core/sphere-support.mjs",
  "core/led-floor.mjs",
  "show/global-lightshow.proposal.json",
  "core/global-lightshow.mjs",
  "core/star-field.mjs",
  "show/arrangement.proposal.json",
  "show/correction.proposal.json",
  "show/light-pulses.json",
  "src/show/waves.ts",
  "src/show/playback.ts",
  "src/show/track.ts",
  "src/audio/transport.ts",
  "core/audio-time.mjs",
  "show/events.json",
  "show/cues.proposal.json",
  "analysis/features.json",
  "public/audio/around-the-world.mp3",
  "index.html",
  "src/style.css",
  "tools/record-waves-streamed.mjs",
  "tools/recording-output.mjs",
  "src/scene/star-pass.ts",
  "src/ui/controls.ts",
  "src/ui/slider.ts",
  "src/ui/portfolio-pane.mjs",
  "src/ui/donor/criticalDamper.ts",
  "src/ui/donor/navConnection.ts",
  "src/ui/donor/sliderFlight.ts",
  "core/near-stars.mjs",
  "core/lighting-recipes.mjs",
  "core/safe-passage.mjs",
  "show/refinement.proposal.json",
  "public/fonts/instrument-sans-latin-variable.woff2",
];
const hashes = Object.fromEntries(
  await Promise.all(
    sourceFiles.map(async (p) => [
      p,
      createHash("sha256")
        .update(await readFile(p))
        .digest("hex"),
    ]),
  ),
);
const browser = await chromium.launch({
  headless,
  executablePath:
    process.env.BUMER_CHROME ||
    "/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  args: [
    "--no-sandbox",
    "--ozone-platform=x11",
    "--use-gl=angle",
    "--use-angle=gl",
  ],
});
const handle = await open(`${prefix}.webm`, "wx");
let writes = Promise.resolve();
try {
  const page = await browser.newPage({
    viewport: portrait
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const errors = [],
    requests = [],
    trace = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => requests.push(r.url()));
  await page.exposeFunction("saveWaveCapture", (data) => {
    writes = writes.then(async () => {
      // Return no Buffer to the browser bridge: it would serialize each entire
      // chunk back to Chromium after writing, creating unnecessary backpressure.
      await handle.write(Buffer.from(data, "base64"));
    });
    return writes;
  });
  await page.goto("http://127.0.0.1:4175/?dev=1");
  await page.waitForSelector("#start:not([disabled])", { timeout: 60000 });
  const branding = {
    title: await page.title(),
    startHeading: await page.locator("#title").textContent(),
  };
  if (
    branding.title !== "Visual Music" ||
    branding.startHeading !== "Visual Music"
  )
    throw Error("Capture preview does not serve the current Visual Music name");
  await page.locator("#developer").evaluate((e) => (e.hidden = true));
  const foreground = headless
    ? {
        scope:
          "Headless ANGLE hardware capture; compositor foreground not applicable",
      }
    : await focusOwnedPreview(page);
  await page.screenshot({ path: `${prefix}-ready.png` });
  await page.evaluate(
    `globalThis.prepareRecordingOutput=${prepareRecordingOutput.toString()};globalThis.recordingOutput=${recordingOutput.toString()}`,
  );
  await page.evaluate(async () => {
    await globalThis.prepareRecordingOutput(
      window.__BUMER__.transport.audioContext,
    );
  });
  await page.evaluate(() => {
    const b = window.__BUMER__,
      canvas = document.querySelector("#world");
    b.resetMetrics();
    const tap = globalThis.recordingOutput(
      b.transport.audioContext,
      b.transport.masterOutput,
    );
    const stream = new MediaStream([
      ...canvas.captureStream(60).getVideoTracks(),
      ...tap.stream.getAudioTracks(),
    ]);
    const mime = "video/webm;codecs=vp9,opus";
    if (!MediaRecorder.isTypeSupported(mime))
      throw Error("VP9/Opus unavailable");
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: innerWidth < 700 ? 3000000 : 5000000,
      audioBitsPerSecond: 192000,
    });
    let queue = Promise.resolve();
    recorder.ondataavailable = (e) => {
      queue = queue.then(async () => {
        if (!e.data.size) return;
        const bytes = new Uint8Array(await e.data.arrayBuffer());
        let s = "";
        for (let i = 0; i < bytes.length; i += 0x8000)
          s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        await window.saveWaveCapture(btoa(s));
      });
    };
    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = reject;
    });
    window.finishWaveCapture = async () => {
      recorder.stop();
      await stopped;
      await queue;
      stream.getTracks().forEach((t) => t.stop());
      tap.dispose();
    };
    window.waveCaptureStart = {
      performanceMs: performance.now(),
      contextSeconds: b.transport.audioContext.currentTime,
    };
    recorder.start(1000);
  });
  await page.locator("#start").click();
  const cdp = await page.context().newCDPSession(page);
  let windowTouchActive = false;
  let mouseHeld = false;
  let reported = -1;
  const wallStart = Date.now();
  while (true) {
    const sample = await page.evaluate(() => {
      const b = window.__BUMER__;
      return {
        wallMs: performance.now(),
        song: b.transport.visualPosition(),
        graph: b.transport.position(),
        state: b.transport.state,
        endAge: b.transport.presentationEndAge,
        outroComplete: b.transport.visualOutroComplete,
        world: b.world.diagnostics(),
        audio: {
          volume: b.transport.volumeLevel,
          muted: b.transport.isMuted,
          masterGain: b.transport.masterOutput.gain.value,
          musicGain: b.transport.musicOutput.gain.value,
        },
        gpu_recent_ms: b.world.gpuSamples.splice(0),
      };
    });
    const compositor = foregroundState(foreground.address);
    let regained = null;
    if (!headless && compositor.ownedActive === false)
      regained = await focusOwnedPreview(page);
    trace.push({ ...sample, compositor, regained });
    if (sample.audio.muted || Math.abs(sample.audio.volume - 0.7) > 1e-8)
      throw Error(
        `Unexpected capture audio controls ${JSON.stringify(sample.audio)}`,
      );
    if (
      sample.endAge !== null &&
      sample.endAge >= RETURN_SECONDS + 2 * IDLE_PERIOD
    )
      break;
    if (sample.state !== "playing" && sample.state !== "ended")
      throw Error(
        `Interrupted full-song capture at ${sample.song}s: ${sample.state}`,
      );
    if (Date.now() - wallStart > 300000)
      throw Error("Capture exceeded normal-speed duration");
    const chapter = Math.floor(sample.song / 30);
    if (chapter !== reported) {
      reported = chapter;
      console.log(name, `${sample.song.toFixed(2)}s`, sample.world.section);
    }
    // Source-matched normalized gestures; production camera/audio clock.
    if (!portrait) {
      const x =
        sample.song >= 28 && sample.song < 36
          ? 0.444444
          : sample.song >= 36 && sample.song < 39
            ? -0.416667
            : sample.song >= 124 && sample.song < 129
              ? 0.388889
              : 0;
      const y =
        sample.song >= 28 && sample.song < 36
          ? -0.222222
          : sample.song >= 36 && sample.song < 39
            ? 0.288889
            : 0;
      await page.mouse.move((x + 1) * 720, (y + 1) * 450);
      if (sample.song >= 124 && sample.song < 129) {
        if (!mouseHeld) {
          await page.mouse.down();
          mouseHeld = true;
        }
      } else if (mouseHeld) {
        await page.mouse.up();
        mouseHeld = false;
      }
    }
    if (portrait && sample.song > 195 && sample.song < 201) {
      if (!windowTouchActive) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: 195, y: 430 }],
        });
        windowTouchActive = true;
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 195 + 60 * Math.sin(sample.song), y: 450 }],
      });
    } else if (windowTouchActive) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      windowTouchActive = false;
    }
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${prefix}-ended.png` });
  const fullEnd = await page.evaluate(() => {
    const b = window.__BUMER__;
    return {
      seconds: b.transport.position(),
      sourceEvents: b.transport.sourceEvents.slice(),
      decode: b.decodeRecord(),
      decodedStereo: Array.from(
        { length: b.transport.decodedBuffer.numberOfChannels },
        (_, channel) => {
          const pcm = b.transport.decodedBuffer.getChannelData(channel);
          let peak = 0,
            squares = 0,
            lastNonzero = -1,
            tailSquares = 0;
          const tailStart = Math.floor(
            (b.transport.duration - 1) * b.transport.sampleRate,
          );
          for (let i = 0; i < pcm.length; i++) {
            peak = Math.max(peak, Math.abs(pcm[i]));
            squares += pcm[i] * pcm[i];
            if (Math.abs(pcm[i]) > 1e-8) lastNonzero = i;
            if (i >= tailStart) tailSquares += pcm[i] * pcm[i];
          }
          return {
            channel,
            frames: pcm.length,
            peak,
            rms: Math.sqrt(squares / pcm.length),
            lastNonzeroFrame: lastNonzero,
            lastSecondRms: Math.sqrt(tailSquares / (pcm.length - tailStart)),
            musicGain: b.transport.musicOutput.gain.value,
            volume: b.transport.volumeLevel,
            calibratedPeak:
              peak *
              b.transport.musicOutput.gain.value *
              b.transport.volumeLevel,
          };
        },
      ),
      captureStart: window.waveCaptureStart,
      metrics: b.metrics,
      gpuSamples: b.world.gpuSamples.slice(),
      completionEvents: b.transport.completionEvents.slice(),
      endAge: b.transport.presentationEndAge,
      finalWorld: b.world.diagnostics(),
    };
  });
  if (portrait) {
    if (!(await page.locator("#replay").isVisible()))
      await page.locator("#menu-button").click();
    await page.locator("#replay").click();
    if (
      (await page.locator("#menu-button").getAttribute("aria-expanded")) ===
      "true"
    )
      await page.locator("#menu-button").click();
    await page.screenshot({ path: `${prefix}-replay.png` });
    await page.locator("#start").click();
    await page.waitForTimeout(5500);
    if (!(await page.locator("#play").isVisible()))
      await page.locator("#menu-button").click();
    await page.locator("#play").click();
  }
  await page.evaluate(() => window.finishWaveCapture());
  await writes;
  await handle.close();
  await writeFile(
    `${prefix}-trace.json`,
    JSON.stringify(
      {
        scope:
          "Uninterrupted normal-speed entire decoded song and post-presented-end eight-second return and two complete twelve-second idle periods from direct Start; canvas plus actual shared master-output copy-only worklet sink (no new music source), retained through idle silence to flush the final fractional Opus packet. Portrait includes a replay demonstration only after the complete original song. No soundtrack replacement or timing edits.",
        implementation_hashes: hashes,
        application_branding: branding,
        capture_backend: headless
          ? "Headless hardware ANGLE/NVIDIA, real renderer and original bitrates; not native foreground/device approval"
          : "Native foreground browser",
        errors,
        requests,
        trace,
        fullEnd,
      },
      null,
      2,
    ) + "\n",
  );
  if (
    errors.length ||
    fullEnd.sourceEvents.filter((e) => e.kind === "start").length !== 1 ||
    fullEnd.sourceEvents[0].offsetSeconds !== 0
  )
    throw Error("Full capture source/error invariant failed");
  await finalize(prefix);
  console.log("COMPLETE", name, fullEnd.seconds);
} finally {
  await handle.close().catch(() => {});
  await browser.close();
}
