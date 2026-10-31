import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {EvacRaiderSquad} from '../dist/evac-raider-squad.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {RAIDER_ENERGY} from '../dist/raider-energy-effects.js';

for(const dt of[1/30,1/60,1/120,.075]){
 const scene=new THREE.Scene(),damage=new UnitDamage(),events=[];
 const squad=new EvacRaiderSquad(scene,damage,{landing:{x:0,z:24},getHelicopter:()=>null,getTargets:()=>[],visible:()=>true,trace:()=>null,isPathClear:()=>true,onEvent:m=>events.push(m)});
 assert(squad.spawn());assert(!squad.spawn());assert.equal(events.length,1);assert(events[0].includes('7 tracked'));
 assert.equal(squad.members.length,7);assert.equal(damage.units.length,7);assert.equal(squad.diagnostics().maxHealth,7000);
 assert.equal(new Set(squad.members.map(r=>r.combatUnit.id)).size,7);assert(squad.members.every(r=>r.energyEffects===squad.energyEffects));
 for(let i=0;i<Math.ceil(32/dt);i++){
  if(i===Math.ceil(6/dt))squad.members[1].stun(6);
  squad.update(dt,i*dt);
  for(const[a,r]of squad.members.entries())for(const q of squad.members.slice(a+1))assert(r.root.position.distanceTo(q.root.position)>3.5,'staggered rows never overlap even when a front robot is stopped for six seconds');
 }
 assert(squad.members.every(r=>r.root.position.z>=36&&r.root.position.z<=49.1));
 const effects=squad.energyEffects,bolt={mesh:new THREE.Mesh(),dir:new THREE.Vector3(0,0,-1),radius:1.32};bolt.mesh.position.set(0,4,60);
 for(let i=0;i<100;i++){bolt.mesh.position.addScaledVector(bolt.dir,18*dt);effects.update(dt,[bolt]);}
 assert(effects.diagnostics().sparks>0&&effects.rings.count===2&&effects.halos.count===2);
 const p=bolt.mesh.position.clone();effects.impact(p,bolt.dir,1.32);effects.update(dt,[]);assert(effects.diagnostics().bursts===1&&effects.rings.count===1);
 for(let i=0;i<80;i++)effects.impact(p,bolt.dir,1.32);
 assert(effects.particles.length<=RAIDER_ENERGY.sparks&&effects.bursts.length<=16);
 for(let i=0;i<Math.ceil(1/dt);i++)effects.update(dt,[]);
 assert.equal(effects.particles.length,0);assert.equal(effects.bursts.length,0);assert.equal(effects.rings.count,0);
 effects.impact(p,bolt.dir,1.32);squad.reset();assert.equal(damage.units.length,0);assert(squad.members.every(r=>!r.spawned&&!r.bolts.length));assert.equal(effects.sparks.count+effects.rings.count+effects.halos.count,0);assert.equal(effects.particles.length+effects.bursts.length,0);
 squad.spawn();assert.equal(damage.units.length,7,'rebuild creates exactly one fresh seven-robot wave');
 console.log('PASS',dt,'7 unique units, 7000 HP, shared energy pools, separated 3/3/1 approach, animated bolts, impact expiry/bounded pools, complete reset and respawn');
}
