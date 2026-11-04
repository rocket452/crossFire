import * as THREE from './vendor/three.module.js';
// Delayed motion observations and a finite-acceleration cannon motor reward direction changes.
// Steady motion is extrapolated; a juke leaves the gun pursuing its previous estimate briefly.
export class ArgusLanceTracking {
 constructor(config,position){this.config=config;this.time=0;this.history=[{time:0,position:position.clone(),velocity:new THREE.Vector3()}];this.angularVelocity=new THREE.Vector3();this.aim=position.clone();this.error=0;}
 update(dt,position,direction,from){
  if(!(dt>0))return direction;const c=this.config.firingTracking;this.time+=dt;const previous=this.history.at(-1),velocity=position.clone().sub(previous.position).divideScalar(dt);this.history.push({time:this.time,position:position.clone(),velocity});
  const observationTime=this.time-c.reactionSeconds;while(this.history.length>2&&this.history[1].time<=observationTime)this.history.shift();
  const a=this.history[0],b=this.history[1]||a,blend=THREE.MathUtils.clamp((observationTime-a.time)/Math.max(1e-6,b.time-a.time),0,1),sampleTime=THREE.MathUtils.lerp(a.time,b.time,blend),seen=a.position.clone().lerp(b.position,blend),motion=a.velocity.clone().lerp(b.velocity,blend),prediction=motion.clone().multiplyScalar(this.time-sampleTime);
  if(prediction.length()>c.maximumPredictionDistance)prediction.setLength(c.maximumPredictionDistance);const lead=motion.clone().multiplyScalar(this.config.leadSeconds*this.config.leadFactor);if(lead.length()>this.config.maximumLead)lead.setLength(this.config.maximumLead);this.aim.copy(seen).add(prediction).add(lead);
  const desired=this.aim.clone().sub(from).normalize(),angle=direction.angleTo(desired),axis=new THREE.Vector3().crossVectors(direction,desired);if(axis.lengthSq()<1e-10&&angle>Math.PI/2)axis.crossVectors(direction,Math.abs(direction.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0));axis.normalize();const wanted=axis.multiplyScalar(Math.min(this.config.trackingSpeed,angle*c.responseRate)),change=wanted.sub(this.angularVelocity),step=c.turnAcceleration*dt;if(change.length()>step)change.setLength(step);this.angularVelocity.add(change);this.angularVelocity.addScaledVector(direction,-this.angularVelocity.dot(direction));if(this.angularVelocity.length()>this.config.trackingSpeed)this.angularVelocity.setLength(this.config.trackingSpeed);const speed=this.angularVelocity.length();if(speed>1e-8)direction.applyAxisAngle(this.angularVelocity.clone().divideScalar(speed),speed*dt).normalize();this.error=direction.angleTo(desired);return direction;
 }
 diagnostics(){return{angularSpeed:this.angularVelocity.length(),errorDegrees:THREE.MathUtils.radToDeg(this.error),aim:this.aim.toArray(),reactionSeconds:this.config.firingTracking.reactionSeconds};}
}
