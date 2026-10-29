import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {VioletFlightPose} from '../dist/violet-flight-pose.js';
for(const dt of[1/30,1/60,1/120]){
 const pose=new VioletFlightPose(),velocity=new THREE.Vector3(18,8,26);pose.step(0,velocity,1);let last=pose.orientation.clone();
 for(let i=0;i<3/dt;i++){pose.step(dt,velocity,1);assert(pose.orientation.angleTo(last)<.45,'bounded visual rotation on accelerating turn');last.copy(pose.orientation);}
 assert(pose.flight>.99);assert(pose.pitch>0&&pose.pitch<1.38,'climbing flight follows elevation');
 for(let i=0;i<2/dt;i++)pose.step(dt,velocity,1,{raised:true,blocking:true});
 assert(pose.flight<.001&&pose.action>.999,'power pose overrides speed');
 for(let i=0;i<2/dt;i++)pose.step(dt,new THREE.Vector3(),1);
 assert(pose.action<.001&&pose.flight<.001,'returns to relaxed hover');pose.reset();assert.equal(pose.pitch,0);assert.equal(pose.flight,0);
 console.log('PASS',1/dt,'Hz diagonal/upward travel, smooth orientation, action override, hover return, reset');
}
