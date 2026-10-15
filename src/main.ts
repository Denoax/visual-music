import "./style.css";
import { bindPortfolioControls } from "./ui/controls";
import { AudioTransport } from "./audio/transport";
import { acceptMicrofeatures } from "./show/microcues";
import { ShowPlayback } from "./show/playback";
import { createWorld } from "./scene/world";
import { bindGlideInput } from "./input";
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
  transport = new AudioTransport(),
  playback = new ShowPlayback(transport);
const gentle = get<HTMLInputElement>("reduced");
gentle.checked = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pointer = bindGlideInput(canvas, () => playback.running && !ui.anyOpen());
const ui = bindPortfolioControls(
  () => pointer.clear(),
  (v) => transport.setVolume(v),
  () => {
    dirty = true;
  },
);
const dev = new URLSearchParams(location.search).get("dev") === "1";
let world: Awaited<ReturnType<typeof createWorld>> | null = null,
  features: Features | null = null;
let ready = false,
  lost = false,
  dirty = true,
  disposed = false,
  generation = 0,
  raf = 0,
  previous = 0,
  lastUI = 0,
  lastIdleDraw = 0,
  error = "";
const metrics = {
  intervals: [] as number[],
  timing: [] as {
    wallMs: number;
    song: number;
    graph: number;
    method: string;
  }[],
};
const status = (message: string) => {
  get("status").textContent = message;
};
function controls() {
  const started =
    playback.started ||
    transport.state === "playing" ||
    transport.state === "ended";
  get("entrance").hidden = started;
  get("controls").hidden = !ready;
  button("start").disabled = !ready || lost;
  button("start").textContent = ready ? "Start" : "Preparing…";
  button("play").hidden = button("replay").hidden = !started;
  button("play").disabled = lost;
  button("play").textContent = transport.visualPaused
    ? "Resume"
    : transport.hasPresentedEnd
      ? "Pause"
      : transport.state === "ended"
        ? "Play again"
        : playback.running
          ? "Pause"
          : "Resume";
  button("mute").textContent = transport.isMuted ? "Unmute" : "Mute";
  button("mute").setAttribute("aria-pressed", String(transport.isMuted));
  button("retry").hidden = !(error || lost);
  if (error) status(error);
  else if (lost) status("Graphics interrupted. Restore to continue.");
  else if (ready)
    status(
      transport.hasPresentedEnd
        ? transport.visualOutroComplete
          ? "Ambient visuals · Replay repeats the song"
          : "Settling into ambient visuals…"
        : transport.state === "ended"
          ? "Finished"
          : "",
    );
  if (!playback.running) pointer.clear();
  ui.updateNav();
  dirty = true;
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
  const token = ++generation;
  ready = false;
  error = "";
  controls();
  status("Preparing the recording…");
  try {
    const [audio, analysis, micro] = await Promise.all([
      fetchData("audio/around-the-world.mp3"),
      fetchData("analysis/features.json"),
      fetchData("analysis/mixed-microfeatures.json"),
    ]);
    const data = validateFeatures(await analysis.json());
    acceptMicrofeatures(await micro.json());
    const accepted = await transport.load(
      new File([await audio.arrayBuffer()], "around-the-world.mp3", {
        type: "audio/mpeg",
      }),
      TRACK_HASH,
    );
    if (!accepted || token !== generation || disposed) return;
    if (Math.abs(transport.duration - ANALYSIS_DURATION) > 0.03)
      throw Error(
        "Browser audio decode differs from measured analysis; restore the supplied recording.",
      );
    // Encoded bytes are untouched; gain accounts for decoded floating-point peaks.
    transport.musicOutput!.gain.value = 0.684751836;
    features = data;
    if (!world) world = await createWorld(canvas);
    if (token !== generation || disposed) return;
    ready = true;
    controls();
    if (dev) expose();
  } catch (e) {
    if (token === generation) {
      error = e instanceof Error ? e.message : String(e);
      controls();
    }
  }
}
async function act(action: () => Promise<void>) {
  if (!ready || lost) return;
  try {
    await action();
    error = "";
    controls();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    controls();
  }
}
button("start").onclick = () => void act(() => playback.start());
button("play").onclick = () => {
  if (transport.state === "ended" && !transport.hasPresentedEnd) {
    playback.replay();
    world?.reset();
    pointer.clear();
  }
  void act(() => playback.toggle());
};
button("replay").onclick = () => {
  playback.replay();
  pointer.clear();
  world?.reset();
  controls();
};
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
  dirty = true;
};
button("fullscreen").onclick = () =>
  void act(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  });
