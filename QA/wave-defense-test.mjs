import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {RunnerEnergy,RUNNER_ENERGY} from '../dist/runner-energy.js';
import {DestructionWorld} from '../dist/destruction.js';
import {mission1CityBuildings,MISSION1_CITY_ROADS,MISSION1_HERO_START} from '../dist/evac-city-map.js';
import {ESCORT_APPROACH} from '../dist/evac-approach.js';
import {EVAC_ROCKET} from '../dist/defense-rocket.js';
import {WaveDefense,RELAY,RELAY_INTRO,WAVE_DEFENSE_HERO_START,WAVE_DEFENSE_BOUNDS,WAVE_DEFENSE_INTERVAL,waveDefenseBuildings,waveDefenseRoads} from '../dist/wave-defense.js';

registerHooks({resolve(name,context,next){
 return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,context);
}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const bytes=fs.readFileSync(new URL('../dist/city-assets/licensed-robots/breaker-spider.glb',import.meta.url));
const spiderModel=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new THREE.Scene(),physics=new DestructionWorld();
for(const axis of ['X','Z']){
 const span=b=>b['max'+axis]-b['min'+axis];
 assert(Math.abs(span(WAVE_DEFENSE_BOUNDS)-1.3**2*1.4*span(ESCORT_APPROACH))<1e-9);
}
const layout=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url)));
const buildings=waveDefenseBuildings(mission1CityBuildings(layout.buildings));
const towers=buildings.filter(b=>b.id.startsWith('WAVE-TOWER-'));
assert.equal(towers.length,10);
assert.equal(new Set(buildings.map(b=>b.id)).size,buildings.length);
const roads=waveDefenseRoads(MISSION1_CITY_ROADS);
for(const tower of towers){
 assert(tower.floors>=15&&tower.floors<=23);
 assert(Math.abs(tower.x-RELAY.x)>=25,'main north/south approach stays clear');
 assert(tower.x-5>WAVE_DEFENSE_BOUNDS.minX&&tower.x+5<WAVE_DEFENSE_BOUNDS.maxX);
 assert(tower.z-5>WAVE_DEFENSE_BOUNDS.minZ&&tower.z+5<WAVE_DEFENSE_BOUNDS.maxZ);
 assert(!roads.some(road=>Math.abs(tower.x-road.x)<road.width/2+5&&Math.abs(tower.z-road.z)<road.depth/2+5));
 assert(!buildings.some(other=>other!==tower&&Math.abs(tower.x-other.x)<11&&Math.abs(tower.z-other.z)<11));
}
assert.equal(EVAC_ROCKET.height,39);
assert(!buildings.some(b=>b.id===RELAY.id));
const spawn=WAVE_DEFENSE_HERO_START;
const distanceToRelay=p=>Math.hypot(p.x-RELAY.x,p.z-RELAY.z);
assert(Math.abs(distanceToRelay(spawn)-distanceToRelay(MISSION1_HERO_START)*1.3**3*1.4)<1e-9);
assert(spawn.x>WAVE_DEFENSE_BOUNDS.minX+4&&spawn.x<WAVE_DEFENSE_BOUNDS.maxX-4);
assert(spawn.z>WAVE_DEFENSE_BOUNDS.minZ+4&&spawn.z<WAVE_DEFENSE_BOUNDS.maxZ-4);
const forward=new THREE.Vector3(Math.sin(RELAY_INTRO.yaw),0,Math.cos(RELAY_INTRO.yaw));
const towardRelay=new THREE.Vector3(RELAY.x-spawn.x,0,RELAY.z-spawn.z).normalize();
assert(forward.distanceTo(towardRelay)<1e-9);
for(const [back,height] of [[5.8,2.7*1.44],[6.5,2.94*1.44]]){
 const camera=new THREE.PerspectiveCamera(65,1,.08,700);
 camera.position.copy(spawn).addScaledVector(forward,-back);
 camera.position.y+=height;
 camera.lookAt(camera.position.clone().addScaledVector(forward,Math.cos(RELAY_INTRO.pitch))
  .add(new THREE.Vector3(0,Math.sin(RELAY_INTRO.pitch),0)));
 camera.updateMatrixWorld();
 const marker=new THREE.Vector3(RELAY.x,RELAY_INTRO.markerHeight,RELAY.z).project(camera);
 assert(Math.abs(marker.x)<.01&&marker.y>0&&marker.y<.75&&Math.abs(marker.z)<1,
  'relay marker is centered in the upper part of the starting view');
}
assert(waveDefenseRoads(MISSION1_CITY_ROADS).some(road=>
 Math.abs(spawn.x-road.x)<road.width/2-2&&Math.abs(spawn.z-road.z)<road.depth/2-2
),'hero spawn is in an open street');
for(const building of buildings){
 assert(Math.abs(building.x-spawn.x)>8||Math.abs(building.z-spawn.z)>8,
  'hero spawn has clearance from '+building.id);
}
for(const b of buildings){
 if(b.id===RELAY.id)continue;
 assert(Math.hypot(Math.max(0,Math.abs(b.x-RELAY.x)-5),Math.max(0,Math.abs(b.z-RELAY.z)-5))>=43);
 physics.addChunk({type:'wall',building:b.id,floor:0,x:b.x,y:b.floors*1.5,z:b.z,size:[10,b.floors*3,10]});
}
const traceBuilding=(a,b,radius=0)=>traceImpact(a,b,{sections:physics.chunks,ground:false,radius});
assert(!traceBuilding({...spawn,y:4},{x:RELAY.x,y:35,z:RELAY.z}),'spawn has a clear view of the relay');
const skylineSections=physics.chunks.filter(c=>c.building.startsWith('WAVE-TOWER-'));
assert(!traceImpact({...spawn,y:4},{x:RELAY.x,y:4,z:RELAY.z},{sections:skylineSections,ground:false,radius:10}),
 'new towers leave room along the route from spawn to relay');
