import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {VioletHero} from '../dist/violet-hero.js';

registerHooks({resolve(name,context,next){
 return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,context);
}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const root=new URL('../dist/city-assets/',import.meta.url);
const load=async path=>{
 const bytes=fs.readFileSync(new URL(path,root));
 return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
};
const [classic,armor,legacy]=await Promise.all([
 load('licensed-characters/humanoid.glb'),load('licensed-characters/violet-armored.glb'),load('violet-sentinel.glb')
]);
const spec=JSON.parse(fs.readFileSync(new URL('violet-sentinel.json',root)));
assert.equal(armor.animations.length,17);
for(const [i,clip] of armor.animations.entries()){
 const original=classic.animations[i];
 assert.equal(clip.name,original.name);
 assert.equal(clip.duration,original.duration);
 for(const [j,track] of clip.tracks.entries()){
  assert.equal(track.name,original.tracks[j].name);
  assert.deepEqual(track.times,original.tracks[j].times);
  assert.deepEqual(track.values,original.tracks[j].values);
 }
}
const hero=new VioletHero(new THREE.Scene(),legacy,spec,{
 characterModel:armor,getRobot:()=>null,traceOrb:()=>null,onOrbHit:()=>0
});
const c=hero.character;
assert(c.metadata.preserveMaterials);
assert.equal(c.bones.length,53);
assert(c.triangles>1900&&c.triangles<3600);
assert(c.meshes.some(mesh=>mesh.material.name==='cape'&&mesh.material.side===THREE.DoubleSide));
assert(c.meshes.some(mesh=>mesh.material.name==='charged lens'&&mesh.material.emissiveIntensity>2));
assert(Object.values(hero.meshes).every(mesh=>!mesh.visible),'no legacy cape, eyes or shell overlap the new armor');
for(const mesh of c.meshes){
 const {skinIndex,skinWeight}=mesh.geometry.attributes;
 for(let i=0;i<skinWeight.count;i++){
  assert(Math.abs(skinWeight.getX(i)+skinWeight.getY(i)+skinWeight.getZ(i)+skinWeight.getW(i)-1)<1e-6);
  assert(skinIndex.getX(i)<53&&skinIndex.getY(i)<53);
 }
}
const handDistance=(side)=>{
 const hand=c.hand(side),bone=c.nodes['B_'+side+'_Hand'];
 let best=Infinity;
 for(const mesh of c.meshes){
  const index=mesh.skeleton.bones.indexOf(bone),{skinIndex,skinWeight}=mesh.geometry.attributes;
  for(let i=0;i<skinIndex.count;i++){
   const w=skinIndex.getX(i)===index?skinWeight.getX(i):skinIndex.getY(i)===index?skinWeight.getY(i):0;
   if(w>=.55)best=Math.min(best,mesh.localToWorld(mesh.getVertexPosition(i,new THREE.Vector3())).distanceTo(hand));
  }
 }
 return best;
};
for(const velocity of [new THREE.Vector3(),new THREE.Vector3(12,3,4)]){
 hero.flightPose.step(1/60,velocity,.8,{raised:true});
 hero.flightPose.applyVisual(hero.root,hero.visual);
 hero.pose(.2);
 hero.flightPose.applyCharacter(c,hero.nodes,1/60,-.2);
 const origin=hero.poseOrbCharge(.2,1);
 hero.root.updateMatrixWorld(true);
 assert(origin.distanceTo(c.hand('L').lerp(c.hand('R'),.5))<1e-6);
 for(const side of ['L','R'])assert(handDistance(side)<.16,'visible gauntlet distance '+handDistance(side)+' in '+side+' hand');
}
console.log('PASS Violet helmet/cape materials, 53 weighted joints, original 17 clips, no legacy overlap, working two-hand orb attachments.');
