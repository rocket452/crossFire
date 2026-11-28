import * as THREE from './vendor/three.module.js';
import {EvacRaider} from './evac-raider.js?v=421';
import {LightningKit,WHITE} from './lightning-kit.js?v=451';
import {ASSAULT_SENTINEL} from './assault-sentinel-config.js?v=465';
import {buildSentinelModel} from './assault-sentinel-model.js?v=466';

const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const limit=(v,n)=>Math.max(-n,Math.min(n,v));
const ease=t=>t*t*(3-2*t);
const CORE_RED=new THREE.Color('#ff4318'),ARMOR_SPARK=new THREE.Color('#ffd9a0'),HOT=new THREE.Color('#ff7a2a');

// One bounded visual pool per group of Sentinels: armour sparks, core flares and slam dust.
export class SentinelFX {
 constructor(scene){this.group=new THREE.Group();this.group.name='Assault Sentinel effects';scene.add(this.group);this.kit=new LightningKit(this.group,{arcs:0,glows:28,sparks:480,sparkColor:new THREE.Color(1,.6,.25)});}
 armor(point){const p=new THREE.Vector3().copy(point);this.kit.glow(p,{size:.9,life:.09,grow:.6,color:ARMOR_SPARK,peak:.9});this.kit.spark(p,10,7,1.5,{life:.22,size:.06,sizeSpread:.06,gravity:16});}
 core(point,big=false){const p=new THREE.Vector3().copy(point);this.kit.glow(p,{size:big?2.6:1.7,life:.18,grow:.8,color:CORE_RED,peak:1});this.kit.glow(p,{size:.8,life:.1,grow:1,color:WHITE,peak:.9});this.kit.spark(p,big?26:14,6,2.2,{life:.35,size:.09,sizeSpread:.1,gravity:10});}
 charge(point){this.kit.glow(new THREE.Vector3().copy(point),{size:.7,life:.08,grow:.4,color:HOT,peak:.8});}
 muzzle(point){const p=new THREE.Vector3().copy(point);this.kit.glow(p,{size:1.4,life:.1,grow:.8,color:HOT,peak:1});this.kit.spark(p,6,5,.6,{life:.16,size:.06,gravity:6});}
 vent(point){this.kit.spark(new THREE.Vector3().copy(point),2,1.6,3,{life:.5,size:.07,sizeSpread:.05,gravity:-3});}
 slam(point,radius){const p=new THREE.Vector3().copy(point);this.kit.glow(p.clone().setY(p.y+.6),{size:radius*.9,life:.25,grow:.9,color:HOT,peak:.85});this.kit.spark(p,40,radius*2,4,{life:.5,lifeSpread:.4,size:.1,sizeSpread:.12,gravity:14,spread:radius*.4});}
 death(point){const p=new THREE.Vector3().copy(point);this.kit.glow(p,{size:4.5,life:.35,grow:1,color:CORE_RED,peak:1});this.kit.glow(p,{size:2,life:.18,grow:1.2,color:WHITE,peak:1});this.kit.spark(p,60,11,4,{life:.7,lifeSpread:.5,size:.12,sizeSpread:.14,gravity:12});}
 update(dt){this.kit.step(dt);}
 reset(){this.kit.clear();}
}

