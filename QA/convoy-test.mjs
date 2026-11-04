import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {routePoint} from '../dist/convoy-map-config.js';
const original=JSON.parse(fs.readFileSync('dist/convoy-config.json'));
const buildings=JSON.parse(fs.readFileSync('dist/city-assets/city-layout.json')).buildings;
const sections=buildings.map(b=>({body:{position:{x:b.x,y:10,z:b.z}},size:[10,20,10]}));
function setup(overrides={}){const c=structuredClone(original);Object.assign(c,overrides);let mission;const damage=new UnitDamage(u=>mission.disable(u));mission=new ConvoyMission(new THREE.Scene(),damage,c,{isBusPathClear:(a,b,r)=>!traceImpact({...a,y:1.8},{...b,y:1.8},{sections,ground:false,radius:r}),isCivilianPathClear:(a,b,r)=>!traceImpact({...a,y:1},{...b,y:1},{sections,ground:false,radius:r})});return{mission,damage,c};}
function step(m,seconds,hz=60){for(let i=0;i<Math.ceil(seconds*hz);i++)m.update(1/hz);}
function until(m,predicate,max=200,hz=60){let t=0;while(!predicate()&&t<max){m.update(1/hz);t+=1/hz;}assert(predicate(),JSON.stringify(m.diagnostics()));}
function tally(m){const d=m.diagnostics();assert.equal(d.saved+d.lost+d.unsaved+d.waiting+d.onboard,d.total);for(const b of m.buses)assert(b.passengers.length<=m.config.capacity);return d;}
for(const hz of[30,60,120]){
 const{mission:m,damage,c}=setup();assert.equal(tally(m).onboard,32);assert.equal(m.civilians.length,0);
 until(m,()=>m.phase==='pickup',100,hz);assert.equal(m.nextPickup,0);assert.equal(m.civilians.length,24);const distance=m.distance;step(m,34,hz);assert.equal(m.phase,'pickup');assert.equal(m.distance,distance);assert.equal(tally(m).saved,0);assert.equal(tally(m).onboard,56);until(m,()=>m.completedPickups===1,3,hz);
 until(m,()=>m.phase==='pickup',50,hz);assert.equal(m.nextPickup,1);step(m,34,hz);assert.equal(tally(m).onboard,80);assert.equal(tally(m).waiting,0);
 until(m,()=>m.buses[0].escaped,80,hz);const escaped=tally(m);assert(escaped.saved>0&&escaped.onboard>0);assert(m.buses[0].root.position.x-c.busLength/2>c.map.bounds.maxX,'whole bus exits map');
 until(m,()=>m.terminal,40,hz);assert.equal(m.phase,'success');assert.equal(tally(m).saved,80);assert.equal(tally(m).lost,0);assert(m.buses.every(b=>b.escaped));
 m.reset();assert.equal(tally(m).onboard,32);assert.equal(damage.units.length,4);assert(m.buses.every(b=>b.unit.alive));assert.equal(m.nextPickup,0);console.log('PASS convoy route, two 35s stops, 80 board/save, delayed scoring, exact reset @',hz);
}
{
 const{mission:m,damage}=setup();const manifest=m.buses[0].passengers.slice();damage.hurt(m.buses[0].unit,10000,m.buses[0].root.position);assert.equal(tally(m).lost,8);assert.equal(tally(m).onboard,24);assert(manifest.every(c=>c.status==='lost'));assert(m.buses.slice(1).every(b=>b.passengers.length===8));until(m,()=>m.terminal);assert.equal(m.phase,'success');assert.equal(tally(m).lost,8);assert.equal(tally(m).saved,72);console.log('PASS destroyed loaded bus loses only its manifest; remaining buses finish, all remaining seats can board');
}
{
 const{mission:m,damage}=setup();for(const b of m.buses)damage.hurt(b.unit,10000,b.root.position);assert.equal(m.phase,'failed');assert.equal(tally(m).lost,32);step(m,200);assert.equal(m.nextPickup,0);assert.equal(m.civilians.length,0);console.log('PASS failure only after all buses destroyed, no further pickups');
}
{
 const{mission:m,damage}=setup({civilianSpeed:.02});until(m,()=>m.completedPickups===1);assert.equal(tally(m).unsaved,24);assert.equal(tally(m).lost,0);const c=m.civilians[0],position=c.root.position.clone();step(m,1);assert(c.root.position.equals(position));damage.hurt(c.unit,100,c.root.position);assert.equal(tally(m).lost,1);assert.equal(tally(m).unsaved,23);until(m,()=>m.terminal);assert.equal(tally(m).saved,32);assert.equal(tally(m).unsaved,47);assert.equal(m.civilians.length,47);console.log('PASS left behind remain visible, vulnerable, idle and unsaved separately from killed');
}
{
 const{mission:m,damage}=setup();until(m,()=>m.buses[0].escaped);for(const b of m.activeBuses)damage.hurt(b.unit,10000,b.root.position);assert.equal(m.phase,'success');assert(tally(m).saved>0);console.log('PASS one escaped bus wins even when all remaining buses are lost');
}
assert.equal(routePoint(original.map.route,-42).x,-118);
