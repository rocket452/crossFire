import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {EvacRaiderWaves,EVAC_RAIDER_WAVES as config} from '../dist/evac-raider-waves.js';
import {evacuationCityBuildings} from '../dist/evac-city-map.js';
const buildings=evacuationCityBuildings(JSON.parse(fs.readFileSync('dist/city-assets/city-layout.json')).buildings),sections=buildings.map(b=>({state:'intact',x:b.x,y:b.floors*1.5,z:b.z,size:[10,b.floors*3,10]}));
let waves;const damage=new UnitDamage(u=>waves.disable(u)),events=[];waves=new EvacRaiderWaves(new THREE.Scene(),damage,{landing:{x:-48,z:48},getHelicopter:()=>null,getTargets:()=>[],visible:()=>true,trace:()=>null,isPathClear:(a,b)=>!traceImpact({x:a.x,y:1.3,z:a.z},{x:b.x,y:1.3,z:b.z},{sections,ground:false,radius:1.9}),onEvent:e=>events.push(e)});
assert.equal(waves.members.length,12);assert.equal(new Set(waves.members.map(r=>r.id)).size,12);assert.equal(damage.units.length,0);waves.update(100,100);assert(!waves.spawned);assert(waves.spawn());assert(!waves.spawn());
let time=0;const step=s=>{for(let i=0;i<Math.round(s*60);i++){time+=1/60;waves.update(1/60,time);}};
assert.deepEqual(waves.diagnostics().waves.map(w=>w.aliveCount),[3,0,0,0]);step(19.9);assert.equal(waves.diagnostics().aliveCount,3);step(.1);assert.deepEqual(waves.diagnostics().waves.map(w=>w.aliveCount),[3,3,0,0]);step(20);assert.deepEqual(waves.diagnostics().waves.map(w=>w.aliveCount),[3,3,3,0]);step(20);assert.deepEqual(waves.diagnostics().waves.map(w=>w.aliveCount),[3,3,3,3]);step(100);
for(const r of waves.members){const goal=r.objective();assert(r.root.position.distanceTo(goal)<1.15,r.id+' follows open route and reaches objective');assert(r.tracks.diagnostics().distance>15);assert(!traceImpact(r.root.position,r.root.position,{sections,ground:false,radius:1.9}));}
assert.equal(events.filter(e=>e.includes('squad inbound')).length,4);assert(waves.getTarget());const victim=waves.members[4],count=waves.diagnostics().aliveCount;damage.hurt(victim.combatUnit,10000,victim.root.position);assert.equal(waves.diagnostics().aliveCount,count-1);waves.reset();assert.equal(damage.units.length,0);assert(!waves.spawned);assert.equal(waves.getTarget(),null);assert(waves.members.every(r=>!r.root.visible&&r.routeIndex===0));waves.spawn();assert.equal(waves.diagnostics().aliveCount,3);waves.update(61,61);assert.equal(waves.diagnostics().aliveCount,12);waves.reset();assert.equal(damage.units.length,0);
console.log('PASS four unique 3-Bruiser edge waves, exact 20s stagger, no pre-trigger spawn, open-street full advance, damage/targeting, large-dt scheduling, single spawn per edge and complete reset without leaks');
