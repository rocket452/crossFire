import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {Bastion} from '../dist/bastion.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {COMBAT_ARENA} from '../dist/combat-arena-config.js';
import {escortMovementBounds} from '../dist/evac-approach.js';

const config=JSON.parse(fs.readFileSync('dist/bastion-config.json'));
const inside=(p,b,padding=0)=>p.x>=b.minX+padding-1e-7&&p.x<=b.maxX-padding+1e-7&&p.z>=b.minZ+padding-1e-7&&p.z<=b.maxZ-padding+1e-7;
let layouts=0;
for(const [name,bounds] of [['arena',COMBAT_ARENA.movementBounds],['evacuation',escortMovementBounds()],['rectangle',{minX:-170,maxX:70,minZ:-50,maxZ:130}]]){
 const b=new Bastion(new THREE.Scene(),new UnitDamage(),config,{arenaBounds:bounds}),walls=b.beamWalls,c=config.beamWalls;
 for(const x of [bounds.minX,(bounds.minX+bounds.maxX)/2,bounds.maxX])for(const z of [bounds.minZ,(bounds.minZ+bounds.maxZ)/2,bounds.maxZ])for(let seed=1;seed<=32;seed++){
  b.state.reset(seed);b.player={position:new THREE.Vector3(x,.08,z),motion:{mode:'ground'}};b.state.patterns=['beam-wall'];walls.begin();assert(walls.running);
  const gaps=walls.waves.map(w=>w.gap);
  assert(Math.abs(Math.abs(gaps[1]-gaps[0])-c.gapShift)<1e-7);
  assert(Math.abs(Math.abs(gaps[2]-gaps[1])-c.gapShift)<1e-7);
  const world=(x,z)=>walls.field.localToWorld(new THREE.Vector3(x,.08,z));
  for(const w of walls.waves)for(const direction of [-1,0,1]){
   // Check the entire opening, not just its center, at playable street crossings.
   const localCenter=new THREE.Vector3((bounds.minX+bounds.maxX)/2,.08,(bounds.minZ+bounds.maxZ)/2).applyMatrix4(walls.inverse);
   const p=world(w.gap+direction*c.gapWidth/2,localCenter.z);
   assert(inside(p,bounds,c.playerRadius),`${name} seed ${seed}: gap edge ${p.toArray()} outside playable bounds`);
  }
  const start=world(0,walls.min),end=world(0,walls.max);
  assert(start.distanceTo(b.player.position)>=end.distanceTo(b.player.position)-1e-7,'sweep starts on the farther edge');
  const yaw=walls.yaw,origin=walls.field.position.clone();b.player.position.set(bounds.minX,.08,bounds.maxZ);b.root.rotation.y+=.3;walls.update(.1);
  assert.equal(walls.yaw,yaw);assert(walls.field.position.equals(origin),'advertised frame stays locked');layouts++;
 }
 // Use the actual world-space crossing and verify each opening is safe.
 b.state.hitsTaken=b.state.damageTaken=0;
 for(const w of walls.waves){w.active=true;w.hit=false;w.previousZ=w.z=0;const world=(z)=>walls.field.localToWorld(new THREE.Vector3(w.gap,.08,z));walls.checkPlayer({position:world(-3)},world(3));w.active=false;}
 assert.equal(b.state.hitsTaken,0);
 console.log('PASS',name,'all seeded gap edges in playable bounds, 60m shifts, translated/locked far-edge sweep and safe world-space crossings');
}
console.log('PASS',layouts,'center/edge/corner layouts');
