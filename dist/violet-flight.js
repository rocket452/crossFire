import * as THREE from './vendor/three.module.js';
export const VIOLET_TUNING=Object.freeze({patrolSpeed:12,rescueSpeed:40,defenseSpeed:24,acceleration:14,rescueAcceleration:32,braking:12,rescueBraking:26,steering:1.35,normalCharge:2.4,normalCooldown:5.4,defenseCharge:1.0,defenseCooldown:1.4,shieldRecovery:1.4});
// Persistent velocity and bounded acceleration give turns and braking visible momentum.
export function advanceVioletFlight(position,velocity,destination,dt,{speed=12,rescue=false}={}){
 if(!(dt>0))return;
 const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps,a=rescue?VIOLET_TUNING.rescueAcceleration:VIOLET_TUNING.acceleration,brake=rescue?VIOLET_TUNING.rescueBraking:VIOLET_TUNING.braking;
 for(let i=0;i<steps;i++){
  const offset=new THREE.Vector3().subVectors(destination,position),distance=offset.length(),desired=offset.multiplyScalar(distance>1e-6?Math.min(speed,distance*1.35,Math.sqrt(2*brake*distance))/distance:0);
  const slowing=desired.dot(velocity)<velocity.lengthSq();const change=desired.sub(velocity).multiplyScalar(1-Math.exp(-(rescue?2.2:VIOLET_TUNING.steering)*h));const cap=(slowing?brake:a)*h;if(change.length()>cap)change.setLength(cap);
  velocity.add(change);position.addScaledVector(velocity,h);
 }
}
