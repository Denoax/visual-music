import {
  songAtContextTime,
  visualSongTime,
  presentationContextTime,
} from "../../core/audio-time.mjs";
import { FINISH_SECONDS } from "../../core/opening-layers.mjs";
import { recordTrace } from "../trace";
export type TransportState = "empty" | "ready" | "playing" | "paused" | "ended";
export class AudioTransport {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private generation = 0;
  private loadingGeneration = 0;
  private anchor = {
    contextStartSeconds: 0,
    sourceOffsetSeconds: 0,
    durationSeconds: 1,
  };
  private frozenSeconds = 0;
  private lastPosition = 0;
  private graphEnded = false;
  private naturalPresented = false;
  private finishAnchor: number | null = null;
  private frozenFinishAge = 0;
  private finishingPaused = false;
  private finishCompleteNotified = false;
  private lastFinishAge = 0;
  readonly completionEvents: {
    kind: "graph_end" | "presented_end";
    contextSeconds: number;
    presentedContextSeconds: number;
  }[] = [];
  private volume = 0.7;
  private muted = false;
  private musicTrim = 0.684751836;
  private reservedPeak = 0;
  private reservedUntil = 0;
  decodedPeak = 0;
  state: TransportState = "empty";
  hash = "";
  filename = "";
  clockQuality = "frozen";
  /** Positive values advance visuals. Zero until measured output calibration exists. */
  calibrationOffsetMs = 0;
  clockSamples = { output: 0, fallback: 0 };
  readonly sourceEvents: {
    contextSeconds: number;
    offsetSeconds: number;
    kind: "start" | "stop";
  }[] = [];
  onChange: () => void = () => {};
  constructor(
    private readonly createContext: () => AudioContext = () =>
      new AudioContext({ latencyHint: "interactive" }),
    private readonly displayNow: () => number = () => performance.now(),
  ) {}
  get volumeLevel() {
    return this.volume;
  }
  get isMuted() {
    return this.muted;
  }
  get duration() {
    return this.buffer?.duration ?? 0;
  }
  get sampleRate() {
    return this.buffer?.sampleRate ?? 0;
  }
  get decodedBuffer() {
    return this.buffer;
  }
  get audioContext() {
    return this.context;
  }
  get masterOutput() {
    return this.gain;
  }
  get musicOutput() {
    return this.musicGain;
  }
  get scheduledStart() {
    return this.anchor.contextStartSeconds;
  }
  /** One user gesture unlocks the shared context without starting the song. */
  async unlock() {
    const context = this.ensureContext();
    await context.resume();
    if (context.state !== "running")
      throw new Error("Audio could not resume. Try again.");
    return context;
  }
  private ensureContext() {
    if (!this.context) {
      this.context = this.createContext();
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 1;
      this.gain = this.context.createGain();
      this.gain.gain.value = this.muted ? 0 : this.volume;
      this.gain.connect(this.context.destination);
      this.musicGain.connect(this.gain);
      this.context.addEventListener("statechange", () => {
        if (this.context?.state !== "running" && this.state === "playing") {
          // Freeze at the graph coordinate; the wall clock never owns song state.
          this.frozenSeconds = this.position();
          this.stopSource();
          this.state = "paused";
          this.onChange();
        } else if (this.context?.state !== "running" && this.naturalPresented) {
          this.frozenFinishAge = this.lastFinishAge;
          this.finishingPaused = true;
          this.onChange();
        }
      });
    }
    return this.context;
  }
  async load(file: File, expectedHash?: string, onBytesAccepted?: () => void) {
    const request = ++this.loadingGeneration;
    this.pause();
    if (!file.size || file.size > 80 * 1024 * 1024)
      throw new Error("Choose an audio file smaller than 80 MiB.");
    const context = this.ensureContext();
    const bytes = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    if (expectedHash && hash !== expectedHash)
      throw new Error(
        "The recording does not match the supplied song. Restore the original MP3.",
      );
    onBytesAccepted?.();
    let buffer: AudioBuffer;
    try {
      buffer = await context.decodeAudioData(bytes.slice(0));
    } catch {
      throw new Error(
        "This audio could not be decoded. Choose an MP3, WAV, FLAC or M4A file.",
      );
    }
    if (request !== this.loadingGeneration) return false;
    if (buffer.duration <= 0)
      throw new Error("The recording is empty. Choose another file.");
    this.stopSource();
    this.buffer = buffer;
    this.decodedPeak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      for (const sample of buffer.getChannelData(channel))
        this.decodedPeak = Math.max(this.decodedPeak, Math.abs(sample));
    }
    this.musicGain!.gain.value = this.musicTrim;
    this.hash = hash;
    this.filename = file.name;
    this.anchor = {
      contextStartSeconds: 0,
      sourceOffsetSeconds: 0,
      durationSeconds: buffer.duration,
    };
    this.frozenSeconds = this.lastPosition = 0;
    this.resetCompletion();
    this.state = "ready";
    this.onChange();
    return true;
  }
  position() {
    if (this.state !== "playing" || !this.context) return this.frozenSeconds;
    this.lastPosition = songAtContextTime(
      this.anchor,
      this.context.currentTime,
    );
    return this.lastPosition;
  }
  private sample(displayPerformanceMs = this.displayNow(), lead = 0) {
    return {
      contextState: this.context!.state,
      contextCurrentSeconds: this.context!.currentTime,
      performanceNowMs: displayPerformanceMs,
      frozenSongSeconds: this.lastPosition,
      outputTimestamp: this.context!.getOutputTimestamp?.(),
      visualLeadMs: lead,
      fallbackLatencySeconds:
        (this.context!.baseLatency ?? 0) + (this.context!.outputLatency ?? 0),
    };
  }
  presentation(displayPerformanceMs = this.displayNow()) {
    if (!this.context)
      return {
        seconds: this.frozenSeconds,
        endAge: null as number | null,
        quality: "frozen",
      };
    if (
      this.state !== "playing" &&
      !(this.state === "ended" && this.naturalPresented)
    )
      return {
        seconds: this.frozenSeconds,
        endAge: null as number | null,
        quality: "frozen",
      };
    const sample = this.sample(displayPerformanceMs, this.calibrationOffsetMs);
    const view = visualSongTime(this.anchor, sample);
    this.clockQuality = view.clockQuality;
    if (view.clockQuality === "output_estimate") this.clockSamples.output++;
    else this.clockSamples.fallback++;
    const raw = presentationContextTime({ ...sample, visualLeadMs: 0 });
    const end =
      this.anchor.contextStartSeconds +
      this.duration -
      this.anchor.sourceOffsetSeconds;
    if (
      this.state === "playing" &&
      this.graphEnded &&
      raw.contextSeconds >= end
    ) {
      this.naturalPresented = true;
      this.finishAnchor = raw.contextSeconds;
      this.frozenSeconds = this.duration;
      this.state = "ended";
      recordTrace(this.completionEvents, {
        kind: "presented_end",
        contextSeconds: this.context.currentTime,
        presentedContextSeconds: raw.contextSeconds,
      });
      this.onChange();
    }
    const age = this.naturalPresented
      ? this.finishingPaused
        ? this.frozenFinishAge
        : Math.max(
            this.lastFinishAge,
            0,
            raw.contextSeconds - this.finishAnchor!,
          )
      : null;
    this.lastFinishAge = age ?? 0;
    if (age !== null && age >= FINISH_SECONDS && !this.finishCompleteNotified) {
      this.finishCompleteNotified = true;
      this.onChange();
    }
    return {
      seconds: this.state === "ended" ? this.duration : view.seconds,
      endAge: age,
      quality: view.clockQuality,
    };
  }
  visualPosition(displayPerformanceMs = this.displayNow()) {
    return this.presentation(displayPerformanceMs).seconds;
  }
  get visualOutroPaused() {
    return this.finishingPaused && this.naturalPresented;
  }
  get presentationEndAge() {
    return this.presentation().endAge;
  }
  get visualOutroComplete() {
    const age = this.presentationEndAge;
    return age !== null && age >= FINISH_SECONDS;
  }
  get hasPresentedEnd() {
    return this.naturalPresented;
  }
  get visualActive() {
    return this.naturalPresented && !this.finishingPaused;
  }
  get visualPaused() {
    return this.naturalPresented && this.finishingPaused;
  }
  // Presented end age also owns the finite thank-you lifecycle.
  private resetCompletion() {
    this.graphEnded = false;
    this.naturalPresented = false;
    this.finishAnchor = null;
    this.frozenFinishAge = 0;
    this.finishingPaused = false;
    this.finishCompleteNotified = false;
    this.lastFinishAge = 0;
  }
  private stopSource() {
    ++this.generation;
    if (this.source) {
      recordTrace(this.sourceEvents, {
        kind: "stop",
        contextSeconds: this.context?.currentTime ?? 0,
        offsetSeconds: this.position(),
      });
      this.source.onended = null;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }
  private start(offset: number, contextStart?: number) {
    if (!this.context || !this.buffer || !this.gain) return;
    this.stopSource();
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = 1;
    source.connect(this.musicGain!);
    const token = this.generation;
    this.anchor = {
      contextStartSeconds: contextStart ?? this.context.currentTime + 0.04,
      sourceOffsetSeconds: offset,
      durationSeconds: this.duration,
    };
    this.frozenSeconds = this.lastPosition = offset;
    this.resetCompletion();
    source.onended = () => {
      if (token !== this.generation) return;
      source.disconnect();
      this.source = null;
      // Graph completion is not destination presentation. Keep sampling the
      // same output clock until the queued final samples are acknowledged.
      this.graphEnded = true;
      recordTrace(this.completionEvents, {
        kind: "graph_end",
        contextSeconds: this.context!.currentTime,
        presentedContextSeconds: presentationContextTime(this.sample())
          .contextSeconds,
      });
    };
    this.source = source;
    source.start(this.anchor.contextStartSeconds, offset);
    recordTrace(this.sourceEvents, {
      kind: "start",
      contextSeconds: this.anchor.contextStartSeconds,
      offsetSeconds: offset,
    });
    this.state = "playing";
    this.onChange();
  }
  /** Only the controller's guarded, ready field handoff calls this. */
  scheduleFromZero(contextStart: number) {
    if (!this.context || this.context.state !== "running" || !this.buffer)
      throw new Error("Prepare and unlock audio before field handoff.");
    if (
      this.source ||
      this.frozenSeconds !== 0 ||
      !Number.isFinite(contextStart) ||
      contextStart < this.context.currentTime
    )
      throw new Error("Invalid or repeated field handoff.");
    this.start(0, contextStart);
    return contextStart;
  }
  presentationHasStarted(displayMs = this.displayNow()) {
    if (!this.context || this.state !== "playing") return false;
    const timestamp = this.context.getOutputTimestamp?.();
    let estimate = this.context.currentTime;
    if (
      timestamp &&
      typeof timestamp.performanceTime === "number" &&
      typeof timestamp.contextTime === "number" &&
      timestamp.performanceTime > 0 &&
      displayMs - timestamp.performanceTime >= -50 &&
      displayMs - timestamp.performanceTime <= 250
    )
      estimate =
        timestamp.contextTime + (displayMs - timestamp.performanceTime) / 1000;
    return estimate >= this.anchor.contextStartSeconds;
  }
  async play() {
    if (!this.buffer || this.state === "playing") return;
    const token = ++this.generation;
    const context = this.ensureContext();
    await context.resume();
    if (token !== this.generation) return;
    if (context.state !== "running")
      throw new Error("Audio could not resume. Press Play to retry.");
    if (
      this.state === "paused" &&
      this.graphEnded &&
      this.frozenSeconds >= this.duration &&
      !this.naturalPresented
    ) {
      this.state = "playing";
      this.onChange();
      return; // remaining destination drain, no duplicate music source
    }
    this.start(this.state === "ended" ? 0 : this.frozenSeconds);
  }
  pause() {
    if (this.state === "ended" && this.naturalPresented) {
      this.frozenFinishAge = this.presentationEndAge ?? 0;
      this.finishingPaused = true;
      this.onChange();
      return;
    }
    const wasPlaying = this.state === "playing";
    this.frozenSeconds = this.position();
    if (wasPlaying && this.frozenSeconds >= this.duration)
      this.graphEnded = true;
    this.stopSource();
    if (this.buffer)
      this.state =
        wasPlaying && this.graphEnded
          ? "paused"
          : this.frozenSeconds >= this.duration
            ? "ended"
            : "paused";
    this.onChange();
  }
  seek(seconds: number) {
    if (!this.buffer || !Number.isFinite(seconds)) return;
    const playing = this.state === "playing";
    this.stopSource();
    this.resetCompletion();
    this.frozenSeconds = this.lastPosition = Math.max(
      0,
      Math.min(this.duration, seconds),
    );
    this.state = this.frozenSeconds >= this.duration ? "ended" : "paused";
    if (
      playing &&
      this.frozenSeconds < this.duration &&
      this.context?.state === "running"
    )
      this.start(this.frozenSeconds);
    else this.onChange();
  }
  resumeVisualOutro() {
    if (
      this.naturalPresented &&
      this.finishingPaused &&
      this.context?.state === "running"
    ) {
      this.finishAnchor =
        presentationContextTime(this.sample()).contextSeconds -
        this.frozenFinishAge;
      this.finishingPaused = false;
    }
  }
  async replay() {
    this.seek(0);
    await this.play();
  }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    this.applyGain();
  }
  setMuted(value: boolean) {
    this.muted = value;
    this.applyGain();
  }
  private applyGain() {
    if (this.gain && this.context)
      this.gain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.context.currentTime,
        0.015,
      );
  }
  /** Reserve on the music bus; master volume/mute remain authoritative. Multiple
   * reservations share the longest decay window and conservative peak bound. */
  reserveUiHeadroom(peak: number, at: number, until: number) {
    if (
      !this.context ||
      !this.musicGain ||
      !Number.isFinite(peak) ||
      peak < 0 ||
      until < at
    )
      return;
    const now = this.context.currentTime;
    this.reservedPeak =
      now < this.reservedUntil ? Math.max(peak, this.reservedPeak) : peak;
    this.reservedUntil = Math.max(until, this.reservedUntil);
    const allowed = Math.min(
      this.musicTrim,
      Math.max(0, (0.95 - this.reservedPeak) / Math.max(1, this.decodedPeak)),
    );
    const gain = this.musicGain.gain;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(allowed, now, 0.004);
    gain.setTargetAtTime(this.musicTrim, this.reservedUntil + 0.015, 0.02);
  }
  /** Developer recording tap, downstream of volume. It never creates a second source. */
  captureOutput() {
    if (!this.context || !this.gain)
      throw new Error("Load audio before recording.");
    const output = this.context.createMediaStreamDestination();
    this.gain.connect(output);
    return {
      stream: output.stream,
      dispose: () => {
        this.gain?.disconnect(output);
        output.stream.getTracks().forEach((track) => track.stop());
      },
    };
  }
  async dispose() {
    ++this.loadingGeneration;
    this.pause();
    this.buffer = null;
    await this.context?.close();
  }
}
