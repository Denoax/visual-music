import { test } from "node:test";
import assert from "node:assert/strict";
import { AudioTransport } from "../src/audio/transport.ts";
class Source {
  buffer: unknown;
  playbackRate = { value: 1 };
  onended: (() => void) | null = null;
  started = false;
  stopped = false;
  disconnected = false;
  offset = 0;
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
  stop() {
    this.stopped = true;
  }
  start(_when: number, offset: number) {
    this.started = true;
    this.offset = offset;
  }
}
class Context {
  currentTime = 0;
  state = "running";
  sampleRate = 48000;
  destination = {};
  sources: Source[] = [];
  listeners: (() => void)[] = [];
  gain = {
    gain: {
      value: 1,
      setTargetAtTime: (v: number) => {
        this.gain.gain.value = v;
      },
    },
    connect: () => {},
  };
  resumeBlock: Promise<void> | null = null;
  addEventListener(_name: string, listener: () => void) {
    this.listeners.push(listener);
  }
  createGain() {
    return this.gain;
  }
  createBufferSource() {
    const source = new Source();
    this.sources.push(source);
    return source;
  }
  async decodeAudioData() {
    return { duration: 100, sampleRate: 48000 };
  }
  async resume() {
    if (this.resumeBlock) await this.resumeBlock;
    this.state = "running";
  }
  async close() {
    this.state = "closed";
  }
  getOutputTimestamp() {
    return { contextTime: this.currentTime - 0.02, performanceTime: 1000 };
  }
}
async function setup() {
  const context = new Context();
  const transport = new AudioTransport(
    () => context as unknown as AudioContext,
  );
  await transport.load(new File(["synthetic fixture"], "fixture.wav"));
  return { transport, context };
}
test("pause/resume and seek replace sources and preserve offsets and volume", async () => {
  const { transport, context } = await setup();
  transport.setVolume(0.35);
  await transport.play();
  context.currentTime = 10.04;
  assert.equal(transport.position(), 10);
  transport.pause();
  assert.equal(transport.position(), 10);
  assert.ok(context.sources[0].stopped);
  assert.ok(context.sources[0].disconnected);
  context.currentTime = 25;
  await transport.play();
  assert.equal(context.sources[1].offset, 10);
  transport.seek(70);
  assert.equal(context.sources[2].offset, 70);
  assert.ok(context.sources[1].stopped);
  assert.equal(context.gain.gain.value, 0.35);
  transport.setMuted(true);
  assert.equal(context.gain.gain.value, 0);
  assert.equal(transport.position(), 70);
});
test("repeated async play cannot overlap sources and pause cancels pending start", async () => {
  const { transport, context } = await setup();
  let resolve!: () => void;
  context.resumeBlock = new Promise((r) => (resolve = r));
  const a = transport.play(),
    b = transport.play();
  resolve();
  await Promise.all([a, b]);
  assert.equal(context.sources.length, 1);
  transport.pause();
  context.resumeBlock = new Promise((r) => (resolve = r));
  const pending = transport.play();
  transport.pause();
  resolve();
  await pending;
  assert.equal(context.sources.length, 1);
});
test("obsolete source end cannot end a replacement and replay starts at zero", async () => {
  const { transport, context } = await setup();
  await transport.play();
  const oldEnd = context.sources[0].onended!;
  transport.seek(30);
  oldEnd();
  assert.equal(transport.state, "playing");
  context.sources[1].onended!();
  assert.equal(transport.state, "ended");
  assert.equal(transport.position(), 100);
  await transport.replay();
  assert.equal(context.sources.at(-1)?.offset, 0);
  assert.equal(
    context.sources.filter((s) => s.started && !s.stopped && !s.disconnected)
      .length,
    1,
  );
});
test("unexpected context suspension freezes at graph time", async () => {
  const { transport, context } = await setup();
  await transport.play();
  context.currentTime = 4.04;
  context.state = "suspended";
  context.listeners.forEach((f) => f());
  assert.equal(transport.state, "paused");
  assert.equal(transport.position(), 4);
  assert.ok(context.sources[0].stopped);
});
test("invalid or oversized input does not replace the accepted buffer", async () => {
  const { transport } = await setup();
  const hash = transport.hash;
  await assert.rejects(transport.load(new File([], "empty.wav")), /smaller/);
  assert.equal(transport.hash, hash);
});
