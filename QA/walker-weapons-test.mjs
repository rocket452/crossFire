import {Box as PhysicsBox,Vec3,Quaternion as PhysicsQuaternion} from '../dist/vendor/cannon-es.js';
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
const modelStem=process.argv.includes('--cyber')?'siege-walker-cyber':'siege-walker';
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js'),bytes=fs.readFileSync('dist/city-assets/'+modelStem+'.glb'),spec=JSON.parse(fs.readFileSync('dist/city-assets/'+modelStem+'.json')),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let completed=0;const modules=new WalkerWeapons({onDestroyed:()=>completed++});assert.equal(modules.hurt('chest',50),0);for(const n of[0,-1,NaN,Infinity])assert.equal(modules.hurt('forearm_r',n),0);modules.hurt('forearm_r',1800);modules.hurt('forearm_r',5000);assert.equal(completed,1);modules.reset();assert(modules.working('beam'));
for(const dt of[1/30,1/60,1/120]){
 const scene=new THREE.Scene(),physics=new DestructionWorld(),fx=new RobotDeathEffects(scene),arsenal=new RobotArsenal({plasma:true}),pod={pending:0,missiles:[]},artillery={shells:[],muzzleGlow:{visible:false},cancelled:0,get busy(){return this.shells.length>0;},removeShell:()=>{}},broken=[];
 const robot=new SiegeWalker(scene,gltf,spec,{onBeam:()=>{},onEffect:()=>{},onDebris:s=>physics.addWreck(s),onRemoveDebris:b=>{fx.removePart(b);physics.removeWreck(b);},onDeath:(p,o)=>fx.explode(p,o),onWreck:w=>fx.part(w),onWeaponDestroyed:m=>{broken.push(m.id);arsenal.weaponDestroyed(m.id,robot,pod,artillery);}});
 if(spec.appearance){
  assert.equal(robot.root.name,'Cyberpunk Siege Walker');
  for(const {part} of WALKER_WEAPONS)assert.equal(robot.signalMeshes.get(part).parent,robot.meshes[part]);
 }
 const mount=robot.nodes.plasma_cannon,head=robot.nodes.head;
 const base=robot.meshes.plasma_cannon.geometry.boundingBox;
 const barrelBounds=new THREE.Box3().setFromCenterAndSize(robot.sniperBarrelBox.center,robot.sniperBarrelBox.size);
 const convex=box=>new PhysicsBox(new Vec3().copy(box.getSize(new THREE.Vector3()).multiplyScalar(.5))).convexPolyhedronRepresentation;
 const headBounds=robot.meshes.head.geometry.boundingBox;
 const headHull=convex(headBounds);
 const headOrigin=new Vec3().copy(headBounds.getCenter(new THREE.Vector3()));
 const gunVolumes=[base,barrelBounds].map(box=>({hull:convex(box),center:box.getCenter(new THREE.Vector3())}));
 const aim=(yaw,dy)=>{
  const target=mount.getWorldPosition(new THREE.Vector3())
   .add(new THREE.Vector3(Math.sin(yaw)*90,dy,Math.cos(yaw)*90));
  return robot.aimPlasma(target);
 };
 for(const headYaw of [-1.15,0,1.15])for(const headPitch of [-.65,0,.9]){
  head.rotation.set(headPitch,headYaw,0,'YXZ');
  const right=aim(Math.PI*55/180,1.4);
  if(headYaw===0&&headPitch===0)assert(right.aligned&&Math.atan2(right.direction.x,right.direction.z)>.9,'sniper can track more than 50° outboard');
  for(const yaw of [-1,-.6,-.3,0,.6,1])for(const height of [-60,1.4,60]){
   aim(yaw,height);
   const toHead=head.matrix.clone().invert().multiply(mount.matrix);
   const rotation=new PhysicsQuaternion().copy(new THREE.Quaternion().setFromRotationMatrix(toHead));
   for(const {hull,center} of gunVolumes){
    const position=new Vec3().copy(center.clone().applyMatrix4(toHead));
    assert(!hull.findSeparatingAxis(headHull,position,rotation,headOrigin,new PhysicsQuaternion(),new Vec3()),
     `gun clears head at tracking yaw ${headYaw}, pitch ${headPitch}, target yaw ${yaw}, height ${height}`);
   }
  }
 }
 robot.reset();
 const damage=new UnitDamage(u=>u.entity.destroy()),boss=damage.add('boss','robot',robot,robot.weapons.maxHealth);boss.shapes=robot.shapes();
 // The eye strip is visual only; direct visor damage cannot contribute to defeat.
 const visor=robot.meshes.visor.localToWorld(robot.boxes.visor.center.clone()),eyeFrom=visor.clone().add(new THREE.Vector3(0,0,25));eyeFrom.y=1.65;
 assert(!boss.shapes.some(s=>s.part==='visor'));assert.notEqual(traceImpact(eyeFrom,visor,{targets:[boss],ground:false,radius:.1})?.part,'visor');assert.equal(damage.hurt(boss,1e6,visor,'visor'),0);assert(robot.isWeaponWorking('eyes'));
 const originalHealth=boss.health;damage.hurt(boss,20,null,'pelvis');damage.hurt(boss,100);assert.equal(boss.health,originalHealth,'hull and untargeted damage cannot defeat the Walker');assert.equal(robot.weapons.forPart('forearm_r').health,WALKER_WEAPONS.find(m=>m.id==='beam').health,'global burst and other armor never wear a weapon');
 for(const m of WALKER_WEAPONS){
  boss.shapes=robot.shapes();const shape=boss.shapes.find(s=>s.part===m.part);assert(shape,'each of the three heavy weapons has real hit geometry');
  const q=new THREE.Quaternion().copy(shape.rotation),c=new THREE.Vector3().copy(shape.center),axis=new THREE.Vector3(0,0,1).applyQuaternion(q),from=c.clone().addScaledVector(axis,20),hit=traceImpact(from,c,{targets:[{...boss,shapes:[shape]}],ground:false,radius:.1});assert.equal(hit.part,m.part);
  let impact=hit;
  if(m.id==='plasma'){
   const muzzle=robot.aimPlasma().position;
   const muzzleFace=robot.meshes[m.part].getObjectByName('Sniper muzzle face');
   assert(Math.abs(muzzle.distanceTo(muzzleFace.getWorldPosition(new THREE.Vector3()))-.03)<1e-6);
   impact=traceImpact(muzzle.clone().addScaledVector(axis,2),muzzle.clone().addScaledVector(axis,-.4),{targets:[boss],ground:false,radius:0});
   assert.equal(impact.part,m.part);
   assert(Math.abs(muzzle.distanceTo(new THREE.Vector3().copy(impact.point))-.03)<1e-6);
  }
  damage.blast(impact.point,{direct:boss,directPart:impact.part,power:m.health*.25,radius:.2});assert.equal(robot.weapons.forPart(m.part).health,m.health*.75);
  if(m.id==='beam'){arsenal.phase='beam';robot.weapon.phase='firing';}
  if(m.id==='missiles'){arsenal.phase='salvo';pod.pending=5;pod.missiles=[{alive:true}];}
  if(m.id==='plasma'){arsenal.phase='plasma-clear';artillery.shells=[{state:'warning'},{state:'flying'}];artillery.muzzleGlow.visible=true;}
  const point=robot.meshes[m.part].localToWorld(robot.boxes[m.part].center.clone());damage.hurt(boss,m.health*.75,point,m.part);assert(!robot.isWeaponWorking(m.id));assert.equal(robot.wrecks.length,broken.length);assert(!robot.shapes().some(s=>s.part===m.part));
  if(m.id==='beam'){assert.equal(robot.weapon.phase,'off');assert.equal(arsenal.phase,'recovery');}
  if(m.id==='missiles'){assert.equal(pod.pending,0);arsenal.update(dt,robot,pod,artillery);assert.equal(arsenal.phase,'clear','launched missiles survive and block the next heavy weapon');pod.missiles=[];arsenal.update(dt,robot,pod,artillery);assert.equal(arsenal.phase,'recovery');}
  if(m.id==='plasma'){assert.equal(artillery.cancelled,1);assert.equal(artillery.shells.length,1);assert.equal(artillery.shells[0].state,'flying');assert(!artillery.muzzleGlow.visible);arsenal.update(dt,robot,pod,artillery);assert.equal(arsenal.phase,robot.dead?'off':'plasma-clear');artillery.shells=[];}
  const n=broken.length;robot.damageWeapon(9999,point,m.part);assert.equal(broken.length,n,'one break callback per module');if(robot.weapons.remaining){assert(boss.alive&&!robot.dead);assert(Math.abs(boss.health-robot.weapons.health)<1e-7);}else{assert(!boss.alive&&robot.dead);assert.equal(boss.health,0);}
 }
 assert.equal(boss.health,0,'all weapon durability consumed once; hull damage contributes nothing');
 for(let i=0;i<Math.ceil(6/dt);i++){arsenal.beforeBeam(robot,pod,artillery);robot.update(dt,i*dt,[]);arsenal.update(dt,robot,pod,artillery);physics.step(dt);robot.syncWrecks();fx.update(dt);}
 assert.equal(arsenal.phase,'off');assert(!boss.alive);assert.equal(physics.wrecks.length,18);assert(fx.smoke.count>0);assert([...robot.signalMeshes.values()].every(signal=>!signal.visible));for(const m of WALKER_WEAPONS)assert.equal(robot.meshes[m.part].material.emissiveIntensity,0);
damage.hurt(boss,14400);for(let i=0;i<Math.ceil(2/dt);i++)robot.update(dt,i*dt,[]);assert(robot.broken);assert.equal(robot.wrecks.length,18);assert.equal(physics.wrecks.length,18,'detached weapons never duplicate on boss death');robot.breakApart();assert.equal(physics.wrecks.length,18);
 fx.reset();robot.reset();damage.reset();assert.equal(physics.wrecks.length,0);for(const m of WALKER_WEAPONS){assert(robot.isWeaponWorking(m.id));assert.equal(robot.meshes[m.part].parent,robot.nodes[m.part]);assert.equal(robot.weapons.forPart(m.part).health,m.health);}assert.equal(robot.shapes().length,17);assert([...robot.signalMeshes.values()].every(signal=>signal.visible));
 console.log('PASS',dt,'real-model part collision, direct/blast durability, armored hull, automatic defeat on final weapon, airborne ordnance, 18 total death parts and full rebuild');
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
const runner={enabled:true,root:new THREE.Group(),bodyUp:new THREE.Vector3(0,1,0),motion:{velocity:new THREE.Vector3()}},eyes=new RobotEyeBeams(scene,{getRobot:()=>robot,getRunner:()=>runner,canAttack:()=>true,traceWorld:()=>null,onImpact:()=>{}});runner.root.position.set(0,.08,50);assert(robot.isWeaponWorking('eyes'));eyes.cycle.cooldown=0;for(let i=0;i<180;i++)eyes.update(1/60,i/60);assert(eyes.history.length>0,'real eye attack still fires without a destructible eye module');eyes.reset();robot.isWeaponWorking=()=>enabled;eyes.cycle.phase='charging';eyes.bolts.push({id:1,position:new THREE.Vector3(50,30,0),dir:new THREE.Vector3(0,0,1),age:0});eyes.update(.1,.1);assert.equal(eyes.cycle.phase,'idle');assert.equal(eyes.charges.count,0);assert.equal(eyes.bolts.length,1);assert(eyes.bolts[0].position.z>0);
const plasma=new PlasmaArtillery(scene,{getMuzzle:()=>({position:new THREE.Vector3(0,20,0),aligned:true}),getTargets:()=>[{alive:true,kind:'tank',entity:{team:0},shapes:[{center:{x:40,y:0,z:0}}]}],isRobotAlive:()=>true,canFire:()=>enabled});assert(!plasma.beginVolley());enabled=true;assert(plasma.beginVolley());plasma.shells[0].state='flying';const launched=plasma.shells[0];plasma.shells.push(plasma.buildShot({x:50,y:0,z:20},10));enabled=false;plasma.update(.1,.1);assert(plasma.shells.includes(launched));assert(plasma.shells.every(s=>s.state==='flying'));assert.equal(plasma.cancelled,1);assert(!plasma.beginVolley());console.log('PASS disabled eyes/plasma cancel charges but preserve airborne shots');
