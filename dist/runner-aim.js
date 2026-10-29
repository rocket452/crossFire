import * as THREE from './vendor/three.module.js';
// A small acquisition cone adjusts the shot endpoint, never the player's view.
export function selectRunnerAim(origin,direction,candidates,{enabled=true,trace=()=>null,previous=null}={}){
 if(!enabled)return null;let best=null;
 for(const candidate of candidates){
  if(candidate.alive===false||!['missile','robot'].includes(candidate.kind))continue;
  const point=new THREE.Vector3().copy(candidate.position),delta=point.clone().sub(origin),distance=delta.length();if(distance<1||distance>110)continue;
  const cone=(candidate.kind==='missile'?5:3)*Math.PI/180,angle=direction.angleTo(delta);if(angle>cone)continue;
  const hit=trace(origin,point);if(candidate.kind==='missile'?hit?.missile?.id!==candidate.id:hit?.unit?.id!==candidate.unitId)continue;
  const score=angle/cone-(candidate.kind==='missile' ? .12 : 0)-(candidate.id===previous ? .08 : 0);
  if(!best||score<best.score)best={id:candidate.id,kind:candidate.kind,point,angle,score};
 }
 return best;
}
