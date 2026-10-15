// Original, dependency-free math supplied by the continuation pack and integrated in the renderer.
// Spatial coordinates are unbounded world coordinates; no local square masks.
export const TAU = Math.PI * 2;
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const positiveMod = (x, n) => ((x % n) + n) % n;

export function effectCoordinates(x, z, {anchorX=0, anchorZ=0, angle=0}={}) {
  const dx=x-anchorX, dz=z-anchorZ, c=Math.cos(angle), s=Math.sin(angle);
  return {u:c*dx+s*dz, v:-s*dx+c*dz};
}

export function globalWeave(x, z, beatPhase, {
  anchorX=0, anchorZ=0, angle=0, period=72, beatsPerCycle=8,
}={}) {
  if (!(period>0 && beatsPerCycle>0)) throw new RangeError('Positive periods required');
  const {u}=effectCoordinates(x,z,{anchorX,anchorZ,angle});
  const q=.5+.5*Math.cos(TAU*(u/period-beatPhase/beatsPerCycle));
  return q*q; // broad, continuous curtain; no camera-relative coordinates
}

// Cell IDs use the finest canonical 1.5 m lattice, including coarse cells.
export function fixtureBank(ix, iz, {blockCells=8, groups=4, mirrored=false}={}) {
  if (!Number.isInteger(ix) || !Number.isInteger(iz)) throw new TypeError('Integer world IDs required');
  if (!Number.isInteger(blockCells) || blockCells<1 || !Number.isInteger(groups) || groups<2)
    throw new RangeError('Positive block count and at least two groups required');
  const x=mirrored ? Math.abs(ix+.5)-.5 : ix;
  return positiveMod(Math.floor(x/blockCells)+Math.floor(iz/blockCells),groups);
}

// Complementary two-bank values sum to low+high at every phase.
// Equally populated N-bank groups also maintain constant total luminance.
export function bankDimmer(bank, groups, beatPhase, {
  beatsPerCycle=4, low=.04, high=.86,
}={}) {
  if (!(groups>=2 && beatsPerCycle>0 && low>=0 && high>=low && high<=1))
    throw new RangeError('Invalid dimmer recipe');
  const q=.5+.5*Math.cos(TAU*(beatPhase/beatsPerCycle+positiveMod(bank,groups)/groups));
  return low+(high-low)*q;
}

// Numerical candidates are not approved beats. Filter out sparse one-off onset
// markers before building this track. Discontinuously large gaps FREEZE phase.
// The function is a deterministic lookup, so pause, replay and seeks cannot drift.
export function buildPulsePhaseTrack(seconds,{minGap=.3,maxGap=.8}={}) {
  if (!(minGap>0 && maxGap>=minGap)) throw new RangeError('Invalid gap limits');
  if (!Array.isArray(seconds) || seconds.some((t,i)=>!Number.isFinite(t) || (i && t<=seconds[i-1])))
    throw new TypeError('Pulse times must be finite and strictly increasing');
  let phase=0;
  return seconds.map((t,i)=> {
    const gap=i ? t-seconds[i-1] : 0;
    const active=!!i && gap>=minGap && gap<=maxGap;
    if(active) phase+=1;
    return Object.freeze({seconds:t, phase, activeFromPrevious:active});
  });
}

export function pulsePhaseAt(t,track) {
  if (!Number.isFinite(t)) throw new TypeError('Finite song time required');
  if (!track.length || t<=track[0].seconds) return {phase:0,active:false};
  const last=track[track.length-1];
  if(t>=last.seconds) return {phase:last.phase,active:false};
  let lo=0, hi=track.length-1;
  while(hi-lo>1) {const mid=(lo+hi)>>1; if(track[mid].seconds<=t)lo=mid; else hi=mid;}
  const a=track[lo],b=track[hi];
  return {
    phase:a.phase+(b.activeFromPrevious ? (t-a.seconds)/(b.seconds-a.seconds) : 0),
    active:b.activeFromPrevious,
  };
}

export function gaussianCoreFwhmPixels(spriteWidthPixels, exponent=22) {
  if (!(spriteWidthPixels>=0 && exponent>0)) throw new RangeError('Invalid Gaussian');
  // Shader r=2*length(gl_PointCoord-.5), core=exp(-exponent*r*r).
  return spriteWidthPixels*Math.sqrt(Math.log(2)/exponent);
}

export function projectedSpriteWidth({radius,depth,viewportHeight,fovDegrees,dpr=1,maxPixels=64}) {
  if (!(radius>0 && depth>0 && viewportHeight>0 && fovDegrees>0 && fovDegrees<180 && dpr>0 && maxPixels>0))
    throw new RangeError('Invalid projection');
  const projection=viewportHeight*dpr/(2*Math.tan(fovDegrees*Math.PI/360));
  return Math.min(maxPixels,2*radius*projection/depth);
}
