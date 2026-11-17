import assert from 'node:assert/strict';import * as THREE from '../dist/vendor/three.module.js';
import {AstraRonin} from '../dist/astra-ronin.js';import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
for(const dt of[1/30,1/60,1/120]){
 const damage=new UnitDamage(),hero={id:'hero',alive:true,shapes:[{center:V(0,1.5,30)}]},r=new AstraRonin(new THREE.Scene(),damage,{config:{guardInitialDelay:0},getTargets:()=>[hero],visible:()=>true});r.spawnPosition={x:0,y:.1,z:0};r.reset();r.spawn();
 r.update(dt,0);assert.equal(r.guard.phase,'raise');assert(!r.guardBlocking);assert(!r.combatUnit.shapes.some(s=>s.part==='ronin-shield'));
 for(let t=0;t<.55;t+=dt)r.update(dt,t);assert(r.guardBlocking&&!r.swordState);const shield=r.combatUnit.shapes.find(s=>s.part==='ronin-shield'),health=r.combatUnit.health;
 let hit=traceImpact(shield.center.clone().add(V(0,0,20)),shield.center,{targets:[r.combatUnit],ground:false});assert.equal(hit.part,'ronin-shield');assert.equal(damage.hurt(r.combatUnit,100,hit.point,hit.part),0);assert.equal(r.combatUnit.health,health);assert.equal(r.blockedHits,1);assert(r.guardFlash>0);assert(r.model.shieldMaterials.some(s=>s.material.emissiveIntensity>3));assert(!r.model.armor.emissive.getHex(),'block glow belongs to shield');
 const torso=r.combatUnit.shapes.find(s=>s.part==='torso');hit=traceImpact(torso.center.clone().add(V(0,0,-20)),torso.center,{targets:[r.combatUnit],ground:false});assert.notEqual(hit.part,'ronin-shield');assert(damage.hurt(r.combatUnit,50,hit.point,hit.part)>0,'rear hits hurt while guarding');
 const head=r.combatUnit.shapes.find(s=>s.part==='left-lower-leg');hit=traceImpact(head.center.clone().add(V(0,0,20)),head.center,{targets:[r.combatUnit],ground:false});assert.equal(hit.part,'left-lower-leg');assert(damage.hurt(r.combatUnit,10,hit.point,hit.part)>0,'exposed leg can be hit');
 for(let t=0;t<3;t+=dt)r.update(dt,t);assert(!r.guardBlocking);assert(r.guardCooldown>0);assert(!r.combatUnit.shapes.some(s=>s.part==='ronin-shield'));assert(r.model.shieldMaterials.every(s=>s.material.emissive.equals(s.emissive)));
 r.guardCooldown=0;for(let t=0;t<12&&!r.guardBlocking;t+=dt)r.update(dt,t);assert(r.guardBlocking,'repeat guard cycle');r.stun(1);assert(!r.guardBlocking);r.sync();assert(!r.combatUnit.shapes.some(s=>s.part==='ronin-shield'));r.reset();r.spawn();assert(!r.guard&&r.blockedHits===0);r.guardCooldown=0;for(let t=0;t<.6;t+=dt)r.update(dt,t);r.destroy();assert(!r.guardBlocking);
}
console.log('PASS 30/60/120Hz readable raise/hold/lower, real shield trace blocks, independent blue flash, rear/leg damage, repeat cycle, stun, defeat and reset');