// Assault Sentinel: tracked basic enemy. Heavy frontal armour, a rear reactor core that takes bonus
// damage, and chest armour that opens (exposing the core from every side) while it fires and after slams.
// Reuses EvacRaider targeting, alerts, projectiles, hero hits, debris and wrecks.
export class AssaultSentinel extends EvacRaider {
 constructor(scene,damage,options={}){
  const c=options.config||ASSAULT_SENTINEL;
  super(scene,damage,{heroRange:c.heroRange,weaponRange:c.weaponRange,maxHealth:c.health,moveSpeed:c.moveSpeed,projectileSpeed:c.burst.speed,projectileLifetime:2.6,...options,enhancedModel:false,shotModes:c.burst.modes});
  Object.assign(this,{config:c,type:'sentinel',fx:options.fx||new SentinelFX(scene),ownsFX:!options.fx,sound:options.sound||null,blockers:options.blockers||(()=>[]),onSlam:options.onSlam||null});
  this.root.clear();this.root.scale.setScalar(1);this.root.name='Assault Sentinel';
  this.model=buildSentinelModel(c.height);this.root.add(this.model.root);const P=this.model.parts,S=this.model.scale;
  this.parts={body:P.body,chest:P.chest,head:P.head,arm_l:P.arm_l,arm_r:P.arm_r,reactor:P.reactor};
  this.barrel=P.muzzleR;this.muzzles=[P.muzzleR,P.muzzleL];this.bodyHeight=P.body.position.y;
  const treads=this.model.treads;
  this.tracks={root:P.chassis,
   reset:()=>{},
   update:(distance,turn)=>{const half=.74*S;treads.L.advance((distance-turn*half)/S);treads.R.advance((distance+turn*half)/S);},
   diagnostics:()=>({type:'sentinel-treads',left:+treads.L.offset.toFixed(3),right:+treads.R.offset.toFixed(3)})};
  this.root.add(this.warning);this.warning.scale.setScalar(1.05);this.warning.material.color.set('#ff7a2a');
  // Slam telegraph: a ground ring with a filling disc, then an expanding shockwave ring.
  const ringMat=color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  this.slamRing=new THREE.Mesh(new THREE.RingGeometry(.93,1,48),ringMat('#ff5a1e'));this.slamFill=new THREE.Mesh(new THREE.CircleGeometry(1,40),ringMat('#ff3d12'));
  this.shockRing=new THREE.Mesh(new THREE.RingGeometry(.82,1,48),ringMat('#ffb36a'));
  for(const m of [this.slamRing,this.slamFill,this.shockRing]){m.rotation.x=-Math.PI/2;m.position.y=.14;m.visible=false;m.renderOrder=4;scene.add(m);}
  // Smaller, hotter energy bolts than the Bruiser's.
  this.boltGeometry=new THREE.IcosahedronGeometry(c.burst.radius,1);this.boltMaterial=new THREE.MeshBasicMaterial({color:'#ffb24a',toneMapped:false});
  this.restMaterials=[];const seen=new Set();this.root.traverse(o=>{for(const m of o.isMesh?[].concat(o.material):[])if(!seen.has(m)){seen.add(m);this.restMaterials.push({m,color:m.color.clone(),emissive:m.emissive?.clone(),intensity:m.emissiveIntensity});}});
  this.reset();
 }
 // ---- lifecycle --------------------------------------------------------------------------------
 reset(){
  super.reset();if(!this.model)return;
  if(this.ownsFX)this.fx.reset();
  Object.assign(this,{phase:'move',phaseClock:0,burstCooldown:this.initialCooldown??1.5,slamCooldown:1,exposure:0,flinch:0,coreFlash:0,turnBoost:0,detour:null,deathAge:0,exploded:false,
   muzzleIndex:0,chargeGlow:0,lastSoundAt:-1,lastHit:null,shockAge:Infinity,lift:0});
  this.stats={bursts:0,slams:0,slamHits:0,exposures:0,zones:{armor:0,front:0,side:0,rear:0,core:0},coreDamage:0,armorBlocked:0};
  this.parts.chest.rotation.x=.3;this.parts.body.rotation.set(0,0,0);this.parts.arm_l.rotation.set(0,0,0);this.parts.arm_r.rotation.set(0,0,0);
  this.parts.body.position.y=this.bodyHeight;this.setExposure(0);
  for(const m of [this.slamRing,this.slamFill,this.shockRing])m.visible=false;
 }
 spawn(){const ok=super.spawn();if(ok){this.combatUnit.maxHealth=this.combatUnit.health=this.config.health;this.sync();this.onEvent('Assault Sentinel deployed.');}return ok;}
 get exposed(){return this.exposure>.5;}
 // Stay engaged with the current target while manoeuvring (turning to detour must not drop it), and
 // answer an alert from anywhere within sight range rather than only inside cannon range.
 canAcquireHero(unit,distance){
  if(distance>this.heroRange*1.5)return false;
  if(this.target&&this.target.entity===unit.entity||this.isAlertedTo(unit.entity))return true;
  return this.sensesHero(unit)&&distance<=this.heroRange;
 }
 // ---- geometry helpers ---------------------------------------------------------------------------
 torsoCenter(){return this.parts.chest.localToWorld(new THREE.Vector3(0,.55,0));}
 torsoYaw(){return this.root.rotation.y+this.parts.body.rotation.y;}
 aimPoint(){return this.parts?.chest?this.torsoCenter():super.aimPoint();}
 sync(){
  this.root.updateMatrixWorld(true);if(!this.combatUnit)return;if(!this.combatUnit.alive){this.combatUnit.shapes=[];return;}
  const S=this.model.scale,P=this.model.parts,shapes=[];
  const add=(node,center,half,part)=>shapes.push({center:node.localToWorld(new THREE.Vector3(...center)),half:{x:half[0]*S,y:half[1]*S,z:half[2]*S},rotation:node.getWorldQuaternion(new THREE.Quaternion()),part});
  // Front armour plates are their own shapes, so frontal hits register on them first. Open doors leave
  // only narrow plates at the edges and reveal the front core between them.
  if(this.exposed){add(P.chest,[-.52,.5,.5],[.11,.42,.08],'armor');add(P.chest,[.52,.5,.5],[.11,.42,.08],'armor');add(P.chest,[0,.46,.52],[.36,.36,.12],'core-front');}
  else add(P.chest,[0,.5,.52],[.62,.42,.09],'armor');
  add(P.chest,[0,.55,0],[.64,.5,.47],'hull');
  add(P.chest,[0,1.05,-.08],[.6,.22,.44],'hull');
  add(P.head,[0,.02,0],[.25*1.4,.17*1.4,.22*1.4],'head');
  add(P.reactor,[0,0,-.12],[.47,.42,.16],'core');
  for(const k of ['L','R'])add(P['gun'+k],[0,0,.3],[.24,.23,.5],'hull');
  for(const k of ['L','R'])add(P.chassis,[k==='L'?-.74:.74,.47,0],[.27,.42,.98],'hull');
  this.combatUnit.shapes=shapes;
 }
 // ---- damage --------------------------------------------------------------------------------------
 // Which armour zone a hit lands on and its multiplier. Parts decide plates and cores; other parts use
 // the impact direction relative to the torso's facing (front / side / rear).
 damageZone(point,part){
  const a=this.config.armor,open=this.exposed;
  if(part==='core'||part==='core-front')return {zone:'core',multiplier:open?a.exposedCore:a.core};
  if(part==='armor')return {zone:'armor',multiplier:open?a.exposedFront:a.plate};
  if(!point)return {zone:'side',multiplier:a.side};
  const c=this.torsoCenter(),dx=point.x-c.x,dz=point.z-c.z,dy=point.y-c.y;
  if(Math.hypot(dx,dz)<.35*Math.abs(dy))return {zone:'side',multiplier:a.side};
  const angle=Math.abs(THREE.MathUtils.radToDeg(delta(Math.atan2(dx,dz),this.torsoYaw())));
  if(angle<=a.frontArc)return {zone:'front',multiplier:open?a.exposedFront:a.front};
  if(angle>=a.rearArc)return {zone:'rear',multiplier:a.rear};
  return {zone:'side',multiplier:a.side};
 }
 // Kage's dash flash: what a dash arriving from 'from' meets — the front plates (or the open core), a flank,
 // or the rear reactor core. Without a position it assumes a flank.
 finishMultiplier(from=null){
  const a=this.config.armor;if(!from)return a.side;
  const {zone}=this.damageZone(from,null),open=this.exposed;
  return zone==='front'?(open?a.exposedCore:a.plate):zone==='rear'?(open?a.exposedCore:a.core):a.side;
 }
 modifyDamage(power,point,part){
  if(this.dead)return 0;
  const {zone,multiplier}=this.damageZone(point,part);this.lastHit={zone,part,multiplier};this.stats.zones[zone]++;
  const hard=zone==='armor'||zone==='front'&&!this.exposed;this.suppressDamageFlash=hard;
  if(point){if(zone==='core'){this.fx.core(point,this.exposed);this.coreFlash=.3;this.stats.coreDamage+=power*multiplier;}else if(hard){this.fx.armor(point);this.stats.armorBlocked+=power*(1-multiplier);}}
  if(this.age-this.lastSoundAt>.09){this.lastSoundAt=this.age;if(zone==='core')this.sound?.(260,90);else if(hard)this.sound?.(2400,1300);}
  this.flinch=Math.min(1,this.flinch+(zone==='core'?.7:.25));
  if(zone==='rear'||zone==='core'&&!this.exposed)this.turnBoost=1.2;
  return power*multiplier;
 }
 stun(seconds){
  super.stun(seconds*this.config.stunScale);
  if(['charge','burst','slamWindup'].includes(this.phase)){this.phase='move';this.phaseClock=0;}
  this.burstRemaining=0;this.slamRing.visible=this.slamFill.visible=false;
 }
 destroy(){
  if(this.dead)return;
  this.cancelBurst();this.dead=true;this.deathAge=0;this.exploded=false;this.phase='dying';this.target=null;this.windup=0;
  if(this.combatUnit)this.combatUnit.shapes=[];this.warning.visible=false;this.slamRing.visible=this.slamFill.visible=false;
  this.onEvent('Assault Sentinel destroyed.');
 }
 // ---- attacks -------------------------------------------------------------------------------------
 targetPoint(){return this.target?.shapes?.[0]?new THREE.Vector3().copy(this.target.shapes[0].center):null;}
 fireShot(){
  const muzzle=this.muzzles[this.muzzleIndex++%2];this.root.updateMatrixWorld(true);
  const from=muzzle.getWorldPosition(new THREE.Vector3()),shot=this.shotPoint(from),direction=shot.point.clone().sub(from).normalize();
  const bolt=this.fireBolt({from,...shot,direction});
  Object.assign(bolt,{damage:this.config.burst.damage,radius:this.config.burst.radius,speed:this.config.burst.speed});
  this.fx.muzzle(from);this.recoil=.12;this.burstRemaining--;
 }
 slam(){
  const c=this.config.slam,center=this.root.position.clone();
  this.stats.slams++;this.shockAge=0;this.shockRing.position.set(center.x,center.y+.14,center.z);
  this.fx.slam(center,c.radius);this.onSlam?.(center,c.radius);
  for(const u of this.getTargets(this.aimPoint())){
   if(!u.alive||u.kind!=='hero'||u.dashPhased||!u.shapes?.length)continue;
   const p=u.shapes[0].center,dx=p.x-center.x,dz=p.z-center.z,distance=Math.hypot(dx,dz);
   if(distance>c.radius+.5||p.y-center.y>c.height+1.4)continue;
   if(u.entity?.isDamageProtected?.())continue;
   this.stats.slamHits++;this.heroHits++;this.onHeroHit(u,new THREE.Vector3(p.x,center.y+.5,p.z),c.damage);
   const away=new THREE.Vector3(dx,0,dz);if(away.lengthSq()<1e-4)away.set(Math.sin(this.root.rotation.y),0,Math.cos(this.root.rotation.y));
   away.normalize().multiplyScalar(c.knock*(1-.4*distance/c.radius));away.y=c.lift;
   const motion=u.entity?.motion?.body||u.entity?.motion||u.entity?.player?.motion;motion?.applyKnockback?.(away,{duration:.45,drag:1.6});
  }
 }
 // ---- movement --------------------------------------------------------------------------------------
 drive(goal,dt,{reverse=false,speedScale=1}={}){
  const p=this.root.position,dx=goal.x-p.x,dz=goal.z-p.z,distance=Math.hypot(dx,dz);if(distance<.6)return 0;
  const c=this.config;let yaw=Math.atan2(dx,dz);if(reverse)yaw+=Math.PI;
  if(this.detour&&this.age<this.detour.until)yaw=this.detour.yaw;
  const turn=limit(delta(yaw,this.root.rotation.y),c.chassisTurn*dt*(1+this.turnBoost*.5));this.root.rotation.y+=turn;this.turned+=turn;
  const facing=Math.cos(delta(yaw,this.root.rotation.y));if(facing<.35)return 0;
  const speed=(reverse?-c.reverseSpeed:c.moveSpeed)*speedScale*facing,step=Math.min(Math.abs(speed)*dt,distance);
  const dir=new THREE.Vector3(Math.sin(this.root.rotation.y),0,Math.cos(this.root.rotation.y)).multiplyScalar(Math.sign(speed));
  const next=p.clone().addScaledVector(dir,step);
  if(this.pathClear(p,next)){p.copy(next);return step*Math.sign(speed);}
  // Blocked by a building or another enemy: pick a clear heading (keeping the side it already chose, so it
  // works around the obstacle instead of oscillating) and commit to it long enough to turn and get clear.
  if(!this.detour||this.age>=this.detour.until||this.age-this.detour.started>.4&&!this.pathClear(p,p.clone().add(new THREE.Vector3(Math.sin(this.detour.yaw),0,Math.cos(this.detour.yaw)).multiplyScalar(2.2)))){
   const side=this.detour&&this.age-this.detour.until<2.5?this.detour.side:1,base=Math.atan2(dx,dz);
   for(const off of [.7,1.2,1.75,2.3,2.9]){
    let chosen=null;
    for(const sign of [side,-side]){const y=base+sign*off,probe=p.clone().add(new THREE.Vector3(Math.sin(y),0,Math.cos(y)).multiplyScalar(2.2));if(this.pathClear(p,probe)){chosen={yaw:y,side:sign};break;}}
    if(chosen){this.detour={...chosen,started:this.age,until:this.age+1.6};this.stats.detours=(this.stats.detours||0)+1;break;}
   }
  }
  return 0;
 }
 pathClear(a,b){
  if(!this.isPathClear(a,b))return false;
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
  return !this.blockers().some(r=>{if(r===this||!r.combatUnit?.alive||!r.spawned||r.dead)return false;const x=r.root.position.x-a.x,z=r.root.position.z-a.z,ahead=(x*dx+z*dz)/length,side=Math.abs(x*dz-z*dx)/length;return ahead>0&&ahead<4&&side<2.6;});
 }
 aimTorso(dt){
  const c=this.config,P=this.parts,goal=this.targetPoint();
  const rate=c.torsoTurn*dt*(1+this.turnBoost);
  if(!goal){P.body.rotation.y+=limit(delta(0,P.body.rotation.y),rate);for(const a of [P.arm_l,P.arm_r])a.rotation.x+=limit(-a.rotation.x,rate);this.aimError=null;return;}
  const center=this.torsoCenter(),yaw=Math.atan2(goal.x-center.x,goal.z-center.z)-this.root.rotation.y;
  P.body.rotation.y+=limit(delta(yaw,P.body.rotation.y),rate);
  const flat=Math.hypot(goal.x-center.x,goal.z-center.z)||1,pitch=limit(-Math.atan2(goal.y-center.y,flat),.9)-.3;
  for(const a of [P.arm_l,P.arm_r])a.rotation.x+=limit(pitch-a.rotation.x,rate);
  this.aimError=Math.abs(delta(yaw,P.body.rotation.y));
 }
 // ---- per-frame -------------------------------------------------------------------------------------
 update(dt,time){
  if(!this.spawned)return;
  this.age+=dt;this.turned=0;const c=this.config;
  this.flinch=Math.max(0,this.flinch-dt*3);this.coreFlash=Math.max(0,this.coreFlash-dt);this.turnBoost=Math.max(0,this.turnBoost-dt);this.recoil=Math.max(0,(this.recoil||0)-dt);
  if(this.dead){this.updateDeath(dt,time);this.updateBolts(dt);this.updateRings(dt,time);if(this.ownsFX)this.fx.update(dt);return;}
  this.stunRemaining=Math.max(0,this.stunRemaining-dt);this.burstCooldown=Math.max(0,this.burstCooldown-dt);this.slamCooldown=Math.max(0,this.slamCooldown-dt);this.phaseClock+=dt;
  const committed=['charge','burst','slamWindup','slamRecover'].includes(this.phase);
  if(!committed)this.selectTarget(this.aimPoint());
  this.sampleTargetMotion(dt);
  const goal=this.targetPoint(),here=this.root.position;
  const distance=goal?Math.hypot(goal.x-here.x,goal.z-here.z):Infinity,stunned=this.stunRemaining>0;
  let moved=0;
  if(stunned){this.phase='move';this.burstRemaining=0;}
  else{
   this.aimTorso(dt);
   switch(this.phase){
    case 'move':{
     const engaged=goal&&distance<=c.weaponRange&&this.visible(this.aimPoint(),goal);
     if(goal&&distance<=c.slam.trigger&&this.slamCooldown<=0&&goal.y-here.y<c.slam.height+1.4){this.phase='slamWindup';this.phaseClock=0;break;}
     if(engaged&&this.burstCooldown<=0&&this.aimError<.21&&distance<=c.burst.range){this.phase='charge';this.phaseClock=0;break;}
     if(engaged){
      if(distance>c.preferredMax)moved=this.drive(this.objective?.()||goal,dt);
      else if(distance<c.preferredMin&&this.slamCooldown>0)moved=this.drive(goal,dt,{reverse:true});
      else{const yaw=Math.atan2(goal.x-here.x,goal.z-here.z),turn=limit(delta(yaw,this.root.rotation.y),c.chassisTurn*.5*dt);this.root.rotation.y+=turn;this.turned+=turn;}
     }else if(this.objective)moved=this.drive(this.objective(),dt);
     else if(goal)moved=this.drive(goal,dt);
     break;}
    case 'charge':
     this.chargeGlow=ease(Math.min(1,this.phaseClock/c.burst.windup));
     if(Math.random()<.5)for(const m of this.muzzles)this.fx.charge(m.getWorldPosition(new THREE.Vector3()));
     if(this.phaseClock>=c.burst.windup){if(!goal||!this.visible(this.aimPoint(),goal)){this.phase='move';this.burstCooldown=.8;break;}
      this.phase='burst';this.phaseClock=0;this.burstPlan=[];this.prepareBurst();this.burstRemaining=c.burst.shots;this.burstTimer=0;this.stats.bursts++;this.bursts++;this.stats.exposures++;}
     break;
    case 'burst':
     this.burstTimer-=dt;
     if(this.burstRemaining>0&&this.burstTimer<=0&&goal){this.fireShot();this.burstTimer=c.burst.interval;}
     if(this.burstRemaining<=0||!goal){this.phase='vent';this.phaseClock=0;this.burstCooldown=c.burst.cooldown;this.burstPlan=[];}
     break;
    case 'vent':if(this.phaseClock>=c.burst.vent){this.phase='move';this.phaseClock=0;}break;
    case 'slamWindup':
     if(this.phaseClock>=c.slam.windup){this.slam();this.phase='slamRecover';this.phaseClock=0;this.slamCooldown=c.slam.cooldown;this.stats.exposures++;}
     break;
    case 'slamRecover':if(this.phaseClock>=c.slam.recover){this.phase='move';this.phaseClock=0;this.burstCooldown=Math.max(this.burstCooldown,.6);}break;
   }
  }
  // Exposure follows the attack cycle: the chest opens while firing, venting and recovering from a slam.
  const open=['burst','vent','slamRecover'].includes(this.phase)&&!stunned;
  this.setExposure(this.exposure+limit((open?1:0)-this.exposure,dt*(open?5:2.5)));
  if(this.phase!=='charge')this.chargeGlow=Math.max(0,this.chargeGlow-dt*4);
  this.tracks.update(moved,this.turned);
  this.animate(dt,time,stunned);
  this.sync();this.updateBolts(dt);this.updateRings(dt,time);if(this.ownsFX)this.fx.update(dt);
 }
 setExposure(value){
  this.exposure=THREE.MathUtils.clamp(value,0,1);const P=this.model.parts,e=ease(this.exposure);
  P.doorL.rotation.y=-1.15*e;P.doorR.rotation.y=1.15*e;
 }
 animate(dt,time,stunned){
  const c=this.config,P=this.model.parts,M=this.model.materials,phase=this.phase;
  // Torso: slam raises and rears back, then crashes down; recoil and hits jolt it; stun shakes it.
  let lift=0,lean=.3;
  if(phase==='slamWindup'){const t=ease(Math.min(1,this.phaseClock/c.slam.windup));lift=.55*t;lean=.3-.5*t;}
  else if(phase==='slamRecover'){const t=Math.min(1,this.phaseClock/.25);lift=-.18*(1-t);lean=.3+.25*(1-Math.min(1,this.phaseClock/c.slam.recover));}
  this.lift+=(lift-this.lift)*Math.min(1,dt*(phase==='slamRecover'?30:8));
  P.body.position.y=this.bodyHeight+this.lift+Math.sin(time*9)*.012;
  P.chest.rotation.x+=(lean-this.flinch*.18-this.recoil*.6-P.chest.rotation.x)*Math.min(1,dt*12);
  P.chest.rotation.z=stunned?Math.sin(time*28)*.06:0;
  if(phase==='slamWindup'){const t=ease(Math.min(1,this.phaseClock/c.slam.windup));for(const a of [P.arm_l,P.arm_r])a.rotation.x=-1.9*t;}
  else if(phase==='slamRecover'&&this.phaseClock<.4){for(const a of [P.arm_l,P.arm_r])a.rotation.x=.55*(1-this.phaseClock/.4);}
  // Glows: eye flares when attacking, cannons heat while charging, cores burn hotter while exposed.
  const pulse=.5+.5*Math.sin(time*(this.exposed?14:4));
  M.eye.emissiveIntensity=2.2+(phase==='charge'||phase==='slamWindup'?2.5*pulse:0);
  M.muzzle.emissiveIntensity=.8+5*this.chargeGlow*(.7+.3*pulse);
  M.frontCore.emissiveIntensity=.3+this.exposure*(3+2*pulse)+this.coreFlash*8;
  M.core.emissiveIntensity=2+this.exposure*(2.5+2*pulse)+this.coreFlash*8;
  if(this.exposure>.6&&Math.random()<.35){this.fx.vent(P.frontCore.localToWorld(new THREE.Vector3(0,.3,.1)));this.fx.vent(P.reactor.localToWorld(new THREE.Vector3(0,.45,-.1)));}
  // Ranged telegraph ring while charging; ground slam ring fills until impact.
  this.warning.visible=phase==='charge'||phase==='burst';this.warning.material.opacity=.3+.4*pulse;
  const slamming=phase==='slamWindup';this.slamRing.visible=this.slamFill.visible=slamming;
  if(slamming){const t=Math.min(1,this.phaseClock/c.slam.windup),r=c.slam.radius,p=this.root.position;
   for(const m of [this.slamRing,this.slamFill])m.position.set(p.x,p.y+.14,p.z);
   this.slamRing.scale.setScalar(r);this.slamRing.material.opacity=.55+.45*Math.sin(time*(10+20*t))**2;
   this.slamFill.scale.setScalar(r*Math.max(.02,t));this.slamFill.material.opacity=.18+.22*t;}
 }
 updateRings(dt){
  if(this.shockAge===Infinity)return;this.shockAge+=dt;const t=this.shockAge/.4;
  this.shockRing.visible=t<1;if(!this.shockRing.visible){this.shockAge=Infinity;return;}
  this.shockRing.scale.setScalar(this.config.slam.radius*(.25+.95*(1-(1-t)**3)));this.shockRing.material.opacity=(1-t)*.95;
 }
 updateDeath(dt,time){
  const c=this.config,P=this.model.parts,M=this.model.materials;this.deathAge+=dt;
  if(!this.exploded){
   // Core overload: the reactor flickers white-hot and the torso sags before it blows apart.
   const t=Math.min(1,this.deathAge/c.dying),flick=Math.random()<.5?1:.3;
   M.core.emissiveIntensity=M.frontCore.emissiveIntensity=3+10*t*flick;M.eye.emissiveIntensity=2*(1-t);
   P.chest.rotation.x=.3+.35*t;P.body.position.y=this.bodyHeight-.25*t;
   if(Math.random()<.6)this.fx.core(P.reactor.localToWorld(new THREE.Vector3(0,0,-.2)),false);
   if(this.deathAge>=c.dying){this.exploded=true;const p=P.reactor.localToWorld(new THREE.Vector3(0,0,-.1));this.fx.death(p);this.onDeath(p,{large:false});this.breakApart();if(!this.wrecks.length)this.root.visible=false;}
  }else this.syncWrecks();
 }
 diagnostics(){
  return {...super.diagnostics(),type:this.type,phase:this.phase,phaseSeconds:this.phaseClock,exposure:this.exposure,exposed:this.exposed,burstCooldown:this.burstCooldown,slamCooldown:this.slamCooldown,
   stats:{...this.stats,zones:{...this.stats.zones}},lastHit:this.lastHit,config:this.config,dying:this.dead&&!this.exploded};
 }
}
