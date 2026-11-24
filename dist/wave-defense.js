import * as THREE from './vendor/three.module.js';
import {MissionEnemyWaves} from './mission-enemy-waves.js?v=421';
import {EVACUATION_LANDING as center} from './evacuation-config.js?v=compact-evac-237';
import {MISSION1_HERO_START} from './evac-city-map.js?v=mission-spawn-326';
import {ESCORT_APPROACH} from './evac-approach.js?v=compact-evac-237';

import {DefenseRocket,EVAC_ROCKET} from './defense-rocket.js?v=386';

export const RELAY={id:'evacuation-rocket',name:'Evacuation rocket',...center};
const mapScale=1.3**2*1.4;
const mapX=x=>center.x+(x-center.x)*mapScale;
const mapZ=z=>center.z+(z-center.z)*mapScale;
const spawnOffsetX=mapX(MISSION1_HERO_START.x)-center.x;
const spawnOffsetZ=mapZ(MISSION1_HERO_START.z)-center.z;
const spawnDistance=Math.hypot(spawnOffsetX,spawnOffsetZ)*1.3;
// Shift eight degrees onto the street with a clear view of the relay.
const spawnBearing=Math.atan2(spawnOffsetX,spawnOffsetZ)-THREE.MathUtils.degToRad(8);
export const WAVE_DEFENSE_HERO_START=Object.freeze({
 x:center.x+Math.sin(spawnBearing)*spawnDistance,
 y:MISSION1_HERO_START.y,
 z:center.z+Math.cos(spawnBearing)*spawnDistance
});
export const RELAY_INTRO=Object.freeze({
 yaw:Math.atan2(RELAY.x-WAVE_DEFENSE_HERO_START.x,RELAY.z-WAVE_DEFENSE_HERO_START.z),
 pitch:.14,
 markerHeight:EVAC_ROCKET.height+6,
 duration:3.5
});
export const WAVE_DEFENSE_BOUNDS=Object.freeze({
 minX:mapX(ESCORT_APPROACH.minX),maxX:mapX(ESCORT_APPROACH.maxX),
 minZ:mapZ(ESCORT_APPROACH.minZ),maxZ:mapZ(ESCORT_APPROACH.maxZ)
});
export const WAVE_DEFENSE_HIGHWAYS=[
 {fromZ:center.z-6,toZ:WAVE_DEFENSE_BOUNDS.minZ},
 {fromZ:center.z+6,toZ:WAVE_DEFENSE_BOUNDS.maxZ}
];
export const waveDefenseRoads=roads=>roads.map(r=>({
 ...r,x:mapX(r.x),z:mapZ(r.z),width:r.width*mapScale,depth:r.depth*mapScale
})).concat(WAVE_DEFENSE_HIGHWAYS.map(({fromZ,toZ})=>({
 x:center.x,z:(fromZ+toZ)/2,width:18,depth:Math.abs(fromZ-toZ),highway:true
})));
// Sites between the existing streets and outside the relay's north/south
// approaches and the diagonal from the player spawn. Coordinates are pre-scale.
const skylineTowers=[
 [-108,-12,18],[-60,-12,16],[-84,36,21],
 [-12,-12,19],[12,12,23],
 [-84,60,20],[-60,84,15],
 [-36,84,22],[-36,132,17],[12,108,19],
 [-132,-60,24],[-84,-60,20],[-36,-60,26],[12,-60,23],[36,-60,18],
 [-156,-12,19],[-132,-12,22],[-84,-12,27],[60,-12,24],
 [-132,36,23],[-12,36,26],[36,60,25],
 [-156,108,20],[-84,108,24],[60,108,21],[-12,156,22],
 // Flank the Bruiser and drone approaches without narrowing the center lane.
 [-60,-60,23],[-60,-36,21],[-36,108,24],[-60,132,22],[-36,156,25]
];
const skylineTints=['#8299b6','#a49abb','#668d9e'];
const highwayTowers=[
 [-39,-75,16],[-39,-136,19],[-18,-245,14],[18,-62,17],[18,-131,15],[18,-173,20],
 [-39,75,16],[-39,136,18],[-18,247,14],[18,96,17],[39,136,20],[39,209,16]
];
export function waveDefenseBuildings(buildings){
 return buildings.map(b=>({...b,x:mapX(b.x),z:mapZ(b.z)}))
  .filter(b=>Math.hypot(Math.max(0,Math.abs(b.x-center.x)-5),Math.max(0,Math.abs(b.z-center.z)-5))>=43)
  .concat(skylineTowers.map(([x,z,floors],i)=>({
   id:'WAVE-TOWER-'+(i+1),name:'Wave Defense high-rise',
   x:mapX(x),z:mapZ(z),floors,tint:skylineTints[i%skylineTints.length]
  })),highwayTowers.map(([dx,dz,floors],i)=>({
   id:'WAVE-HIGHWAY-TOWER-'+(i+1),name:'Wave Defense highway tower',
   x:center.x+dx,z:center.z+dz,floors,footprint:8,tint:skylineTints[i%skylineTints.length]
  })));
}
const droneLaneRoofClearance=5;
const highDroneAltitudeScale=.7;
const droneLaneHalfWidth=40;
const relayFlashSeconds=.24;
const walkerRelayCloseRange=55;
const formations=[[4,0],[0,4],[4,2]];
export const WAVE_DEFENSE_INTERVAL=15;
const WAVE_INTERMISSIONS=[20,12.5];
const BASTION_VICTORY_DELAY=9;
// The two reinforcement waves use these formations at 1x and 2x strength.
const bruiserCount=formations.reduce((sum,[ground])=>sum+ground,0)*3;
const droneCount=formations.reduce((sum,[,air])=>sum+air,0)*3;
export const DEFENSE_UPGRADES=[
 {id:'chain',hero:'volt',title:'Chain lightning',detail:'Primary attacks arc to one additional nearby enemy.'},
 {id:'dash',hero:'volt',title:'Charged dash',detail:'Dashing generates charge 30% faster than normal movement.'},
 {id:'backstab-dash',hero:'ninja',title:'Backstab Dash',detail:'A gold Crosscut backstab banks one extra dash, even if the enemy survives.'},
 {id:'extra-air-jump',hero:'ninja',title:'Extra Air Jump',detail:'Gain a second midair jump. Wall jumps preserve your remaining air jumps.'},
 {id:'repair',title:'Repair rocket',detail:'Restore 30% of the evacuation rocket’s maximum HP.'}
];

