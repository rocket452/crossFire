import assert from 'node:assert/strict';import * as THREE from '../dist/vendor/three.module.js';import {PortalHero} from '../dist/portal-hero.js';
import {RiftPlayer} from '../dist/rift-player.js';
import {traceImpact} from '../dist/combat-collision.js';
const h=Object.create(PortalHero.prototype),v=(x,y,z)=>new THREE.Vector3(x,y,z);Object.assign(h,{enabled:true,time:1,redirected:0,addTrace:()=>{},traceThreat:()=>null,pair:{entry:{id:'test',position:v(0,2,0),normal:v(0,0,1),radius:4.5,createdAt:0,expiresAt:12},exit:{position:v(20,2,0),normal:v(1,0,0),radius:4.5}}});const projectile={},out=h.redirect(projectile,v(0,2,3),v(0,2,-3));assert(out);assert(out.direction.distanceTo(v(1,0,0))<1e-8);assert(out.position.x>20);assert.equal(h.redirect(projectile,v(0,2,3),v(0,2,-3)),null);assert.equal(h.redirect({},v(8,2,3),v(8,2,-3)),null);h.traceThreat=()=>({t:.5});assert.equal(h.redirect({},v(0,2,3),v(0,2,-3)),null);h.traceThreat=()=>null;h.time=13;assert.equal(h.redirect({},v(0,2,3),v(0,2,-3)),null);console.log('PASS portal crossing, direction transform, rim miss, nearer cover, one-pass guard and expiry');

const model=new THREE.Scene(),parts=[];
for(const limb of ['upperarm','forearm','thigh','coat'])for(const side of ['l','r']){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
 mesh.name=limb+'_'+side;
 model.add(mesh);
 parts.push({name:mesh.name,pivot:[0,0,0]});
}
const hero=new PortalHero(new THREE.Scene(),{scene:model},{parts},{
 getRobot:()=>null,traceThreat:()=>null,traceBolt:()=>null
});
const player=Object.assign(Object.create(RiftPlayer.prototype),{
 hero,available:()=>true,blocked:()=>null,terrain:()=>0,getPlatforms:()=>[],roofBelow:()=>null,
 bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},hurt:{step(){},applyPose(){}},
 camera:new THREE.PerspectiveCamera(),stick:{value:{x:0,y:0}},hud:{toggleAttribute(){}},
 output:{},roofMarker:{visible:false},keys:new Set(),taps:new Set(),yaw:0,pitch:0,vertical:0,
 blinkCooldown:0,portalCooldown:0,attackPortalCharges:3,attackPortalRecharge:0
});
hero.player=player;
hero.active=true;
hero.root.position.set(0,.1,0);
const dt=1/60;
const step=(frames=1)=>{for(let i=0;i<frames;i++)hero.update(dt,hero.time+dt);};

player.press('KeyD');
step(20);
player.keys.delete('KeyD');
assert(hero.root.position.x<0);
assert(hero.root.getWorldDirection(v(0,0,0)).x<-.98,'body turns toward movement');
assert(player.camera.getWorldDirection(v(0,0,0)).z>.99,'body turning leaves camera aim unchanged');
player.press('KeyS');
step(20);
player.keys.delete('KeyS');
assert(hero.root.getWorldDirection(v(0,0,0)).z<-.98,'reversing turns the body');

player.press('KeyE');
step();
const exit=player.redirectExit;
const cross=portal=>hero.redirect({},portal.position.clone().addScaledVector(portal.normal,3),portal.position.clone().addScaledVector(portal.normal,-3));
assert(exit&&!exit.disc.visible&&!hero.pair&&!cross(exit),'first press places an inert exit');
assert.match(player.output.textContent,/Place entrance/);
player.press('KeyE');
step();
assert.equal(player.redirectExit,exit,'same place cannot activate an overlapping entrance');
hero.root.position.set(14,.1,0);
player.yaw=Math.PI/2;
player.press('KeyE');
step();
assert.equal(hero.pair.exit,exit);
assert(exit.disc.visible);
assert.equal(cross(exit),null,'only the entrance redirects');
const diverted=cross(hero.pair.entry);
assert(diverted.position.distanceTo(exit.position.clone().addScaledVector(exit.normal,1.2))<1e-8);
assert(diverted.direction.distanceTo(exit.normal)<1e-8,'shot leaves along the first portal aim');
step(301);
assert.equal(hero.pair,null);

const building={id:'perch',x:14,z:0,footprint:24,floors:8};
const roof={type:'slab',building:building.id,state:'intact',size:[24,.2,24],body:{position:v(14,23.9,0)}};
player.blocked=(a,b,radius)=>traceImpact(a,b,{sections:[roof],radius,ground:false});
player.roofBelow=(x,z,top,bottom)=>player.blocked(v(x,top,z),v(x,bottom,z),0);
player.getBuilding=id=>id===building.id?building:null;
player.buildings=[building];
hero.root.position.set(14,24.08,0);
player.pitch=-1.25;
player.press('KeyR');
step();
const attack=hero.portals.find(portal=>portal.playerAimed);
assert(attack&&attack.energy&&attack.kind==='attack','R opens a portal while aiming down from an intact rooftop');
assert(attack.position.y>25&&attack.normal.y<-.5,'placement stays clear of the roof while the portal aims down');
assert(!player.roofMarker.visible,'the controlled hero does not get a Blink marker on the roof underfoot');
assert.equal(player.attackPortalCharges,2);
assert(Math.abs(attack.expiresAt-attack.createdAt-5)<1e-8);
player.yaw=0;
step(60);
assert(hero.bolts.length>=2&&hero.bolts.every(bolt=>bolt.dir.distanceTo(attack.normal)<1e-8),
 'portal fires along the placed aim even after Rift turns or no boss is active');
for(let i=0;i<3;i++){player.press('KeyR');step();}
assert.equal(hero.portals.filter(portal=>portal.playerAimed).length,3,'three charges can deploy three simultaneous portals');
assert.equal(player.attackPortalCharges,0);
assert.match(player.output.textContent,/Attack portals 0\/3 · \+1 in/);
step(Math.round((attack.createdAt+5-hero.time)/dt)-1);
assert.equal(player.attackPortalCharges,0);
step();
assert.equal(player.attackPortalCharges,1,'first recharge remains tied to the first cast');
step(300);
assert.equal(player.attackPortalCharges,2);
step(300);
assert.equal(player.attackPortalCharges,3);
player.blocked=()=>true;
player.attackPortal(v(0,0,1));
assert.equal(player.attackPortalCharges,3,'blocked placement costs no charge');
console.log('PASS independent model turns, exit-first redirect, rooftop portals and serial charge recovery');
