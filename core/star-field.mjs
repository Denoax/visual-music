import {starSample} from './grid-flight.mjs';
export const STAR=Object.freeze({terrainBound:14,nearRadius:1.05,midRadius:.5,farRadius:.25,maxDistance:240,postRadiusPixels:28,minViewportHeight:600,maxFov:72,reserve:.03,coreExponent:8});
// Complete post-filter support: quarter-size blur, bilinear taps and upsampling
// fit inside 28 framebuffer pixels diagonally. DPR>=1; the maximum camera FOV
// includes the approved overview. Clamps can only shrink geometric sprites.
export const postHaloWorldBound=STAR.postRadiusPixels*STAR.maxDistance/(STAR.minViewportHeight/(2*Math.tan(STAR.maxFov*Math.PI/360)));
export const starFloor=STAR.terrainBound+STAR.nearRadius+postHaloWorldBound+STAR.reserve+1;
export function lightStar(cx,cz,index){
 const s=starSample(cx,cz,index),tier=index===0?'near':index<3?'mid':'far';
 const seed=(s.y-17)/76,scale=(s.radius-.08)/.14;
 const radius=tier==='near'?.65+.4*scale:tier==='mid'?.28+.22*scale:.12+.13*scale;
 const y=starFloor+(tier==='near'?seed*10:tier==='mid'?10+seed*30:25+seed*45);
 return {...s,tier,radius,y};
}
export function starClearance(sample){return sample.y-sample.radius-postHaloWorldBound-STAR.terrainBound-STAR.reserve;}
