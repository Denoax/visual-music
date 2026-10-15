export const PASSAGE:Readonly<{eyeY:number;clearance:number;innerRadius:number;outerRadius:number;rounding:number;physicalPitch:number}>;
export type Passage={x:number;z:number;eyeY?:number};
export function passageVertexHeight(raw:number,x:number,z:number,camera:Passage,options?:{eyeY?:number;clearance?:number;innerRadius?:number;outerRadius?:number;rounding?:number}):number;
export function canonicalTriangle(x:number,z:number,pitch?:number):{vertices:number[][];weights:number[]};
