// Original production comfort policy. Keep the numerical reference model intact.
export const COMFORT = Object.freeze({travel:.45,turn:.65,heldTarget:1.2,heldTau:1.25,releaseTau:.85});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function comfortIntegrate(state,parameters,t,dt,input={},scale=.4125,profile=COMFORT){
  if(!Number.isFinite(dt)||dt<0||dt>.2||!Number.isFinite(t)||t<state.seconds)throw RangeError('Invalid forward step');
  const {speed,altitude,vfov,tilt}=parameters;
  const x=clamp(input.x??0,-1,1),y=clamp(input.y??0,-1,1);
  const target=input.held?profile.heldTarget:1,tau=input.held?profile.heldTau:profile.releaseTau;
  const turbo=target+(state.turbo-target)*Math.exp(-dt/tau);
  const travel=dt*speed*scale*profile.travel*turbo;
  const angle=state.angle-x*turbo*dt*speed*.001*profile.turn;
  const rollTarget=x*speed*.001*.65;
  const roll=rollTarget+(state.roll-rollTarget)*Math.exp(-dt*.3*turbo);
  const pitchTarget=-y*speed*.0005-tilt*Math.PI/180;
  const pitchX=pitchTarget+(state.pitchX-pitchTarget)*Math.exp(-dt/0.65);
  return {seconds:t,x:state.x-Math.sin(state.angle)*travel,z:state.z-Math.cos(state.angle)*travel,
    angle,roll,pitchX,turbo,speed,altitude,vfov,tilt};
}
