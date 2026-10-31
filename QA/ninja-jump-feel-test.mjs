import assert from 'node:assert/strict';
import {NinjaMotion,NINJA} from '../dist/ninja-motion.js';
const bounds={minX:-1000,maxX:1000,minZ:-1000,maxZ:1000};
const fresh=()=>{const m=new NinjaMotion();m.body.bounds=bounds;m.body.yaw=0;return m;};
const run=(m,s,input={},sections=[],dt=1/120)=>{for(let t=0;t<s-1e-9;t+=dt)m.step(input,Math.min(dt,s-t),sections);};
const results=[];
for(const dt of[1/30,1/60,1/120,.075]){
 const m=fresh();m.jump();let t=0,apex=0,peak=0,previousY=m.position.y,previousV=m.velocity.y;
 do{m.step({},dt);t+=dt;if(m.position.y>apex){apex=m.position.y;peak=t;}if(m.mode==='air'){assert(m.velocity.y<=previousV||previousV===0);assert(Math.abs(m.position.y-previousY)<NINJA.terminalSpeed*dt+.01);}previousY=m.position.y;previousV=m.velocity.y;}while(m.mode!=='ground'&&t<5);
 assert(apex>12.5&&apex<12.8,'first jump is 30% lower');assert(peak>.83&&peak<.95);assert(t>1.62&&t<1.8);assert.equal(m.jumpCount,1);
 const momentum=fresh();run(momentum,.5,{forward:1},[],dt);momentum.jump();momentum.step({forward:1},dt);const takeoff=momentum.velocity.z;run(momentum,.1,{},[],dt);assert(momentum.velocity.z>takeoff*.98,'releasing input must retain airborne momentum');
 const retained=momentum.velocity.z/takeoff;const beforeTurn=momentum.velocity.z;run(momentum,.1,{forward:-1},[],dt);assert(momentum.velocity.z>0&&momentum.velocity.z<beforeTurn,'short opposite input steers without instant reversal');run(momentum,.4,{forward:-1},[],dt);assert(momentum.velocity.z< -20,'air control still allows an intentional direction change');
 const roof={id:'roof',building:'tower',type:'slab',state:'intact',x:0,y:10,z:27,size:[12,.35,12]};
 const coyote=fresh();coyote.body.position.y=10.175;run(coyote,dt,{},[roof],dt);coyote.body.position.x=8;run(coyote,dt,{},[roof],dt);assert.equal(coyote.mode,'air');coyote.jump();coyote.step({},dt,[roof]);assert.equal(coyote.doubleJumps,0);assert.equal(coyote.jumps,1);assert(coyote.velocity.y>25);coyote.jump();coyote.step({},dt,[roof]);assert.equal(coyote.doubleJumps,1,'late ledge jump retains the second jump');
 const expired=fresh();expired.body.position.y=10.175;expired.step({},dt,[roof]);expired.body.position.x=8;run(expired,.24,{},[roof],dt);expired.jump();expired.step({},dt,[roof]);assert.equal(expired.doubleJumps,1,'late airborne input consumes the air jump after coyote expires');
 const buffered=fresh();buffered.body.mode='air';buffered.body.position.y=.35;buffered.velocity.y=-8;buffered.jumps=2;buffered.jump();run(buffered,.12,{},[],dt);assert.equal(buffered.jumpCount,1,'pressing just before touchdown queues exactly one jump');assert(buffered.position.y>1&&buffered.velocity.y>22);run(buffered,.2,{},[],dt);assert.equal(buffered.jumpCount,1);
 const stale=fresh();stale.body.mode='air';stale.body.position.y=7;stale.velocity.y=-5;stale.jumps=2;stale.jump();run(stale,1,{},[],dt);assert.equal(stale.mode,'ground');assert.equal(stale.jumpCount,0,'an expired buffer must not bounce on a later landing');
 const ceiling={id:'ceiling',building:'ceiling',type:'slab',state:'intact',x:0,y:5,z:27,size:[12,.35,12]},head=fresh();head.jump();run(head,.15,{},[ceiling],dt);assert(head.position.y<2.55&&head.velocity.y<=0,'head collision stops ascent without tunneling');run(head,1,{},[ceiling],dt);assert.equal(head.mode,'ground');
 results.push({dt,apex:+apex.toFixed(3),timeToApex:+peak.toFixed(3),airtime:+t.toFixed(3),releaseRetention:+retained.toFixed(4)});
}
assert(Math.max(...results.map(r=>r.apex))-Math.min(...results.map(r=>r.apex))<.08);
console.table(results);
console.log('PASS high jump arc across 30/60/120Hz + 75ms frames; inertia, countersteering, ledge grace, buffered landing, expiry, head collision');
