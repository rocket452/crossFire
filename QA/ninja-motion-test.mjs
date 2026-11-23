import assert from 'node:assert/strict';
import {NinjaMotion,NINJA} from '../dist/ninja-motion.js';
import {RunnerMotion} from '../dist/runner-motion.js';
import {DestructionWorld} from '../dist/destruction.js';
const run=(m,s,input={},sections=[],dt=1/60)=>{for(let t=0;t<s-1e-8;t+=dt)m.step(input,Math.min(dt,s-t),sections);};

let extra=true;
const terrain=new DestructionWorld();
terrain.addChunk({type:'column',building:'cyberpunk tower',floor:0,x:1.3,y:15,z:27,size:[.25,30,12]});
const upgraded=new NinjaMotion({hasExtraAirJump:()=>extra});
upgraded.body.position.y=5;
upgraded.body.mode='air';
const jump=()=>{upgraded.jump();run(upgraded,.04,{},terrain.chunks);};
jump();
assert.equal(upgraded.wallJumps,1);
assert.equal(upgraded.airJumpsRemaining,2,'cyberpunk façade kick leaves both midair jumps');
jump();jump();jump();
assert.equal(upgraded.doubleJumps,2);
assert.equal(upgraded.airJumpsRemaining,0);
run(upgraded,4,{},terrain.chunks);
assert.equal(upgraded.mode,'ground');
assert.equal(upgraded.airJumpsRemaining,2);
extra=false;
upgraded.reset();
assert.equal(upgraded.airJumpsRemaining,1,'new unupgraded run restores the base limit');
for(const dt of[1/30,1/60,1/120,.075]){
 const m=new NinjaMotion();m.body.bounds={minX:-1000,maxX:1000,minZ:-1000,maxZ:1000};m.body.yaw=0;run(m,1,{forward:1},[],dt);assert(Math.abs(m.velocity.z-32.2)<.05);const volt=new RunnerMotion();assert.equal(volt.runSpeed,14);assert.equal(volt.boostSpeed,46);
 m.reset();m.body.position.y=500;m.body.mode='air';m.body.yaw=0;run(m,3,{forward:1},[],dt);assert.equal(m.mode,'air');assert(Math.abs(m.velocity.z-32.2)<.05,'air speed cap remains unchanged once reduced steering settles');m.reset();m.jump();run(m,1,{},[],dt);assert(m.position.y>12&&m.jumps===1);const height=m.position.y;m.jump();run(m,.1,{},[],dt);assert(m.position.y>height+2);assert.equal(m.doubleJumps,1);m.jump();run(m,.1,{},[],dt);assert.equal(m.jumpCount,2,'no third jump in empty air');run(m,5,{},[],dt);assert.equal(m.mode,'ground');assert.equal(m.jumps,0);
 m.jump();run(m,.3,{},[],dt);assert(m.startDash({x:0,y:m.position.y+1.2,z:m.position.z-40}));assert(!m.startDash({x:1,y:20,z:5}));const start={...m.position};run(m,.4,{},[],dt);assert(!m.active);assert(Math.abs(m.position.z-start.z+48)<.01);assert(m.cooldown>5.55&&m.slowFall>2.9);assert(!m.startDash({x:0,y:20,z:0}));run(m,6,{},[],dt);assert.equal(m.cooldown,0);
 let hits=0;const kill=new NinjaMotion({sweep:()=>({t:.5,kind:'missile'}),onHit:()=>{hits++;return{killed:true,damage:18};}});kill.body.position.y=20;kill.body.mode='air';assert(kill.startDash({x:0,y:21.2,z:0}));kill.step({},dt,[]);assert.equal(hits,1);assert.equal(kill.cooldown,0);assert.equal(kill.resets,1);assert.equal(kill.slowFall,3);assert(kill.startDash({x:12,y:21,z:0}),'immediate airborne kill chain');
 const miss=new NinjaMotion({sweep:()=>({t:.3,kind:'building'}),onHit:()=>({damage:0,killed:false})});miss.body.position.y=20;miss.body.mode='air';miss.startDash({x:0,y:20,z:0});miss.step({},dt,[]);assert(miss.cooldown>5.9);assert(!miss.active);assert.equal(miss.resets,0);
 const wall={id:'wall',building:'tower',type:'wall',state:'intact',x:1.3,y:15,z:27,size:[.25,30,12]},w=new NinjaMotion();w.body.position.y=5;w.body.mode='air';w.jumps=2;w.body.velocity.y=-5;w.jump();run(w,.05,{},[wall],dt);assert.equal(w.wallJumps,1);assert(w.velocity.y>34);assert(w.velocity.x<-10.5,'wall jump kicks away rather than climbing inside the wall');assert.equal(w.jumps,2,'wall kick preserves the spent air jump');w.jump();run(w,.05,{},[wall],dt);assert.equal(w.wallJumps,1,'contact lock prevents repeated wall kicks');assert.equal(w.doubleJumps,0);assert.equal(w.mode,'air');assert.equal(w.body.climbs,0,'ninja does not acquire Volt wall running');
 const roof={id:'roof',building:'tower',type:'slab',state:'intact',x:0,y:10,z:27,size:[12,.35,12]},landing=new NinjaMotion();landing.body.position.y=15;landing.body.mode='air';landing.jumps=2;landing.body.velocity.y=-4;run(landing,2,{},[roof],dt);assert.equal(landing.mode,'ground');assert(Math.abs(landing.position.y-10.175)<.01);assert.equal(landing.jumps,0);
 console.log('PASS',dt,'32.2m/s ground / 32.2m/s air / 128.8m/s dash, high/double/no triple jumps, roof landing, angled high wall spring and independent air jump, six-second dash, exact 48m distance, three-second slow fall, kill reset and no reset on scenery');
}

