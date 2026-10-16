export const FINISH_SECONDS=6.6;
const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth5=x=>{const t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
const dense=kind=>kind!==0&&kind!==10?1:0;
/** Sample from song time, not accumulated RAF interpolation. Sections are the
 * actual current lyrical-sections list. Allocation prepares while weight=0.
 */
export function denseLayerAt(seconds,sections,fadeSeconds=2){
  if(!sections.length)throw Error('No floor sections');
  let index=sections.findIndex(s=>seconds<s.end);if(index<0)index=sections.length-1;
  const current=sections[index],previous=sections[Math.max(0,index-1)];
  const from=index?dense(previous.kind):dense(current.kind),to=dense(current.kind);
  const weight=from+(to-from)*smooth5((seconds-current.start)/fadeSeconds);
  const next=sections[index+1];
  const prepare=weight>0||to>0||Boolean(next&&dense(next.kind)&&next.start-seconds<=.6);
  return {weight,prepare};
}
/** Visual layer reveal after physical clearance; never deform terrain or lower
 * the camera to mask the cut. Caller applies a continuous cap/point LOD trade.
 */
export function openingLayers(seconds,eyeY,{heightBound=14,fixture=.28,reduced=false}={}){
  if(reduced)return {surfaceGain:1,depthAllowed:true};
  const safe=heightBound+fixture+.8;
  const height=smooth5((eyeY-safe)/1.5);
  const surfaceGain=smooth5((seconds-6.1)/2)*height;
  return {surfaceGain,depthAllowed:eyeY>safe};
}
/** Latest request supersedes perpetual visual idle: only natural PRESENTED
 * completion can start this fade. No song-time cut or source stop here.
 */
export function thankYouAt(endAge,{reduced=false}={}){
  if(endAge===null)return {phase:'song',worldGain:1,pageGain:0,confettiAge:null};
  const t=Math.max(0,endAge),worldGain=1-smooth5(t/2.6);
  return {phase:t<2.6?'fade':'thanks',worldGain,pageGain:smooth5((t-2.35)/1.25),
    confettiAge:!reduced&&t>=2.6&&t<6.6?t-2.6:null};
}
