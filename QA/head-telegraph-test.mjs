import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {SiegeWalker} from '../dist/siege-walker.js';
const bytes=fs.readFileSync(new URL('../dist/city-assets/siege-walker.glb',import.meta.url));
const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
const binary=bytes.subarray(28+jsonLength),scene=new THREE.Scene(),model=new THREE.Group();
for(const node of gltf.nodes){if(node.mesh===undefined)continue;const primitive=gltf.meshes[node.mesh].primitives[0],accessor=gltf.accessors[primitive.attributes.POSITION],view=gltf.bufferViews[accessor.bufferView],start=(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12,positions=new Float32Array(accessor.count*3);for(let i=0;i<accessor.count;i++)for(let axis=0;axis<3;axis++)positions[i*3+axis]=binary.readFloatLE(start+i*stride+axis*4);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());mesh.name=node.name;model.add(mesh);}
const spec=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/siege-walker.json',import.meta.url)));

import {beamWarningPlan,warningEndpoint,BEAM_SWEEP} from '../dist/beam-aim.js';
import {BeamTelegraph} from '../dist/beam-telegraph.js';
let payload=null,warning=null;
const walker=new SiegeWalker(scene,{scene:model},spec,{onFire:()=>{},onDebris:()=>{},onEffect:()=>{},onBeam:p=>payload=p});
const target={id:'target',alive:true,kind:'tank',shapes:[]};
for(const position of [{x:30,y:2,z:30},{x:-30,y:2,z:30},{x:8,y:34,z:28}]){
 walker.reset();target.shapes=[{center:position}];let previous=0;
 for(let i=1;i<=150;i++){
  walker.update(1/60,i/60,[target]);
  assert(Math.abs(walker.nodes.head.rotation.x-previous)<=2.5/60+1e-8,'neck snaps');previous=walker.nodes.head.rotation.x;
 }
 const gaze=walker.gazeDiagnostics();assert(gaze.errorDegrees<2.5,'head does not face intended target');
 assert(position.y>25?gaze.pitch<-.15:gaze.pitch>.15,'head must look up / down');
 assert(Math.abs(gaze.yaw)<=1.15&&gaze.pitch>=-.65&&gaze.pitch<=.90);
}
walker.reset();target.shapes=[{center:{x:-44,y:1.15,z:-26.8}}];
let chargingFrames=0,beamStarted=false;
for(let i=1;i<=450;i++){
 walker.update(1/60,i/60,[target]);
 if(payload?.state.phase==='charging'){
  chargingFrames++;warning=payload.plan;const center=payload.plan.rays[1];assert.equal(payload.state.damageSeconds,0);
  const distance=Math.hypot(center.from.x-payload.from.x,center.from.y-payload.from.y,center.from.z-payload.from.z);
  assert(distance<.001,'preview must start at the physical cannon muzzle');
  assert(center.direction.x*payload.direction.x+center.direction.y*payload.direction.y+center.direction.z*payload.direction.z>1-1e-8,'preview does not match actual barrel axis');
  assert.deepEqual(payload.plan.target,walker.beamAim);
  assert.equal(payload.plan.rays[0].angle,-BEAM_SWEEP);assert.equal(payload.plan.rays[2].angle,BEAM_SWEEP);
  assert(payload.plan.rays.every(r=>Object.values(r.end).every(Number.isFinite)));
  if(payload.state.charge>.5)assert(walker.gazeDiagnostics().errorDegrees<2.5);
 }
 if(payload?.state.phase==='firing'){assert.equal(payload.plan,null);beamStarted=true;}
}
assert(chargingFrames>180&&beamStarted);
const aerial=warningEndpoint({x:0,y:20,z:0},{x:0,y:.6,z:.8});assert.equal(aerial.y,104);assert.equal(aerial.z,112);
walker.destroy();assert.equal(payload,null);walker.reset();assert.equal(walker.gazeTarget,null);assert.equal(walker.beamSweepOrigin,null);
console.log('PASS up/down/lateral head tracking, neck smoothing/limits, real muzzle-aligned warning rays, locked target/sweep, harmless charge, aerial range and lifecycle cleanup');

const overlay=new BeamTelegraph(scene);overlay.update(warning,.85,6.5);assert(overlay.root.visible);
const centerRay=warning.rays[1];overlay.root.updateMatrixWorld(true);
const a=new THREE.Vector3(0,-.5,0).applyMatrix4(overlay.rays[1].matrixWorld),b=new THREE.Vector3(0,.5,0).applyMatrix4(overlay.rays[1].matrixWorld);
assert(a.distanceTo(new THREE.Vector3(centerRay.from.x,centerRay.from.y,centerRay.from.z))<.001);
assert(b.distanceTo(new THREE.Vector3(centerRay.end.x,centerRay.end.y,centerRay.end.z))<.001);
const edge=new THREE.Vector3().fromBufferAttribute(overlay.fan.geometry.getAttribute('position'),0);
assert(Math.abs(edge.distanceTo(new THREE.Vector3(warning.rays[0].from.x,warning.rays[0].from.y,warning.rays[0].from.z))-warning.radius)<.001);
assert.equal(overlay.fan.material.depthTest,false);overlay.clear();assert(!overlay.root.visible);assert.equal(overlay.plan,null);
console.log('PASS actual red warning geometry endpoints, beam-radius padding, through-cover visibility and complete removal');
