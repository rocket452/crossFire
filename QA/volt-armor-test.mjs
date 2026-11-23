import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {HumanoidCharacter} from '../dist/humanoid-character.js';
import {RunnerMotion} from '../dist/runner-motion.js';
import {RunnerAnimator} from '../dist/runner-animation.js';
import {RunnerLookPose} from '../dist/runner-look-pose.js';
import {HeroHurt} from '../dist/hero-hurt.js';

registerHooks({resolve(name, context, next){
 return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,context);
}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
globalThis.window={document:{documentElement:{dataset:{}}},navigator:{},addEventListener(){},
 matchMedia:query=>({matches:query.includes('fine'),addEventListener(){}})};
const {Speedster}=await import('../dist/speedster.js');
const assetRoot=new URL('../dist/city-assets/',import.meta.url);
async function load(path){
 const data=fs.readFileSync(new URL(path,assetRoot));
 return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
}
const [classic,armor]=await Promise.all(['humanoid','volt-armored'].map(name=>load('licensed-characters/'+name+'.glb')));
assert.equal(armor.animations.length,17);
for(const [i,clip] of armor.animations.entries()){
 const original=classic.animations[i];
 assert.equal(clip.name,original.name);
 assert.equal(clip.duration,original.duration);
 assert.equal(clip.tracks.length,original.tracks.length);
 for(const [j,track] of clip.tracks.entries()){
  assert.equal(track.name,original.tracks[j].name);
  assert.deepEqual(track.times,original.tracks[j].times);
  assert.deepEqual(track.values,original.tracks[j].values);
 }
}
const spec=JSON.parse(fs.readFileSync(new URL('volt-runner.json',assetRoot)));
const character=new HumanoidCharacter(armor,{variant:'volt',height:spec.height});
assert(character.metadata.preserveMaterials);
assert.equal(character.bones.length,53);
assert(character.triangles>=1500&&character.triangles<3500);
assert(character.meshes.some(m=>m.material.name==='charged lens'&&m.material.emissiveIntensity>2));
const stock=new HumanoidCharacter(classic,{variant:'volt',height:spec.height});
for(const part of character.meshes){
 const a=part.geometry.attributes;
 for(let i=0;i<a.position.count;i++){
  const weights=[a.skinWeight.getX(i),a.skinWeight.getY(i),a.skinWeight.getZ(i),a.skinWeight.getW(i)];
  assert(Math.abs(weights.reduce((s,w)=>s+w,0)-1)<1e-6);
  assert(a.skinIndex.getX(i)<53&&a.skinIndex.getY(i)<53);
 }
 assert.deepEqual(part.skeleton.boneInverses.map(m=>m.elements),stock.meshes[0].skeleton.boneInverses.map(m=>m.elements));
}
const actor=Object.assign(Object.create(Speedster.prototype),{
 root:new THREE.Group(),character,motion:new RunnerMotion(),bodyUp:new THREE.Vector3(),bodyForward:new THREE.Vector3(),
 nodes:{},lookPose:new RunnerLookPose(),dash:{active:false},critical:{stunned:false,charging:false},
 welder:{active:false},active:true,firing:false,charging:false,yaw:0,pitch:0
});
actor.camera=new THREE.PerspectiveCamera(65,1,.08,450);
actor.camera.position.set(0,3,-6);
actor.motion.reset({x:0,y:0,z:0});
actor.motion.yaw=0;
for(const p of spec.parts){
 const n=new THREE.Group();
 const base=p.parent?spec.parts.find(q=>q.name===p.parent).pivot:[0,0,0];
 n.position.copy(new THREE.Vector3(...p.pivot).sub(new THREE.Vector3(...base)));
 (p.parent?actor.nodes[p.parent]:actor.root).add(n);
 actor.nodes[p.name]=n;
}
actor.root.add(character.root);
actor.animator=new RunnerAnimator(actor.root,actor.nodes);
actor.hurt=new HeroHurt(character,actor.root);
const views={};
function verify(label){
 actor.root.updateMatrixWorld(true);
 const box=new THREE.Box3();
 for(const mesh of character.meshes){
  mesh.computeBoundingBox();
  box.union(mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
 }
 assert(box.getSize(new THREE.Vector3()).length()<4.2,label+' armor bounds');
 for(const side of ['L','R']){
  const bone=character.nodes['B_'+side+'_Hand'],muzzle=character.hand(side);
  let nearest=Infinity;
  for(const mesh of character.meshes){
   const boneIndex=mesh.skeleton.bones.indexOf(bone),indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
   for(let i=0;i<indices.count;i++){
    const handWeight=indices.getX(i)===boneIndex?weights.getX(i):indices.getY(i)===boneIndex?weights.getY(i):0;
    if(handWeight>.55)nearest=Math.min(nearest,mesh.localToWorld(mesh.getVertexPosition(i,new THREE.Vector3())).distanceTo(muzzle));
   }
  }
  assert(nearest<.13,label+' '+side+' gauntlet aligned with the real lightning origin ('+nearest+')');
 }
 if(process.env.VOLT_POSES)views[label]=character.meshes.map(m=>({
  color:m.material.color.toArray(),emissive:m.material.emissive.toArray(),strength:m.material.emissiveIntensity,
  vertices:Array.from({length:m.geometry.attributes.position.count},(_,i)=>m.localToWorld(m.getVertexPosition(i,new THREE.Vector3())).toArray())
 }));
}
for(let i=0;i<20;i++)actor.pose(1/60);
assert.equal(character.current,'Idle');verify('Idle');
actor.motion.speed=19;actor.motion.velocity.z=19;
for(let i=0;i<23;i++)actor.pose(1/60);
assert.equal(character.current,'Run');verify('Run');
actor.motion.mode='air';actor.motion.velocity.y=12;
for(let i=0;i<14;i++)actor.pose(1/60);
assert.equal(character.current,'Jump');verify('Jump');
actor.motion.mode='ground';actor.motion.speed=0;actor.motion.velocity={x:0,y:0,z:0};
actor.firing=true;
for(let i=0;i<15;i++)actor.pose(1/60);
actor.nodes.upperarm_r.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1));
actor.root.updateMatrixWorld(true);
character.syncArms(actor.nodes);
verify('Lightning');
actor.firing=false;
actor.critical.charging=true;actor.critical.charge=1.9;
actor.pose(0);actor.massPose(0,.4);verify('Charge');
actor.critical.charging=false;
actor.hurt.hit();actor.hurt.step(.10);actor.pose(.10);verify('Hurt');
if(process.env.VOLT_POSES)fs.writeFileSync(process.env.VOLT_POSES,JSON.stringify(views));
console.log('PASS Volt armor 53 weighted joints and 17 identical clips, visible gauntlet alignment and real idle/run/jump/lightning/charge/hurt poses');
