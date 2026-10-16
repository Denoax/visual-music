/** Original timing arithmetic for BUMER.EXE. Browser transport is separate. */
const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
};

function validateAnchor(anchor) {
  finite(anchor.contextStartSeconds, "contextStartSeconds");
  finite(anchor.sourceOffsetSeconds, "sourceOffsetSeconds");
  finite(anchor.durationSeconds, "durationSeconds");
  if (
    anchor.contextStartSeconds < 0 ||
    anchor.durationSeconds <= 0 ||
    anchor.sourceOffsetSeconds < 0 ||
    anchor.sourceOffsetSeconds > anchor.durationSeconds
  ) {
    throw new RangeError("Invalid transport anchor");
  }
}

const clamp = (x, low, high) => Math.max(low, Math.min(high, x));

/** Sample song position from a context coordinate. Hold offset before start. */
export function songAtContextTime(anchor, contextSeconds) {
  validateAnchor(anchor);
  finite(contextSeconds, "contextSeconds");
  return clamp(
    anchor.sourceOffsetSeconds +
      Math.max(0, contextSeconds - anchor.contextStartSeconds),
    0,
    anchor.durationSeconds,
  );
}

/**
 * Output timestamp is an estimate, not a physical display/speaker measurement.
 * Positive lead values advance visual sampling. Never accumulate frame deltas.
 * Non-running contexts require an explicit frozen song position from transport.
 */
export function visualSongTime(anchor, sample) {
  validateAnchor(anchor);
  if (sample.contextState !== "running") {
    finite(sample.frozenSongSeconds, "frozenSongSeconds");
    return {
      seconds: clamp(sample.frozenSongSeconds, 0, anchor.durationSeconds),
      clockQuality: "frozen",
    };
  }
  const presented = presentationContextTime(sample);
  return {
    seconds: songAtContextTime(anchor, presented.contextSeconds),
    clockQuality: presented.clockQuality,
  };
}

/** Same output-time estimate, exposed unclamped for the bounded post-song exit.
 * Fallback latency is explicit; no independent animation wall clock owns it. */
export function presentationContextTime(sample) {
  const current = finite(sample.contextCurrentSeconds, "contextCurrentSeconds");
  const now = finite(sample.performanceNowMs, "performanceNowMs");
  const lead =
    finite(sample.visualLeadMs ?? 0, "visualLeadMs") +
    finite(sample.estimatedDisplayLeadMs ?? 0, "estimatedDisplayLeadMs");
  const timestamp = sample.outputTimestamp;
  const latency = finite(
    sample.fallbackLatencySeconds ?? 0,
    "fallbackLatencySeconds",
  );
  let context = Math.max(0, current - latency) + lead / 1000;
  let clockQuality = "fallback_graph";
  if (
    timestamp &&
    Number.isFinite(timestamp.contextTime) &&
    Number.isFinite(timestamp.performanceTime)
  ) {
    const age = now - timestamp.performanceTime;
    const valid =
      timestamp.contextTime >= 0 &&
      timestamp.performanceTime > 0 &&
      age >= -50 &&
      age <= 250 &&
      timestamp.contextTime <= current + 0.1;
    if (valid) {
      context =
        timestamp.contextTime + (now + lead - timestamp.performanceTime) / 1000;
      clockQuality = "output_estimate";
    }
  }
  return { contextSeconds: context, clockQuality };
}

/** Sections are ordered non-overlapping half-open ranges [start,end). */
export function sectionAt(sections, songSeconds) {
  finite(songSeconds, "songSeconds");
  let previousEnd = 0;
  for (const section of sections) {
    const start = finite(section.start_seconds, "start_seconds");
    const end = finite(section.end_seconds, "end_seconds");
    if (start < previousEnd || start < 0 || end <= start) {
      throw new RangeError(
        "Sections must be ordered, positive and non-overlapping",
      );
    }
    previousEnd = end;
  }
  return (
    sections.find(
      (s) => songSeconds >= s.start_seconds && songSeconds < s.end_seconds,
    ) ?? null
  );
}

/** Deterministic impulse envelope; a reviewed marker is the pulse's peak. */
export function markerPulse(markers, songSeconds, decaySeconds = 0.13) {
  finite(songSeconds, "songSeconds");
  finite(decaySeconds, "decaySeconds");
  if (decaySeconds <= 0) throw new RangeError("Decay must be positive");
  let previous = -Infinity;
  let latest = null;
  for (const marker of markers) {
    finite(marker, "marker");
    if (marker < 0 || marker <= previous)
      throw new RangeError("Markers must be non-negative and strictly sorted");
    previous = marker;
    if (marker <= songSeconds) latest = marker;
  }
  if (latest === null || songSeconds - latest > 4 * decaySeconds) return 0;
  return Math.exp(-(songSeconds - latest) / decaySeconds);
}
