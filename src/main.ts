import "./style.css";
import { AudioTransport } from "./audio/transport";
import { createWorld, type Quality } from "./scene/world";
import { validateScore, TRACK_HASH } from "./show/cues";
import {
  evaluateShow,
  sampleFeatures,
  type FeatureData,
  type ShowFrame,
} from "./show/choreography";
import rawScore from "../show/score.json";
const score = validateScore(rawScore),
  query = new URLSearchParams(location.search),
  development = query.get("dev") === "1";
const get = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const button = (id: string) => get<HTMLButtonElement>(id),
  input = (id: string) => get<HTMLInputElement>(id);
const canvas = get<HTMLCanvasElement>("world"),
  transport = new AudioTransport();
const reduced = input("reduced");
reduced.checked = matchMedia("(prefers-reduced-motion: reduce)").matches;
const quality = get<HTMLSelectElement>("quality");
quality.value = innerWidth < 700 ? "low" : "high";
let world: Awaited<ReturnType<typeof createWorld>> | null = null,
  features: FeatureData | null = null;
let featureError = "",
  audioReady = false,
  sceneGeneration = 0,
  loadGeneration = 0,
  sceneError = "",
  audioError = "",
  started = false,
  contextLost = false;
let frame: ShowFrame | null = null,
  dirty = true,
  lastFrame = 0,
  lastUi = 0,
  previousSong = 0,
  hideControls = 0;
const pointer = { x: 0, y: 0 },
  targetPointer = { x: 0, y: 0 };
