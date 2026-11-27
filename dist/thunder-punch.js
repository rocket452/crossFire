import * as THREE from './vendor/three.module.js';

export const THUNDER_PUNCH=Object.freeze({
 key:'h',cost:25,damage:300,range:3.8,radius:.38,windup:.09,recovery:.3,stagger:.42
});

export class ThunderPunch {
 constructor(scene,config=THUNDER_PUNCH){
  this.config=config;
  this.wave=new THREE.Group();
  const rim=new THREE.RingGeometry(.81,1,36);
  this.glow=new THREE.MeshBasicMaterial({color:0x48deff,transparent:true,depthWrite:false,
   side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
  this.rings=[0,1,2].map(i=>{
   const ring=new THREE.Mesh(rim,this.glow);
   ring.position.z=-i*.28;this.wave.add(ring);return ring;
  });
  scene.add(this.wave);this.reset();
 }
 reset(){this.cancel();this.attacks=0;}
 cancel(){this.age=Infinity;this.waveAge=Infinity;this.wave.visible=false;}
 get active(){return this.age<this.config.windup+this.config.recovery-1e-8;}
 get striking(){return this.age<this.config.windup-1e-8;}
 start(energy){
  if(this.active||!energy.spend(this.config.cost))return false;
  this.age=0;this.attacks++;return true;
 }
 step(dt,strike){
  const pending=this.striking;
  this.age+=dt;
  if(pending&&!this.striking){
   this.age=this.config.windup;
   strike();
  }
  this.waveAge+=dt;
  const t=this.waveAge/.29;
  this.wave.visible=t<1;
  if(!this.wave.visible)return;
  this.wave.position.copy(this.origin).addScaledVector(this.direction,t*this.travel);
  this.glow.opacity=.92*(1-t);
  for(const [i,ring] of this.rings.entries())ring.scale.setScalar((.17+t*1.85)*(1-i*.21));
 }
 release(origin,end,direction){
  this.origin=origin.clone();this.direction=direction.clone();this.travel=origin.distanceTo(end);
  this.wave.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);
  this.waveAge=0;
 }
}
