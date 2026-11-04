import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {Argus} from '../dist/argus.js';
import {EnergyBeamEffect} from '../dist/energy-beam.js?v=runner-6';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {gltfModel,spec} from './argus-fixture.mjs';
function setup(hz=60){const scene=new THREE.Scene(),physics=new DestructionWorld(),c=JSON.parse(fs.readFileSync('dist/argus-config.json'));c.spawn={x:36,z:54,yaw:Math.PI};c.movement.speed=0;for(const k of['flak','pylons','lance'])c.attacks[k].enabled=false;let b,t=0,hits=0;const barriers=[],damage=new UnitDamage(u=>b.disable(u)),mission=new ConvoyMission(scene,damage,JSON.parse(fs.readFileSync('dist/convoy-config.json'))),root=new THREE.Group();root.position.set(36,.08,30);const hero={root,enabled:true,active:true,motion:{mode:'ground'}};b=new Argus(scene,damage,gltfModel,spec,c,{physics,getConvoy:()=>mission,getHeroes:()=>[hero],getBarriers:()=>barriers,onHeroHit:()=>hits++});b.attacks.begin('lance',hero);return{b,physics,hero,barriers,get hits(){return hits;},step(n=1){for(let i=0;i<n;i++){t+=1/hz;b.update(1/hz,t);b.attacks.afterHeroes(1/hz);physics.step(1/hz);}},fire(){for(let i=0;i<hz*4&&b.attacks.active.stage!=='firing';i++)this.step();assert.equal(b.attacks.active.stage,'firing');},wall(durable=false){const from=b.attacks.muzzle('lance'),p=from.clone().lerp(root.position.clone().add(new THREE.Vector3(0,1.2,0)),.5),wall=physics.addChunk({type:'wall',building:'beam-cover',floor:0,x:p.x,y:p.y,z:p.z,size:[8,12,.32]});for(let i=0;i<4;i++)physics.addChunk({type:'wall',building:'beam-cover',floor:0,x:120+i*10,y:4,z:120,size:[2,4,.32]});if(durable)wall.hp=wall.maxHp=10000;return wall;}};}
for(const hz of[30,60,120]){
 const f=setup(hz),{b}=f;f.step(Math.round(hz));assert(b.attacks.beamEffect instanceof EnergyBeamEffect);assert.equal(b.attacks.beamEffect.phase,'charging');assert(b.attacks.beamEffect.telegraph.root.visible);assert(!b.attacks.beamEffect.tubes.visible);assert.equal(f.physics.impacts,0);assert.equal(f.hits,0);f.fire();assert(b.attacks.beamEffect.layers.length===4);assert(b.attacks.beamEffect.tubes.visible);const wall=f.wall(true),hp=wall.hp;f.step(Math.round(hz*.4));assert.equal(hp-wall.hp,140);assert.equal(b.attacks.stats.buildingHits,4);assert(wall.scorch>0);assert.equal(f.hits,0,'durable cover protects hero');b.attacks.cancel();assert(!b.attacks.beamEffect.root.visible);assert(!b.attacks.beamEffect.telegraph.root.visible);console.log('PASS',hz+'Hz','shared Walker VFX/charge isolation, exact 35 damage per 100ms, scorch, cover and cancellation');
}
{
 const f=setup(),{b}=f;f.fire();const wall=f.wall();f.step(7);assert(wall.hasDetached);assert.equal(wall.hp,0);f.step(6);assert(f.hits>0,'detached wall no longer blocks beam');assert(b.attacks.beamEffect.tubes.visible);const hp=b.combatUnit.health;b.stun(1,'test');f.step(2);assert.equal(b.combatUnit.health,hp);assert(!b.attacks.beamEffect.root.visible);b.reset();assert.equal(b.attacks.stats.buildingHits,0);assert.equal(b.attacks.beamEffect.phase,'off');console.log('PASS real wall breach, beam advances past rubble, boss safety, stun and reset');
}
{
 const f=setup(),{b}=f;f.fire();const wall=f.wall(true),hp=wall.hp;f.barriers.push({active:true,strength:1000,trace:()=>.01,onHit(){}});f.step(12);assert.equal(wall.hp,hp);assert.equal(b.attacks.stats.buildingHits,0);assert.equal(f.hits,0);assert(b.attacks.stats.blocked>0);console.log('PASS barrier intercept prevents downstream building and hero damage');
}
