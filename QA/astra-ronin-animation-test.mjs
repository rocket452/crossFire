import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {AstraRoninModel} from '../dist/astra-ronin-model.js';
import {RONIN} from '../dist/astra-ronin.js';
const root=new THREE.Group(),model=new AstraRoninModel(root,RONIN),e={config:RONIN,moving:false,swordState:false,swordAge:0};
model.animate(1/60,0,e);
assert(model.stats().triangles<8000);assert(model.stats().meshes<110);
let maxSlip=0,maxError=0,steps=0;
for(let i=0;i<240;i++){const previous=model.animation.feet.map(f=>({p:f.point.clone(),swing:f.swing}));root.position.z+=8/60;e.moving=true;model.animate(1/60,i/60,e);for(let j=0;j<2;j++){const f=model.animation.feet[j],foot=model.parts[(j?'right':'left')+'-foot'].getWorldPosition(new THREE.Vector3());maxError=Math.max(maxError,foot.distanceTo(f.point));if(!f.swing&&!previous[j].swing){steps++;maxSlip=Math.max(maxSlip,foot.distanceTo(previous[j].p));}}}
assert(steps>100);assert(maxSlip<.06,`stance foot drift ${maxSlip}`);assert(maxError<.1,`foot reach error ${maxError}`);
root.position.set(0,0,0);model.reset();e.moving=false;e.swordState=true;
const tips=[];
for(const overhead of[false,true]){e.overhead=overhead;for(let i=0;i<150;i++){e.swordAge=i/60;model.animate(1/60,i/60,e);if(i===57||i===76)tips.push(model.tip.getWorldPosition(new THREE.Vector3()));for(const part of Object.values(model.parts))assert(part.position.toArray().concat(part.quaternion.toArray()).every(Number.isFinite));}}
assert(tips[0].distanceTo(tips[1])>5,'sweep travels across body');assert(tips[2].distanceTo(tips[3])>5,'overhead has a large arc');
e.swordState=false;for(let i=0;i<20;i++)model.animate(1/60,i/60,e);assert(!model.animation.ribbon.visible);model.reset();assert.equal(model.animation.feet.length,0);
console.log('PASS planted travel feet, reachable IK, distinct attack arcs, finite joint transforms, trail expiry and reset', {maxSlip,maxError,...model.stats()});
