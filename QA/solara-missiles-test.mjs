import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const THREE=await import('../dist/vendor/three.module.js'),{GLTFLoader}=await import('../dist/vendor/GLTFLoader.js'),{SolaraHero,solaraMissileAim}=await import('../dist/solara-hero.js'),{RobotMissiles}=await import('../dist/robot-missiles.js'),{traceImpact,UnitDamage}=await import('../dist/combat-collision.js'),{MissileExplosions,MISSILE_EXPLOSIONS}=await import('../dist/missile-explosions.js');
async function load(name){const b=fs.readFileSync(new URL('../dist/city-assets/'+name,import.meta.url));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const model=await load('solara-frost.glb'),body=await load('licensed-characters/solara-female.glb'),spec=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/solara-frost.json',import.meta.url)));
for(const dt of[1/30,1/60,1/120,.075]){
 const scene=new THREE.Scene(),effects=new MissileExplosions(scene),damage=new UnitDamage(),tank=damage.add('tank','tank',{}),robot={root:new THREE.Group(),aimPoint:()=>new THREE.Vector3(0,14,0)};
 tank.shapes=[{center:{x:0,y:1,z:70},half:{x:2,y:1,z:2}}];robot.combatUnit=damage.add('robot','robot',robot,1e6);robot.combatUnit.shapes=[{center:{x:0,y:14,z:0},half:{x:3,y:6,z:3}}];let harmfulBlasts=0;
 const pod=new RobotMissiles(scene,{scene:new THREE.Group()},{autoFire:false,getMuzzles:()=>Array.from({length:6},()=>({position:new THREE.Vector3(0,30,35),direction:new THREE.Vector3(0,0,1)})),getTargets:()=>[tank],isRobotAlive:()=>true,traceWorld:(a,b,r)=>traceImpact(a,b,{targets:[tank],radius:r}),onImpact:()=>harmfulBlasts++,onBurst:p=>effects.burst(p,{air:true})});
 let hero;hero=new SolaraHero(scene,model,spec,body,{getRobot:()=>robot,getUnits:()=>damage.units,getThreats:()=>[],getMissileTarget:(from,current)=>current?.alive&&!hero.fireballs.some(b=>b.targetMissile===current)?current:pod.selectThreat(from,'solara',m=>!hero.fireballs.some(b=>b.targetMissile===m)),claimMissile:(m,seconds)=>pod.claim(m,'solara',seconds),traceFireball:(a,b)=>pod.trace(a,b,.34)||traceImpact(a,b,{targets:[robot.combatUnit],ground:false,radius:.34}),onFireballHit:(hit,p)=>hit.missile?pod.hurt(hit.missile,60,'solara'):damage.hurt(hit.unit,90,p)});
 pod.pending=1;const missile=pod.launch();pod.pending=0;
 const aim=solaraMissileAim(hero.root.position,{position:new THREE.Vector3(0,30,35),velocity:new THREE.Vector3(8,0,0)});assert(aim.x>0,'moving missile is led');
 for(let t=0;t<8;t+=dt){hero.update(dt,t);pod.update(dt,t);effects.update(dt);}
 assert.equal(pod.byHero.solara,1);assert.equal(hero.missileInterceptions,1);assert.equal(hero.missileHits,1);assert(hero.defenseShots>=1);assert(!missile.alive);assert.equal(harmfulBlasts,0);assert.equal(tank.health,100);assert.equal(effects.interceptions,1);assert(hero.robotHits>0,'returns to attacking robot after interception');
 hero.reset();effects.reset();assert.equal(hero.defenseShots,0);assert.equal(hero.missileInterceptions,0);assert.equal(hero.defenseTarget,null);assert.equal(effects.fire.count,0);assert.equal(effects.smoke.count,0);
 // Simultaneous salvos stay bounded and expire fully at every frame rate.
 for(let i=0;i<20;i++)effects.burst(new THREE.Vector3(i,30,0),{air:i%2===0});assert.equal(effects.bursts.length,MISSILE_EXPLOSIONS.limit);assert(effects.fire.count<=300&&effects.smoke.count<=120);assert.equal(effects.root.children.length,2);
 for(let t=0;t<3;t+=dt){effects.update(dt);assert(effects.fire.count<=300&&effects.smoke.count<=120);for(const mesh of[effects.fire,effects.smoke])assert([...mesh.instanceMatrix.array].every(Number.isFinite));}
 assert.equal(effects.bursts.length,0);assert.equal(effects.fire.count,0);assert.equal(effects.smoke.count,0);assert(!effects.root.visible);
 console.log('PASS',dt,'real skinned Solara tracks and shoots down moving missile, safe ally, robot fallback, reset, bounded multi-layer explosions and expiry');
}
