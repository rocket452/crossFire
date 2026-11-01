import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {RunnerWhip,LIGHTNING_WHIP as C} from '../dist/runner-whip.js';
import {RunnerEnergy} from '../dist/runner-energy.js';
import {traceImpact} from '../dist/combat-collision.js';
for(const dt of[1/30,1/60,1/120,.075]){
 const whip=new RunnerWhip(new THREE.Scene()),e=new RunnerEnergy(),from=new THREE.Vector3(0,1.7,0),direction=new THREE.Vector3(0,0,1);
 assert(!whip.start(e,direction));assert.equal(e.amount,0);e.amount=100;
 const enemy=(id,x,z)=>({id,kind:'robot',alive:true,shapes:[{center:{x,y:1.7,z},half:{x:.45,y:.9,z:.45}}]});
 const targets=[enemy('left',-2,4),enemy('middle',0,5),enemy('right',2,4),enemy('far',0,10),enemy('behind',0,-4)],dealt=new Map();
 assert(whip.start(e,direction));assert.equal(e.amount,85);assert(!whip.start(e,direction));
 const opts={from,trace:(a,b,r)=>traceImpact(a,b,{targets,radius:r,ground:false}),onHit:h=>{dealt.set(h.unit.id,(dealt.get(h.unit.id)||0)+C.damage);return{damage:C.damage};}};
 for(let t=0;t<.6;t+=dt)whip.update(dt,t,opts);
 for(const id of['left','middle','right'])assert.equal(dealt.get(id),180,id);
 assert(!dealt.has('far'));assert(!dealt.has('behind'));assert.equal(whip.hits,3);assert(!whip.active);assert(!whip.root.visible);assert(!whip.start(e,direction));
 for(let t=0;t<.7;t+=dt)whip.update(dt,t,opts);assert(whip.start(e,direction));assert.equal(e.amount,70);whip.cancel();assert(!whip.active);
 whip.reset();dealt.clear();const wall={id:'wall',unit:1};assert(whip.start(e,direction));for(let t=0;t<.6;t+=dt)whip.update(dt,t,{...opts,trace:(a,b,r)=>traceImpact(a,b,{targets:[{id:'wall',shapes:[{center:{x:0,y:1.7,z:2},half:{x:10,y:5,z:.2}}]},...targets],radius:r,ground:false})});assert(!dealt.has('middle'));assert(!dealt.has('left'));assert(!dealt.has('right'));
 whip.reset();assert.equal(whip.hits,0);assert.equal(whip.swings,0);console.log('PASS',dt,'15 charge once, multi-target 180 once each, finite range/arc, cover, recovery/cooldown, cancellation/reset');
}
