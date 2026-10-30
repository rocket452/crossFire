import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
import {SiegeWalker} from '../dist/siege-walker.js';
import {SiegeWeakPoints,WEAK_POINTS} from '../dist/weak-points.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
const bytes=fs.readFileSync('dist/city-assets/siege-walker.glb'),spec=JSON.parse(fs.readFileSync('dist/city-assets/siege-walker.json'));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const robot=new SiegeWalker(new THREE.Scene(),gltf,spec,{onEffect:()=>{}}),damage=new UnitDamage(()=>robot.destroy());damage.add('siege-walker','robot',robot,14400);
let seed=41,completes=0;const weak=new SiegeWeakPoints(robot,{random:()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;},onComplete:({burst,seconds})=>{completes++;robot.stun(seconds,'weakpoint');return damage.hurt(robot.combatUnit,burst);}});
for(let n=0;n<100;n++){
 weak.reset();assert.equal(weak.points.length,4);assert.equal(new Set(weak.points.map(p=>p.region)).size,4);
 for(const p of weak.points){const center=p.root.getWorldPosition(new THREE.Vector3()),from=center.clone().add(new THREE.Vector3(0,0,16)),hit=weak.trace(from,center,.1);assert.equal(hit?.weakPoint,p);const body=traceImpact(from,center,{targets:[{...robot.combatUnit,shapes:robot.shapes()}]});assert(!body||hit.t<body.t,'core projects outside armor collision');}
 const points=weak.points.map(p=>p.location);robot.nodes.forearm_l.rotation.x+=.15;weak.update(.01,1);assert(weak.points.every(p=>p.root.parent===robot.nodes[p.part]));robot.reset();
}
weak.reset();const original=robot.combatUnit.health;
assert.equal(weak.hurt(weak.points[0],60,{player:true}),60);assert.equal(weak.points[0].health,120);assert.equal(robot.combatUnit.health,original);
for(const p of weak.points.slice(0,3))weak.hurt(p,1000,{player:false});const final=weak.points[3];assert(final.final);assert.equal(weak.remaining,1);assert.equal(weak.hurt(final,10000),0);
for(let n=0;n<600;n++)weak.update(.5,n*.5);assert.equal(weak.remaining,1);assert.equal(weak.phase,'active');assert.equal(final.health,180);assert.equal(completes,0);
weak.hurt(final,180,{player:true});assert.equal(completes,1);assert.equal(original-robot.combatUnit.health,1152);assert.equal(robot.stunRemaining,5);assert.equal(weak.hurt(final,180,{player:true}),0);assert.equal(completes,1);
const position=robot.root.position.clone(),pose=robot.nodes.chest.quaternion.clone();robot.update(.25,1,[]);assert(robot.nodes.chest.quaternion.angleTo(pose)>.2);assert(robot.root.position.equals(position));
for(let n=0;n<285;n++){robot.update(1/60,n/60,[]);weak.update(1/60,n/60);}assert.equal(robot.stunRemaining,0);assert.equal(weak.phase,'cooldown');assert(Math.abs(weak.cooldownRemaining-12)<.02);assert(robot.nodes.chest.quaternion.angleTo(pose)<1e-6);
weak.update(11.9,10);assert.equal(weak.phase,'cooldown');robot.stun(1);weak.update(1,11);assert.equal(weak.phase,'cooldown');robot.update(1,11,[]);weak.update(.11,11);assert.equal(weak.phase,'active');assert.equal(weak.cycle,2);assert.equal(weak.remaining,4);
const stale=final;assert.equal(weak.hurt(stale,999,{player:true}),0);damage.hurt(robot.combatUnit,20000);weak.update(1,12);assert.equal(weak.phase,'dead');assert(weak.points.every(p=>!p.root.visible));assert.equal(weak.trace({x:0,y:10,z:20},{x:0,y:10,z:0}),null);
damage.reset();robot.reset();weak.reset();assert.equal(weak.remaining,WEAK_POINTS.count);assert.equal(weak.completions,0);assert.equal(weak.totalBurst,0);assert(!robot.staggerPose);
console.log('PASS 100 randomized real-model cycles, four regions, exposed collision and articulated sockets; own HP; AI final protection; indefinite hold; one 1152 burst; animated five-second movement lock; restored pose; 12s reset and external stun pause; stale/dead/reset safety');
