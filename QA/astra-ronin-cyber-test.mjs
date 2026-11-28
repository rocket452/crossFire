// Astra Ronin cyber-ronin finish: dressing pieces exist and stay out of merging and hit shapes, the hard-light
// shield flashes on a block, the plasma sheath charges through a windup, the scarf streams and the
// underglow fades while flying.
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {AstraRoninModel} from '../dist/astra-ronin-model.js';
import {RONIN} from '../dist/astra-ronin.js';
const root=new THREE.Group(),m=new AstraRoninModel(root,RONIN),dt=1/60;
for(const piece of['holoFace','sheathMesh','scarfMesh','underglow'])assert(m[piece]?.isMesh&&m[piece].parent,piece+' attached');
assert.equal(m.holoFace.parent,m.parts.shield);assert.equal(m.sheathMesh.parent,m.sword);assert.equal(m.scarfMesh.parent,m.parts.torso);
let pipes=0;root.traverse(o=>{if(o.isMesh&&(o.material===m.pipeMagenta||o.material===m.pipeCyan))pipes++;});assert(pipes>=10,'neon piping on the key plates: '+pipes);
for(const neon of[m.gold,m.energy,m.plasma])assert(neon.emissiveIntensity>1.6,'neon accents are bright enough for the city bloom');
assert(m.armor.color.getHSL({}).l<.15&&m.armor.userData.rim,'matte black armour with the neon rim');
assert(!m.shieldMaterials.some(s=>s.material===m.holo),'hard light is not in the block-flash material list');
assert(!m.hitParts.some(h=>[m.scarfMesh,m.sheathMesh,m.underglow].includes(h.node)),'dressing adds no hit shapes');
m.updateShieldVisual({guardFlash:RONIN.guardFlashDuration});assert(m.holo.uniforms.uFlash.value>.9,'block flashes the hard-light face');m.updateShieldVisual({});assert.equal(m.holo.uniforms.uFlash.value,0);
const e={config:RONIN,moving:false,swordState:false,swordAge:0,lastSeen:new THREE.Vector3(0,1.5,10)};
for(let i=0;i<60;i++)m.animate(dt,i*dt,e);const rest=m.sheath.uniforms.uPower.value;
e.swordState=true;for(let i=0;i<Math.round(RONIN.swordWindup*.95/dt);i++){e.swordAge=i*dt;m.animate(dt,i*dt,e);}assert(m.sheath.uniforms.uPower.value>rest*2,'sheath charges through the windup');
e.swordState=false;m.reset();const fly={...e,flight:{phase:'cruise',age:1,speed:RONIN.flightSpeed}};for(let i=0;i<90;i++)m.animate(dt,i*dt,fly);
assert(m.scarf.userData.scarf.uStream.value>.8,'scarf streams behind in flight');assert(m.underglow.material.uniforms.uPower.value<.1,'underglow fades in the air');
fly.flight=null;for(let i=0;i<180;i++)m.animate(dt,i*dt,fly);assert(m.scarf.userData.scarf.uStream.value<.3&&m.underglow.material.uniforms.uPower.value>.8,'scarf settles and underglow returns on landing');
console.log('PASS cyber finish:',pipes,'piped plates, hard-light shield flash, sheath charge, scarf stream, underglow fade',m.stats());
