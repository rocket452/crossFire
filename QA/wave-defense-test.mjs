import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {RunnerEnergy,RUNNER_ENERGY} from '../dist/runner-energy.js';
import {DestructionWorld} from '../dist/destruction.js';
import {mission1CityBuildings,MISSION1_CITY_ROADS,MISSION1_HERO_START} from '../dist/evac-city-map.js';
import {ESCORT_APPROACH} from '../dist/evac-approach.js';
import {WaveDefense,RELAY,RELAY_INTRO,WAVE_DEFENSE_HERO_START,WAVE_DEFENSE_BOUNDS,waveDefenseBuildings,waveDefenseRoads} from '../dist/wave-defense.js';

registerHooks({resolve(name,context,next){
 return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,context);
}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const bytes=fs.readFileSync(new URL('../dist/city-assets/licensed-robots/breaker-spider.glb',import.meta.url));
const spiderModel=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new THREE.Scene(),physics=new DestructionWorld();
for(const axis of ['X','Z']){
 const span=b=>b['max'+axis]-b['min'+axis];
 assert(Math.abs(span(WAVE_DEFENSE_BOUNDS)-1.3*span(ESCORT_APPROACH))<1e-9);
}
const layout=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url)));
const buildings=waveDefenseBuildings(mission1CityBuildings(layout.buildings));
assert.equal(RELAY.floors*3,72);
assert.equal(RELAY.footprint,20);
const spawn=WAVE_DEFENSE_HERO_START;
const distanceToRelay=p=>Math.hypot(p.x-RELAY.x,p.z-RELAY.z);
assert(Math.abs(distanceToRelay(spawn)-distanceToRelay(MISSION1_HERO_START)*1.3**2)<1e-9);
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
const walker={root:new THREE.Group(),combatUnit:{},reset(){this.dead=false;},applyWalkPose(){},shapes(){return [];}};
let waves,hero=[],result=null,t=0;
const damage=new UnitDamage(unit=>waves.disable(unit),unit=>{
 if(unit===waves.relay)waves.flashRelay();
});
const trace=(a,b,owner,radius)=>traceImpact(a,b,{targets:[waves.relay],radius});
waves=new WaveDefense(scene,damage,{
 walker,visible:()=>true,collapsed:()=>false,status(){},finish:won=>{result=won;},startArsenal(){},
 getTargets:()=>hero,onEvent(){},bruiser:{spiderModel,visible:()=>true,isPathClear:(a,b)=>!traceBuilding({...a,y:1.3},{...b,y:1.3},1.9),trace},
 drone:{physics,visible:()=>true,trace,roof:(a,b)=>traceBuilding(a,b)?.point,redirect:()=>null,audio:()=>null,particle(){},burst(){},onWreck(){},onRemoveSmoke(){},cameraImpact(){},onRoundHit:(hit,power)=>damage.hurt(hit.unit,power,hit.point)}
});
function step(seconds){for(let i=0;i<Math.round(seconds*30);i++){waves.update(1/30,t+=1/30);physics.step(1/30);waves.syncWrecks();}}
function counts(){return [waves.members,waves.flightDrones].map(group=>group.filter(e=>e.combatUnit?.alive).length);}
function clear(){for(const actor of [...waves.members,...waves.flightDrones])if(actor.combatUnit?.alive)damage.hurt(actor.combatUnit,1e6,actor.root.position,'hull');step(.1);}
step(.1);assert.deepEqual(counts(),[4,0]);assert(waves.members.every(r=>r.root.position.z>WAVE_DEFENSE_BOUNDS.maxZ-25));assert.equal(walker.root.visible,false);
const origin=waves.members[0].root.position;
hero=[{alive:true,shapes:[{center:origin.clone()}]}];
assert.equal(waves.targets(origin)[0],hero[0]);
hero=[];assert.equal(waves.targets(origin)[0],waves.relay);
step(23);assert(waves.relay.health<waves.relay.maxHealth,'incoming Bruiser bolts damage the relay');
assert(waves.updateRelayFlash(1/60));
assert.equal(waves.relayFlash,1);
assert(waves.relayGlow.color.r>.99&&waves.relayGlow.color.b<.05);
waves.updateRelayFlash(.24);
waves.updateRelayFlash(0);
assert.equal(waves.relayFlash,0);
assert(waves.relayGlow.color.equals(waves.relayGlowColor));
clear();step(29);assert.equal(waves.wave,1);assert.equal(waves.group,1);
assert.equal(waves.upgradePending,false);
step(1.2);assert.deepEqual(counts(),[0,4]);
assert(waves.flightDrones.filter(d=>d.combatUnit?.alive).every(d=>d.root.position.z<WAVE_DEFENSE_BOUNDS.minZ+28));
waves.relay.health=waves.relay.maxHealth;
const hp=waves.relay.health;
for(let i=0;i<2400&&waves.relay.health===hp;i++)step(1/30);
assert(waves.relay.health<hp,'drone rounds hit relay');assert.equal(result,null);
clear();step(30);assert.deepEqual(counts(),[2,2]);
clear();assert.equal(waves.wave,2);assert(waves.upgradePending);
assert.equal(waves.chooseUpgrade('chain','ninja'),false);
assert(waves.chooseUpgrade('chain','volt'));assert(waves.upgrades.has('chain'));
assert.equal(waves.chooseUpgrade('repair','volt'),false,'one choice per intermission');
step(29);assert.deepEqual(counts(),[0,0]);step(1);assert.deepEqual(counts(),[8,0]);
clear();step(30);assert.deepEqual(counts(),[0,8]);
clear();step(30);assert.deepEqual(counts(),[4,4]);
clear();assert.equal(waves.wave,3);assert(waves.upgradePending);
assert.equal(waves.chooseUpgrade('chain','volt'),false,'persistent upgrades are not purchased twice');
waves.relay.health=waves.relay.maxHealth*.5;
assert(waves.chooseUpgrade('repair','volt'));
assert.equal(waves.relay.health,waves.relay.maxHealth*.8);
assert.equal(walker.root.visible,false);
step(30);assert.equal(walker.root.visible,true);assert.deepEqual(counts(),[0,0]);
walker.dead=true;step(.1);assert.equal(result,true);
waves.reset();assert.equal(waves.phase,'waiting');assert.deepEqual(counts(),[0,0]);
assert.equal(waves.upgrades.size,0);
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
