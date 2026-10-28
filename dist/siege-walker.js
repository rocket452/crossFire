import * as THREE from './vendor/three.module.js';
import {BEAM_SWEEP,sweptBeamTarget,beamWarningPlan} from './beam-aim.js?v=telegraph-4';
import {BeamCycle} from './beam-cycle.js?v=beam-3';
import {WalkerGait,solveLegKnee,angleDelta} from './walker-gait.js?v=walk-2';

// Blender-built rigid components share one health pool and explicit collision boxes.
export class SiegeWalker {
 constructor(scene,gltf,spec,{onFire,onDebris,onEffect,onFootfall=()=>{},onBeam=()=>{}}){
  Object.assign(this,{scene,spec,onFire,onDebris,onEffect,onFootfall,onBeam});
  this.root=new THREE.Group();this.root.name='Siege Walker';scene.add(this.root);
  this.nodes={};this.meshes={};this.boxes={};this.restPositions={};this.wrecks=[];this.gait=new WalkerGait();this.weapon=new BeamCycle();
  this.ik={hip:new THREE.Vector3(),upper:new THREE.Vector3(),lower:new THREE.Vector3(),down:new THREE.Vector3(0,-1,0),axis:new THREE.Vector3(0,1,0),parent:new THREE.Quaternion(),yaw:new THREE.Quaternion(),rotation:new THREE.Quaternion()};
  gltf.scene.updateMatrixWorld(true);
  for(const p of spec.parts){
   const source=gltf.scene.getObjectByName(p.name);
   if(!source?.isMesh)throw Error('Missing robot component '+p.name);
   const pivot=new THREE.Vector3(...p.pivot),geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
   geometry.translate(-pivot.x,-pivot.y,-pivot.z);geometry.computeBoundingBox();
   const material=source.material.clone();
   if(p.name==='reactor'||p.name==='visor'){material.emissive=new THREE.Color('#ff6b17');material.emissiveIntensity=2;}
   const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;
   const node=new THREE.Group();node.name=p.name;node.add(mesh);
   const parent=p.parent?this.nodes[p.parent]:this.root;
   const parentPivot=p.parent?new THREE.Vector3(...spec.parts.find(q=>q.name===p.parent).pivot):new THREE.Vector3();
   node.position.copy(pivot).sub(parentPivot);parent.add(node);
   this.restPositions[p.name]=node.position.clone();this.nodes[p.name]=node;this.meshes[p.name]=mesh;
   const b=geometry.boundingBox;this.boxes[p.name]={center:b.getCenter(new THREE.Vector3()),size:b.getSize(new THREE.Vector3())};
  }
  this.reset();
 }
 reset(){
  for(const w of this.wrecks){w.group.remove(w.mesh);this.nodes[w.name].add(w.mesh);w.mesh.position.set(0,0,0);w.mesh.quaternion.identity();this.scene.remove(w.group);}
  this.wrecks=[];this.dead=false;this.deathTime=0;this.broken=false;this.hits={shell:0,rocket:0,infantry:0};this.damageByTeam=[0,0];this.returnShots=0;this.target=null;this.aiming=false;this.lastSmoke=-1;this.targetIndex=0;this.flash=0;
  this.weapon.reset();this.gazeTarget=null;this.beamAim=null;this.beamSweepOrigin=null;this.onBeam(null);this.root.position.set(0,0,0);this.root.rotation.set(0,0,0);
  for(const [name,n]of Object.entries(this.nodes)){n.rotation.set(0,0,0);n.position.copy(this.restPositions[name]);}
  this.walkPose=this.gait.reset();this.applyWalkPose(this.walkPose);
  for(const m of Object.values(this.meshes)){m.material.color.set('#ffffff');if(m.material.emissive)m.material.emissiveIntensity=m===this.meshes.reactor||m===this.meshes.visor?2:0;}
  this.root.updateMatrixWorld(true);
 }
 aimPoint(from,variant=0){
  const p=this.root.position;
  // Broad torso targets, never tiny lights; both factions have the same enemy.
  return new THREE.Vector3(p.x+(variant%3-1)*.65,from.y>20?15:12.8,p.z);
 }
 recordHit(kind,team,amount){if(amount<=0)return;this.hits[kind]=(this.hits[kind]||0)+1;this.damageByTeam[team]+=amount;this.flash=.14;}
 destroy(){this.weapon.stop();this.onBeam(null);this.dead=true;this.deathTime=0;this.deathPose={y:this.root.position.y,chest:this.nodes.chest.rotation.x,head:this.nodes.head.rotation.x,thigh:this.nodes.thigh_l.rotation.x,shin:this.nodes.shin_l.rotation.x};this.onEffect(this.root.position.clone().add(new THREE.Vector3(0,14,0)),false);}
 update(dt,time,targets){
  this.flash=Math.max(0,this.flash-dt);
  if(this.dead){
   this.deathTime+=dt;
   if(!this.broken){
    const t=Math.min(1,this.deathTime/1.5);
    this.nodes.chest.rotation.x=THREE.MathUtils.lerp(this.deathPose.chest,.55,t);this.nodes.head.rotation.x=THREE.MathUtils.lerp(this.deathPose.head,.35,t);this.nodes.thigh_l.rotation.x=THREE.MathUtils.lerp(this.deathPose.thigh,-.45,t);this.nodes.shin_l.rotation.x=THREE.MathUtils.lerp(this.deathPose.shin,.9,t);
    this.root.position.y=THREE.MathUtils.lerp(this.deathPose.y,-1.7,t);this.root.rotation.z=t*.16;
    this.meshes.reactor.material.emissiveIntensity=Math.max(0,2*(1-t));this.meshes.visor.material.emissiveIntensity=0;
    if(t===1)this.breakApart();
   }
   return;
  }
  const available=targets.filter(u=>u.alive&&u.kind!=='robot'&&u.id!==this.protectedUnit);
  const locked=['charging','firing'].includes(this.weapon.phase);
  if(!locked&&available.length&&(!this.target?.alive||(this.weapon.phase==='ready'&&!this.aiming))){this.target=available[(this.targetIndex++*7+2)%available.length];this.aiming=true;}
  let center=locked?this.beamAim:available.length?this.target?.shapes[0]?.center:null;
  if(center&&this.weapon.phase==='firing')center=sweptBeamTarget(center,this.beamSweepOrigin||this.root.position,Math.sin(this.weapon.elapsed/this.weapon.fireSeconds*Math.PI*2)*BEAM_SWEEP);
  const desiredYaw=center?Math.atan2(center.x-this.root.position.x,center.z-this.root.position.z):this.gait.yaw;
  this.walkPose=this.gait.update(dt,time,desiredYaw);this.applyWalkPose(this.walkPose);
  for(const step of this.walkPose.landings)this.onFootfall(step);
  const swing=Math.sin(time*Math.PI*2/this.gait.cycle);
  this.nodes.upperarm_l.rotation.x=-.10+swing*.18;this.nodes.forearm_l.rotation.x=-.23-Math.max(0,swing)*.08;
  this.nodes.chest.rotation.x=.025+this.walkPose.compression*.015;
  this.nodes.chest.rotation.z=-this.walkPose.roll*.55;
  let aligned=false;
  if(center){
   this.targetPoint=new THREE.Vector3(center.x,center.y,center.z);
   const relative=angleDelta(desiredYaw,this.root.rotation.y+this.nodes.pelvis.rotation.y);
   const twist=THREE.MathUtils.clamp(relative,-1.45,1.45);
   this.nodes.waist.rotation.y+=(twist-this.nodes.waist.rotation.y)*(1-Math.exp(-4*dt));
   const aimError=angleDelta(desiredYaw,this.root.rotation.y+this.nodes.pelvis.rotation.y+this.nodes.waist.rotation.y);
   // Align the actual barrel axis, including the cannon shoulder's lateral offset.
   this.root.updateMatrixWorld(true);
   const localTarget=this.nodes.chest.worldToLocal(this.targetPoint.clone()).sub(this.nodes.upperarm_r.position).normalize();
   this.nodes.upperarm_r.quaternion.setFromUnitVectors(this.ik.down,localTarget);
   this.nodes.forearm_r.rotation.set(0,0,0);
   aligned=Math.abs(aimError)<.25;
  }else this.nodes.upperarm_r.rotation.x=-.10-swing*.18;
  this.trackHead(center,dt);
  const state=this.weapon.step(dt,!!center&&aligned);
  if(state.events.includes('charging')){this.beamAim={...center};this.beamSweepOrigin={x:this.root.position.x,y:this.root.position.y,z:this.root.position.z};}
  if(state.events.includes('firing')){this.returnShots++;this.onFire?.();}
  if(state.events.includes('cooling'))this.aiming=false;
  this.root.updateMatrixWorld(true);
  const muzzle=this.nodes.forearm_r.localToWorld(new THREE.Vector3(0,-3.9,0));
  const direction=new THREE.Vector3(0,-1,0).transformDirection(this.nodes.forearm_r.matrixWorld);
  const shoulder=this.nodes.upperarm_r.getWorldPosition(new THREE.Vector3());
  const plan=state.phase==='charging'&&this.beamAim?beamWarningPlan(this.beamAim,this.beamSweepOrigin,shoulder):null;
  this.onBeam({state,from:muzzle,direction,time,plan,protectedUnit:this.protectedUnit});
  const hp=this.combatUnit?this.combatUnit.health/this.combatUnit.maxHealth:1;
  for(const [name,m]of Object.entries(this.meshes)){
   m.material.color.set(this.flash>0?'#ffd5a4':'#ffffff');
   if(name==='reactor'||name==='visor'){m.material.emissive.set(state.phase==='charging'||state.phase==='firing'?'#2eabff':'#ff6b17');m.material.emissiveIntensity=(1.5+Math.sin(time*4)*.4)*(hp<.3?1.8:1)+state.charge*3;}
  }
  if(hp<.4&&Math.floor(time*3)!==this.lastSmoke){this.lastSmoke=Math.floor(time*3);this.onEffect(this.root.localToWorld(new THREE.Vector3(1,15,1)),true);}
  this.root.updateMatrixWorld(true);
 }
 trackHead(target,dt){
  const head=this.nodes.head;let yaw=0,pitch=0;
  this.gazeTarget=target?{x:target.x,y:target.y,z:target.z}:null;
  if(target){
   head.parent.updateWorldMatrix(true,false);
   const local=head.parent.worldToLocal(new THREE.Vector3(target.x,target.y,target.z)).sub(head.position);
   yaw=THREE.MathUtils.clamp(Math.atan2(local.x,local.z),-1.15,1.15);
   pitch=THREE.MathUtils.clamp(-Math.atan2(local.y,Math.hypot(local.x,local.z)),-.65,.90);
  }
  const blend=1-Math.exp(-7*dt),limit=2.5*dt;
  const nextYaw=head.rotation.y+THREE.MathUtils.clamp(angleDelta(yaw,head.rotation.y)*blend,-limit,limit);
  const nextPitch=head.rotation.x+THREE.MathUtils.clamp((pitch-head.rotation.x)*blend,-limit,limit);
  head.rotation.set(nextPitch,nextYaw,0,'YXZ');
 }
 gazeDiagnostics(){
  const head=this.nodes.head,position=head.getWorldPosition(new THREE.Vector3()),direction=new THREE.Vector3(0,0,1).transformDirection(head.matrixWorld);
  const target=this.gazeTarget,desired=target?new THREE.Vector3(target.x,target.y,target.z).sub(position).normalize():null;
  return{target,yaw:head.rotation.y,pitch:head.rotation.x,direction:direction.toArray(),errorDegrees:desired?THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(direction.dot(desired),-1,1))):null};
 }
 applyWalkPose(pose){
  this.root.position.set(pose.x,pose.y,pose.z);this.root.rotation.y=pose.yaw;
  this.nodes.pelvis.position.x=this.restPositions.pelvis.x+pose.sway;
  this.nodes.pelvis.rotation.set(0,pose.twist,pose.roll);
  this.root.updateMatrixWorld(true);
  const k=this.ik;
  for(const foot of pose.feet){
   const thigh=this.nodes['thigh_'+foot.side],shin=this.nodes['shin_'+foot.side],ankle=this.nodes['foot_'+foot.side];
   thigh.getWorldPosition(k.hip);
   const heading=pose.yaw+angleDelta(foot.yaw,pose.yaw)*.5;
   const knee=solveLegKnee(k.hip,foot.ankle,heading,shin.position.length(),ankle.position.length());
   k.upper.set(knee.x-k.hip.x,knee.y-k.hip.y,knee.z-k.hip.z).normalize();
   k.lower.set(foot.ankle.x-knee.x,foot.ankle.y-knee.y,foot.ankle.z-knee.z).normalize();
   k.yaw.setFromAxisAngle(k.axis,heading);
   // Local down vectors retain a consistent knee bend plane during a turn.
   k.upper.applyQuaternion(k.rotation.copy(k.yaw).invert());
   k.rotation.setFromUnitVectors(k.down,k.upper).premultiply(k.yaw);
   thigh.parent.getWorldQuaternion(k.parent).invert();thigh.quaternion.copy(k.parent).multiply(k.rotation);
   thigh.updateWorldMatrix(false,true);
   k.lower.applyQuaternion(k.rotation.copy(k.yaw).invert());
   k.rotation.setFromUnitVectors(k.down,k.lower).premultiply(k.yaw);
   thigh.getWorldQuaternion(k.parent).invert();shin.quaternion.copy(k.parent).multiply(k.rotation);
   shin.updateWorldMatrix(false,true);
   k.rotation.setFromEuler(new THREE.Euler(foot.pitch,foot.yaw,0,'YXZ'));
   shin.getWorldQuaternion(k.parent).invert();ankle.quaternion.copy(k.parent).multiply(k.rotation);
   ankle.updateWorldMatrix(false,true);
  }
 }
 breakApart(){
  this.broken=true;this.root.updateMatrixWorld(true);
  this.onEffect(this.root.position.clone().add(new THREE.Vector3(0,11,0)),false);
  for(const p of this.spec.parts){
   const mesh=this.meshes[p.name],box=this.boxes[p.name],center=mesh.localToWorld(box.center.clone()),rotation=mesh.getWorldQuaternion(new THREE.Quaternion());
   const group=new THREE.Group();group.position.copy(center);group.quaternion.copy(rotation);this.scene.add(group);
   mesh.removeFromParent();mesh.position.copy(box.center).negate();group.add(mesh);
   const body=this.onDebris({position:center,quaternion:rotation,size:box.size.toArray().map(v=>Math.max(.18,v*.93)),mass:Math.max(40,box.size.x*box.size.y*box.size.z*110)});
   body.velocity.set((p.name.endsWith('l')?-1:1)*1.1,1.3,1.4);body.angularVelocity.set(.15,.1,.28);
   this.wrecks.push({name:p.name,mesh,group,body,half:{x:box.size.x/2,y:box.size.y/2,z:box.size.z/2}});
  }
 }
 syncWrecks(){for(const w of this.wrecks){w.group.position.copy(w.body.position);w.group.quaternion.copy(w.body.quaternion);}}
 shapes(){
  if(this.broken)return this.wrecks.map(w=>({center:{...w.body.position},half:w.half,rotation:{...w.body.quaternion}}));
  this.root.updateMatrixWorld(true);const result=[];
  for(const [name,mesh]of Object.entries(this.meshes)){
   if(name==='reactor'||name==='visor')continue;
   const b=this.boxes[name],c=mesh.localToWorld(b.center.clone()),q=mesh.getWorldQuaternion(new THREE.Quaternion());
   result.push({center:{x:c.x,y:c.y,z:c.z},half:{x:b.size.x/2,y:b.size.y/2,z:b.size.z/2},rotation:{x:q.x,y:q.y,z:q.z,w:q.w}});
  }return result;
 }
 diagnostics(){return{health:this.combatUnit?.health,maxHealth:this.combatUnit?.maxHealth,alive:!this.dead,position:this.root.position.toArray(),triangles:this.spec.triangles,parts:this.spec.parts.length,hits:{...this.hits},damageByTeam:[...this.damageByTeam],returnShots:this.returnShots,broken:this.broken,wreckBodies:this.wrecks.length,target:this.target?.id,gait:this.gait.diagnostics(),weapon:this.weapon.diagnostics(),gaze:this.gazeDiagnostics()};}
}
