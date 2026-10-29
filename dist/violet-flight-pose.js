import * as THREE from './vendor/three.module.js';
const X=new THREE.Vector3(1,0,0);
// Presentation only: movement, shield collision and weapon timing remain authoritative.
export class VioletFlightPose {
 constructor(){this.orientation=new THREE.Quaternion();this.target=new THREE.Quaternion();this.euler=new THREE.Euler(0,0,0,'YXZ');this.reset();}
 reset(){this.flight=0;this.action=0;this.pitch=0;this.initialized=false;this.orientation.identity();}
 step(dt,velocity,yaw,{raised=false,blocking=false}={}){
  const speed=velocity.length(),travel=THREE.MathUtils.smoothstep(speed,5,22),h=Math.max(0,dt);
  this.action=THREE.MathUtils.damp(this.action,raised?1:0,12,h);
  this.flight=THREE.MathUtils.damp(this.flight,raised?0:travel,7,h);
  const heading=Math.atan2(velocity.x,velocity.z),delta=Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw)),elevation=Math.atan2(velocity.y,Math.hypot(velocity.x,velocity.z));
  this.pitch=(1.38-THREE.MathUtils.clamp(elevation,-.65,.65))*this.flight;
  this.euler.set(this.pitch,yaw+delta*this.flight,THREE.MathUtils.clamp(-velocity.x*.003,-.09,.09)*this.flight,'YXZ');this.target.setFromEuler(this.euler);
  if(!this.initialized){this.orientation.setFromEuler(new THREE.Euler(0,yaw,0));this.initialized=true;}
  this.orientation.slerp(this.target,1-Math.exp(-8*h));this.blocking=blocking;
 }
 applyVisual(root,visual){visual.quaternion.copy(root.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(this.orientation);}
 pose(nodes,time){
  const f=this.flight,a=this.action,lerp=THREE.MathUtils.lerp;
  for(const[side,sign]of[['l',-1],['r',1]]){
   const leading=side==='r',hover=-.06+Math.sin(time*1.3+sign)*.025;
   nodes['upperarm_'+side].rotation.set(lerp(lerp(hover,leading?-2.97:-.30,f),-1.35,a),0,lerp(-sign*.10,-sign*.32,a));
   nodes['forearm_'+side].rotation.set(lerp(lerp(-.16,leading?-.05:-1.0,f),-.15,a),0,0);
   nodes['thigh_'+side].rotation.set(lerp(.04+Math.sin(time*1.5+sign)*.025,leading?-.05:.06,f),0,-sign*.025);
   nodes['shin_'+side].rotation.set(lerp(.16+Math.sin(time*1.5+sign)*.025,leading?.035:.10,f),0,0);
  }
  nodes.head.position.set(0,.70,0);nodes.head.quaternion.identity();
  nodes.chest.rotation.x=this.blocking?-.06:.015;
  nodes.cape_top.rotation.x=lerp(.20,-.04,f)+Math.sin(time*3.5)*lerp(.08,.025,f);
  nodes.cape_mid.rotation.x=lerp(.18,-.025,f)+Math.sin(time*3.5-.7)*lerp(.12,.04,f);
  nodes.cape_tail.rotation.x=lerp(.10,0,f)+Math.sin(time*3.5-1.4)*lerp(.16,.06,f);
  nodes.cape_tail.rotation.z=Math.sin(time*2)*(.06+f*.04);
 }
 applyCharacter(character,nodes,dt,lookPitch=0){
  // Retain the source rig/skin and relaxed finger animation, replace its combat/fall body pose.
  character.update('Idle',dt);
  for(let i=0;i<character.bones.length;i++){const b=character.bones[i];if(!b.name.includes('Finger')){b.position.copy(character.rest[i].p);b.quaternion.copy(character.rest[i].q);}}
  character.root.updateWorldMatrix(true,true);character.syncArms(nodes);
  for(const[side,key]of[['L','l'],['R','r']]){
   const upper=character.nodes['B_'+side+'_Thigh'],lower=character.nodes['B_'+side+'_Calf'],foot=character.nodes['B_'+side+'_Foot'],toe=character.nodes['B_'+side+'_Toe0'];
   const direction=nodes['shin_'+key].getWorldPosition(new THREE.Vector3()).sub(nodes['thigh_'+key].getWorldPosition(new THREE.Vector3())).normalize();
   character.point(upper,lower,upper.getWorldPosition(new THREE.Vector3()).add(direction));
   const shinDirection=nodes['shin_'+key].localToWorld(new THREE.Vector3(0,-1,0)).sub(nodes['shin_'+key].getWorldPosition(new THREE.Vector3())).normalize();
   character.point(lower,foot,lower.getWorldPosition(new THREE.Vector3()).add(shinDirection));
   // Toes extend behind him in fast flight, rather than hanging at a right angle.
   const toeDirection=new THREE.Vector3(0,-this.flight,1-this.flight).normalize().transformDirection(nodes.pelvis.matrixWorld);
   character.point(foot,toe,foot.getWorldPosition(new THREE.Vector3()).add(toeDirection));
  }
  const head=character.nodes.B_Head,axis=X.clone().transformDirection(nodes.pelvis.parent.matrixWorld),angle=-this.pitch*.78+lookPitch*(1-this.flight);
  const turn=new THREE.Quaternion().setFromAxisAngle(axis,angle),anchor=head.getWorldPosition(new THREE.Vector3()),proxy=nodes.head,proxyPosition=proxy.getWorldPosition(new THREE.Vector3()).sub(anchor).applyQuaternion(turn).add(anchor),proxyWorld=proxy.getWorldQuaternion(new THREE.Quaternion()).premultiply(turn);
  const world=head.getWorldQuaternion(new THREE.Quaternion()).premultiply(turn);head.quaternion.copy(head.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(world);head.updateWorldMatrix(false,true);
  // The legacy eye accessory follows the real head pivot, including its counter-tilt.
  proxy.position.copy(proxy.parent.worldToLocal(proxyPosition));proxy.quaternion.copy(proxy.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(proxyWorld);proxy.updateWorldMatrix(false,true);
 }
 diagnostics(){return{pose:this.action>.5?'power':this.flight>.55?'super-flight':'hover',flightBlend:this.flight,actionBlend:this.action,pitch:this.pitch||0};}
}
