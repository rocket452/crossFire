import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {RunnerAnimator} from '../dist/runner-animation.js';
import {RunnerAI} from '../dist/runner-ai.js';
import {RunnerMotion} from '../dist/runner-motion.js';
import {traceImpact} from '../dist/combat-collision.js';
const bytes=fs.readFileSync(new URL('../dist/city-assets/volt-runner.glb',import.meta.url)),n=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+n).toString()),bin=bytes.subarray(28+n),root=new THREE.Group(),nodes={},meshes={};
const spec=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/volt-runner.json',import.meta.url)));assert.equal(spec.triangles,1760);assert.equal(spec.parts.length,15);
for(const p of spec.parts){const gn=gltf.nodes.find(n=>n.name===p.name),a=gltf.accessors[gltf.meshes[gn.mesh].primitives[0].attributes.POSITION],v=gltf.bufferViews[a.bufferView],start=(a.byteOffset||0)+(v.byteOffset||0),stride=v.byteStride||12,positions=new Float32Array(a.count*3);for(let i=0;i<a.count;i++)for(let k=0;k<3;k++)positions[i*3+k]=bin.readFloatLE(start+i*stride+k*4);const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3));geo.translate(-p.pivot[0],-p.pivot[1],-p.pivot[2]);const node=new THREE.Group(),mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial());node.add(mesh);const parentPivot=p.parent?spec.parts.find(q=>q.name===p.parent).pivot:[0,0,0];node.position.set(...p.pivot.map((x,i)=>x-parentPivot[i]));(p.parent?nodes[p.parent]:root).add(node);nodes[p.name]=node;meshes[p.name]=mesh;}
const animator=new RunnerAnimator(root,nodes),motion={speed:0,mode:'ground',velocity:{x:0,y:0,z:0}};let maxError=0,minSole=Infinity,lastPhase=0;
for(let i=0;i<900;i++){
 const dt=1/60,speed=i<100?0:i<300?14:i<600?46:0;motion.speed=speed;motion.velocity.z=speed;motion.mode=i>=450&&i<480?'air':'ground';animator.update(dt,motion);assert(animator.phase>=lastPhase);assert(animator.phase-lastPhase<=Math.PI*2*4.5*dt+.001);lastPhase=animator.phase;
 for(const foot of animator.feet){const node=nodes['foot_'+foot.side],target=root.localToWorld(new THREE.Vector3(...foot.target));maxError=Math.max(maxError,node.getWorldPosition(new THREE.Vector3()).distanceTo(target));const mesh=meshes['foot_'+foot.side],a=mesh.geometry.getAttribute('position');for(let j=0;j<a.count;j++)minSole=Math.min(minSole,new THREE.Vector3().fromBufferAttribute(a,j).applyMatrix4(mesh.matrixWorld).y);}
}
assert(maxError<.003);assert(minSole>=.005);assert(animator.runBlend<.01);assert(animator.speed<.01);
root.rotation.z=Math.PI/2;for(let i=0;i<120;i++){motion.speed=30;motion.mode='wall';animator.update(1/60,motion);assert(nodes.foot_l.quaternion.toArray().every(Number.isFinite));}
animator.reset();assert.equal(animator.phase,0);assert.equal(animator.airBlend,0);
console.log('PASS actual 15-part Blender rig, continuous stride during acceleration/braking, separate ankle solves, sole clearance, airborne/wall poses and reset',{maxError,minSole});
// Exercise the CPU through the same physics/controller inputs in a real city layout.
const layout=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url))),sections=[];
for(const b of layout.buildings)for(let f=0;f<b.floors;f++){
 for(let side=0;side<4;side++)for(let j=0;j<4;j++){const a=side*Math.PI/2,u=(j-1.5)*2.5;sections.push({state:'intact',size:[2.5,2.72,.32],body:{position:{x:b.x+5*Math.sin(a)+u*Math.cos(a),y:f*3+1.5,z:b.z+5*Math.cos(a)-u*Math.sin(a)},quaternion:{x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)}}});}
 for(let x=0;x<3;x++)for(let z=0;z<3;z++)sections.push({state:'intact',size:[10/3,.28,10/3],body:{position:{x:b.x+(x-1)*10/3,y:(f+1)*3,z:b.z+(z-1)*10/3},quaternion:{x:0,y:0,z:0,w:1}}});
}
const cpu=new RunnerAI(),movement=new RunnerMotion(),target={x:0,y:13,z:0};let fired=0;
for(let i=0;i<1800;i++){const decision=cpu.update(1/60,{motion:movement,robotAlive:true,target,canShoot:()=>!traceImpact({x:movement.position.x,y:movement.position.y+1.65,z:movement.position.z},target,{sections,ground:false})});movement.yaw=decision.yaw;movement.step(decision.input,1/60,sections);if(decision.fire)fired++;}
console.log({cpu:cpu.diagnostics(),motion:movement.diagnostics(),fired});assert(cpu.distance>80);assert(cpu.bursts>=2);assert(fired>60);assert(movement.climbs>=1&&movement.roofs>=1);
const position={...movement.position},bursts=cpu.bursts;cpu.suspend();for(let i=0;i<60;i++)assert(!cpu.update(1/60,{motion:movement,robotAlive:true,target,canShoot:()=>true}).fire);assert.equal(cpu.bursts,bursts);assert.deepEqual(movement.position,position);cpu.resume(position);assert(!cpu.suspended);assert.equal(cpu.mode,'patrol');
for(let i=0;i<200;i++)assert(!cpu.update(1/60,{motion:movement,robotAlive:false,target,canShoot:()=>false}).fire);
console.log('PASS CPU city patrol, super-speed traversal, facade/roof use, aimed bursts, player override/resume without teleport and ceasefire on robot defeat');
