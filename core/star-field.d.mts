import type {starSample} from './grid-flight.mjs';
export const STAR:Readonly<{terrainBound:number;nearRadius:number;midRadius:number;farRadius:number;maxDistance:number;postRadiusPixels:number;minViewportHeight:number;maxFov:number;reserve:number;coreExponent:number}>;
export const postHaloWorldBound:number;
export const starFloor:number;
export function lightStar(cx:number,cz:number,index:number):ReturnType<typeof starSample>&{tier:string};
export function starClearance(sample:{y:number;radius:number}):number;
