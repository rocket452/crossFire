import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {EvacuationBastionReinforcement} from '../dist/evacuation-bastion-reinforcement.js';
const config=JSON.parse(fs.readFileSync('dist/evacuation-reinforcement-config.json'));
const walker={dead:false,root:new THREE.Group()};walker.root.position.set(0,0,0);let landings=0,resets=0;
const adapter={enabled:false,boss:{root:new THREE.Group(),model:{sync(){}},sync(){},combatUnit:{alive:false}},reset(enabled){this.enabled=enabled;this.boss.combatUnit.alive=enabled;resets++;},update(){},afterHeroes(){}};
const transport=new EvacuationBastionReinforcement(new THREE.Scene(),adapter,config,{getWalker:()=>walker,getGroundHeight:()=>.08,onLanding:()=>landings++});
const step=s=>{for(let i=0;i<Math.round(s*60);i++)transport.update(1/60);};
step(20);assert.equal(transport.phase,'waiting');assert(!transport.root.visible);
for(const cancelAt of[config.wreckDelay+.2,config.wreckDelay+config.approachSeconds+.2,config.wreckDelay+config.approachSeconds+config.hoverSeconds+.2]){walker.dead=true;step(cancelAt);assert(!adapter.enabled);assert(transport.root.visible);transport.reset();walker.dead=false;assert.equal(transport.phase,'waiting');assert(!transport.root.visible&&!transport.marker.visible&&!adapter.enabled);}
walker.dead=true;step(config.wreckDelay+config.approachSeconds+config.hoverSeconds+config.dropSeconds+.3);assert.equal(landings,1);assert(adapter.enabled);assert.deepEqual(adapter.boss.root.position.toArray(),[0,.08,0]);step(config.departureSeconds+.3);assert.equal(transport.phase,'deployed');assert(!transport.root.visible);step(100);assert.equal(landings,1);transport.reset();walker.dead=false;step(20);assert.equal(landings,1);walker.dead=true;step(config.wreckDelay+config.approachSeconds+config.hoverSeconds+config.dropSeconds+.3);assert.equal(landings,2);assert(adapter.enabled);console.log('PASS idle, captured landing position, inactive cargo, approach/hover/drop reset cancellation, one landing, departure, no repeat and replay');
