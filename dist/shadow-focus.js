import * as THREE from './vendor/three.module.js';

// Keeps a directional light's orthographic shadow box over what the camera is looking at instead of the whole
// map. The box is centred on the ground ahead of the camera and moves in whole shadow-map texels (in light
// space), so static shadows do not shimmer while the camera moves. The light direction never changes: the
// light and its target translate together. A smaller box is both sharper and cheaper: fewer city sections
// fall inside it, and SpatialChunkBatch culls the rest from the shadow pass.
export const SHADOW_FOCUS=Object.freeze({halfSize:120,lead:.55});

export class ShadowFocus {
 constructor(light,{halfSize=SHADOW_FOCUS.halfSize,lead=SHADOW_FOCUS.lead}={}){
  this.light=light;this.halfSize=halfSize;this.lead=lead;
  this.offset=light.position.clone().sub(light.target.position);
  const camera=light.shadow.camera;
  Object.assign(camera,{left:-halfSize,right:halfSize,top:halfSize,bottom:-halfSize});
  camera.far=Math.max(camera.far,this.offset.length()+halfSize*2.5);camera.updateProjectionMatrix();
  // The shadow camera looks from the light to its target with camera.up, as Matrix4.lookAt builds it.
  this.depth=this.offset.clone().normalize();
  this.right=new THREE.Vector3().crossVectors(camera.up,this.depth).normalize();
  this.up=new THREE.Vector3().crossVectors(this.depth,this.right);
  this.texel=2*halfSize/light.shadow.mapSize.x;
  this.center=new THREE.Vector3();this.forward=new THREE.Vector3();
 }
 update(camera){
  camera.getWorldDirection(this.forward);this.forward.y=0;
  const length=this.forward.length();
  this.center.set(camera.position.x,0,camera.position.z);
  if(length>.05)this.center.addScaledVector(this.forward,this.halfSize*this.lead/length);
  const snap=v=>Math.round(v/this.texel)*this.texel;
  const r=snap(this.center.dot(this.right)),u=snap(this.center.dot(this.up)),d=this.center.dot(this.depth);
  this.center.copy(this.right).multiplyScalar(r).addScaledVector(this.up,u).addScaledVector(this.depth,d);
  this.light.target.position.copy(this.center);
  this.light.position.copy(this.center).add(this.offset);
  this.light.target.updateMatrixWorld();this.light.updateMatrixWorld();
 }
 diagnostics(){return{halfSize:this.halfSize,texel:+this.texel.toFixed(3),center:this.center.toArray().map(v=>+v.toFixed(2))};}
}
