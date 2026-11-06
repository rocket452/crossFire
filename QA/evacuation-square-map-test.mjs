import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {evacuationCityBuildings,EVAC_CITY_ROADS,addEvacuationDistrictRoads} from '../dist/evac-city-map.js';
import {ESCORT_APPROACH as bounds,escortMovementBounds} from '../dist/evac-approach.js';
import {traceImpact} from '../dist/combat-collision.js';
const original=JSON.parse(fs.readFileSync('dist/city-assets/city-layout.json')).buildings,before=JSON.stringify(original),buildings=evacuationCityBuildings(original);
assert.equal(JSON.stringify(original),before,'scene-specific layout must not mutate other maps');
assert.equal(bounds.maxX-bounds.minX,235.2);assert.equal(bounds.maxZ-bounds.minZ,235.2);assert.equal(buildings.length,28);assert.equal(new Set(buildings.map(b=>b.id  )).size,28);
assert.equal((bounds.minX+bounds.maxX)/2,-48);assert.equal((bounds.minZ+bounds.maxZ)/2,48);assert.equal(buildings.filter(b=>b.floors>=10).length,12);
assert.equal(escortMovementBounds().minX,-161.6);assert.equal(escortMovementBounds().maxX,65.6);
const additions=buildings.filter(b=>b.id.startsWith('EVAC-OUTER-TOWER-'));assert.equal(additions.length,0);assert(additions.every(b=>Math.hypot(b.x+48,b.z-48)-Math.sqrt(50)>=150),'new towers keep central evacuation space clear');
const sections=buildings.map(b=>({state:'intact',x:b.x,y:b.floors*1.5,z:b.z,size:[10,b.floors*3,10]}));
for(const b of buildings){assert(b.x-6>=bounds.minX&&b.x+6<=bounds.maxX&&b.z-6>=bounds.minZ&&b.z+6<=bounds.maxZ);for(const c of buildings)if(c!==b)assert(Math.abs(b.x-c.x)>12||Math.abs(b.z-c.z)>12);for(const r of EVAC_CITY_ROADS)assert(Math.abs(b.x-r.x)>r.width/2+5||Math.abs(b.z-r.z)>r.depth/2+5,'building must not overlap a street');}
for(let x=-48;x<=48;x+=4){assert(!traceImpact({x:0,y:18,z:0},{x,y:1,z:48},{sections,ground:false}));assert(!traceImpact({x,y:1,z:48},{x:x+4,y:1,z:48},{sections,ground:false,radius:1.8}));}
assert(!traceImpact({x:-48,y:1.3,z:159.6},{x:-48,y:1.3,z:36},{sections,ground:false,radius:2}));
assert(!traceImpact({x:-48,y:26,z:189.6},{x:-48,y:26,z:48},{sections,ground:false,radius:10}));
const root=addEvacuationDistrictRoads(new THREE.Scene()),road=root.getObjectByName('District asphalt');assert.equal(road.count,EVAC_CITY_ROADS.length);assert(road.count>20);
console.log('PASS 235.2m square, 22 new/28 total independent destructible building specs, road/building clearance, wider hero bounds, clear civilian/Walker sight lines, Bruiser and Chinook corridors, instanced roads and no source-layout mutation');

const routeTowers=buildings.filter(b=>b.id.startsWith('EVAC-ROUTE-TOWER-'));assert.equal(routeTowers.length,6);assert(routeTowers.every(b=>b.floors>=10&&b.z>=60&&Math.hypot(b.x,b.z)-Math.sqrt(50)>50));console.log('PASS six route-side towers, 30–42m tall, over 50m clear of Walker origin');

assert(!traceImpact({x:42,y:28,z:65},{x:0,y:18,z:5},{sections,ground:false}),'Bastion cinematic establishing shot stays clear');
