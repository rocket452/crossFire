import * as THREE from './vendor/three.module.js';
import {MissionEnemyWaves} from './mission-enemy-waves.js?v=bruiser-range-381';
import {EVACUATION_LANDING as center} from './evacuation-config.js?v=compact-evac-237';
import {MISSION1_HERO_START} from './evac-city-map.js?v=mission-spawn-326';
import {ESCORT_APPROACH} from './evac-approach.js?v=compact-evac-237';

import {RELAY_TIERS,makeRelayTrim} from './relay-design.js?v=347';

export const RELAY={id:'central-relay',name:'Central relay',...center,floors:24,footprint:20,tint:'#c83d78',asset:'relay',solidPaint:true};
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
 pitch:.31,
 markerHeight:RELAY.floors*3+10,
 duration:3.5
});
export const WAVE_DEFENSE_BOUNDS=Object.freeze({
 minX:mapX(ESCORT_APPROACH.minX),maxX:mapX(ESCORT_APPROACH.maxX),
 minZ:mapZ(ESCORT_APPROACH.minZ),maxZ:mapZ(ESCORT_APPROACH.maxZ)
});
export const waveDefenseRoads=roads=>roads.map(r=>({
 ...r,x:mapX(r.x),z:mapZ(r.z),width:r.width*mapScale,depth:r.depth*mapScale
}));
export function waveDefenseBuildings(buildings){
 return buildings.map(b=>({...b,x:mapX(b.x),z:mapZ(b.z)}))
  .filter(b=>Math.hypot(Math.max(0,Math.abs(b.x-center.x)-5),Math.max(0,Math.abs(b.z-center.z)-5))>=43)
  .concat(RELAY);
}
const relayFlashSeconds=.24;
const formations=[[4,0],[0,4],[2,2]];
export const WAVE_DEFENSE_INTERVAL=15;
const WAVE_ONE_INTERMISSION=30;
const formationSize=formations.reduce((sum,[ground])=>sum+ground,0)*3;
export const DEFENSE_UPGRADES=[
 {id:'chain',hero:'volt',title:'Chain lightning',detail:'Primary attacks arc to one additional nearby enemy.'},
 {id:'dash',hero:'volt',title:'Charged dash',detail:'Dashing generates charge 30% faster than normal movement.'},
 {id:'backstab-dash',hero:'ninja',title:'Backstab Dash',detail:'A gold Crosscut backstab banks one extra dash, even if the enemy survives.'},
 {id:'repair',title:'Repair relay',detail:'Restore 30% of the central relay’s maximum HP.'}
];

export class WaveDefense extends MissionEnemyWaves {
 constructor(scene,damage,options){
  super(scene,damage,{...options,formationSize});
  this.options=options;
  this.walker=options.walker;
  for(const {actor} of this.drones)actor.options.bounds=WAVE_DEFENSE_BOUNDS;
  for(const unit of this.members)unit.getTargets=origin=>this.targets(origin,unit.heroRange);
  const root=new THREE.Group();
  root.position.set(center.x,0,center.z);
  scene.add(root);
  const glow=this.relayGlow=new THREE.MeshBasicMaterial({color:'#ff65ac',toneMapped:false,side:THREE.DoubleSide});
  this.relayGlowColor=glow.color.clone();
  this.relayFlashColor=new THREE.Color('#ff2424');
  const roof=RELAY.floors*3;
  const plaza=new THREE.Mesh(new THREE.RingGeometry(32,32.35,64),glow);
  plaza.rotation.x=-Math.PI/2;plaza.position.y=.105;root.add(plaza);
  const trim=makeRelayTrim();
  let tierTop=0;
  for(const tier of RELAY_TIERS){
   tierTop+=tier.height;
   const band=new THREE.Mesh(trim,glow);
   band.position.y=tierTop;
   band.scale.set(tier.width*.509,1,tier.width*.509);
   root.add(band);
  }
  const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.35,1.6,8,4),glow);
  for(const x of [-6.5,6.5]){
   const mast=antenna.clone();
   mast.position.set(x,roof+3.5,0);
   mast.rotation.y=Math.PI/4;
   mast.rotation.z=-Math.sign(x)*.18;
   root.add(mast);
  }
  const halo=new THREE.Mesh(new THREE.TorusGeometry(3.7,.22,6,32),glow);
  halo.position.y=roof+4;
  root.add(halo);
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(2.1),glow);
  core.position.y=roof+4;
  root.add(core);
  this.relay=damage.add(RELAY.id,'structure',{root,evac:true},3200);
  let tierBase=0;
  this.relay.shapes=RELAY_TIERS.map(tier=>{
   const half={x:tier.width/2+.3,y:tier.height/2,z:tier.width/2+.3};
   const shape={center:new THREE.Vector3(center.x,tierBase+half.y,center.z),half};
   tierBase+=tier.height;
   return shape;
  });
  this.reset();
 }
 reset(){
  super.reset();
  this.relayFlashRemaining=0;
  this.relayFlash=0;
  this.relayGlow.color.copy(this.relayGlowColor);
  this.wave=1;this.group=0;this.remaining=0;this.phase='waiting';
  this.bruisersLaunched=0;this.dronesLaunched=0;
  this.upgradePending=false;this.upgrades=new Set();
  this.relay.entity.root.visible=true;
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
  this.relayGlow.color.copy(this.relayGlowColor).lerp(this.relayFlashColor,this.relayFlash);
  return true;
 }
 targets(origin,range){
  const heroes=this.getTargets().filter(u=>{
   const point=u.shapes[0]?.center;
   return u.alive&&!u.dashPhased&&point&&origin.distanceTo(point)<=range&&this.options.visible(origin,point);
  });
  return heroes.length?heroes:[this.relay];
 }
 launch(){
  this.phase='active';
  const finalGroup=this.group===formations.length-1;
  this.upgradePending=this.wave===2&&finalGroup;
  this.remaining=this.wave===3||(this.wave===1&&finalGroup)?0:WAVE_DEFENSE_INTERVAL;
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
    actor.options.ingress.z=center.z-22-row*3.5;
    actor.spawn({...start,z:WAVE_DEFENSE_BOUNDS.minZ+8+row*8});
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
  if(!this.relay.alive||this.options.collapsed()){this.finish(false);return;}
  if(this.phase==='waiting')this.launch();
  else if(this.wave===1&&this.group===formations.length-1&&this.phase==='active'){
   const enemiesRemain=this.members.some(unit=>unit.combatUnit?.alive)
    ||this.flightDrones.some(drone=>drone.combatUnit?.alive);
   if(!enemiesRemain){
    this.phase='intermission';
    this.remaining=WAVE_ONE_INTERMISSION;
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
   if(drone.spawned)drone.update(dt,this.targets(drone.root.position,drone.gun.config.range));
  }
  if(this.ended)return;
  if(this.wave===3){
   if(this.walker.dead)this.finish(true);
   else this.walker.spawnOrigin.z=Math.min(center.z-35,this.walker.spawnOrigin.z+dt*2);
  }
  this.options.status(this);
 }
 disable(unit){
  if(unit===this.relay){this.finish(false);return true;}
  return super.disable(unit);
 }
}
