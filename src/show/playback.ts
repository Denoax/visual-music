import { AudioTransport } from "../audio/transport";

/** Owns user operations; audio transport owns source generations and song time. */
export class ShowPlayback {
  private operation = 0;
  private pending = false;
  started = false;
  constructor(readonly music: AudioTransport) {}
  get running() {
    return this.music.state === "playing";
  }
  async start() {
    if (this.pending || this.running || this.music.hasPresentedEnd) return;
    const token = ++this.operation;
    this.pending = true;
    try {
      await this.music.play();
      if (token === this.operation) this.started = this.running;
    } finally {
      if (token === this.operation) this.pending = false;
    }
  }
  /** Trusted Continue unlocks once, then schedules sample zero after its chime. */
  async enter(onUnlocked: (context: AudioContext) => void, lead = 0.8) {
    if (
      this.pending ||
      this.running ||
      this.started ||
      this.music.hasPresentedEnd
    )
      return false;
    const token = ++this.operation;
    this.pending = true;
    try {
      const context = await this.music.unlock();
      if (token !== this.operation) return false;
      onUnlocked(context);
      this.music.scheduleFromZero(context.currentTime + lead);
      this.started = true;
      return true;
    } finally {
      if (token === this.operation) this.pending = false;
    }
  }
  async toggle() {
    if (this.music.hasPresentedEnd) {
      if (this.pending || !this.music.visualPaused) {
        this.pause();
        return;
      }
      const token = ++this.operation;
      this.pending = true;
      try {
        await this.music.unlock();
        if (token === this.operation) this.music.resumeVisualOutro();
      } finally {
        if (token === this.operation) this.pending = false;
      }
      return;
    }
    if (this.running || this.pending) this.pause();
    else await this.start();
  }
  pause() {
    ++this.operation;
    this.pending = false;
    this.music.pause();
  }
  replay() {
    this.pause();
    this.music.seek(0);
    this.started = false;
  }
}
