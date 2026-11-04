import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {Argus} from '../dist/argus.js';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {gltfModel,spec} from './argus-fixture.mjs';
function setup(hz,angle,height=1.2){const c=JSON.parse(fs.readFileSync('dist/argus-config.json'));c.spawn={x:0,z:0,yaw:0};c.movement.speed=0;c.repairDrones.enabled=false;for(const k of['flak','pylons','lance'])c.attacks[k].enabled=false;const scene=new THREE.Scene();let b,time=0;const damage=new UnitDamage(u=>b.disable(u)),mission=new ConvoyMission(scene,damage,JSON.parse(fs.readFileSync('dist/convoy-config.json'))),root=new THREE.Group();root.position.set(Math.sin(angle)*26,height,Math.cos(angle)*26);const hero={root,enabled:true,active:true,motion:{mode:'ground'}};b=new Argus(scene,damage,gltfModel,spec,c,{physics:new DestructionWorld(),getConvoy:()=>mission,getHeroes:()=>[hero]});b.attacks.begin('lance',hero);return{b,hero,step(){time+=1/hz;b.update(1/hz,time);b.attacks.afterHeroes(1/hz);return time;}};}
for(const hz of[30,60,120])for(const degrees of[-170,-110,-60,0,60,110,170]){
 const f=setup(hz,degrees*Math.PI/180),{b}=f,feet=['l','r'].map(s=>b.nodes['foot_'+s].getWorldPosition(new THREE.Vector3()));let fired=false,last=b.model.torsoYaw;
 for(let i=0;i<hz*4.5;i++){f.step();assert(Math.abs(b.model.torsoYaw-last)<=b.config.attacks.lance.torsoTurnSpeed/hz+1e-7,'smooth bounded torso turn');last=b.model.torsoYaw;assert(b.model.lanceBodyClear(),'cannon segments stay clear of oriented torso bounds');for(let n=0;n<2;n++)assert(b.nodes['foot_'+['l','r'][n]].getWorldPosition(new THREE.Vector3()).distanceTo(feet[n])<.003,'upper swivel does not move planted feet');if(b.attacks.active?.stage==='firing'){assert(b.model.lanceAligned(b.attacks.active.direction));fired=true;break;}}
 assert(fired,'must turn and acquire target at '+degrees+' degrees');if(Math.abs(degrees)>60)assert(Math.abs(b.model.torsoYaw)>.5);console.log('PASS',hz+'Hz',degrees+'deg side/rear targeting, clear arm, planted feet, aligned firing');
}
{
 const f=setup(60,2.8),{b}=f;for(let i=0;i<180;i++)f.step();assert(Math.abs(b.model.torsoYaw)>1);b.attacks.cancel();let previous=b.model.torsoYaw;for(let i=0;i<210;i++){f.step();assert(Math.abs(b.model.torsoYaw-previous)<=b.config.attacks.lance.torsoReturnSpeed/60+1e-7);previous=b.model.torsoYaw;}assert(Math.abs(b.model.torsoYaw)<.001);b.reset();assert.equal(b.model.torsoYaw,0);console.log('PASS eased return after cancellation and neutral reset');
}
{
 const f=setup(60,0),{b,hero}=f;let clearFrames=0;for(let i=0;i<300;i++){const a=i/60*.6;hero.root.position.set(Math.sin(a)*26,1.2,Math.cos(a)*26);f.step();assert(b.model.lanceBodyClear());if(b.attacks.active?.stage==='firing'){assert(b.model.lanceAligned(b.attacks.active.direction));clearFrames++;}}assert(clearFrames>0);console.log('PASS moving orbital target, torso follows tracked beam without cross-body firing');
}
