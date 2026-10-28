import assert from 'node:assert/strict';
import {RunnerMotion,terrainHeight} from '../dist/runner-motion.js';
const q={x:0,y:0,z:0,w:1};
function box(x,y,z,size,type='wall'){return{state:'intact',type,size,body:{position:{x,y,z},quaternion:q}};}
// Continuous building facade and a roof, with the same support states as game chunks.
const facade=box(0,6,5,[10,12,.32]),roof=box(0,12,0,[10,.28,10],'slab'),sections=[facade,roof];
const r=new RunnerMotion();r.reset({x:0,y:.08,z:10});r.yaw=Math.PI;
for(let i=0;i<120;i++)r.step({forward:1,boost:true},1/60,sections);
console.log(r.diagnostics());assert(r.climbs>=1);assert(r.roofs>=1,'must crest the roof');
r.reset({x:0,y:.08,z:10});r.yaw=Math.PI;let onWall=false;
for(let i=0;i<120;i++){r.step({forward:1},1/60,sections);if(r.mode==='wall'&&r.position.y>3){onWall=true;break;}}
assert(onWall);const old=r.position.y;facade.state='dynamic';for(let i=0;i<20;i++)r.step({},1/60,sections);assert(r.position.y<old,'lost wall support must cause a fall');facade.state='intact';
r.reset({x:50,y:terrainHeight(50,30),z:30});r.yaw=0;for(let i=0;i<25;i++)r.step({forward:1},1/60,[]);assert(Math.abs(r.position.y-terrainHeight(r.position.x,r.position.z))<.03);assert(r.position.y>1);
r.reset();r.step({jump:true},1/60,[]);assert(r.position.y>.08);for(let i=0;i<180;i++)r.step({},1/60,[]);assert.equal(r.mode,'ground');assert(Math.abs(r.position.y-.08)<.001);
r.reset();for(let i=0;i<60;i++)r.step({forward:1,boost:true},1/60,[]);assert(r.speed>40);const before=r.position.z;for(let i=0;i<60;i++)r.step({},1/60,[]);assert(r.speed<.01);assert(Math.abs(r.position.z-before)<4);
console.log('PASS boosted motion, swept facade capture, wall-to-roof transition, lost-support gravity, terrain following, ballistic jump and release braking');
const angle=.30,tilted=box(0,2,0,[6,.4,6],'slab');tilted.state='settled';tilted.body.quaternion={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)};
r.reset({x:0,y:2+.2/Math.cos(angle),z:0});r.step({},1/60,[tilted]);assert(r.normal.y>.9&&r.normal.x<-.2);assert(r.position.y>2);tilted.state='dynamic';for(let i=0;i<90;i++)r.step({},1/60,[tilted]);assert.equal(r.mode,'ground');assert(Math.abs(r.position.y-.08)<.001);
console.log('PASS sloped settled debris support and falling when that support moves');
const {DestructionWorld}=await import('../dist/destruction.js');const world=new DestructionWorld();world.addTerrainPyramid({x:50,z:39,height:3.8,slopeX:.6,slopeZ:.28});const debris=world.addWreck({position:{x:50,y:8,z:39},quaternion:q,size:[.4,.4,.4],mass:50});for(let i=0;i<120;i++)world.step(1/60);assert(debris.position.y>2,'rigid debris must contact the rendered hill rather than the flat ground below');assert(debris.position.y>terrainHeight(debris.position.x,debris.position.z));
console.log('PASS terrain also collides with real rigid-body debris');
