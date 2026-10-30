import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {SiegeWalker} from '../dist/siege-walker.js';
import {CannonTracking,CANNON_TRACKING} from '../dist/cannon-tracking.js';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js'),bytes=fs.readFileSync('dist/city-assets/siege-walker.glb'),spec=JSON.parse(fs.readFileSync('dist/city-assets/siege-walker.json'));
const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const degrees=(a,b)=>THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(a.dot(b),-1,1)));
for(const hz of [30,60,120]){
 const dt=1/hz,tracker=new CannonTracking(),down=new THREE.Vector3(0,-1,0),up=new THREE.Vector3(0,1,0);let previous=down.clone();
 for(let i=0;i<hz;i++){const d=tracker.update(dt,up,down,true).clone();assert(degrees(previous,d)<=20*dt+1e-5);previous=d;}assert(Math.abs(degrees(down,previous)-20)<1e-6,'exact antipodal one-second turn budget');
 let payload;const robot=new SiegeWalker(new THREE.Scene(),model,spec,{onEffect:()=>{},onBeam:p=>payload=p});
 let time=0,last=null,maxTurn=0,trackedFrames=0,chargeFrames=0;
 for(let i=0;i<hz*12;i++){
  time+=dt;const angle=Math.max(0,time-4)*.12,center={x:Math.sin(angle)*42,y:2,z:Math.cos(angle)*42},target={id:'moving-ground',kind:['hero','civilian','tank','helicopter'][Math.floor(time/3)%4],alive:true,shapes:[{center}]};
  const oldPhase=robot.weapon.phase;robot.update(dt,time,[target]);assert.equal(robot.target,target,'refresh same-ID target reference');
  const direction=new THREE.Vector3(0,-1,0).transformDirection(robot.nodes.forearm_r.matrixWorld);
  if(last){const turn=degrees(last,direction)/dt;maxTurn=Math.max(maxTurn,turn);assert(turn<=30+1e-4,'body cannot bypass world-space slew');if(oldPhase==='firing')assert(turn<=20+1e-4);}
  if(payload?.state.phase==='charging'){chargeFrames++;assert.deepEqual(payload.plan.trackingTarget,center);const ray=payload.plan.rays[1];assert(direction.distanceTo(new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z))<1e-7);assert(new THREE.Vector3(ray.from.x,ray.from.y,ray.from.z).distanceTo(payload.from)<1e-7);}
  if(payload?.state.phase==='firing'){assert.deepEqual(robot.beamAim,center);assert(robot.cannonTracking.errorDegrees<.1,'tracks ordinary moving ground targets accurately');trackedFrames++;}
  last=direction.clone();
 }
 assert(chargeFrames>hz*3&&trackedFrames>hz*3);assert(maxTurn>20);assert(robot.returnShots>0);
 // A target teleport cannot instantly drag the physical barrel to its new location.
 robot.weapon.phase='firing';robot.weapon.elapsed=0;const before=last.clone(),jump={id:'moving-ground',kind:'civilian',alive:true,shapes:[{center:{x:-42,y:2,z:0}}]};robot.update(dt,time+=dt,[jump]);const after=new THREE.Vector3(0,-1,0).transformDirection(robot.nodes.forearm_r.matrixWorld);assert(degrees(before,after)<=20*dt+1e-5);assert(robot.cannonTracking.errorDegrees>45);assert.deepEqual(robot.beamAim,jump.shapes[0].center);
 const snapshot=after.clone();robot.stun(1);robot.update(.5,time+=.5,[jump]);assert(new THREE.Vector3(0,-1,0).transformDirection(robot.nodes.forearm_r.matrixWorld).distanceTo(snapshot)<1e-8);robot.update(.51,time+=.51,[jump]);robot.update(dt,time+=dt,[jump]);assert(degrees(snapshot,new THREE.Vector3(0,-1,0).transformDirection(robot.nodes.forearm_r.matrixWorld))<=20*dt+1e-5);
 robot.reset();assert(!robot.cannonTracking.initialized);robot.destroy();robot.update(dt,time,[jump]);assert.equal(payload,null);
 console.log('PASS',hz,'Hz live same-ID ground tracking, harmless barrel-aligned warning, accurate firing, physical world-space 30/20 deg/s caps, teleport dodge, stun/reset/death',JSON.stringify({chargeFrames,trackedFrames,maxTurn}));
}
assert.equal(CANNON_TRACKING.waistDegreesPerSecond,20);
