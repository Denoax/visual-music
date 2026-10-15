import "./style.css";
import { bindPortfolioControls } from "./ui/controls";
import { AudioTransport } from "./audio/transport";
import { acceptMicrofeatures } from "./show/microcues";
import { ShowPlayback } from "./show/playback";
import { createWorld } from "./scene/world";
import { bindGlideInput } from "./input";
import { LoadingModel } from "../core/loading-model.mjs";
import { thankYouAt, FINISH_SECONDS } from "../core/opening-layers.mjs";
import { confettiAt } from "../core/confetti.mjs";
import { createUiTones } from "../core/ui-tones.mjs";
import {
  TRACK_HASH,
  ANALYSIS_DURATION,
  validateFeatures,
  type Features,
} from "./show/track";

const get = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const button = (id: string) => get<HTMLButtonElement>(id);
const canvas = get<HTMLCanvasElement>("world"),
  landing = get("entrance"),
  stage = document.querySelector<HTMLElement>(".landing-stage")!,
  thanks = get("thank-you");
const transport = new AudioTransport(),
  playback = new ShowPlayback(transport),
  loading = new LoadingModel();
const gentle = get<HTMLInputElement>("reduced");
gentle.checked = matchMedia("(prefers-reduced-motion:reduce)").matches;
const dev = new URLSearchParams(location.search).get("dev") === "1";
let world: Awaited<ReturnType<typeof createWorld>> | null = null,
  features: Features | null = null;
let tones: ReturnType<typeof createUiTones> | null = null;
let worldPreparation: Promise<Awaited<ReturnType<typeof createWorld>>> | null =
  null;
let ready = false,
  lost = false,
  dirty = true,
  disposed = false,
  generation = 0,
  raf = 0,
  previous = 0,
  lastUI = 0;
let error = "",
  visibleSeconds = 0,
  lastVisible = 0,
  uiUntil = 0,
  fieldEntered = false,
  announcedThanks = false;
