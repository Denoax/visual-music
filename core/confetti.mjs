const clamp=x=>Math.max(0,Math.min(1,x));
const random=i=>{let h=Math.imul((i+1)^0x9e3779b9,0x85ebca6b);h^=h>>>16;return(h>>>0)/4294967296;};
/** Original bounded flat-paper confetti, no dependency or texture. Sample at
 * presented outro age; remove its canvas/SVG after four seconds. */
export function confettiAt(age,{reduced=false,count=36}={}){
  if(reduced||age===null||age<0||age>=4)return [];
  return Array.from({length:Math.min(48,Math.max(0,count))},(_,i)=>{
    const vx=(random(i*5)-.5)*.65,vy=-.32-random(i*5+1)*.25;
    return {x:.5+vx*age,y:.33+vy*age+.26*age*age,
      rotation:random(i*5+2)*360+(random(i*5+3)-.5)*220*age,
      width:3+random(i*5+4)*4,height:2.5,
      opacity:clamp((4-age)/1.2)*.65,
      colour:['#91dce5','#c3b5e8','#f0d4a3','#d9e4ec'][i%4]};
  });
}
