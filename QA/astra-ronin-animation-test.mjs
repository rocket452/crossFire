import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {AstraRoninModel} from '../dist/astra-ronin-model.js';
import {RONIN} from '../dist/astra-ronin.js';
const root=new THREE.Group(),model=new AstraRoninModel(root,RONIN),e={config:RONIN,moving:false,swordState:false,swordAge:0};
model.animate(1/60,0,e);
assert(model.stats().triangles<8000);assert(model.stats().meshes<130);
for(const side of ['left','right']){
 assert.equal(model.parts[side+'-hand'].parent,model.parts[side+'-wrist']);
 assert.equal(model.parts[side+'-foot'].parent,model.parts[side+'-ankle']);
 for(const part of ['bicep','elbow-guard','forearm-shell','thigh-armor','knee-guard','shin-cuff'])assert(model.parts[side+'-'+part].children.some(c=>c.isMesh),'rendered articulated segment '+part);
}
const shoulderSpan=model.parts['left-upper-arm'].position.distanceTo(model.parts['right-upper-arm'].position),legLength=model.parts['left-lower-leg'].position.length()+model.parts['left-ankle'].position.length();
assert(shoulderSpan/legLength<.7,'athletic shoulder-to-leg proportions');
let maxSlip=0,maxError=0,steps=0,minHip=Infinity,maxHip=-Infinity,minArm=Infinity,maxArm=-Infinity;

for(let i=0;i<240;i++){const previous=model.animation.feet.map(f=>({p:f.anchor.clone(),swing:f.swing}));root.position.z+=8/60;e.moving=true;model.animate(1/60,i/60,e);minHip=Math.min(minHip,model.parts.hips.rotation.y);maxHip=Math.max(maxHip,model.parts.hips.rotation.y);minArm=Math.min(minArm,model.parts['right-upper-arm'].rotation.x);maxArm=Math.max(maxArm,model.parts['right-upper-arm'].rotation.x);for(let j=0;j<2;j++){const f=model.animation.feet[j],foot=model.parts[(j?'right':'left')+'-foot'].getWorldPosition(new THREE.Vector3());assert(foot.distanceTo(f.point)<.1,'ankle reaches rolled-foot target');maxError=Math.max(maxError,f.solvedContact.distanceTo(f.contact));if(!f.swing&&!previous[j].swing){steps++;maxSlip=Math.max(maxSlip,f.anchor.distanceTo(previous[j].p));}}}
assert(maxHip-minHip>.15,'pelvis rotates through the walk');assert(maxArm-minArm>.6,'arms swing through the walk');assert(model.parts['left-knee-guard'].rotation.x!==0,'knee guard follows flexion');assert(steps>100);assert(maxSlip<.06,`stance foot drift ${maxSlip}`);assert(maxError<.1,`foot reach error ${maxError}`);
root.position.set(0,0,0);model.reset();e.moving=false;e.swordState=true;
const tips=[];
for(const overhead of[false,true]){e.overhead=overhead;for(let i=0;i<150;i++){e.swordAge=i/60;model.animate(1/60,i/60,e);if(i===57||i===76)tips.push(model.tip.getWorldPosition(new THREE.Vector3()));for(const part of Object.values(model.parts))assert(part.position.toArray().concat(part.quaternion.toArray()).every(Number.isFinite));}}
assert(tips[0].distanceTo(tips[1])>5,'sweep travels across body');assert(tips[2].distanceTo(tips[3])>5,'overhead has a large arc');
e.swordState=false;for(let i=0;i<20;i++)model.animate(1/60,i/60,e);assert(!model.animation.ribbon.visible);model.reset();assert.equal(model.animation.feet.length,0);
console.log('PASS rendered limb segments, wrist/ankle hierarchy, knee flexion, athletic proportions, hip rotation and arm swing, planted heel/toe contacts, reachable IK, distinct attack arcs, finite joint transforms, trail expiry and reset', {maxSlip,maxError,...model.stats()});
