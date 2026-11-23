import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from '../dist/vendor/three.module.js';import{Bastion}from'../dist/bastion.js';import{UnitDamage}from'../dist/combat-collision.js';import{RunnerMotion}from'../dist/runner-motion.js';
const c=JSON.parse(fs.readFileSync('dist/bastion-config.json'));let hits=[];const b=new Bastion(new THREE.Scene(),new UnitDamage(),c,{onPlayerHit:(p,power,impact)=>hits.push({power,impact})});
const player=(x,y,z)=>({position:new THREE.Vector3(x,y,z),motion:{mode:'air',normal:{x:0,y:1,z:0}}});
function wave(p,age,previousAge=age,from=p.position){b.reset();hits=[];b.player=p;b.waves=[{id:1,age,previousAge,angle:Math.PI,hitPlayers:new Set()}];b.checkWaves(p,from);}
let p=player(0,12,20);wave(p,Math.hypot(12,20)/c.pulse.surfaceSpeed);assert.equal(hits.length,1,'airborne sphere hit');assert.equal(hits[0].power,c.pulse.damage);assert.equal(hits[0].impact.kind,'pulse');assert.equal(b.state.damageTaken,c.pulse.damage);b.hitCooldown=0;b.checkWaves(p,p.position);assert.equal(hits.length,1,'lingering shell never repeatedly launches player');
p=player(0,.08,-22);wave(p,22/c.pulse.surfaceSpeed);assert.equal(hits.length,0,'gap safe');p=player(0,12,20);p.phased=true;wave(p,1);assert.equal(hits.length,0,'phase dodge safe');p=player(0,12,20);wave(p,1,.7,new THREE.Vector3(0,12,30));assert.equal(hits.length,1,'swept movement crossing shell');p=player(0,55,20);wave(p,3);assert.equal(hits.length,0,'outside radius safe');
const motion=new RunnerMotion();motion.bounds={minX:-116,maxX:116,minZ:-116,maxZ:116};motion.reset({x:0,y:.08,z:22});motion.applyKnockback({x:0,y:22,z:68},c.pulse.knockback);for(let i=0;i<120;i++)motion.step({player:true},1/120,[]);assert(motion.position.z>55,'blast carries player over 30m');assert(motion.position.y>8,'upward launch');assert.equal(motion.support,null);assert.equal(motion.knockback,null);motion.reset();assert.equal(motion.knockback,null);console.log('PASS spherical/ground pulse damage, gap/phasing, swept airborne hit, one hit per wave, 30m+ launch, air/support detach and reset');

const wall={state:'intact',type:'wall',building:'test',size:[30,60,1],body:{position:{x:0,y:30,z:32},quaternion:{x:0,y:0,z:0,w:1}}};for(const dt of[1/30,1/60,1/120,.075]){motion.reset({x:0,y:.08,z:22});motion.applyKnockback({x:0,y:22,z:68},c.pulse.knockback);for(let t=0;t<1;t+=dt)motion.step({player:true},dt,[wall]);assert(motion.position.z<31.3,'blast cannot tunnel through wall at '+dt);motion.reset({x:0,y:.08,z:22});motion.applyKnockback({x:0,y:22,z:68},c.pulse.knockback);for(let t=0;t<1;t+=dt)motion.step({player:true,strafe:1},dt,[]);assert(Math.abs(motion.position.x)>8,'steering remains available');assert(motion.position.z>55);}console.log('PASS 30/60/120Hz and long frames: swept blast collision, steering during launch and consistent launch range');

const {frontBarrierHit}=await import('../dist/hero-defense.js');
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
let absorbed=0;
const barrier={center:v(0,1.3,2.21),normal:v(0,0,1),radius:5.8,strength:1000,
 onHit:(_,power)=>{absorbed+=power;}};
const radius=c.projectiles.radius;
const contact=frontBarrierHit(v(0,1.3,10),v(0,1.3,2.8),barrier,radius);
assert(contact&&contact.point.z===barrier.center.z,'large round is intercepted before its center reaches the shield');
assert(frontBarrierHit(v(6.1,1.3,8),v(6.1,1.3,0),barrier,radius),'round can touch the rim');
assert.equal(frontBarrierHit(v(9,1.3,8),v(9,1.3,0),barrier,radius),null,'round clears the rim');
assert.equal(frontBarrierHit(v(0,1.3,-5),v(0,1.3,5),barrier,radius),null,'rear hits bypass the shield');
p=player(0,12,20);
p.entity={barriers:()=>[barrier]};
barrier.center.set(0,13,17);
barrier.normal.set(0,0,-1);
wave(p,Math.hypot(12,20)/c.pulse.surfaceSpeed);
assert.equal(hits.length,0);
assert.equal(absorbed,c.pulse.damage);
b.checkWaves(p,p.position);
assert.equal(absorbed,c.pulse.damage,'one absorption per wave');
barrier.normal.negate();
wave(p,Math.hypot(12,20)/c.pulse.surfaceSpeed);
assert.equal(hits.length,1,'pulse from behind still knocks the hero back');
console.log('PASS frontal Bastion projectile/rim interception and directional pulse defense without repeat absorption');
