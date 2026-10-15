import {smooth5} from './opening-layers.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
export const LOAD_TASKS=Object.freeze({audioBytes:.30,audioDecode:.25,analysis:.10,shaders:.25,font:.10});
export const MIN_LOADING_SECONDS=3.2, DROP_SECONDS=1.4;
/** Original SVG/DOM animation math. The ball is a landing-page element only.
 * Call with the app's visible pre-song elapsed time. Do not use this for song
 * transport, alter song time or play audio during automatic loading.
 */
export function ballDrop(age){
  const t=Math.max(0,age);
  if(t<.28){const q=smooth5(t/.28);return {x:77.44+(100-77.44)*q,y:6*q,rotation:.55*q,scaleX:1,scaleY:1};}
  if(t<1){const q=(t-.28)/.72;return {x:100-92*q,y:6+88*q*q,rotation:.55+q*4.5,scaleX:1,scaleY:1};}
  const q=clamp((t-1)/.4),bounce=Math.sin(Math.PI*q)*(1-q);
  return {x:8*(1-smooth5(q)),y:94-11*bounce,rotation:5.05+(2*Math.PI-5.05)*smooth5(q),
    scaleX:1+.14*(1-q)*Math.exp(-q*12),scaleY:1-.12*(1-q)*Math.exp(-q*12)};
}
export class LoadingModel{
  constructor(){this.generation=0;this.reset();}
  reset(){this.generation++;this.done=new Set();this.phase='loading';this.dropAt=null;this.error='';return this.generation;}
  markReady(task,generation=this.generation){
    if(generation!==this.generation)return false;
    if(!(task in LOAD_TASKS))throw Error('Unknown loading task');
    this.done.add(task);return true;
  }
  fail(message,generation=this.generation){if(generation!==this.generation)return;this.error=message;this.phase='error';}
  sample(visibleSeconds,{reduced=false}={}){
    const real=[...this.done].reduce((v,k)=>v+LOAD_TASKS[k],0),ready=this.done.size===Object.keys(LOAD_TASKS).length;
    if(this.phase==='loading'&&ready&&visibleSeconds>=MIN_LOADING_SECONDS){this.phase='drop';this.dropAt=visibleSeconds;}
    const age=this.dropAt===null?0:Math.max(0,visibleSeconds-this.dropAt);
    if(this.phase==='drop'&&(reduced||age>=DROP_SECONDS))this.phase='ready';
    const settled=this.phase==='ready'||this.phase==='entering';
    const progress=this.phase==='loading'?Math.min(real,.94*smooth5(visibleSeconds/MIN_LOADING_SECONDS)):1;
    const revealAge=reduced?1:Math.max(0,age-DROP_SECONDS);
    return {phase:this.phase,progress,realReady:ready,error:this.error,
      ball:this.dropAt===null?{x:-88+176*progress,y:0,rotation:progress*2,scaleX:1,scaleY:1}:ballDrop(reduced?DROP_SECONDS:age),
      playOpacity:this.dropAt===null?0:reduced?1:smooth5((age-.6)/.65),
      textOpacity:settled?(reduced?1:smooth5(revealAge/1.25)):0,
      settingsOpacity:settled?(reduced?1:smooth5((revealAge-.12)/1.1)):0,
      canContinue:this.phase==='ready'&&ready,
    };
  }
  beginContinue(){if(this.phase!=='ready')return false;this.phase='entering';return true;}
  continueFailed(message){if(this.phase==='entering'){this.phase='ready';this.error=message;}}
}
