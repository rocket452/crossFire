import * as THREE from './vendor/three.module.js';
import {MissionEnemyWaves} from './mission-enemy-waves.js?v=478';
import {HeroEvolutionCombat} from './liberation-evolutions.js?v=439';
import {LiberationBuild} from './liberation-build.js?v=476';
import {AstraRonin} from './astra-ronin.js?v=474';
import {Pyroclast} from './pyroclast.js?v=476';
import {PYROCLAST} from './pyroclast-config.js?v=461';
import {EvacuationNavigation} from './evacuation-navigation.js?v=evacuation-57';
import {escortMovementBounds} from './evac-approach.js?v=315';

export const DISTRICTS=[
 {seconds:600,gap:16,cap:8,packs:['BB','BD','BBD'],boss:'Siege Walker'},
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
// Kage's dash takes this share of a Bruiser's or drone's max health here (bosses keep the full hit).
export const LIBERATION_KAGE_DASH_FRACTION=.5;
// Hero this close to the district centre: every edge counts as the far side, deepest by distance.
// Spawn edges must lie at least this share of the deepest edge's distance past the centre; packs step
// round the far side by FAR_SIDE_STRIDE edges so consecutive packs arrive from different streets.
const FAR_SIDE_CENTRE=12,FAR_SIDE_DEPTH=.35,FAR_SIDE_STRIDE=3;
// Ground reinforcements cross town at a travel pace, easing to their combat walk inside the engagement band.
export const LIBERATION_APPROACH=Object.freeze({travelSpeed:7,engage:50,blend:35});
// Ground enemies sense a hero this close in any direction (not only ahead of them), and while approaching they
// re-plan their street route toward the hero's current position when the hero has moved this far from their goal.
export const LIBERATION_AWARENESS=Object.freeze({radius:70,replanSeconds:2.5,drift:24});
// A far straggler is recycled only after ten unseen seconds without closing this many metres.
const STRAGGLER_PROGRESS=8;
// District 1 plays as two stages (district seconds). Stage 1, Build your foundation: a small introduction,
// the first elite, the first power-up, then an enemy surge. Stage 2, Build your identity: a mini-boss, picked at
// random between the Astra Ronin and Pyroclast, a second power-up, more streets, then the Siege Walker (never
// while the mini-boss lives).
export const LIBERATION_STAGES=Object.freeze({
 stage2:300,
 intro:{gap:15,cap:5,packs:['B','BD','BB']},
 elite:{at:85,health:5,scale:1.45,kageDashFraction:.12,tint:'#ffb020'},
 surge:{count:12,gap:1.6,cap:14,packs:['BBB','BDB','BBD','BBB'],until:75},
 miniboss:{at:315,kinds:['ronin','pyroclast'],trickle:{gap:24,cap:3,packs:['B','D']}},
 // Mini-boss tuning for City Liberation's 120 HP heroes (Combat Testing keeps the full RONIN values).
 ronin:{health:2600,swordDamage:16,overheadDamage:24,dashDamage:22,waveDamage:12,initialDelay:2.5,guardInitialDelay:6,flightStartRange:90},
 // Pyroclast: fireball 14, tornado 14 per tick, meteor 14 (finale 28) after heroPowerScale.
 pyroclast:{health:2600,heroPowerScale:14,openingDelay:3}
});
const clock=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');


export class CityLiberation extends MissionEnemyWaves {
 constructor(scene,damage,options){
  super(scene,damage,{...options,formationSize:8});
  this.options=options;this.damage=damage;
  this.actors=[...this.members,...this.flightDrones];
  this.navigation=new EvacuationNavigation({isClear:(a,b)=>options.bruiser.isPathClear(
   new THREE.Vector3(a.x,.12,a.z),new THREE.Vector3(b.x,.12,b.z)
  )});
  this.navigation.nodes=streetX.flatMap(x=>streetZ.map(z=>new THREE.Vector3(x,.12,z)));
  for(const actor of this.members){
   const senses=actor.sensesHero.bind(actor);
   actor.sensesHero=unit=>senses(unit)||!!unit.shapes?.[0]&&actor.root.position.distanceTo(unit.shapes[0].center)<=LIBERATION_AWARENESS.radius;
  }
  // Stage 2 mini-bosses. The Astra Ronin is bounded to the district and navigates its street grid.
  this.ronin=new AstraRonin(scene,damage,{...options.bruiser,id:'liberation-astra-ronin',hunter:true,config:LIBERATION_STAGES.ronin,getTargets:options.getTargets,
   getBuildings:()=>options.buildings||[],onBuildingStrike:options.onRoninBuildingStrike,isMireguardPathClear:options.roninPathClear,energyEffects:this.bruisers.energyEffects,
   arena:{movementBounds:entryBounds,dashBounds:entryBounds},navigationNodes:streetX.flatMap(x=>streetZ.map(z=>({x,z}))),onEvent:()=>{}});
  // Pyroclast flies over the district, kept inside its bounds; meteors and tornadoes land on the real rooftops/streets.
  const P=LIBERATION_STAGES.pyroclast;
  this.pyroclast=new Pyroclast(scene,damage,{getTargets:options.getTargets,trace:options.bruiser.trace,visible:options.visible,rainLanding:options.pyroclastGround,
   onImpact:options.onPyroclastImpact,onDeath:options.bruiser.onDeath,onEvent:()=>{},heroPowerScale:P.heroPowerScale},
   {...PYROCLAST,health:P.health,openingDelay:P.openingDelay,bounds:entryBounds});
  this.miniBosses={ronin:{actor:this.ronin,name:'Astra Ronin'},pyroclast:{actor:this.pyroclast,name:'Pyroclast'}};
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
  this.beat='intro';this.beatTime=0;this.elite=null;this.surgeLeft=0;this.surgeStart=0;this.miniBossKind=null;this.miniBossDown=false;this.ronin?.reset();this.pyroclast?.reset();
  for(const actor of this.bruiserPoolActors())this.setElite(actor,false);
 }
 start(id,hero){
  this.hero=hero;this.build=new LiberationBuild(id);this.phase='streets';this.build.levelHold=true;
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
  const units=[...this.actors.map(a=>a.combatUnit),...(this.options.bossUnits?.()||[]),this.miniBoss?.spawned?this.miniBoss.combatUnit:null];
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
   this.retired.set(actor,this.elapsed);const hp=this.build.hp,shield=this.build.shield;this.build.reward(this.flightDrones.includes(actor),!!actor.elite);
   if(actor===this.elite&&this.beat==='elite')this.firstPowerUp();
   if(this.build.hp>hp)this.combat.events.emit('heal',{amount:this.build.hp-hp});
   if(this.build.shield>shield)this.combat.events.emit('shieldGained',{amount:this.build.shield-shield});

  }
 }
 // Reinforcements enter on the opposite side of the district: street edges across the map centre from
 // the hero, so every pack crosses the city to reach them. Successive packs sweep around that far side.
 streetSpawns(){
  const {minX,maxX,minZ,maxZ}=entryBounds,hero=this.hero.root.position;
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,hx=hero.x-cx,hz=hero.z-cz,offCentre=Math.hypot(hx,hz);
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
   // How far past the centre this edge lies, measured away from the hero (any direction at the centre).
   const across=offCentre>FAR_SIDE_CENTRE?-((x-cx)*hx+(z-cz)*hz)/offCentre:distance;
   spots.push({point,across,bearing:Math.atan2(x-cx,z-cz)});
  }
  const deepest=Math.max(0,...spots.map(spot=>spot.across));
  const far=spots.filter(spot=>spot.across>0&&spot.across>=deepest*FAR_SIDE_DEPTH).sort((a,b)=>a.bearing-b.bearing);
  if(!far.length)return [];
  const first=far.splice(this.pack*FAR_SIDE_STRIDE%far.length,1)[0];
  return [first,...far].map(spot=>spot.point);
 }
 // Open street node nearest a point (open-street traces are cached for a second).
 rallyNear(point){
  if(!this.openNodes||this.elapsed>=this.openNodesAt){this.openNodes=this.navigation.nodes.filter(p=>this.options.openStreet(p));this.openNodesAt=this.elapsed+1;}
  let best=null,d=Infinity;for(const p of this.openNodes){const q=p.distanceToSquared(point);if(q<d){d=q;best=p;}}return best;
 }
 groundApproach(actor,start,rally){
  this.navigation.landing=rally;
  const path=this.navigation.route(start);
  if(!path)return null;
  let route=path.map(([x,z])=>new THREE.Vector3(x,.12,z)),next=0,goal=rally,replanAt=this.elapsed+LIBERATION_AWARENESS.replanSeconds;
  const objective=()=>{
   const target=actor.target?.shapes[0]?.center;
   if(target){
    const feet=new THREE.Vector3(target.x,.12,target.z);
    if(this.navigation.isClear(actor.root.position,feet))return feet;
   }
   // Gravitate toward the hero: follow them across the district instead of holding the old rally point.
   const hero=this.hero?.root.position;
   if(hero&&this.elapsed>=replanAt){
    replanAt=this.elapsed+LIBERATION_AWARENESS.replanSeconds;
    if(goal.distanceTo(hero)>LIBERATION_AWARENESS.drift){
     const fresh=this.rallyNear(hero);
     if(fresh&&fresh!==goal){this.navigation.landing=fresh;const p=this.navigation.route(actor.root.position);
      if(p){route=p.map(([x,z])=>new THREE.Vector3(x,.12,z));next=0;goal=fresh;objective.replans++;}}
    }
   }
   while(next<route.length&&actor.root.position.distanceToSquared(route[next])<=2.25)next++;
   return route[next]||goal;
  };
  objective.replans=0;objective.goal=()=>goal;
  return objective;
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
  // Unseen packs left across town should not consume all reinforcement slots. Units still closing on the
  // hero are left alone: only one that has made no headway for a while is recycled.
  for(const actor of this.actors){
   const distance=actor.root.position.distanceTo(this.hero.root.position);
   if(!actor.spawned||actor.dead||actor.elite||(actor.age??actor.clock)<30||distance<100){
    this.stragglers.delete(actor);continue;
   }
   const record=this.stragglers.get(actor);
   if(!record||distance<record.best-STRAGGLER_PROGRESS)this.stragglers.set(actor,{since:this.elapsed,best:distance});
   else if(this.elapsed-record.since>=10&&!this.options.visible(actor.root.position,this.hero.root.position)){
    actor.reset();this.stragglers.delete(actor);
   }
  }
 }
 paceApproach(){
  const {travelSpeed,engage,blend}=LIBERATION_APPROACH,hero=this.hero.root.position;
  for(const actor of this.members){
   if(!actor.spawned||actor.dead)continue;
   actor.walkSpeed??=actor.moveSpeed;
   const far=THREE.MathUtils.clamp((Math.hypot(actor.root.position.x-hero.x,actor.root.position.z-hero.z)-engage)/blend,0,1);
   actor.moveSpeed=actor.walkSpeed+(Math.max(actor.walkSpeed,travelSpeed)-actor.walkSpeed)*far;
  }
 }
 bruiserPoolActors(){return this.members||[];}
 // The Stage 1 elite: a larger, gold-lit Bruiser with five times the health that resists Kage's dash.
 setElite(actor,on){const E=LIBERATION_STAGES.elite;actor.elite=on;actor.root.scale.setScalar(on?E.scale:1);if(!on)return;
  const gold=new THREE.Color(E.tint);for(const s of actor.restMaterials||[]){s.m.color.lerp(gold,.22);if(s.m.emissive){s.m.emissive.set(gold);s.m.emissiveIntensity=Math.max(1.2,(s.intensity||1)*1.8);}}}
 spawnPack(config=this.district){
  const pattern=config.packs[this.pack%config.packs.length];let entered=0;
  let slots=config.cap-this.actors.filter(a=>a.spawned&&!a.dead).length;
  if(slots<=0)return 0;
  const streets=this.streetSpawns();
  if(!streets.length)return 0;
  const origin=streets[0],hero=this.hero.root.position;
  const rally=this.navigation.nodes.filter(p=>this.options.openStreet(p))
   .sort((a,b)=>a.distanceToSquared(hero)-b.distanceToSquared(hero))[0];
  if(!rally)return 0;
  streets.sort((a,b)=>a.distanceToSquared(origin)-b.distanceToSquared(origin));
  for(const type of pattern){
   if(slots<=0)break;
   const air=type==='D',pool=air?this.flightDrones:this.members;if(type==='E'&&this.elite?.spawned&&!this.elite.dead)continue;
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
    actor.spawnPosition=p;actor.reset();this.setElite(actor,type==='E');
    const first=actor.objective();
    actor.root.rotation.y=Math.atan2(first.x-p.x,first.z-p.z);
    actor.spawn();actor.cooldown=1.2;
   }
   const u=actor.combatUnit;
   u.maxHealth=u.health=Math.ceil(u.maxHealth*(this.stage===0?.7:1));
   u.kageDashFraction=LIBERATION_KAGE_DASH_FRACTION;
   if(type==='E'){u.maxHealth=u.health=Math.ceil(u.maxHealth*LIBERATION_STAGES.elite.health);u.kageDashFraction=LIBERATION_STAGES.elite.kageDashFraction;this.elite=actor;}
   slots--;entered++;
  }
  this.pack++;return entered;
 }
 // ---- stage director ------------------------------------------------------------------------------
 setBeat(beat){this.beat=beat;this.beatTime=0;}
 announce(title,subtitle){this.options.ui.announce?.(title,subtitle);this.onEvent(subtitle?title+' — '+subtitle:title);}
 // The mini-boss actor of this run (null until Stage 2 picks one).
 get miniBoss(){return this.miniBossKind?this.miniBosses[this.miniBossKind].actor:null;}
 get miniBossName(){return this.miniBossKind?this.miniBosses[this.miniBossKind].name:'';}
 get miniBossActive(){return this.beat==='miniboss'&&!!this.miniBoss?.spawned&&!this.miniBossDown;}
 // Compatibility with the first mini-boss checks.
 get roninDown(){return this.miniBossKind==='ronin'&&this.miniBossDown;}
 chooseMiniBoss(){const kinds=LIBERATION_STAGES.miniboss.kinds;return kinds[Math.floor(Math.random()*kinds.length)%kinds.length];}
 firstPowerUp(){this.build.releaseFirstPowerUp();this.setBeat('power-up');this.announce('FIRST POWER-UP','Choose one of three upgrades');}
 spawnElite(){this.setBeat('elite');const n=this.spawnPack({packs:['E'],cap:99});if(!n){this.beat='intro';return;}this.announce('ELITE INBOUND','Elite Bruiser');}
 startSurge(){const S=LIBERATION_STAGES.surge;this.setBeat('surge');this.surgeLeft=S.count;this.surgeStart=this.stageTime;this.nextPack=this.elapsed+1;this.announce('ENEMY SURGE','Test your new power against the crowd');}
 spawnMiniBoss(kind=this.chooseMiniBoss()){this.miniBossKind=kind;this.miniBossDown=false;
  const spot=this.streetSpawns()[0]||new THREE.Vector3(entryBounds.minX+12,.1,entryBounds.minZ+12);
  if(kind==='ronin'){const r=this.ronin;r.spawnPosition={x:spot.x,y:.1,z:spot.z};r.reset();r.spawn();}
  else this.pyroclast.spawn({x:spot.x,y:(this.options.pyroclastGround?.(spot.x,spot.z)?.y??0)+18,z:spot.z});
  this.setBeat('miniboss');this.announce('MINI-BOSS',this.miniBossName);}
 spawnRonin(){this.spawnMiniBoss('ronin');}
 // Which reinforcements flow during the current beat (null: none).
 spawnPlan(){const d=this.district,S=LIBERATION_STAGES;
  if(this.stage>0||this.phase==='boss')return{packs:d.packs,cap:d.cap,gap:d.gap*(this.phase==='boss'?1.8:1)-Math.min(3,this.stageTime/45)};
  switch(this.beat){
   case 'intro':return S.intro;
   case 'elite':case 'power-up':return null;
   case 'surge':return this.surgeLeft>0?S.surge:null;
   case 'miniboss':return S.miniboss.trickle;
   default:return{packs:d.packs,cap:d.cap,gap:d.gap-Math.min(3,this.stageTime/90)};
  }}
 updateStages(dt){const S=LIBERATION_STAGES,t=this.stageTime;this.beatTime+=dt;
  if(this.beat==='intro'&&t>=S.elite.at)this.spawnElite();
  else if(this.beat==='elite'&&this.elite&&!this.elite.spawned)this.firstPowerUp();
  else if(this.beat==='power-up'&&!this.upgradePending)this.startSurge();
  else if(this.beat==='surge'&&(this.surgeLeft<=0&&this.actors.filter(a=>a.combatUnit?.alive).length<=3||t-this.surgeStart>=S.surge.until))this.setBeat('hold');
  else if(this.beat==='hold'&&t>=S.stage2){this.setBeat('stage2');this.announce('STAGE 2','Build your identity');}
  else if(this.beat==='stage2'&&t>=S.miniboss.at)this.spawnMiniBoss();
  else if(this.beat==='miniboss'&&this.miniBossDown){this.build.miniBossReward(this.miniBossName);this.setBeat('identity');this.announce('MINI-BOSS DEFEATED','Choose another upgrade');}
 }
 objective(){const S=LIBERATION_STAGES,t=this.stageTime,left=s=>clock(Math.max(0,Math.ceil(s-t)));
  if(this.phase==='cleared')return 'Bastion defeated';if(this.phase==='boss')return 'Defeat '+this.district.boss;
  if(this.stage>0)return this.district.boss+' in '+left(this.district.seconds);
  switch(this.beat){
   case 'intro':return 'Stage 1 · Build your foundation · Elite in '+left(S.elite.at);
   case 'elite':return 'Stage 1 · Defeat the Elite Bruiser';
   case 'power-up':return 'Stage 1 · Choose your first power-up';
   case 'surge':return 'Stage 1 · Enemy surge';
   case 'hold':return 'Stage 1 · Stage 2 in '+left(S.stage2);
   case 'stage2':return 'Stage 2 · Build your identity · Mini-boss in '+left(S.miniboss.at);
   case 'miniboss':return 'Stage 2 · Defeat '+(this.miniBossKind==='ronin'?'the ':'')+this.miniBossName;
   default:return 'Stage 2 · '+this.district.boss+' in '+left(this.district.seconds);
  }}
 disable(unit){const boss=this.miniBoss;if(boss&&unit===boss.combatUnit){boss.destroy();this.miniBossDown=true;return true;}return super.disable(unit);}
 syncWrecks(){super.syncWrecks();this.ronin?.syncWrecks();}
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
  this.paceApproach();this.bruisers.update(dt,time);const boss=this.miniBoss;if(boss?.spawned){boss.update(dt,time);if(boss.combatUnit&&!boss.combatUnit.alive)this.miniBossDown=true;}
  const targets=this.getTargets();
  for(const actor of this.flightDrones)if(actor.spawned)actor.update(dt,targets);
  if(this.ended)return;
  this.collect();
  if(this.stage===0&&this.phase==='boss'&&!this.options.walker.dead){
   const origin=this.options.walker.spawnOrigin;
   origin.z=Math.max(walkerHomeZ,origin.z-dt*4);
  }
  if(this.stage===0&&this.phase==='streets')this.updateStages(dt);
  if(this.phase==='streets'&&this.stageTime>=this.district.seconds&&(this.stage>0||!this.miniBoss?.spawned||this.miniBossDown))this.boss();
  if(this.phase==='boss'&&(this.stage===0?this.options.walker.dead:this.options.finalBossDefeated())){
   b.bossReward(this.stage===1);
   if(this.stage===1){
    this.clearedAt=this.elapsed;this.phase='cleared';

   }
   else{this.stage++;this.stageTime=0;this.pack=0;this.phase='streets';this.nextPack=this.elapsed+4;}
  }
  if(this.elapsed>=this.nextScan){this.recycleStragglers();this.nextScan=this.elapsed+1;}
  const plan=this.phase==='cleared'?null:this.spawnPlan();
  if(plan&&this.elapsed>=this.nextPack){
   const entered=this.spawnPack(plan);if(this.beat==='surge'&&this.stage===0)this.surgeLeft-=entered;this.nextPack=this.elapsed+Math.max(1,plan.gap);
  }
  this.options.ui.sync(this);
 }
}
