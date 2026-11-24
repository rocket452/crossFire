import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {WalkerSniper} from '../dist/walker-sniper.js';
import {traceImpact} from '../dist/combat-collision.js';
import {gltfModel, spec} from './walker-fixture.mjs';
import {SiegeWalker} from '../dist/siege-walker.js';

function test(dt, scenario){
 const scene=new THREE.Scene(),robot=new SiegeWalker(scene,gltfModel,spec,{});
 robot.root.updateMatrixWorld(true);
 const forward=new THREE.Vector3(0,0,1).transformDirection(robot.nodes.plasma_cannon.parent.matrixWorld);
 const muzzle=robot.aimPlasma().position;
 const center=muzzle.clone().addScaledVector(forward,175);
 center.y+=16;
 const unit={id:'roof-hero',alive:true,shapes:[{center,half:{x:.65,y:1,z:.65}}]};
 const walls=[];
 let enabled=true, impact=null, redirect=scenario==='redirect';
 const sniper=new WalkerSniper(scene,{
  getMuzzle:target=>robot.aimPlasma(target),
  getTargets:()=>[unit],
  canFire:()=>enabled,
  traceCover:(a,b)=>traceImpact(a,b,{sections:walls,ground:false}),
  traceShot:(a,b,radius)=>traceImpact(a,b,{sections:walls,targets:[unit],radius}),
  redirect:(_shot,a)=> {
   if(!redirect)return null;
   redirect=false;
   return {position:a.clone(),direction:new THREE.Vector3(1,0,0)};
  },
  onImpact:(p,hit)=>{impact=hit;}, onLaunch:()=>{}, onEvent:()=>{}
 });
 const step=()=>sniper.update(dt);
 const lateral=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
 const wall={size:[8,8,8]};
 const wallPosition=muzzle.clone().lerp(center,.55);
 Object.assign(wall,{x:wallPosition.x,y:wallPosition.y,z:wallPosition.z});
 if(scenario==='hidden')walls.push(wall);
 assert.equal(sniper.beginVolley(),scenario!=='hidden');
 if(scenario==='hidden')return;
 while(sniper.clock<.4)step();
 center.addScaledVector(lateral,2);
 step();
 assert(sniper.shells[0].target.distanceTo(center)<1e-8);
 for(let i=0;i<3000&&!sniper.shells[0]?.lockedAt;i++)step();
 assert(sniper.shells[0]?.lockedAt);
 assert(sniper.laser.visible);
 if(scenario==='disarm')enabled=false;
 if(scenario==='dodge')center.addScaledVector(lateral,5);
 if(scenario==='wall')walls.push(wall);
 const fixed=sniper.shells[0].target.clone();
 step();
 if(scenario!=='disarm')assert(sniper.shells[0].target.equals(fixed));
 while(sniper.busy && sniper.clock<8)step();
 assert.equal(sniper.busy,false);
 assert.equal(sniper.launched,scenario==='disarm'?0:1);
 assert.equal(impact?.kind,scenario==='hit'?'unit':scenario==='wall'?'building':undefined);
 assert.equal(sniper.laser.visible,false);
 assert.equal(sniper.round.visible,false);
 sniper.reset();
 assert.equal(sniper.history.length,0);
}
for(const dt of [1/30,1/60,1/120])for(const scenario of ['hidden','hit','dodge','wall','disarm','redirect'])test(dt,scenario);
console.log('PASS live aiming with the Walker mesh, rooftop hits, fixed lock and dodge, cover, disarm, redirect and reset at 30/60/120 Hz');
