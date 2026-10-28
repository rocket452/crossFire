import assert from 'node:assert/strict';
import {BeamCycle} from '../dist/beam-cycle.js';
import {BeamCombat} from '../dist/beam-combat.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
for(const dt of [1/30,1/60,1/120,.15]){
 const clock=new BeamCycle();let integrated=0,chargeDamage=0,starts=0,ends=0;
 for(let t=0;t<18;t+=dt){const state=clock.step(dt,true);integrated+=state.damageSeconds;if(state.phase==='charging')chargeDamage+=state.damageSeconds;starts+=state.events.filter(e=>e==='firing').length;ends+=state.events.filter(e=>e==='cooling').length;}
 assert.equal(starts,1);assert.equal(ends,1);assert.equal(chargeDamage,0);assert(Math.abs(integrated-7)<1e-7);clock.stop();assert.equal(clock.step(10,true).phase,'off');assert.equal(clock.step(10,true).damageSeconds,0);clock.reset();assert.equal(clock.bursts,0);assert.equal(clock.damageClock,0);
}
const physics=new DestructionWorld({maxDynamic:8,playerReserve:4});const wall=physics.addChunk({type:'wall',building:'B1',floor:0,x:0,y:3,z:10,size:[3,4,.32]});
const tankSystem=new UnitDamage(),tank=tankSystem.add('T','tank',{}),protectedHeli=tankSystem.add('P','helicopter',{});tank.shapes=[{center:{x:0,y:3,z:20},half:{x:1.7,y:1,z:2}}];protectedHeli.shapes=[{center:{x:0,y:3,z:5},half:{x:1,y:1,z:2}}];
let impacts=0;const combat=new BeamCombat({physics,units:tankSystem,onImpact:()=>impacts++});const from={x:0,y:3,z:0},dir={x:0,y:0,z:1};
let hit=combat.update(from,dir,0,'P');assert.equal(hit.collision.section,wall);assert.equal(wall.state,'intact');assert.equal(tank.health,100,'charge does not damage targets');
combat.update(from,dir,.1,'P');assert.equal(wall.state,'dynamic');assert.equal(tank.health,100,'unbroken cover shields the tank this tick');
for(let i=0;i<4;i++)combat.update(from,dir,.1,'P');assert.equal(tank.alive,false);assert.equal(protectedHeli.health,90);assert.equal(combat.unitKills,1);assert(combat.buildingHits>=1&&impacts>=4);
// Beam activation is bounded, leaving half the player reservation for manual missiles.
const budget=new DestructionWorld({maxDynamic:8,playerReserve:4});const pieces=[];for(let i=0;i<8;i++)pieces.push(budget.addChunk({type:'wall',building:'B',floor:0,x:i*8,y:8,z:0,size:[2,2,.3]}));
for(let i=0;i<4;i++)budget.detach(pieces[i],{x:i*8,y:8,z:-1},2);
for(let i=4;i<7;i++)budget.impact({x:i*8,y:8,z:0},35,.2,pieces[i],{beam:true});assert.equal(budget.dynamic.length,6);assert.equal(pieces[6].state,'intact');budget.impact({x:56,y:8,z:0},18,.2,pieces[7],{player:true});assert.equal(pieces[7].state,'dynamic');assert.equal(budget.dynamic.length,7);
combat.reset();physics.reset();assert.equal(combat.unitKills,0);assert.equal(wall.state,'intact');
console.log('PASS charge isolation, exact seven-second damage at 30/60/120Hz and long frames, cover breach, high sustained unit damage, pilot protection, beam debris cap and reserved player capacity');
