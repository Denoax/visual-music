import type { AudioTransport } from "./transport";
import { SECTION_IDS, type CueSheet } from "../show/cues";
import { labels } from "../show/choreography";
import template from "../../manifests/cues.template.json";
const get = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function createEditor(
  transport: AudioTransport,
  message: (text: string) => void,
) {
  let hash = "";
  let draft = structuredClone(template) as CueSheet;
  const rows = get<HTMLDivElement>("section-editor");
  for (const id of SECTION_IDS) {
    const row = document.createElement("div");
    row.className = "section-row";
    const label = document.createElement("span");
    label.textContent = labels[id];
    const mark = document.createElement("button");
    mark.textContent = "Mark start";
    const absent = document.createElement("button");
    absent.textContent = "Not present";
    const notes = document.createElement("input");
    notes.placeholder = "Listening note";
    notes.setAttribute("aria-label", `${labels[id]} listening note`);
    mark.onclick = () => {
      if (!transport.duration) {
        message("Load the intended recording before marking cues.");
        return;
      }
      const section = draft.sections.find((s) => s.id === id)!;
      section.start_seconds = transport.position();
      section.resolution_status = "unresolved";
      mark.textContent = `${section.start_seconds.toFixed(3)} s`;
      absent.textContent = "Not present";
    };
    absent.onclick = () => {
      const section = draft.sections.find((s) => s.id === id)!;
      section.start_seconds = section.end_seconds = null;
      section.resolution_status = "not_present";
      mark.textContent = "Mark start";
      absent.textContent = "Absent";
    };
    notes.oninput = () => {
      draft.sections.find((s) => s.id === id)!.review_notes = notes.value;
    };
    row.append(label, mark, absent, notes);
    rows.append(row);
  }
  const seek = get<HTMLInputElement>("editor-seek");
  seek.oninput = () => transport.seek(Number(seek.value));
  get<HTMLButtonElement>("editor-play").onclick = () => {
    if (transport.state === "playing") transport.pause();
    else void transport.play().catch((e) => message(String(e)));
  };
  get<HTMLButtonElement>("mark-beat").onclick = () => {
    if (!transport.duration) {
      message("Load a recording first.");
      return;
    }
    draft.markers.beats_seconds = [
      ...new Set([...draft.markers.beats_seconds, transport.position()]),
    ].sort((a, b) => a - b);
    message(
      `Marked ${draft.markers.beats_seconds.length} beat candidates. Review by listening.`,
    );
  };
  get<HTMLButtonElement>("mark-anchor").onclick = () => {
    if (!transport.duration) {
      message("Load a recording first.");
      return;
    }
    const seconds = transport.position();
    draft.anchors.push({
      seconds,
      reviewed: false,
      audio_feature: "",
      visual_event: "",
      method: "",
    });
    message(
      `Anchor candidate at ${seconds.toFixed(3)} s added to the export. Describe and review it there.`,
    );
  };
  get<HTMLButtonElement>("export-cues").onclick = () => {
    if (!transport.duration) {
      message("Load the intended recording first.");
      return;
    }
    const sections = draft.sections.filter(
      (s) => s.resolution_status !== "not_present",
    );
    sections.forEach((s, i) => {
      s.end_seconds = sections[i + 1]?.start_seconds ?? transport.duration;
    });
    draft.track_sha256 = transport.hash;
    draft.review_status = "pending";
    draft.markers.review_notes = get<HTMLTextAreaElement>("marker-notes").value;
    download("bumer-cues.review-draft.json", draft);
    download("bumer-track.review-draft.json", {
      schema_version: 1,
      requested_spotify_id: "0iVj13fDCDRM7rfYEGF50X",
      requested_artist: "Seryoga",
      requested_title: "Чёрный бумер",
      runtime_sha256: transport.hash,
      source_sha256: transport.hash,
      identity_review_status: "pending",
      identity_review_notes: get<HTMLTextAreaElement>("identity-notes").value,
      runtime_audio_mode: "user_local_file",
      runtime_audio_path: null,
      runtime_decoded_duration_seconds: transport.duration,
      runtime_sample_rate_hz: transport.sampleRate,
      runtime_decoder_record: {
        userAgent: navigator.userAgent,
        audioContextSampleRate: transport.audioContext?.sampleRate,
        channels: transport.decodedBuffer?.numberOfChannels,
      },
    });
    message(
      "Exported pending review drafts. No identity or cue approval has been inferred.",
    );
  };
  return {
    refresh() {
      if (hash === transport.hash) return;
      hash = transport.hash;
      draft = structuredClone(template) as CueSheet;
      rows.querySelectorAll("input").forEach((i) => (i.value = ""));
      rows
        .querySelectorAll("button")
        .forEach(
          (b, i) =>
            (b.textContent = i % 2 === 0 ? "Mark start" : "Not present"),
        );
      get("editor-identity").textContent = hash
        ? `${transport.filename} · ${transport.duration.toFixed(3)} s · ${transport.sampleRate} Hz · SHA-256 ${hash}`
        : "Load the intended local recording first.";
      seek.max = String(transport.duration);
      seek.disabled = !transport.duration;
      const canvas = get<HTMLCanvasElement>("waveform");
      canvas.width = 700;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 700, 100);
      const buffer = transport.decodedBuffer;
      if (!buffer) return;
      const samples = buffer.getChannelData(0);
      ctx.fillStyle = "#c8ac7d";
      for (let x = 0; x < 700; x++) {
        const start = Math.floor((x / 700) * samples.length),
          end = Math.floor(((x + 1) / 700) * samples.length);
        let peak = 0;
        for (let i = start; i < end; i++)
          peak = Math.max(peak, Math.abs(samples[i]));
        ctx.fillRect(x, 50 - peak * 45, 1, Math.max(1, peak * 90));
      }
    },
    update() {
      if (!get<HTMLDialogElement>("editor").open) return;
      seek.value = String(transport.position());
      get("editor-time").textContent = `${transport.position().toFixed(3)} s`;
    },
  };
}
