import assert from 'node:assert/strict';
import {projectMinimap,civilianClusters,MINIMAP} from '../dist/hero-minimap.js';
const center={x:0,z:0},close=(a,b)=>assert(Math.abs(a-b)<1e-7);
for(const yaw of[0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI*3]){
 const forward=projectMinimap({x:Math.sin(yaw)*30,z:Math.cos(yaw)*30},center,yaw),right=projectMinimap({x:-Math.cos(yaw)*30,z:Math.sin(yaw)*30},center,yaw);
 close(forward.x,0);close(forward.y,-30*MINIMAP.radius/MINIMAP.range);close(right.x,30*MINIMAP.radius/MINIMAP.range);close(right.y,0);
}
const east=projectMinimap({x:30,z:0},center,Math.PI);assert(east.x>0);close(east.y,0);
const north=projectMinimap({x:0,z:-30},center,Math.PI);assert(north.y<0);close(north.x,0);
const far=projectMinimap({x:0,z:200},center,0);assert(far.edge);close(Math.hypot(far.x,far.y),MINIMAP.radius);assert(far.y<0);
const moving=projectMinimap({x:3,z:5},{x:3,z:5},1.3);close(moving.x,0);close(moving.y,0);
const people=Array.from({length:12},(_,i)=>({id:'person-'+i,x:(i%3-1)*.85,z:(Math.floor(i/3)-1.5)*.9}));let groups=civilianClusters(people);assert.equal(groups.length,1);assert.equal(groups[0].count,12);close(groups[0].x,0);close(groups[0].z,0);
groups=civilianClusters([...people,...people.map(p=>({...p,id:'other-'+p.id,x:p.x+30}))]);assert.equal(groups.length,2);assert.equal(groups.reduce((n,g)=>n+g.count,0),24);assert.equal(civilianClusters([]).length,0);
console.log('PASS camera-forward/up and right/right at cardinal/wrapped headings; hero centering; distant edge clamping; two distinct 12-person civilian clusters');
