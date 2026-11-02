import * as THREE from './vendor/three.module.js';
// Constant-velocity interception. No homing, target snapping or player movement changes.
export function projectileIntercept(origin,target,velocity,speed,maxSeconds=5){
 const relative=new THREE.Vector3().copy(target).sub(origin),v=new THREE.Vector3().copy(velocity),a=v.lengthSq()-speed*speed,b=2*relative.dot(v),c=relative.lengthSq();let time=null;
 if(c<1e-8)time=0;else if(Math.abs(a)<1e-8){if(b< -1e-8)time=-c/b;}else{const discriminant=b*b-4*a*c;if(discriminant>=0){const root=Math.sqrt(discriminant),times=[(-b-root)/(2*a),(-b+root)/(2*a)].filter(t=>t>0&&Number.isFinite(t));if(times.length)time=Math.min(...times);}}
 const solved=time!==null&&time<=maxSeconds;if(!solved)time=Math.min(maxSeconds,relative.length()/Math.max(speed,1e-6));return{point:new THREE.Vector3().copy(target).addScaledVector(v,time),time,solved};
}
