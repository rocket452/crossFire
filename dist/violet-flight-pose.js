import * as THREE from './vendor/three.module.js';
const X=new THREE.Vector3(1,0,0);
const capeMeshes=new WeakMap();
function deformCape(character,time,flow,drift){
 let panels=capeMeshes.get(character);
 if(!panels){
  panels=character.meshes.filter(mesh=>['cape','cape trim'].includes(mesh.material.name)).map(mesh=>{
   mesh.geometry=mesh.geometry.clone();
   const position=mesh.geometry.getAttribute('position');
   position.setUsage(THREE.DynamicDrawUsage);
   return {geometry:mesh.geometry,position,rest:position.array.slice()};
  });
  capeMeshes.set(character,panels);
 }
 for(const {geometry,position,rest} of panels){
  for(let i=0;i<position.count;i++){
   const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
   const drop=THREE.MathUtils.clamp((1.481-y)/1.122,0,1),weight=drop**1.5;
   const ripple=Math.sin(time*(3.8+flow*3)-drop*7+x*8)*(.024+.055*flow)
    +Math.sin(time*4.8-drop*11-x*13)*.019;
   const billow=Math.max(0,.012+flow*.075+ripple)*weight;
   position.setXYZ(i,x+weight*(drift*.17+Math.sin(time*3.5-drop*6)*(.03+flow*.032)),
    y+weight*(billow*.45+flow*.032),z-billow);
  }
  position.needsUpdate=true;
  geometry.computeVertexNormals();
 }
}
// Presentation only: movement, shield collision and weapon timing remain authoritative.
export class VioletFlightPose {
 constructor(){this.orientation=new THREE.Quaternion();this.target=new THREE.Quaternion();this.euler=new THREE.Euler(0,0,0,'YXZ');this.reset();}
 reset(){this.flight=0;this.action=0;this.pitch=0;this.initialized=false;this.orientation.identity();this.airflow=0;this.capeDrift=0;this.lastLateralSpeed=null;this.time=0;}
 step(dt,velocity,yaw,{raised=false,blocking=false}={}){
  const speed=velocity.length(),travel=THREE.MathUtils.smoothstep(speed,4,16),h=Math.max(0,dt);
  this.action=THREE.MathUtils.damp(this.action,raised?1:0,12,h);
  this.flight=THREE.MathUtils.damp(this.flight,raised?0:travel,7,h);
  const heading=Math.atan2(velocity.x,velocity.z),delta=Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw)),elevation=Math.atan2(velocity.y,Math.hypot(velocity.x,velocity.z));
  this.pitch=(1.49-THREE.MathUtils.clamp(elevation,-.65,.65)*.56)*this.flight;
  const lateral=velocity.x*Math.cos(yaw)-velocity.z*Math.sin(yaw);
  const acceleration=h>0&&this.lastLateralSpeed!==null?(lateral-this.lastLateralSpeed)/h:0;
  this.lastLateralSpeed=lateral;
  this.airflow=THREE.MathUtils.damp(this.airflow,travel,4,h);
  this.capeDrift=THREE.MathUtils.damp(this.capeDrift,THREE.MathUtils.clamp(-lateral/18-acceleration/75,-1,1),7,h);
  this.euler.set(this.pitch,yaw+delta*this.flight,THREE.MathUtils.clamp(-velocity.x*.003,-.09,.09)*this.flight,'YXZ');this.target.setFromEuler(this.euler);
  if(!this.initialized){this.orientation.setFromEuler(new THREE.Euler(0,yaw,0));this.initialized=true;}
  this.orientation.slerp(this.target,1-Math.exp(-8*h));this.blocking=blocking;
 }
 applyVisual(root,visual,time=0){
  visual.quaternion.copy(root.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(this.orientation);
  const rumble=this.flight;
  visual.rotateX(rumble*(Math.sin(time*20)*.012+Math.sin(time*31)*.006));
  visual.rotateZ(rumble*(Math.sin(time*16)*.021+Math.sin(time*27)*.009));
  visual.position.y=1.5+rumble*(Math.sin(time*21)*.022+Math.sin(time*13)*.014);
 }
 pose(nodes,time){
  this.time=time;
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
  if(!character)return;
  character.update('Idle',dt);
  deformCape(character,this.time,this.airflow,this.capeDrift);
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
