import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {SiegeWalker} from '../dist/siege-walker.js';
const bytes=fs.readFileSync(new URL('../dist/city-assets/siege-walker.glb',import.meta.url));
const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
const binary=bytes.subarray(28+jsonLength),scene=new THREE.Scene(),model=new THREE.Group();
for(const node of gltf.nodes){if(node.mesh===undefined)continue;const primitive=gltf.meshes[node.mesh].primitives[0],accessor=gltf.accessors[primitive.attributes.POSITION],view=gltf.bufferViews[accessor.bufferView],start=(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12,positions=new Float32Array(accessor.count*3);for(let i=0;i<accessor.count;i++)for(let axis=0;axis<3;axis++)positions[i*3+axis]=binary.readFloatLE(start+i*stride+axis*4);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());mesh.name=node.name;model.add(mesh);}
const spec=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/siege-walker.json',import.meta.url)));
let landings=0;const walker=new SiegeWalker(scene,{scene:model},spec,{onFire:()=>{},onDebris:()=>{},onEffect:()=>{},onFootfall:()=>landings++});
const target={id:'army',alive:true,kind:'tank',shapes:[{center:{x:30,y:2,z:5}}]};
let worstError=0,minGround=Infinity,maxFrameMovement=0,lockedFrames=0,flatPlants=0;const previous=new Map();
const point=new THREE.Vector3();
for(let i=0;i<=3600;i++){
 const t=i/60;
 // Exercise large target changes and repeated turns while translating.
 target.shapes[0].center={x:Math.sin(t*.47)*38,y:2,z:Math.cos(t*.47)*30};
 walker.update(i?1/60:0,t,[target]);
 let supporting=0;
 for(const foot of walker.gait.feet){
  const node=walker.nodes['foot_'+foot.side],mesh=walker.meshes['foot_'+foot.side];node.getWorldPosition(point);
  const actual=point.clone();const error=actual.distanceTo(new THREE.Vector3(foot.ankle.x,foot.ankle.y,foot.ankle.z));worstError=Math.max(worstError,error);
  if(foot.grounded)supporting++;
  if(foot.grounded&&Math.abs(foot.pitch)<1e-6){
   flatPlants++;
   const old=previous.get(foot.side);if(old?.flat&&old.anchor.x===foot.anchor.x&&old.anchor.z===foot.anchor.z){assert(actual.distanceTo(old.position)<.001,'planted foot slips while the body turns');lockedFrames++;}
  }
  const old=previous.get(foot.side);if(old)maxFrameMovement=Math.max(maxFrameMovement,actual.distanceTo(old.position));
  previous.set(foot.side,{flat:foot.grounded&&Math.abs(foot.pitch)<1e-6,position:actual,anchor:{...foot.anchor}});
  const vertices=mesh.geometry.getAttribute('position');for(let v=0;v<vertices.count;v++){point.fromBufferAttribute(vertices,v).applyMatrix4(mesh.matrixWorld);minGround=Math.min(minGround,point.y);}
 }
 assert(supporting>=1,'both feet leave the ground');
}
console.log({worstError,minGround,maxFrameMovement,lockedFrames,flatPlants,landings});
assert(worstError<.002,'leg IK must reach the rendered foot target');assert(minGround>=.10,'foot penetrates the road');assert(maxFrameMovement<.18,'step/turn has a visible pop');assert(lockedFrames>1000);assert(landings>=35&&landings<=39);
const before=walker.nodes.chest.rotation.x;walker.destroy();walker.update(0,60,[target]);assert.equal(walker.nodes.chest.rotation.x,before,'death starts at the current walking pose');
walker.reset();assert.equal(walker.gait.footfalls,0);assert(!walker.dead);assert.equal(walker.nodes.pelvis.position.x,walker.walkPose.sway);assert(walker.root.position.distanceTo(new THREE.Vector3(0,walker.walkPose.y,0))<.001);
// Rebuild must reproduce the same first step, rather than retain old planted anchors.
const first=walker.gait.feet.map(f=>({...f.ankle}));walker.update(1/60,1/60,[target]);walker.reset();assert.deepEqual(walker.gait.feet.map(f=>({...f.ankle})),first);
console.log('PASS rendered foot planting, terrain clearance, smooth steps and turns, one-foot support, death transition and deterministic reset');
for(const rate of [30,120]){
 walker.reset();
 for(let frame=1;frame<=32*rate;frame++){
  const t=frame/rate;target.shapes[0].center={x:Math.sin(t*.47)*38,y:2,z:Math.cos(t*.47)*30};walker.update(1/rate,t,[target]);
  for(const foot of walker.gait.feet){walker.nodes['foot_'+foot.side].getWorldPosition(point);assert(point.distanceTo(new THREE.Vector3(foot.ankle.x,foot.ankle.y,foot.ankle.z))<.002);}
 }
 assert.equal(walker.gait.footfalls,20);
}
console.log('PASS repeatable support and IK at 30 / 60 / 120 simulation steps per second');
