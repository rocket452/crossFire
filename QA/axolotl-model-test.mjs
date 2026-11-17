import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const T=await import('../dist/vendor/three.module.js'),{GLTFLoader}=await import('../dist/vendor/GLTFLoader.js'),{AxolotlHero}=await import('../dist/axolotl-hero.js');
const b=fs.readFileSync(new URL('../dist/city-assets/licensed-characters/axolotl.glb',import.meta.url)),model=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
for(const hz of[30,60,120]){
 const h=new AxolotlHero(new T.Scene(),{model,getUnits:()=>[],isClear:()=>true,trace:()=>null,onHit:()=>0});h.setEnabled(true);h.root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(h.body),size=box.getSize(new T.Vector3());assert(size.z>4&&size.z<4.8);assert(size.y>1.3&&size.y<1.7);assert(Math.abs(box.min.y-h.root.position.y)<.005);
 let tris=0,meshes=0;h.body.traverse(o=>{if(o.isMesh){meshes++;tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});assert.equal(tris,3480);assert.equal(h.root.children.length,1,'legacy body is removed');assert(meshes>40);
 assert.equal(h.legs.length,4);assert.equal(h.gills.length,6);assert.equal(h.tailLinks.length,2);
 const foot=h.legs[0].children[0],before=foot.getWorldPosition(new T.Vector3());h.legs[0].rotation.x=.4;h.root.updateMatrixWorld(true);assert(foot.getWorldPosition(new T.Vector3()).distanceTo(before)>.01,'actual uploaded leg geometry moves with its pivot');h.legs[0].rotation.x=0;
 const mouth=h.mouth.getWorldPosition(new T.Vector3());assert(mouth.z<h.root.position.z-1.5,'breath follows forward-facing mouth after spawn yaw');
 for(let i=0;i<hz*3;i++)h.update(1/hz);h.root.updateMatrixWorld(true);h.body.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));assert(h.history.length>0);assert.equal(h.diagnostics().model,'A8-Lo-T');h.setEnabled(false);assert(!h.root.visible);
 console.log('PASS',hz,'Hz uploaded 3480 triangles, normalized scale, real articulated legs/gills/tail/head, mouth alignment, aerial ice movement and cleanup');
}
