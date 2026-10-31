import assert from 'node:assert/strict';
import * as CANNON from '../dist/vendor/cannon-es.js';
import {DestructionWorld} from '../dist/destruction.js';
import {traceImpact} from '../dist/combat-collision.js';
import {RunnerMotion,terrainHeight} from '../dist/runner-motion.js';
import {RunnerDash} from '../dist/runner-dash.js';

for(const dt of[1/30,1/60,1/120,.075]){
 const world=new DestructionWorld(),c=world.addChunk({type:'wall',building:'fallen',floor:0,x:0,y:8,z:0,size:[3,4,.32]});
 world.detach(c,{x:0,y:10,z:0},.01);world.step(dt);
 assert(!c.collisionDisabled&&c.body.collisionResponse&&c.body.collisionFilterMask===-1,'airborne debris remains physical');
 const ray=()=>{const p=c.body.position;return traceImpact({x:p.x,y:p.y,z:p.z-5},{x:p.x,y:p.y,z:p.z+5},{sections:[c],ground:false});};assert.equal(ray()?.section,c);
 for(let i=0;i<Math.ceil(4/dt)&&!c.collisionDisabled;i++)world.step(dt);
 assert(c.collisionDisabled,'a real Cannon ground contact disables the fragment');assert.equal(c.state,'settled');assert.equal(c.body.collisionFilterMask,0);assert.equal(c.body.collisionResponse,false);assert(!world.dynamic.includes(c));assert.equal(world.stats().collisionlessFragments,1);assert.equal(ray(),null);assert(!c.hidden,'visual rubble is retained');
 const landed=c.body.position.clone();for(let i=0;i<Math.ceil(1/dt);i++)world.step(dt);assert(c.body.position.almostEquals(landed),'disabled fragment stays at its landing position');
 const probe=world.addWreck({position:landed,quaternion:new CANNON.Quaternion(),size:[1,1,1],mass:100});const a=[],b=[];world.world.broadphase.collisionPairs(world.world,a,b);assert(!a.includes(c.body)&&!b.includes(c.body),'physical broadphase excludes landed rubble');assert(!world.world.broadphase.aabbQuery(world.world,c.body.aabb,[]).includes(c.body));assert(probe.collisionFilterMask===-1&&probe.collisionResponse,'vehicle/robot wreck collision remains enabled');
 const motion=new RunnerMotion();motion.reset({x:landed.x-5,y:.08,z:landed.z});motion.yaw=Math.PI/2;for(let i=0;i<Math.ceil(.6/dt);i++)motion.step({forward:1,boost:true,player:true},dt,[c]);assert(motion.position.x>landed.x+5,'hero runs through visible grounded fragments');assert.equal(motion.overlapRecoveries,0);assert(Math.abs(motion.position.y-terrainHeight(motion.position.x,motion.position.z))<1e-6);
 const dashMotion=new RunnerMotion();dashMotion.reset({x:landed.x,y:.08,z:landed.z-5});const dash=new RunnerDash({getSections:()=>[c]});assert.equal(dash.plan(dashMotion,{x:0,z:1}).distance,30,'grounded debris does not shorten the rescue dash');
 world.impact(landed,100,1,c,{source:'siege-walker',player:true});assert(c.collisionDisabled&&c.state==='settled'&&!world.dynamic.includes(c),'subsequent explosions cannot reactivate decorative rubble');
 world.reset();assert(!c.collisionDisabled&&!c.hasDetached);assert.equal(c.body.collisionFilterMask,-1);assert.equal(c.body.collisionResponse,true);assert.equal(c.body.position.y,8);assert.equal(world.stats().collisionlessFragments,0);assert.equal(ray()?.section,c,'rebuild restores the original building collider');
 world.detach(c,{x:0,y:10,z:0},.01);for(let i=0;i<Math.ceil(4/dt)&&!c.collisionDisabled;i++)world.step(dt);assert(c.collisionDisabled);assert.equal(world.stats().collisionlessFragments,1,'repeat collapse has no duplicate contact effects');
 console.log('PASS',dt,'real contact → visible collisionless rubble; physics/query/run/dash exclusion; stable landing, wrecks, blast guard, rebuild and repeat collapse');
}

const slope=new DestructionWorld();slope.addTerrainPyramid({x:50,z:39,height:3.8,slopeX:.6,slopeZ:.28});const c=slope.addChunk({type:'wall',building:'slope',floor:0,x:50,y:8,z:39,size:[1,1,1]});slope.detach(c,{x:50,y:10,z:39},.01);for(let i=0;i<240&&!c.collisionDisabled;i++)slope.step(1/60);assert(c.collisionDisabled&&c.body.position.y>3,'terrain contact is recognized above the flat ground plane');
const supported=new DestructionWorld();supported.addChunk({type:'slab',building:'support',floor:0,x:0,y:3,z:0,size:[8,.3,8]});const elevated=supported.addChunk({type:'wall',building:'loose',floor:1,x:0,y:7,z:0,size:[1,1,1]});supported.detach(elevated,{x:0,y:8,z:0},.01);for(let i=0;i<360;i++)supported.step(1/60);assert(elevated.body.position.y>3&&!elevated.collisionDisabled,'a fragment resting on an elevated structure retains collision');assert(elevated.body.collisionResponse);
console.log('PASS raised terrain contact and preserved elevated-fragment collision');
