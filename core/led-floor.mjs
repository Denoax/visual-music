/** Original LED-floor reference operators. Integrate into the existing clock/terrain. */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export function smooth01(x) { const u = clamp(x); return u*u*(3-2*u); }

/** Generic original vector assets, not traced from the unavailable video frames. */
export function motifPolygon(name) {
  if (name === 'star') return Array.from({length:10}, (_,i) => {
    const a=Math.PI/2+i*Math.PI/5, r=i%2===0?.9:.405;
    return [r*Math.cos(a),r*Math.sin(a)];
  });
  if (name !== 'heart') throw Error('Unknown motif');
  const raw=Array.from({length:128},(_,i)=>{
    const t=2*Math.PI*i/128;
    return [16*Math.sin(t)**3,13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)];
  });
  const xs=raw.map(p=>p[0]),ys=raw.map(p=>p[1]);
  const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  return raw.map(([x,y])=>[1.8*(x-xmin)/(xmax-xmin)-.9,1.8*(y-ymin)/(ymax-ymin)-.9]);
}

function edgeDistance(x,y,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
  const u=den>0?clamp(((x-a[0])*dx+(y-a[1])*dy)/den):0;
  return Math.hypot(x-a[0]-u*dx,y-a[1]-u*dy);
}

/** Exact planar polygon distance, negative inside; used only during mask authoring. */
export function polygonDistance(x,y,points) {
  if(points.length<3) throw Error('A mask needs a closed polygon');
  let inside=false,best=Infinity;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[j],b=points[i];
    best=Math.min(best,edgeDistance(x,y,a,b));
    if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside?-best:best;
}

/** Numerical cell mask for DataTexture/attributes; row zero is the top of the motif.
 * No bitmap/media generation. Build once, sample with nearest filtering at runtime.
 */
export function rasterMask(points, options={}) {
  const cells=options.cells??32,outline=options.outline??false,width=options.outlineWidth??.075;
  if(!Number.isInteger(cells)||cells<4||cells>128||width<=0)throw Error('Invalid mask resolution');
  const data=new Uint8Array(cells*cells), offsets=[.25,.75];
  for(let row=0;row<cells;row++) for(let col=0;col<cells;col++) {
    let covered=0;
    for(const oy of offsets) for(const ox of offsets) {
      const x=2*(col+ox)/cells-1,y=1-2*(row+oy)/cells;
      const d=polygonDistance(x,y,points);
      covered+=(outline?Math.abs(d)<=width:d<=0)?1:0;
    }
    data[row*cells+col]=Math.round(covered*255/4);
  }
  return {cells,data,outline,outlineWidth:width};
}

export function sampleMask(mask,u,v) {
  if(u<-1||u>1||v<-1||v>1)return 0;
  const col=Math.min(mask.cells-1,Math.floor((u+1)*.5*mask.cells));
  const row=Math.min(mask.cells-1,Math.floor((1-v)*.5*mask.cells));
  return mask.data[row*mask.cells+col]/255;
}

/** Frozen world patch: right/up follow its introduction heading, never the live camera. */
export function worldToPatch(x,z,patch) {
  const dx=x-patch.x,dz=z-patch.z,yaw=patch.yaw??0,half=patch.halfSize??24;
  if(half<=0)throw Error('Invalid patch size');
  return {u:(dx*Math.cos(yaw)+dz*Math.sin(yaw))/half,
    v:(dx*Math.sin(yaw)-dz*Math.cos(yaw))/half};
}

/** Coarse cells are the even/even subset; introduce only new members at the given weight.
 * Does NOT change physical terrain spacing or determine their triangle heights.
 */
export function densePatchCells(patch, options={}) {
  const pitch=options.coarsePitch??3,factor=options.factor??2;
  if(pitch<=0||!Number.isInteger(factor)||factor<1||factor>4)throw Error('Invalid density');
  const fine=pitch/factor,half=patch.halfSize??24;
  if(half<=0)throw Error('Invalid patch size');
  const yaw=patch.yaw??0,extent=half*(Math.abs(Math.cos(yaw))+Math.abs(Math.sin(yaw)));
  const x0=Math.ceil((patch.x-extent)/fine),x1=Math.ceil((patch.x+extent)/fine);
  const z0=Math.ceil((patch.z-extent)/fine),z1=Math.ceil((patch.z+extent)/fine);
  const cells=[];
  for(let iz=z0;iz<z1;iz++)for(let ix=x0;ix<x1;ix++) {
    const uv=worldToPatch(ix*fine,iz*fine,patch);
    if(Math.abs(uv.u)>1+1e-10||Math.abs(uv.v)>1+1e-10)continue;
    cells.push({
    id:`${factor}:${ix}:${iz}`,ix,iz,x:ix*fine,z:iz*fine,
    coarse:ix%factor===0&&iz%factor===0,
    });
  }
  return cells;
}

