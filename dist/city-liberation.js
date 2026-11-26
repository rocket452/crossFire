import * as THREE from './vendor/three.module.js';
import {MissionEnemyWaves} from './mission-enemy-waves.js?v=421';
import {HeroEvolutionCombat} from './liberation-evolutions.js';
import {LiberationBuild} from './liberation-build.js?v=435';
import {EvacuationNavigation} from './evacuation-navigation.js?v=evacuation-57';
import {escortMovementBounds} from './evac-approach.js?v=315';

export const DISTRICTS=[
 {seconds:425,gap:16,cap:8,packs:['BB','BD','BBD'],boss:'Siege Walker'},
 {seconds:490,gap:12,cap:15,packs:['BDD','BBBD','BBDD'],boss:'Bastion'}
];
const position=p=>new THREE.Vector3().copy(p);
const streetStep=24;
const entryBounds=escortMovementBounds(8);
const streetAxis=(min,max)=>Array.from(
 {length:Math.floor(max/streetStep)-Math.ceil(min/streetStep)+1},
 (_,i)=>(Math.ceil(min/streetStep)+i)*streetStep
);
const streetX=streetAxis(entryBounds.minX,entryBounds.maxX);
const streetZ=streetAxis(entryBounds.minZ,entryBounds.maxZ);
const walkerHomeZ=48;


