import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {EvacuationScene} from '../dist/evacuation.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
for(const phase of['inbound','landing','boarding','departing','returning','destroyed']){
 let e;const damage=new UnitDamage(u=>e.disable(u));e=new EvacuationScene(new THREE.Scene(),damage,{visible:()=>true,config:{initialSpawnDelay:15}});
 e.spawn();e.phase=phase;e.aircraft.position.set(e.landing.x,phase==='boarding'?.8:18,e.landing.z);e.aircraft.visible=!['returning','destroyed'].includes(phase);e.heli.alive=e.aircraft.visible;e.passengers=e.heli.alive?5:0;
 const civilians=[...e.civilians],before={saved:e.saved,lost:e.lost},ally=damage.add('bastion','robot',{evac:true,root:new THREE.Group()},6000),groups=e.groups;
 assert(e.endEvacuation());assert(!e.endEvacuation());assert.equal(e.civilians.length,0);assert.equal(e.people.count,0);assert.equal(e.cohorts.length,0);assert.equal(e.waveAttacks.length,0);assert.equal(e.clearedCivilians,12);assert.equal(e.saved,before.saved);assert.equal(e.lost,before.lost);assert(damage.units.includes(ally));assert(civilians.every(c=>!c.unit.alive&&c.unit.shapes.length===0&&!damage.units.includes(c.unit)));assert(!e.spawnWarning.active);assert.equal(e.diagnostics().nextSpawn,null);
 e.relocateCivilian(civilians[0],{x:0,z:0});e.moveCarriedCivilian(civilians[0],{x:0,y:0,z:0});assert.equal(e.cohorts.length,0);
 const shouldFly=!['returning','destroyed'].includes(phase);if(shouldFly)assert.equal(e.phase,'departing');for(let i=0;i<600;i++)e.update(.1);assert.equal(e.phase,'complete');assert(!e.aircraft.visible&&!e.heli.alive);assert.equal(e.saved,shouldFly?5:0);assert.equal(e.lost,0);assert.equal(e.passengers,0);assert.equal(e.groups,groups);assert.equal(e.civilians.length,0);e.spawn();e.beginInbound();assert.equal(e.groups,groups);assert.equal(e.phase,'complete');
 e.reset();assert(!e.ended);assert.equal(e.phase,'inbound');assert.equal(e.clearedCivilians,0);for(let i=0;i<151;i++)e.update(.1);assert.equal(e.groups,1);assert.equal(e.civilians.length,12);console.log('PASS shutdown from',phase,'clears ground civilians without losses, preserves boss, retires transport permanently, blocks rescue ghosts and resets');
}
// If the last outbound helicopter is destroyed, its passengers are lost and no replacement arrives.
let e;const damage=new UnitDamage(u=>e.disable(u));e=new EvacuationScene(new THREE.Scene(),damage,{visible:()=>true});e.phase='boarding';e.aircraft.position.set(e.landing.x,.8,e.landing.z);e.passengers=7;e.endEvacuation();damage.hurt(e.heli,10000,e.aircraft.position);for(let i=0;i<300;i++)e.update(.1);assert.equal(e.lost,7);assert.equal(e.saved,0);assert.equal(e.phase,'complete');assert(!e.aircraft.visible);console.log('PASS final flight destruction loses passengers once and never spawns a replacement');
