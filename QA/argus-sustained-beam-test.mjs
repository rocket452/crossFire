import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {Argus} from '../dist/argus.js';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {gltfModel,spec} from './argus-fixture.mjs';
for(const hz of[30,60,120]){
 const c=JSON.parse(fs.readFileSync('dist/argus-config.json'));c.spawn={x:36,z:54,yaw:Math.PI};c.movement.speed=0;for(const k of['flak','pylons','lance'])c.attacks[k].enabled=false;const scene=new THREE.Scene(),physics=new DestructionWorld();let b;const damage=new UnitDamage(u=>b.disable(u)),mission=new ConvoyMission(scene,damage,JSON.parse(fs.readFileSync('dist/convoy-config.json'))),root=new THREE.Group();root.position.set(36,.08,15);const hero={root,enabled:true,active:true,motion:{mode:'ground'}};b=new Argus(scene,damage,gltfModel,spec,c,{physics,getConvoy:()=>mission,getHeroes:()=>[hero]});b.attacks.begin('lance',hero);let t=0,start=null,end=null,maxLost=0;const dt=1/hz;
 while(t<17){t+=dt;if(start!==null)root.position.x=36+20*Math.sin((t-start)*3);b.update(dt,t);b.attacks.afterHeroes(dt);if(start===null&&b.attacks.active?.stage==='firing')start=t;if(start!==null){if(!b.attacks.active){end=t;break;}assert.equal(b.attacks.active.stage,'firing');assert(b.coreOpen);assert(b.attacks.beamEffect.root.visible,'keep the visual beam on through tracking misses');assert(b.model.lanceBodyClear());maxLost=Math.max(maxLost,b.attacks.active.lost);if(b.attacks.active.lost>c.attacks.lance.lostContactGrace){assert.equal(b.attacks.active.contact,0);assert.equal(b.attacks.active.threshold,0);}}}
 assert(maxLost>.5,'trajectory must actually exceed the former cancellation grace');assert(Math.abs(end-start-12)<dt+.0001);assert(!b.coreOpen);assert(!b.attacks.beamEffect.root.visible);b.attacks.begin('lance',hero);b.stun(1,'test');assert.equal(b.attacks.active,null);console.log('PASS',hz+'Hz',JSON.stringify({duration:+(end-start).toFixed(3),longestMiss:+maxLost.toFixed(3),continuousVisual:true,rampReset:true,stunInterrupt:true}));
}
