import test from 'node:test';
import assert from 'node:assert/strict';
import { songAtContextTime, visualSongTime, sectionAt, markerPulse } from './audio-time.mjs';

const anchor = { contextStartSeconds: 10, sourceOffsetSeconds: 20, durationSeconds: 240 };
const running = { contextState: 'running', contextCurrentSeconds: 15, performanceNowMs: 10000 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('scheduled start holds the source offset until the audio start', () => {
  near(songAtContextTime(anchor, 9.5), 20);
  near(songAtContextTime(anchor, 10), 20);
  near(songAtContextTime(anchor, 15), 25);
});
test('sampling clamps at the actual decoded track ending', () => {
  near(songAtContextTime(anchor, 1000), 240);
});
test('output timestamp mapping accounts for an audible position behind graph time', () => {
  const result = visualSongTime(anchor, { ...running,
    outputTimestamp: { contextTime: 14.94, performanceTime: 9980 } });
  near(result.seconds, 24.96);
  assert.equal(result.clockQuality, 'output_estimate');
});
test('positive measured lead advances sampling exactly once', () => {
  const result = visualSongTime(anchor, { ...running, visualLeadMs: 20, estimatedDisplayLeadMs: 10,
    outputTimestamp: { contextTime: 14.94, performanceTime: 9980 } });
  near(result.seconds, 24.99);
});
test('stale, zero-initialized and implausible timestamps report fallback quality', () => {
  for (const outputTimestamp of [
    { contextTime: 14.94, performanceTime: 9500 },
    { contextTime: 0, performanceTime: 0 },
    { contextTime: 200, performanceTime: 10000 },
    { contextTime: NaN, performanceTime: 10000 },
    { contextTime: 15, performanceTime: 10100 },
  ]) {
    const result = visualSongTime(anchor, { ...running, outputTimestamp });
    near(result.seconds, 25);
    assert.equal(result.clockQuality, 'fallback_graph');
  }
});
test('pause samples an explicit frozen position regardless of elapsed wall time', () => {
  const result = visualSongTime(anchor, { contextState: 'suspended', frozenSongSeconds: 73.2,
    performanceNowMs: 999999, contextCurrentSeconds: 200 });
  near(result.seconds, 73.2);
  assert.equal(result.clockQuality, 'frozen');
  assert.throws(() => visualSongTime(anchor, { contextState: 'suspended' }), TypeError);
});
test('seek and replay reconstruct from a new anchor without historical accumulation', () => {
  const seek = { ...anchor, contextStartSeconds: 60, sourceOffsetSeconds: 150 };
  near(songAtContextTime(seek, 60.25), 150.25);
  near(songAtContextTime(seek, 59.9), 150);
  const replay = { ...anchor, contextStartSeconds: 80, sourceOffsetSeconds: 0 };
  near(songAtContextTime(replay, 81.25), 1.25);
});
test('sparse and dense render schedules end at the same song position', () => {
  for (const times of [[11, 12, 15], [10.01, 10.3, 10.8, 14, 15], [15]]) {
    near(times.map(t => songAtContextTime(anchor, t)).at(-1), 25);
  }
});
test('section boundaries are unambiguous when seeking backwards or forwards', () => {
  const sections = [{ id: 'a', start_seconds: 0, end_seconds: 20 },
    { id: 'b', start_seconds: 20, end_seconds: 30 }];
  assert.equal(sectionAt(sections, 20).id, 'b');
  assert.equal(sectionAt(sections, 5).id, 'a');
  assert.equal(sectionAt(sections, 30), null);
  assert.throws(() => sectionAt([...sections, { start_seconds: 29, end_seconds: 35 }], 5), RangeError);
});
test('pulse peaks on the reviewed marker and is independent of playback history', () => {
  near(markerPulse([1, 2, 4], 2), 1);
  near(markerPulse([1, 2, 4], 2.13), Math.exp(-1));
  near(markerPulse([1, 2, 4], 0.9), 0);
  near(markerPulse([1, 2, 4], 3), 0);
  near(markerPulse([1, 2, 4], 2), 1);
  assert.throws(() => markerPulse([1, 1], 1), RangeError);
});
test('invalid numerical anchors and offsets are rejected', () => {
  assert.throws(() => songAtContextTime({ ...anchor, durationSeconds: 0 }, 20), RangeError);
  assert.throws(() => songAtContextTime({ ...anchor, sourceOffsetSeconds: 241 }, 20), RangeError);
  assert.throws(() => songAtContextTime(anchor, NaN), TypeError);
});

