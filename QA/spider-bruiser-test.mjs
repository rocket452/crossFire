import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const THREE=await import('../dist/vendor/three.module.js'),{GLTFLoader}=await import('../dist/vendor/GLTFLoader.js'),{SpiderBruiser}=await import('../dist/spider-bruiser.js'),{UnitDamage,traceImpact}=await import('../dist/combat-collision.js');
const {ActorSilhouettes}=await import('../dist/actor-silhouettes.js');
const bytes=fs.readFileSync(new URL('../dist/city-assets/licensed-robots/breaker-spider.glb',import.meta.url)),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
function fixture(){const scene=new THREE.Scene(),hero={id:'hero',kind:'hero',alive:true,shapes:[{center:{x:0,y:1.4,z:35},half:{x:.5,y:1,z:.5}}]},damage=new UnitDamage(u=>u.entity.destroy()),removed=[],r=new SpiderBruiser(scene,damage,{spiderModel:asset,spawnPosition:{x:0,y:.1,z:0},initialCooldown:100,getTargets:()=>[hero],visible:()=>true,trace:(a,b,id,radius)=>traceImpact(a,b,{targets:[hero],ground:false,radius}),onDebris:s=>({position:new THREE.Vector3().copy(s.position),quaternion:s.quaternion.clone(),velocity:new THREE.Vector3(),angularVelocity:new THREE.Vector3()}),onRemoveDebris:b=>removed.push(b)});r.spawn();r.age=3;return{r,hero,damage,removed};}
for(const hz of[30,60,120]){const {r,hero,damage,removed}=fixture(),other=fixture().r;assert.equal(r.spider.diagnostics().triangles,2944);assert.equal(r.spider.diagnostics().bones,14);const solid=[];r.root.traverse(m=>{if(m.isMesh&&m!==r.warning)solid.push(m);});assert.equal(solid.length,r.spider.meshes.length);assert.notEqual(r.spider.hip,other.spider.hip);assert.notEqual(r.spider.meshes[0].material,other.spider.meshes[0].material);assert.equal(r.spider.meshes[0].geometry,other.spider.meshes[0].geometry);for(let i=0;i<hz*3;i++){r.update(1/hz,i/hz);for(const l of r.spider.legs)assert(l.contact.getWorldPosition(new THREE.Vector3()).distanceTo(l.foot)<.002);}assert(r.root.position.z>4&&r.spider.steps>8);const head=r.combatUnit.shapes.find(s=>s.part==='head');assert(head);assert.equal(damage.hurt(r.combatUnit,25,head.center,'head'),50);assert.equal(r.headshots,1);assert(r.headshotSeconds>0);r.update(1/hz,4);assert(r.spider.eye.material.emissiveIntensity>r.spider.eyeRestIntensity);r.stun(1);r.update(.2,4.2);assert(r.stunRemaining>.7);const silhouettes=new ActorSilhouettes();silhouettes.update([r],null,new Set(),0);assert(silhouettes.enemies.length>0);damage.hurt(r.combatUnit,10000,r.aimPoint(),'hull');silhouettes.update([r],null,new Set(),0);assert(silhouettes.enemies.every(e=>!e.overlay.visible));for(const w of r.wrecks)w.group.traverse(m=>{if(m.isMesh){assert(!m.userData.actorSilhouette);assert.notEqual(m.material.depthFunc,THREE.GreaterDepth,'wreck must use ordinary depth testing');}});assert(r.dead&&r.wrecks.length===6);r.reset();r.spawn();assert.equal(removed.length,6);assert.equal(r.combatUnit.health,350);assert.equal(r.combatUnit.maxHealth,350);assert(r.spider.body.visible);assert.equal(r.spider.wreckHome.children.length,0);r.age=3;r.cooldown=0;r.getTargets=()=>[hero];r.moveSpeed=0;for(let i=0;i<hz*3;i++)r.update(1/hz,5+i/hz);assert(r.shots>=4);assert.equal(r.lastBurstModes.length,4);assert.equal(r.projectileSpeed,36);assert.equal(r.leadChance,.33);assert.equal(r.barrel.parent.parent,r.spider.head);console.log('PASS',hz+'Hz','Bruiser supplied mesh/rig, walking contacts, 2x headshots and effects, stun, 6 wrecks/reset, preserved 4-shot bursts/36m/s/33% lead');}

{
 const {r,hero}=fixture(),center=hero.shapes[0].center;
 assert(Math.abs(r.heroRange-100.8)<1e-8);assert(Math.abs(r.weaponRange-114.24)<1e-8);
 r.moveSpeed=0;r.cooldown=0;
 center.z=102;
 r.selectTarget(r.aimPoint());
 assert.equal(r.target,null,'heroes outside the 100.8 m detection radius are ignored');
 center.z=99;
 for(let i=0;i<60*7;i++)r.update(1/60,i/60);
 assert.equal(r.target,hero);
 assert(r.heroHits>0,'a Bruiser bolt can hit a hero near the reduced acquisition range');
 hero.kind='helicopter';
 center.z=112;
 r.reset();r.spawn();r.age=3;r.cooldown=0;
 for(let i=0;i<60*7;i++)r.update(1/60,i/60);
 assert(r.hits>0,'a Bruiser bolt can reach an objective near the reduced weapon range');
 console.log('PASS Bruiser reduced hero acquisition and weapon range');
}

for(const hz of [30,60,120]){
 const {r,hero}=fixture(),dt=1/hz,times=[];
 r.moveSpeed=0;r.cooldown=0;
 for(let frame=0;frame<10*hz&&times.length<12;frame++){
  const time=frame*dt;
  hero.shapes[0].center.x=2*Math.sin(time);
  const before=r.shots;
  r.update(dt,time);
  if(r.shots>before)times.push(time);
 }
 assert.equal(times.length,12);
 for(let i=1;i<times.length;i++){
  const expected=i%4===0?3:.25;
  assert(Math.abs(times[i]-times[i-1]-expected)<=dt+1e-7,'shot '+(i+1)+' at '+hz+' Hz');
 }
 console.log('PASS',hz+'Hz','three four-shot Bruiser bursts with a three-second firing gap on a moving hero');
}
