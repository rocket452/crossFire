import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {AstraRonin} from '../dist/astra-ronin.js';
let hits=0;const hero={alive:true,kind:'hero',shapes:[{center:new THREE.Vector3(0,1.5,8)}]};
const r=new AstraRonin(new THREE.Scene(),new UnitDamage(),{id:'evac-raider-ronin',getTargets:()=>[hero],visible:()=>true,trace:()=>null,onHeroHit:()=>hits++});r.spawnPosition={x:0,y:.1,z:0};r.reset();r.spawn();
for(let i=0;i<260;i++)r.update(1/60,i/60);assert(hits>0);assert.equal(r.bolts.length,0);const before=hits;r.stun(3);for(let i=0;i<120;i++)r.update(1/60,i/60);assert.equal(hits,before);assert(r.combatUnit.shapes.length>=10);r.destroy();assert(r.dying&&r.root.visible&&!r.combatUnit.alive);for(let i=0;i<70;i++)r.update(1/60,i/60);assert(!r.root.visible);r.reset();r.spawn();assert(r.root.visible);assert.equal(r.combatUnit.health,2400);console.log('PASS melee hit, stun interruption, no rifle shots, articulated hit shapes, defeat and reset',r.model.stats());
