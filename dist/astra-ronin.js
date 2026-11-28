import {RoninFlight} from './astra-ronin-flight.js?v=474';
import * as THREE from './vendor/three.module.js';
import {Mireguard} from './mireguard.js?v=474';
import {AstraRoninModel} from './astra-ronin-model.js?v=472';
import {RoninWaves} from './astra-ronin-waves.js?v=471';
import {COMBAT_ARENA} from './combat-arena-config.js?v=mireguard-pairs-260';
export const RONIN={height:15,health:2400,headHealth:999999,segmentHealth:999999,walkSpeed:8,preferredRange:9,range:220,turnRate:1.8,initialDelay:2,swordWindup:.95,swordSwing:.32,swordRecovery:1.1,swordCooldown:1.4,swordRange:12,swordBuildingDamage:26,swordBuildingHeight:10,buildingEdgeMultiplier:.5,swordDamage:35,overheadDamage:55,bodyRadius:3.5,collapseDuration:1.05,
 dashMinRange:14,dashRange:70,dashDistance:70,dashSpeed:100,dashStandOff:4,dashWindup:1.1,dashRecovery:1.2,dashCooldown:3.2,dashDamage:55,dashBuildingDamage:40,dashWarningWidth:3,dashAreaRadius:18,dashAreaHeight:6,dashAimLockTime:.65,dashLeadFactor:1,dashLeadMaxTime:2,dashLeadMaxDistance:45,dashTrackedSpeed:100,dashComboCount:3,dashComboInterval:1,dashComboNearRange:16,dashComboPassThrough:8,
 flightStartRange:85,flightStopRange:50,flightLandingRadius:45,flightSpeed:38,flightAcceleration:60,flightHeight:18,flightClearance:6,flightBuildingMargin:16,flightRiseSpeed:30,flightDescendSpeed:24,flightTurnRate:2.4,flightTakeoffTime:.6,flightLandingRecovery:.4,
 guardInitialDelay:3.5,guardRaise:.45,guardHold:2.2,guardLower:.35,guardCooldown:7,guardFlashDuration:.18,
 // Wave slash: alternates with the dash combo at range. Two horizontal sweeps each release a row of vertical
 // plasma waves; the second row (one fewer) fills the first row's gaps, so a hero must sidestep twice.
 waveMinRange:14,waveHold:18,waveRange:66,waveWindup:.9,waveLock:.62,waveSwing:.3,waveVolleyInterval:.62,waveStagger:.05,waveRecovery:1,waveCooldown:2.8,
 waveCount:5,waveSpacing:9,waveWidth:4,waveHeight:14,waveStart:6,waveFan:220,waveSpeed:30,waveTravel:80,waveDamage:24,waveBuildingDamage:16};