/** Small original diffuser cap: one pole, four rings, no duplicate pole triangles.
 * Returns numerical geometry for BufferGeometry; orient/mount on actual terrain.
 */
export function bulbCapGeometry(options={}) {
  const radius=options.radius??.34,height=options.height??.24;
  const sides=options.sides??8,rings=options.rings??4;
  if(radius<=0||height<=0||!Number.isInteger(sides)||sides<3||!Number.isInteger(rings)||rings<1)throw Error('Invalid cap');
  const positions=[0,height,0],normals=[0,1,0],indices=[];
  for(let j=1;j<=rings;j++)for(let i=0;i<sides;i++) {
    const theta=j/rings*Math.PI/2,a=i/sides*2*Math.PI;
    const x=radius*Math.sin(theta)*Math.cos(a),z=radius*Math.sin(theta)*Math.sin(a),y=height*Math.cos(theta);
    positions.push(x,y,z);
    const nx=x/(radius*radius),ny=y/(height*height),nz=z/(radius*radius),length=Math.hypot(nx,ny,nz);
    normals.push(nx/length,ny/length,nz/length);
  }
  for(let i=0;i<sides;i++)indices.push(0,1+(i+1)%sides,1+i);
  for(let j=1;j<rings;j++)for(let i=0;i<sides;i++) {
    const a=1+(j-1)*sides+i,b=1+(j-1)*sides+(i+1)%sides,c=a+sides,d=b+sides;
    indices.push(a,b,c,b,d,c);
  }
  return {positions,normals,indices,radius,height,sides,rings};
}

/** Visual illumination only. Reuse actual front origin/age and approved speed. */
export function ringIntensity(x,z,front,seconds,options={}) {
  const age=seconds-front.time,life=options.lifetime??5.6;
  if(age<0||age>=life)return 0;
  const width=options.width??2.4,speed=options.speed??34,attack=options.attack??.045,fade=options.fade??1.4;
  if(width<=0||speed<0||attack<=0||fade<=0||fade>=life)throw Error('Invalid ripple');
  const distance=Math.hypot(x-front.x,z-front.z),q=(distance-speed*age)/width;
  return Math.exp(-.5*q*q)*smooth01(age/attack)*(1-smooth01((age-(life-fade))/fade))*clamp(front.strength??1);
}

/** One scored cycle phase (0..1) drives a travelling band; no wall clock/modulo gate. */
export function scanIntensity(u,v,phase,options={}) {
  if(Math.abs(u)>1||Math.abs(v)>1)return 0;
  const angle=options.angle??0,width=options.width??.12;
  if(width<=0)throw Error('Invalid scan width');
  const coordinate=u*Math.cos(angle)+v*Math.sin(angle);
  const centre=-1.25+2.5*clamp(phase);
  const q=(coordinate-centre)/width;
  return Math.exp(-.5*q*q);
}

/** Row/cell chase is driven by score phase; caller supplies musical phase/colour. */
export function chaseIntensity(ix,iz,phase,options={}) {
  const period=options.periodCells??8,width=options.widthCells??1.5;
  if(period<=0||width<=0)throw Error('Invalid chase');
  const coordinate=options.axis==='z'?iz:ix;
  const p=((coordinate-period*phase)%period+period)%period;
  const distance=Math.min(p,period-p);
  return Math.exp(-.5*(distance/width)**2);
}

/** Linear RGB, bounded by peak scaling, not per-channel clipping into white. */
export function composeLight(layers,maximum=1.4) {
  if(maximum<=0)throw Error('Invalid light bound');
  const rgb=[0,0,0];
  for(const layer of layers)for(let c=0;c<3;c++)rgb[c]+=Math.max(0,layer.colour[c])*Math.max(0,layer.intensity);
  const peak=Math.max(...rgb),gain=peak>maximum?maximum/peak:1;
  return rgb.map(x=>x*gain);
}
