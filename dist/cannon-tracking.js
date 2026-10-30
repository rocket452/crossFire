import * as THREE from './vendor/three.module.js';
export const CANNON_TRACKING=Object.freeze({acquireDegreesPerSecond:30,fireDegreesPerSecond:20,waistDegreesPerSecond:20,startErrorDegrees:7});
// Keep aim in world space: rotating the pelvis/waist must not bypass the beam's turn cap.
export class CannonTracking {
 constructor(config={}){this.config={...CANNON_TRACKING,...config};this.direction=new THREE.Vector3();this.desired=new THREE.Vector3();this.turn=new THREE.Quaternion();this.blend=new THREE.Quaternion();this.reset();}
 reset(){this.initialized=false;this.direction.set(0,-1,0);this.desired.copy(this.direction);this.errorDegrees=0;this.turnDegreesPerSecond=0;}
 update(dt,desired,initial,firing=false){
  if(!this.initialized){this.direction.copy(initial).normalize();this.initialized=true;}
  this.desired.copy(desired).normalize();if(this.desired.lengthSq()<.5){this.turnDegreesPerSecond=0;return this.direction;}
  const angle=Math.acos(THREE.MathUtils.clamp(this.direction.dot(this.desired),-1,1)),limit=THREE.MathUtils.degToRad(firing?this.config.fireDegreesPerSecond:this.config.acquireDegreesPerSecond)*Math.max(0,dt),step=Math.min(angle,limit);
  if(angle<=limit)this.direction.copy(this.desired);
  else if(step>0){this.turn.setFromUnitVectors(this.direction,this.desired);this.blend.identity().slerp(this.turn,step/angle);this.direction.applyQuaternion(this.blend).normalize();}
  this.errorDegrees=THREE.MathUtils.radToDeg(Math.max(0,angle-step));this.turnDegreesPerSecond=dt>0?THREE.MathUtils.radToDeg(step/dt):0;return this.direction;
 }
 diagnostics(){return{...this.config,direction:this.direction.toArray(),errorDegrees:this.errorDegrees,turnDegreesPerSecond:this.turnDegreesPerSecond};}
}
