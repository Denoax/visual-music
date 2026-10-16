/** Original, deterministic control envelopes. Frequency bands are mixed-audio
 * measurements, not stems. Reconstructs identically after seek or replay.
 */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, f) => a + (b - a) * f;
export function prepareMusicControls(features, events, options = {}) {
  const rows = features.samples;
  if (!Array.isArray(rows) || !rows.length) throw new Error('Feature rows required');
  if (events.some((e, i) => !Number.isFinite(e.seconds) || (i && e.seconds <= events[i - 1].seconds)))
    throw new Error('Strictly sorted candidate events required');
  const envelopes = [];
  let low = 0, high = 0, sky = 0;
  const follow = (value, target, dt, attack, release) =>
    mix(value, target, 1 - Math.exp(-dt / (target > value ? attack : release)));
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], dt = i ? row[0] - rows[i - 1][0] : 0;
    if (dt < 0 || !row.every(Number.isFinite)) throw new Error('Invalid feature timeline');
    low = follow(low, row[1], dt, .045, .22);
    high = follow(high, row[3], dt, .025, .18);
    sky = follow(sky, row[1] * .45 + row[2] * .35 + row[3] * .2, dt, 3, 5);
    envelopes.push([row[0], low, high, sky]);
  }
  function upperIndex(items, seconds, key) {
    let a = 0, b = items.length;
    while (a < b) {
      const m = (a + b) >>> 1;
      if (key(items[m]) <= seconds) a = m + 1; else b = m;
    }
    return a;
  }
  return {
    sample(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0 || seconds > features.duration_seconds)
        return {low: 0, high: 0, sky: 0, accent: 0, eventIndex: -1, alternatingGroup: 0};
      const j = Math.max(0, upperIndex(envelopes, seconds, e => e[0]) - 1);
      const a = envelopes[j], b = envelopes[Math.min(j + 1, envelopes.length - 1)];
      const u = b[0] === a[0] ? 0 : clamp((seconds - a[0]) / (b[0] - a[0]));
      const index = upperIndex(events, seconds, e => e.seconds) - 1;
      let accent = 0;
      for (let k = index; k >= 0 && seconds - events[k].seconds < .8; k--) {
        const age = seconds - events[k].seconds;
        const attack = clamp(age / (options.attack ?? .025));
        accent = Math.max(accent, attack * Math.exp(-age / (options.release ?? .19)) * clamp(events[k].strength));
      }
      return {low: mix(a[1], b[1], u), high: mix(a[2], b[2], u), sky: mix(a[3], b[3], u),
        accent, eventIndex: index, alternatingGroup: Math.max(0, index) % 2};
    },
  };
}

/** Original point targets. Coordinates are local x,z in [-1,1]. No bitmap/font
 * download, avatars, reference icon tracing, or third-party artwork.
 */
export function motifTargets(name, count) {
  if (!Number.isInteger(count) || count < 1) throw new Error('Positive integer count required');
  const polyline = (vertices, closed = false) => {
    const points = closed ? [...vertices, vertices[0]] : vertices;
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0);
    return Array.from({length: count}, (_, i) => {
      let d = total * (closed ? i / count : count === 1 ? 0 : i / (count - 1));
      for (let j = 0; j < lengths.length; j++) {
        if (d <= lengths[j] || j === lengths.length - 1) {
          const u = clamp(d / lengths[j]);
          return [mix(points[j][0], points[j + 1][0], u), mix(points[j][1], points[j + 1][1], u)];
        }
        d -= lengths[j];
      }
    });
  };
  if (name === 'circle') return Array.from({length: count}, (_, i) =>
    [Math.cos(i / count * Math.PI * 2), Math.sin(i / count * Math.PI * 2)]);
  if (name === 'diamond') return polyline([[0,-1],[1,0],[0,1],[-1,0]], true);
  if (name === 'chevron') return polyline([[-1,.6],[0,-.6],[1,.6]]);
  if (name === 'up') {
    // Independently authored monoline U and P. Mirroring/layout is a render concern.
    const strokes = [
      [[-.95,-.75],[-.95,.5],[-.78,.75],[-.42,.75],[-.25,.5],[-.25,-.75]],
      [[.2,.75],[.2,-.75],[.72,-.75],[.95,-.5],[.95,-.1],[.72,.15],[.2,.15]],
    ];
    const split = Math.max(1, Math.round(count * .48));
    const sampleStroke = (vertices, n) => {
      // Equal arc-length sampling with a separate local count.
      const lengths = vertices.slice(1).map((p,i)=>Math.hypot(p[0]-vertices[i][0],p[1]-vertices[i][1]));
      const total=lengths.reduce((a,b)=>a+b,0);
      return Array.from({length:n},(_,i)=>{
        let d=total*(n===1?0:i/(n-1));
        for(let j=0;j<lengths.length;j++) {
          if(d<=lengths[j] || j===lengths.length-1) {
            const u=clamp(d/lengths[j]);
            return [mix(vertices[j][0],vertices[j+1][0],u),mix(vertices[j][1],vertices[j+1][1],u)];
          }
          d-=lengths[j];
        }
      });
    };
    return [...sampleStroke(strokes[0], split), ...sampleStroke(strokes[1], count-split)];
  }
  throw new Error(`Unknown motif: ${name}`);
}
