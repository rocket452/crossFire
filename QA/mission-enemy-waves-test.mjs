import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {mission1CityBuildings} from '../dist/evac-city-map.js';
import {MissionEnemyWaves,MISSION_ENEMY_TIMES} from '../dist/mission-enemy-waves.js';

registerHooks({resolve(name,context,next){
 return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,context);
}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const bytes=fs.readFileSync(new URL('../dist/city-assets/licensed-robots/breaker-spider.glb',import.meta.url));
const spiderModel=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new THREE.Scene(),physics=new DestructionWorld(),events=[];
const layout=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url)));
for(const b of mission1CityBuildings(layout.buildings)){
 physics.addChunk({type:'wall',building:b.id,floor:0,x:b.x,y:b.floors*1.5,z:b.z,size:[10,b.floors*3,10]});
}
const terrain={x:-50,z:-39,height:3.2,slopeX:.55,slopeZ:.27};
physics.addTerrainPyramid(terrain);
const traceBuilding=(a,b,radius=0)=>traceImpact(a,b,{sections:physics.chunks,ground:false,radius});
let waves;
const damage=new UnitDamage(unit=>assert(waves.disable(unit)));
waves=new MissionEnemyWaves(scene,damage,{
 getTargets:()=>[],onEvent:e=>events.push(e),
 bruiser:{spiderModel,visible:()=>true,trace:()=>null,onEvent:e=>events.push(e),
  isPathClear:(a,b)=>!traceBuilding({...a,y:1.3},{...b,y:1.3},1.9)},
 drone:{physics,visible:()=>true,trace:()=>null,roof:(a,b)=>traceBuilding(a,b)?.point,
  redirect:()=>null,audio:()=>null,particle(){},burst(){},onWreck(){},onRemoveSmoke(){},cameraImpact(){},onRoundHit(){}}
});
assert.deepEqual(MISSION_ENEMY_TIMES,{bruisers:30,drones:60});
waves.update(.01,29.99);
assert.equal(damage.units.length,0);
waves.update(.01,30);
assert.equal(damage.units.length,4);
assert(waves.members.every(r=>r.root.position.z>150));
assert.deepEqual(waves.waveAlerts().map(a=>[a.edge,a.count]),[['south',4]]);
const dt=1/60;
const step=(from,to)=>{
 for(let i=Math.round(from/dt)+1;i<=Math.round(to/dt);i++){
  waves.update(dt,i*dt);physics.step(dt);waves.syncWrecks();
 }
};
step(30,59.9833);
assert.equal(damage.units.length,4);
waves.update(dt,60);
assert.equal(damage.units.length,8);
assert(waves.flightDrones.every(r=>r.root.position.z< -45));
assert.deepEqual(waves.waveAlerts().map(a=>[a.edge,a.count]),[['north',4]]);
assert.equal(new Set(damage.units.map(u=>u.id)).size,8);
step(60,110);
assert.equal(damage.units.length,8);
for(const r of waves.members)assert(r.root.position.distanceTo(r.objective())<1.15);
for(const drone of waves.flightDrones){
 assert.equal(drone.ingress,null,'drone finished its approach');
 assert(drone.root.position.z>18);
 assert.equal(drone.mode,'flying');
 assert.equal(drone.contacts,0);
}
const firstDrone=waves.flightDrones[0];
damage.hurt(firstDrone.combatUnit,1000,firstDrone.root.position,'hull');
assert.equal(firstDrone.mode,'failing');
assert.equal(events.filter(e=>e.includes('inbound')).length,2);
waves.reset();
assert.equal(damage.units.length,0);
assert(waves.flightDrones.every(d=>!d.body&&!d.root.visible));
assert.deepEqual(waves.waveAlerts(),[]);
waves.update(.1,60);
assert.equal(damage.units.length,8);
waves.reset();
console.log('PASS Mission 1 timed south Bruisers and north drones, radar alerts, clear approaches, drone damage routing, one spawn per wave, and rebuild reset');
