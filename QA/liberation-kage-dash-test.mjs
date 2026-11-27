// City Liberation: Kage's dash takes half of a regular enemy's max health, so the yellow "dash can finish"
// flash only appears on wounded Bruisers and drones. Other modes and bosses keep the flat dash damage.
// Needs the private SpiderBot runtime asset (dist/city-assets/licensed-robots/) like city-liberation-test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {CityLiberation,LIBERATION_KAGE_DASH_FRACTION} from '../dist/city-liberation.js';
import {SiegeWalker} from '../dist/siege-walker.js';
import {spec,gltfModel} from './walker-fixture.mjs';
import {NinjaMotion,NINJA} from '../dist/ninja-motion.js';
import {mission1CityBuildings} from '../dist/evac-city-map.js';
registerHooks({resolve(name,ctx,next){return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,ctx);}});
const {kageHitPower,kageDashCanFinish}=await import('../dist/kage-attacks.js');

let seed=0x5badcafe;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32;};
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const bytes=fs.readFileSync(new URL('../dist/city-assets/licensed-robots/breaker-spider.glb',import.meta.url));
const spiderModel=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new THREE.Scene(),physics=new DestructionWorld(),hero={root:new THREE.Group(),motion:new NinjaMotion()};
hero.root.position.set(0,.08,96);
const heroUnit={id:'kage',kind:'hero',alive:true,entity:hero,shapes:[{center:hero.root.position.clone().add(new THREE.Vector3(0,1,0)),half:{x:.6,y:1,z:.6}}]};
const layout=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url)));
const buildings=mission1CityBuildings(layout.buildings);
for(const wall of buildings)physics.addChunk({type:'wall',building:wall.id,floor:0,x:wall.x,z:wall.z,y:wall.floors*1.5,size:[10,wall.floors*3,10]});
const clear=(a,b,radius=0)=>!traceImpact(a,b,{sections:physics.chunks,ground:false,radius});
const walker=new SiegeWalker(scene,gltfModel,spec,{weaponHealthMultiplier:10,onEffect(){},onDebris:s=>physics.addWreck(s),onRemoveDebris:b=>physics.removeWreck(b)});
let run;
const damage=new UnitDamage((u,p)=>{if(u===walker.combatUnit)walker.destroy();else run.disable(u,p);});
damage.add('siege-walker','robot',walker,walker.weapons.maxHealth);
run=new CityLiberation(scene,damage,{
 walker,ui:{reset(){},sync(){}},buildings,visible:clear,openStreet:p=>clear({...p,y:.3},{...p,y:24},3),getTargets:()=>[heroUnit],
 onEvent(){},ring(){},arc(){},startArsenal(){},finalBossDefeated:()=>false,
 bruiser:{spiderModel,visible:clear,isPathClear:(a,b)=>clear({...a,y:a.y+1.3},{...b,y:b.y+1.3},1.9),trace:()=>null},
 drone:{physics,visible:clear,trace:()=>null,roof:()=>null,redirect:()=>null,audio:()=>null,particle(){},burst(){},onWreck(){},onRemoveSmoke(){},cameraImpact(){},onRoundHit(){}}
});
run.start('ninja',hero);
let t=0;const tick=s=>{for(let i=0;i<Math.round(s*30);i++){run.update(1/30,t+=1/30);physics.step(1/30);run.syncWrecks();}};
tick(18);
const spawned=run.actors.filter(a=>a.combatUnit?.alive);
assert(spawned.some(a=>run.flightDrones.includes(a))&&spawned.some(a=>!run.flightDrones.includes(a)),'district 1 has Bruisers and drones');
assert.equal(LIBERATION_KAGE_DASH_FRACTION,.5);
for(const actor of spawned){
 const u=actor.combatUnit,kind=run.flightDrones.includes(actor)?'drone':'Bruiser';
 assert.equal(u.kageDashFraction,.5,kind+' is marked');
 assert(u.maxHealth<NINJA.dashDamage,kind+' district-1 health '+u.maxHealth+' is below the flat dash ('+NINJA.dashDamage+'), the original problem');
 assert.equal(kageHitPower({unit:u},NINJA.dashDamage,'ninja-dash'),u.maxHealth/2,'dash takes half of max health');
 assert.equal(kageHitPower({unit:u},180,'ninja-slash'),180,'slash is unchanged');
 assert.equal(kageDashCanFinish(u,NINJA.dashDamage),false,kind+' at full health does not flash');
 damage.hurt(u,u.maxHealth*.4,actor.root.position,'hull');
 assert.equal(kageDashCanFinish(u,NINJA.dashDamage),false,kind+' at 60% does not flash');
 damage.hurt(u,u.maxHealth*.1,actor.root.position,'hull');
 assert.equal(kageDashCanFinish(u,NINJA.dashDamage),true,kind+' at 50% flashes');
 console.log('PASS',kind,'max',u.maxHealth,'dash',u.maxHealth/2,'→ flashes only at ≤50%');
}
// A fresh enemy survives one dash and the second dash finishes it.
// Every spawned unit was damaged above; take a newly spawned one.
tick(30);const next=run.actors.find(a=>a.combatUnit?.alive&&a.combatUnit.health===a.combatUnit.maxHealth);
assert(next,'a fresh enemy spawned');const u=next.combatUnit;
damage.hurt(u,kageHitPower({unit:u},NINJA.dashDamage,'ninja-dash'),next.root.position,'hull');assert(u.alive&&u.health===u.maxHealth/2,'first dash leaves half');
assert(kageDashCanFinish(u,NINJA.dashDamage));damage.hurt(u,kageHitPower({unit:u},NINJA.dashDamage,'ninja-dash'),next.root.position,'hull');assert(!u.alive,'second dash finishes');
// Bosses and other modes keep the flat dash.
assert.equal(walker.combatUnit.kageDashFraction,undefined,'Siege Walker is not marked');
const plain={alive:true,kind:'robot',entity:{},maxHealth:350,health:350,shapes:[{part:'hull'}]};
assert.equal(kageHitPower({unit:plain},NINJA.dashDamage,'ninja-dash'),NINJA.dashDamage,'unmarked enemies (other modes) take the flat dash');
console.log('PASS fresh enemy survives one dash, second dash finishes; walker and other modes keep the flat',NINJA.dashDamage);
