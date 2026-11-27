import {WeldElectrifyFX} from './weld-electrify-fx.js?v=451';
import * as THREE from './vendor/three.module.js';
import {LightningKit,Arc,glowBillboard,CYAN,WHITE} from './lightning-kit.js?v=451';
const MOLTEN=new THREE.Color('#ff9a2a'),HOTSPOT=new THREE.Color('#ffe0a0');
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
 constructor(scene){this.electrify=new WeldElectrifyFX(scene);this.root=new THREE.Group();this.root.name='Volt welding beam';scene.add(this.root);const mat=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});this.core=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,8),mat('#f5ffff'));this.glow=new THREE.Mesh(this.core.geometry,mat('#32bfff',.28));this.tip=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),mat('#e8ffff'));this.halo=new THREE.Mesh(this.tip.geometry,mat('#36cdff',.25));this.sparks=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,4),mat('#ffe6a8'),24);this.sparks.frustumCulled=false;this.root.add(this.core,this.glow,this.tip,this.halo,this.sparks);for(const m of [this.core,this.glow,this.tip,this.halo,this.sparks])m.visible=false;this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);
  // Torch visuals: a steady crackling beam, two wrapping arcs, a white-hot contact point and molten spray.
  this.fx=new THREE.Group();this.fx.name='Volt welding torch';scene.add(this.fx);
  this.kit=new LightningKit(this.fx,{arcs:10,glows:6,sparks:260,sparkColor:new THREE.Color(1,.5,.12)});
  this.beam=new Arc(this.fx,24);this.wraps=[new Arc(this.fx,24),new Arc(this.fx,24)];
  this.muzzle=glowBillboard('#7fe6ff',8);this.hotCore=glowBillboard(HOTSPOT,9);this.hotHalo=glowBillboard('#2fb8ff',7);this.molten=glowBillboard(MOLTEN,8);
  for(const g of [this.muzzle,this.hotCore,this.hotHalo,this.molten]){g.material.depthTest=false;g.visible=false;this.fx.add(g);}
  this.sprayClock=0;this.arcClock=0;this.reset();}
 reset(){this.electrify.clear();this.kit?.clear();this.activations=0;this.hits=0;this.damage=0;this.secondsFired=0;this.lastHit=null;this.cancel();}
 cancel(){this.active=false;this.damageSeconds=0;this.sparks.count=0;this.beamOn=false;this.beam?.hide();this.wraps?.forEach(a=>a.hide());for(const g of [this.muzzle,this.hotCore,this.hotHalo,this.molten])if(g)g.visible=false;this.root.visible=false;}
 step(dt,requested,energy){if(!requested||!(dt>0)||!energy.beamReady){this.cancel();return;}const seconds=energy.drainBeam(dt*WELDING_BEAM.drainPerSecond)/WELDING_BEAM.drainPerSecond;if(!this.active&&seconds>0)this.activations++;this.active=seconds>0;this.damageSeconds=seconds;this.secondsFired+=seconds;}
 update(dt,time,{from,direction,trace,onHit}){this.electrify.update(dt,time);this.kit.step(Math.max(0,dt));if(!this.active){this.cancel();return;}const c=WELDING_BEAM,dir=direction.clone().normalize(),far=from.clone().addScaledVector(dir,c.range),hit=trace(from,far,c.radius),end=hit?new THREE.Vector3().copy(hit.point):far;this.lastHit=hit?.unit?.id||hit?.kind||null;
  if(hit&&this.damageSeconds>0){const result=onHit(hit,c.damagePerSecond*this.damageSeconds)||{};this.damage+=result.damage||0;if(result.stunned){this.electrify.notify(hit.unit,WELDING_BEAM.stun);this.electrify.update(0,time);}this.hits++;}this.damageSeconds=0;this.root.visible=true;const v=end.clone().sub(from),length=v.length(),q=new THREE.Quaternion().setFromUnitVectors(this.up,length>1e-8?v.clone().normalize():dir),pulse=.85+.15*Math.sin(time*c.pulseRate*Math.PI*2);for(const[m,r]of [[this.core,.055],[this.glow,.21]]){m.position.copy(from).lerp(end,.5);m.quaternion.copy(q);m.scale.set(r*pulse,length,r*pulse);}this.tip.position.copy(end);this.tip.scale.setScalar((hit?.unit?.kind==='robot'?.23:.12)*pulse);this.halo.position.copy(end);this.halo.scale.setScalar((hit?.unit?.kind==='robot'?.6:.22)*pulse);this.sparks.count=hit?24:0;
  for(let i=0;i<this.sparks.count;i++){const age=(time*3.2+i/24)%1,a=i*2.39996+Math.floor(time*20)*.3,radial=new THREE.Vector3(Math.cos(a),Math.sin(a),Math.sin(i*3.7)).normalize(),velocity=radial.multiplyScalar(3+i%4).addScaledVector(dir,-2),p=end.clone().addScaledVector(velocity,age*.22);p.y-=age*age*.5;this.dummy.position.copy(p);this.dummy.quaternion.setFromUnitVectors(this.up,velocity.normalize());this.dummy.scale.set(.018*(1-age),.12*(1-age),.018*(1-age));this.dummy.updateMatrix();this.sparks.setMatrixAt(i,this.dummy.matrix);}this.sparks.instanceMatrix.needsUpdate=true;
  this.drawTorch(dt,time,from,end,dir,hit);
 }
 drawTorch(dt,time,from,end,dir,hit){
  const flick=.85+.15*Math.sin(time*97)*Math.sin(time*41),robot=hit?.unit?.kind==='robot';
  const keep=(arc,a,b,options)=>{if(!this.beamOn){arc.fire(a,b,options);return;}const moved=arc.from.distanceToSquared(a)+arc.to.distanceToSquared(b)>.0025;arc.from.copy(a);arc.to.copy(b);arc.age=0;arc.life=1e9;if(moved)arc.reshape=0;arc.step(dt);};
  keep(this.beam,from,end,{life:1e9,width:1.15,jag:.025,maxJag:.07,flicker:.035,coreWidth:1.5});
  this.wraps.forEach((w,i)=>keep(w,from,end,{life:1e9,width:.42,jag:.09,maxJag:.22,flicker:.05+i*.02}));
  this.beam.glow.material.uniforms.opacity.value=.75+.25*flick;this.beam.core.material.uniforms.opacity.value=1;
  for(const w of this.wraps){w.glow.material.uniforms.opacity.value=.55*flick;w.core.material.uniforms.opacity.value=.8;}
  this.beamOn=true;
  this.muzzle.visible=true;this.muzzle.position.copy(from);this.muzzle.scale.setScalar(.55*flick);this.muzzle.material.uniforms.opacity.value=.9;
  const contact=!!hit;
  for(const g of [this.hotCore,this.hotHalo,this.molten])g.visible=contact;
  if(!contact)return;
  const back=end.clone().addScaledVector(dir,-.05);
  this.hotCore.position.copy(back);this.hotCore.scale.setScalar((robot?1.05:.75)*flick);this.hotCore.material.uniforms.opacity.value=1;
  this.molten.position.copy(back);this.molten.scale.setScalar((robot?2.3:1.7)*(.9+.1*Math.sin(time*13)));this.molten.material.uniforms.opacity.value=.95;
  this.hotHalo.position.copy(back);this.hotHalo.scale.setScalar((robot?2.4:1.6)*flick);this.hotHalo.material.uniforms.opacity.value=.45;
  // Molten spray: bright droplets thrown off the cut, falling with gravity.
  this.sprayClock+=dt;while(this.sprayClock>.016){this.sprayClock-=.016;this.kit.spark(back,robot?4:3,robot?7.5:6,3.4,{life:.42,lifeSpread:.45,size:.13,sizeSpread:.13,gravity:15});}
  this.arcClock-=dt;if(this.arcClock<=0){this.arcClock=.06+Math.random()*.07;const d=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize();d.addScaledVector(dir,-.6).normalize();
   this.kit.arc(back,back.clone().addScaledVector(d,.5+Math.random()*.7),{life:.08,width:.45,jag:.4,maxJag:.3,flicker:.025});}
 }
 diagnostics(){return{electrify:this.electrify.diagnostics(),active:this.active,activations:this.activations,hits:this.hits,damage:this.damage,secondsFired:this.secondsFired,lastHit:this.lastHit,range:WELDING_BEAM.range,damagePerSecond:WELDING_BEAM.damagePerSecond,drainPerSecond:WELDING_BEAM.drainPerSecond,stun:WELDING_BEAM.stun,sparks:this.sparks.count,visible:this.root.visible};}
}
