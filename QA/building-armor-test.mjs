import assert from 'node:assert/strict';
import {DestructionWorld,NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER} from '../dist/destruction.js';
const add=(w,type='wall',x=0,floor=0)=>w.addChunk({type,building:'B',floor,x,y:floor*3+12,z:0,size:[2.5,2.72,.32]});
assert.equal(NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER,.1);
for(const source of [null,undefined,'unknown','tank-0-0','helicopter-1-1','infantry-0-3','volt-rush','violet-sentinel','rift-warden','siege-walker'])for(const type of ['wall','slab','column']){
 const w=new DestructionWorld(),direct=add(w,type),splash=add(w,type,2),debris=add(w,type,1);w.detach(debris,{x:0,y:12,z:0},0);const mult=source==='siege-walker'?1:.1;
 const original=[direct,splash,debris].map(c=>c.hp);w.impact({x:0,y:12,z:0},1,3,direct,{source,player:true});
 assert(Math.abs(original[0]-direct.hp-mult)<1e-9,'direct damage scales once for '+source);
 const reach=3+2.72*.25,falloff=1-2/(reach+.1);assert(Math.abs(original[1]-splash.hp-mult*falloff)<1e-9,'splash retains falloff for '+source);
 const debrisFalloff=1-1/(3+.1);assert(Math.abs(original[2]-debris.hp-mult*debrisFalloff)<1e-9,'detached body damage scales once for '+source);assert([direct,splash,debris].every(c=>c.scorch>0));
 w.reset();w.damageChunk(direct,2,{source});assert(Math.abs(direct.maxHp-direct.hp-2*mult)<1e-9,'direct health API also enforces policy');w.reset();assert([direct,splash,debris].every(c=>c.hp===c.maxHp&&c.scorch===0&&c.state==='intact'));
}
for(const flags of [{player:true},{beam:true},{player:true,beam:true}]){const w=new DestructionWorld(),c=add(w);w.impact(c.body.position,1,.01,c,flags);assert(Math.abs(c.maxHp-c.hp-.1)<1e-9,'activation priority cannot bypass source-based armor');}
const build=()=>{const w=new DestructionWorld();for(const x of [-3,3])for(const z of [-3,3])w.addChunk({type:'column',building:'B',floor:0,x,y:12,z,size:[.48,2.72,.48]});const roof=w.addChunk({type:'wall',building:'B',floor:1,x:0,y:15,z:0,size:[2.5,2.72,.32]});return{w,roof};};
const ordinary=build();for(const c of ordinary.w.chunks.slice(0,2))ordinary.w.impact(c.body.position,40,.1,c);assert.equal(ordinary.w.collapses,0);assert(!ordinary.w.pending.has(ordinary.roof));assert(ordinary.w.chunks.slice(0,2).every(c=>c.hp>0));
const robot=build();for(const c of robot.w.chunks.slice(0,2))robot.w.impact(c.body.position,40,.1,c,{source:'siege-walker'});assert.equal(robot.w.collapses,1);assert(robot.w.pending.has(robot.roof));
console.log('PASS 90% damage reduction for all non-robot sources across wall/slab/column direct, splash and debris paths; exact full robot damage; no priority bypass or double scaling; scorch/reset; robot-caused support collapse remains physical');
