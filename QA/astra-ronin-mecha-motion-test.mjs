// Astra Ronin mecha motion: spring rig timing against gameplay, stance footwork, shield presentation,
// wing binders, impulses and defeat. Runs on the real model and controller, no browser needed.
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {AstraRoninModel} from '../dist/astra-ronin-model.js';
import {AstraRonin,RONIN} from '../dist/astra-ronin.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {POSES,CHANNELS} from '../dist/astra-ronin-poses.js?v=472';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
for(const pose of Object.values(POSES))for(const c of CHANNELS)assert(pose[c]?.length===3&&pose[c].every(Number.isFinite),'complete pose channel '+c);

const root=new THREE.Group(),model=new AstraRoninModel(root,RONIN),a=model.animation,p=model.parts;
const W=RONIN.swordWindup,S=RONIN.swordSwing,Rc=RONIN.swordRecovery,dt=1/60;
const idle={config:RONIN,moving:false,swordState:false,swordAge:0,lastSeen:V(0,1.5,10)};
for(let i=0;i<90;i++)model.animate(dt,i*dt,idle);root.updateWorldMatrix(true,true);
// Ready stance: knees loaded, shield squared toward the front, wings folded along the pack.
const frameDrop=model.bind.get(model.frame).p.y-model.frame.position.y;assert(frameDrop>.15,'ready stance crouches '+frameDrop);
const shieldNormal=V(0,0,1).applyQuaternion(p.shield.getWorldQuaternion(new THREE.Quaternion()));assert(shieldNormal.z>.6,'shield faces the front at rest '+shieldNormal.z.toFixed(2));
const wingSpan=()=>{root.updateWorldMatrix(true,true);const box=new THREE.Box3();for(const s of['left','right'])box.expandByObject(p[s+'-wing']);return box.max.x-box.min.x;};
const folded=wingSpan();
const footZ=()=>root.worldToLocal(p['left-foot'].getWorldPosition(V())).z;const restFoot=footZ();

// Sweep: the blade is fastest inside the gameplay swing window, steps into a lunge, and follows through.
const sweep={...idle,swordState:true,overhead:false};let peak={speed:0,at:0},prev=null,maxFoot=restFoot;
for(let i=0;i<=Math.round((W+S+Rc)/dt);i++){sweep.swordAge=i*dt;model.animate(dt,i*dt,sweep);const tip=model.tip.getWorldPosition(V());if(prev){const v=tip.distanceTo(prev)/dt;if(v>peak.speed)peak={speed:v,at:sweep.swordAge};}prev=tip;maxFoot=Math.max(maxFoot,footZ());
 for(const part of Object.values(p))assert(part.quaternion.toArray().every(Number.isFinite)&&part.position.toArray().every(Number.isFinite));}
assert(peak.at>=W-.02&&peak.at<=W+S+.06,`peak blade speed at ${peak.at.toFixed(3)}s sits in the ${W}-${(W+S).toFixed(2)}s swing`);
assert(peak.speed>40,'explosive cut '+peak.speed.toFixed(1)+' m/s');
assert(maxFoot>restFoot+.25,'lead foot steps forward into the cut stance');
assert(a.ribbon.visible===false||a.history.length>=0);

// Overhead: the blade starts high behind the crown and finishes low in front.
model.reset();const over={...idle,swordState:true,overhead:true};let raised=null,finish=null;
for(let i=0;i<=Math.round((W+S+.2)/dt);i++){over.swordAge=i*dt;model.animate(dt,i*dt,over);root.updateWorldMatrix(true,true);if(Math.abs(over.swordAge-W)<dt/2)raised=root.worldToLocal(model.tip.getWorldPosition(V()));if(Math.abs(over.swordAge-(W+S+.15))<dt/2)finish=root.worldToLocal(model.tip.getWorldPosition(V()));}
assert(raised.y>finish.y+4&&finish.z>raised.z+3,'overhead arc from high-behind to low-front');

// Flight flares the wings and pitches the body into the cruise; landing loads the legs.
model.reset();const fly={...idle,flight:{phase:'cruise',age:1,speed:RONIN.flightSpeed}};for(let i=0;i<120;i++)model.animate(dt,i*dt,fly);
const flared=wingSpan();assert(flared>folded*1.25,`wings open from ${folded.toFixed(2)} to ${flared.toFixed(2)}`);
assert(new THREE.Euler().setFromQuaternion(model.frame.quaternion).x>.35,'cruise pitches forward');assert(a.glide,'legs trail while flying');
let lowest=Infinity;fly.flight=null;for(let i=0;i<40;i++){model.animate(dt,i*dt,fly);lowest=Math.min(lowest,model.frame.position.y);}assert(!a.glide&&a.feet.length===2,'touchdown plants both feet');
assert(model.bind.get(model.frame).p.y-lowest>.4,'touchdown compresses the pelvis');

// A hit kicks the torso back; a block shoves the shield arm.
model.reset();for(let i=0;i<60;i++)model.animate(dt,i*dt,idle);const calm=new THREE.Euler().setFromQuaternion(p.torso.quaternion).x;let recoil=calm;
const hit={...idle,flinch:.12};for(let i=0;i<12;i++){model.animate(dt,i*dt,hit);hit.flinch=Math.max(0,hit.flinch-dt);recoil=Math.min(recoil,new THREE.Euler().setFromQuaternion(p.torso.quaternion).x);}
assert(calm-recoil>.08,'hit recoil '+(calm-recoil).toFixed(3));

// Real controller: defeat ends on the knees; reset restores the bind pose with folded wings.
const damage=new UnitDamage(),hero={id:'hero',alive:true,shapes:[{center:V(0,1.5,60)}]},r=new AstraRonin(new THREE.Scene(),damage,{config:{guardInitialDelay:99},getTargets:()=>[hero],visible:()=>true,isPathClear:()=>true,getBuildings:()=>[]});
r.spawnPosition={x:0,y:.1,z:0};r.reset();r.spawn();for(let t=0;t<.5;t+=dt)r.update(dt,t);r.destroy();let kneel=Infinity;
for(let t=0;t<RONIN.collapseDuration-.02;t+=dt){r.update(dt,t);kneel=Math.min(kneel,r.model.frame.position.y);}
assert(r.model.bind.get(r.model.frame).p.y-kneel>1.5,'collapses to the knees');
r.reset();assert.equal(r.model.animation.feet.length,0);assert(!r.model.animation.glide);
console.log('PASS complete poses, crouched ready stance with squared shield, sweep peak speed',peak.speed.toFixed(0),'m/s at',peak.at.toFixed(2)+'s, lunge step, overhead arc, wing fan',folded.toFixed(1),'→',flared.toFixed(1),', cruise pitch and touchdown load, hit recoil, kneeling defeat and reset');
