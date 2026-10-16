export type MusicControl = {low:number;high:number;sky:number;accent:number;eventIndex:number;alternatingGroup:number};
export function prepareMusicControls(features:{samples:number[][];duration_seconds:number},events:{seconds:number;strength:number}[],options?:{attack?:number;release?:number}):{sample(seconds:number):MusicControl};
export function motifTargets(name:string,count:number):number[][];
