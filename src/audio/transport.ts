import { songAtContextTime, visualSongTime } from "../../core/audio-time.mjs";
export type TransportState = "empty" | "ready" | "playing" | "paused" | "ended";
export class AudioTransport {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
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
  private volume = 0.7;
  private muted = false;
  state: TransportState = "empty";
  hash = "";
  filename = "";
  clockQuality = "frozen";
  /** Positive values advance visuals. Zero until measured output calibration exists. */
  calibrationOffsetMs = 0;
  clockSamples = { output: 0, fallback: 0 };
  onChange: () => void = () => {};
  constructor(
    private readonly createContext: () => AudioContext = () =>
      new AudioContext({ latencyHint: "interactive" }),
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
  private ensureContext() {
    if (!this.context) {
      this.context = this.createContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = this.muted ? 0 : this.volume;
      this.gain.connect(this.context.destination);
      this.context.addEventListener("statechange", () => {
        if (this.context?.state !== "running" && this.state === "playing") {
          // Freeze at the graph coordinate; the wall clock never owns song state.
          this.frozenSeconds = this.position();
          this.stopSource();
          this.state = "paused";
          this.onChange();
        }
      });
    }
    return this.context;
  }
  async load(file: File, expectedHash?: string) {
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
    this.hash = hash;
    this.filename = file.name;
    this.anchor = {
      contextStartSeconds: 0,
      sourceOffsetSeconds: 0,
      durationSeconds: buffer.duration,
    };
    this.frozenSeconds = this.lastPosition = 0;
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
  visualPosition(displayPerformanceMs = performance.now()) {
    if (this.state !== "playing" || !this.context) {
      this.clockQuality = "frozen";
      return this.frozenSeconds;
    }
    const result = visualSongTime(this.anchor, {
      contextState: this.context.state,
      contextCurrentSeconds: this.context.currentTime,
      performanceNowMs: displayPerformanceMs,
      frozenSongSeconds: this.lastPosition,
      outputTimestamp: this.context.getOutputTimestamp?.(),
      visualLeadMs: this.calibrationOffsetMs,
      estimatedDisplayLeadMs: 0,
    });
    this.clockQuality = result.clockQuality;
    if (result.clockQuality === "output_estimate") this.clockSamples.output++;
    else this.clockSamples.fallback++;
    return result.seconds;
  }
  private stopSource() {
    ++this.generation;
    if (this.source) {
      this.source.onended = null;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }
  private start(offset: number) {
    if (!this.context || !this.buffer || !this.gain) return;
    this.stopSource();
    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = 1;
    source.connect(this.gain);
    const token = this.generation;
    this.anchor = {
      contextStartSeconds: this.context.currentTime + 0.04,
      sourceOffsetSeconds: offset,
      durationSeconds: this.duration,
    };
    this.frozenSeconds = this.lastPosition = offset;
    source.onended = () => {
      if (token !== this.generation) return;
      source.disconnect();
      this.source = null;
      this.frozenSeconds = this.duration;
      this.state = "ended";
      this.onChange();
    };
    this.source = source;
    source.start(this.anchor.contextStartSeconds, offset);
    this.state = "playing";
    this.onChange();
  }
  async play() {
    if (!this.buffer || this.state === "playing") return;
    const token = ++this.generation;
    const context = this.ensureContext();
    await context.resume();
    if (token !== this.generation) return;
    if (context.state !== "running")
      throw new Error("Audio could not resume. Press Play to retry.");
    this.start(this.state === "ended" ? 0 : this.frozenSeconds);
  }
  pause() {
    this.frozenSeconds = this.position();
    this.stopSource();
    if (this.buffer)
      this.state = this.frozenSeconds >= this.duration ? "ended" : "paused";
    this.onChange();
  }
  seek(seconds: number) {
    if (!this.buffer || !Number.isFinite(seconds)) return;
    const playing = this.state === "playing";
    this.stopSource();
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
