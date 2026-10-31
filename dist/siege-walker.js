import {WalkerWeapons} from './walker-weapons.js?v=weapon-break-81';
import {CannonTracking,CANNON_TRACKING} from './cannon-tracking.js?v=beam-tracking-61';
import * as THREE from './vendor/three.module.js';
import {trackedBeamWarningPlan} from './beam-aim.js?v=beam-tracking-61';
import {BeamCycle} from './beam-cycle.js?v=beam-3';
import {WalkerGait,solveLegKnee,angleDelta} from './walker-gait.js?v=walk-2';

// Blender-built rigid components retain hull health plus independently destructible weapons.
export class SiegeWalker {
 constructor(scene,gltf,spec,{onFire,onDebris,onEffect,onFootfall=()=>{},onBeam=()=>{},onDeath=null,onWeaponDestroyed=()=>{},onWreck=()=>{},onRemoveDebris=()=>{}}){
  Object.assign(this,{scene,spec,onFire,onDebris,onEffect,onFootfall,onBeam,onWreck,onRemoveDebris,onWeaponDestroyed});this.onDeath=onDeath||((p)=>this.onEffect(p,false));
  this.root=new THREE.Group();this.root.name='Siege Walker';scene.add(this.root);
  this.nodes={};this.meshes={};this.boxes={};this.restPositions={};this.wrecks=[];this.gait=new WalkerGait();this.cannonTracking=new CannonTracking();this.weapon=new BeamCycle();
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
  this.detachedParts=new Set();this.weapons=new WalkerWeapons({onDestroyed:m=>this.destroyWeapon(m)});this.reset();
 }
 reset(){
  for(const w of this.wrecks){this.onRemoveDebris(w.body);w.group.remove(w.mesh);this.nodes[w.name].add(w.mesh);w.mesh.position.set(0,0,0);w.mesh.quaternion.identity();this.scene.remove(w.group);}
  this.wrecks=[];this.detachedParts.clear();this.weapons.reset();this.staggerPose=null;this.stunRemaining=0;this.stunKind=null;this.stuns=0;this.dead=false;this.deathTime=0;this.broken=false;this.hits={shell:0,rocket:0,infantry:0};this.damageByTeam=[0,0];this.heroDamage=0;this.returnShots=0;this.target=null;this.aiming=false;this.lastSmoke=-1;this.targetIndex=0;this.flash=0;this.podRecoil=0;this.plasmaRecoil=0;this.plasmaCharging=false;this.plasmaAim=null;this.beamAllowed=true;this.podWarning={active:false,progress:0,pulse:false};
  this.cannonTracking.reset();this.weapon.reset();this.eyeTarget=null;this.gazeTarget=null;this.beamAim=null;this.beamSweepOrigin=null;this.onBeam(null);this.root.position.set(0,0,0);this.root.rotation.set(0,0,0);
  for(const [name,n]of Object.entries(this.nodes)){n.rotation.set(0,0,0);n.position.copy(this.restPositions[name]);}
  if(this.nodes.rocket_pod)this.nodes.rocket_pod.rotation.x=-Math.PI/4;if(this.nodes.plasma_cannon)this.nodes.plasma_cannon.rotation.x=-Math.PI/4;
  this.walkPose=this.gait.reset();this.applyWalkPose(this.walkPose);
  for(const m of Object.values(this.meshes)){m.material.color.set('#ffffff');if(m.material.emissive)m.material.emissiveIntensity=m===this.meshes.reactor||m===this.meshes.visor?2:0;}
  this.root.updateMatrixWorld(true);
 }
 isWeaponWorking(id){return !this.dead&&this.weapons.working(id);}
 isPartAvailable(part){return !this.detachedParts.has(part);}
 damageWeapon(power,point,part=null){
  if(this.dead)return 0;
  // Tagged direct hits identify the first armor surface. Untagged splash only wears a
  // module if its impact is actually beside that module; global/core bursts have no point.
  if(!part&&point){
   this.root.updateMatrixWorld(true);
   for(const m of this.weapons.modules){if(m.destroyed)continue;const b=this.boxes[m.part],p=this.meshes[m.part].worldToLocal(new THREE.Vector3(point.x,point.y,point.z)).sub(b.center);if(['x','y','z'].every(a=>Math.abs(p[a])<=b.size[a]/2+.4)){part=m.part;break;}}
  }
  return this.weapons.hurt(part,power);
 }
 destroyWeapon(module){
  if(this.dead)return;
  if(module.id==='beam'){this.weapon.stop();this.aiming=false;this.target=null;this.onBeam(null);}
  if(module.id==='missiles'){this.podWarning={active:false,progress:0,pulse:false};this.podRecoil=0;}
  if(module.id==='plasma'){this.plasmaCharging=false;this.plasmaAim=null;this.plasmaRecoil=0;}
  if(module.id==='eyes')this.eyeTarget=null;
  const wreck=this.detachPart(module.part);if(wreck)this.onDeath(wreck.group.position.clone(),{large:false});
  this.onWeaponDestroyed(module);
 }
 aimPoint(from,variant=0){
  const p=this.root.position;
  // Broad torso targets, never tiny lights; both factions have the same enemy.
  return new THREE.Vector3(p.x+(variant%3-1)*.65,from.y>20?15:12.8,p.z);
 }
 recordHit(kind,team,amount){if(amount<=0)return;this.hits[kind]=(this.hits[kind]||0)+1;if(team===0||team===1)this.damageByTeam[team]+=amount;else this.heroDamage+=amount;this.flash=.14;}
 destroy(){if(this.dead)return;this.restoreStagger();this.stunRemaining=0;this.weapon.stop();this.onBeam(null);this.dead=true;this.deathTime=0;this.deathPose={y:this.root.position.y,chest:this.nodes.chest.rotation.x,head:this.nodes.head.rotation.x,thigh:this.nodes.thigh_l.rotation.x,shin:this.nodes.shin_l.rotation.x};this.onDeath(this.meshes.reactor.localToWorld(this.boxes.reactor.center.clone().add(new THREE.Vector3(0,0,this.boxes.reactor.size.z*.5+.4))),{large:true});}
 restoreStagger(){if(!this.staggerPose)return;for(const [name,q]of Object.entries(this.staggerPose))this.nodes[name].quaternion.copy(q);this.staggerPose=null;this.root.updateMatrixWorld(true);}
 stun(seconds=1,kind='electric'){
  if(this.dead)return false;
  if(kind==='weakpoint'&&!this.staggerPose){this.staggerPose=Object.fromEntries(['chest','head','upperarm_l','upperarm_r'].map(name=>[name,this.nodes[name].quaternion.clone()]));this.staggerAge=0;}
  this.stunKind=this.staggerPose?'weakpoint':kind;this.stunRemaining=Math.max(this.stunRemaining,seconds);this.stuns++;this.onBeam(null);return true;
 }
 animateStagger(dt,time){
  if(!this.staggerPose)return;this.staggerAge+=dt;
  const weight=THREE.MathUtils.smoothstep(this.staggerAge,0,.25)*THREE.MathUtils.smoothstep(this.stunRemaining,0,.4);
  for(const [name,q]of Object.entries(this.staggerPose)){
   const node=this.nodes[name];node.quaternion.copy(q);
   if(name==='chest'){node.rotateX(.28*weight);node.rotateZ(Math.sin(time*27)*.018*weight);}
   else if(name==='head')node.rotateX(.38*weight);
   else node.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(.12,0,name.endsWith('l')?.1:-.1)),weight*.85);
  }
  this.root.updateMatrixWorld(true);
 }
 update(dt,time,targets){
  if(this.stunRemaining>0&&!this.dead){this.stunRemaining=Math.max(0,this.stunRemaining-dt);if(this.stunRemaining<1e-8)this.stunRemaining=0;this.animateStagger(dt,time);if(this.stunRemaining===0)this.restoreStagger();this.onBeam(null);return;}
  this.plasmaRecoil=Math.max(0,this.plasmaRecoil-dt*1.5);if(this.nodes.plasma_cannon)this.nodes.plasma_cannon.position.z=this.restPositions.plasma_cannon.z-this.plasmaRecoil;this.flash=Math.max(0,this.flash-dt);this.podRecoil=Math.max(0,this.podRecoil-dt*.8);if(this.nodes.rocket_pod)this.nodes.rocket_pod.position.z=this.restPositions.rocket_pod.z-this.podRecoil;
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
  const available=targets.filter(u=>u.alive&&!u.dashPhased&&u.kind!=='robot'&&u.id!==this.protectedUnit);
  const locked=['charging','firing'].includes(this.weapon.phase);
  if(!locked&&available.length&&(!this.target?.alive||!available.some(u=>u.id===this.target.id)||(this.weapon.phase==='ready'&&!this.aiming))){const index=this.targetIndex++,air=available.filter(u=>u.kind==='helicopter'),ground=available.filter(u=>u.kind!=='helicopter');this.target=this.targetSelector?this.targetSelector(available):index%2===0&&air.length?air[Math.floor(index/2)%air.length]:ground.length?ground[(index*3)%ground.length]:available[index%available.length];this.aiming=true;}
  const liveTarget=available.find(u=>u.id===this.target?.id);if(liveTarget)this.target=liveTarget;
  if(locked&&liveTarget?.shapes[0])this.beamAim={...liveTarget.shapes[0].center};
  let center=locked?this.beamAim:available.length?this.target?.shapes[0]?.center:null;
  if(this.plasmaCharging&&this.plasmaAim)center=this.plasmaAim;
  else if(!locked&&this.eyeTarget&&this.beamAllowed===false)center=this.eyeTarget;
  const origin=this.plasmaCharging?this.nodes.plasma_cannon.getWorldPosition(new THREE.Vector3()):this.root.position;const desiredYaw=center?Math.atan2(center.x-origin.x,center.z-origin.z):this.gait.yaw;
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
   const waistStep=(twist-this.nodes.waist.rotation.y)*(1-Math.exp(-4*dt)),waistLimit=THREE.MathUtils.degToRad(CANNON_TRACKING.waistDegreesPerSecond)*dt;
   this.nodes.waist.rotation.y+=(locked||this.beamAllowed!==false)?THREE.MathUtils.clamp(waistStep,-waistLimit,waistLimit):waistStep;
   const aimError=angleDelta(desiredYaw,this.root.rotation.y+this.nodes.pelvis.rotation.y+this.nodes.waist.rotation.y);
   // Follow live positions without predicting ahead of an instantaneous beam.
   this.root.updateMatrixWorld(true);
   const shoulder=this.nodes.upperarm_r.getWorldPosition(new THREE.Vector3()),desired=this.targetPoint.clone().sub(shoulder).normalize(),initial=new THREE.Vector3(0,-1,0).transformDirection(this.nodes.forearm_r.matrixWorld),direction=this.cannonTracking.update(dt,desired,initial,this.weapon.phase==='firing'||this.weapon.phase==='charging'&&this.weapon.elapsed+dt>=this.weapon.chargeSeconds-1e-9);
   const localDirection=direction.clone().applyQuaternion(this.nodes.chest.getWorldQuaternion(new THREE.Quaternion()).invert());
   this.nodes.upperarm_r.quaternion.setFromUnitVectors(this.ik.down,localDirection);this.nodes.forearm_r.rotation.set(0,0,0);
   aligned=Math.abs(aimError)<.25&&this.cannonTracking.errorDegrees<CANNON_TRACKING.startErrorDegrees;
  }else{this.nodes.upperarm_r.rotation.x=-.10-swing*.18;this.cannonTracking.reset();}
  this.trackHead(center,dt);
  const state=this.weapon.step(dt,!!center&&aligned&&this.beamAllowed!==false&&this.isWeaponWorking('beam'));
  if(state.events.includes('charging')){this.beamAim={...center};this.beamSweepOrigin={x:this.root.position.x,y:this.root.position.y,z:this.root.position.z};}
  if(state.events.includes('firing')){this.returnShots++;this.onFire?.();}
  if(state.events.includes('cooling'))this.aiming=false;
  this.root.updateMatrixWorld(true);
  const muzzle=this.nodes.forearm_r.localToWorld(new THREE.Vector3(0,-3.9,0));
  const direction=new THREE.Vector3(0,-1,0).transformDirection(this.nodes.forearm_r.matrixWorld);
  const plan=state.phase==='charging'&&this.beamAim?trackedBeamWarningPlan(muzzle,direction,this.beamAim):null;
  this.onBeam({state,from:muzzle,direction,time,plan,aimTarget:this.targetPoint,targetUnit:this.target,attackId:this.weapon.bursts+(state.phase==='charging'?1:0),protectedUnit:this.protectedUnit});
  const hp=this.combatUnit?this.combatUnit.health/this.combatUnit.maxHealth:1;
  for(const [name,m]of Object.entries(this.meshes)){
   if(!this.isPartAvailable(name))continue;
   m.material.color.set(this.flash>0?'#ffd5a4':'#ffffff');const module=this.weapons.forPart(name);if(module&&!this.flash)m.material.color.multiplyScalar(.45+.55*module.health/module.maxHealth);
   if(name==='reactor'||name==='visor'){m.material.emissive.set(state.phase==='charging'||state.phase==='firing'?'#2eabff':'#ff6b17');m.material.emissiveIntensity=(1.5+Math.sin(time*4)*.4)*(hp<.3?1.8:1)+state.charge*3;}
  }
  if(this.plasmaAim)this.aimPlasma(this.plasmaAim);
  if(hp<.4&&Math.floor(time*3)!==this.lastSmoke){this.lastSmoke=Math.floor(time*3);this.onEffect(this.root.localToWorld(new THREE.Vector3(1,15,1)),true);}
  this.root.updateMatrixWorld(true);
 }
 aimPlasma(target){
  this.plasmaAim={...target};const node=this.nodes.plasma_cannon;node.parent.updateWorldMatrix(true,false);
  // Hold the gun above the torso's forward axis; aiming turns the robot, never the mount sideways.
  const forward=new THREE.Vector3(0,0,1).transformDirection(node.parent.matrixWorld);forward.y=0;forward.normalize();const yaw=Math.atan2(forward.x,forward.z),world=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/4,yaw,0,'YXZ')),parent=node.parent.getWorldQuaternion(new THREE.Quaternion());node.quaternion.copy(parent.invert()).multiply(world);node.updateWorldMatrix(false,true);
  const position=node.localToWorld(new THREE.Vector3(0,1.4,3.35)),direction=new THREE.Vector3(0,0,1).transformDirection(node.matrixWorld),to=new THREE.Vector3(target.x-position.x,0,target.z-position.z).normalize();return{position,direction,aligned:forward.dot(to)>=Math.cos(.012)};
 }
 updatePlasmaWarning(active,time=0){if(!this.isWeaponWorking('plasma'))return;this.plasmaCharging=active;const m=this.meshes.plasma_cannon?.material;if(m){m.emissive.set('#18f3a3');m.emissiveIntensity=active?(.45+.4*Math.sin(time*15)**2):0;}}
 updatePodWarning(state){if(!this.isWeaponWorking('missiles'))return;this.podWarning={...state};const m=this.meshes.rocket_pod?.material;if(!m)return;m.emissive.set('#ff3b0c');m.emissiveIntensity=state.active?(state.pulse?4.2:.1):0;}
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
  if(this.broken)return;this.broken=true;this.root.updateMatrixWorld(true);
  this.onDeath(this.root.position.clone().add(new THREE.Vector3(0,11,0)),{large:true,secondary:true});
  for(const p of this.spec.parts)this.detachPart(p.name);
 }
 detachPart(name){
  if(this.detachedParts.has(name))return null;
  this.root.updateMatrixWorld(true);const mesh=this.meshes[name],box=this.boxes[name],center=mesh.localToWorld(box.center.clone()),rotation=mesh.getWorldQuaternion(new THREE.Quaternion());
  const group=new THREE.Group();group.position.copy(center);group.quaternion.copy(rotation);this.scene.add(group);
  mesh.removeFromParent();mesh.position.copy(box.center).negate();group.add(mesh);this.detachedParts.add(name);
  const body=this.onDebris({position:center,quaternion:rotation,size:box.size.toArray().map(v=>Math.max(.18,v*.93)),mass:Math.max(40,box.size.x*box.size.y*box.size.z*110)});
  const angle=this.wrecks.length*2.399,dx=center.x-this.root.position.x,dz=center.z-this.root.position.z,length=Math.hypot(dx,dz);body.velocity.set(length>.5?dx/length*3.4:Math.cos(angle)*2.4,2.8,length>.5?dz/length*3.4:Math.sin(angle)*2.4);body.angularVelocity.set(Math.sin(angle)*.8,.35,Math.cos(angle)*.8);mesh.material.color.multiplyScalar(.48);if(mesh.material.emissive)mesh.material.emissiveIntensity=0;
  const wreck={name,mesh,group,body,size:box.size.toArray(),half:{x:box.size.x/2,y:box.size.y/2,z:box.size.z/2}};this.wrecks.push(wreck);this.onWreck(wreck);return wreck;
 }
 syncWrecks(){for(const w of this.wrecks){w.group.position.copy(w.body.position);w.group.quaternion.copy(w.body.quaternion);}}
 shapes(){
  if(this.broken)return this.wrecks.map(w=>({center:{...w.body.position},half:w.half,rotation:{...w.body.quaternion}}));
  this.root.updateMatrixWorld(true);const result=[];
  for(const [name,mesh]of Object.entries(this.meshes)){
   if(name==='reactor'||!this.isPartAvailable(name))continue;
   const b=this.boxes[name],local=b.center.clone();
   // The helmet's coarse box covers the recessed visor. Extend only the thin
   // eye strip forward so aimed shots reach the emitter before that coarse hull.
   if(name==='visor')local.z+=.16;
   const c=mesh.localToWorld(local),q=mesh.getWorldQuaternion(new THREE.Quaternion());
   result.push({part:name,center:{x:c.x,y:c.y,z:c.z},half:{x:b.size.x/2,y:b.size.y/2+(name==='visor'?.06:0),z:b.size.z/2+(name==='visor'?.16:0)},rotation:{x:q.x,y:q.y,z:q.z,w:q.w}});
  }return result;
 }
 plasmaForwardError(){const node=this.nodes.plasma_cannon;if(!node)return null;const a=new THREE.Vector3(0,0,1).transformDirection(node.matrixWorld),b=new THREE.Vector3(0,0,1).transformDirection(node.parent.matrixWorld);a.y=b.y=0;a.normalize();b.normalize();return THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(a.dot(b),-1,1)));}
 diagnostics(){return{weapons:this.weapons.diagnostics(),cannonTracking:this.cannonTracking.diagnostics(),stunRemaining:this.stunRemaining,stuns:this.stuns,health:this.combatUnit?.health,maxHealth:this.combatUnit?.maxHealth,alive:!this.dead,position:this.root.position.toArray(),triangles:this.spec.triangles,parts:this.spec.parts.length,hits:{...this.hits},damageByTeam:[...this.damageByTeam],heroDamage:this.heroDamage,returnShots:this.returnShots,broken:this.broken,wreckBodies:this.wrecks.length,target:this.target?.id,gait:this.gait.diagnostics(),pod:{angleDegrees:45,warning:{...this.podWarning},emissive:this.meshes.rocket_pod?.material.emissiveIntensity},plasmaCannon:{charging:this.plasmaCharging,forwardErrorDegrees:this.plasmaForwardError(),angleDegrees:this.nodes.plasma_cannon?THREE.MathUtils.radToDeg(Math.asin(new THREE.Vector3(0,0,1).transformDirection(this.nodes.plasma_cannon.matrixWorld).y)):null},weapon:this.weapon.diagnostics(),gaze:this.gazeDiagnostics()};}
}
