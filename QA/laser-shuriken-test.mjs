import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {LaserShuriken} from '../dist/laser-shuriken.js';
import {ShurikenWorld} from '../dist/shuriken-world.js';
const config=JSON.parse(fs.readFileSync('dist/ninja-shuriken-config.json'));
const units=[],events=[],hand=new THREE.Vector3(0,2,0);
function robot(x,z){
 const root=new THREE.Group();root.position.set(x,2,z);
 const u={id:units.length,entity:{root},alive:true,shapes:[{center:root.position,half:{x:.4,y:.7,z:.4}}]};
 units.push(u);return u;
}
const target=robot(0,10);
const world=new ShurikenWorld(config,{getSections:()=>[],getEnemies:()=>units});
const hero={scene:new THREE.Scene(),character:{hand:()=>hand},shurikenWorld:world,getDashEnemies:()=>units,
 shurikenEffects:{tone(){}},aim:()=>new THREE.Vector3(0,2.22,80),hit:(hit,power,kind)=>events.push({unit:hit.unit,power,kind})};
const star=new LaserShuriken(hero,config.laserStar);
const step=(frames,held=false)=>{for(let i=0;i<frames;i++)star.update(1/120,held);};
step(120,true);assert.equal(star.power,1);step(32);assert.equal(star.state,'flying');
step(1,true);assert.equal(star.host,target);step(60);assert(events.filter(e=>e.kind==='laser-grind').length>=3);
target.entity.root.position.x+=1;step(1);assert.equal(star.mesh.position.x,1);
hand.x=10;const second=robot(5.5,star.mesh.position.z/2);step(1,true);assert.equal(star.state,'returning');step(90);
assert.equal(star.state,'ready');assert.equal(events.filter(e=>e.unit===second&&e.power===100).length,1);
step(1,true);assert(star.power<.1);step(5);step(1,true);assert.equal(star.state,'grinding');assert.equal(star.host,null);
step(250);assert(['returning','ready'].includes(star.state));star.reset();assert(!star.mesh.visible);
console.log('PASS full and tap charge, stop grace, grinding, moving host, hover timeout and one return hit along repositioned path');
