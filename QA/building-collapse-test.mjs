import assert from 'node:assert/strict';
import {DestructionWorld} from '../dist/destruction.js';
import {traceImpact} from '../dist/combat-collision.js';
const tower=w=>{for(let f=0;f<12;f++){
 for(let side=0;side<4;side++)for(let j=0;j<4;j++){const a=side*Math.PI/2,u=(j-1.5)*2.5;w.addChunk({building:'tower',type:'wall',floor:f,x:5*Math.sin(a)+u*Math.cos(a),y:f*3+1.5,z:5*Math.cos(a)-u*Math.sin(a),yaw:a,size:[2.5,2.72,.32]});}
 for(let x=0;x<3;x++)for(let z=0;z<3;z++)w.addChunk({building:'tower',type:'slab',floor:f,x:(x-1)*10/3,y:(f+1)*3,z:(z-1)*10/3,size:[10/3,.28,10/3]});
 for(const x of[-4.78,4.78])for(const z of[-4.78,4.78])w.addChunk({building:'tower',type:'column',floor:f,x,y:f*3+1.5,z,size:[.48,2.72,.48]});
}return w.buildings.get('tower');};
for(const dt of[1/60,.075]){let syncs=0;const w=new DestructionWorld({maxDynamic:8,onMove:()=>syncs++}),b=tower(w),other=w.addChunk({building:'neighbor',type:'wall',floor:0,x:40,y:12,z:0,size:[2.5,2.72,.32]});
 for(const c of b.chunks.slice(0,260))w.damageChunk(c,100,{source:'siege-walker'});
 assert(!b.collisionDisabled,'74.7% must still have collision');
 const moving=b.chunks[300];w.detach(moving,moving.body.position,.1);assert(b.collisionDisabled);assert(w.falling.size===348);assert(w.dynamic.length===0);assert(b.chunks.every(c=>c.collisionDisabled&&c.state==='falling'));assert(!traceImpact({x:0,y:20,z:-10},{x:0,y:20,z:10},{sections:b.chunks,ground:false}));
 const height=moving.body.position.y;w.step(dt);assert(moving.body.position.y!==height,'release must preserve fragment motion instead of freezing');assert(syncs>0);
 for(let t=0;t<12;t+=dt)w.step(dt);
 assert.equal(w.falling.size,0);assert(b.chunks.every(c=>c.state==='settled'&&c.body.position.y<3));assert(other.state==='intact'&&other.body.position.y===12&&!other.collisionDisabled);assert(b.chunks.every(c=>Number.isFinite(c.body.position.y)&&Math.abs(Math.hypot(c.body.quaternion.x,c.body.quaternion.y,c.body.quaternion.z,c.body.quaternion.w)-1)<1e-6));
 w.reset();assert(w.falling.size===0&&w.dynamic.length===0&&w.queue.length===0);assert(b.chunks.every(c=>!c.collisionDisabled&&c.state==='intact'&&c.body.position.y===c.y));
 // A second release/reset while still airborne must not leave stale animation work.
 for(const c of b.chunks.slice(0,261))w.damageChunk(c,100,{source:'siege-walker'});w.step(dt);w.reset();w.step(dt);assert(b.chunks.every(c=>c.body.position.y===c.y));
 console.log('PASS 12-storey tower: threshold, falling transforms, 348 settled nonblocking pieces, bounded bodies, neighbor isolation and mid-fall rebuild at dt',dt);
}
const terrain=new DestructionWorld();terrain.addTerrainPyramid({x:0,z:0,height:5,slopeX:.4,slopeZ:.4});const c=terrain.addChunk({building:'hill',type:'wall',floor:0,x:0,y:20,z:0,size:[1,1,1]});terrain.damageChunk(c,100,{source:'siege-walker'});for(let i=0;i<600;i++)terrain.step(1/60);c.body.updateAABB();assert(Math.abs(c.body.aabb.lowerBound.y-terrain.terrainHeight(c.body.position.x,c.body.position.z))<1e-6);console.log('PASS released debris settles on terrain at its rotated lower bound');