const backstab=new NinjaMotion();
backstab.backstabDashReady=true;
assert(backstab.startDash({x:0,y:0,z:60}));
assert.equal(backstab.backstabDashReady,false);
assert.equal(backstab.cooldown,0);
assert.equal(backstab.startDash({x:0,y:0,z:55}),false,'extra dash still waits for the first dash to end');
run(backstab,.5);
assert(backstab.startDash({x:0,y:0,z:-40}));
assert.equal(backstab.cooldown,NINJA.dashCooldown);
backstab.backstabDashReady=true;
backstab.reset();
assert.equal(backstab.backstabDashReady,false);
console.log('PASS Backstab Dash banks exactly one extra dash and clears on reset');

const climb=new NinjaMotion();
const corridor=[-2.5,2.5].map(x=>({x,y:200,z:27,size:[.25,400,12],type:'wall',state:'intact',building:'tower'}));
climb.body.position.x=1.3;
climb.jump();climb.step({},1/60,corridor);
climb.jump();climb.step({},1/60,corridor);
assert.equal(climb.wallJumps,1);
assert.equal(climb.jumps,1,'an unspent double jump survives a wall kick');
climb.jump();climb.step({},1/60,corridor);
assert.equal(climb.doubleJumps,1);
for(let kick=2;kick<=12;kick++){
 const toward=kick%2===0?-1:1;
 for(let frame=0;frame<60;frame++){
  climb.body.yaw=toward*Math.PI/2;
  climb.step({forward:1},1/60,corridor);
  if(climb.wallJumpLock===0&&toward*climb.position.x>1.1)break;
 }
 climb.jump();climb.step({},1/60,corridor);
 assert.equal(climb.wallJumps,kick);
 assert.equal(climb.jumps,2);
 assert.equal(climb.mode,'air');
}
console.log('PASS 12 consecutive wall kicks with one double jump between landings');

for(const dt of[1/30,1/60,1/120,.075]){
 const normal=new NinjaMotion(),afterDash=new NinjaMotion();
 for(const m of [normal,afterDash]){m.body.position.y=280;m.body.mode='air';}
 afterDash.startDash({x:0,y:281.2,z:50});afterDash.finishDash();
 assert.equal(afterDash.velocity.y,0,'no upward kick or float after the dash');
 for(let i=0;i<Math.floor(3/dt);i++){
  normal.step({},dt,[]);afterDash.step({},dt,[]);
  assert(Math.abs(afterDash.velocity.y-normal.velocity.y/2)<1e-6,'half fall speed over the whole descent');
  assert(Math.abs(280-afterDash.position.y-(280-normal.position.y)*.5)<1e-6);
 }
 run(afterDash,.15,{},[],dt);
 assert.equal(afterDash.slowFall,0);
 assert(afterDash.velocity.y<-26,'full gravity resumes after the timer');
}
