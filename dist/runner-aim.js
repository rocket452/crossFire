import * as THREE from './vendor/three.module.js';
export const RUNNER_AIM=Object.freeze({robotConeDegrees:2.5,missileConeDegrees:3,maxRange:110,armorInset:.15,stickiness:.08});
// Correct only a small near-miss. Bounds let large armor assist at its silhouette,
// rather than requiring the reticle to be near the center of a huge robot.
function armorPoint(origin,direction,candidate){
 const center=new THREE.Vector3().copy(candidate.position);if(!candidate.half)return center;
 const rotation=candidate.rotation?new THREE.Quaternion().copy(candidate.rotation):new THREE.Quaternion(),inverse=rotation.clone().invert(),local=origin.clone().sub(center).applyQuaternion(inverse),ray=direction.clone().applyQuaternion(inverse),t=Math.max(0,-local.dot(ray));local.addScaledVector(ray,t);
 for(const axis of['x','y','z']){const half=candidate.half[axis],inner=Math.max(.01,half-Math.min(RUNNER_AIM.armorInset,half*.1));local[axis]=THREE.MathUtils.clamp(local[axis],-inner,inner);}
 return local.applyQuaternion(rotation).add(center);
}
export function selectRunnerAim(origin,direction,candidates,{enabled=true,trace=()=>null,previous=null}={}){
 if(!enabled)return null;let best=null;const forward=direction.clone().normalize();
 for(const candidate of candidates){
  if(candidate.alive===false||!['missile','robot'].includes(candidate.kind))continue;
  const point=candidate.kind==='robot'?armorPoint(origin,forward,candidate):new THREE.Vector3().copy(candidate.position),delta=point.clone().sub(origin),distance=delta.length();if(distance<1||distance>RUNNER_AIM.maxRange)continue;
  const cone=(candidate.kind==='missile'?RUNNER_AIM.missileConeDegrees:RUNNER_AIM.robotConeDegrees)*Math.PI/180,angle=forward.angleTo(delta);if(angle>cone+1e-9)continue;
  const hit=trace(origin,point);if(candidate.kind==='missile'?hit?.missile?.id!==candidate.id:hit?.unit?.id!==candidate.unitId||!!hit?.weakPoint)continue;
  const score=angle/cone-(candidate.kind==='missile' ? .12 : 0)-(candidate.id===previous ? RUNNER_AIM.stickiness : 0);
  if(!best||score<best.score)best={id:candidate.id,kind:candidate.kind,point,angle,score};
 }
 return best;
}
