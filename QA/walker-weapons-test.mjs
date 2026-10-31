import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
import * as THREE from '../dist/vendor/three.module.js';
import {SiegeWalker} from '../dist/siege-walker.js';
import {WalkerWeapons,WALKER_WEAPONS} from '../dist/walker-weapons.js';
import {RobotArsenal} from '../dist/robot-arsenal.js';
import {BeamCycle} from '../dist/beam-cycle.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {RobotDeathEffects} from '../dist/robot-death-effects.js';
import {RobotEyeBeams} from '../dist/robot-eye-beams.js';
import {PlasmaArtillery} from '../dist/plasma-artillery.js';
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js'),bytes=fs.readFileSync('dist/city-assets/siege-walker.glb'),spec=JSON.parse(fs.readFileSync('dist/city-assets/siege-walker.json')),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let completed=0;const modules=new WalkerWeapons({onDestroyed:()=>completed++});assert.equal(modules.hurt('chest',50),0);for(const n of[0,-1,NaN,Infinity])assert.equal(modules.hurt('forearm_r',n),0);modules.hurt('forearm_r',1800);modules.hurt('forearm_r',5000);assert.equal(completed,1);modules.reset();assert(modules.working('beam'));
for(const dt of[1/30,1/60,1/120]){
 const scene=new THREE.Scene(),physics=new DestructionWorld(),fx=new RobotDeathEffects(scene),arsenal=new RobotArsenal({plasma:true}),pod={pending:0,missiles:[]},artillery={shells:[],muzzleGlow:{visible:false},cancelled:0,get busy(){return this.shells.length>0;},removeShell:()=>{}},broken=[];
 const robot=new SiegeWalker(scene,gltf,spec,{onBeam:()=>{},onEffect:()=>{},onDebris:s=>physics.addWreck(s),onRemoveDebris:b=>{fx.removePart(b);physics.removeWreck(b);},onDeath:(p,o)=>fx.explode(p,o),onWreck:w=>fx.part(w),onWeaponDestroyed:m=>{broken.push(m.id);arsenal.weaponDestroyed(m.id,robot,pod,artillery);}});
 const damage=new UnitDamage(u=>u.entity.destroy(),(u,d,p,part)=>{if(u.health>0)robot.damageWeapon(d,p,part);}),boss=damage.add('boss','robot',robot,14400);boss.shapes=robot.shapes();
 // The helmet's coarse hull must not shield the thin recessed eye target.
 const visor=robot.meshes.visor.localToWorld(robot.boxes.visor.center.clone()),eyeFrom=visor.clone().add(new THREE.Vector3(0,0,25));eyeFrom.y=1.65;
 assert.equal(traceImpact(eyeFrom,visor,{targets:[boss],ground:false,radius:.1})?.part,'visor');
 const originalHealth=boss.health;damage.hurt(boss,20,null,'pelvis');damage.hurt(boss,100);assert.equal(robot.weapons.forPart('forearm_r').health,1800,'global burst and other armor never wear a weapon');
 for(const m of WALKER_WEAPONS){
  boss.shapes=robot.shapes();const shape=boss.shapes.find(s=>s.part===m.part);assert(shape,'each weapon has real hit geometry, including eyes');
  const q=new THREE.Quaternion().copy(shape.rotation),c=new THREE.Vector3().copy(shape.center),axis=new THREE.Vector3(0,0,1).applyQuaternion(q),from=c.clone().addScaledVector(axis,20),hit=traceImpact(from,c,{targets:[{...boss,shapes:[shape]}],ground:false,radius:.1});assert.equal(hit.part,m.part);
  damage.blast(hit.point,{direct:boss,directPart:hit.part,power:m.health*.25,radius:.2});assert.equal(robot.weapons.forPart(m.part).health,m.health*.75);
  if(m.id==='beam'){arsenal.phase='beam';robot.weapon.phase='firing';}
  if(m.id==='missiles'){arsenal.phase='salvo';pod.pending=5;pod.missiles=[{alive:true}];}
  if(m.id==='plasma'){arsenal.phase='plasma-clear';artillery.shells=[{state:'warning'},{state:'flying'}];artillery.muzzleGlow.visible=true;}
  const point=robot.meshes[m.part].localToWorld(robot.boxes[m.part].center.clone());damage.hurt(boss,m.health*.75,point,m.part);assert(!robot.isWeaponWorking(m.id));assert.equal(robot.wrecks.length,broken.length);assert(!robot.shapes().some(s=>s.part===m.part));
  if(m.id==='beam'){assert.equal(robot.weapon.phase,'off');assert.equal(arsenal.phase,'recovery');}
  if(m.id==='missiles'){assert.equal(pod.pending,0);arsenal.update(dt,robot,pod,artillery);assert.equal(arsenal.phase,'clear','launched missiles survive and block the next heavy weapon');pod.missiles=[];arsenal.update(dt,robot,pod,artillery);assert.equal(arsenal.phase,'recovery');}
  if(m.id==='plasma'){assert.equal(artillery.cancelled,1);assert.equal(artillery.shells.length,1);assert.equal(artillery.shells[0].state,'flying');assert(!artillery.muzzleGlow.visible);arsenal.update(dt,robot,pod,artillery);assert.equal(arsenal.phase,'plasma-clear');artillery.shells=[];}
  const n=broken.length;robot.damageWeapon(9999,point,m.part);assert.equal(broken.length,n,'one break callback per module');
 }
 assert.equal(boss.health,originalHealth-120-WALKER_WEAPONS.reduce((n,m)=>n+m.health,0),'ordinary hull damage once, no bonus break damage');
 for(let i=0;i<Math.ceil(6/dt);i++){arsenal.beforeBeam(robot,pod,artillery);robot.update(dt,i*dt,[]);arsenal.update(dt,robot,pod,artillery);physics.step(dt);robot.syncWrecks();fx.update(dt);}
 assert.equal(arsenal.phase,'disarmed');assert(!robot.beamAllowed);assert.equal(physics.wrecks.length,4);assert(fx.smoke.count>0);for(const m of WALKER_WEAPONS)assert.equal(robot.meshes[m.part].material.emissiveIntensity,0);
damage.hurt(boss,14400);for(let i=0;i<Math.ceil(2/dt);i++)robot.update(dt,i*dt,[]);assert(robot.broken);assert.equal(robot.wrecks.length,18);assert.equal(physics.wrecks.length,18,'detached weapons never duplicate on boss death');robot.breakApart();assert.equal(physics.wrecks.length,18);
 fx.reset();robot.reset();damage.reset();assert.equal(physics.wrecks.length,0);for(const m of WALKER_WEAPONS){assert(robot.isWeaponWorking(m.id));assert.equal(robot.meshes[m.part].parent,robot.nodes[m.part]);assert.equal(robot.weapons.forPart(m.part).health,m.health);}assert.equal(robot.shapes().length,17);
 console.log('PASS',dt,'real-model part collision, direct/blast durability, ordinary hull damage, immediate disarm, airborne ordnance, 4 smoking physics mounts, 18 total death parts and full rebuild');
}
// Every remaining-weapon combination must keep cycling, including a completely disarmed boss.
for(let mask=0;mask<8;mask++)for(const dt of[1/30,1/60,.075]){
 const ids=['beam','missiles','plasma'],robot={dead:false,weapon:new BeamCycle(),onBeam:()=>{},isWeaponWorking:id=>!!(mask&(1<<ids.indexOf(id)))},arsenal=new RobotArsenal({plasma:true});let podTime=0,plasmaTime=0;
 const pod={pending:0,missiles:[],beginSalvo(){assert(robot.isWeaponWorking('missiles'));podTime=.5;this.pending=1;return true;}},artillery={shells:[],get busy(){return plasmaTime>0;},beginVolley(){assert(robot.isWeaponWorking('plasma'));plasmaTime=.5;return true;}};
 for(let t=0;t<100;t+=dt){arsenal.beforeBeam(robot,pod,artillery);robot.weapon.step(dt,robot.beamAllowed);podTime=Math.max(0,podTime-dt);if(!podTime)pod.pending=0;plasmaTime=Math.max(0,plasmaTime-dt);arsenal.update(dt,robot,pod,artillery);}
 if(mask===0)assert.equal(arsenal.phase,'disarmed');else for(const id of ids){const occurred=arsenal.turns.some(t=>t.weapon===(id==='missiles'?'pod':id));assert.equal(occurred,robot.isWeaponWorking(id),`mask ${mask}, ${id}`);}
}
console.log('PASS all eight surviving-arsenal combinations at 30/60/irregular FPS, no deadlock or destroyed-weapon turns');
// Eye bolts and plasma shells that already left a weapon are independent of its mount.
const scene=new THREE.Scene(),robot=new SiegeWalker(scene,gltf,spec,{onEffect:()=>{},onBeam:()=>{}});robot.combatUnit={alive:true};let enabled=false;
const runner={enabled:true,root:new THREE.Group(),bodyUp:new THREE.Vector3(0,1,0),motion:{velocity:new THREE.Vector3()}},eyes=new RobotEyeBeams(scene,{getRobot:()=>robot,getRunner:()=>runner,canAttack:()=>true,traceWorld:()=>null,onImpact:()=>{}});robot.isWeaponWorking=()=>enabled;eyes.cycle.phase='charging';eyes.bolts.push({id:1,position:new THREE.Vector3(50,30,0),dir:new THREE.Vector3(0,0,1),age:0});eyes.update(.1,.1);assert.equal(eyes.cycle.phase,'idle');assert.equal(eyes.charges.count,0);assert.equal(eyes.bolts.length,1);assert(eyes.bolts[0].position.z>0);
const plasma=new PlasmaArtillery(scene,{getMuzzle:()=>({position:new THREE.Vector3(0,20,0),aligned:true}),getTargets:()=>[{alive:true,kind:'tank',entity:{team:0},shapes:[{center:{x:40,y:0,z:0}}]}],isRobotAlive:()=>true,canFire:()=>enabled});assert(!plasma.beginVolley());enabled=true;assert(plasma.beginVolley());plasma.shells[0].state='flying';const launched=plasma.shells[0];plasma.shells.push(plasma.buildShot({x:50,y:0,z:20},10));enabled=false;plasma.update(.1,.1);assert(plasma.shells.includes(launched));assert(plasma.shells.every(s=>s.state==='flying'));assert.equal(plasma.cancelled,1);assert(!plasma.beginVolley());console.log('PASS disabled eyes/plasma cancel charges but preserve airborne shots');
