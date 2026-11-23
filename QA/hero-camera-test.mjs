import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from '../dist/vendor/three.module.js';
import {heroViewDirection,pitchHeroBoom} from '../dist/hero-camera.js';
import {HERO_CAMERA} from '../dist/hero-camera-config.js';
import {ManualHeroControls} from '../dist/manual-hero-controls.js';
import {riftRoofTarget} from '../dist/rift-player.js';
import {traceImpact} from '../dist/combat-collision.js';

const up=new Vector3(0,1,0),forward=new Vector3(0,0,1);
const at=(x,y,z)=>new Vector3(x,y,z);
const riftBoom={lift:1.34,overheadClearance:.075};
const rift=Object.assign(Object.create(ManualHeroControls.prototype),{
 hero:{root:{position:at(0,.08,0)}},camera:new PerspectiveCamera(47,2.2,.2,700),
 yaw:0,pitch:0,boomTuning:riftBoom,terrain:()=>.08,blocked:()=>null
});

function assertFramed(camera,feet,height){
 camera.updateMatrixWorld(true);
 for(const y of [0,height]){
  const screen=feet.clone().addScaledVector(up,y).project(camera);
  assert(Math.abs(screen.y)<1&&Math.abs(screen.x)<1&&Math.abs(screen.z)<1,
   `hero at height ${y} fell outside the frame: ${screen.toArray()}`);
 }
}

for(const ratio of [2.2,.65])for(const altitude of [.08,54.08]){
 rift.camera.aspect=ratio;
 rift.camera.updateProjectionMatrix();
 rift.hero.root.position.y=altitude;
 let previousHeight=-Infinity;
 for(const pitch of [0,-.3,-.6,-.9,-1.15,-1.35]){
  rift.pitch=pitch;
  rift.frame();
  assert(rift.camera.position.y>=previousHeight,'looking down raises the camera');
  assert(rift.camera.position.z<0,'overhead tilt keeps the camera behind the hero');
  assertFramed(rift.camera,rift.hero.root.position,2.55);
  previousHeight=rift.camera.position.y;
 }
 assert(previousHeight>altitude+6);
}

// Kage, Volt Rush and Violet retain their individual neutral offsets.
for(const [back,height,downStart] of [
 [6.5,2.94*1.44,HERO_CAMERA.defaultPitch],
 [5.8,2.7*1.44,HERO_CAMERA.defaultPitch],
 [6.5,2.94*1.44*1.62,0]
]){
 const feet=at(0,12,0),focus=feet.clone().addScaledVector(up,1.65),camera=new PerspectiveCamera(65,1.8,.08,700);
 const rest=feet.clone().add(at(0,height,-back));
 assert(pitchHeroBoom(rest.clone(),focus,forward,downStart,{downStart}).distanceTo(rest)<1e-9);
 for(const pitch of [downStart,-.6,-.9,-1.35]){
  camera.position.copy(pitchHeroBoom(rest.clone(),focus,forward,pitch,{downStart}));
  assert(Math.abs(camera.position.distanceTo(focus)-rest.distanceTo(focus))<1e-9);
  camera.lookAt(camera.position.clone().add(heroViewDirection(camera,focus,0,pitch)));
  assertFramed(camera,feet,2.6);
 }
}

// When a wall retracts the camera, resolve the view angle using the actual position.
rift.hero.root.position.set(0,.08,0);
rift.pitch=-1.35;
rift.blocked=focus=>({point:focus.clone().add(at(0,.75,-.9))});
rift.frame();
assert(Math.abs(rift.camera.getWorldDirection(at(0,0,0)).y)<.8);
rift.camera.updateMatrixWorld(true);
assert(Math.abs(rift.cameraFocus().project(rift.camera).y)<.5);

// Steep aim from street level still reaches an intact rooftop.
const building={id:'tower',x:0,z:20,floors:18};
const roof={building:building.id,type:'slab',state:'intact',size:[10,.2,10],body:{position:at(0,53.9,20)}};
const facade={building:building.id,type:'wall',state:'intact',size:[10,54,.4],body:{position:at(0,27,15)}};
const trace=(a,b,radius)=>traceImpact(a,b,{sections:[facade,roof],radius,ground:false});
rift.blocked=trace;
let selected=null;
for(let pitch=.2;pitch<=1.35&&!selected;pitch+=.005){
 rift.pitch=pitch;
 rift.frame();
 const direction=rift.camera.getWorldDirection(at(0,0,0));
 const eye=rift.camera.position.clone().addScaledVector(direction,rift.camera.near);
 selected=riftRoofTarget(rift.hero.root.position,eye,eye.clone().addScaledVector(direction,150),{
  trace,buildings:[building],getBuilding:()=>building,isClear:()=>true,
  roofBelow:(x,z,top,bottom)=>traceImpact(at(x,top,z),at(x,bottom,z),{sections:[roof],radius:0,ground:false})
 });
}
assert(selected&&Math.abs(selected.landing.y-54.08)<1e-6);
console.log('PASS third-person orbit, street and rooftop framing, portrait view, wall clipping, and upward rooftop aim');
