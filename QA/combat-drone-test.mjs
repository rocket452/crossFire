import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url).href;
const T=await import(root+'vendor/three.module.js');
const {DestructionWorld}=await import(root+'destruction.js');
const {UnitDamage,traceImpact}=await import(root+'combat-collision.js');
const {CombatDrone}=await import(root+'combat-drone.js');
function fixture(y=9.5,wall=false){
 const scene=new T.Scene(),physics=new DestructionWorld();let drone;
 const d=new UnitDamage(u=>{if(u.entity===drone)drone.destroy();});
 const events=[];
 if(wall)physics.addChunk({type:'wall',building:'test wall',floor:0,x:8,y:6,z:0,size:[.5,12,12]});
 const hero={id:'hero',kind:'hero',alive:true,shapes:[{center:new T.Vector3(0,1.48,18),half:{x:.55,y:1,z:.55}}]};
 const hit=(a,b,owner,radius)=>traceImpact(a,b,{sections:physics.chunks,targets:[hero],radius});
 drone=new CombatDrone(scene,d,{physics,id:'combat-drone-1',bounds:{minX:-120,maxX:120,minZ:-120,maxZ:120},
 visible:()=>true,trace:hit,roof:()=>null,redirect:()=>null,particle(){},burst(p,s,air){events.push(air?'engine':'crash');},
 onWreck(){},onRemoveSmoke(){},audio:()=>null,cameraImpact(){},onRoundHit:h=>events.push(h.kind),onEvent:e=>events.push(e)});
 drone.spawn({x:0,y,z:0});
 const step=(seconds,targets=[],dt=1/60)=>{
  for(let i=0;i<Math.round(seconds/dt);i++){drone.update(dt,targets);physics.step(dt);drone.syncWrecks();}
 };
 const destroy=i=>{
  const engine=drone.engines[i],part=drone.combatUnit.shapes.find(s=>s.part===engine.id);
  assert.equal(traceImpact(part.center.clone().add(new T.Vector3(0,3,0)),part.center,{targets:[drone.combatUnit],ground:false}).part,engine.id);
  d.hurt(drone.combatUnit,105,part.center,part.part);
 };
 return {scene,physics,drone,d,hero,events,step,destroy};
}
for(const rate of [30,60,120]){
 const f=fixture();
 f.step(8,[f.hero],1/rate);
 console.log('flight',rate,f.drone.root.position.toArray().map(x=>+x.toFixed(2)),f.drone.body.angularVelocity.length(),f.drone.gun.shots,f.drone.gun.hits);
 assert(Math.abs(f.drone.root.position.y-9.5)<.75);
 assert(f.drone.gun.shots>=30&&f.drone.gun.hits>0);
}
for(const [motors,y,wall,velocity] of [
 [[0],9.5,false,0],[[1],9.5,false,0],[[2],9.5,false,0],[[3],9.5,false,0],
 [[0,1],9.5,false,0],[[0,3],9.5,false,0],[[0,1,2],9.5,false,0],[[0,1,2,3],9.5,false,0],
 [[0],2.2,false,0],[[3],27,false,0],[[0],9.5,true,12],[[1],15,false,11]
]){
 const f=fixture(y,wall),b=f.drone.body;
 b.velocity.x=velocity;
 if(y===15)b.angularVelocity.z=1.6;
 motors.forEach(f.destroy);
 f.step(.25);
 const v=b.angularVelocity.toArray().map(x=>+x.toFixed(2));
 const drop=+(y-b.position.y).toFixed(2),thrust=f.drone.flight.forces.slice();
 assert(motors.every(i=>thrust[i]===0));
 assert(thrust.filter(n=>n>0).length===4-motors.length);
 if(motors.length===1&&y===9.5&&!velocity)assert((motors[0]%2===0?v[2]>0:v[2]<0),'tilts toward failed motor');
 f.step(8);
 const p=b.position.toArray().map(x=>+x.toFixed(2));
 console.log('crash',String(motors),y,wall,velocity,'rotation',v,'fall',drop,'peak',f.drone.peakImpact.toFixed(2),'position',p,'mode',f.drone.mode,'frags',f.drone.fragments.length);
 assert.equal(f.drone.mode,'wreck');
 if(y<3)assert(!f.drone.severe,'slow ground impact does not explode');
 if(wall)assert(b.position.x<8,'building contact halted horizontal momentum');
 assert(f.drone.root.visible);
 assert(f.events.filter(e=>e==='crash').length<=1);
 assert.equal(f.drone.gun.shots,0);
 f.step(25);
 assert(!f.drone.root.visible);assert.equal(f.physics.wrecks.length,0);
}

