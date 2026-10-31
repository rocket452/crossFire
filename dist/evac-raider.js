import * as THREE from './vendor/three.module.js';
import {DroneTracks} from './drone-tracks.js?v=tracked-drones-64';
import {EVACUATION_CONFIG} from './evacuation-config.js?v=evacuation-57';
import {projectileSilhouette} from './projectile-silhouette.js?v=silhouette-49';
export const RAIDER_COMBAT=Object.freeze({heroRange:30,weaponRange:34,turnRate:120*Math.PI/180,pitchRate:120*Math.PI/180,alignment:7*Math.PI/180,switchMargin:5,windup:1,cooldown:2.5});
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class EvacRaider {
 constructor(scene,damage,{getTargets,visible,trace,redirect=()=>null,onEvent=()=>{},onHeroHit=()=>{},id='evac-raider',spawnPosition=null,objective=null,moveSpeed=1.6,initialCooldown=4,isPathClear=()=>true}){
  Object.assign(this,{scene,damage,getTargets,visible,trace,redirect,onEvent,onHeroHit,id,spawnPosition,objective,moveSpeed,initialCooldown,isPathClear});this.root=new THREE.Group();this.root.name='Evacuation Raider';scene.add(this.root);this.evac=true;this.geometry=new THREE.BoxGeometry(1,1,1);this.parts={};this.materials={};
  const armor=new THREE.MeshStandardMaterial({color:'#6c747b',metalness:.5,roughness:.65}),dark=new THREE.MeshStandardMaterial({color:'#232c35',roughness:.7}),red=new THREE.MeshStandardMaterial({color:'#ff5137',emissive:'#ff3010',emissiveIntensity:2});
  const part=(name,parent,p,size,mat)=>{const pivot=new THREE.Group();pivot.position.set(...p);const mesh=new THREE.Mesh(this.geometry,mat);mesh.scale.set(...size);mesh.castShadow=mesh.receiveShadow=true;pivot.add(mesh);parent.add(pivot);this.parts[name]=pivot;return pivot;};
  const body=part('body',this.root,[0,2.9,0],[1.8,1.5,1.05],armor);part('reactor',body,[0,0,.57],[.48,.55,.12],red);const head=part('head',body,[0,1.12,0],[1.05,.65,.85],armor);part('visor',head,[0,.04,.46],[.76,.15,.08],red);
  this.tracks=new DroneTracks(this.root,{armor,dark});
  part('arm_l',body,[-1.2,-.1,0],[.55,1.9,.55],armor);const arm=part('arm_r',body,[1.18,-.05,.25],[.65,.8,.7],armor);this.barrel=part('barrel',arm,[0,-.15,.8],[.52,.52,1.5],dark);part('muzzle',this.barrel,[0,0,.8],[.55,.55,.1],red);
  this.warning=new THREE.Mesh(new THREE.RingGeometry(2.2,2.35,32),new THREE.MeshBasicMaterial({color:'#ff533a',transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));this.warning.rotation.x=-Math.PI/2;this.warning.position.y=.12;this.root.add(this.warning);
  this.boltGeometry=new THREE.IcosahedronGeometry(.22,0);this.boltMaterial=new THREE.MeshBasicMaterial({color:'#ff6044',toneMapped:false});this.reset();
 }
 reset(){for(const bolt of this.bolts||[])this.scene.remove(bolt.mesh);this.bolts=[];this.damage.units=this.damage.units.filter(u=>u.entity!==this);this.combatUnit=null;this.spawned=false;this.dead=false;this.age=0;this.shots=0;this.hits=0;this.heroHits=0;this.aimError=null;this.received=0;this.cooldown=this.initialCooldown;this.windup=0;this.target=null;this.stunRemaining=0;this.root.visible=false;this.root.position.set(EVACUATION_CONFIG.landingX+17,.1,EVACUATION_CONFIG.landingZ);if(this.spawnPosition)this.root.position.copy(this.spawnPosition);this.root.rotation.set(0,this.objective?Math.PI:0,0);this.tracks.reset();this.parts.body.rotation.set(0,0,0);this.parts.arm_r.rotation.set(0,0,0);this.parts.body.position.y=2.9;this.warning.visible=true;}
 spawn(){if(this.spawned)return false;this.spawned=true;this.root.visible=true;this.combatUnit=this.damage.add(this.id,'robot',this,1000);this.sync();this.onEvent('Raider robot approaching the Chinook! Protect the landing zone.');return true;}
 aimPoint(){return this.root.position.clone().add(new THREE.Vector3(0,2.9,0));}
 recordHit(kind,team,amount){this.received+=amount;}
 stun(seconds){this.tracks.update(0,0);this.stunRemaining=Math.max(this.stunRemaining,seconds);this.windup=0;this.cooldown=Math.max(this.cooldown,2);}
 destroy(){this.tracks.update(0,0);this.dead=true;this.deathAge=0;this.combatUnit.shapes=[];this.warning.visible=false;this.onEvent('Landing-zone raider destroyed.');}
 sync(){this.root.updateMatrixWorld(true);if(this.combatUnit)this.combatUnit.shapes=this.combatUnit.alive?[{center:this.aimPoint(),half:{x:1.5,y:2.5,z:1.2},rotation:this.parts.body.getWorldQuaternion(new THREE.Quaternion())},{center:this.root.position.clone().add(new THREE.Vector3(0,.75,0)),half:{x:1.45,y:.72,z:1.65},rotation:this.root.quaternion.clone()}]:[];}
 selectTarget(origin){
  const distance=u=>origin.distanceTo(new THREE.Vector3().copy(u.shapes[0].center)),priority=u=>u.kind==='hero'?0:u.kind==='helicopter'?1:2;
  const targets=this.getTargets(origin).filter(u=>u.alive&&!u.dashPhased&&u.shapes.length&&(u.kind!=='hero'||distance(u)<=RAIDER_COMBAT.heroRange)&&this.visible(origin,u.shapes[0].center));targets.sort((a,b)=>priority(a)-priority(b)||distance(a)-distance(b));let next=targets[0]||null;
  if(next?.kind==='hero'&&this.target?.kind==='hero'&&targets.includes(this.target)&&distance(this.target)<=distance(next)+RAIDER_COMBAT.switchMargin)next=this.target;
  if(next?.id!==this.target?.id)this.windup=0;this.target=next;
 }
 aimTorso(dt){
  if(!this.target){this.aimError=null;this.parts.body.rotation.y+=THREE.MathUtils.clamp(angleDelta(0,this.parts.body.rotation.y),-RAIDER_COMBAT.turnRate*dt,RAIDER_COMBAT.turnRate*dt);this.parts.arm_r.rotation.x+=THREE.MathUtils.clamp(-this.parts.arm_r.rotation.x,-RAIDER_COMBAT.pitchRate*dt,RAIDER_COMBAT.pitchRate*dt);return;}
  this.root.updateMatrixWorld(true);const arm=this.parts.arm_r,point=new THREE.Vector3().copy(this.target.shapes[0].center),shoulder=arm.getWorldPosition(new THREE.Vector3()),yaw=Math.atan2(point.x-shoulder.x,point.z-shoulder.z)-this.root.rotation.y;
  this.parts.body.rotation.y+=THREE.MathUtils.clamp(angleDelta(yaw,this.parts.body.rotation.y),-RAIDER_COMBAT.turnRate*dt,RAIDER_COMBAT.turnRate*dt);this.root.updateMatrixWorld(true);
  const local=this.parts.body.worldToLocal(point.clone()).sub(arm.position),pitch=THREE.MathUtils.clamp(-Math.atan2(local.y,Math.hypot(local.x,local.z)),-85*Math.PI/180,75*Math.PI/180);
  arm.rotation.x+=THREE.MathUtils.clamp(pitch-arm.rotation.x,-RAIDER_COMBAT.pitchRate*dt,RAIDER_COMBAT.pitchRate*dt);this.root.updateMatrixWorld(true);
  const from=this.barrel.localToWorld(new THREE.Vector3(0,0,.9)),direction=point.clone().sub(from).normalize(),forward=new THREE.Vector3(0,0,1).transformDirection(this.barrel.matrixWorld);this.aimError=Math.acos(THREE.MathUtils.clamp(forward.dot(direction),-1,1));return{from,point,direction};
 }
 update(dt,time){
  if(!this.spawned)return;this.age+=dt;const oldX=this.root.position.x,oldZ=this.root.position.z,oldYaw=this.root.rotation.y;
  if(this.dead){this.deathAge+=dt;this.parts.body.rotation.z=Math.min(1,this.deathAge)*1.1;this.root.position.y=.1-Math.min(1,this.deathAge)*.3;}
  else{this.stunRemaining=Math.max(0,this.stunRemaining-dt);this.warning.visible=this.age<4||this.windup>0;this.warning.material.opacity=.35+.35*Math.sin(time*10)**2;
   const origin=this.aimPoint();this.selectTarget(origin);
   if(this.age>=3&&this.stunRemaining<=0){const goal=this.objective?this.objective():this.target?new THREE.Vector3().copy(this.target.shapes[0].center):new THREE.Vector3(EVACUATION_CONFIG.landingX+12,0,EVACUATION_CONFIG.landingZ),delta=goal.clone().sub(this.root.position);delta.y=0;const distance=delta.length();this.root.rotation.y=Math.atan2(delta.x,delta.z);let moving=distance>(this.objective?1:this.target?13:1);if(moving){const next=this.root.position.clone().addScaledVector(delta.normalize(),Math.min(distance-1,this.moveSpeed*dt));if(this.isPathClear(this.root.position,next))this.root.position.copy(next);else moving=false;}this.parts.body.position.y=2.9+(moving?Math.sin(time*12)*.012:0);
    const aim=this.aimTorso(dt);this.cooldown=Math.max(0,this.cooldown-dt);if(aim&&origin.distanceTo(aim.point)<RAIDER_COMBAT.weaponRange&&this.cooldown<=0&&this.aimError<=RAIDER_COMBAT.alignment&&this.visible(aim.from,aim.point)){this.windup+=dt;if(this.windup>=RAIDER_COMBAT.windup-1e-8){const mesh=new THREE.Mesh(this.boltGeometry,this.boltMaterial);projectileSilhouette(mesh,'#ffad54',1.35);mesh.position.copy(aim.from);this.scene.add(mesh);this.bolts.push({id:this.id+'-bolt-'+this.shots,owner:this.id,mesh,dir:aim.direction,life:4,target:this.target.id});this.shots++;this.cooldown=RAIDER_COMBAT.cooldown;this.windup=0;}}else this.windup=0;
   }this.sync();}
  const distance=Math.hypot(this.root.position.x-oldX,this.root.position.z-oldZ),turn=Math.atan2(Math.sin(this.root.rotation.y-oldYaw),Math.cos(this.root.rotation.y-oldYaw));this.tracks.update(distance,turn);
  for(let i=this.bolts.length-1;i>=0;i--){const bolt=this.bolts[i],end=bolt.mesh.position.clone().addScaledVector(bolt.dir,12*dt),transit=this.redirect(bolt,bolt.mesh.position,end);bolt.life-=dt;if(transit){bolt.mesh.position.copy(transit.position);bolt.dir.copy(transit.direction);}else{const hit=this.trace(bolt.mesh.position,end,this.id);if(hit){if(hit.barrier)hit.barrier.onHit(hit.point,14);if(hit.unit?.alive){if(hit.unit.kind==='hero'){this.heroHits++;this.onHeroHit(hit.unit,hit.point,14);}else this.damage.hurt(hit.unit,hit.unit.kind==='robot'?35:14,hit.point);this.hits++;}bolt.life=0;}else bolt.mesh.position.copy(end);}if(bolt.life<=0){this.scene.remove(bolt.mesh);this.bolts.splice(i,1);}}
 }
 diagnostics(){return{id:this.id,target:this.target?.id||null,targetKind:this.target?.kind||null,torsoYaw:this.parts.body.rotation.y,chassisYaw:this.root.rotation.y,weaponPitch:this.parts.arm_r.rotation.x,aimErrorDegrees:this.aimError==null?null:THREE.MathUtils.radToDeg(this.aimError),windup:this.windup,heroHits:this.heroHits,locomotion:this.tracks.diagnostics(),spawned:this.spawned,alive:!!this.combatUnit?.alive,health:this.combatUnit?.health||0,maxHealth:1000,position:this.root.position.toArray(),shots:this.shots,hits:this.hits,received:this.received,bolts:this.bolts.length,stunRemaining:this.stunRemaining};}
}
