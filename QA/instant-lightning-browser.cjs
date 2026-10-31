const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright-core');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const harness=`window.__qaStopRender=true;window.qa={
 stage:(fund=100)=>{runner.clearInput();runner.charge.reset();runner.energy.reset();runner.energy.amount=fund;runner.boost=false;runner.damage=runner.ticks=0;runner.motion.reset({x:0,y:.08,z:30});runner.yaw=runner.motion.yaw=Math.PI;runner.pitch=0;runner.heading.reset(runner.yaw);runner.pose(0);runner.updateCamera(1,true);for(let i=0;i<3;i++){const d=robot.aimPoint(camera.position).sub(camera.position);runner.yaw=Math.atan2(d.x,d.z);runner.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));runner.heading.reset(runner.yaw);runner.updateCamera(1,true);}paused=false;},
 step:(frames,dt=1/120)=>{for(let i=0;i<frames;i++){runner.update(dt,simTime+=dt);runner.updateCamera(dt);}},
 state:()=>({...runner.diagnostics(),chargeBall:runner.fx.chargeBall.visible,leg:runner.character.nodes.B_L_Thigh.quaternion.toArray()}),
 unlock:()=>document.exitPointerLock?.(),render:()=>{renderer.render(scene,camera);renderer.getContext().finish();}
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
  const immediate=s=>{assert(s.firing&&s.electricity.firing,'beam visible on first 120Hz update');assert(!s.charging&&!s.electricity.charging&&!s.chargeBall,'no wind-up animation');assert.equal(s.charge.seconds,0);assert.equal(s.energy.spent,25);assert(s.character.weighted);};
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
   if(boost){await page.evaluate(()=>qa.render());await page.locator('#viewport').screenshot({path:'/tmp/instant-lightning63-'+(mobile?'phone':'desktop')+'.png'});}
   await step(23);s=await state();assert.equal(s.ticks,5,'full beam retains five damage samples');assert.equal(s.charge.bursts,1);assert.equal(s.energy.spent,25);await step(72);assert.equal((await state()).charge.bursts,1,'held fire respects recovery');
   console.log('PASS',mobile?'phone':'desktop',boost?'boost':'run','first-frame lightning + steering, animated weighted legs, unchanged motion',JSON.stringify({speed:s.speed,distance:s.distance,ticks:s.ticks,damage:s.damage,clip:s.character.clip}));await release();
  }
  // A brief click/tap still produces one complete .4s shot; repeated clicks cannot bypass recovery.
  await page.evaluate(()=>qa.stage());await fire();await release(false);await step(1);immediate(await state());await step(47);let s=await state();assert.equal(s.ticks,5);assert(s.damage>0,'real beam hits the actual Siege Walker');
  for(let i=0;i<3;i++){await fire();await release(false);await step(12);}assert.equal((await state()).charge.bursts,1);await step(180);assert.equal((await state()).charge.bursts,1,'released primary does not repeat');await release();
  await page.evaluate(()=>qa.stage(0));await fire();await step(60);s=await state();assert(!s.firing);assert.equal(s.energy.spent,0);assert.equal(s.charge.bursts,0);await release();
  if(!mobile){await page.evaluate(()=>qa.stage());await page.keyboard.press('f');await step(1);immediate(await state());await step(47);assert.equal((await state()).ticks,5,'quick F press queues a complete instant shot');
   await page.evaluate(()=>qa.stage());await page.keyboard.down('d');await fire();await step(24);s=await state();assert(s.position.x>1&&s.firing);assert(['RunLeft','RunRight'].includes(s.character.clip),'real directional strafe clip while aiming');await release();}
  assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS',mobile?'phone':'desktop','tap/click burst, cooldown spam, real boss damage, empty-charge gate, no runtime/shader errors');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
