import * as THREE from './vendor/three.module.js';
import {MissionEnemyWaves} from './mission-enemy-waves.js?v=397';
import {LiberationBuild} from './liberation-build.js?v=398';
import {escortMovementBounds} from './evac-approach.js?v=315';

export const DISTRICTS=[
 {seconds:115,gap:13,cap:7,packs:['BB','BD','BBD'],boss:'Siege Walker'},
 {seconds:135,gap:9,cap:12,packs:['BDD','BBBD','BBDD'],boss:'Bastion'}
];
const position=p=>new THREE.Vector3().copy(p);
const streetStep=24;
const clearanceKey='zero-hour.city-liberation.clearance';
export const CLEARANCE_CREDITS=12;

export class CityLiberation extends MissionEnemyWaves {
 constructor(scene,damage,options){
  super(scene,damage,{...options,formationSize:8});
  this.options=options;this.damage=damage;this.clearance=false;
  try{this.clearance=options.storage?.getItem(clearanceKey)==='1';}catch{}
  this.actors=[...this.members,...this.flightDrones];
  for(const unit of this.members)unit.objective=()=>this.hero.root.position.clone();
  this.reset();
 }
 reset(){
  super.reset();
  this.stage=0;this.elapsed=0;this.stageTime=0;this.nextPack=1;this.pack=0;this.phase='briefing';
  this.hero=null;this.build=null;this.nextHitFX=0;this.retired=new Map();this.lastDash=0;this.wasDashing=false;
  const walker=this.options.walker;
  walker.dead=true;walker.root.visible=false;walker.combatUnit.alive=false;walker.combatUnit.shapes=[];
  this.nextScan=0;this.stragglers=new Map();this.options.ui.reset();
 }
 start(id,hero){
  this.hero=hero;this.build=new LiberationBuild(id);this.phase='streets';
  if(this.clearance){
   this.build.credits=CLEARANCE_CREDITS;this.clearance=false;
   try{this.options.storage?.removeItem(clearanceKey);}catch{}
  }
  if(id==='volt')hero.energy.amount=75;
  this.lastDash=this.dash.dashes;
  this.options.ui.sync(this);
 }
 get dash(){return this.hero.dash||this.hero.motion;}
 get ended(){return this.phase==='lost'||this.phase==='won';}
 get upgradePending(){return !!this.build?.rewards.length&&!this.ended;}
 get district(){return DISTRICTS[this.stage];}
 hitHero(power){
  if(!this.hero||this.ended||this.phase==='cleared'||this.upgradePending)return false;
  const result=this.build.hurt(Math.min(45,power??12));
  if(result==='ward')this.options.ring(this.hero.root.position,3,'#9eeeff');
  if(this.build.hp<=0){this.phase='lost';this.options.ui.sync(this);}
  return result===true;
 }
 attackPower(hit,power,kind){
  if(!this.hero||!hit.unit||!hit.point)return power;
  const motion=this.hero.motion.body||this.hero.motion;
  return power*this.build.multiplier({distance:this.hero.root.position.distanceTo(hit.point),speed:motion.speed,
   healthFraction:hit.unit.health/hit.unit.maxHealth,part:hit.part,kind});
 }
 nearby(origin,radius,exclude){
  return this.actors.filter(a=>a!==exclude&&a.combatUnit?.alive&&!a.dead)
   .map(actor=>({actor,point:actor.combatUnit.shapes[0]?.center}))
   .filter(t=>t.point&&origin.distanceToSquared(t.point)<=radius*radius&&this.options.visible(origin,t.point))
   .sort((a,b)=>origin.distanceToSquared(a.point)-origin.distanceToSquared(b.point));
 }
 field(origin,radius,power,exclude,color){
  this.options.ring(origin,radius,color);
  for(const {actor,point} of this.nearby(origin,radius,exclude))this.damage.hurt(actor.combatUnit,power,point,'hull');
 }
 onHit(hit,amount){
  const b=this.build;
  if(!b||!hit.unit||amount<=0)return;
  if(b.ranks.size&&b.time>=this.nextHitFX){
   const radius=Math.min(3,.7+b.ranks.size*.18+amount*.006);
   this.options.ring(hit.point,radius,'#95eaff');
   this.nextHitFX=b.time+.26;
  }
  if(!b.value('echo')||b.time<b.arcAt)return;
  const origin=position(hit.point),target=this.nearby(origin,20+b.value('reach'),hit.unit.entity)[0];
  if(!target)return;
  b.arcAt=b.time+1.2;
  this.damage.hurt(target.actor.combatUnit,b.value('echo'),target.point,'hull');
  this.options.arc(origin,target.point);
 }
 collect(){
  for(const actor of this.actors){
   const u=actor.combatUnit;
   if(!u||!actor.spawned||this.retired.has(actor)||(!actor.dead&&u.alive))continue;
   this.retired.set(actor,this.elapsed);this.build.reward(this.flightDrones.includes(actor));
   if(this.build.value('burst'))this.field(actor.root.position,12+this.build.value('reach'),this.build.value('burst'),actor,'#78ffd8');
  }
 }
 streetSpawns(){
  const hero=this.hero.root.position,bounds=escortMovementBounds(8),spots=[];
  for(let x=Math.ceil(bounds.minX/streetStep)*streetStep;x<=bounds.maxX;x+=streetStep){
   for(let z=Math.ceil(bounds.minZ/streetStep)*streetStep;z<=bounds.maxZ;z+=streetStep){
    const distance=Math.hypot(x-hero.x,z-hero.z);
    if(distance<18||distance>65)continue;
    const p=new THREE.Vector3(x,.12,z);
    if(!this.options.openStreet(p))continue;
    const clear=this.options.visible(new THREE.Vector3(x,2,z),hero.clone().add(new THREE.Vector3(0,1,0)));
    spots.push({p,score:Math.abs(distance-30)+Math.random()*14+(clear?0:30)});
   }
  }
  return spots.sort((a,b)=>a.score-b.score).map(s=>s.p);
 }
 recycleStragglers(){
  // Unseen packs left across town should not consume all reinforcement slots.
  for(const actor of this.actors){
   if(!actor.spawned||actor.dead||actor.root.position.distanceToSquared(this.hero.root.position)<100**2){
    this.stragglers.delete(actor);continue;
   }
   const since=this.stragglers.get(actor);
   if(since===undefined)this.stragglers.set(actor,this.elapsed);
   else if(this.elapsed-since>=10&&!this.options.visible(actor.root.position,this.hero.root.position)){
    actor.reset();this.stragglers.delete(actor);
   }
  }
 }
 spawnPack(){
  const config=this.district,pattern=config.packs[this.pack%config.packs.length];
  let slots=config.cap-this.actors.filter(a=>a.spawned&&!a.dead).length;
  if(slots<=0)return;
  const streets=this.streetSpawns();
  if(!streets.length)return;
  const origin=streets[0];
  streets.sort((a,b)=>a.distanceToSquared(origin)-b.distanceToSquared(origin));
  for(const type of pattern){
   if(slots<=0)break;
   const air=type==='D',pool=air?this.flightDrones:this.members;
   const actor=pool.find(a=>!a.spawned)||pool.find(a=>this.elapsed-(this.retired.get(a)??Infinity)>6&&(!air||a.mode==='wreck'));
   if(!actor)continue;
   const p=streets.shift();if(!p)break;
   this.retired.delete(actor);
   if(air){
    p.y=this.drones.find(d=>d.actor===actor).start.y;
    actor.options.ingress=null;actor.spawn(p);
   }else{
    actor.spawnPosition=p;actor.reset();actor.spawn();actor.cooldown=1.2;
   }
   const u=actor.combatUnit;
   u.maxHealth=u.health=Math.ceil(u.maxHealth*(this.stage===0?.7:1));
   slots--;
  }
  this.pack++;
 }
 boss(){
  this.phase='boss';
  if(this.stage===0){
   const walker=this.options.walker;
   walker.spawnOrigin={x:0,z:48};walker.reset();walker.root.visible=true;
   walker.combatUnit.alive=true;walker.combatUnit.health=walker.combatUnit.maxHealth;
   walker.combatUnit.shapes=walker.shapes();this.options.startArsenal();
  }
  this.onEvent(this.district.boss+' inbound.');
 }
 update(dt,time){
  if(!this.build||this.ended||this.upgradePending)return;
  this.time=time;this.elapsed+=dt;this.stageTime+=dt;
  if(this.phase==='cleared'){
   if(this.elapsed-this.clearedAt>=5)this.phase='won';
   this.options.ui.sync(this);return;
  }
  const b=this.build,dash=this.dash;b.tick(dt);
  if(this.wasDashing&&!dash.active)b.safeUntil=Math.max(b.safeUntil,b.time+b.value('afterimage'));
  this.wasDashing=!!dash.active;
  dash.cooldown=Math.max(0,dash.cooldown-dt*b.value('recovery'));
  if(dash.dashes!==this.lastDash){
   this.lastDash=dash.dashes;
   if(b.value('pulse'))this.field(this.hero.root.position.clone().add(new THREE.Vector3(0,1,0)),10+b.value('reach'),b.value('pulse'),null,'#79dfff');
  }
  this.bruisers.update(dt,time);
  const targets=this.getTargets();
  for(const actor of this.flightDrones)if(actor.spawned)actor.update(dt,targets);
  if(this.ended)return;
  this.collect();
  if(this.phase==='streets'&&this.stageTime>=this.district.seconds)this.boss();
  if(this.phase==='boss'&&(this.stage===0?this.options.walker.dead:this.options.finalBossDefeated())){
   b.bossReward(this.stage===1);
   if(this.stage===1){
    this.clearedAt=this.elapsed;this.phase='cleared';this.clearance=true;
    try{this.options.storage?.setItem(clearanceKey,'1');}catch{}
   }
   else{this.stage++;this.stageTime=0;this.pack=0;this.phase='streets';this.nextPack=this.elapsed+4;}
  }
  if(this.elapsed>=this.nextScan){this.recycleStragglers();this.nextScan=this.elapsed+1;}
  if(this.elapsed>=this.nextPack&&this.phase!=='cleared'){
   this.spawnPack();this.nextPack=this.elapsed+this.district.gap*(this.phase==='boss'?1.8:1)-Math.min(3,this.stageTime/45);
  }
  this.options.ui.sync(this);
 }
}
