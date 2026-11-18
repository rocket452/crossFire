import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const T=await import('../dist/vendor/three.module.js');
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const {AssetCity}=await import('../dist/asset-city.js');
const {ASSET_CITY}=await import('../dist/asset-city-config.js');
const {COMBAT_ARENA}=await import('../dist/combat-arena-config.js');
const {DestructionWorld}=await import('../dist/destruction.js');
const {traceImpact}=await import('../dist/combat-collision.js');
const {RunnerMotion}=await import('../dist/runner-motion.js');
const bytes=fs.readFileSync(new URL('../dist/city-assets/licensed-city/city-test.glb',import.meta.url));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const manifest=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/licensed-city/city-test.json',import.meta.url)));
const city=new AssetCity(asset,manifest),scene=new T.Scene(),batches={},records=new Map();
const sync=c=>{const batch=batches[c.visualKey],d=new T.Object3D();d.position.copy(c.body.position);d.quaternion.copy(c.body.quaternion);d.updateMatrix();batch.setMatrixAt(c.index,d.matrix);batch.setColorAt(c.index,new T.Color(c.tint).multiplyScalar(1-c.scorch));city.syncAttachments(c);};
const world=new DestructionWorld({maxDynamic:32,onMove:sync,onFreeze:sync,onDamage:sync,onDetach:sync});
const originalArena=JSON.stringify(COMBAT_ARENA),layout=city.layout({name:'test'});
city.install(scene,world,layout.buildings,batches,records);
assert.equal(layout.buildings.length,36);assert.equal(world.buildings.size,36);assert.equal(world.chunks.length,756);
assert.equal(JSON.stringify(COMBAT_ARENA),originalArena);
assert.equal(city.templates.size,37);assert.equal(city.attachments.size,36);
for(const [name,t]of city.templates){
 const g=t.geometry;assert(g.attributes.uv&&g.attributes.color,name+' preserves UVs and fallback colors');
 assert([...g.attributes.position.array].every(Number.isFinite));
 if(!name.startsWith('Advertising')){
  g.computeBoundingBox();assert(g.boundingBox.getCenter(new T.Vector3()).length()<.001,name+' centered on collider');
 }
}
for(const c of world.chunks){
 assert(c.bounds.containsPoint(new T.Vector3(c.x,c.y,c.z)));
 const m=new T.Matrix4();batches[c.visualKey].getMatrixAt(c.index,m);
 assert(new T.Vector3().setFromMatrixPosition(m).distanceTo(new T.Vector3(c.x,c.y,c.z))<.0001);
}
// Fixed street grid and existing spawn positions remain unobstructed at foot height.
for(const lane of COMBAT_ARENA.roadLanes){
 assert(!traceImpact({x:lane,y:1,z:-110},{x:lane,y:1,z:110},{sections:world.chunks,ground:false,radius:.6}));
 assert(!traceImpact({x:-110,y:1,z:lane},{x:110,y:1,z:lane},{sections:world.chunks,ground:false,radius:.6}));
}
for(const p of [COMBAT_ARENA.heroStart,COMBAT_ARENA.enemyCorner,...COMBAT_ARENA.mireguardSquads])assert(!traceImpact({x:p.x,y:2,z:p.z},{x:p.x,y:2.1,z:p.z},{sections:world.chunks,ground:false,radius:2}));
const tower=layout.buildings.find(b=>b.asset==='tower'),sections=world.buildings.get(tower.id).chunks;
assert(traceImpact({x:tower.x,y:12,z:tower.z-12},{x:tower.x,y:12,z:tower.z+12},{sections:world.chunks,ground:false}),'real tower blocks shots');
const roof=traceImpact({x:tower.x,y:50,z:tower.z},{x:tower.x,y:0,z:tower.z},{sections:world.chunks,ground:false});
assert.equal(roof.section.type,'slab');assert(Math.abs(roof.point.y-(manifest.assets.tower.height+.18))<.01);
for(const dt of [1/30,1/60,1/120]){
 const r=new RunnerMotion();r.bounds={...COMBAT_ARENA.movementBounds};r.reset({x:tower.x,y:.08,z:tower.z-10});r.yaw=0;
 for(let t=0;t<4;t+=dt)r.step({forward:1,boost:true},dt,world.chunks);
 assert(r.climbs>0&&r.roofs>0,'can climb imported tower at dt '+dt);
}
const part=sections.find(c=>c.type==='column'&&c.floor===0),neighbor=world.buildings.get(layout.buildings.find(b=>b.id!==tower.id).id).chunks[0];
const before=part.hp;world.damageChunk(part,10,{source:'volt-runner'});assert.equal(part.hp,before-1);assert(part.scorch>0);
world.impact(part.body.position,80,3,part,{source:'siege-walker',player:true});assert(part.hp===0&&part.hasDetached);
// Trigger a structural failure, allow bounded bodies + noncolliding rubble to settle.
for(const c of sections.filter(c=>c.type==='column'&&c.floor===0))world.impact(c.body.position,100,1,c,{source:'siege-walker',player:true});
for(let i=0;i<900;i++){world.step(1/60);for(const c of world.dynamic)sync(c);}
assert(sections.every(c=>c.collisionDisabled));assert(sections.every(c=>c.state==='settled'));assert(neighbor.hp===neighbor.maxHp&&!neighbor.hasDetached);
for(const [c,entries]of city.attachments)for(const {batch,index,offset}of entries){
 const actual=new T.Matrix4();batch.getMatrixAt(index,actual);const expected=new T.Matrix4().compose(new T.Vector3().copy(c.body.position),new T.Quaternion().copy(c.body.quaternion),new T.Vector3(1,1,1)).multiply(offset);
 assert(actual.elements.every((v,i)=>Math.abs(v-expected.elements[i])<.0001),'sign follows parent through collapse');
}
world.reset();world.chunks.forEach(sync);for(const b of Object.values(batches))b.seal();
assert(world.chunks.every(c=>c.hp===c.maxHp&&!c.collisionDisabled&&c.state==='intact'));
const camera=new T.PerspectiveCamera(47,1.5,.2,700);camera.position.set(140,130,140);camera.lookAt(0,8,0);camera.updateMatrixWorld(true);
for(const b of Object.values(batches)){b.prepare(camera);assert(b.main.count>0);}
const triangles=Object.values(batches).reduce((n,b)=>n+(b.geometry.index?.count??b.geometry.attributes.position.count)/3*b.count,0);
console.log(JSON.stringify({pass:true,buildings:layout.buildings.length,sections:world.chunks.length,geometryTemplates:city.templates.size,buildingTriangles:triangles,buildingDraws:Object.keys(batches).length,glbBytes:bytes.length,tests:['all five models/UVs','clear streets/spawns','solid building collision','30/60/120Hz facade climb and roof transition','damage armor/scorch','structural collapse','sign attachments','nonblocking settled rubble','neighbor isolation','reset','batch culling']},null,2));
if(process.argv.includes('--export-layout'))fs.writeFileSync('/tmp/asset-city-layout.json',JSON.stringify(layout));