for(const offset of [-4,0,4]){
 const x=RELAY.x+offset;
 assert(!traceBuilding({x,y:1.3,z:WAVE_DEFENSE_BOUNDS.minZ},{x,y:1.3,z:WAVE_DEFENSE_BOUNDS.maxZ},8),'north and south approach lanes have clearance');
}
const walker={root:new THREE.Group(),combatUnit:{},reset(){this.dead=false;},applyWalkPose(){},shapes(){return [];}};
let waves,hero=[],result=null,t=0,finalBossDead=false;
const damage=new UnitDamage(unit=>waves.disable(unit),unit=>{
 if(unit===waves.relay)waves.flashRelay();
});
let liveFire=true,droneRelayHits=0;
const trace=(a,b,owner,radius)=>traceImpact(a,b,{targets:liveFire||owner.startsWith('combat-drone')?[waves.relay]:[],radius});
waves=new WaveDefense(scene,damage,{
 walker,visible:()=>true,finalBossDefeated:()=>finalBossDead,status(){},finish:won=>{result=won;},startArsenal(){},
 getTargets:()=>hero,onEvent(){},bruiser:{spiderModel,visible:()=>true,isPathClear:(a,b)=>!traceBuilding({...a,y:1.3},{...b,y:1.3},1.9),trace},
 drone:{physics,visible:()=>true,trace,roof:(a,b)=>traceBuilding(a,b)?.point,redirect:()=>null,audio:()=>null,particle(){},burst(){},onWreck(){},onRemoveSmoke(){},cameraImpact(){},onRoundHit:(hit,power)=>{
  if(hit.unit===waves.relay)droneRelayHits++;
  if(liveFire&&hit.unit)damage.hurt(hit.unit,power,hit.point);
 }}
});
function step(seconds){for(let i=0;i<Math.round(seconds*30);i++){waves.update(1/30,t+=1/30);physics.step(1/30);waves.syncWrecks();}}
function counts(){return [waves.members,waves.flightDrones].map(group=>group.filter(e=>e.combatUnit?.alive).length);}
const interval=WAVE_DEFENSE_INTERVAL;
assert.equal(interval,15);
step(1/30);
assert.deepEqual(counts(),[4,0]);
assert(waves.members.filter(r=>r.spawned).every(r=>r.root.position.z>WAVE_DEFENSE_BOUNDS.maxZ-25));
assert.equal(walker.root.visible,false);
const first=waves.members[0],origin=first.root.position;
assert.equal(first.combatUnit.health,350);
hero=[{alive:true,shapes:[{center:origin.clone().add(new THREE.Vector3(0,0,-100))}]}];
assert.equal(waves.targets(origin,first.heroRange)[0],hero[0]);
hero=[];assert.equal(waves.targets(origin,first.heroRange)[0],waves.relay);
const nearRocket=new THREE.Vector3(RELAY.x,18,RELAY.z+40);
const farRocket=new THREE.Vector3(RELAY.x,18,RELAY.z+160);
for(const weapon of ['missiles','beam','plasma']){
 const far=waves.walkerTargets(farRocket,140,weapon,null);
 assert.deepEqual(far,weapon==='missiles'?[waves.relay]:[]);
 assert.deepEqual(waves.walkerTargets(nearRocket,140,weapon,null),[waves.relay]);
 const player=nearRocket.clone().add(new THREE.Vector3(8,0,0));
 assert.deepEqual(waves.walkerTargets(nearRocket,140,weapon,player),[]);
 const unit={alive:true,shapes:[{center:player}]};
 hero=[unit];
 assert.deepEqual(waves.walkerTargets(nearRocket,140,weapon,player),[unit]);
 hero=[];
}
step(interval-1/30);
assert.deepEqual(counts(),[4,0],'no spawn before the countdown expires');
step(1/30);
assert.deepEqual(counts(),[4,4],'new group launches while the first group lives');
assert(waves.flightDrones.filter(d=>d.spawned).every(d=>d.root.position.z<WAVE_DEFENSE_BOUNDS.minZ+30));
const firstCombatUnit=first.combatUnit;
firstCombatUnit.health=123;
step(interval);
assert.deepEqual(counts(),[6,6]);
assert.equal(first.combatUnit,firstCombatUnit);
assert.equal(first.combatUnit.health,123,'overlapping spawns preserve health and identity');
assert.equal(waves.nextWaveLabel,'Wave 2');
assert(!waves.upgradePending,'mixed squad does not open upgrades');
// The larger map adds travel time before enemy rounds can reach the relay.
for(let seconds=0;seconds<45&&waves.relay.health===waves.relay.maxHealth;seconds++)step(1);
assert(waves.relay.health<waves.relay.maxHealth,'incoming Bruiser bolts damage the relay');
assert(waves.updateRelayFlash(1/60));
assert.equal(waves.relayFlash,1);
assert(waves.rocket.shell.emissiveIntensity>1);
waves.updateRelayFlash(.24);
waves.updateRelayFlash(0);
assert.equal(waves.relayFlash,0);
assert.equal(waves.rocket.shell.emissiveIntensity,0);
liveFire=false;
step(35);
assert.equal(waves.wave,1,'surviving enemies hold wave 1 open');
assert.equal(waves.remaining,0);
const survivors=[...waves.members,...waves.flightDrones].map(actor=>actor.combatUnit).filter(unit=>unit?.alive);
for(const unit of survivors.slice(1))damage.hurt(unit,1e6,RELAY);
step(1/30);
assert(!waves.upgradePending,'an earlier squad survivor still blocks the break');
damage.hurt(survivors[0],1e6,RELAY);
step(1/30);
assert.equal(waves.phase,'intermission');
assert.equal(waves.remaining,30);
assert(waves.upgradePending);
assert.equal(waves.chooseUpgrade('chain','ninja'),false);
assert(waves.chooseUpgrade('chain','volt'));assert(waves.upgrades.has('chain'));
assert.equal(waves.chooseUpgrade('repair','volt'),false,'one choice per intermission');
step(30-1/30);
assert.equal(waves.wave,1,'selecting an upgrade does not shorten the break');
step(1/30);
assert.equal(waves.wave,2);assert.deepEqual(counts(),[8,0]);
step(interval);assert.deepEqual(counts(),[8,8]);
step(interval);assert.deepEqual(counts(),[12,12]);
assert(!waves.upgradePending,'the final Wave 2 group does not open upgrades on arrival');
step(interval+1);
assert.equal(waves.wave,2);
assert.equal(waves.remaining,0);
assert(!waves.upgradePending);
assert.equal(walker.root.visible,false);
const lastDrone=waves.flightDrones.find(actor=>actor.combatUnit?.alive).combatUnit;
for(const actor of [...waves.members,...waves.flightDrones]){
 const unit=actor.combatUnit;
 if(unit?.alive&&unit!==lastDrone)damage.hurt(unit,1e6,RELAY);
}
step(1/30);
assert(!waves.upgradePending,'a surviving drone from an earlier group blocks upgrades');
damage.hurt(lastDrone,1e6,RELAY);
step(1/30);
assert(waves.upgradePending);
assert.equal(waves.phase,'intermission');
assert.equal(waves.remaining,interval);
assert.equal(waves.chooseUpgrade('chain','volt'),false,'persistent upgrades are not purchased twice');
step(interval);
assert(!waves.upgradePending,'unclaimed upgrades do not delay the next wave');
assert.equal(waves.wave,3);
assert.equal(walker.root.visible,true);
assert.equal(walker.spawnOrigin.z,WAVE_DEFENSE_BOUNDS.minZ+12+2/30);
assert.deepEqual(counts(),[0,0]);
assert(droneRelayHits>0,'drone rounds reach the relay on the larger map');
walker.dead=true;step(.1);
assert.equal(waves.phase,'launching');assert.equal(result,null);
step(2);assert(waves.rocket.root.position.y>0);assert(waves.relay.alive);
assert(waves.relay.shapes[0].center.y>5);
step(4);assert.equal(waves.phase,'reinforcements');assert(!waves.rocket.root.visible);
assert(!waves.relay.alive);assert.equal(waves.relay.shapes.length,0);assert.equal(result,null);
finalBossDead=true;step(.1);assert.equal(result,true);
waves.reset();assert(waves.relay.alive);assert.equal(waves.relay.shapes[0].center.y,5);assert.equal(waves.phase,'waiting');assert.deepEqual(counts(),[0,0]);
assert.equal(waves.upgrades.size,0);
waves.upgradePending=true;
waves.relay.health=waves.relay.maxHealth*.5;
assert(waves.chooseUpgrade('repair','volt'));
assert.equal(waves.relay.health,waves.relay.maxHealth*.8);
waves.upgradePending=true;
assert.equal(waves.chooseUpgrade('backstab-dash','volt'),false);
assert(waves.chooseUpgrade('backstab-dash','ninja'));
assert(waves.upgrades.has('backstab-dash'));
waves.upgradePending=true;
assert.equal(waves.chooseUpgrade('backstab-dash','ninja'),false);
damage.hurt(waves.relay,1e6,RELAY);step(100);assert.equal(result,false);assert.equal(waves.wave,1);

const energy=new RunnerEnergy();
assert.equal(energy.earn(2,1/60,{dashing:true}),0);
assert.equal(energy.earn(2,1/60,{dashing:true,moving:false,dashMultiplier:1.3}),2*RUNNER_ENERGY.perMetre*1.3);
console.log('PASS all Wave Defense formations, countdowns, upgrade eligibility, repair, dash charge, victory and loss');
