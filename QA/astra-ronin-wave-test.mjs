// Astra Ronin wave slash: alternation with the dash combo, lane telegraphs with gaps, two interleaved
// volleys released in sweep order, swept hits, dodging through gaps, buildings, stun, death and reset.
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {AstraRonin,RONIN} from '../dist/astra-ronin.js';
import {UnitDamage} from '../dist/combat-collision.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),C=RONIN;
const make=({x=0,z=40,isPathClear=()=>true,wave=true}={})=>{const hits=[],strikes=[],hero={id:'hero',kind:'hero',alive:true,entity:{active:true,enabled:true},shapes:[{center:V(x,1.5,z)}]};
 const r=new AstraRonin(new THREE.Scene(),new UnitDamage(),{config:{guardInitialDelay:99,flightStartRange:1e9},getTargets:()=>[hero],visible:()=>true,isPathClear,getBuildings:()=>[],
  onHeroHit:(unit,point,damage)=>hits.push({unit,damage,t:r.age}),onBuildingStrike:spec=>strikes.push(spec)});
 r.spawnPosition={x:0,y:.1,z:0};r.reset();r.spawn();if(wave)r.rangedAttacks=1;return{r,hero,hits,strikes};};
const tick=(r,dt=1/60)=>r.update(dt,r.age+dt);
const run=(s,dt,until,limit=12)=>{for(let t=0;t<limit&&!until();t+=dt)tick(s.r,dt);};

// Ranged engagements alternate: the first is a dash combo, the next (back at range) a wave slash.
{const s=make({wave:false}),r=s.r;run(s,1/60,()=>r.swordState);assert(r.dashAttack&&!r.waveAttack,'first ranged attack dashes');
 run(s,1/60,()=>!r.swordState);s.hero.shapes[0].center.copy(r.root.position).add(V(0,1.4,40));run(s,1/60,()=>r.swordState);
 assert(r.waveAttack&&!r.dashAttack,'second ranged attack is a wave slash');}

for(const dt of[1/30,1/60,1/120]){
 // Telegraph: five lanes with real gaps, locked before release; the second row fills the first row's gaps.
 const s=make(),r=s.r;run(s,dt,()=>r.waveAttack);let first=null,second=null,order=[];
 run(s,dt,()=>{if(!first&&r.waveLocked&&r.wavesFired===0)first=r.waves.lanes.map(l=>l.lateral);if(!second&&r.wavesFired===5)second=r.waves.lanes.map(l=>l.lateral);
  if(r.waves.waves.length>order.length)order.push(...r.waves.waves.slice(order.length).map(w=>w.lateral));return !r.waveAttack;});
 assert.equal(first.length,C.waveCount,'one lane per wave');const sorted=[...first].sort((a,b)=>a-b);
 for(let i=1;i<sorted.length;i++)assert(sorted[i]-sorted[i-1]-C.waveWidth>=4,'gap wider than a hero');
 assert.equal(second.length,C.waveCount-1);for(const lateral of second)assert(sorted.some((v,i)=>i&&Math.abs((v+sorted[i-1])/2-lateral)<1e-6),'second row sits in the first row\'s gaps');
 assert.equal(r.wavesFired,C.waveCount*2-1);assert.deepEqual(order.slice(0,5),[18,9,0,-9,-18],'forehand releases from the sword side across');assert.deepEqual(order.slice(5),[-13.5,-4.5,4.5,13.5],'backhand returns');
 assert(!r.waves.lanes.length,'telegraph clears after release');assert.equal(r.cooldown,C.waveCooldown);
 run(s,dt,()=>!r.waves.waves.length,6);
 assert.equal(s.hits.length,1,'standing in the centre lane takes exactly one wave');assert.equal(s.hits[0].damage,C.waveDamage);
}