{
 const f=fixture(),gun=f.drone.gun,g=gun.config;
 f.step(.46,[f.hero]);assert.equal(gun.phase,'acquisition');assert.equal(gun.shots,0);
 f.step(.6,[f.hero]);assert.equal(gun.phase,'spinUp');assert(gun.spin>0&&gun.spin<1);assert.equal(gun.shots,0);
 f.step(.53,[f.hero]);assert.equal(gun.phase,'fire');
 const y=f.drone.model.turret.rotation.y,x=f.drone.model.pitch.rotation.x;
 f.hero.shapes[0].center.set(18,1.48,0); // a sudden sideways move
 f.step(1/60,[f.hero]);
 assert(Math.hypot(f.drone.model.turret.rotation.y-y,f.drone.model.pitch.rotation.x-x)<=T.MathUtils.degToRad(35)/60+1e-8);
 f.step(.28,[f.hero]);assert(!f.events.includes('unit'),'sideways evasion leaves the stream of fire');
 while(gun.phase==='fire')f.step(1/60,[f.hero]);
 assert.equal(gun.shots,30);assert.equal(gun.phase,'cooldown');
 const count=gun.shots;f.step(g.cooldown-.08,[]);assert.equal(gun.shots,count);
 f.step(.16,[]);assert.equal(gun.phase,'idle');
 const angle=gun.select([{...f.hero,shapes:[{center:new T.Vector3(0,30,4)}]}]);
 assert.equal(angle,null,'underside gun cannot acquire an above-hull target');
 f.drone.model.pitch.rotation.x=-Math.PI/2;
 f.drone.model.turret.rotation.y=0;
 f.drone.root.updateMatrixWorld(true);
 gun.fire();assert.equal(gun.shots,count,'fuselage blocks a mechanically invalid round');
 console.log('PASS acquisition, spin-up, 30-round burst, 35°/s tracking limit, sideways evasion, cooldown and self-occlusion');
}

{
 const f=fixture();
 const gun=f.drone.gun;
 gun.rounds.push({position:new T.Vector3(0,2,0),direction:new T.Vector3(0,0,1),life:1,owner:f.drone.id,tracer:true});
 gun.options.redirect=()=>({position:new T.Vector3(9,2,1),direction:new T.Vector3(1,0,0)});
 gun.advance(1/60);
 assert.deepEqual(gun.rounds[0].position.toArray(),[9,2,1]);assert.equal(gun.redirects,1);
 gun.options.redirect=()=>null;
 const wall=f.physics.addChunk({type:'wall',building:'shot-wall',floor:0,x:10,y:2,z:1,size:[.3,3,3]});
 gun.advance(1/60);assert(f.events.includes('building'));
 assert(wall.hp>0);assert.equal(gun.rounds.length,0);
 f.d.hurt(f.drone.combatUnit,f.drone.config.hullHealth,f.drone.root.position,'hull');
 f.step(.25);
 assert.equal(f.drone.mode,'failing');
 assert(f.drone.flight.forces.every(t=>t===0));
 assert(f.drone.engines.every(e=>e.health===f.drone.config.engineHealth));
 const other=new CombatDrone(f.scene,f.d,{...f.drone.options,id:'combat-drone-2'});
 other.spawn({x:-10,y:9.5,z:0});
 for(let i=0;i<480;i++){
  for(const drone of [f.drone,other])drone.update(1/60,[]);
  f.physics.step(1/60);
  for(const drone of [f.drone,other])drone.syncWrecks();
 }
 assert.equal(f.drone.mode,'wreck');
 assert.equal(other.mode,'flying');
 assert(Math.abs(other.root.position.y-9.5)<.75);
 assert(f.physics.wrecks.length<=5);
 f.drone.reset();other.reset();
 assert.equal(f.physics.wrecks.length,0);
 console.log('PASS projectile redirect, swept building hit, independent hull failure, two shared-world drones and reset cleanup');
}

{
 const f=fixture(), start=f.drone.root.position.clone();
 f.step(6,[]);
 assert(f.drone.root.position.distanceTo(start)>3,'four engines move the patrol using thrust');
 assert(Math.abs(f.drone.root.position.y-9.5)<.75);
 assert(f.drone.flight.forces.every(t=>t>0));
}

{
 const f=fixture();
 while(f.drone.gun.phase!=='fire')f.step(1/60,[f.hero]);
 for(let i=0;i<28;i++){
  f.hero.shapes[0].center.x+=30/60;
  f.step(1/60,[f.hero]);
 }
 assert(f.drone.gun.shots>=5);
 assert(!f.events.includes('unit'),'30 m/s continuous lateral movement escapes initial fire');
 console.log('PASS continuous 30 m/s lateral evasion during live projectile flight');
}
