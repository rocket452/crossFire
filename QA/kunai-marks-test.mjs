import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Group,Scene,Quaternion,Vector3} from '../dist/vendor/three.module.js';
import {KunaiMarks} from '../dist/kunai-marks.js';
import {ShurikenWorld} from '../dist/shuriken-world.js';

const shurikenConfig=JSON.parse(fs.readFileSync('dist/ninja-shuriken-config.json'));
const v=(x,y,z)=>new Vector3(x,y,z);
const scene=new Scene(),sections=[],enemies=[];
const world=new ShurikenWorld(shurikenConfig,{getSections:()=>sections,getEnemies:()=>enemies,
 getBounds:()=>({minX:-40,maxX:40,minZ:-40,maxZ:40})});
const origin=v(0,0,15);
const hero={scene,camera:{quaternion:new Quaternion()},shurikenConfig,shurikenWorld:world,shuriken:{},shurikenEffects:{event(){}},
 arrive:(point,config,faceOrigin)=>{hero.arrival={point,config,faceOrigin};return origin;}};
const marks=new KunaiMarks(hero);
function target(x,z){
 const root=new Group();root.position.set(x,0,z);
 const unit={kind:'robot',alive:true,entity:{root},shapes:[{center:v(x,1.5,z),half:v(1,1.5,1)}]};
 enemies.push(unit);return unit;
}
const a=target(0,6),b=target(8,6);
const hit=unit=>({unit,point:unit.shapes[0].center});
// Only one target holds marks: marking b clears a.
marks.place(a);marks.place(a);marks.place(b);
assert.equal(marks.count(a),0);assert.equal(marks.count(b),1);assert.equal(marks.marked(),b);
assert(!marks.teleport());
marks.place(a);assert.equal(marks.count(b),0);marks.place(a);marks.place(a);marks.place(a);marks.step(.016);
assert.equal(marks.count(a),3);assert.equal(marks.marks.size,1);
assert.equal(marks.marks.get(a).group.children[0].material,marks.aimed);
const rear=world.rearLanding.bind(world);
world.rearLanding=()=>({valid:false});assert(!marks.teleport());assert.equal(marks.count(a),3);
// Q teleports without any aim input.
world.rearLanding=rear;assert(marks.teleport());
assert(hero.arrival.point.z<6);assert(hero.arrival.faceOrigin);assert(hero.arrival.config.refreshDash);
assert.equal(marks.count(a),0);assert.equal(marks.marks.size,0);assert.equal(hero.shuriken.crosscutTarget,a);
marks.place(b);b.alive=false;marks.step(.1);assert.equal(scene.children.length,0);
marks.place(a,3,3);marks.step(3);assert(!marks.teleport());
console.log('PASS single marked target, three-mark cap, ready feedback, Q teleport without aiming, landing validation, safe rear arrival, dash refresh, consumption and cleanup');