// The row is aimed at the hero when the aim locks. Sidestepping into a first-row gap gets caught by the
// second row; stepping back once the first row has passed clears both.
const passed=(r,count)=>r.waves.waves.slice(0,count).length===count&&r.waves.waves.slice(0,count).every(w=>w.origin.z+w.dir.z*w.s>42);
{const s=make(),r=s.r;run(s,1/60,()=>r.waveLocked,8);s.hero.shapes[0].center.x=C.waveSpacing/2;run(s,1/60,()=>!r.waveAttack&&r.wavesFired>0,8);run(s,1/60,()=>!r.waves.waves.length,6);
 assert.equal(s.hits.length,1,'second row covers the first row\'s gaps');}
{const s=make(),r=s.r;let back=false;run(s,1/60,()=>r.waveLocked,8);s.hero.shapes[0].center.x=C.waveSpacing/2;
 run(s,1/60,()=>{if(!back&&r.wavesFired>=C.waveCount&&passed(r,C.waveCount)){s.hero.shapes[0].center.x=0;back=true;}return back&&!r.waves.waves.length;},10);
 assert(back,'first row passed');assert.equal(s.hits.length,0,'two sidesteps clear both rows');}

// Fan: the outer waves drift apart as they travel; dash-phased heroes pass untouched.
{const s=make({x:0}),r=s.r;let spread=null;run(s,1/60,()=>r.wavesFired>0,8);s.hero.dashPhased=true;run(s,1/60,()=>{const w=r.waves.waves.slice(0,5);if(w.length===5&&w.every(x=>x.s>40)){const xs=w.map(x=>x.origin.x+x.dir.x*x.s);spread=Math.max(...xs)-Math.min(...xs);return true;}return false;},8);
 assert(spread>2*18+2,'row fans outward '+spread.toFixed(1));assert.equal(s.hits.length,0,'dash-phased hero ignored');}

// Buildings: a wall across the middle lanes cuts those waves short, damages the wall and shields the hero.
{const wall=(a,b)=>!(Math.min(a.z,b.z)<25&&Math.max(a.z,b.z)>=25&&Math.abs(a.x+(b.x-a.x)*(25-a.z)/(b.z-a.z||1))<6);
 const s=make({isPathClear:wall}),r=s.r;run(s,1/60,()=>r.wavesFired>0);const centre=r.wavePlans[0].find(l=>l.lateral===0);
 assert(centre.blocked&&Math.abs(centre.origin.z+centre.length-25)<.8,'lane stops at the wall');assert(!r.wavePlans[0].find(l=>l.lateral===18).blocked);
 run(s,1/60,()=>!r.waves.waves.length,8);assert.equal(s.hits.length,0,'hero behind the wall is safe');assert(s.strikes.length>=1&&s.strikes.every(x=>x.damage===C.waveBuildingDamage&&x.forward===null),'blocked waves strike the building');}

// Stun in the windup cancels without releasing; death dissipates waves in flight; reset clears everything.
{const s=make(),r=s.r;run(s,1/60,()=>r.waveAttack&&r.waveClock>.4);r.stun(1);tick(r);assert(!r.waveAttack&&!r.waves.lanes.length&&r.wavesFired===0,'stun cancels the wave slash');
 const d=make(),q=d.r;run(d,1/60,()=>q.wavesFired>=3);q.destroy();assert(q.waves.waves.every(w=>w.dying>=0),'death dissipates waves');for(let i=0;i<30;i++)tick(q);assert.equal(q.waves.waves.length,0);
 run(s,1/60,()=>r.wavesFired>0,8);r.reset();assert(!r.waves.waves.length&&!r.waves.lanes.length&&!r.waveAttack&&r.rangedAttacks===0);}
console.log('PASS dash/wave alternation, 5-lane telegraph with hero-sized gaps, interleaved 5+4 volleys in sweep order at 30/60/120Hz, one hit in the centre lane, second-row coverage, two-step dodge, fan spread, dash phasing, building stops and strikes, stun, death and reset');
