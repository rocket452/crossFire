import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as T from '../dist/vendor/three.module.js';
import {Luxmancer,LuxPlayer} from '../dist/luxmancer.js';
import {traceImpact} from '../dist/combat-collision.js';
import {HeroRoster} from '../dist/hero-roster.js';
registerHooks({resolve(name,context,next){
 return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,context);
}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const bytes=fs.readFileSync('dist/city-assets/licensed-characters/luxmancer.glb');
const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new T.Scene(),targets=[],hits=[],ray=new T.Vector3(0,0,1);
const hero=new Luxmancer(scene,model,{getUnits:()=>targets,visible:()=>true,
 traceBolt:(a,b)=>traceImpact(a,b,{targets,ground:false}),onHit:(hit,p,damage)=>hits.push([hit.unit,damage])});
const camera=new T.PerspectiveCamera();camera.position.set(0,1.5,-5);camera.lookAt(0,1.5,50);
const p=Object.assign(Object.create(LuxPlayer.prototype),{hero,camera,keys:new Set(),taps:new Set(),
 hurt:{step(){},applyPose(){}},output:{},grounded:true,yaw:0,move(){},frame(){},available:()=>true});
hero.player=p;hero.active=true;hero.setEnabled(true);
assert(new HeroRoster({maxHeroes:1,luxAvailable:true}).apply(['lux']));
assert.equal(hero.character.bones.length,53);
const origin=new T.Vector3(0,10,0);
hero.shoot('lance',origin,ray);
for(let i=0;i<60;i++)hero.stepShots(1/60);
assert(Math.abs(hero.shots[0].mesh.position.z-205)<.1);
assert(hero.shots[0].mesh.position.y<10&&hero.shots[0].mesh.position.y>9);
hero.reset();p.keys.add('Shield');
for(let i=0;i<30;i++)hero.update(1/60);
assert(hero.shots.length>=5&&hero.shots.every(s=>s.kind==='spray'));
assert(hero.shots.some(s=>Math.abs(s.v.x)>1));
p.keys.clear();hero.reset();
for(const x of [-8,-4,0,4,8]){
 const center=new T.Vector3(x,1.5,35);
 targets.push({kind:'robot',alive:true,shapes:[{center,half:new T.Vector3(1,1,1),rotation:new T.Quaternion()}]});
}
p.keys.add('KeyE');hero.update(1/60);assert.equal(hero.locks.length,4);
assert.equal(hero.marks.filter(m=>m.visible).length,4);
p.keys.clear();hero.update(1/60);assert.equal(hero.shots.length,4);
assert.equal(new Set(hero.shots.map(s=>s.target)).size,4);
for(let i=0;i<120;i++)hero.update(1/60);
assert.equal(hits.filter(([,damage])=>damage===115).length,4);
hero.reset();assert.equal(hero.shots.length+hero.locks.length,0);
console.log('PASS animated Luxmancer asset, selection, arcing lance, automatic spread fire, four locks, homing impacts and reset');
