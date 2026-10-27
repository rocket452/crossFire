import * as CANNON from './vendor/cannon-es.js';
// Static architecture is spatially indexed; Cannon still solves all actual contacts.
// Rebuild only when a section detaches, settles, or the city resets.
export class CityBroadphase extends CANNON.Broadphase {
 constructor(){super();this.cells=new Map();this.planes=[];this.staticDirty=true;this.useBoundingBoxes=true;}
 markStaticsDirty(){this.staticDirty=true;}
 bounds(body){if(body.aabbNeedsUpdate)body.updateAABB();return body.aabb;}
 keys(aabb){const lo=aabb.lowerBound,hi=aabb.upperBound;const keys=[];for(let x=Math.floor(lo.x/6);x<=Math.floor(hi.x/6);x++)for(let y=Math.floor(lo.y/4);y<=Math.floor(hi.y/4);y++)for(let z=Math.floor(lo.z/6);z<=Math.floor(hi.z/6);z++)keys.push(x+','+y+','+z);return keys;}
 rebuild(world){this.cells.clear();this.planes=[];for(const b of world.bodies){if(b.type!==CANNON.Body.STATIC)continue;if(b.shapes.some(s=>s.type===CANNON.Shape.types.PLANE)){this.planes.push(b);continue;}for(const key of this.keys(this.bounds(b))){if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(b);}}this.staticDirty=false;}
 collisionPairs(world,p1,p2){if(this.staticDirty)this.rebuild(world);const moving=world.bodies.filter(b=>b.type!==CANNON.Body.STATIC);for(let i=0;i<moving.length;i++){const b=moving[i],seen=new Set();for(const plane of this.planes)if(this.needBroadphaseCollision(b,plane))this.intersectionTest(b,plane,p1,p2);for(const key of this.keys(this.bounds(b))){for(const s of this.cells.get(key)||[]){if(seen.has(s.id))continue;seen.add(s.id);if(this.needBroadphaseCollision(b,s))this.intersectionTest(b,s,p1,p2);}}for(let j=i+1;j<moving.length;j++)if(this.needBroadphaseCollision(b,moving[j]))this.intersectionTest(b,moving[j],p1,p2);}}
 aabbQuery(world,aabb,result=[]){for(const b of world.bodies)if(this.bounds(b).overlaps(aabb))result.push(b);return result;}
}
