import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {VioletHero} from '../dist/violet-hero.js';
const spec=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/violet-sentinel.json',import.meta.url)));
function fixture(){
 const model=new THREE.Group();for(const p of spec.parts){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1).translate(...p.pivot),new THREE.MeshStandardMaterial());mesh.name=p.name;model.add(mesh);}
 const robot={root:new THREE.Group(),combatUnit:{alive:true},aimPoint:()=>new THREE.Vector3(0,14,0)},events=[];
 const hero=new VioletHero(new THREE.Scene(),{scene:model},spec,{getRobot:()=>robot,traceOrb:()=>({kind:'unit',unit:robot.combatUnit,point:{x:0,y:14,z:0}}),onOrbHit:()=>0,onPowerHit:(hit,p,power)=>power,onEvent:m=>events.push(m)});hero.root.position.set(0,24,24);hero.velocity.set(5,2,1);hero.capacitor.absorb(1200);return{hero,robot,events};
}
for(const dt of[1/30,1/60,1/120,.075]){
 const {hero,events}=fixture(),anchor=hero.root.position.clone();let elapsed=0,firstPose=null,movedArms=false;
 while(elapsed<6-1e-8){hero.update(dt,elapsed+=dt);assert(hero.root.position.distanceTo(anchor)<1e-10);assert.equal(hero.velocity.length(),0);assert(!hero.isShielding());assert.equal(hero.shots,0);if(elapsed<2-1e-8){assert.equal(hero.mode,'force-charge');assert.equal(hero.powerDamage,0);assert(!hero.powerEffect.diagnostics().beamVisible&&hero.powerEffect.root.visible);const pose=hero.nodes.forearm_l.getWorldQuaternion(new THREE.Quaternion());if(!firstPose)firstPose=pose;else if(firstPose.angleTo(pose)>.05)movedArms=true;}if(hero.capacitor.remaining>0)assert(!hero.launch(new THREE.Vector3(),new THREE.Vector3(0,0,1)));}
 assert(movedArms,'charge changes the casting pose');assert(Math.abs(hero.powerDamage-1680)<1e-6,'two-second windup preserves all four seconds of 420 DPS');assert.equal(hero.capacitor.casts,1);assert(!hero.powerEffect.root.visible);assert.equal(events.filter(m=>m==='Violet releases the force beam!').length,1);
 console.log('PASS',dt,'stationary animated charge, no early beam/damage/shield/orbs, full 1680 damage, one firing event and clean completion');
}
for(const reason of['self-defense','target-death','deselect','reset']){
 const {hero,robot}=fixture();hero.update(.5,.5);assert.equal(hero.capacitor.phase,'charging');
 if(reason==='self-defense'){const from=new THREE.Vector3(0,20,0),aimTarget=hero.root.position.clone();hero.receiveThreat({state:{phase:'charging'},targetUnit:{alive:true,kind:'hero',entity:hero},attackId:'self',from,direction:aimTarget.clone().sub(from).normalize(),aimTarget});hero.update(.1,.6);assert(hero.isShielding());}
 else if(reason==='target-death'){robot.combatUnit.alive=false;hero.update(.1,.6);}
 else if(reason==='deselect')hero.setEnabled(false);else hero.reset();
 assert.equal(hero.capacitor.remaining,0);assert.equal(hero.capacitor.phase,'idle');assert.equal(hero.powerDamage,0);assert(!hero.powerEffect.root.visible);console.log('PASS charge cancellation:',reason);
}
