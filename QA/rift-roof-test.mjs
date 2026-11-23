import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.module.js';
import {traceImpact} from '../dist/combat-collision.js';
import {RiftPlayer,riftRoofTarget} from '../dist/rift-player.js';

const building={id:'tower',x:0,z:0,floors:24};
const point=(x,y,z)=>new Vector3(x,y,z);
const facade={type:'wall',building:'tower',state:'intact',size:[10,72,.4],body:{position:point(0,36,-5)}};
const roof={type:'slab',building:'tower',state:'intact',size:[10,.2,10],body:{position:point(0,71.9,0)}};
const sections=[facade,roof];
const options={
 buildings:[building],
 trace:(from,to,radius)=>traceImpact(from,to,{sections,ground:false,radius}),
 getBuilding:id=>id===building.id?building:null,
 roofBelow:(x,z,top,bottom)=>traceImpact(point(x,top,z),point(x,bottom,z),{
  sections:roof.state==='intact'?[roof]:[],ground:false,radius:0
 }),
 isClear:()=>true
};

const street=point(0,.18,-23),camera=point(0,.48,-24);
const aim=point(0,71,-5);
const ranged=riftRoofTarget(street,camera,aim,options);
assert(ranged,'aiming at the upper facade from street level selects the roof');
assert(Math.abs(ranged.landing.y-72.08)<1e-6);
assert(Math.abs(ranged.landing.z)<=3.75);
assert(street.distanceTo(ranged.landing)>72,'roof height does not eat horizontal Blink range');
assert(riftRoofTarget(street,camera,point(0,74,-4),options),'roof edge tolerance');
assert(riftRoofTarget(street,camera,point(0,64,-5),options),'upper facade of a tall building below the old 4 m aim margin');
assert.equal(riftRoofTarget(street,camera,point(0,45,-5),options),null,'lower facade has no indicator');
const farStreet=point(0,.18,-115.75),farCamera=point(0,.48,-123.75);
const farRoof=riftRoofTarget(farStreet,farCamera,aim,options);
assert(farRoof,'an eligible rooftop can be reached from 112 m away');
assert.equal(farRoof.landing.z-farStreet.z,112);
let outOfRange=false;
assert.equal(riftRoofTarget(farStreet.clone().setZ(-115.76),farCamera,aim,{
 ...options,onOutOfRange:()=>{outOfRange=true;}
}),null,'roof beyond 112 m');
assert(outOfRange,'a visible safe roof outside Blink range gives HUD feedback');
assert.equal(riftRoofTarget(point(0,-20,-23),camera,aim,options),null,'vertical limit');
assert.equal(riftRoofTarget(street,camera,aim,{...options,isClear:()=>false}),null,'blocked arrival');

// Looking from another rooftop through a seam in the modular upper facade.
const roofFeet=point(0,70,-64),roofCamera=point(0,69,-71),across=point(0,69,18);
const sidePanels=[-3,3].map(x=>({...facade,collisionHalf:undefined,size:[2,72,.4],body:{position:point(x,36,-5)}}));
const tracePanels=(start,end,radius)=>traceImpact(start,end,{sections:[...sidePanels,roof],ground:false,radius});
assert.equal(tracePanels(roofCamera,across,0),null);
const acrossRoof=riftRoofTarget(roofFeet,roofCamera,across,{...options,trace:tracePanels,standingBuilding:'other tower'});
assert(acrossRoof&&Math.abs(acrossRoof.landing.y-72.08)<1e-6,'upper facade seam still selects the rooftop across the street');
const ownFeet=point(0,72.08,-3),ownView=point(0,76,-4),ownAim=point(2,71,3);
assert(riftRoofTarget(ownFeet,ownView,ownAim,options),'this rooftop would otherwise be an eligible aim target');
assert.equal(riftRoofTarget(ownFeet,ownView,ownAim,{...options,standingBuilding:building.id}),null,'skip the building underfoot on exact hits');
assert.equal(riftRoofTarget(ownFeet,ownView,ownAim,{...options,trace:()=>null,standingBuilding:building.id}),null,'skip the building underfoot for silhouette targeting too');
const cover={...facade,building:'foreground',body:{position:point(0,36,-40)}};
assert.equal(riftRoofTarget(roofFeet,roofCamera,across,{
 ...options,trace:(start,end,radius)=>traceImpact(start,end,{sections:[cover,...sidePanels,roof],ground:false,radius})
}),null,'foreground cover blocks silhouette targeting');
roof.state='detached';
assert.equal(riftRoofTarget(street,camera,aim,options),null,'a destroyed roof has no indicator');

const player=Object.create(RiftPlayer.prototype);
Object.assign(player,{
 hero:{root:{position:point(0,.18,0)},time:0,portals:[],openPortal:()=>({}),addTrace(){},emit(){},teleports:0},
 blinkCooldown:0,roofMarker:{visible:false},blocked:()=>null,terrain:()=>0,
 bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200}
});
player.blink(point(0,0,1));
assert.equal(player.hero.root.position.z,28,'regular Blink remains 28 m');
console.log('PASS 112 m rooftop Blink, 28 m regular Blink, aim tolerance, height and clear landings');
