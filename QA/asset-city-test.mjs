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
const {traceImpact,UnitDamage}=await import('../dist/combat-collision.js');
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
// The rendered signs clone the template material. Exercise the actual draws.
const buildingMap=new T.Texture(),glowMap=new T.Texture(),signMap=new T.Texture();
city.applyTexture('buildingColor',buildingMap);
city.applyTexture('signGlow',glowMap);
for(const b of Object.values(batches)){
 assert.equal(b.main.material.map,buildingMap);assert.equal(b.main.material.vertexColors,false);
 assert.equal(b.main.material.emissiveMap,null);
}
const signs=scene.children.filter(o=>o.name.endsWith('mounted signs'));
assert.equal(signs.length,3);
for(const sign of signs){assert.equal(sign.material.emissiveMap,glowMap);assert.equal(sign.material.map,null);}
city.applyTexture('signColor',signMap);
for(const sign of signs){assert.equal(sign.material.map,signMap);assert.equal(sign.material.emissiveMap,glowMap);}
assert.equal(city.diagnostics().temporaryMaterials,false);
// Exercise the first visit before any device cache or file picker is used.
const {loadPackagedCityTextures}=await import('../dist/asset-city-textures.js');
await loadPackagedCityTextures(city, async url => {
 const webp = fs.readFileSync(new URL(url));
 assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
 const texture = new T.Texture();
 texture.name = new URL(url).pathname.split('/').pop();
 return texture;
});
assert.deepEqual(city.diagnostics().missingTextures, []);
for(const [material,family] of [
 ...Object.values(batches).map(b=>[b.main.material,'building']),
 ...signs.map(sign=>[sign.material,'sign'])
]){
 assert.equal(material.map.name, family+'-color.webp');
 assert.equal(material.emissiveMap.name, family+'-glow.webp');
 assert.equal(material.map.colorSpace, T.SRGBColorSpace);
 assert.equal(material.emissiveMap.flipY, false);
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

// The mission fit must keep the crossing and flight lane clear, even with
// rotated shop meshes and vertically stretched tower chunks.
const {evacuationCityBuildings,mission1CityBuildings,MISSION1_HERO_START,MISSION1_CITY_ROADS}=await import('../dist/evac-city-map.js');
const {EVACUATION_ENTRANCES,EVACUATION_LANDING,EVACUATION_FLIGHT}=await import('../dist/evacuation-config.js');
const data=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url)));
const lots=evacuationCityBuildings(data.buildings);
const evacCity=new AssetCity(asset,manifest),evacScene=new T.Scene(),evacWorld=new DestructionWorld(),evacBatches={};
const fitted=evacCity.fitEvacuationBuildings(lots);
evacCity.install(evacScene,evacWorld,fitted,evacBatches,new Map());
assert.equal(fitted.length,28);
assert.equal(evacCity.attachments.size,fitted.length);
for(const b of fitted){
 const parts=evacWorld.buildings.get(b.id).chunks;
 const roofY=Math.max(...parts.map(c=>c.bounds.max.y));
 assert(Math.abs(roofY-b.floors*3)<.25,b.id+' retains its skyline height');
 for(const c of parts){
  assert(c.bounds.min.x>=b.x-5.001&&c.bounds.max.x<=b.x+5.001);
  assert(c.bounds.min.z>=b.z-5.001&&c.bounds.max.z<=b.z+5.001);
  const matrix=new T.Matrix4();evacBatches[c.visualKey].getMatrixAt(c.index,matrix);
  const rendered=evacBatches[c.visualKey].geometry.boundingBox.clone().applyMatrix4(matrix);
  assert(rendered.min.distanceTo(c.bounds.min)<.002&&rendered.max.distanceTo(c.bounds.max)<.002);
 }
}
const entrance=EVACUATION_ENTRANCES[0],landing=EVACUATION_LANDING;
const clear=(a,b,radius)=>!traceImpact(a,b,{sections:evacWorld.chunks,ground:false,radius});
assert(clear({...entrance,y:1},{...landing,y:1},1.8),'civilian crossing stays open');
for(let x=landing.x;x<=entrance.x;x+=4){
 assert(clear({x:0,y:18,z:0},{x,y:1,z:entrance.z},0),'Walker can see the crossing');
}
assert(clear({...landing,y:26},{x:landing.x,y:26,z:EVACUATION_FLIGHT.escapeZ},5),'Chinook approach stays open');
const {EvacuationScene}=await import('../dist/evacuation.js');
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const evacuation=new EvacuationScene(evacScene,new UnitDamage(),{
 visible:(a,b)=>clear(a,b,0),
 isPathClear:(a,b)=>clear({x:a.x,y:1,z:a.z},{x:b.x,y:1,z:b.z},1.8)
});
for(let i=0;i<134*60;i++)evacuation.update(1/60);
assert.equal(evacuation.groups,2);
assert.equal(evacuation.saved,24);
assert.equal(evacuation.lost,0);
console.log('PASS evacuation fit, aligned render/collision bounds, clear sight lines and two complete rescues',evacWorld.chunks.length);


