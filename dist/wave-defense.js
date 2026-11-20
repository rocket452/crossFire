import * as THREE from './vendor/three.module.js';
import {MissionEnemyWaves} from './mission-enemy-waves.js?v=drone-bullets-337';
import {EVACUATION_LANDING as center} from './evacuation-config.js?v=compact-evac-237';
import {MISSION1_HERO_START} from './evac-city-map.js?v=mission-spawn-326';
import {ESCORT_APPROACH} from './evac-approach.js?v=compact-evac-237';

export const RELAY={id:'central-relay',name:'Central relay',...center,floors:24,footprint:20,tint:'#ffd21e',solidPaint:true};
const mapScale=1.3;
const mapX=x=>center.x+(x-center.x)*mapScale;
const mapZ=z=>center.z+(z-center.z)*mapScale;
// Keep the player at the same street intersection in the enlarged district.
export const WAVE_DEFENSE_HERO_START=Object.freeze({
 x:mapX(MISSION1_HERO_START.x),y:MISSION1_HERO_START.y,z:mapZ(MISSION1_HERO_START.z)
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
const waves=[[4,0],[0,4],[2,2],[0,0]];

export class WaveDefense extends MissionEnemyWaves {
 constructor(scene,damage,options){
  super(scene,damage,options);
  this.options=options;
  this.walker=options.walker;
  for(const {actor,start} of this.drones){
   start.z=WAVE_DEFENSE_BOUNDS.minZ+(start.z-ESCORT_APPROACH.minZ);
   actor.options.bounds=WAVE_DEFENSE_BOUNDS;
   actor.options.ingress.z=center.z-22;
  }
  for(const unit of this.members){
   unit.spawnPosition.z=WAVE_DEFENSE_BOUNDS.maxZ-(ESCORT_APPROACH.maxZ-unit.spawnPosition.z);
   unit.getTargets=origin=>this.targets(origin);
   const lane=unit.spawnPosition.x;
   unit.objective=()=>new THREE.Vector3(lane,.1,center.z+18);
  }
  const root=new THREE.Group();
  root.position.set(center.x,0,center.z);
  scene.add(root);
  const glow=new THREE.MeshBasicMaterial({color:'#ffdb37',toneMapped:false});
  const roof=RELAY.floors*3;
  const plaza=new THREE.Mesh(new THREE.RingGeometry(32,32.35,64),glow);
  plaza.rotation.x=-Math.PI/2;plaza.position.y=.105;root.add(plaza);
  for(const y of [10,30,50,roof+.5,roof+3]){
   const ring=new THREE.Mesh(new THREE.TorusGeometry(y>roof?3.4:RELAY.footprint*.6,.22,5,32),glow);
   ring.rotation.x=Math.PI/2;ring.position.y=y;root.add(ring);
  }
  const beacon=new THREE.Mesh(new THREE.OctahedronGeometry(2.4),glow);
  beacon.position.y=roof+6;root.add(beacon);
  this.relay=damage.add(RELAY.id,'structure',{root,evac:true},3200);
  const halfWidth=RELAY.footprint/2+.3;
  this.relay.shapes=[{center:new THREE.Vector3(center.x,9.2,center.z),half:{x:halfWidth,y:9.2,z:halfWidth}},
   {center:new THREE.Vector3(center.x,18.4+(roof-18.4)/2,center.z),half:{x:halfWidth,y:(roof-18.4)/2,z:halfWidth}}];
  this.reset();
 }
 reset(){
  super.reset();
  this.wave=0;this.remaining=0;this.phase='waiting';
  this.relay.entity.root.visible=true;
  this.relay.health=this.relay.maxHealth;this.relay.alive=true;
  this.walker.dead=true;this.walker.root.visible=false;this.walker.combatUnit.alive=false;
  this.walker.combatUnit.shapes=[];
  this.options.status(this);
 }
 targets(origin){
  const heroes=this.getTargets().filter(u=>u.alive&&!u.dashPhased&&origin.distanceTo(u.shapes[0].center)<30&&this.options.visible(origin,u.shapes[0].center));
  return heroes.length?heroes:[this.relay];
 }
 launch(){
  const [ground,air]=waves[this.wave++];
  this.phase='active';
  if(ground){
   const units=this.members.slice(0,ground);
   for(const unit of units){unit.reset();unit.spawn();}
   this.alert('south',units);
  }
  if(air){
   for(const {actor,start} of this.drones.slice(0,air))actor.spawn(start);
   this.alert('north',this.flightDrones.slice(0,air));
  }
  if(this.wave===4){
   const boss=this.walker;
   boss.spawnOrigin={x:center.x,z:WAVE_DEFENSE_BOUNDS.minZ+12};
   boss.reset();boss.root.visible=true;boss.combatUnit.alive=true;
   boss.combatUnit.health=boss.combatUnit.maxHealth;
   boss.applyWalkPose(boss.walkPose);boss.combatUnit.shapes=boss.shapes();
   this.options.startArsenal();
   this.alert('north',[boss]);
  }
  this.onEvent('Wave '+this.wave+' of 4 · '+['Four Bruisers','Four combat drones','Bruisers and drones','Siege Walker'][this.wave-1]);
 }
 finish(won){
  if(this.ended)return;
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
  if(this.phase==='waiting'){
   this.remaining=Math.max(0,this.remaining-dt);
   if(this.remaining<1e-6)this.launch();
  }
  this.bruisers.update(dt,time);
  for(const drone of this.flightDrones)if(drone.spawned)drone.update(dt,this.targets(drone.root.position));
  if(this.ended)return;
  if(this.phase==='active'){
   if(this.wave===4){
    if(this.walker.dead)this.finish(true);
    else this.walker.spawnOrigin.z=Math.min(center.z-35,this.walker.spawnOrigin.z+dt*2);
   }else if(!this.getTarget()){
    this.phase='waiting';this.remaining=30;
   }
  }
  this.options.status(this);
 }
 disable(unit){
  if(unit===this.relay){this.finish(false);return true;}
  return super.disable(unit);
 }
}
