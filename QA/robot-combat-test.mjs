import assert from 'node:assert/strict';
import fs from 'node:fs';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
const spec=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/siege-walker.json',import.meta.url)));
assert.equal(spec.height,21);assert(spec.triangles<=5000);assert.equal(spec.parts.length,18);
const seen=new Set();for(const p of spec.parts){assert(!seen.has(p.name));if(p.parent)assert(seen.has(p.parent),'parent is created first');assert(p.pivot.every(Number.isFinite));seen.add(p.name);}
const bytes=fs.readFileSync(new URL('../dist/city-assets/siege-walker.glb',import.meta.url));
assert.equal(bytes.toString('utf8',0,4),'glTF');const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
for(const p of spec.parts)assert(gltf.nodes.some(n=>n.name===p.name));
const events=[],system=new UnitDamage(u=>events.push(u.id)),robot=system.add('siege-walker','robot',{},14400),tank=system.add('tank','tank',{});
robot.shapes=[{center:{x:0,y:13,z:0},half:{x:3,y:2,z:1.6}}];tank.shapes=[{center:{x:1,y:13,z:0},half:{x:1,y:1,z:1}}];
const hit=traceImpact({x:0,y:13,z:20},{x:0,y:13,z:-20},{targets:[robot]});assert.equal(hit.unit,robot);
system.blast(hit.point,{direct:robot,power:80,filter:u=>u.kind==='robot'});assert.equal(robot.health,14320);assert.equal(tank.health,100,'allied tank is protected');
assert.equal(system.hurt(robot,2.2,hit.point),2.2);assert(robot.health<14320);
system.hurt(robot,20000,hit.point);assert(!robot.alive);assert.deepEqual(events,['siege-walker']);system.hurt(robot,100,hit.point);assert.equal(events.length,1);
system.reset();assert(robot.alive&&robot.health===14400);assert.equal(system.damageEvents,0);
console.log('PASS robot GLB hierarchy/triangle budget, swept target collision, rifle/shell armor damage, ally protection, single destruction event and rebuild');
