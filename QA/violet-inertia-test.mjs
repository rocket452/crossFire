import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {advanceVioletFlight,VIOLET_TUNING} from '../dist/violet-flight.js';
import {VioletHero} from '../dist/violet-hero.js';
for(const dt of [1/30,1/60,1/120]){
 const p=new THREE.Vector3(),v=new THREE.Vector3(),goal=new THREE.Vector3(80,0,0);let last=v.clone();
 for(let i=0;i<Math.round(1/dt);i++){advanceVioletFlight(p,v,goal,dt);assert(v.distanceTo(last)<=14*dt+1e-6);last.copy(v);}
 assert(v.x>5&&v.x<12);const before=v.x;advanceVioletFlight(p,v,new THREE.Vector3(-80,0,0),dt);assert(v.x>0,'reversing preserves forward momentum');assert(v.x<before);advanceVioletFlight(p,v,p.clone(),dt);assert(v.length()>0,'braking cannot erase velocity in a frame');
 const stop=new THREE.Vector3(15,2,0);for(let i=0;i<Math.round(18/dt);i++)advanceVioletFlight(p,v,stop,dt);assert(p.distanceTo(stop)<.05);assert(v.length()<.05);
}
const spec=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/violet-sentinel.json',import.meta.url)));
function fixture({missile=false}={}){
 const model=new THREE.Group();for(const p of spec.parts){const m=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1).translate(...p.pivot),new THREE.MeshStandardMaterial());m.name=p.name;model.add(m);}
 const robot={root:new THREE.Group(),combatUnit:{alive:true},aimPoint:()=>new THREE.Vector3(0,14,0)},target={id:'missile',alive:true,position:new THREE.Vector3(0,30,14)},times=[];
 const h=new VioletHero(new THREE.Scene(),{scene:model},spec,{getRobot:()=>robot,getMissileTarget:()=>missile?target:null,traceOrb:()=>null,onOrbHit:()=>0});const launch=h.launch.bind(h);let t=0;h.launch=(...a)=>{const fired=launch(...a);if(fired)times.push(t);return fired;};return{h,times,step:dt=>{t+=dt;h.update(dt,t);}};
}
for(const missile of [false,true]){
 const f=fixture({missile});for(let i=0;i<20*60;i++)f.step(1/60);assert(f.times.length>=2);const min=missile?VIOLET_TUNING.defenseCharge+VIOLET_TUNING.defenseCooldown:VIOLET_TUNING.normalCharge+VIOLET_TUNING.normalCooldown;for(let i=1;i<f.times.length;i++)assert(f.times[i]-f.times[i-1]>=min-.04);console.log('PASS slower',missile?'interception':'normal','shot intervals',f.times.map(t=>+t.toFixed(2)));
}
const f=fixture({missile:true});f.h.attackCooldown=0;f.h.defenseCharge=.95;f.h.shieldDeploy=1;f.h.shield.visible=true;f.h.mode='blocking';const shots=f.h.shots;for(let i=0;i<15;i++){f.h.shieldDeploy=1;f.h.shield.visible=true;f.step(1/60);assert.equal(f.h.shots,shots);assert.equal(f.h.defenseCharge,0);assert(!f.h.charging);assert(!f.h.chargeOrb.visible);assert(!f.h.launch(new THREE.Vector3(),new THREE.Vector3(0,0,1)));}
f.h.shieldDeploy=0;f.h.shield.visible=false;f.h.mode='patrol';for(let i=0;i<30;i++)f.step(1/60);assert.equal(f.h.shots,shots,'lowering barrier cannot release an immediate stored shot');for(let i=0;i<180;i++)f.step(1/60);assert(f.h.shots>shots);f.h.reset();assert.equal(f.h.velocity.length(),0);assert.equal(f.h.defenseCharge,0);assert(!f.h.isShielding());assert.equal(f.h.shots,0);
console.log('PASS bounded acceleration, coasting/reversal, stable arrival at 30/60/120Hz, shield charging/launch lockout including fade, post-shield recovery and reset');
