import {ENEMY_ALERT,inFrontOfEnemy} from './enemy-alert.js?v=421';
import {ROBOT_WRECK_SECONDS} from './destruction.js?v=393';
import {BastionBeamWalls} from './bastion-beam-walls.js?v=wall-facing-322';
import {BastionRain} from './bastion-rain.js?v=390';
import * as THREE from './vendor/three.module.js';
import {BastionModel} from './bastion-model.js?v=392';
import {BastionState} from './bastion-state.js?v=bastion-weapons-278';
import {BastionProjectiles} from './bastion-projectiles.js?v=392';
import {BastionEffects} from './bastion-effects.js?v=432';
import {angleDistance} from './bastion-geometry.js?v=charged-shuriken-130';
import {traceImpact} from './combat-collision.js?v=robot-experiments-108';
import {absorbDirectionalBarrier} from './hero-defense.js?v=390';
export class Bastion {
 constructor(scene,damage,config,{onEvent=()=>{},onPlayerHit=()=>{},onWindup=()=>{},onDeathBlast=()=>{},arenaBounds}={}){Object.assign(this,{scene,damage,config,onEvent,onPlayerHit,onWindup,onDeathBlast,arenaBounds});this.model=new BastionModel(scene,config);this.root=this.model.root;this.state=new BastionState(config);
  this.decks=this.model.sections.filter(section=>section.cap);
  for(const deck of this.decks){
   deck.isPlatform=true;
   deck.isActive=()=>!this.dead&&this.root.visible&&this.combatUnit?.alive&&!deck.hidden&&!deck.collisionDisabled
    &&1-2*(deck.body.quaternion.x**2+deck.body.quaternion.z**2)>.65;
  }
  this.evac=true;this.projectiles=null;this.waves=[];this.stunRemaining=0;this.feedback='';this.hitCooldown=0;this.reset();this.effects=new BastionEffects(this);this.projectiles=new BastionProjectiles(this);this.rain=new BastionRain(this);this.beamWalls=new BastionBeamWalls(this);}
 get sections(){return this.model.sections;}
 walkableDecks(){return this.decks.filter(deck=>deck.isActive());}
 get dead(){return this.state.phase==='defeated';}
 get coreOpen(){return this.state.exposed&&this.stunRemaining<=0;}
 aimWeakPoint(){return this.armsHealth?.[0]>0?'arm-left':this.armsHealth?.[1]>0?'arm-right':'chest';}
 aimPoint(){return this.model.weakPointPosition(this.aimWeakPoint());}
 noticeDamageFrom(hero){this.retaliation={hero,until:this.perceptionTime+ENEMY_ALERT.seconds};}
 isAlertedTo(hero){return !!hero&&this.retaliation?.hero===hero&&this.perceptionTime<this.retaliation.until;}
 reset(seed=this.config.seed){this.retaliation=null;this.perceptionTime=0;this.lastObserved=null;this.state.reset(seed);this.armsHealth=[this.config.weakPoints.armHealth,this.config.weakPoints.armHealth];this.model.reset();this.damage.units=this.damage.units.filter(u=>u.entity!==this);this.combatUnit=this.damage.add('bastion','robot',this,this.config.core.health);this.player=null;this.attackKey='';this.stunRemaining=0;this.hitCooldown=0;this.feedback='';this.deathPose=null;this.waves=[];this.pulseCooldown=0;this.proximityWindup=null;this.pulseWarningElapsed=0;this.pendingPulseId=null;this.reactivePulses=0;this.projectiles?.reset();this.rain?.reset();this.beamWalls?.reset();this.effects?.reset();this.sync();this.paint(0);}
 sync(){this.combatUnit.shapes=this.dead?[]:this.model.shapes(this.state);}
 applyHit(hit,power,key='strike'){if(hit?.orb){if(hit.orb.kind==='gatling')return 0;if(this.config.deflect.enabled&&this.coreOpen)this.projectiles?.deflect(hit.orb,this.aimPoint());else this.projectiles?.remove(hit.orb);return 0;}if(hit?.unit!==this.combatUnit)return 0;this.attackKey=String(key);const result=this.damage.hurt(this.combatUnit,power,hit.point,hit.part);this.sync();return result;}
 destroyArm(index){const arm=this.model.arms[index],point=this.model.weakPointPosition(index?'arm-right':'arm-left');arm.visible=false;this.model.anchor=null;for(const section of this.sections){let node=section.node;while(node&&node!==arm)node=node.parent;if(node===arm)section.hidden=section.collisionDisabled=true;}for(const [i,launcher]of this.model.launchers.entries()){let node=launcher;while(node&&node!==arm)node=node.parent;if(node===arm){this.state.launchers[i].health=0;this.state.launchers[i].destroyed=true;}}if(this.state.launchers[this.config.rain.module].destroyed){if(this.rain)this.rain.pending=[];}this.effects?.impact(point,'#ff8b38',8);this.onEvent((index?'RIGHT':'LEFT')+' ARM DESTROYED · attached weapons disabled.');}
 destroyWeapon(index){const module=this.state.launchers[index];if(!module||module.destroyed)return;module.health=0;module.destroyed=true;const node=this.model.launchers[index],position=node.getWorldPosition(new THREE.Vector3());node.visible=false;for(const section of this.sections)if(section.node===node)section.hidden=section.collisionDisabled=true;if(index===this.config.beamWalls.module)this.beamWalls?.reset();if(index===this.config.rain.module&&this.rain)this.rain.pending=[];this.effects?.impact(position,'#ffab42',7);this.onEvent((index===this.config.beamWalls.module?'DORSAL LASER ARRAY':'SHOULDER ARTILLERY')+' DESTROYED');this.sync();}
 modifyDamage(power,point,part){if(part==='launcher-'+this.config.beamWalls.module||part==='launcher-'+this.config.rain.module){const index=Number(part.slice(9)),module=this.state.launchers[index],c=index===this.config.beamWalls.module?this.config.beamWalls:this.config.rain;if(module.destroyed)return 0;const dealt=Math.min(module.health,Math.max(0,power));module.health-=dealt;this.feedback=index===this.config.beamWalls.module?'LASER ARRAY HIT':'ARTILLERY HIT';if(point)this.effects?.impact(new THREE.Vector3().copy(point),'#ff9e42');if(module.health<=0)this.destroyWeapon(index);return dealt*c.weaponBossDamageScale;}if(part==='arm-left'||part==='arm-right'){const i=part==='arm-left'?0:1;if(this.armsHealth[i]<=0)return 0;const damage=Math.min(this.armsHealth[i],Math.max(0,power));this.armsHealth[i]-=damage;this.feedback=(i?'RIGHT':'LEFT')+' ARM HIT';this.effects?.impact(point,'#ff9e42');if(this.armsHealth[i]===0)this.destroyArm(i);return damage*this.config.weakPoints.armBossDamageScale;}if(part==='chest'){this.feedback='CHEST REACTOR HIT';this.effects?.impact(point,'#ff9e42');return power*this.config.weakPoints.chestDamageMultiplier*this.state.multiplier(this.attackKey);}this.feedback='ARMOUR · AIM FOR ARM CORES OR CHEST REACTOR';return 0;}
 interrupt(seconds=1){if(this.dead)return false;this.stunRemaining=Math.max(this.stunRemaining,seconds);this.onEvent('Bastion interrupted · armour locked briefly.');return true;}
 defeat(){
  if(this.dead)return;
  const model=this.model;
  this.deathPose={age:0,stage:0,deckPosition:model.deck.position.clone(),deckRotation:model.deck.rotation.clone(),
   torso:model.torso.rotation.clone(),head:model.head.rotation.clone(),arms:model.arms.map(arm=>arm.rotation.clone())};
  this.state.defeat();
  this.combatUnit.alive=false;this.combatUnit.health=0;
  this.projectiles?.reset();this.rain?.reset();this.beamWalls?.reset();
  this.waves=[];model.anchor=null;
  for(const gun of model.art.guns)gun.flash.visible=false;
  this.sync();this.paint(0);
  this.onEvent('BASTION DEFEATED');
 }
 updateDeath(dt,time){
  const death=this.deathPose,m=this.model;
  if(!death)return;
  death.age+=dt;
  if(death.age>=2.8+ROBOT_WRECK_SECONDS){
   if(m.root.visible){m.root.visible=false;for(const section of m.sections)section.hidden=section.collisionDisabled=true;}
   this.effects?.update(dt,time);
   return;
  }
  const age=death.age,shock=Math.sin(age*32)*Math.max(0,1-age/1.9)**2;
  const fall=THREE.MathUtils.clamp((age-.85)/1.95,0,1)**2.35;
  const settle=Math.sin(Math.max(0,age-2.8)*16)*Math.exp(-Math.max(0,age-2.8)*4);
  m.deck.position.y=death.deckPosition.y-6.8*fall+settle*.42;
  m.deck.rotation.x=death.deckRotation.x+.80*fall+.032*shock-.04*settle;
  m.deck.rotation.z=death.deckRotation.z-.32*fall+.035*shock;
  m.torso.rotation.x=death.torso.x+.25*fall;
  m.head.rotation.x=death.head.x+.62*fall+.08*shock;
  for(const [i,arm] of m.arms.entries()){
   arm.rotation.x=death.arms[i].x-.4*fall;
   arm.rotation.z=death.arms[i].z+(i?1:-1)*(.37*fall+.055*shock);
  }
  m.art.materials.energy.emissiveIntensity=age<2.8?.2+2.2*Math.abs(shock):0;
  m.art.materials.cool.emissiveIntensity=age<2.8?.12+.9*Math.abs(shock):0;
  m.art.wallGlow.emissiveIntensity=m.art.artilleryGlow.emissiveIntensity=Math.abs(shock);
  m.art.updateArmHydraulics();
  m.sync();
  const stages=[0,.52,1.17,1.87,2.8,3.55];
  const parts=[m.torso,m.arms[1],m.arms[0],m.head,m.deck,m.torso];
  while(death.stage<stages.length&&age>=stages[death.stage]){
   const index=death.stage++,point=parts[index].getWorldPosition(new THREE.Vector3()),heavy=index===4;
   if(heavy)point.y=this.root.position.y+1.2;
   this.effects?.impact(point,index===0?'#c6efff':'#ff9852',heavy?22:8);
   this.onDeathBlast(point,{large:heavy||index===0,secondary:!heavy,ground:heavy});
  }
  this.effects?.update(dt,time);
 }
 canPulse(){const targets=this.getPulseTargets?.()||[this.player];return targets.some(player=>{if(!player?.position||Math.hypot(player.position.x-this.root.position.x,player.position.y-this.root.position.y,player.position.z-this.root.position.z)>this.config.pulse.maxRadius)return false;if(this.onBody(player))return true;for(const s of this.sections){if(s.hidden||s.cap)continue;const local=new THREE.Vector3().copy(player.position).sub(s.body.position).applyQuaternion(s.body.quaternion.clone().invert());let distance=0;for(let i=0;i<3;i++)distance+=Math.max(0,Math.abs(local[['x','y','z'][i]])-s.size[i]/2)**2;if(distance<=this.config.pulse.triggerDistance**2)return true;}return false;});}
 addWave(id){if(this.dead||this.stunRemaining>0||this.pulseCooldown>0||this.player&&!this.canPulse())return false;if(this.pulseWarningElapsed+1e-6<this.config.pulse.proximityWindup){this.pendingPulseId=id;if(this.proximityWindup===null){this.proximityWindup=this.config.pulse.proximityWindup-this.pulseWarningElapsed;this.onWindup();}return false;}this.pendingPulseId=null;this.pulseWarningElapsed=0;this.pulseCooldown=this.config.pulse.proximityCooldown;this.proximityWindup=null;this.effects?.impact(this.root.position.clone().add(new THREE.Vector3(0,2,0)),'#ffb968',4);const core=this.config.core.locations[this.state.coreIndex].position;this.waves.push({id,age:0,previousAge:0,hitPlayers:new Set(),angle:Math.atan2(core[0],core[2])});}
 updateProximityPulse(dt,stunned){this.pulseCooldown=Math.max(0,this.pulseCooldown-dt);if(this.dead||stunned||!this.state.pulseEligible){this.proximityWindup=null;this.pendingPulseId=null;this.pulseWarningElapsed=0;return;}if(this.state.phase!=='barrage'&&this.pendingPulseId===null)return;if(this.pulseCooldown>0)return;if(this.proximityWindup===null){this.proximityWindup=this.config.pulse.proximityWindup;this.onEvent('PULSE CHARGING · Move away or thread the cyan gap.');this.onWindup();}this.proximityWindup=Math.max(0,this.proximityWindup-dt);if(this.proximityWindup<=0){const id=this.pendingPulseId??('proximity-'+(++this.reactivePulses));this.addWave(id);}}
 checkWaves(player,previous){if(this.dead||player.phased)return;const c=this.config.pulse,body=this.onBody(player),current=this.root.worldToLocal(new THREE.Vector3().copy(player.position)),last=this.root.worldToLocal(new THREE.Vector3().copy(previous)),scale=this.config.body.height/40,key=player.entity||player.motion||player;for(const w of this.waves){if(w.hitPlayers?.has(key))continue;for(let i=0;i<=c.sweepSamples;i++){const t=i/c.sweepSamples,point=last.clone().lerp(current,t),radius=Math.hypot(point.x,point.z),angle=Math.atan2(point.x,point.z),gap=angleDistance(angle,w.angle)<c.gapHalfAngle,age=THREE.MathUtils.lerp(w.previousAge??w.age,w.age,t),distance=point.length()*scale,front=Math.min(c.maxRadius,age*c.surfaceSpeed),sphere=point.y>=0&&distance<=front+c.surfaceWidth/2&&distance>=front-c.surfaceWidth/2-c.surfaceSpeed*c.linger,surface=body&&point.y*scale<=age*c.surfaceSpeed+c.surfaceWidth/2&&point.y*scale>=age*c.surfaceSpeed-c.surfaceWidth/2-c.surfaceSpeed*c.linger,ground=point.y<=c.groundHitHeight&&radius<=Math.min(c.maxRadius,age*c.groundSpeed+c.groundWidth/2)&&radius>=age*c.groundSpeed-c.groundWidth/2-c.groundSpeed*c.linger;if(!(sphere||surface||ground))continue;if(gap){if((body||!c.gapRequiresBody)&&this.state.awardGap())this.onEvent('PULSE GAP THREADED · attack recovery extended.');}else{w.hitPlayers??=new Set();w.hitPlayers.add(key);const origin=this.root.position.clone(),torso=player.position.clone().addScaledVector(new THREE.Vector3().copy(player.motion.normal),this.config.projectiles.collisionHeight);if(!absorbDirectionalBarrier(player.entity,origin,torso,c.damage))this.playerHit(player.position,c.damage,{kind:'pulse',origin,knockback:c.knockback});break;}}}}