const missionCity=new AssetCity(asset,manifest),missionWorld=new DestructionWorld();
const missionLots=missionCity.fitEvacuationBuildings(mission1CityBuildings(data.buildings));
missionCity.install(new T.Scene(),missionWorld,missionLots,{},new Map());
const extraTowers=missionLots.filter(b=>b.id.startsWith('MISSION-1-TOWER-'));
assert.equal(extraTowers.length,12);
for(const lot of extraTowers){
 const parts=missionWorld.buildings.get(lot.id).chunks;
 assert(parts.length>1&&parts.every(c=>c.state==='intact'));
 assert(Math.abs(Math.max(...parts.map(c=>c.bounds.max.y))-lot.floors*3)<.25);
}
const missionClear=(a,b,radius)=>!traceImpact(a,b,{sections:missionWorld.chunks,ground:false,radius});
const start={...MISSION1_HERO_START,y:1};
assert(Math.hypot(start.x,start.z)>=90,'hero deploys well outside the original start area');
assert(MISSION1_CITY_ROADS.some(r=>Math.abs(r.x-start.x)<=r.width/2&&Math.abs(r.z-start.z)<=r.depth/2),'hero starts on a street');
assert(missionClear(start,{x:0,y:1,z:27},1),'direct approach from the new spawn stays open');
assert(missionClear({x:1,y:18,z:0},{x:2,y:1,z:35},2),'Bastion cinematic arena stays open');
const lot=extraTowers[0],towerChunk=missionWorld.buildings.get(lot.id).chunks[0];
const hp=towerChunk.hp;
missionWorld.damageChunk(towerChunk,25,{source:'siege-walker'});
assert(towerChunk.hp<hp);
console.log('PASS Mission 1 fits twelve destructible high-rises and keeps the hero staging area clear');

const {RELAY}=await import('../dist/wave-defense.js');
const relayCity=new AssetCity(asset,manifest),relayWorld=new DestructionWorld(),relayBatches={};
const [relay]=relayCity.fitEvacuationBuildings([RELAY]);
const towerAsset=manifest.assets.tower;
assert.equal(relay.assetScale[0]*towerAsset.footprint[0],20);
assert.equal(relay.assetScale[2]*towerAsset.footprint[1],20);
assert(Math.abs(relay.assetScale[1]*towerAsset.height+.08-72)<1e-9);
relayCity.install(new T.Scene(),relayWorld,[relay],relayBatches,new Map());
relayCity.applyTexture('buildingColor',buildingMap);
relayCity.applyTexture('buildingGlow',glowMap);
for(const batch of Object.values(relayBatches)){
 assert.equal(batch.material.map,null,'dark blue paint stays visible after textures load');
 assert.equal(batch.material.emissiveMap,glowMap);
}
const flank=traceImpact({x:relay.x+8,y:12,z:relay.z-15},{x:relay.x+8,y:12,z:relay.z+15},
 {sections:relayWorld.chunks,ground:false});
assert.equal(flank?.section.building,RELAY.id,'wide relay facade blocks impacts');
console.log('PASS oversized relay facade, collision and paint with packaged city textures');
