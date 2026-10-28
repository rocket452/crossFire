import assert from 'node:assert/strict';
import {DestructionWorld,BUILDING_DURABILITY_MULTIPLIER,NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER} from '../dist/destruction.js';
const spec=(type='wall',x=0)=>({type,building:type+x,floor:0,x,y:12,z:0,size:[2.5,2.72,.32]});
const changed=[],world=new DestructionWorld({onDamage:c=>changed.push(c)});
assert.equal(BUILDING_DURABILITY_MULTIPLIER,1.3);assert.equal(NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER,.1);
for(const [type,base] of [['wall',4],['slab',6],['column',10]]){
 const c=world.addChunk(spec(type,world.chunks.length*10));
 assert.equal(c.maxHp,base*1.3);assert.equal(c.hp,c.maxHp);
 // A hit exceeding the old health survives with the new 30% increase.
 world.damageChunk(c,base*1.1,{source:'siege-walker'});assert(c.hp>0);assert(c.scorch>.24);
}
world.reset();assert(world.chunks.every(c=>c.hp===c.maxHp&&c.scorch===0));
const c=world.chunks[0],at={x:0,y:12,z:0};
world.impact(at,4.5,.01,c,{player:true});assert.equal(c.state,'intact');assert(Math.abs(c.hp-4.75)<1e-9);assert(!world.pending.has(c));assert(changed.includes(c));
const scorch=c.scorch;world.impact(at,.2,.01,c);assert(c.scorch>scorch);assert(Math.abs(c.hp-4.73)<1e-9,'direct damage applies exactly once');
world.impact(at,50,.01,c,{player:true});assert.equal(c.state,'dynamic');assert.equal(c.hp,0);assert.equal(c.scorch,.72);
world.freeze(c);world.impact(at,1,.01,c,{player:true});assert.equal(c.state,'dynamic');assert.equal(c.scorch,.72,'re-hitting debris never brightens it');
world.reset();const neighbor=world.addChunk(spec('wall',2));
world.impact(at,1,2,null);assert(c.hp<c.maxHp&&neighbor.hp<neighbor.maxHp);assert(c.scorch>0&&neighbor.scorch>0);assert.equal(c.state,'intact');
const expected=5.2-.1*(1-2/(2+2.72*.25+.1));assert(Math.abs(neighbor.hp-expected)<1e-9,'splash retains distance falloff');
world.reset();assert(world.chunks.every(c=>c.hp===c.maxHp&&c.scorch===0));
console.log('PASS 90% non-robot reduction, full robot damage, +30% health for every section, nonlethal direct/splash damage, progressive persistent scorch, no double damage, debris re-hit and reset');
