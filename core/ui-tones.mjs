/** Original soft mallet/bell synthesis. One existing transport AudioContext and
 * master output only. Caller owns trusted activation, audio unlock and mute.
 * reserveHeadroom receives a conservative pre-master peak bound and scheduling
 * times; implement through existing musicGain, not a second music source.
 */
const MIDI=[72,76,79,81],hz=n=>440*2**((n-69)/12);
export function tonePlan(kind,index=0){
  const notes=kind==='continue'?[72,76,79,84]:[MIDI[((index%MIDI.length)+MIDI.length)%MIDI.length]];
  return notes.map((note,i)=>({frequency:hz(note),delay:kind==='continue'?i*.06:0,
    duration:kind==='continue'?.56:.23,amplitude:kind==='continue'?.48:.34,
    partials:[{ratio:1,gain:.78},{ratio:2,gain:.16},{ratio:3,gain:.06}]}));
}
/** @param {AudioContext} context
 * @param {AudioNode} output
 * @param {{reserveHeadroom?:(peak:number,at:number,until:number)=>void,muted?:()=>boolean,maxVoices?:number}} options */
export function createUiTones(context,output,{reserveHeadroom,muted=()=>Boolean(false),maxVoices=8}={}){
  if(typeof reserveHeadroom!=='function')throw Error('Wire existing music bus headroom before enabling tones');
  const bus=context.createGain();bus.gain.value=.04;bus.connect(output);
  const voices=new Set();let index=0,last=-Infinity,disposed=false;
  function play(kind='button'){
    if(disposed||muted()||context.state!=='running'||(kind!=='continue'&&context.currentTime-last<.07))return false;
    const plan=tonePlan(kind,index++),at=context.currentTime+.025;
    // Drop the newest event rather than cutting a still-decaying voice.
    if(voices.size+plan.length>maxVoices)return false;
    const until=Math.max(at+Math.max(...plan.map(n=>n.delay+n.duration)),...[...voices].map(v=>v.end));
    const peak=.04*([...voices].reduce((s,v)=>s+v.amplitude,0)+plan.reduce((s,n)=>s+n.amplitude,0));
    reserveHeadroom(peak,at,until);
    last=context.currentTime;
    for(const note of plan){
      const gain=context.createGain(),start=at+note.delay,end=start+note.duration;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(note.amplitude,start+.006);
      gain.gain.exponentialRampToValueAtTime(.0001,end-.012);gain.gain.linearRampToValueAtTime(0,end);
      gain.connect(bus);const oscillators=[];let finished=0;
      const voice={gain,oscillators,amplitude:note.amplitude,end};voices.add(voice);
      for(const partial of note.partials){
        const osc=context.createOscillator(),level=context.createGain();
        osc.type='sine';osc.frequency.setValueAtTime(note.frequency*partial.ratio,start);
        level.gain.value=partial.gain;osc.connect(level);level.connect(gain);
        osc.onended=()=>{osc.disconnect();level.disconnect();if(++finished===note.partials.length){gain.disconnect();voices.delete(voice);}};
        oscillators.push(osc);osc.start(start);osc.stop(end);
      }
    }
    return true;
  }
  function silence(){for(const v of voices){v.gain.gain.cancelScheduledValues(context.currentTime);v.gain.gain.setValueAtTime(v.gain.gain.value,context.currentTime);v.gain.gain.linearRampToValueAtTime(0,context.currentTime+.008);for(const o of v.oscillators){try{o.stop(context.currentTime+.012);}catch{}}}voices.clear();}
  return {play,silence,dispose(){if(disposed)return;disposed=true;silence();bus.disconnect();},activeVoices:()=>voices.size};
}