export class CityLiberation extends MissionEnemyWaves {
 constructor(scene,damage,options){
  super(scene,damage,{...options,formationSize:8});
  this.options=options;this.damage=damage;
  this.actors=[...this.members,...this.flightDrones];
  this.navigation=new EvacuationNavigation({isClear:(a,b)=>options.bruiser.isPathClear(
   new THREE.Vector3(a.x,.12,a.z),new THREE.Vector3(b.x,.12,b.z)
  )});
  this.navigation.nodes=streetX.flatMap(x=>streetZ.map(z=>new THREE.Vector3(x,.12,z)));
  this.reset();
 }
 reset(){
  if(this.hero)for(const object of [this.hero,this.hero.motion,this.hero.storm,this.hero.shuriken,this.hero.energy])if(object&&typeof object==='object')delete object.liberation;
  this.combat=null;this.menu=null;
  super.reset();
  this.stage=0;this.elapsed=0;this.stageTime=0;this.nextPack=1;this.pack=0;this.phase='briefing';
  this.hero=null;this.build=null;this.retired=new Map();
  const walker=this.options.walker;
  walker.dead=true;walker.root.visible=false;walker.combatUnit.alive=false;walker.combatUnit.shapes=[];
  this.nextScan=0;this.stragglers=new Map();this.options.ui.reset();
 }
 start(id,hero){
  this.hero=hero;this.build=new LiberationBuild(id);this.phase='streets';
  if(id==='volt')hero.energy.amount=75;
  this.combat=new HeroEvolutionCombat(this);
  for(const object of [hero,hero.motion,hero.storm,hero.shuriken,hero.energy])if(object&&typeof object==='object')object.liberation=this.combat;
  this.options.ui.bind?.(this);
  this.options.ui.sync(this);
 }
 get ended(){return this.phase==='lost'||this.phase==='won';}
 get upgradePending(){return !!(this.menu||this.build?.rewards.length)&&!this.ended;}
 get district(){return DISTRICTS[this.stage];}
 hitHero(power){
  if(!this.hero||this.ended||this.phase==='cleared'||this.upgradePending)return false;
  const result=this.build.hurt(Math.min(45,power??12));
  if(result)this.combat.events.emit(result==='ward'?'shielded':'damageReceived',{power,result});
  if(result==='ward'){
   const p=this.hero.root.position;this.options.ring(p,3,'#9eeeff');
   for(const target of this.nearby(p,36).slice(0,4))this.combat.bolt(p,target,80,null,'Phase Buffer');
  }
  if(this.build.hp<=0){this.phase='lost';this.options.ui.sync(this);}
  return result===true;
 }
 attackPower(hit,power,kind){return this.combat?.before(hit,power,kind)??power;}
 onHit(hit,amount){this.combat?.after(hit,amount);}
 nearby(origin,radius,exclude){
  const units=[...this.actors.map(a=>a.combatUnit),...(this.options.bossUnits?.()||[])];
  const hits=[];
  for(const unit of new Set(units)){
   if(!unit?.alive||unit.entity===exclude||unit.hidden||unit.entity.dead)continue;
   let best=null;
   for(const shape of unit.shapes){
    const point=position(shape.center),distance=point.distanceToSquared(origin);
    if(distance>radius*radius||best&&distance>=best.distance)continue;
    if(unit.entity.armsHealth&&shape.part!=='chest'&&!(this.combat.partHP({unit,part:shape.part})>0))continue;
    const weapon=unit.entity.weapons?.forPart(shape.part);
    if(unit.entity.weapons&&(!weapon||weapon.destroyed))continue;
    if(!this.options.visible(origin,point))continue;
    best={unit,actor:unit.entity,point,part:shape.part,distance};
   }
   if(best)hits.push(best);
  }
  return hits.sort((a,b)=>a.distance-b.distance);
 }
 chainTargets(origin,radius,hit){
  const normal=this.nearby(origin,radius,hit.unit.entity);
  const e=hit.unit.entity;
  if(!e.weapons&&!e.armsHealth&&!e.engines)return normal;
  const parts=new Map();
  for(const shape of hit.unit.shapes){
   if(!shape.part||shape.part===hit.part||this.combat.partHP({unit:hit.unit,part:shape.part})<=0||
    this.combat.partHP({unit:hit.unit,part:shape.part})===undefined)continue;
   const point=position(shape.center),distance=point.distanceToSquared(origin);
   if(distance<=radius*radius&&(!parts.has(shape.part)||parts.get(shape.part).distance>distance)&&this.options.visible(origin,point))
    parts.set(shape.part,{unit:hit.unit,actor:e,part:shape.part,point,distance});
  }
  return normal.concat([...parts.values()]).sort((a,b)=>a.distance-b.distance);
 }
 collect(){
  for(const actor of this.actors){
   const u=actor.combatUnit;
   if(!u||!actor.spawned||this.retired.has(actor)||(!actor.dead&&u.alive))continue;
   this.retired.set(actor,this.elapsed);const hp=this.build.hp,shield=this.build.shield;this.build.reward(this.flightDrones.includes(actor));
   if(this.build.hp>hp)this.combat.events.emit('heal',{amount:this.build.hp-hp});
   if(this.build.shield>shield)this.combat.events.emit('shieldGained',{amount:this.build.shield-shield});

  }
 }
 streetSpawns(){
  const {minX,maxX,minZ,maxZ}=entryBounds,hero=this.hero.root.position;
  const edgePoints=[
   ...streetX.flatMap(x=>[[x,minZ],[x,maxZ]]),
   ...streetZ.flatMap(z=>[[minX,z],[maxX,z]])
  ];
  const spots=[];
  for(const [x,z] of edgePoints){
   const distance=Math.hypot(x-hero.x,z-hero.z);
   if(distance<18)continue;
   const point=new THREE.Vector3(x,.12,z);
   if(!this.options.openStreet(point))continue;
   if(this.actors.some(actor=>actor.spawned&&!actor.dead&&Math.hypot(
    x-actor.root.position.x,z-actor.root.position.z
   )<7))continue;
   const clear=this.options.visible(new THREE.Vector3(x,2,z),hero.clone().add(new THREE.Vector3(0,1,0)));
   spots.push({point,score:distance+(clear?0:30)});
  }
  return spots.sort((a,b)=>a.score-b.score).map(spot=>spot.point);
 }
 groundApproach(actor,start,rally){
  this.navigation.landing=rally;
  const path=this.navigation.route(start);
  if(!path)return null;
  const route=path.map(([x,z])=>new THREE.Vector3(x,.12,z));
  let next=0;
  return ()=>{
   const target=actor.target?.shapes[0]?.center;
   if(target){
    const feet=new THREE.Vector3(target.x,.12,target.z);
    if(this.navigation.isClear(actor.root.position,feet))return feet;
   }
   while(next<route.length&&actor.root.position.distanceToSquared(route[next])<=2.25)next++;
   return route[next]||rally;
  };
 }
 droneIngress(start,rally,altitude){
  const dx=rally.x-start.x,dz=rally.z-start.z,distanceSquared=dx*dx+dz*dz;
  let height=altitude;
  for(const building of this.options.buildings||[]){
   const t=distanceSquared?THREE.MathUtils.clamp(((building.x-start.x)*dx+(building.z-start.z)*dz)/distanceSquared,0,1):0;
   const clearance=(building.footprint??10)/Math.SQRT2+6;
   if(Math.hypot(building.x-start.x-t*dx,building.z-start.z-t*dz)<clearance)height=Math.max(height,building.floors*3+9);
  }
  return new THREE.Vector3(rally.x,height,rally.z);
 }
 recycleStragglers(){
  // Unseen packs left across town should not consume all reinforcement slots.
  for(const actor of this.actors){
   if(!actor.spawned||actor.dead||(actor.age??actor.clock)<30||actor.root.position.distanceToSquared(this.hero.root.position)<100**2){
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
  const origin=streets[0],hero=this.hero.root.position;
  const rally=this.navigation.nodes.filter(p=>this.options.openStreet(p))
   .sort((a,b)=>a.distanceToSquared(hero)-b.distanceToSquared(hero))[0];
  if(!rally)return;
  streets.sort((a,b)=>a.distanceToSquared(origin)-b.distanceToSquared(origin));
  for(const type of pattern){
   if(slots<=0)break;
   const air=type==='D',pool=air?this.flightDrones:this.members;
   const actor=pool.find(a=>!a.spawned)||pool.find(a=>this.elapsed-(this.retired.get(a)??Infinity)>6&&(!air||a.mode==='wreck'));
   if(!actor)continue;
   let p=streets.shift(),approach;
   if(!air){
    while(p&&!(approach=this.groundApproach(actor,p,rally)))p=streets.shift();
   }
   if(!p)break;
   this.retired.delete(actor);this.combat.status.delete(actor.combatUnit);
   if(air){
    const altitude=this.drones.find(d=>d.actor===actor).start.y;
    const ingress=this.droneIngress(p,rally,altitude);
    actor.options.ingress=ingress;
    actor.options.cruiseAltitude=altitude;
    p.y=ingress.y;actor.spawn(p);
   }else{
    actor.objective=approach;
    actor.spawnPosition=p;actor.reset();
    const first=actor.objective();
    actor.root.rotation.y=Math.atan2(first.x-p.x,first.z-p.z);
    actor.spawn();actor.cooldown=1.2;
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
   walker.spawnOrigin={x:0,z:entryBounds.maxZ};walker.reset({yaw:Math.PI});walker.root.visible=true;
   walker.applyWalkPose(walker.walkPose);
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
  const b=this.build;b.tick(dt);this.combat.step(dt);
  this.bruisers.update(dt,time);
  const targets=this.getTargets();
  for(const actor of this.flightDrones)if(actor.spawned)actor.update(dt,targets);
  if(this.ended)return;
  this.collect();
  if(this.stage===0&&this.phase==='boss'&&!this.options.walker.dead){
   const origin=this.options.walker.spawnOrigin;
   origin.z=Math.max(walkerHomeZ,origin.z-dt*4);
  }
  if(this.phase==='streets'&&this.stageTime>=this.district.seconds)this.boss();
  if(this.phase==='boss'&&(this.stage===0?this.options.walker.dead:this.options.finalBossDefeated())){
   b.bossReward(this.stage===1);
   if(this.stage===1){
    this.clearedAt=this.elapsed;this.phase='cleared';

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