export class WaveDefense extends MissionEnemyWaves {
 constructor(scene,damage,options){
  super(scene,damage,{...options,formationSize:bruiserCount,droneCount});
  this.options=options;
  this.walker=options.walker;
  const northLaneBuildings=options.buildings.filter(b=>b.z<center.z&&
   b.z>=WAVE_DEFENSE_BOUNDS.minZ&&Math.abs(b.x-center.x)<=droneLaneHalfWidth);
  const northLaneRoof=northLaneBuildings.reduce((height,b)=>Math.max(height,b.floors*3),0);
  this.highDroneAltitude=(northLaneRoof+droneLaneRoofClearance)*highDroneAltitudeScale;
  for(const {actor} of this.drones)actor.options.bounds=WAVE_DEFENSE_BOUNDS;
  for(const unit of this.members)unit.getTargets=origin=>this.targets(origin,unit.heroRange,unit);
  this.rocket=new DefenseRocket(scene,RELAY);
  this.relay=damage.add(RELAY.id,'structure',{root:this.rocket.root,evac:true},EVAC_ROCKET.health);
  this.relay.shapes=this.rocket.shapes;
  this.reset();
 }
 reset(){
  super.reset();
  this.relayFlashRemaining=0;
  this.relayFlash=0;
  this.rocket.reset();
  this.launchElapsed=0;
  this.victoryRemaining=null;
  this.wave=1;this.group=0;this.remaining=0;this.phase='waiting';
  this.bruisersLaunched=0;this.dronesLaunched=0;
  this.upgradePending=false;this.upgrades=new Set();
  this.relay.shapes=this.rocket.shapes;
  this.relay.health=this.relay.maxHealth;this.relay.alive=true;
  this.walker.dead=true;this.walker.root.visible=false;this.walker.combatUnit.alive=false;
  this.walker.combatUnit.shapes=[];
  this.options.status(this);
 }
 flashRelay(){
  if(!this.ended&&this.relayFlashRemaining===0)this.relayFlashRemaining=relayFlashSeconds;
 }
 updateRelayFlash(dt){
  if(this.relayFlashRemaining===0&&this.relayFlash===0)return false;
  this.relayFlash=Math.min(1,this.relayFlashRemaining/(relayFlashSeconds*.6));
  this.relayFlashRemaining=Math.max(0,this.relayFlashRemaining-dt);
  this.rocket.pose(this.relayFlash);
  return true;
 }
 targets(origin,range,observer=null){
  const heroes=this.getTargets().filter(u=>{
   const point=u.shapes[0]?.center;
   if(!u.alive||u.dashPhased||!point)return false;
   const distance=origin.distanceTo(point);
   return (observer?observer.canAcquireHero(u,distance):distance<=range)&&this.options.visible(origin,point);
  });
  return heroes.length?heroes:[this.relay];
 }
 walkerTargets(origin,heroRange,weapon,playerPosition,weaponRange=heroRange,aware=()=>true){
  const candidates=this.getTargets().filter(u=>u.alive&&u.shapes[0]?.center);
  const heroes=candidates.filter(aware).filter(u=>!u.dashPhased
   &&origin.distanceTo(u.shapes[0].center)<=weaponRange
   &&this.options.visible(origin,u.shapes[0].center));
  if(heroes.length)return heroes;
  // A nearby player behind cover can still draw the Walker away from the relay.
  const nearby=playerPosition&&Math.hypot(origin.x-playerPosition.x,origin.z-playerPosition.z)<=heroRange;
  const close=Math.hypot(origin.x-center.x,origin.z-center.z)<=walkerRelayCloseRange;
  return this.relay.alive&&!nearby&&(weapon==='missiles'||close)?[this.relay]:[];
 }
 launch(){
  this.phase='active';
  this.upgradePending=false;
  const finalGroup=this.group===formations.length-1;
  this.remaining=this.wave===3||finalGroup?0:WAVE_DEFENSE_INTERVAL;
  const [ground,air]=this.wave===3?[0,0]:formations[this.group].map(count=>count*this.wave);
  if(ground){
   const units=this.members.slice(this.bruisersLaunched,this.bruisersLaunched+ground);
   this.bruisersLaunched+=ground;
   for(const [index,unit] of units.entries()){
    const lane=center.x+(index%2===0?-4:4);
    const row=Math.floor(index/2);
    unit.spawnPosition={x:lane,y:.1,z:WAVE_DEFENSE_BOUNDS.maxZ-6-row*ESCORT_APPROACH.rowSpacing};
    unit.objective=()=>new THREE.Vector3(lane,.1,center.z+18+row*6);
    unit.reset();
    unit.spawn();
   }
   this.alert('south',units);
  }
  if(air){
   const units=this.drones.slice(this.dronesLaunched,this.dronesLaunched+air);
   this.dronesLaunched+=air;
   for(const [index,{actor,start}] of units.entries()){
    const row=Math.floor(index/2);
    // Send one drone per pair along the upper route, alternating sides by row.
    const high=index%4===1||index%4===2;
    const y=high?Math.max(start.y,this.highDroneAltitude):start.y;
    actor.options.ingress.y=y;
    actor.options.ingress.z=center.z-22-row*3.5;
    actor.options.cruiseAltitude=start.y;
    actor.spawn({...start,y,z:WAVE_DEFENSE_BOUNDS.minZ+8+row*8});
   }
   this.alert('north',units.map(({actor})=>actor));
  }
  if(this.wave===3){
   const boss=this.walker;
   boss.spawnOrigin={x:center.x,z:WAVE_DEFENSE_BOUNDS.minZ+12};
   boss.reset();boss.root.visible=true;boss.combatUnit.alive=true;
   boss.combatUnit.health=boss.combatUnit.maxHealth;
   boss.applyWalkPose(boss.walkPose);boss.combatUnit.shapes=boss.shapes();
   this.options.startArsenal();
   this.alert('north',[boss]);
  }
  const battle=this.wave===3?'Siege Walker':[
   ground+' Bruisers',air+' combat drones',ground+' Bruisers and '+air+' drones'
  ][this.group];
  this.onEvent('Wave '+this.wave+' of 3 · '+battle);
 }
 get nextWaveLabel(){
  return this.group===formations.length-1?'Wave '+(this.wave+1):'Group '+(this.group+2);
 }
 chooseUpgrade(id,hero){
  const upgrade=DEFENSE_UPGRADES.find(option=>option.id===id);
  if(!this.upgradePending||!upgrade)return false;
  if(upgrade.hero&&(upgrade.hero!==hero||this.upgrades.has(id)))return false;
  if(id==='repair')this.relay.health=Math.min(this.relay.maxHealth,this.relay.health+this.relay.maxHealth*.3);
  else this.upgrades.add(id);
  this.upgradePending=false;
  return true;
 }
 finish(won){
  if(this.ended)return;
  this.upgradePending=false;
  this.phase=won?'won':'lost';
  if(!won){
   this.relay.entity.root.visible=false;
   this.relay.alive=false;this.relay.health=0;
  }
  this.options.status(this);
  this.options.finish(won);
 }
 get ended(){return this.phase==='lost'||this.phase==='won';}
 update(dt,time){
  if(this.ended)return;
  this.time=time;
  if(!this.relay.alive&&this.phase!=='reinforcements'){this.finish(false);return;}
  if(this.phase==='waiting')this.launch();
  else if(this.wave<3&&this.group===formations.length-1&&this.phase==='active'){
   const enemiesRemain=this.members.some(unit=>unit.combatUnit?.alive)
    ||this.flightDrones.some(drone=>drone.combatUnit?.alive);
   if(!enemiesRemain){
    this.phase='intermission';
    this.remaining=WAVE_INTERMISSIONS[this.wave-1];
    this.upgradePending=true;
   }
  }else if(this.wave<3){
   this.remaining=Math.max(0,this.remaining-dt);
   if(this.remaining<1e-6){
    if(++this.group===formations.length){
     this.wave++;
     this.group=0;
    }
    this.launch();
   }
  }
  this.bruisers.update(dt,time);
  for(const drone of this.flightDrones){
   if(drone.spawned)drone.update(dt,this.targets(drone.root.position,drone.gun.config.range,drone));
  }
  if(this.ended)return;
  if(this.wave===3){
   if(this.phase==='reinforcements'){
    if(this.options.finalBossDefeated()){
     if(this.victoryRemaining===null)this.victoryRemaining=BASTION_VICTORY_DELAY;
     else this.victoryRemaining=Math.max(0,this.victoryRemaining-dt);
     if(this.victoryRemaining<=1e-8)this.finish(true);
    }
   }else if(this.walker.dead){
    if(this.phase!=='launching'){
     this.phase='launching';
     this.onEvent('Siege Walker defeated · evacuation rocket igniting.');
    }
    this.launchElapsed+=dt;
    this.rocket.climb(this.launchElapsed);
    if(this.launchElapsed>=EVAC_ROCKET.launchSeconds){
     this.phase='reinforcements';
     this.relay.alive=false;
     this.relay.shapes=[];
     this.rocket.root.visible=false;
     this.onEvent('Evacuation rocket cleared the city.');
    }
   }else this.walker.spawnOrigin.z=Math.min(center.z-35,this.walker.spawnOrigin.z+dt*2);
  }
  this.options.status(this);
 }
 disable(unit){
  if(unit===this.relay){this.finish(false);return true;}
  return super.disable(unit);
 }
}