const V=()=>new THREE.Vector3();
export class AstraRonin extends Mireguard{
 // options.arena ({movementBounds, dashBounds}) and options.navigationNodes let a mode other than Combat Testing host him;
 // options.hunter (City Liberation mini-boss) makes him always track the hero and fly in over buildings to reach them.
 constructor(scene,damage,options){super(scene,damage,{...options,config:{...RONIN,...options.config}});this.arena=options.arena||null;this.hunter=!!options.hunter;this.root.clear();this.model=new AstraRoninModel(this.root,this.config,options.shogunModel);this.waves=new RoninWaves(scene,this.config);this.parts=this.model.parts;this.flightController=new RoninFlight(this);this.type='ronin';this.onBuildingStrike=options.onBuildingStrike||(()=>{});this.root.name='Astra Ronin · sword duelist';this.reset();}
 sensesHero(unit){return this.hunter||super.sensesHero(unit);}
 disposeWreck(w){super.disposeWreck(w);w.group.traverse(o=>{if(o.isMesh&&o.geometry.userData.shogunWreck)o.geometry.dispose();});}
 setModelVariant(value){this.model.shogun?.select(value);return this.model.shogun?.mode||'original';}
 spawnWreck(node){if(!this.model.shogun?.enabled)return super.spawnWreck(node);const count=this.wrecks.length,snapshot=this.model.shogun.wreck(node.name);super.spawnWreck(snapshot);snapshot.removeFromParent();if(this.wrecks.length===count)snapshot.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
 get dashWindupDuration(){return this.dashComboIndex>1?this.config.dashComboInterval:this.config.dashWindup;}
 get flight(){return this.flightController?.state||null;}
 reset(){super.reset();this.flightController?.reset();this.swordState=false;this.swordAge=0;this.swings=0;this.swordHit=false;this.buildingStrikeApplied=false;this.dying=false;this.deathAge=0;this.dashAttack=false;this.dashStage=null;this.dashClock=0;this.dashElapsed=0;this.dashLength=0;this.dashes=0;this.dashComboIndex=0;this.struck=new Set();this.dashStart=this.dashEnd=this.dashDirection=null;this.dashArea=null;this.dashTracking=null;this.guard=null;this.guardWeight=0;this.guardFlash=0;this.guardCooldown=this.config?.guardInitialDelay??RONIN.guardInitialDelay;this.guardCount=this.blockedHits=0;this.suppressDamageFlash=false;this.waveAttack=false;this.waveClock=0;this.waveYaw=0;this.waveLocked=false;this.wavePlans=[null,null];this.waveLaunched=[0,0];this.rangedAttacks=0;this.wavesFired=0;this.waveHits=0;this.waves?.reset();}
 cancelBurst(){const active=this.swordState||this.dashAttack;super.cancelBurst();this.waveAttack=false;this.waves?.setLanes([]);this.swordState=false;this.swordAge=0;this.dashAttack=false;this.dashStage=null;this.dashClock=0;this.dashArea=null;this.dashComboIndex=0;this.cancelGuard();if(active)this.model?.animation?.cancelDash();}
 modifyDamage(power,point,part){if(this.dead)return 0;if(part==='ronin-shield'&&this.guardBlocking){this.blockedHits++;this.guardFlash=this.config.guardFlashDuration;this.suppressDamageFlash=true;this.model.updateShieldVisual(this);return 0;}this.suppressDamageFlash=false;this.flinch=Math.max(this.flinch,.12);return power*(part==='head'?1.5:1);}
 get guardBlocking(){return this.guard?.phase==='hold'&&!this.flight&&this.stunRemaining<=0&&!this.dead;}
 cancelGuard(){this.guard=null;this.guardWeight=0;this.guardFlash=0;this.suppressDamageFlash=false;this.model?.updateShieldVisual?.(this);}
 updateGuard(dt){const c=this.config,g=this.guard;g.age+=dt;this.moving=false;this.mode='shield-'+g.phase;
  if(g.phase==='raise'){this.guardWeight=Math.min(1,g.age/c.guardRaise);if(g.age>=c.guardRaise){g.phase='hold';g.age=0;}}
  else if(g.phase==='hold'){this.guardWeight=1;if(g.age>=c.guardHold){g.phase='lower';g.age=0;}}
  else{this.guardWeight=Math.max(0,1-g.age/c.guardLower);if(g.age>=c.guardLower){this.cancelGuard();this.guardCooldown=c.guardCooldown+(this.guardCount%3-1);this.cooldown=Math.max(this.cooldown,.4);}}
 }
 sync(){super.sync();if(this.guardBlocking&&this.combatUnit?.alive){const n=this.parts.shield;this.root.updateWorldMatrix(true,true);this.combatUnit.shapes.unshift({part:'ronin-shield',center:n.getWorldPosition(V()),rotation:n.getWorldQuaternion(new THREE.Quaternion()),half:{x:1.45*this.root.scale.x,y:2.4*this.root.scale.y,z:.42*this.root.scale.z}});}}
 chooseTarget(dt){
  // A committed attack survives loss of sight through a building. Only wind-up tracks.
  if(this.swordState){const current=this.getTargets(this.root.position).find(u=>u===this.target||u.id&&u.id===this.target?.id);if(current)this.target=current;if(!this.target?.alive||this.target.entity?.enabled===false){this.cancelBurst();return super.chooseTarget(dt);}if(!this.dashAttack||this.dashStage==='windup'&&!this.dashArea?.locked){const shape=this.target.shapes[0];if(shape)this.lastSeen=V().copy(shape.center);}this.targetVisible=true;this.trackDashTarget(dt);return;}
  super.chooseTarget(dt);if(this.targetVisible)this.trackDashTarget(dt);
 }
 trackDashTarget(dt){const unit=this.target,point=unit?.shapes?.[0]?.center;if(!point)return;const p=V().copy(point),old=this.dashTracking,motion=unit.entity?.motion,velocity=motion?.body?.velocity||motion?.velocity||unit.entity?.velocity;let v=V();
  if(velocity&&Number.isFinite(velocity.x)&&Number.isFinite(velocity.z))v.set(velocity.x,0,velocity.z);
  else if(old?.unit===unit&&dt>0){const delta=p.clone().sub(old.point).setY(0);if(delta.length()<=this.config.dashTrackedSpeed*dt*2)v.copy(delta).multiplyScalar(1/dt);}
  v.clampLength(0,this.config.dashTrackedSpeed);this.dashTracking={unit,point:p,velocity:v};
 }
 planDash(remaining){const c=this.config,b=this.arena?.dashBounds||COMBAT_ARENA.dashBounds,start=this.root.position.clone(),velocity=this.dashTracking?.velocity||V();let aim=this.lastSeen.clone(),time=0;
  for(let i=0;i<3;i++){time=Math.min(c.dashLeadMaxTime,remaining+Math.max(0,aim.distanceTo(start)-c.dashStandOff)/c.dashSpeed+c.swordSwing*.25);const lead=velocity.clone().multiplyScalar(time*c.dashLeadFactor).clampLength(0,c.dashLeadMaxDistance);aim.copy(this.lastSeen).add(lead);}
  aim.y=start.y;aim.x=THREE.MathUtils.clamp(aim.x,b.minX,b.maxX);aim.z=THREE.MathUtils.clamp(aim.z,b.minZ,b.maxZ);
  const direction=aim.clone().sub(start).setY(0),distance=direction.length();if(distance<.001)direction.set(0,0,1).applyQuaternion(this.root.quaternion);else direction.normalize();
  const reach=Math.min(distance,c.dashDistance+c.dashStandOff),center=start.clone().addScaledVector(direction,reach);this.dashEnd=start.clone().addScaledVector(direction,Math.max(0,reach-c.dashStandOff));this.dashLength=start.distanceTo(this.dashEnd);if(this.dashComboIndex>1&&distance<c.dashComboNearRange){this.dashEnd.copy(center).addScaledVector(direction,c.dashComboPassThrough);this.dashEnd.x=THREE.MathUtils.clamp(this.dashEnd.x,b.minX,b.maxX);this.dashEnd.z=THREE.MathUtils.clamp(this.dashEnd.z,b.minZ,b.maxZ);if(this.dashEnd.distanceTo(start)<1)this.dashEnd.copy(center).addScaledVector(direction,-c.dashComboPassThrough);this.dashEnd.x=THREE.MathUtils.clamp(this.dashEnd.x,b.minX,b.maxX);this.dashEnd.z=THREE.MathUtils.clamp(this.dashEnd.z,b.minZ,b.maxZ);this.dashLength=start.distanceTo(this.dashEnd);direction.copy(this.dashEnd).sub(start).normalize();}this.dashDirection=direction;this.dashArea={center:center.setY(.24),radius:c.dashAreaRadius,height:c.dashAreaHeight,locked:false,leadTime:time};
 }
 strikeBuildings(dash=false,{wide=false}={}){if(this.buildingStrikeApplied)return;this.buildingStrikeApplied=true;const c=this.config,area=this.dashArea;this.onBuildingStrike?.({center:(dash?area.center:this.root.position).clone(),radius:dash?area.radius:c.swordRange,height:dash?area.height:c.swordBuildingHeight,damage:dash?c.dashBuildingDamage:c.swordBuildingDamage,edgeMultiplier:c.buildingEdgeMultiplier,forward:dash?null:V().set(0,0,1).applyQuaternion(this.root.quaternion),minDot:wide?.05:this.overhead?.7:.05});}
 strikeDashArea(){const area=this.dashArea;if(!area)return;this.strikeBuildings(true);for(const unit of this.getTargets(area.center)){if(!unit.alive||unit.dashPhased||!unit.shapes.length||this.struck.has(unit))continue;const point=V().copy(unit.shapes[0].center);if(Math.hypot(point.x-area.center.x,point.z-area.center.z)>area.radius||Math.abs(point.y-area.center.y)>area.height)continue;this.struck.add(unit);this.onHeroHit(unit,point,this.config.dashDamage);this.energyEffects.impact(point,point.clone().sub(area.center).normalize(),1.3);this.heroHits++;}}
 beginAttack(){const c=this.config,distance=this.root.position.distanceTo(this.lastSeen),ranged=distance>=c.dashMinRange;
  // Ranged engagements alternate: dash combo first, then a wave slash. The wave turn waits (he dashes
  // instead) while the hero is beyond wave range.
  if(ranged&&this.waveTurn&&distance>=c.waveMinRange&&distance<=c.waveRange){this.rangedAttacks++;this.beginWave();return;}
  if(ranged&&!this.waveTurn)this.rangedAttacks++;
  this.dashAttack=distance>=this.config.dashMinRange;this.dashComboIndex=this.dashAttack?1:0;this.swordState=true;this.swordAge=0;this.swordHit=false;this.buildingStrikeApplied=false;this.struck.clear();this.overhead=!this.dashAttack&&this.swings%2===1;this.dashStage=this.dashAttack?'windup':null;this.dashClock=0;this.dashLength=Math.min(this.config.dashDistance,Math.max(0,distance-this.config.dashStandOff));if(this.dashAttack)this.planDash(this.config.dashWindup);}
 get waveTurn(){return this.rangedAttacks%2===1&&this.config.waveCount>0;}
 beginWave(){this.waveAttack=true;this.swordState=true;this.swordAge=this.waveClock=0;this.dashAttack=false;this.dashStage=null;this.overhead=false;this.struck.clear();this.waveLocked=false;this.wavePlans=[null,null];this.waveLaunched=[0,0];this.waveYaw=this.yawTo(this.lastSeen);}
 yawTo(point){return Math.atan2(point.x-this.root.position.x,point.z-this.root.position.z);}
 // Row of lanes for a volley, fanned slightly from a point behind the Ronin and cut short by buildings.
 planWaves(volley){const c=this.config,yaw=this.waveYaw,forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),side=new THREE.Vector3(forward.z,0,-forward.x),count=volley?c.waveCount-1:c.waveCount,lanes=[];
  for(let i=0;i<count;i++){const lateral=(i-(count-1)/2)*c.waveSpacing,angle=Math.atan(lateral/c.waveFan),dir=forward.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side,Math.sin(angle)).normalize();
   const origin=this.root.position.clone().addScaledVector(forward,c.waveStart).addScaledVector(side,lateral);origin.y=this.root.position.y;
   const {length,blocked}=this.laneLength(origin,dir);lanes.push({origin,dir,lateral,length,blocked});}
  // Forehand sweeps from the sword side across; the backhand returns the other way.
  return lanes.sort((a,b)=>volley?a.lateral-b.lateral:b.lateral-a.lateral);
 }
 laneLength(origin,dir){const c=this.config,end=origin.clone().addScaledVector(dir,c.waveTravel);if(this.isPathClear(origin,end))return{length:c.waveTravel,blocked:false};
  let low=0,high=c.waveTravel;for(let i=0;i<7;i++){const mid=(low+high)/2;if(this.isPathClear(origin,origin.clone().addScaledVector(dir,mid)))low=mid;else high=mid;}return{length:Math.max(2,low),blocked:true};}
 updateWave(dt){const c=this.config,W=c.waveWindup,I=c.waveVolleyInterval,t=this.waveClock+=dt;this.swordAge=t;
  if(!this.waveLocked){if(this.lastSeen)this.waveYaw=this.yawTo(this.lastSeen);if(t>=c.waveLock)this.waveLocked=true;}
  // Plant the stance on the locked heading; before the lock the plan follows the hero.
  const turn=Math.atan2(Math.sin(this.waveYaw-this.root.rotation.y),Math.cos(this.waveYaw-this.root.rotation.y));this.root.rotation.y+=THREE.MathUtils.clamp(turn,-6*dt,6*dt);
  if(!this.waveLocked||!this.wavePlans[0])this.wavePlans[0]=this.planWaves(0);
  if(t>=W-.05&&!this.wavePlans[1])this.wavePlans[1]=this.planWaves(1);
  for(const volley of[0,1]){const plan=this.wavePlans[volley];if(!plan)continue;const start=W+volley*I+.03;
   while(this.waveLaunched[volley]<plan.length&&t>=start+this.waveLaunched[volley]*c.waveStagger){this.waves.launch(plan[this.waveLaunched[volley]]);this.waveLaunched[volley]++;this.wavesFired++;}}
  const lanes=[];for(const volley of[0,1]){const plan=this.wavePlans[volley];if(!plan)continue;const shown=volley?Math.min(1,(t-W+.05)/.2)*.8:Math.min(1,t/.25)*(this.waveLocked?1:.65);for(const lane of plan.slice(this.waveLaunched[volley]))lanes.push({...lane,opacity:shown,locked:this.waveLocked});}
  this.waves.setLanes(lanes);
  this.mode=t<W?'wave-windup':t<W+I+c.waveSwing?'wave-slash':'wave-recovery';
  if(t>=W+I+c.waveSwing+c.waveRecovery)this.finishAttack();
 }
 waveContext(){return{targets:this.spawned&&!this.dead?this.getTargets(this.root.position):[],
  onHit:(unit,point,wave)=>{this.onHeroHit(unit,point,this.config.waveDamage);this.energyEffects?.impact(point,wave.dir,1.1);this.heroHits++;this.waveHits++;},
  onBuilding:(point)=>{const c=this.config;this.onBuildingStrike?.({center:point.clone(),radius:c.waveWidth*.9,height:c.waveHeight,damage:c.waveBuildingDamage,edgeMultiplier:c.buildingEdgeMultiplier,forward:null,minDot:-1});this.energyEffects?.impact(point.clone().setY(point.y+2),new THREE.Vector3(0,1,0),1.4);}};}
 launchDash(){if(!this.dashArea)this.planDash(0);this.dashArea.locked=true;this.dashStart=this.root.position.clone();this.dashDirection=this.dashEnd.clone().sub(this.dashStart).setY(0);this.dashLength=this.dashDirection.length();if(this.dashLength>.001)this.dashDirection.normalize();this.dashStage='dash';this.dashClock=0;this.dashElapsed=0;this.dashes++;}
 strike({ignoreBuildings=false,damage,wide=false}){this.strikeBuildings(false,{wide});const origin=this.root.position,forward=V().set(0,0,1).applyQuaternion(this.root.quaternion);for(const u of this.getTargets(origin)){if(!u.alive||u.dashPhased||!u.shapes.length||this.struck.has(u))continue;const point=V().copy(u.shapes[0].center),delta=point.clone().sub(origin);if(delta.length()>this.config.swordRange||delta.clone().setY(0).normalize().dot(forward)<(wide?.05:this.overhead?.7:.05)||!ignoreBuildings&&!this.visible(this.aimPoint(),point))continue;this.struck.add(u);this.onHeroHit(u,point,damage);this.energyEffects.impact(point,delta.normalize(),1);this.heroHits++;}}
 nextComboDash(){this.dashComboIndex++;this.dashStage='windup';this.dashClock=this.swordAge=0;this.struck.clear();this.buildingStrikeApplied=false;this.dashArea=null;this.dashStart=null;const shape=this.target?.shapes?.[0];if(shape)this.lastSeen=V().copy(shape.center);this.model.animation.beginComboWindup();this.planDash(this.dashWindupDuration);}
 finishAttack(){const dashed=this.dashAttack,waved=this.waveAttack;this.waveAttack=false;this.waves.setLanes([]);this.swordState=false;this.dashAttack=false;this.dashStage=null;this.dashArea=null;this.dashComboIndex=0;this.swings++;this.cooldown=waved?this.config.waveCooldown:dashed?this.config.dashCooldown:this.config.swordCooldown;this.model.animation.cancelDash();}
 updateDash(dt){const c=this.config;this.dashClock+=dt;
  if(this.dashStage==='windup'){this.mode='dash-windup';const windup=this.dashWindupDuration;this.swordAge=this.dashClock;if(!this.dashArea?.locked){this.planDash(Math.max(0,windup-this.dashClock));if(this.dashClock>=c.dashAimLockTime){this.dashArea.locked=true;this.lastSeen=this.dashArea.center.clone();}}if(this.dashClock>=windup-1e-8)this.launchDash();return;}
  // Heading locks at launch: no curved pursuit or building collision during the strike.
  this.root.rotation.y=Math.atan2(this.dashDirection.x,this.dashDirection.z);
  if(this.dashStage==='dash'){this.mode='sword-dash';this.dashElapsed+=dt;const distance=Math.min(this.dashLength,this.dashElapsed*c.dashSpeed);this.root.position.copy(this.dashStart).addScaledVector(this.dashDirection,distance);if(distance>=this.dashLength){this.dashStage='slash';this.dashClock=0;}return;}
  if(this.dashStage==='slash'){this.mode='dash-slash';if(this.dashClock>=c.swordSwing*.25&&this.dashClock<=c.swordSwing)this.strikeDashArea();if(this.dashClock>=c.swordSwing){if(this.dashComboIndex<c.dashComboCount)this.nextComboDash();else{this.dashStage='recovery';this.dashClock=0;}}return;}
  this.mode='dash-recovery';if(this.dashClock>=c.dashRecovery)this.finishAttack();
 }
 updateWeapon(dt){const c=this.config;this.guardFlash=Math.max(0,this.guardFlash-dt);this.guardCooldown=Math.max(0,this.guardCooldown-dt);this.cooldown=Math.max(0,this.cooldown-dt);if(this.stunRemaining>0){this.cancelBurst();return;}if(this.guard){this.updateGuard(dt);return;}if(!this.swordState&&this.guardCooldown<=0&&this.targetVisible&&this.lastSeen&&this.root.position.distanceTo(this.lastSeen)<=c.dashRange){this.guard={phase:'raise',age:0};this.guardCount++;this.updateGuard(dt);return;}if(!this.swordState){if(this.cooldown>0||!this.targetVisible||!this.lastSeen||this.root.position.distanceTo(this.lastSeen)>c.dashRange)return;this.beginAttack();}this.moving=false;if(this.dashAttack){this.updateDash(dt);return;}if(this.waveAttack){this.updateWave(dt);return;}
  this.swordAge+=dt;this.mode=this.swordAge<c.swordWindup?'sword-windup':'sword-strike';if(!this.swordHit&&this.swordAge>=c.swordWindup+c.swordSwing*.5){this.swordHit=true;this.strike({ignoreBuildings:true,damage:this.overhead?c.overheadDamage:c.swordDamage});}if(this.swordAge>=c.swordWindup+c.swordSwing+c.swordRecovery)this.finishAttack();
 }
 moveToward(goal,speed,dt){if(this.swordState||this.guard)return false;
  // With the wave slash up next he holds his ground at range rather than closing to sword reach.
  if(this.waveTurn&&this.lastSeen&&this.targetVisible){const d=this.root.position.distanceTo(this.lastSeen);if(d>=this.config.waveHold&&d<=this.config.waveRange)return false;}
  return super.moveToward(goal,speed,dt);}
 destroy(){if(this.dead)return;this.waves.dissipate();this.flightController.reset();this.dead=true;this.dying=true;this.deathAge=0;this.cancelBurst();this.target=null;if(this.combatUnit){this.combatUnit.alive=false;this.combatUnit.shapes=[];}this.model.animation.beginDefeat();}
 update(dt,time){this.waves.update(dt,time,this.waveContext());if(this.dying){this.deathAge+=dt;this.model.animation.defeat(this.deathAge/this.config.collapseDuration);if(this.deathAge>=this.config.collapseDuration){this.dying=false;this.dead=false;super.destroy();}return;}if(this.flightController.update(dt))return;super.update(dt,time);}
 diagnostics(){return{...super.diagnostics(),name:'Astra Ronin',wave:{attack:this.waveAttack,clock:this.waveClock,locked:this.waveLocked,fired:this.wavesFired,hits:this.waveHits,...this.waves.diagnostics()},appearance:this.model.shogun?.diagnostics()||{selected:'original',available:false},propulsion:this.model.propulsion.diagnostics(),guard:{phase:this.guard?.phase||'off',weight:this.guardWeight,blocking:this.guardBlocking,cooldown:this.guardCooldown,blockedHits:this.blockedHits,count:this.guardCount},flight:this.flightController.diagnostics(),swings:this.swings,swordState:this.swordState,swordAge:this.swordAge,dashAttack:this.dashAttack,dashStage:this.dashStage,dashClock:this.dashClock,dashes:this.dashes,dashComboIndex:this.dashComboIndex,dashComboTotal:this.config.dashComboCount,dashLength:this.dashLength,dashEnd:this.dashEnd?.toArray()||null,dashArea:this.dashArea?{center:this.dashArea.center.toArray(),radius:this.dashArea.radius,height:this.dashArea.height,locked:this.dashArea.locked,leadTime:this.dashArea.leadTime}:null};}
}
