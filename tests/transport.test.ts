import { test } from "node:test";
import assert from "node:assert/strict";
import { AudioTransport } from "../src/audio/transport.ts";
import { ShowPlayback } from "../src/show/playback.ts";
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
    () => 1000,
  );
  await transport.load(new File(["synthetic fixture"], "fixture.wav"));
  return { transport, context };
}
test("Repeated sessions keep source diagnostics bounded and release every stopped source", async () => {
  const { transport, context } = await setup();
  for (let i = 0; i < 400; i++) {
    await transport.play();
    context.currentTime += 0.2;
    transport.pause();
    transport.seek(0);
  }
  assert.ok(transport.sourceEvents.length <= 600);
  assert.equal(transport.sourceEvents.at(-1)?.kind, "stop");
  assert.ok(context.sources.every((source) => source.stopped));
  assert.equal(transport.position(), 0);
});
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
  context.currentTime = transport.scheduledStart + 70;
  context.sources[1].onended!();
  assert.equal(transport.state, "playing");
  context.currentTime += 0.03;
  transport.presentation(1000);
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
test("a mismatched encoded recording cannot replace the accepted audio buffer", async () => {
  const { transport } = await setup();
  const hash = transport.hash;
  await assert.rejects(
    transport.load(new File(["wrong bytes"], "wrong.mp3"), "0".repeat(64)),
    /does not match/,
  );
  assert.equal(transport.hash, hash);
  assert.equal(transport.duration, 100);
});
test("the same encoded recording may decode at a different sample rate", async () => {
  const context = new Context();
  context.decodeAudioData = async () => ({ duration: 100, sampleRate: 44100 });
  const transport = new AudioTransport(
    () => context as unknown as AudioContext,
    () => 1000,
  );
  const file = new File(["same encoded bytes"], "fixture.mp3");
  await transport.load(file);
  const hash = transport.hash;
  await transport.load(file, hash);
  assert.equal(transport.sampleRate, 44100);
  assert.equal(transport.hash, hash);
});
test("Unlock and decode never start music; the field gate schedules one exact offset-zero source", async () => {
  const { transport, context } = await setup();
  await transport.unlock();
  assert.equal(context.sources.length, 0);
  assert.equal(transport.position(), 0);
  context.currentTime = 15;
  transport.scheduleFromZero(15.1);
  assert.equal(transport.position(), 0);
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].offset, 0);
  assert.equal(transport.sourceEvents[0].contextSeconds, 15.1);
  assert.throws(() => transport.scheduleFromZero(15.2), /repeated/);
  context.currentTime = 15.6;
  assert.ok(Math.abs(transport.position() - 0.5) < 1e-10);
});
test("Pause cancels a pending handoff source without consuming the recording", async () => {
  const { transport, context } = await setup();
  transport.scheduleFromZero(0.1);
  transport.pause();
  assert.equal(transport.position(), 0);
  assert.equal(context.sources[0].stopped, true);
  context.currentTime = 5;
  transport.scheduleFromZero(5.1);
  assert.equal(context.sources[1].offset, 0);
});

test("Direct Start is idempotent; pending unlock is cancellable; replay returns to sample zero", async () => {
  const { transport, context } = await setup();
  const show = new ShowPlayback(transport);
  let release!: () => void;
  context.resumeBlock = new Promise((r) => (release = r));
  const a = show.start(),
    b = show.start();
  release();
  await Promise.all([a, b]);
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].offset, 0);
  assert.equal(show.started, true);
  context.currentTime = 3;
  show.replay();
  assert.equal(show.started, false);
  assert.equal(transport.position(), 0);
  context.resumeBlock = new Promise((r) => (release = r));
  const pending = show.start();
  show.pause();
  release();
  await pending;
  assert.equal(context.sources.length, 1);
  assert.equal(show.started, false);
});

