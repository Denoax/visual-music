export const STAR_LAYER:Readonly<{cellSize:number;radiusCells:number;lifetime:number;fadeIn:number;fadeOut:number;maxRadius:number;maxDistance:number}>;
export function nearStar(cx:number,cz:number,index:number):{id:string;x:number;y:number;z:number;radius:number;phase:number;tier:string;r:number};
export function nearStarLife(seconds:number,phase:number):number;
