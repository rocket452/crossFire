import assert from 'node:assert/strict';
import {BuildingSmoke} from '../dist/building-smoke.js';
const buildings=new Map(),hits=[];
const add=id=>{const chunks=Array.from({length:10},(_,i)=>({hp:10,maxHp:10,size:[2,3,.3],body:{position:{x:i*5,y:i*3,z:0}}}));buildings.set(id,{chunks});return chunks;};
const a=add('A'),fx=new BuildingSmoke({getBuildings:()=>buildings,emit:(point,intensity)=>hits.push({point,intensity})});
const tick=seconds=>{for(let t=0;t<seconds;t+=.25)fx.update(.25);};
a[0].hp=0;tick(2);assert.equal(hits.length,0,'one damaged panel is not major structural damage');a[1].hp=0;tick(2);assert(hits.length>0&&fx.activeBuildings===1);assert(hits.every(h=>Math.hypot(h.point.outwardX,h.point.outwardZ)===1),'intact buildings vent outside their facade');const first=hits.length;
for(const c of a)c.hp=0;tick(2);assert(hits.length-first>first,'heavier damage emits more smoke');
// Sources use live transforms instead of their original storey coordinates.
for(const c of a){c.hasDetached=true;c.body.position.y=1;}hits.length=0;tick(2);assert(hits.every(h=>h.point.y<=2),'collapsed structure smokes from the rubble');
for(let i=0;i<30;i++)for(const c of add('B'+i))c.hp=0;
hits.length=0;tick(5);assert(hits.length<=120,'global 24-puff/sec budget holds for a whole ruined city');assert(fx.activeBuildings===31);
for(const b of buildings.values())for(const c of b.chunks){c.hp=c.maxHp;c.hasDetached=false;}fx.reset();hits.length=0;tick(2);assert.equal(fx.emitted,0);assert.equal(hits.length,0);assert.equal(fx.records.size,0);console.log('PASS significant-damage threshold, severity ramp, live rubble sources, global city budget and rebuild clearing');