test("graph completion waits for the presented tail; the end clock freezes without looping audio", async () => {
  const { transport, context } = await setup();
  await transport.play();
  const end = transport.scheduledStart + transport.duration;
  context.currentTime = end;
  context.sources[0].onended!();
  assert.equal(transport.presentation(1000).endAge, null);
  assert.equal(transport.state, "playing");
  context.currentTime = end + 0.03;
  assert.equal(transport.presentation(1000).endAge, 0);
  context.currentTime += 0.5;
  const age = transport.presentation(1000).endAge!;
  assert.ok(Math.abs(age - 0.5) < 1e-8);
  // Supply the same timestamp mapping for the public pause call.
  context.getOutputTimestamp = () => ({
    contextTime: context.currentTime - 0.02,
    performanceTime: 1000,
  });
  transport.pause();
  const frozen = transport.presentationEndAge;
  context.currentTime += 10;
  assert.equal(transport.presentationEndAge, frozen);
  transport.resumeVisualOutro();
  context.currentTime += 3;
  assert.ok(Math.abs(transport.presentationEndAge! - frozen! - 3) < 1e-6);
  context.currentTime += 30;
  assert(transport.presentationEndAge! > 32);
  assert.equal(transport.visualOutroComplete, true);
  transport.pause();
  const idleFrozen = transport.presentationEndAge;
  context.currentTime += 40;
  assert.equal(transport.presentationEndAge, idleFrozen);
  assert.equal(transport.visualPaused, true);
  transport.resumeVisualOutro();
  context.currentTime += 12;
  assert.ok(Math.abs(transport.presentationEndAge! - idleFrozen! - 12) < 1e-6);
  assert.equal(context.sources.length, 1);
  assert.deepEqual(
    transport.completionEvents.map((e) => e.kind),
    ["graph_end", "presented_end"],
  );
  await transport.replay();
  assert.equal(context.sources.at(-1)!.offset, 0);
  assert.equal(transport.presentationEndAge, null);
});

test("completed-song controller toggles only visual pause; a duplicate Start cannot repeat audio", async () => {
  const { transport, context } = await setup();
  const show = new ShowPlayback(transport);
  await show.start();
  context.currentTime = transport.scheduledStart + transport.duration + 0.03;
  context.sources[0].onended!();
  transport.presentation(1000);
  assert.equal(transport.hasPresentedEnd, true);
  await show.start();
  assert.equal(context.sources.length, 1);
  await show.toggle();
  assert.equal(transport.visualPaused, true);
  context.currentTime += 10;
  const frozen = transport.presentationEndAge;
  await show.toggle();
  context.currentTime += 12;
  assert.ok(Math.abs(transport.presentationEndAge! - frozen! - 12) < 1e-6);
  assert.equal(context.sources.length, 1);
  show.replay();
  await show.start();
  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[1].offset, 0);
});

test("Continue schedules exactly one sample-zero source after its chime lead; cancelled unlock schedules none", async () => {
  const { transport, context } = await setup();
  const show = new ShowPlayback(transport);
  let notes = 0;
  const a = show.enter(() => notes++, 0.8),
    b = show.enter(() => notes++, 0.8);
  await a;
  assert.equal(await b, false);
  assert.equal(notes, 1);
  assert.equal(context.sources.length, 1);
  assert.equal(context.sources[0].offset, 0);
  assert.equal(transport.scheduledStart, 0.8);
  assert.equal(transport.presentationHasStarted(1000), false);
  context.currentTime = 0.9;
  assert.equal(transport.presentationHasStarted(1000), true);
  const second = await setup(),
    cancelled = new ShowPlayback(second.transport);
  let release!: () => void;
  second.context.resumeBlock = new Promise((r) => (release = r));
  const pending = cancelled.enter(() => {
    throw Error("Cancelled chime must not run");
  });
  cancelled.pause();
  release();
  assert.equal(await pending, false);
  assert.equal(second.context.sources.length, 0);
});

test("UI peak reservations use only the music bus, retain the longest window, and preserve user master gain", async () => {
  const context = new Context();
  const gains: any[] = [];
  context.createGain = () => {
    const events: any[] = [];
    const node = {
      gain: {
        value: 1,
        cancelScheduledValues: (at: number) => events.push(["cancel", at]),
        setTargetAtTime: (v: number, at: number, tau: number) =>
          events.push(["target", v, at, tau]),
      },
      connect() {},
      events,
    };
    gains.push(node);
    return node as any;
  };
  context.decodeAudioData = async () =>
    ({
      duration: 100,
      sampleRate: 48000,
      numberOfChannels: 2,
      getChannelData: () => new Float32Array([-0.7, 1.2]),
    }) as any;
  const t = new AudioTransport(() => context as any);
  await t.load(new File(["fixture"], "f.wav"));
  t.setVolume(0.42);
  t.reserveUiHeadroom(0.2, 0.025, 1);
  t.reserveUiHeadroom(0.1, 0.1, 0.5);
  const music = gains[0],
    master = gains[1];
  assert.ok(
    music.events.some(
      (e: any) =>
        e[0] === "target" &&
        Math.abs(e[1] - (0.95 - 0.2) / t.decodedPeak) < 1e-6,
    ),
  );
  assert.equal(music.events.at(-1)[2], 1.015);
  assert.equal(master.events.at(-1)[1], 0.42);
  assert.equal(t.volumeLevel, 0.42);
});