 safePaths(){const p=this.config.core.locations[this.state.coreIndex].position,sign=Math.sign(p[2]),height=this.config.projectiles.collisionHeight,wall=Math.abs(p[2])+height,near=[p[0],height+.08,sign*wall],l=Math.hypot(p[0],p[2]),far=[p[0]/l*this.config.barrage.safeStartRadius,height+.08,p[2]/l*this.config.barrage.safeStartRadius];return{safe:[far,near,[p[0],p[1],sign*wall]],greedy:[[-p[0],this.config.barrage.greedyEntryHeight,sign*wall],[-p[0],p[1],sign*wall],[p[0],p[1],sign*wall]]};}
 routeAt(position){const p=new THREE.Vector3().copy(position).sub(this.root.position);return(p.z>=0?'front-':'back-')+(p.x<0?'left':'right');}
 onBody(player){return player.motion?.support?.building==='bastion'&&player.motion.mode!=='air'||!!traceImpact(player.position,player.position,{sections:this.sections,ground:false,radius:this.config.traversal.surfaceContactRadius});}
 updateWorld(dt,time,player){this.perceptionTime+=dt;this.player=player;if(this.dead){this.updateDeath(dt,time);return;}const aware=!player.entity||this.isAlertedTo(player.entity)||inFrontOfEnemy(this.root,player.position);
  if(aware)this.lastObserved=player.position.clone();
  if(!this.lastObserved){this.model.animate(dt,time,this.root.localToWorld(new THREE.Vector3(0,28,50)),true,this.state,false);this.sync();return;}
  if(!aware){player={position:this.lastObserved,motion:{mode:'air',normal:{x:0,y:1,z:0}}};this.player=player;}
  this.state.pulseEligible=aware&&this.canPulse()&&this.pulseCooldown<=0;this.hitCooldown=Math.max(0,this.hitCooldown-dt);this.model.animate(dt,time,player.position,this.dead||(this.config.body.pauseTurnAtGroundContact&&player.motion?.mode==='ground'&&this.onBody(player)),this.state,this.stunRemaining>0);const wasStunned=this.stunRemaining>0;if(this.pulseCharging)this.pulseWarningElapsed+=dt;else this.pulseWarningElapsed=0;this.updateProximityPulse(dt,wasStunned||!aware);this.stunRemaining=Math.max(0,this.stunRemaining-dt);if(!wasStunned&&(aware||this.state.exposed)){const events=this.state.step(dt);for(const e of events){if(e.type==='windup'&&this.state.pulseEligible){this.onEvent('PULSE CHARGING · Leave the body, or thread the cyan gap.');this.onWindup();}if(e.type==='wave')this.addWave?.(e.id);if(e.type==='barrage'){this.onEvent('BASTION ATTACK · '+this.state.patterns.join(' + '));if(this.state.patterns.includes('beam-wall'))this.beamWalls.begin();else if(this.state.patterns.includes('skyfall'))this.rain.begin();else this.projectiles?.beginBarrage();}}}for(const w of this.waves){w.previousAge=w.age;w.age+=dt;}const p=this.config.pulse;this.waves=this.waves.filter(w=>w.age<Math.max(p.maxRadius/p.groundSpeed,this.config.body.height/p.surfaceSpeed)+p.linger+p.groundWidth/p.groundSpeed);this.projectiles?.update(wasStunned?0:dt,time,player);this.rain?.update(wasStunned?0:dt,time);this.beamWalls?.update(wasStunned?0:dt);this.effects?.update(dt,time);this.paint(time);this.sync();}
 afterPlayer(dt,player,previous){if(this.dead)return;this.player=player;const attached=this.onBody(player);this.state.trackRoute(attached?this.routeAt(player.position):null,dt);this.checkWaves?.(player,previous);this.beamWalls?.checkPlayer(player,previous);this.projectiles?.checkPlayer(player,previous);this.effects?.sphericalPulse.updateBarrier();this.model.capture(player.motion);}
 playerHit(point,power,impact=null){if((this.hitCooldown>0&&impact?.kind!=='pulse')||this.player?.phased||this.player?.entity?.isDamageProtected?.()||this.dead)return false;this.hitCooldown=this.config.pulse.hitInterval;this.state.hitsTaken++;this.state.damageTaken+=power;this.onPlayerHit(point,power,impact);return true;}
 trace(a,b,radius=0,{sectionsOnly=false}={}){if(sectionsOnly)return traceImpact(a,b,{sections:this.sections,ground:false,radius});let hit=traceImpact(a,b,{targets:this.combatUnit.alive?[this.combatUnit]:[],ground:false,radius});const orb=this.projectiles?.trace(a,b,radius);if(orb&&(!hit||orb.t<hit.t))hit=orb;return hit;}
 get pulseCharging(){return !this.dead&&this.stunRemaining<=0&&this.canPulse()&&(this.proximityWindup!==null||this.state.phase==='windup'&&this.pulseCooldown<=0);}
 paint(time){const warning=this.pulseCharging,c=this.config.pulse,flash=.12+c.warningIntensity*(.5+.5*Math.sin(time*Math.PI*2*c.warningHz))**2;for(const {id,patch} of this.model.routePatches)patch.visible=id===this.state.markedRoute;for(const p of this.model.weakPoints){const i=p.id==='arm-left'?0:p.id==='arm-right'?1:-1;p.group.visible=!this.dead&&(i<0||this.armsHealth[i]>0);const fraction=i<0?this.combatUnit.health/this.combatUnit.maxHealth:this.armsHealth[i]/this.config.weakPoints.armHealth;for(const bar of p.bars)bar.scale.x=p.size[0]*.75*fraction;p.material.emissiveIntensity=1.7+Math.sin(time*5)*.25;if(i>=0)p.material.color.set(this.armsHealth[i]/this.config.weakPoints.armHealth<.4?'#ff5542':'#ffb15e');}
  for(const p of this.model.parts){let marked=false;if(this.state.markedRoute){const left=this.state.markedRoute.includes('left');marked=p.id.includes(left?'left-':'right-');}p.material.emissive.set(warning?c.warningColor:marked?this.config.routes.warningColor:'#000000');p.material.emissiveIntensity=warning?flash:marked?.8:0;}for(const id of['armour','light','dark','gold']){const m=this.model.art.materials[id];m.emissive.set(warning?c.warningColor:'#000000');m.emissiveIntensity=warning?flash:0;}}
 diagnostics(){return{deathAnimationSeconds:this.deathPose?.age??null,pulseCharging:this.pulseCharging,...this.state.diagnostics(),pulseCooldown:this.pulseCooldown,proximityWindup:this.proximityWindup,reactivePulses:this.reactivePulses,armHealth:[...this.armsHealth],weakPoints:this.model.weakPoints.map(p=>({id:p.id,position:this.model.weakPointPosition(p.id).toArray(),active:p.group.visible})),health:this.combatUnit.health,maxHealth:this.combatUnit.maxHealth,coreOpen:this.coreOpen,stunned:this.stunRemaining,feedback:this.feedback,projectiles:this.projectiles?.diagnostics()||{},bodyHeight:this.config.body.height,model:this.model.art.diagnostics(),rain:this.rain?.diagnostics()||{},beamWalls:this.beamWalls?.diagnostics()||{},pulseEffect:this.effects?.sphericalPulse.diagnostics()||{}};}
}
