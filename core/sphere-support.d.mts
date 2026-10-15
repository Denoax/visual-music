export type GroundPoint = { x: number; y: number; z: number };
export function triangleSphereSupport(cx:number,cz:number,radius:number,triangle:GroundPoint[]):number;
export function gridSphereSupport(cx:number,cz:number,radius:number,spacing:number,height:(x:number,z:number)=>number,epsilon?:number):number;
export function triangleGridHeight(x:number,z:number,spacing:number,height:(x:number,z:number)=>number):number;
export function segmentTerrainCeiling(a:{x:number;z:number},b:{x:number;z:number},radius:number,spacing:number,height:(x:number,z:number)=>number):number;
