import {WeldElectrifyFX} from './weld-electrify-fx.js?v=weld-stun-art-266';
import * as THREE from './vendor/three.module.js';
export const WELDING_BEAM=Object.freeze({range:6,damagePerSecond:600,drainPerSecond:25,stun:.2,radius:.16,pulseRate:20});
// Sample the reticle with the same thickness as the live beam.
export function weldAimPoint(camera,sight,trace){
 const far=camera.clone().addScaledVector(sight,100);
 const hit=trace(camera,far,WELDING_BEAM.radius);
 if(!hit)return far;
 const point=new THREE.Vector3().copy(hit.point);
 if(hit.unit)point.addScaledVector(sight,WELDING_BEAM.radius*.5);
 return point;
}
// Reuse enemy stun methods, but explicitly exclude every live boss instance.
export function weldStun(hit,damage,bosses=[]){const u=hit?.unit,e=u?.entity;if(!(damage>0)||u?.kind!=='robot'||!u.alive||!e||bosses.includes(e)||!e.stun)return false;e.stun(WELDING_BEAM.stun);return true;}
export class RunnerWelder {
 constructor(scene){this.electrify=new WeldElectrifyFX(scene);this.root=new THREE.Group();this.root.name='Volt welding beam';scene.add(this.root);const mat=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});this.core=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,8),mat('#f5ffff'));this.glow=new THREE.Mesh(this.core.geometry,mat('#32bfff',.28));this.tip=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),mat('#e8ffff'));this.halo=new THREE.Mesh(this.tip.geometry,mat('#36cdff',.25));this.sparks=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,4),mat('#ffe6a8'),24);this.sparks.frustumCulled=false;this.root.add(this.core,this.glow,this.tip,this.halo,this.sparks);this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);this.reset();}
 reset(){this.electrify.clear();this.activations=0;this.hits=0;this.damage=0;this.secondsFired=0;this.lastHit=null;this.cancel();}
 cancel(){this.active=false;this.damageSeconds=0;this.root.visible=false;this.sparks.count=0;}
 step(dt,requested,energy){if(!requested||!(dt>0)||!energy.beamReady){this.cancel();return;}const seconds=energy.drainBeam(dt*WELDING_BEAM.drainPerSecond)/WELDING_BEAM.drainPerSecond;if(!this.active&&seconds>0)this.activations++;this.active=seconds>0;this.damageSeconds=seconds;this.secondsFired+=seconds;}
 update(dt,time,{from,direction,trace,onHit}){this.electrify.update(dt,time);if(!this.active){this.root.visible=false;return;}const c=WELDING_BEAM,dir=direction.clone().normalize(),far=from.clone().addScaledVector(dir,c.range),hit=trace(from,far,c.radius),end=hit?new THREE.Vector3().copy(hit.point):far;this.lastHit=hit?.unit?.id||hit?.kind||null;
  if(hit&&this.damageSeconds>0){const result=onHit(hit,c.damagePerSecond*this.damageSeconds)||{};this.damage+=result.damage||0;if(result.stunned){this.electrify.notify(hit.unit,WELDING_BEAM.stun);this.electrify.update(0,time);}this.hits++;}this.damageSeconds=0;this.root.visible=true;const v=end.clone().sub(from),length=v.length(),q=new THREE.Quaternion().setFromUnitVectors(this.up,length>1e-8?v.clone().normalize():dir),pulse=.85+.15*Math.sin(time*c.pulseRate*Math.PI*2);for(const[m,r]of [[this.core,.055],[this.glow,.21]]){m.position.copy(from).lerp(end,.5);m.quaternion.copy(q);m.scale.set(r*pulse,length,r*pulse);}this.tip.position.copy(end);this.tip.scale.setScalar((hit?.unit?.kind==='robot'?.23:.12)*pulse);this.halo.position.copy(end);this.halo.scale.setScalar((hit?.unit?.kind==='robot'?.6:.22)*pulse);this.sparks.count=hit?24:0;
  for(let i=0;i<this.sparks.count;i++){const age=(time*3.2+i/24)%1,a=i*2.39996+Math.floor(time*20)*.3,radial=new THREE.Vector3(Math.cos(a),Math.sin(a),Math.sin(i*3.7)).normalize(),velocity=radial.multiplyScalar(3+i%4).addScaledVector(dir,-2),p=end.clone().addScaledVector(velocity,age*.22);p.y-=age*age*.5;this.dummy.position.copy(p);this.dummy.quaternion.setFromUnitVectors(this.up,velocity.normalize());this.dummy.scale.set(.018*(1-age),.12*(1-age),.018*(1-age));this.dummy.updateMatrix();this.sparks.setMatrixAt(i,this.dummy.matrix);}this.sparks.instanceMatrix.needsUpdate=true;
 }
 diagnostics(){return{electrify:this.electrify.diagnostics(),active:this.active,activations:this.activations,hits:this.hits,damage:this.damage,secondsFired:this.secondsFired,lastHit:this.lastHit,range:WELDING_BEAM.range,damagePerSecond:WELDING_BEAM.damagePerSecond,drainPerSecond:WELDING_BEAM.drainPerSecond,stun:WELDING_BEAM.stun,sparks:this.sparks.count,visible:this.root.visible};}
}
