import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.module.js';
import {traceImpact} from '../dist/combat-collision.js';
import {riftRoofTarget} from '../dist/rift-player.js';

const building={id:'tower',x:0,z:0,floors:24};
const point=(x,y,z)=>new Vector3(x,y,z);
const facade={type:'wall',building:'tower',state:'intact',size:[10,72,.4],body:{position:point(0,36,-5)}};
const roof={type:'slab',building:'tower',state:'intact',size:[10,.2,10],body:{position:point(0,71.9,0)}};
const sections=[facade,roof];
const options={
 trace:(from,to,radius)=>traceImpact(from,to,{sections,ground:false,radius}),
 getBuilding:id=>id===building.id?building:null,
 roofBelow:(x,z,top,bottom)=>traceImpact(point(x,top,z),point(x,bottom,z),{
  sections:roof.state==='intact'?[roof]:[],ground:false,radius:0
 }),
 isClear:()=>true
};

const street=point(0,.18,-23),camera=point(0,.48,-24);
const aim=point(0,71,-5);
const ranged=riftRoofTarget(street,camera,aim,options,28);
assert(ranged,'aiming at the upper facade from street level selects the roof');
assert(Math.abs(ranged.landing.y-72.08)<1e-6);
assert(Math.abs(ranged.landing.z)<=3.75);
assert(street.distanceTo(ranged.landing)>72,'roof height does not eat horizontal Blink range');
assert(riftRoofTarget(street,camera,point(0,74,-4),options,28),'roof edge tolerance');
assert.equal(riftRoofTarget(street,camera,point(0,45,-5),options,28),null,'lower facade has no indicator');
assert.equal(riftRoofTarget(point(0,0,-38),camera,aim,options,28),null,'horizontal limit');
assert.equal(riftRoofTarget(point(0,-20,-23),camera,aim,options,28),null,'vertical limit');
assert.equal(riftRoofTarget(street,camera,aim,{...options,isClear:()=>false},28),null,'blocked arrival');
roof.state='detached';
assert.equal(riftRoofTarget(street,camera,aim,options,28),null,'a destroyed roof has no indicator');
console.log('PASS tall-roof aiming from the street, aim tolerance, range and clear landing checks');
