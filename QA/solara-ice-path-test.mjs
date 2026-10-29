import assert from 'node:assert/strict';import * as THREE from '../dist/vendor/three.module.js';import {SolaraIcePath} from '../dist/solara-ice-path.js';
const material=new THREE.MeshStandardMaterial({flatShading:true}),edge=new THREE.MeshBasicMaterial();
function simulate(hz,life,profile,seconds=14){const ribbon=new SolaraIcePath(material,edge,life===9.6?192:96),path=[];let previous=null,clock=0,worst=0;
 for(let i=0;i<seconds*hz;i++){const t=i/hz,foot=profile(t),next=profile(t+1/hz),velocity=next.clone().sub(foot).multiplyScalar(hz);clock-=1/hz;if(clock<=0){if(!previous)previous=foot.clone();if(foot.distanceTo(previous)>.15){path.push({a:previous.clone(),b:foot.clone(),life});if(path.length>(life===9.6?192:96))path.shift();previous.copy(foot);}clock=.045;}
  for(let j=path.length-1;j>=0;j--){path[j].life-=1/hz;if(path[j].life<=0)path.splice(j,1);}ribbon.update(path,foot,velocity,0,1/hz);assert(ribbon.mesh.count<=ribbon.capacity);const p=ribbon.mesh.geometry.attributes.position,e=ribbon.edges.geometry.attributes.position;
  for(let v=0;v<ribbon.rows.length*4;v++){assert(Number.isFinite(p.getX(v))&&Number.isFinite(p.getY(v))&&Number.isFinite(p.getZ(v)));assert(Number.isFinite(e.getX(v)));}
  const indices=ribbon.mesh.geometry.index.array;for(let j=0;j<ribbon.mesh.count-1;j++){const row=(j+1)*4;assert.equal(indices[j*24+1],row);assert.equal(indices[(j+1)*24],row,'trail and live slide share the actual vertex row');}
  for(const r of ribbon.rows){assert(r.halfWidth<=1.85*.9+1e-8);worst=Math.max(worst,r.halfWidth);}
 }
 return{ribbon,path,worst};}
for(const hz of[30,60,120]){
 const straight=t=>new THREE.Vector3(20*t,30,0),old=simulate(hz,4.8,straight),long=simulate(hz,9.6,straight),length=r=>r.path.at(-1).b.distanceTo(r.path[0].a),ratio=length(long)/length(old);assert(Math.abs(ratio-2)<.025,'twice the retained physical trail length '+ratio);
 const curve=simulate(hz,9.6,t=>new THREE.Vector3(Math.sin(t*.65)*14,30+Math.sin(t*.3)*2,Math.cos(t*.65)*14));assert(curve.ribbon.rows.length>100);const direction=curve.ribbon.direction.clone(),tail=curve.ribbon.rows.at(-1).center.clone().sub(curve.ribbon.rows.at(-2).center).normalize();assert(direction.dot(tail)>.85,'live slide rotates into the current turn');
 const bend=simulate(hz,9.6,t=>new THREE.Vector3(t<4?t*5:20,30,t<4?0:(t-4)*5),8);assert(bend.ribbon.rows.every(r=>r.center.toArray().every(Number.isFinite)));bend.ribbon.reset();assert.equal(bend.ribbon.mesh.geometry.drawRange.count,0);assert.equal(bend.ribbon.edges.count,0);assert.equal(bend.ribbon.rows.length,0);
 console.log('PASS',hz,'Hz: continuous indexed turn joins, rotated live slide, capped corner width, finite slopes/sharp turn, double retained length',ratio.toFixed(4),long.ribbon.mesh.count,'segments, two fixed draws and reset');
}
const still=new SolaraIcePath(material,edge);for(let i=0;i<200;i++)still.update([],new THREE.Vector3(0,30,0),new THREE.Vector3(),0,1/60);assert(still.rows.length<=4);assert(still.direction.toArray().every(Number.isFinite));
