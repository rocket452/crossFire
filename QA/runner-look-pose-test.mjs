import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){return specifier==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:nextResolve(specifier,context);}});
const THREE=await import('../dist/vendor/three.module.js'),{GLTFLoader}=await import('../dist/vendor/GLTFLoader.js'),{HumanoidCharacter}=await import('../dist/humanoid-character.js'),{RunnerLookPose,RUNNER_LOOK}=await import('../dist/runner-look-pose.js');
const bytes=fs.readFileSync(new URL('../dist/city-assets/licensed-characters/humanoid.glb',import.meta.url)),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const normal=new THREE.Vector3(0,1,0),root=new THREE.Group(),body=new HumanoidCharacter(gltf,{variant:'volt',height:2.59}),control=new HumanoidCharacter(gltf,{variant:'volt',height:2.59}),look=new RunnerLookPose();root.add(body.root);const sample=()=>body.bones.map(b=>b.quaternion.clone()),same=(a,b)=>a.every((q,i)=>q.toArray().every((v,j)=>Math.abs(v-b[i].toArray()[j])<1e-7));
for(const dt of[1/30,1/60,1/120]){
 for(const angle of[-Math.PI,-Math.PI/2,-.5,0,.5,Math.PI/2,Math.PI]){
  body.reset();control.reset();look.reset();const direction=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
  for(let i=0;i<Math.ceil(.8/dt);i++){body.update('Run',dt);control.update('Run',dt);look.update(dt,{root,normal,direction,character:body});}
  for(const n of['B_Pelvis','B_L_Thigh','B_L_Calf','B_R_Thigh','B_R_Calf']){assert(body.nodes[n].quaternion.toArray().every((v,j)=>Math.abs(v-control.nodes[n].quaternion.toArray()[j])<1e-7),'run legs/pelvis unchanged');assert(body.world(n).distanceTo(control.world(n))<1e-7);}
  const a=body.nodes.B_Spine2.getWorldQuaternion(new THREE.Quaternion()),base=control.nodes.B_Spine2.getWorldQuaternion(new THREE.Quaternion()),delta=a.normalize().multiply(base.normalize().invert()).normalize();assert(delta.angleTo(new THREE.Quaternion().setFromAxisAngle(normal,look.yaw))<1e-6,'imported spine axes produce the correct world turn');
  assert(Math.abs(look.yaw)<=RUNNER_LOOK.torsoLimit+1e-7&&Math.abs(look.headYaw)<=RUNNER_LOOK.headLimit+1e-7);if(Math.abs(angle)>1)assert(Math.abs(look.yaw)>1,'visible upper-body twist');
  body.meshes[0].computeBoundingBox();const box=body.meshes[0].boundingBox;assert(box.max.y-box.min.y<3.3&&box.max.x-box.min.x<3.3,'bounded actual weighted deformation');assert(body.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)));
 }
 body.reset();look.reset();const d=new THREE.Vector3(1,0,0);body.update('Run',dt);look.update(dt,{root,normal,direction:d,character:body});assert(look.yaw>0&&look.yaw<.8,'smooth onset');
 // The authored pose is restored on every update, so additive twist cannot accumulate.
 const poses=[];for(let i=0;i<300;i++){body.update('Run',dt,{time:.2});look.update(dt,{root,normal,direction:d,character:body});if(i>280)poses.push(sample());}assert(same(poses[0],poses.at(-1)),'no accumulated spine rotation');
 const before=look.yaw;body.update('Run',dt);look.update(dt,{root,normal,direction:new THREE.Vector3(0,0,-1),character:body});body.update('Run',dt);look.update(dt,{root,normal,direction:new THREE.Vector3(-.01,0,-1),character:body});assert(look.yaw>0&&before>0,'no side flip at the rear wrap');
 for(let i=0;i<120;i++){body.update('Run',dt);look.update(dt,{root,normal,direction:d,character:body,enabled:false});}assert(Math.abs(look.yaw)<1e-4,'CPU/exit restores neutral overlay');look.reset();assert.deepEqual(look.diagnostics(),{targetYaw:0,torsoYaw:0,headYaw:0});
 console.log('PASS',dt,'real weighted spine/head turns, independent animated legs, natural bounds, smooth onset, no accumulation/rear flip, CPU neutral/reset');
}
// Wall orientation and view parallel to body-up must remain finite and bounded.
root.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);const wallNormal=new THREE.Vector3(-1,0,0);for(const direction of[new THREE.Vector3(0,0,1),wallNormal]){body.update('Run',.1);look.update(.1,{root,normal:wallNormal,direction,character:body});assert(body.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)));assert(Number.isFinite(look.yaw));}
console.log('PASS wall-frame look and degenerate projected view');
