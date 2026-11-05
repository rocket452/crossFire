import {RaiderEnergyEffects} from './raider-energy-effects.js?v=raider-energy-86';
import * as THREE from './vendor/three.module.js';
import {DroneTracks} from './drone-tracks.js?v=tracked-drones-64';
import {EVACUATION_CONFIG} from './evacuation-config.js?v=evacuation-57';
import {projectileSilhouette} from './projectile-silhouette.js?v=charged-shuriken-130';
export const RAIDER_COMBAT=Object.freeze({modelScale:1.3,heroRange:42,weaponRange:47.6,turnRate:120*Math.PI/180,pitchRate:120*Math.PI/180,alignment:7*Math.PI/180,switchMargin:5,windup:.5,cooldown:1.25,burstSize:4,leadChance:.33,burstInterval:.25,maxLeadSeconds:1,maxLeadDistance:24,maxTrackedSpeed:65,projectileSpeed:36,projectileRadius:1.32});
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class EvacRaider {
 constructor(scene,damage,{getTargets,visible,trace,redirect=()=>null,onEvent=()=>{},onHeroHit=()=>{},onDebris=()=>null,onRemoveDebris=()=>{},onDeath=()=>{},onWreck=()=>{},id='evac-raider',spawnPosition=null,objective=null,moveSpeed=1.6,initialCooldown=4,isPathClear=()=>true,energyEffects=null,shotModes=null,leadChance=RAIDER_COMBAT.leadChance,random=Math.random,projectileSpeed=RAIDER_COMBAT.projectileSpeed}){
  Object.assign(this,{scene,damage,getTargets,visible,trace,redirect,onEvent,onHeroHit,onDebris,onRemoveDebris,onDeath,onWreck,id,spawnPosition,objective,moveSpeed,initialCooldown,isPathClear,projectileSpeed});this.shotModes=shotModes?[...shotModes]:['direct','direct','lead','lead'];this.leadChance=shotModes?null:leadChance;this.random=random;this.root=new THREE.Group();this.root.name='Bruiser';this.root.scale.setScalar(RAIDER_COMBAT.modelScale);scene.add(this.root);this.evac=true;this.geometry=new THREE.BoxGeometry(1,1,1);this.parts={};this.materials={};this.wrecks=[];
  const armor=new THREE.MeshStandardMaterial({color:'#6c747b',metalness:.5,roughness:.65}),dark=new THREE.MeshStandardMaterial({color:'#232c35',roughness:.7}),red=new THREE.MeshStandardMaterial({color:'#ff5137',emissive:'#ff3010',emissiveIntensity:2});
  const part=(name,parent,p,size,mat)=>{const pivot=new THREE.Group();pivot.position.set(...p);const mesh=new THREE.Mesh(this.geometry,mat);mesh.scale.set(...size);mesh.castShadow=mesh.receiveShadow=true;pivot.add(mesh);parent.add(pivot);this.parts[name]=pivot;return pivot;};
  const body=part('body',this.root,[0,2.9,0],[1.8,1.5,1.05],armor);part('reactor',body,[0,0,.57],[.48,.55,.12],red);const head=part('head',body,[0,1.12,0],[1.05,.65,.85],armor);part('visor',head,[0,.04,.46],[.76,.15,.08],red);
  this.tracks=new DroneTracks(this.root,{armor,dark});
  part('arm_l',body,[-1.2,-.1,0],[.55,1.9,.55],armor);const arm=part('arm_r',body,[1.18,-.05,.25],[.65,.8,.7],armor);this.barrel=part('barrel',arm,[0,-.15,.8],[.52,.52,1.5],dark);part('muzzle',this.barrel,[0,0,.8],[.55,.55,.1],red);
  this.warning=new THREE.Mesh(new THREE.RingGeometry(2.2,2.35,32),new THREE.MeshBasicMaterial({color:'#ff533a',transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));this.warning.rotation.x=-Math.PI/2;this.warning.position.y=.12;this.root.add(this.warning);
  const seen=new Set();this.restMaterials=[];this.root.traverse(o=>{for(const m of o.isMesh?[].concat(o.material):[])if(!seen.has(m)){seen.add(m);this.restMaterials.push({m,color:m.color.clone(),emissive:m.emissive?.clone(),intensity:m.emissiveIntensity});}});
  this.ownsEnergyEffects=!energyEffects;this.energyEffects=energyEffects||new RaiderEnergyEffects(scene);this.boltGeometry=new THREE.IcosahedronGeometry(RAIDER_COMBAT.projectileRadius,0);this.boltMaterial=new THREE.MeshBasicMaterial({color:'#ffc58b',toneMapped:false});this.reset();
 }
 reset(){if(this.ownsEnergyEffects)this.energyEffects.reset();for(const w of this.wrecks){this.onRemoveDebris(w.body);w.parent.add(w.node);w.node.position.copy(w.position);w.node.quaternion.copy(w.quaternion);w.node.scale.copy(w.scale);this.scene.remove(w.group);}this.wrecks=[];for(const s of this.restMaterials){s.m.color.copy(s.color);if(s.emissive){s.m.emissive.copy(s.emissive);s.m.emissiveIntensity=s.intensity;}}for(const bolt of this.bolts||[])this.scene.remove(bolt.mesh);this.bolts=[];this.damage.units=this.damage.units.filter(u=>u.entity!==this);this.combatUnit=null;this.spawned=false;this.dead=false;this.age=0;this.shots=0;this.bursts=0;this.burstRemaining=0;this.burstTimer=0;this.burstTarget=null;this.burstPlan=[];this.lastBurstModes=[];this.lastShot=null;this.directShots=0;this.leadShots=0;this.targetMotion=null;this.hits=0;this.heroHits=0;this.aimError=null;this.received=0;this.cooldown=this.initialCooldown;this.windup=0;this.target=null;this.stunRemaining=0;this.root.visible=false;this.root.position.set(EVACUATION_CONFIG.landingX+17,.1,EVACUATION_CONFIG.landingZ);if(this.spawnPosition)this.root.position.copy(this.spawnPosition);this.root.rotation.set(0,this.objective?Math.PI:0,0);this.tracks.reset();this.parts.body.rotation.set(0,0,0);this.parts.arm_r.rotation.set(0,0,0);this.parts.body.position.y=2.9;this.warning.visible=true;}
 spawn(){if(this.spawned)return false;this.spawned=true;this.root.visible=true;this.combatUnit=this.damage.add(this.id,'robot',this,1000);this.sync();this.onEvent('Bruiser approaching the Chinook! Protect the landing zone.');return true;}
 aimPoint(){return this.root.localToWorld(new THREE.Vector3(0,2.9,0));}
 recordHit(kind,team,amount){this.received+=amount;}
 stun(seconds){this.cancelBurst();this.tracks.update(0,0);this.stunRemaining=Math.max(this.stunRemaining,seconds);this.windup=0;this.cooldown=Math.max(this.cooldown,2);}
 destroy(){if(this.dead)return;this.cancelBurst();this.tracks.update(0,0);this.dead=true;this.deathAge=0;this.combatUnit.shapes=[];this.warning.visible=false;this.target=null;this.windup=0;this.onDeath(this.parts.reactor.localToWorld(new THREE.Vector3(0,0,.15)),{large:false});this.breakApart();this.onEvent('Bruiser destroyed.');}
 breakApart(){
  if(this.wrecks.length)return;
  for(const node of[this.parts.head,this.parts.arm_l,this.parts.arm_r,this.parts.body,this.tracks.root]){
   node.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(node),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).toArray().map(v=>Math.max(.18,v)),body=this.onDebris({position:center,quaternion:new THREE.Quaternion(),size,mass:Math.max(12,size[0]*size[1]*size[2]*90)});if(!body)continue;
   const w={node,parent:node.parent,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),body,size,group:new THREE.Group()};w.group.position.copy(center);this.scene.add(w.group);w.group.attach(node);const a=this.wrecks.length*2.399+this.root.position.x*.3;body.velocity.set(Math.cos(a)*3.6,3.5+this.wrecks.length*.3,Math.sin(a)*3.6);body.angularVelocity.set(Math.sin(a)*1.5,.7,Math.cos(a)*1.5);this.wrecks.push(w);this.onWreck(w);
  }
  if(this.wrecks.length){for(const s of this.restMaterials){s.m.color.multiplyScalar(.45);if(s.emissive)s.m.emissiveIntensity=0;}this.root.visible=false;}
 }
 syncWrecks(){for(const w of this.wrecks){w.group.position.copy(w.body.position);w.group.quaternion.copy(w.body.quaternion);}}
 sync(){this.root.updateMatrixWorld(true);if(this.combatUnit)this.combatUnit.shapes=this.combatUnit.alive?[{center:this.aimPoint(),half:{x:1.5*RAIDER_COMBAT.modelScale,y:2.5*RAIDER_COMBAT.modelScale,z:1.2*RAIDER_COMBAT.modelScale},rotation:this.parts.body.getWorldQuaternion(new THREE.Quaternion())},{center:this.root.localToWorld(new THREE.Vector3(0,.75,0)),half:{x:1.45*RAIDER_COMBAT.modelScale,y:.72*RAIDER_COMBAT.modelScale,z:1.65*RAIDER_COMBAT.modelScale},rotation:this.root.quaternion.clone()}]:[];}
 selectTarget(origin){
  const distance=u=>origin.distanceTo(new THREE.Vector3().copy(u.shapes[0].center)),priority=u=>u.kind==='hero'?0:u.kind==='helicopter'?1:2;
  const targets=this.getTargets(origin).filter(u=>u.alive&&!u.dashPhased&&u.shapes.length&&(u.kind!=='hero'||distance(u)<=RAIDER_COMBAT.heroRange)&&this.visible(origin,u.shapes[0].center));targets.sort((a,b)=>priority(a)-priority(b)||distance(a)-distance(b));let next=targets[0]||null;
  if(next?.kind==='hero'&&this.target?.kind==='hero'&&targets.includes(this.target)&&distance(this.target)<=distance(next)+RAIDER_COMBAT.switchMargin)next=this.target;
  if(next?.id!==this.target?.id){this.windup=0;this.cancelBurst();}this.target=next;
 }
 sampleTargetMotion(dt){
  const target=this.target;if(!target?.shapes.length){this.targetMotion=null;return;}const point=new THREE.Vector3().copy(target.shapes[0].center),old=this.targetMotion;
  if(!old||old.id!==target.id||dt<=0){this.targetMotion={id:target.id,point,velocity:new THREE.Vector3()};return;}
  const travel=point.clone().sub(old.point);if(travel.length()>Math.max(8,150*dt))old.velocity.set(0,0,0);else old.velocity.lerp(travel.divideScalar(dt).clampLength(0,RAIDER_COMBAT.maxTrackedSpeed),1-Math.exp(-12*dt));old.point.copy(point);
 }
 prepareBurst(){if(this.burstPlan.length)return;if(this.leadChance!==null){this.burstPlan=this.shotModes.map(()=>this.random()<this.leadChance?'lead':'direct');return;}this.burstPlan=[...this.shotModes];for(let i=this.burstPlan.length-1;i>0;i--){const j=Math.min(i,Math.floor(this.random()*(i+1)));[this.burstPlan[i],this.burstPlan[j]]=[this.burstPlan[j],this.burstPlan[i]];}}
 shotPoint(from){
  const current=new THREE.Vector3().copy(this.target.shapes[0].center);current.y=Math.max(current.y,RAIDER_COMBAT.projectileRadius+.2);const point=current.clone(),mode=this.burstPlan[this.burstRemaining?this.burstPlan.length-this.burstRemaining:0]||'direct',velocity=this.targetMotion?.id===this.target.id?this.targetMotion.velocity:new THREE.Vector3();let leadSeconds=0;
  if(mode==='lead'&&velocity.lengthSq()>1e-6){const offset=current.clone().sub(from);leadSeconds=Math.min(RAIDER_COMBAT.maxLeadSeconds,offset.length()/this.projectileSpeed);const a=velocity.lengthSq()-this.projectileSpeed**2,b=2*offset.dot(velocity),c=offset.lengthSq(),disc=b*b-4*a*c;if(disc>=0){const roots=Math.abs(a)<1e-8?[-c/b]:[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)],positive=roots.filter(t=>Number.isFinite(t)&&t>0);if(positive.length)leadSeconds=Math.min(RAIDER_COMBAT.maxLeadSeconds,...positive);}point.add(velocity.clone().multiplyScalar(leadSeconds).clampLength(0,RAIDER_COMBAT.maxLeadDistance));point.y=Math.max(point.y,RAIDER_COMBAT.projectileRadius+.2);}
  return{point,current,mode,leadSeconds};
 }
 aimTorso(dt){
  if(!this.target){this.aimError=null;this.parts.body.rotation.y+=THREE.MathUtils.clamp(angleDelta(0,this.parts.body.rotation.y),-RAIDER_COMBAT.turnRate*dt,RAIDER_COMBAT.turnRate*dt);this.parts.arm_r.rotation.x+=THREE.MathUtils.clamp(-this.parts.arm_r.rotation.x,-RAIDER_COMBAT.pitchRate*dt,RAIDER_COMBAT.pitchRate*dt);return;}
  this.prepareBurst();this.root.updateMatrixWorld(true);const arm=this.parts.arm_r,point=this.shotPoint(this.barrel.localToWorld(new THREE.Vector3(0,0,.9))).point;
  // Aim large bolts at the upper body so their underside clears the street.
  point.y=Math.max(point.y,RAIDER_COMBAT.projectileRadius+.2);const shoulder=arm.getWorldPosition(new THREE.Vector3()),yaw=Math.atan2(point.x-shoulder.x,point.z-shoulder.z)-this.root.rotation.y;
  this.parts.body.rotation.y+=THREE.MathUtils.clamp(angleDelta(yaw,this.parts.body.rotation.y),-RAIDER_COMBAT.turnRate*dt,RAIDER_COMBAT.turnRate*dt);this.root.updateMatrixWorld(true);
  const local=this.parts.body.worldToLocal(point.clone()).sub(arm.position),pitch=THREE.MathUtils.clamp(-Math.atan2(local.y,Math.hypot(local.x,local.z)),-85*Math.PI/180,75*Math.PI/180);
  arm.rotation.x+=THREE.MathUtils.clamp(pitch-arm.rotation.x,-RAIDER_COMBAT.pitchRate*dt,RAIDER_COMBAT.pitchRate*dt);this.root.updateMatrixWorld(true);
  const from=this.barrel.localToWorld(new THREE.Vector3(0,0,.9)),shot=this.shotPoint(from),direction=shot.point.clone().sub(from).normalize(),forward=new THREE.Vector3(0,0,1).transformDirection(this.barrel.matrixWorld);this.aimError=Math.acos(THREE.MathUtils.clamp(forward.dot(direction),-1,1));return{from,...shot,direction};
 }
 cancelBurst(){if(this.burstRemaining>0)this.cooldown=Math.max(this.cooldown,RAIDER_COMBAT.cooldown);this.burstRemaining=0;this.burstTimer=0;this.burstTarget=null;this.burstPlan=[];}
 fireBolt(aim){const mesh=new THREE.Mesh(this.boltGeometry,this.boltMaterial);projectileSilhouette(mesh,'#ffad54',1.35);mesh.position.copy(aim.from);this.scene.add(mesh);const bolt={id:this.id+'-bolt-'+this.shots,owner:this.id,mesh,dir:aim.direction,life:4,speed:this.projectileSpeed,radius:RAIDER_COMBAT.projectileRadius,target:this.target.id,firedAt:this.age,aimMode:aim.mode||'direct',aimPoint:aim.point?.clone(),leadSeconds:aim.leadSeconds||0};this.bolts.push(bolt);this.shots++;if(bolt.aimMode==='lead')this.leadShots++;else this.directShots++;this.lastShot={mode:bolt.aimMode,point:aim.point?.toArray()||null,target:aim.current?.toArray()||null,leadSeconds:bolt.leadSeconds};return bolt;}
 fireBurstShot(aim){this.fireBolt(aim);this.burstRemaining--;this.windup=0;if(this.burstRemaining>0)this.burstTimer+=RAIDER_COMBAT.burstInterval;else{this.burstTimer=0;this.burstTarget=null;this.burstPlan=[];this.cooldown=RAIDER_COMBAT.cooldown;}}
 updateWeapon(dt,aim,origin){
  this.cooldown=Math.max(0,this.cooldown-dt);const clear=aim&&origin.distanceTo(aim.current||aim.point)<RAIDER_COMBAT.weaponRange&&this.visible(aim.from,aim.current||aim.point)&&this.visible(aim.from,aim.point);
  if(!clear){this.windup=0;this.cancelBurst();return;}
  if(this.aimError>RAIDER_COMBAT.alignment){this.windup=0;if(!this.shotModes.includes('lead')){this.cancelBurst();return;}if(this.burstRemaining>0)this.burstTimer=Math.max(0,this.burstTimer-dt);return;}
  if(this.burstRemaining>0){this.burstTimer-=dt;if(this.burstTimer<=1e-8)this.fireBurstShot(aim);return;}
  if(this.cooldown>0){this.windup=0;return;}
  this.windup+=dt;if(this.windup>=RAIDER_COMBAT.windup-1e-8){this.bursts++;this.burstRemaining=this.shotModes.length;this.lastBurstModes=[...this.burstPlan];this.burstTarget=this.target.id;this.burstTimer=0;this.fireBurstShot(aim);}
 }
 update(dt,time){
  if(!this.spawned)return;this.age+=dt;const oldX=this.root.position.x,oldZ=this.root.position.z,oldYaw=this.root.rotation.y;
  if(this.dead){this.deathAge+=dt;if(this.wrecks.length)this.syncWrecks();else{this.parts.body.rotation.z=Math.min(1,this.deathAge)*1.1;this.root.position.y=.1-Math.min(1,this.deathAge)*.3;}}
  else{this.stunRemaining=Math.max(0,this.stunRemaining-dt);this.warning.visible=this.age<4||this.windup>0||this.burstRemaining>0;this.warning.material.opacity=.35+.35*Math.sin(time*10)**2;
   const origin=this.aimPoint();this.selectTarget(origin);this.sampleTargetMotion(dt);
   if(this.age>=3&&this.stunRemaining<=0){const goal=this.objective?this.objective():this.target?new THREE.Vector3().copy(this.target.shapes[0].center):new THREE.Vector3(EVACUATION_CONFIG.landingX+12,0,EVACUATION_CONFIG.landingZ),delta=goal.clone().sub(this.root.position);delta.y=0;const distance=delta.length();this.root.rotation.y=Math.atan2(delta.x,delta.z);let moving=distance>(this.objective?1:this.target?13:1);if(moving){const next=this.root.position.clone().addScaledVector(delta.normalize(),Math.min(distance-1,this.moveSpeed*dt));if(this.isPathClear(this.root.position,next))this.root.position.copy(next);else moving=false;}this.parts.body.position.y=2.9+(moving?Math.sin(time*12)*.012:0);
    const aim=this.aimTorso(dt);this.updateWeapon(dt,aim,origin);
   }this.sync();}
  const distance=Math.hypot(this.root.position.x-oldX,this.root.position.z-oldZ),turn=Math.atan2(Math.sin(this.root.rotation.y-oldYaw),Math.cos(this.root.rotation.y-oldYaw));this.tracks.update(distance/RAIDER_COMBAT.modelScale,turn);
  this.updateBolts(dt);
 }
 updateBolts(dt){
  for(let i=this.bolts.length-1;i>=0;i--){const bolt=this.bolts[i],end=bolt.mesh.position.clone().addScaledVector(bolt.dir,(bolt.speed??this.projectileSpeed)*dt),transit=this.redirect(bolt,bolt.mesh.position,end);bolt.life-=dt;if(transit){bolt.mesh.position.copy(transit.position);bolt.dir.copy(transit.direction);}else{const hit=this.trace(bolt.mesh.position,end,this.id,bolt.radius??RAIDER_COMBAT.projectileRadius);if(hit){this.energyEffects.impact(hit.point,bolt.dir,bolt.radius);if(hit.barrier)hit.barrier.onHit(hit.point,bolt.damage??14);if(hit.unit?.alive){if(hit.unit.kind==='hero'){this.heroHits++;this.onHeroHit(hit.unit,hit.point,bolt.damage??14);}else this.damage.hurt(hit.unit,bolt.damage??(hit.unit.kind==='robot'?35:14),hit.point);this.hits++;}bolt.life=0;}else bolt.mesh.position.copy(end);}if(bolt.life<=0){this.scene.remove(bolt.mesh);this.bolts.splice(i,1);}}
  if(this.ownsEnergyEffects)this.energyEffects.update(dt,this.bolts);
 }
 diagnostics(){return{leadChance:this.leadChance,modelScale:RAIDER_COMBAT.modelScale,burstSize:this.shotModes.length,directShots:this.directShots,leadShots:this.leadShots,burstModes:[...this.burstPlan],lastBurstModes:[...this.lastBurstModes],lastShot:this.lastShot,targetVelocity:this.targetMotion?.velocity.toArray()||null,burstInterval:RAIDER_COMBAT.burstInterval,bursts:this.bursts,burstRemaining:this.burstRemaining,burstTimer:this.burstTimer,burstTarget:this.burstTarget,projectileSpeed:this.projectileSpeed,projectileRadius:RAIDER_COMBAT.projectileRadius,id:this.id,target:this.target?.id||null,targetKind:this.target?.kind||null,torsoYaw:this.parts.body.rotation.y,chassisYaw:this.root.rotation.y,weaponPitch:this.parts.arm_r.rotation.x,aimErrorDegrees:this.aimError==null?null:THREE.MathUtils.radToDeg(this.aimError),windup:this.windup,heroHits:this.heroHits,wreckBodies:this.wrecks.length,locomotion:this.tracks.diagnostics(),spawned:this.spawned,alive:!!this.combatUnit?.alive,health:this.combatUnit?.health||0,maxHealth:1000,position:this.root.position.toArray(),shots:this.shots,hits:this.hits,received:this.received,bolts:this.bolts.length,stunRemaining:this.stunRemaining};}
}
