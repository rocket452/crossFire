import {RUNNER_ENERGY} from './runner-energy.js?v=sustained-lightning-67';
export const RUNNER_BEAM=Object.freeze({drainPerSecond:RUNNER_ENERGY.beamDrainPerSecond,tapSeconds:.08});
// Manual trigger: no wind-up, minimum reserve or recovery between activations.
export class RunnerBeam {
 constructor(){this.reset();}
 reset(){this.activations=0;this.secondsFired=0;this.cancel();}
 cancel(){this.phase='idle';this.needsRelease=false;}
 release(){this.needsRelease=false;}
 step(dt,requested,energy){
  if(!requested){this.cancel();return{phase:'idle',damageSeconds:0};}
  if(this.needsRelease||dt<=0){this.phase='idle';return{phase:'idle',damageSeconds:0};}
  if(!energy.beamReady){this.phase='idle';this.needsRelease=true;return{phase:'idle',damageSeconds:0};}
  const spent=energy.drainBeam(Math.max(0,dt)*RUNNER_BEAM.drainPerSecond),damageSeconds=spent/RUNNER_BEAM.drainPerSecond;
  if(damageSeconds>0){if(this.phase!=='firing')this.activations++;this.phase='firing';this.secondsFired+=damageSeconds;}
  else this.phase='idle';
  // After exhaustion, a fresh press prevents small recharge amounts from flickering the beam.
  if(!energy.beamReady)this.needsRelease=true;
  return{phase:damageSeconds>0?'firing':'idle',damageSeconds};
 }
 diagnostics(){return{mode:'sustained',phase:this.phase,seconds:0,cooldown:0,cooldownSeconds:0,bursts:this.activations,activations:this.activations,secondsFired:this.secondsFired,drainPerSecond:RUNNER_BEAM.drainPerSecond,needsRelease:this.needsRelease};}
}
