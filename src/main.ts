import "./style.css";
import { AudioTransport } from "./audio/transport";
import { createEditor } from "./audio/editor";
import { createWorld } from "./scene/world";
import {
  activeSection,
  validateCues,
  validateTrackIdentity,
  type CueSheet,
} from "./show/cues";
import { STUDY_DURATION, studyAt, labels } from "./show/choreography";
const get = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const button = (id: string) => get<HTMLButtonElement>(id);
const input = (id: string) => get<HTMLInputElement>(id);
const message = (text: string) => {
  get("status").textContent = text;
};
const transport = new AudioTransport();
let cues: CueSheet | null = null,
  mode: "entrance" | "study" | "audio" = "entrance";
let world: Awaited<ReturnType<typeof createWorld>> | null = null,
  ready = false,
  sceneAvailable = false;
let studyPlaying = false,
  studyOffset = 0,
  studyStart = 0,
  frame = 0;
const pointer = { x: 0, y: 0 };
const reduced = input("reduced");
reduced.checked = matchMedia("(prefers-reduced-motion: reduce)").matches;
const seek = input("seek");
const editor = createEditor(transport, message);
const format = (time: number) =>
  `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
function studyTime() {
  return Math.min(
    STUDY_DURATION,
    studyOffset + (studyPlaying ? (performance.now() - studyStart) / 1000 : 0),
  );
}
function currentTime() {
  return mode === "study" ? studyTime() : transport.position();
}
function showPlayback() {
  get("entrance").hidden = true;
  get("scene-caption").hidden = false;
  button("play").disabled = button("replay").disabled = seek.disabled = false;
}
function updateControls() {
  const playing =
    mode === "study" ? studyPlaying : transport.state === "playing";
  button("play").textContent = playing ? "Ⅱ" : "▶";
  button("play").setAttribute("aria-label", playing ? "Pause" : "Play");
  seek.max = String(
    mode === "study" ? STUDY_DURATION : transport.duration || STUDY_DURATION,
  );
  get("duration").textContent =
    mode === "study"
      ? format(STUDY_DURATION)
      : transport.duration
        ? format(transport.duration)
        : "—:—";
  button("play").disabled =
    button("replay").disabled =
    seek.disabled =
      !ready || (mode !== "study" && !transport.duration);
  button("study").disabled = !sceneAvailable;
  input("volume").value = input("volume-settings").value = String(
    transport.volumeLevel,
  );
  button("mute").setAttribute("aria-pressed", String(transport.isMuted));
  button("mute").setAttribute(
    "aria-label",
    transport.isMuted ? "Unmute" : "Mute",
  );
  button("mute").textContent = transport.isMuted ? "×" : "♪";
  button("ignition").disabled = !ready;
  get("ignition-label").textContent = transport.duration
    ? "Start ignition"
    : "Load recording & start";
}
transport.onChange = updateControls;
function pause() {
  if (mode === "study") {
    studyOffset = studyTime();
    studyPlaying = false;
  } else transport.pause();
  updateControls();
}
async function togglePlay() {
  try {
    if (mode === "study") {
      if (studyPlaying) pause();
      else {
        if (studyOffset >= STUDY_DURATION) studyOffset = 0;
        studyStart = performance.now();
        studyPlaying = true;
        updateControls();
      }
    } else if (transport.state === "playing") pause();
    else if (transport.duration) await transport.play();
    else input("audio-file").click();
  } catch (e) {
    message(
      `Playback could not start: ${e instanceof Error ? e.message : String(e)}. Press play to retry.`,
    );
  }
}
button("ignition").onclick = async () => {
  if (!transport.duration) {
    input("audio-file").click();
    return;
  }
  mode = "audio";
  showPlayback();
  get("study-tag").textContent = cues
    ? "LOCAL RECORDING"
    : "CUE REVIEW PENDING";
  get("mode-label").textContent = "Seryoga · local recording";
  message(
    cues
      ? "Recording and reviewed scene share the audio clock."
      : "Audio plays locally. Song choreography stays at ignition until its cues are reviewed.",
  );
  await togglePlay();
};
button("study").onclick = () => {
  if (!ready) return;
  transport.pause();
  mode = "study";
  studyOffset = 0;
  studyStart = performance.now();
  studyPlaying = true;
  showPlayback();
  get("study-tag").textContent = "SILENT SCENE STUDY";
  get("mode-label").textContent = "Scene study · no soundtrack";
  get("track-title").textContent = "BUMER.EXE";
  message("A silent tour of the compositions. These are not song timings.");
  updateControls();
};
button("play").onclick = () => void togglePlay();
button("replay").onclick = () => {
  if (mode === "study") {
    studyOffset = 0;
    studyStart = performance.now();
    studyPlaying = true;
    updateControls();
  } else void transport.replay().catch((e) => message(String(e)));
};
seek.oninput = () => {
  const t = Number(seek.value);
  if (mode === "study") {
    studyOffset = t;
    studyStart = performance.now();
  } else transport.seek(t);
};
for (const id of ["volume", "volume-settings"])
  input(id).oninput = () => {
    transport.setVolume(Number(input(id).value));
    updateControls();
  };
button("mute").onclick = () => {
  transport.setMuted(!transport.isMuted);
  updateControls();
};
button("load-audio").onclick = () => input("audio-file").click();
let fileLoad = 0;
input("audio-file").onchange = async () => {
  const file = input("audio-file").files?.[0];
  if (!file) return;
  const request = ++fileLoad;
  pause();
  cues = null;
  message("Reading local bytes and decoding the recording…");
  try {
    const applied = await transport.load(file);
    if (!applied || request !== fileLoad) return;
    mode = "audio";
    showPlayback();
    get("study-tag").textContent = "CUE REVIEW PENDING";
    get("mode-label").textContent = "Local recording · cues pending";
    get("track-title").textContent = transport.filename;
    message(
      "Recording decoded. Press play to listen, or load a reviewed cue sheet in settings.",
    );
    editor.refresh();
    updateControls();
  } catch (e) {
    if (request === fileLoad)
      message(
        `${e instanceof Error ? e.message : String(e)} Use “Load local recording” to retry.`,
      );
  }
  input("audio-file").value = "";
};
for (const name of ["settings", "credits"]) {
  button(`${name}-button`).onclick = () =>
    get<HTMLDialogElement>(name).showModal();
}
for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog")) {
  dialog.querySelector<HTMLButtonElement>(".close")!.onclick = () =>
    dialog.close();
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  });
}
button("open-editor").onclick = () => {
  get<HTMLDialogElement>("settings").close();
  pause();
  editor.refresh();
  get<HTMLDialogElement>("editor").showModal();
};
button("import-cues").onclick = () => input("cue-file").click();
input("cue-file").onchange = async () => {
  const file = input("cue-file").files?.[0];
  if (!file) return;
  pause();
  try {
    if (!transport.hash) throw new Error("Load the intended recording first.");
    if (file.size > 1024 * 1024)
      throw new Error("Cue sheets must be smaller than 1 MiB.");
    const imported = JSON.parse(await file.text());
    const reviewedCues = validateCues(
      imported.cues ?? imported,
      transport.hash,
      transport.duration,
    );
    validateTrackIdentity(
      imported.track,
      transport.hash,
      transport.duration,
      transport.sampleRate,
    );
    cues = reviewedCues;
    get("track-title").textContent = "ЧЁРНЫЙ БУМЕР";
    mode = "audio";
    get("study-tag").textContent = "LOCAL RECORDING";
    message("Reviewed cue sheet matches the loaded audio bytes. Press play.");
    get<HTMLDialogElement>("settings").close();
  } catch (e) {
    cues = null;
    message(e instanceof Error ? e.message : String(e));
  }
  input("cue-file").value = "";
};
button("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    message(
      "Fullscreen is unavailable in this browser. The show works in the window.",
    );
  }
};
addEventListener("fullscreenchange", () =>
  button("fullscreen").setAttribute(
    "aria-label",
    document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
  ),
);
addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / innerWidth - 0.5) * 2;
  pointer.y = (event.clientY / innerHeight - 0.5) * 2;
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pause();
    message("Paused while the tab was hidden. Press play to resume.");
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.code !== "Space" ||
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    document.querySelector("dialog[open]") ||
    event.target instanceof HTMLButtonElement ||
    event.target instanceof HTMLAnchorElement
  )
    return;
  event.preventDefault();
  void togglePlay();
});
let lastRenderKey = "";
function render() {
  const t = currentTime();
  if (mode === "study" && t >= STUDY_DURATION && studyPlaying) {
    studyOffset = STUDY_DURATION;
    studyPlaying = false;
    message("Back in the courtyard. Replay the study, or load the recording.");
    updateControls();
  }
  const visualTime = mode === "audio" ? transport.visualPosition() : t;
  const section =
    mode === "study"
      ? studyAt(t)
      : cues
        ? activeSection(cues, visualTime)
        : { id: "intro" as const, progress: 0 };
  const intensity = Math.min(
    Number(input("intensity").value),
    input("low-flash").checked ? 0.45 : 1,
  );
  const renderKey = [
    section.id,
    section.progress,
    visualTime,
    intensity,
    reduced.checked,
    pointer.x,
    pointer.y,
    innerWidth,
    innerHeight,
  ].join("|");
  if (renderKey !== lastRenderKey) {
    world?.render(
      section.id,
      section.progress,
      mode === "audio" && !cues ? 0 : visualTime,
      intensity,
      reduced.checked,
      pointer,
    );
    lastRenderKey = renderKey;
  }
  get("scene-name").textContent = labels[section.id];
  get("time").textContent = format(t);
  seek.value = String(t);
  editor.update();
  frame = requestAnimationFrame(render);
}
async function boot() {
  try {
    world = await createWorld(get<HTMLCanvasElement>("world"), () => {
      pause();
      sceneAvailable = false;
      get("fallback").hidden = false;
      get("fallback-message").textContent =
        "The graphics context was lost. Audio has paused. Reload to rebuild the scene; the recording will need to be selected again.";
      message("Graphics paused. Reload to recover.");
      updateControls();
    });
    ready = true;
    sceneAvailable = true;
    get("fallback").hidden = true;
    updateControls();
    message(
      "Courtyard ready. Load your recording, or explore the silent scene study.",
    );
    const studyLink = new URL(location.href).searchParams.get("study");
    if (studyLink !== null && Number.isFinite(Number(studyLink))) {
      mode = "study";
      studyOffset = Math.max(0, Math.min(STUDY_DURATION, Number(studyLink)));
      studyPlaying = false;
      showPlayback();
      get("study-tag").textContent = "SILENT SCENE STUDY";
      get("mode-label").textContent = "Scene study · no soundtrack";
      message("A paused scene study. These are not song timings.");
      updateControls();
    }
    render();
  } catch (e) {
    ready = true;
    updateControls();
    get("fallback").hidden = false;
    get("fallback-message").textContent =
      `The scene could not load: ${e instanceof Error ? e.message : String(e)}. Audio controls remain available.`;
    message(
      "The scene needs a retry. You can still load and play local audio.",
    );
    render();
  }
}
button("retry").onclick = () => location.reload();
addEventListener("pagehide", () => {
  cancelAnimationFrame(frame);
  world?.dispose();
  void transport.dispose();
});
void boot();