const metrics = {
  intervals: [] as number[],
  timing: [] as {
    wallMs: number;
    song: number;
    graph: number;
    method: string;
  }[],
};
function invalidate(milliseconds = 220) {
  dirty = true;
  uiUntil = Math.max(uiUntil, performance.now() + milliseconds);
  if (!raf && !disposed && !document.hidden) raf = requestAnimationFrame(tick);
}
const pointer = bindGlideInput(
  canvas,
  () =>
    playback.running &&
    fieldEntered &&
    !ui.anyOpen() &&
    !transport.hasPresentedEnd,
);
const ui = bindPortfolioControls(
  () => {
    pointer.clear();
    invalidate();
  },
  (v) => transport.setVolume(v),
  () => invalidate(),
);
function controls() {
  button("mute").textContent = transport.isMuted ? "Unmute" : "Mute";
  button("mute").setAttribute("aria-pressed", String(transport.isMuted));
  button("pause").hidden = !fieldEntered || transport.visualOutroComplete;
  button("pause").textContent =
    playback.running || transport.visualActive ? "Pause" : "Resume";
  button("pause").disabled = lost;
  button("retry").hidden = !(error || lost);
  get("status").textContent =
    error || (lost ? "Graphics interrupted. Restore to continue." : "");
  if (!playback.running) pointer.clear();
  if (transport.audioContext?.state !== "running") tones?.silence();
  invalidate();
}
transport.onChange = controls;
async function fetchData(path: string) {
  const r = await fetch(`${import.meta.env.BASE_URL}${path}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw Error(`${path}: HTTP ${r.status}`);
  return r;
}
async function load() {
  const token = ++generation,
    loadGeneration = loading.reset();
  playback.replay();
  tones?.silence();
  fieldEntered = false;
  visibleSeconds = 0;
  lastVisible = 0;
  ready = false;
  error = "";
  controls();
  const current = () => token === generation && !disposed;
  const mark = (task: string) => {
    if (current()) loading.markReady(task, loadGeneration);
  };
  try {
    const font = document.fonts
      .load('400 14px "Instrument Sans Variable"')
      .then(() => document.fonts.ready)
      .then(() => mark("font"));
    const analysis = Promise.all([
      fetchData("analysis/features.json"),
      fetchData("analysis/mixed-microfeatures.json"),
    ]).then(async ([a, m]) => {
      const [featureData, microfeatureData] = await Promise.all([
        a.json(),
        m.json(),
      ]);
      if (!current()) return null;
      const data = validateFeatures(featureData);
      acceptMicrofeatures(microfeatureData);
      mark("analysis");
      return data;
    });
    const decode = fetchData("audio/around-the-world.mp3")
      .then(async (r) => {
        const bytes = await r.arrayBuffer();
        // A failed attempt's late response must not pause or replace the
        // retried song. The transport owns generations once decoding starts.
        if (!current()) return false;
        return transport.load(
          new File([bytes], "around-the-world.mp3", {
            type: "audio/mpeg",
          }),
          TRACK_HASH,
          () => mark("audioBytes"),
        );
      })
      .then((accepted) => {
        if (!current()) return;
        if (!accepted) throw Error("Recording load interrupted; retry.");
        mark("audioDecode");
      });
    const graphics = (async () => {
      // Retry shares an in-flight graphics preparation; two renderers must never
      // race for this canvas when an earlier network task fails first.
      if (!world) {
        if (!worldPreparation) {
          canvas.style.visibility = "hidden";
          worldPreparation = createWorld(canvas)
            .then((value) => {
              world = value;
              canvas.style.visibility = "visible";
              return value;
            })
            .finally(() => {
              worldPreparation = null;
            });
        }
        await worldPreparation;
      }
      mark("shaders");
    })();
    const [data] = await Promise.all([analysis, decode, font, graphics]);
    if (!current() || !data) return;
    if (Math.abs(transport.duration - ANALYSIS_DURATION) > 0.03)
      throw Error("Decoded recording differs from the measured analysis.");
    features = data;
    ready = true;
    tones?.dispose();
    tones = createUiTones(transport.audioContext!, transport.masterOutput!, {
      reserveHeadroom: (peak: number, at: number, until: number) =>
        transport.reserveUiHeadroom(peak, at, until),
      muted: () => transport.isMuted,
    });
    if (dev) expose();
    controls();
  } catch (e) {
    if (token === generation && !disposed) {
      error = e instanceof Error ? e.message : String(e);
      loading.fail(error, loadGeneration);
      controls();
    }
  }
}
async function enter() {
  if (!ready || lost || !loading.beginContinue()) return;
  ui.close();
  invalidate();
  try {
    const accepted = await playback.enter(() => tones?.play("continue"), 0.8);
    if (!accepted)
      loading.continueFailed(
        "Entry interrupted. Click to continue when ready.",
      );
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    loading.continueFailed(error);
  }
  controls();
}
button("start").onclick = () => void enter();
button("pause").onclick = () =>
  void playback
    .toggle()
    .then(controls)
    .catch((e) => {
      error = String(e);
      controls();
    });
button("retry").onclick = () => {
  if (lost) world?.restoreContext();
  else void load();
};
button("mute").onclick = () => {
  transport.setMuted(!transport.isMuted);
  controls();
};
button("reset-settings").onclick = () => {
  ui.cancelGestures();
  ui.volume.set(70);
  ui.brightness.set(100);
  transport.setVolume(0.7);
  transport.setMuted(false);
  gentle.checked = matchMedia("(prefers-reduced-motion:reduce)").matches;
  pointer.clear();
  controls();
};
gentle.onchange = () => {
  pointer.clear();
  invalidate();
};
button("fullscreen").onclick = () => {
  const action = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen();
  void action.catch(() => {
    get("status").textContent = "Fullscreen is unavailable in this browser.";
    invalidate();
  });
};
// Exactly one note per accepted native button click. Hover and slider motion are silent.
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (
    !e.isTrusted ||
    !b ||
    b.disabled ||
    b.id === "start" ||
    !ready ||
    disposed
  )
    return;
  void transport
    .unlock()
    .then(() => {
      if (!document.hidden && !disposed) tones?.play("button");
    })
    .catch(() => {});
  invalidate();
});
for (const event of [
  "pointerdown",
  "pointerup",
  "pointerover",
  "pointerout",
  "focusin",
]) {
  document.addEventListener(event, (e) => {
    if ((e.target as HTMLElement).closest("button,dialog")) invalidate();
  });
}
function pause() {
  const entering = loading.phase === "entering" && !fieldEntered;
  if (playback.running || transport.hasPresentedEnd) playback.pause();
  if (entering) {
    playback.replay();
    loading.continueFailed("Entry interrupted. Click to continue.");
  }
  tones?.silence();
  pointer.clear();
  controls();
}
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  lastVisible = 0;
  if (document.hidden) {
    pause();
    cancelAnimationFrame(raf);
    raf = 0;
  } else invalidate();
});
window.addEventListener("keydown", (e) => {
  if (ui.anyOpen() || (e.target as HTMLElement).matches("input,button,a"))
    return;
  if (
    e.code === "Space" &&
    fieldEntered &&
    !e.repeat &&
    !transport.visualOutroComplete
  ) {
    e.preventDefault();
    void playback.toggle().then(controls);
  }
  if (e.code === "KeyM") {
    transport.setMuted(!transport.isMuted);
    controls();
  }
});
window.addEventListener("resize", () => {
  world?.resize();
  invalidate();
});
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  lost = true;
  pause();
});
canvas.addEventListener("webglcontextrestored", async () => {
  const seconds = transport.position(),
    saved = world?.snapshot();
  world?.dispose();
  world = null;
  try {
    world = await createWorld(canvas);
    if (saved) world.restore(saved);
    else world.reset(seconds);
    const p = transport.presentation();
    world.render(
      p.seconds,
      pointer.state,
      gentle.checked,
      features,
      false,
      p.endAge,
      ui.brightnessValue,
    );
    lost = false;
    error = "";
    if (dev) expose();
    controls();
  } catch (e) {
    error = String(e);
    controls();
  }
});
function drawConfetti(age: number | null) {
  let layer = document.querySelector<HTMLCanvasElement>(".thank-you-confetti");
  if (age === null) {
    layer?.remove();
    return;
  }
  if (!layer) {
    layer = document.createElement("canvas");
    layer.className = "thank-you-confetti";
    layer.setAttribute("aria-hidden", "true");
    thanks.append(layer);
  }
  const dpr = Math.min(devicePixelRatio, 2),
    w = innerWidth,
    h = innerHeight;
  if (
    layer.width !== Math.round(w * dpr) ||
    layer.height !== Math.round(h * dpr)
  ) {
    layer.width = Math.round(w * dpr);
    layer.height = Math.round(h * dpr);
  }
  const ctx = layer.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  for (const piece of confettiAt(age, { reduced: gentle.checked })) {
    ctx.save();
    ctx.translate(piece.x * w, piece.y * h);
    ctx.rotate((piece.rotation * Math.PI) / 180);
    ctx.globalAlpha = piece.opacity;
    ctx.fillStyle = piece.colour;
    ctx.fillRect(
      -piece.width / 2,
      -piece.height / 2,
      piece.width,
      piece.height,
    );
    ctx.restore();
  }
}
function tick(now: number) {
  raf = 0;
  if (disposed || document.hidden) return;
  if (!fieldEntered) {
    if (lastVisible) visibleSeconds += Math.max(0, (now - lastVisible) / 1000);
    lastVisible = now;
  }
  const presentation = transport.presentation(now),
    finish = thankYouAt(presentation.endAge, { reduced: gentle.checked });
  if (
    !fieldEntered &&
    loading.phase === "entering" &&
    transport.presentationHasStarted(now)
  ) {
    fieldEntered = true;
    canvas.focus({ preventScroll: true });
    // Refresh after this tick reschedules RAF; Pause must be available on first
    // entry without creating a second animation-frame owner inside the tick.
    queueMicrotask(controls);
  }
  const model = loading.sample(visibleSeconds, { reduced: gentle.checked });
  landing.hidden = fieldEntered;
  landing.dataset.phase = model.phase;
  landing.dataset.spinning = String(model.spinning);
  landing.setAttribute("aria-busy", String(model.phase === "loading"));
  const announcement =
    model.phase === "error"
      ? "Loading interrupted"
      : model.canContinue
        ? "Ready. Click to continue."
        : model.phase === "entering"
          ? "Starting music"
          : "Loading";
  const loadingAnnouncement = get("loading-announcement");
  if (loadingAnnouncement.textContent !== announcement)
    loadingAnnouncement.textContent = announcement;
  const values = {
    "--spinner-opacity": String(model.spinnerOpacity),
    "--play-opacity": String(model.playOpacity),
    "--invitation-opacity": String(model.textOpacity),
  };
  for (const [key, value] of Object.entries(values))
    stage.style.setProperty(key, value);
  button("start").disabled = !ready || lost || !model.canContinue;
  button("start").tabIndex = model.canContinue ? 0 : -1;
  button("start").setAttribute("aria-hidden", String(!model.canContinue));
  if (
    !fieldEntered &&
    model.phase === "entering" &&
    transport.state === "playing"
  ) {
    const lead = Math.max(
      0,
      transport.scheduledStart - (transport.audioContext?.currentTime ?? 0),
    );
    landing.style.opacity = String(Math.min(1, lead / 0.65));
  } else landing.style.opacity = "1";
  const showSettings =
    (fieldEntered || model.settingsOpacity > 0.001) && finish.pageGain === 0;
  button("settings-button").hidden = !showSettings;
  button("settings-button").style.opacity = String(
    fieldEntered ? 1 : model.settingsOpacity,
  );
  thanks.hidden = finish.pageGain === 0;
  thanks.style.opacity = String(finish.pageGain);
  if (finish.phase === "thanks" && !announcedThanks) {
    announcedThanks = true;
    ui.close();
    thanks.focus({ preventScroll: true });
  }
  drawConfetti(finish.confettiAge);
  const finishing =
    transport.visualActive &&
    presentation.endAge !== null &&
    presentation.endAge < FINISH_SECONDS;
  const active = playback.running || finishing;
  const animating =
    (!fieldEntered && model.settingsOpacity < 1 && model.phase !== "error") ||
    (model.phase === "entering" && !fieldEntered) ||
    now < uiUntil;
  if (world && !lost && (active || dirty || animating || ui.anyOpen())) {
    if (active && previous) {
      metrics.intervals.push(now - previous);
      if (metrics.intervals.length > 60000) metrics.intervals.shift();
    }
    previous = active ? now : 0;
    world.render(
      presentation.seconds,
      pointer.state,
      gentle.checked,
      features,
      active && fieldEntered,
      presentation.endAge,
      ui.brightnessValue,
    );
    if (dev && now - lastUI > 250) {
      metrics.timing.push({
        wallMs: now,
        song: presentation.seconds,
        graph: transport.position(),
        method: transport.clockQuality,
      });
      if (metrics.timing.length > 2000) metrics.timing.shift();
      get("debug").textContent = JSON.stringify(
        {
          state: transport.state,
          seconds: presentation.seconds,
          loading: model,
          ...world.diagnostics(),
        },
        null,
        2,
      );
      lastUI = now;
    }
    dirty = false;
  }
  if (active || animating || ui.anyOpen() || dirty)
    raf = requestAnimationFrame(tick);
}
function expose() {
  get("developer").hidden = false;
  Object.assign(window, {
    __BUMER__: {
      transport,
      playback,
      world,
      features,
      metrics,
      pointer,
      loading,
      lifecycle: () => ({
        visibleSeconds,
        fieldEntered,
        raf,
        ready,
        lost,
        loading: loading.sample(visibleSeconds, { reduced: gentle.checked }),
        finish: thankYouAt(transport.presentationEndAge, {
          reduced: gentle.checked,
        }),
        tones: tones?.activeVoices(),
      }),
      seek: (t: number) => {
        transport.seek(t);
        world?.reset(t);
        invalidate();
      },
      resetMetrics: () => {
        metrics.intervals.length = 0;
        metrics.timing.length = 0;
        world!.gpuSamples.length = 0;
      },
      decodeRecord: () => ({
        hash: transport.hash,
        duration: transport.duration,
        sampleRate: transport.sampleRate,
        length: transport.decodedBuffer!.length,
        channels: transport.decodedBuffer!.numberOfChannels,
        musicGain: transport.musicOutput!.gain.value,
        decodedPeak: transport.decodedPeak,
        userAgent: navigator.userAgent,
      }),
    },
  });
}
window.addEventListener(
  "pagehide",
  () => {
    disposed = true;
    ++generation;
    cancelAnimationFrame(raf);
    tones?.dispose();
    ui.dispose();
    pointer.dispose();
    world?.dispose();
    void transport.dispose();
  },
  { once: true },
);
void load();
invalidate();
