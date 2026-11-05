import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {evacuationCityBuildings,EVAC_CITY_ROADS,addEvacuationDistrictRoads} from '../dist/evac-city-map.js';
import {ESCORT_APPROACH as bounds,escortMovementBounds} from '../dist/evac-approach.js';
import {traceImpact} from '../dist/combat-collision.js';
const original=JSON.parse(fs.readFileSync('dist/city-assets/city-layout.json')).buildings,before=JSON.stringify(original),buildings=evacuationCityBuildings(original);
assert.equal(JSON.stringify(original),before,'scene-specific layout must not mutate other maps');
assert.equal(bounds.maxX-bounds.minX,336);assert.equal(bounds.maxZ-bounds.minZ,336);assert.equal(buildings.length,34);assert.equal(new Set(buildings.map(b=>b.id)).size,34);
assert.equal(escortMovementBounds().minX,-164);assert.equal(escortMovementBounds().maxX,164);
const sections=buildings.map(b=>({state:'intact',x:b.x,y:b.floors*1.5,z:b.z,size:[10,b.floors*3,10]}));
for(const b of buildings){assert(b.x-6>=bounds.minX&&b.x+6<=bounds.maxX&&b.z-6>=bounds.minZ&&b.z+6<=bounds.maxZ);for(const c of buildings)if(c!==b)assert(Math.abs(b.x-c.x)>12||Math.abs(b.z-c.z)>12);for(const r of EVAC_CITY_ROADS)assert(Math.abs(b.x-r.x)>r.width/2+5||Math.abs(b.z-r.z)>r.depth/2+5,'building must not overlap a street');}
for(let x=-48;x<=48;x+=4){assert(!traceImpact({x:0,y:18,z:0},{x,y:1,z:48},{sections,ground:false}));assert(!traceImpact({x,y:1,z:48},{x:x+4,y:1,z:48},{sections,ground:false,radius:1.8}));}
assert(!traceImpact({x:-48,y:1.3,z:270},{x:-48,y:1.3,z:36},{sections,ground:false,radius:2}));
assert(!traceImpact({x:-48,y:26,z:300},{x:-48,y:26,z:48},{sections,ground:false,radius:10}));
const root=addEvacuationDistrictRoads(new THREE.Scene()),road=root.getObjectByName('District asphalt');assert.equal(road.count,EVAC_CITY_ROADS.length);assert(road.count>30);
console.log('PASS 336m square, 28 new/34 total independent destructible building specs, road/building clearance, wider hero bounds, clear civilian/Walker sight lines, Bruiser and Chinook corridors, instanced roads and no source-layout mutation');
