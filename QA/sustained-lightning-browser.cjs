const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright-core');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const harness=`window.__qaStopRender=true;window.beamAudit=[];window.qa={
 stage:(fund=100)=>{window.beamAudit=[];runner.clearInput();runner.charge.reset();runner.playerBeam.reset();runner.energy.reset();runner.energy.amount=fund;runner.boost=false;runner.damage=runner.ticks=0;runner.motion.reset({x:0,y:.08,z:30});runner.yaw=runner.motion.yaw=Math.PI;runner.pitch=0;runner.heading.reset(runner.yaw);runner.pose(0);runner.updateCamera(1,true);for(let i=0;i<3;i++){const d=robot.aimPoint(camera.position).sub(camera.position);runner.yaw=Math.atan2(d.x,d.z);runner.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));runner.heading.reset(runner.yaw);runner.updateCamera(1,true);}paused=false;},
 step:(frames,dt=1/120)=>{for(let i=0;i<frames;i++){runner.update(dt,simTime+=dt);runner.updateCamera(dt);beamAudit.push({firing:runner.firing,fx:runner.fx.firing,amount:runner.energy.amount});}},
 state:()=>({...runner.diagnostics(),chargeBall:runner.fx.chargeBall.visible,audit:{frames:beamAudit.length,firing:beamAudit.filter(a=>a.firing&&a.fx).length,negative:beamAudit.some(a=>a.amount<0)},leg:runner.character.nodes.B_L_Thigh.quaternion.toArray()}),
 wallRates:()=>{const c=physics.chunks.find(c=>c.type==='wall'),normal=new THREE.Vector3(Math.sin(c.yaw),0,Math.cos(c.yaw)),from=new THREE.Vector3().copy(c.body.position).addScaledVector(normal,2),to=new THREE.Vector3().copy(c.body.position);return[30,60,120].map(hz=>{physics.reset();const hit=traceWorld(from,to),before=c.hp;for(let i=0;i<hz*.2;i++)electricAttack(from,to,1/hz);return{hz,direct:hit?.section===c,loss:before-c.hp};});},unlock:()=>document.exitPointerLock?.(),render:()=>{renderer.render(scene,camera);renderer.getContext().finish();}
};`;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const mobile of[false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1100,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});page.setDefaultTimeout(60000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE|WebGL/.test(m.text()))errors.push(m.text());});
  await page.route('**/battle.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'dist/battle.js'),'utf8').replace('requestAnimationFrame(animate);const elapsed=','requestAnimationFrame(animate);if(window.__qaStopRender)return;const elapsed=')+harness}));
  await page.goto('http://127.0.0.1:8765',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.battleDiagnostics?.().loaded);
  await page.locator('#play-runner')[mobile?'tap':'click']();await page.locator('#viewport').scrollIntoViewIfNeeded();
  const state=()=>page.evaluate(()=>qa.state()),step=n=>page.evaluate(n=>qa.step(n),n);
  const cdp=mobile?await page.context().newCDPSession(page):null;let contacts=[];
  const touch=async(type,next)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?contacts.filter(a=>!next.some(b=>a.id===b.id)):next});contacts=next;};
  const center=async id=>{const r=await page.locator(id).boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2};};
  const forward=async(boost=false)=>{if(mobile){if(boost)await page.locator('#runner-boost').tap();const p=await center('#runner-stick');await touch('touchStart',[...contacts,{id:1,x:p.x,y:p.y-28}]);}else{await page.locator('canvas').focus();await page.keyboard.down('w');if(boost)await page.keyboard.down('Shift');}};
  const fire=async()=>{if(mobile)await touch('touchStart',[...contacts,{id:2,...await center('#runner-fire')}]);else{const p=await center('canvas');await page.mouse.move(p.x,p.y);await page.mouse.down();}};
  const release=async(unlock=true)=>{if(mobile){if(contacts.length)await touch('touchEnd',[]);}else{await page.mouse.up();await page.mouse.up({button:'right'});await page.keyboard.up('w');await page.keyboard.up('Shift');await page.keyboard.up('d');if(unlock){await page.evaluate(()=>qa.unlock());await page.waitForTimeout(100);}}};
  const immediate=s=>{assert(s.firing&&s.electricity.firing,'beam and impact visible on first 120Hz update');assert(!s.charging&&!s.electricity.charging&&!s.chargeBall);assert.equal(s.charge.seconds,0);assert.equal(s.charge.cooldown,0);assert(Math.abs(s.energy.beamSpent-25/120)<1e-7);assert(s.character.weighted);};
  // Same real street and inputs: firing must not slow the runner or freeze weighted legs.
  for(const boost of[false,true]){
   await page.evaluate(()=>qa.stage());await forward(boost);await step(18);await step(24);const baseline=await state();await release();
   await page.evaluate(()=>qa.stage());await forward(boost);await step(18);await fire();await step(1);let s=await state();immediate(s);const leg=s.leg;
   await step(23);s=await state();assert(s.firing);assert(s.character.clip.startsWith('Run'));assert(Math.hypot(...s.leg.map((v,i)=>v-leg[i]))>.02,'weighted legs keep animating while aiming');
   assert(Math.abs(s.distance-baseline.distance)<.15,'fire preserves running distance');assert(Math.abs(s.speed-baseline.speed)<.2,'fire preserves movement speed');if(boost)assert(s.speed>30);
   const oldYaw=s.yaw;
   if(mobile){const r=await page.locator('canvas').boundingBox(),p={id:3,x:r.x+r.width*.7,y:r.y+r.height*.45};await touch('touchStart',[...contacts,p]);await touch('touchMove',contacts.map(a=>a.id===3?{...a,x:a.x+30,y:a.y-10}:a));}
   else{await page.mouse.down({button:'right'});await page.mouse.move((await center('canvas')).x+30,(await center('canvas')).y-10);}
   await step(1);s=await state();assert(Math.abs(s.yaw-oldYaw)>.05,'aim can turn during a moving shot');assert(s.firing&&s.speed>5);
   if(boost){await page.evaluate(()=>qa.render());await page.locator('#viewport').screenshot({path:'/tmp/sustained67-'+(mobile?'phone':'desktop')+'.png'});}
   await step(23);s=await state();assert.equal(s.charge.bursts,1);assert(Math.abs(s.energy.beamSpent-10)<1e-7);await step(24);s=await state();assert(s.firing&&s.charge.bursts===1&&Math.abs(s.energy.beamSpent-15)<1e-7,'held fire continues beyond the former burst');
   console.log('PASS',mobile?'phone':'desktop',boost?'boost':'run','first-frame lightning + steering, animated weighted legs, unchanged motion',JSON.stringify({speed:s.speed,distance:s.distance,ticks:s.ticks,damage:s.damage,clip:s.character.clip}));await release();
  }
  // Continuous damage/energy over every frame, through the old burst/recovery boundaries.
  await page.evaluate(()=>qa.stage());await fire();await step(1);immediate(await state());await step(479);let s=await state();assert.equal(s.audit.firing,480,'no gaps in a full-bar four-second beam');assert(Math.abs(s.energy.beamSpent-100)<1e-7);assert(Math.abs(s.damage-600)<1e-6,'full reserve deals exact 150 DPS through real combat');assert.equal(s.energy.amount,0);assert(s.beam.needsRelease);await step(24);s=await state();assert(!s.firing&&!s.electricity.firing&&!s.audit.negative);assert.equal(s.charge.bursts,1);
  await forward();await step(60);s=await state();assert(s.energy.amount>0&&s.energy.amount<25,'actual running earns some reserve');assert(!s.firing,'empty held trigger does not flicker-fire new recharge');await release();await fire();await step(1);assert((await state()).firing,'release rearms with any positive charge');await release();
  // Stop on release and re-press immediately; short taps are paid and do damage too.
  await page.evaluate(()=>qa.stage());await fire();await step(36);await release();const saved=(await state()).energy.amount;await step(24);assert.equal((await state()).energy.amount,saved);await fire();await step(1);s=await state();assert(s.firing&&s.charge.bursts===2&&s.charge.cooldown===0);await release();
  await page.evaluate(()=>qa.stage());await fire();await release();await step(24);s=await state();assert(Math.abs(s.energy.beamSpent-2)<1e-7);assert(Math.abs(s.damage-12)<1e-7,'80ms quick tap has an immediate, proportional hit');assert(!s.firing);
  await page.evaluate(()=>qa.stage(1));await fire();await step(24);s=await state();assert.equal(s.energy.amount,0);assert(Math.abs(s.beam.secondsFired-.04)<1e-7);assert(Math.abs(s.damage-6)<1e-7,'partial reserve is never discarded or overdrawn');await release();
  await page.evaluate(()=>qa.stage(0));await fire();await step(60);s=await state();assert(!s.firing);assert.equal(s.energy.spent,0);assert.equal(s.charge.bursts,0);await release();
  // Existing E/DASH interrupts firing only during electric-wave transit, which remains free.
  await page.evaluate(()=>qa.stage());await fire();await step(24);const beforeWave=(await state()).energy.amount;
  if(mobile){const ability={id:4,...await center('#runner-dash')};await touch('touchStart',[...contacts,ability]);await touch('touchEnd',contacts.filter(a=>a.id!==4));}else await page.keyboard.press('e');
  await step(12);s=await state();assert(s.dash.active&&!s.firing&&s.energy.amount===beforeWave);await release();await step(48);
  await page.evaluate(()=>qa.stage());await fire();await step(24);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const afterBlur=(await state()).energy.amount;await step(24);s=await state();assert(!s.firing&&s.energy.amount===afterBlur);await release();
  if(!mobile){await page.evaluate(()=>qa.stage());await page.keyboard.down('f');await step(240);s=await state();assert(s.firing&&Math.abs(s.energy.beamSpent-50)<1e-7);await page.keyboard.up('f');await step(1);assert(!(await state()).firing);await page.keyboard.press('f');await step(1);assert((await state()).firing,'F re-press starts without a recovery timer');
   await page.evaluate(()=>qa.stage());await page.keyboard.down('d');await fire();await step(24);s=await state();assert(s.position.x>1&&s.firing);assert(['RunLeft','RunRight'].includes(s.character.clip));await release();}
  const walls=await page.evaluate(()=>qa.wallRates());assert(walls.every(w=>w.direct&&Math.abs(w.loss-3)<1e-7),'building damage remains time-based at 30/60/120Hz: '+JSON.stringify(walls));
  assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS',mobile?'phone':'desktop','unbroken 4s/600-damage beam, proportional partial reserve/tap, stop/re-press, exhaustion/rearm, dash/blur, no runtime/shader errors');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
