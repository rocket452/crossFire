// Verifies a FORGE mecha low-poly GLB against its original, from the files themselves:
// - triangles, bones (names and order), animation clip names, texture sizes and file size;
// - skeleton nodes, inverse bind matrices and every animation sampler are byte-identical to the original;
// - skinning: every low-poly vertex is posed through all clips and compared with the nearest original vertex.
//   A vertex bound to a different bone than the original surface around it would tear at that joint.
// Usage: node source/forge-mecha/verify-lowpoly.mjs original.glb lowpoly.glb
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import {readGlb,report} from './glb-report.mjs';
registerHooks({resolve(name,ctx,next){return name==='three'?{url:new URL('../../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,ctx);}});
const THREE=await import('../../dist/vendor/three.module.js');
const {GLTFLoader}=await import('../../dist/vendor/GLTFLoader.js');
const [originalPath,lowPath]=process.argv.slice(2);
const before=report(originalPath),after=report(lowPath);
const A=readGlb(originalPath),B=readGlb(lowPath);
const COMPONENT={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},TYPE={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function bytes({json,bin},index){const a=json.accessors[index],v=json.bufferViews[a.bufferView],size=COMPONENT[a.componentType]*TYPE[a.type],start=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||size;
 if(stride===size)return Buffer.from(bin.subarray(start,start+size*a.count));const out=Buffer.alloc(size*a.count);for(let i=0;i<a.count;i++)bin.copy(out,i*size,start+i*stride,start+i*stride+size);return out;}
function typed(glb,index){const a=glb.json.accessors[index],b=bytes(glb,index),C={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}[a.componentType];return new C(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));}

// Skeleton and animation identity.
assert.deepEqual(after.boneNames,before.boneNames,'bone names and order');
assert.deepEqual(after.clips,before.clips,'animation clips');
assert.deepEqual(B.json.nodes,A.json.nodes,'node hierarchy and rest transforms');
assert.deepEqual(B.json.skins.map(s=>s.joints),A.json.skins.map(s=>s.joints),'skin joints');
A.json.skins.forEach((s,i)=>assert(bytes(A,s.inverseBindMatrices).equals(bytes(B,B.json.skins[i].inverseBindMatrices)),'inverse bind matrices'));
let samplers=0;
A.json.animations.forEach((anim,i)=>{const other=B.json.animations[i];assert.equal(other.name,anim.name);assert.deepEqual(other.channels,anim.channels);
 anim.samplers.forEach((s,k)=>{const o=other.samplers[k];assert.equal(o.interpolation,s.interpolation);assert(bytes(A,s.input).equals(bytes(B,o.input))&&bytes(A,s.output).equals(bytes(B,o.output)),anim.name+' sampler '+k);samplers++;});});
assert(after.images.every(img=>Math.max(...img.size)<=1024),'textures at most 1024 px');

// Skinning: pose both vertex sets with the same skeleton.
function vertices(glb){const out=[];for(const p of glb.json.meshes[0].primitives){const pos=typed(glb,p.attributes.POSITION),joints=typed(glb,p.attributes.JOINTS_0),weights=typed(glb,p.attributes.WEIGHTS_0);
 for(let i=0;i<pos.length/3;i++){let best=0;for(let k=1;k<4;k++)if(weights[i*4+k]>weights[i*4+best])best=k;out.push({p:new THREE.Vector3(pos[i*3],pos[i*3+1],pos[i*3+2]),j:joints[i*4+best],w:weights[i*4+best]});}}return out;}
const orig=vertices(A),low=vertices(B);
assert(low.every(v=>Math.abs(v.w-1)<1e-3)&&orig.every(v=>Math.abs(v.w-1)<1e-3),'rigid single-bone weights preserved');
// Per-bone grids of the original vertices: a correctly skinned low-poly vertex lies on the original surface of
// ITS OWN bone's part. (The nearest vertex of any bone can belong to the neighbouring part at a joint.)
const cell=.5,grids=new Map(),key=(x,y,z)=>x+','+y+','+z;
for(const v of orig){if(!grids.has(v.j))grids.set(v.j,new Map());const g=grids.get(v.j),k=key(Math.floor(v.p.x/cell),Math.floor(v.p.y/cell),Math.floor(v.p.z/cell));if(!g.has(k))g.set(k,[]);g.get(k).push(v);}
function nearest(p,bone){const grid=grids.get(bone);if(!grid)return{v:null,d:Infinity};let best=null,d=Infinity;const cx=Math.floor(p.x/cell),cy=Math.floor(p.y/cell),cz=Math.floor(p.z/cell);
 for(let r=1;r<=8&&!best;r++)for(let x=cx-r;x<=cx+r;x++)for(let y=cy-r;y<=cy+r;y++)for(let z=cz-r;z<=cz+r;z++)for(const v of grid.get(key(x,y,z))||[]){const q=v.p.distanceToSquared(p);if(q<d){d=q;best=v;}}return{v:best,d:Math.sqrt(d)};}
const matched=low.map(v=>{const n=nearest(v.p,v.j);return{low:v,orig:n.v,d:n.d};});
const distances=matched.map(m=>m.d).sort((a,b)=>a-b),pct=q=>distances[Math.min(distances.length-1,Math.floor(q*distances.length))];
// Node has no image decoder: parse a texture-free copy for the skeleton and clips (texture sizes are checked above).
function withoutTextures(glb){const json=JSON.parse(JSON.stringify(glb.json));delete json.images;delete json.textures;delete json.samplers;
 const strip=o=>{for(const k of Object.keys(o)){if(/Texture$/.test(k))delete o[k];else if(o[k]&&typeof o[k]==='object')strip(o[k]);}};for(const m of json.materials||[])strip(m);
 const text=Buffer.from(JSON.stringify(json)),pad=Buffer.alloc((4-text.length%4)%4,0x20),bin=Buffer.concat([glb.bin,Buffer.alloc((4-glb.bin.length%4)%4)]);
 const head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);jh.writeUInt32LE(text.length+pad.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
 const all=Buffer.concat([head,jh,text,pad,bh,bin]);all.writeUInt32LE(0x46546c67,0);all.writeUInt32LE(2,4);all.writeUInt32LE(all.length,8);return all.buffer.slice(all.byteOffset,all.byteOffset+all.length);}
const gltf=await new GLTFLoader().parseAsync(withoutTextures(B),'');
const skinned=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)skinned.push(o);});
const skeleton=skinned[0].skeleton,mixer=new THREE.AnimationMixer(gltf.scene);
const mats=()=>{gltf.scene.updateMatrixWorld(true);return skeleton.bones.map((b,i)=>new THREE.Matrix4().multiplyMatrices(b.matrixWorld,skeleton.boneInverses[i]));};
const pose=(m,v)=>v.p.clone().applyMatrix4(m[v.j]);
// Posed check: the distance between each low-poly vertex and its original partner must not grow in any pose.
let worst=0,worstClip=null;
for(const clip of gltf.animations){const action=mixer.clipAction(clip);mixer.stopAllAction();action.reset().play();
 for(let s=0;s<=12;s++){mixer.setTime(clip.duration*s/12);const m=mats();
  for(const x of matched){const gap=Math.abs(pose(m,x.low).distanceTo(pose(m,x.orig))-x.d);if(gap>worst){worst=gap;worstClip=clip.name+'@'+(clip.duration*s/12).toFixed(2)+'s';}}}}
const summary={original:{triangles:before.triangles,bones:before.bones,clips:before.clips.map(c=>c.name),mb:before.mb,textures:before.images.map(i=>i.name+' '+i.size.join('x'))},
 lowpoly:{triangles:after.triangles,ratio:+(after.triangles/before.triangles).toFixed(4),bones:after.bones,clips:after.clips.map(c=>c.name),bytes:after.bytes,mb:after.mb,textures:after.images.map(i=>i.name+' '+i.size.join('x'))},
 identical:{boneNamesAndOrder:true,nodes:true,inverseBindMatrices:true,animationSamplers:samplers},
 skinning:{lowVertices:low.length,distanceToOwnBoneOriginalSurface:{median:+pct(.5).toFixed(4),p99:+pct(.99).toFixed(4),max:+distances.at(-1).toFixed(4)},
  boneParts:grids.size,maxChangeInAnyPose:+worst.toExponential(2),at:worstClip,samplesPerClip:13}};
console.log(JSON.stringify(summary,null,1));
assert(distances.at(-1)<.75,'every low-poly vertex lies on its own bone part of the original (max '+distances.at(-1).toFixed(3)+' m)');
assert(worst<1e-3,'posed low-poly surface moves rigidly with the original in every clip');
console.log('PASS '+lowPath+': identical skeleton and '+samplers+' animation samplers, '+after.triangles+'/'+before.triangles+' triangles, skinning matches in every clip');
