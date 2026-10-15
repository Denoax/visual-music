import {smooth5} from './opening-layers.mjs';
export const LOAD_TASKS=Object.freeze({audioBytes:.30,audioDecode:.25,analysis:.10,shaders:.25,font:.10});
export const READY_REVEAL_SECONDS=.42;
/** Readiness owns the spinner. Visible pre-song time only controls the short
 * reveal; it never fabricates readiness or changes the audio transport. */
export class LoadingModel{
  constructor(){this.generation=0;this.reset();}
  reset(){this.generation++;this.done=new Set();this.phase='loading';this.readyAt=null;this.error='';return this.generation;}
  markReady(task,generation=this.generation){
    if(generation!==this.generation||this.phase==='error')return false;
    if(!Object.hasOwn(LOAD_TASKS,task))throw Error('Unknown loading task');
    this.done.add(task);return true;
  }
  fail(message,generation=this.generation){if(generation!==this.generation)return;this.error=message;this.phase='error';}
  sample(visibleSeconds,{reduced=false}={}){
    const real=[...this.done].reduce((v,k)=>v+LOAD_TASKS[k],0),ready=this.done.size===Object.keys(LOAD_TASKS).length;
    if(this.phase==='loading'&&ready){this.phase='settling';this.readyAt=visibleSeconds;}
    const age=this.readyAt===null?0:Math.max(0,visibleSeconds-this.readyAt);
    if(this.phase==='settling'&&(reduced||age>=READY_REVEAL_SECONDS))this.phase='ready';
    const revealed=this.phase==='settling'||this.phase==='ready'||this.phase==='entering';
    const fade=(start,duration)=>revealed?(reduced?1:smooth5((age-start)/duration)):0;
    return {phase:this.phase,progress:real,realReady:ready,error:this.error,
      spinning:this.phase==='loading',
      spinnerOpacity:this.phase==='error'?0:1-fade(0,.24),
      playOpacity:fade(.10,.32),
      textOpacity:fade(.30,.8),
      settingsOpacity:fade(.38,.72),
      canContinue:this.phase==='ready'&&ready,
    };
  }
  beginContinue(){if(this.phase!=='ready')return false;this.phase='entering';return true;}
  continueFailed(message){if(this.phase==='entering'){this.phase='ready';this.error=message;}}
}