function pause() {
  if (playback.running) {
    playback.pause();
    pointer.clear();
    controls();
  } else if (transport.hasPresentedEnd) {
    transport.pause();
    pointer.clear();
    controls();
  }
}
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("keydown", (e) => {
  if (ui.anyOpen() || (e.target as HTMLElement).matches("input,button,a"))
    return;
  if (e.code === "Space") {
    e.preventDefault();
    if (e.repeat) return;
    // Keyboard and visible Play share replay/outro ownership.
    button("play").click();
  }
  if (e.code === "KeyM") {
    transport.setMuted(!transport.isMuted);
    controls();
  }
});
window.addEventListener("resize", () => {
  world?.resize();
  dirty = true;
});
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  lost = true;
  playback.pause();
  pointer.clear();
  controls();
});
canvas.addEventListener("webglcontextrestored", async () => {
  const seconds = transport.position();
  const saved = world?.snapshot();
  world?.dispose();
  world = null;
  try {
    world = await createWorld(canvas);
    if (saved) world.restore(saved);
    else world.reset(seconds);
    // Commit the restored frame before exposing ready controls. The new
    // renderer starts at the intro pose until its first presented render.
    const presentation = transport.presentation();
    world.render(
      presentation.seconds,
      pointer.state,
      gentle.checked,
      features,
      false,
      presentation.endAge,
      ui.brightnessValue,
    );
    lost = false;
    error = "";
    controls();
    if (dev) expose();
  } catch (e) {
    error = String(e);
    controls();
  }
});
function tick(now: number) {
  if (disposed) return;
  const presentation = transport.presentation(now);
  const returning =
    transport.visualActive &&
    presentation.endAge !== null &&
    presentation.endAge < 8;
  const idle =
    transport.visualActive &&
    presentation.endAge !== null &&
    presentation.endAge >= 8;
  const idleDue = idle && !gentle.checked && now - lastIdleDraw >= 1000 / 30;
  const active = playback.running || returning || idleDue;
  if (world && !lost && (active || dirty || world.startVisible())) {
    if (active && previous) {
      metrics.intervals.push(now - previous);
      if (metrics.intervals.length > 60000) metrics.intervals.shift();
    }
    previous = active ? now : 0;
    if (idle) lastIdleDraw = now;
    const t = presentation.seconds;
    world.render(
      t,
      pointer.state,
      gentle.checked,
      features,
      active,
      presentation.endAge,
      ui.brightnessValue,
    );
    if (dev && now - lastUI > 250) {
      metrics.timing.push({
        wallMs: now,
        song: t,
        graph: transport.position(),
        method: transport.clockQuality,
      });
      if (metrics.timing.length > 2000) metrics.timing.shift();
      get("debug").textContent = JSON.stringify(
        { state: transport.state, seconds: t, ...world.diagnostics() },
        null,
        2,
      );
      lastUI = now;
    }
    dirty = false;
  }
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
      seek: (t: number) => {
        transport.seek(t);
        world?.reset(t);
        dirty = true;
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
    ui.dispose();
    pointer.dispose();
    world?.dispose();
    void transport.dispose();
  },
  { once: true },
);
void load();
raf = requestAnimationFrame(tick);
