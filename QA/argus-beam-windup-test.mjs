import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {Argus} from '../dist/argus.js';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {gltfModel,spec} from './argus-fixture.mjs';
const raw=JSON.parse(fs.readFileSync('dist/argus-config.json'));
function fixture(hz){const c=structuredClone(raw);c.spawn={x:36,z:54,yaw:Math.PI};c.movement.speed=0;for(const k of['flak','pylons','lance'])c.attacks[k].enabled=false;const root=new THREE.Group();root.position.set(36,.08,34);const hero={root,active:true,enabled:true,motion:{mode:'ground'}};let b,hits=0,t=0;const damage=new UnitDamage(u=>b.disable(u));const scene=new THREE.Scene(),mission=new ConvoyMission(scene,damage,JSON.parse(fs.readFileSync('dist/convoy-config.json')));b=new Argus(scene,damage,gltfModel,spec,c,{physics:new DestructionWorld(),getConvoy:()=>mission,getHeroes:()=>[hero],onHeroHit:()=>hits++});b.attacks.begin('lance',hero);return{b,hero,get hits(){return hits;},get time(){return t;},step(n=1){for(let i=0;i<n;i++){t+=1/hz;b.update(1/hz,t);b.attacks.afterHeroes(1/hz);}}};}
for(const hz of[30,60,120]){
 const f=fixture(hz),{b,hero}=f,c=b.config.attacks.lance,a=b.attacks.active,initial=a.direction.clone(),flash=[];
 for(let i=0;i<Math.floor((c.windup-.05)*hz);i++){if(i===Math.floor(hz*.5))hero.root.position.x+=4;f.step();assert.equal(a.stage,'windup');assert(!b.coreOpen);assert.equal(f.hits,0);flash.push(b.model.frame.renderRoots.forearm_r.children[0].material.emissiveIntensity);}
 assert(initial.angleTo(a.direction)>.05,'charge tracks the actual target');assert(Math.max(...flash)-Math.min(...flash)>3,'whole weapon visibly flashes during raising');assert(b.model.lanceAligned(a.direction),'arm finishes raising before the windup ends');
 while(a.stage==='windup'&&f.time<c.windup+.5)f.step();assert.equal(a.stage,'firing');assert(f.time>=c.windup);assert(b.model.lanceAligned(a.direction));assert(b.nodes.forearm_r.quaternion.angleTo(new THREE.Quaternion())<.001);f.step(4);assert(f.hits>0);console.log('PASS',hz+'Hz',c.windup+'s no-damage charge, live targeting, flashing surfaces, straight aligned arm before firing');
}
{
 const f=fixture(60),{b}=f,c=b.config.attacks.lance,ready=b.model.lanceAligned.bind(b.model);b.model.lanceAligned=()=>false;f.step(Math.ceil((c.windup+.4)*60));assert.equal(b.attacks.active.stage,'windup');assert(!b.coreOpen);assert.equal(f.hits,0);b.model.lanceAligned=ready;f.step(2);assert.equal(b.attacks.active.stage,'firing');console.log('PASS charge waits beyond timer when arm is unready, then fires after alignment');
}
{
 const f=fixture(60),{b}=f,c=b.config.attacks.lance;b.model.aimLance=()=>false;f.step(Math.ceil((c.windup+c.aimTimeout+.1)*60));assert.equal(b.attacks.active,null);assert(!b.coreOpen);assert.equal(f.hits,0);console.log('PASS obstructed/unreachable aim cancels safely without firing or exposing core');
}
{
 const f=fixture(60),{b}=f;f.step(30);b.stun(1,'test');assert.equal(b.attacks.active,null);assert.equal(f.hits,0);console.log('PASS stun cancels the longer charge without delayed beam');
}
