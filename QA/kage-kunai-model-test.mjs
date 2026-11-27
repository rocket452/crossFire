import assert from 'node:assert/strict';import fs from 'node:fs';
const bytes=fs.readFileSync('dist/city-assets/kage-kunai.glb'),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),spec=JSON.parse(fs.readFileSync('dist/city-assets/kage-kunai.json'));
assert.equal(json.meshes.length,1);assert.equal(json.meshes[0].primitives.length,3);assert.equal(json.materials.length,3);assert(!json.images?.length,'original kunai uses material colors, no textures');
const tris=json.meshes[0].primitives.reduce((n,p)=>n+json.accessors[p.indices].count/3,0);assert.equal(spec.triangles,tris);assert(tris>300&&tris<3000);assert.match(spec.source,/^original/);
const positions=json.meshes[0].primitives.map(p=>json.accessors[p.attributes.POSITION]),lo=[0,1,2].map(i=>Math.min(...positions.map(a=>a.min[i]))),hi=[0,1,2].map(i=>Math.max(...positions.map(a=>a.max[i])));
assert(Math.abs(hi[2]-lo[2]-.85)<1e-4,'.85m long');assert(lo.every((v,i)=>Math.abs(v+hi[i])<1e-4),'centered');assert(hi[0]-lo[0]<.2&&hi[1]-lo[1]<.2,'slim profile');
assert(json.materials.every(m=>(m.alphaMode||'OPAQUE')==='OPAQUE'));
// The pointed blade must face +Z (forward) and the ring/grip -Z (hand side).
const blade=json.meshes[0].primitives.find(p=>json.materials[p.material].name==='Kunai edge');assert(blade);const a=json.accessors[blade.attributes.POSITION];assert(a.max[2]>.42&&a.min[2]>-.1,'blade toward +Z');
const wrap=json.meshes[0].primitives.find(p=>json.materials[p.material].name==='Kunai wrap');const w=json.accessors[wrap.attributes.POSITION];assert(Math.abs((w.min[2]+w.max[2])/2-spec.gripOffsetZ)<.03,'grip near gripOffsetZ');
console.log('PASS original kunai: blade/collar/wrapped grip/ring,',tris,'triangles, three opaque materials, centered .85m length, blade forward +Z, grip at',spec.gripOffsetZ,bytes.length,'bytes');