const metrics = {
  intervals: [] as number[],
  anchors: [] as {
    id: string;
    scheduled_seconds: number;
    observed_seconds: number;
    lateness_ms: number;
  }[],
  clock: transport.clockSamples,
};
const observed = new Set<string>();
const format = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function status(message: string) {
  get("status").textContent = message;
}
function revealControls() {
  if (!started) return;
  document.body.classList.add("controls-visible");
  window.clearTimeout(hideControls);
  hideControls = window.setTimeout(() => {
    if (transport.state === "playing")
      document.body.classList.remove("controls-visible");
  }, 2800);
}
function resetInteraction() {
  world?.resetInteractions();
  pointer.x = pointer.y = targetPointer.x = targetPointer.y = 0;
  dirty = true;
}
function updateControls() {
  const playing = transport.state === "playing";
  const prepared =
    audioReady &&
    Boolean(world || sceneError) &&
    Boolean(features || featureError);
  button("play").disabled = !prepared;
  button("start").disabled = !prepared;
  button("play").textContent = playing ? "Ⅱ" : "▷";
  button("play").setAttribute("aria-label", playing ? "Pause" : "Play");
  button("mute").textContent = transport.isMuted ? "×" : "♪";
  button("mute").setAttribute(
    "aria-label",
    transport.isMuted ? "Unmute" : "Mute",
  );
  button("mute").setAttribute("aria-pressed", String(transport.isMuted));
  input("seek").disabled = !audioReady;
  input("seek").max = String(transport.duration || score.duration_seconds);
  input("volume").value = String(transport.volumeLevel);
  get("duration").textContent = format(
    transport.duration || score.duration_seconds,
  );
  get("start-label").textContent =
    audioReady && (world || sceneError) ? "Play" : "Preparing the light…";
  get("ending").hidden = transport.state !== "ended";
  if (!playing) revealControls();
  dirty = true;
}
transport.onChange = updateControls;
function recovery() {
  const error = audioError || sceneError;
  get("recovery").hidden = !error;
  get("recovery-message").textContent = error;
  get("recovery-title").textContent = audioError
    ? "The recording couldn’t load."
    : "The light field is unavailable.";
  button("retry-audio").hidden = !audioError;
  button("choose-file").hidden = !audioError;
  button("retry-scene").hidden = !sceneError;
}
async function loadAudio(file?: File) {
  const request = ++loadGeneration;
  audioReady = false;
  audioError = "";
  status("Verifying and preparing the recording…");
  updateControls();
  recovery();
  try {
    if (!file) {
      const controller = new AbortController(),
        timeout = window.setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}audio/chernyy-bumer.mp3`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(`Song returned HTTP ${response.status}.`);
        file = new File([await response.arrayBuffer()], "chernyy-bumer.mp3", {
          type: "audio/mpeg",
        });
      } finally {
        clearTimeout(timeout);
      }
    }
    if (request !== loadGeneration) return;
    const accepted = await transport.load(file, TRACK_HASH);
    if (!accepted || request !== loadGeneration) return;
    if (Math.abs(transport.duration - score.duration_seconds) > 0.1)
      throw new Error(
        "The browser decode differs from the measured recording by more than 100 ms. Check the recording and decoder.",
      );
    audioReady = true;
    transport.calibrationOffsetMs = score.calibration_offset_ms;
    if (development && query.has("t")) transport.seek(Number(query.get("t")));
    status("");
  } catch (e) {
    if (request === loadGeneration) {
      audioError = `${e instanceof Error ? e.message : String(e)} Retry, or choose the supplied MP3.`;
      status("");
    }
  }
  updateControls();
  recovery();
  dirty = true;
}
async function loadScene() {
  const request = ++sceneGeneration;
  sceneError = "";
  recovery();
  try {
    world?.dispose();
    world = null;
    const built = await createWorld(canvas, score, quality.value as Quality);
    if (request !== sceneGeneration) {
      built.dispose();
      return;
    }
    world = built;
    contextLost = false;
  } catch (e) {
    if (request === sceneGeneration)
      sceneError = `${e instanceof Error ? e.message : String(e)} Audio and playback controls remain available.`;
  }
  updateControls();
  recovery();
  dirty = true;
}
async function play() {
  try {
    if (!audioReady || (!world && !sceneError) || (!features && !featureError))
      return;
    if (transport.state === "playing") {
      transport.pause();
      return;
    }
    if (transport.state === "ended") {
      resetInteraction();
      transport.seek(0);
      previousSong = 0;
      observed.clear();
    }
    await transport.play();
    started = true;
    get("entrance").classList.add("leaving");
    window.setTimeout(() => {
      if (started) get("entrance").hidden = true;
    }, 900);
    status("");
    revealControls();
  } catch (e) {
    status(
      `${e instanceof Error ? e.message : String(e)} Press Play to retry.`,
    );
  }
}
button("start").onclick = () => void play();
button("play").onclick = () => void play();
button("replay").onclick = () => {
  resetInteraction();
  previousSong = 0;
  observed.clear();
  transport.seek(0);
  void play();
};
function seek(seconds: number) {
  transport.seek(seconds);
  previousSong = seconds;
  resetInteraction();
  observed.clear();
  revealControls();
}
input("seek").oninput = () => seek(Number(input("seek").value));
input("volume").oninput = () => {
  transport.setVolume(Number(input("volume").value));
  revealControls();
};
button("mute").onclick = () => {
  transport.setMuted(!transport.isMuted);
  updateControls();
};
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (e) {
    status(
      `Fullscreen unavailable: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
button("fullscreen").onclick = () => void fullscreen();
button("settings-button").onclick = () => {
  revealControls();
  get<HTMLDialogElement>("settings").showModal();
};
get<HTMLDialogElement>("settings").addEventListener("close", () =>
  canvas.focus({ preventScroll: true }),
);
reduced.onchange = () => {
  dirty = true;
  resetInteraction();
};
quality.onchange = () => {
  transport.pause();
  void loadScene();
};
button("retry-audio").onclick = () => void loadAudio();
button("retry-scene").onclick = () => {
  if (contextLost) world?.restoreContext();
  else void loadScene();
};
button("choose-file").onclick = () => input("audio-file").click();
input("audio-file").onchange = () => {
  const file = input("audio-file").files?.[0];
  if (file) void loadAudio(file);
  input("audio-file").value = "";
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    transport.pause();
    resetInteraction();
  }
});
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  contextLost = true;
  transport.pause();
  sceneError =
    "Graphics context was lost. Retry the scene; the recording stays loaded.";
  recovery();
});
canvas.addEventListener("webglcontextrestored", () => void loadScene());
window.addEventListener("resize", () => {
  world?.resize();
  dirty = true;
});
window.addEventListener("pointermove", (e) => {
  if (e.target === canvas) {
    targetPointer.x = Math.max(
      -1,
      Math.min(1, (e.clientX / innerWidth) * 2 - 1),
    );
    targetPointer.y = Math.max(
      -1,
      Math.min(1, 1 - (e.clientY / innerHeight) * 2),
    );
    dirty = true;
  }
  revealControls();
});
canvas.addEventListener("pointerleave", () => {
  targetPointer.x = targetPointer.y = 0;
  dirty = true;
});
let press: { x: number; y: number } | null = null;
canvas.addEventListener("pointerdown", (e) => {
  press = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointerup", (e) => {
  if (
    press &&
    Math.hypot(e.clientX - press.x, e.clientY - press.y) < 15 &&
    frame &&
    transport.state === "playing"
  ) {
    world?.tap(
      (e.clientX / innerWidth) * 2 - 1,
      1 - (e.clientY / innerHeight) * 2,
      frame,
    );
    dirty = true;
  }
  press = null;
});
document.addEventListener("focusin", revealControls);
document.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (
    ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(target.tagName) ||
    get<HTMLDialogElement>("settings").open
  )
    return;
  if (e.code === "Space") {
    e.preventDefault();
    void play();
  } else if (e.key.toLowerCase() === "m") button("mute").click();
  else if (e.key.toLowerCase() === "f") void fullscreen();
  else if (e.key === "ArrowRight") {
    e.preventDefault();
    seek(transport.position() + 5);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    seek(transport.position() - 5);
  }
  revealControls();
});
function tick(now: number) {
  requestAnimationFrame(tick);
  const playing = transport.state === "playing",
    seconds = transport.visualPosition(now),
    dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
  if (development && playing && lastFrame && metrics.intervals.length < 40000)
    metrics.intervals.push(now - lastFrame);
  lastFrame = now;
  const moving =
    Math.abs(pointer.x - targetPointer.x) +
      Math.abs(pointer.y - targetPointer.y) >
    0.002;
  pointer.x += (targetPointer.x - pointer.x) * (1 - Math.exp(-dt * 8));
  pointer.y += (targetPointer.y - pointer.y) * (1 - Math.exp(-dt * 8));
  if ((playing || dirty || moving) && world && !contextLost) {
    const bands = features
      ? sampleFeatures(features, seconds)
      : { low: 0, mid: 0, high: 0, flux: 0 };
    frame = evaluateShow(
      score,
      seconds,
      bands,
      innerWidth < 700,
      reduced.checked,
    );
    world.render(frame, pointer, reduced.checked);
    dirty = false;
  }
  if (development && playing && seconds >= previousSong) {
    for (const event of score.events)
      if (
        event.seconds > previousSong &&
        event.seconds <= seconds &&
        !observed.has(event.id)
      ) {
        observed.add(event.id);
        metrics.anchors.push({
          id: event.id,
          scheduled_seconds: event.seconds,
          observed_seconds: seconds,
          lateness_ms: (seconds - event.seconds) * 1000,
        });
      }
  }
  previousSong = seconds;
  if (now - lastUi > 150) {
    lastUi = now;
    input("seek").value = String(transport.position());
    get("time").textContent = format(transport.position());
    if (development)
      get("debug").textContent =
        `${seconds.toFixed(3)} s · ${transport.state}\n${transport.clockQuality}\n${world ? JSON.stringify(world.diagnostics()) : "Renderer unavailable"}`;
  }
}
if (development) {
  get("developer").hidden = false;
  const api = {
    transport,
    score,
    getFrame: () => frame,
    seek,
    metrics,
    world: () => world,
    resetMetrics: () => {
      metrics.intervals.length = metrics.anchors.length = 0;
      observed.clear();
      previousSong = transport.visualPosition();
    },
    decodeRecord: () => ({
      hash: transport.hash,
      duration: transport.duration,
      length: transport.decodedBuffer?.length,
      sampleRate: transport.sampleRate,
      channels: transport.decodedBuffer?.numberOfChannels,
      calibrationOffsetMs: transport.calibrationOffsetMs,
    }),
  };
  Object.assign(window, { __BUMER__: api });
}
async function initialise() {
  const data = fetch(`${import.meta.env.BASE_URL}data/features.json`)
    .then(async (r) => {
      if (!r.ok) throw new Error(`Analysis returned HTTP ${r.status}`);
      const value = (await r.json()) as FeatureData;
      if (
        value.runtime_sha256 !== TRACK_HASH ||
        !Array.isArray(value.samples) ||
        !value.samples.length ||
        value.samples.some(
          (r) => r.length !== 5 || r.some((n) => !Number.isFinite(n) || n < 0),
        ) ||
        !Number.isFinite(value.hop_seconds) ||
        value.hop_seconds <= 0
      )
        throw new Error("Invalid audio-feature data.");
      features = value;
      dirty = true;
    })
    .catch((e) => {
      featureError = `Surface detail unavailable: ${e instanceof Error ? e.message : String(e)}. The authored show remains available.`;
      status(featureError);
    });
  await Promise.all([loadAudio(), loadScene(), data]);
  if (featureError) status(featureError);
  updateControls();
}
updateControls();
requestAnimationFrame(tick);
void initialise();
