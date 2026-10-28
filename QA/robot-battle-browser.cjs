// Run against the local static server. Instrumentation exists only in intercepted QA responses.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright-core');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const harness=`
window.qa={
 pause:()=>{paused=true;window.__qaStopRender=true;},
 defeat:()=>unitDamage.hurt(robot.combatUnit,robot.combatUnit.health,robot.root.position),
 step:seconds=>{const started=performance.now();for(let i=0;i<Math.ceil(seconds*30);i++){const dt=1/30;simTime+=dt;updateCombat(dt);physics.step(dt);for(const c of physics.dynamic)syncChunk(c);robot.syncWrecks();refreshUnitShapes();updateEffects(dt);}updateStats();return performance.now()-started;},
 render:()=>{updateCamera(.1);pilot.updateMarkers();renderer.render(scene,camera);renderer.getContext().finish();},
 peek:()=>({camera:camera.position.toArray(),target:controls.target.toArray(),robotBox:new THREE.Box3().setFromObject(robot.root)}),
 wreck:()=>robot.wrecks.map(w=>({name:w.name,y:w.body.position.y,renderedY:w.group.position.y,finite:[w.body.position.x,w.body.position.y,w.body.position.z].every(Number.isFinite)})),
 aim:()=>{const p=robot.aimPoint(camera.position);const d=p.sub(camera.position);return{yaw:Math.atan2(d.x,d.z),pitch:Math.atan2(d.y,Math.hypot(d.x,d.z))};}
};`;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const errors=[];const page=await browser.newPage({viewport:{width:1100,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/battle.js?*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'dist/battle.js'),'utf8').replace('requestAnimationFrame(animate);const elapsed=', 'requestAnimationFrame(animate);if(window.__qaStopRender)return;const elapsed=')+harness}));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8765',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.battleDiagnostics?.().loaded,null,{timeout:60000});await page.evaluate(()=>qa.pause());await page.locator('#viewport').scrollIntoViewIfNeeded();await page.evaluate(()=>qa.render());if(!process.env.SKIP_SCREENSHOTS)await page.locator('#viewport').screenshot({path:'/tmp/walker-start.png'});
 let d=await page.evaluate(()=>battleDiagnostics());assert.equal(d.view,'hero');assert.equal(d.robot.parts,17);assert.equal(d.robot.triangles,3744);assert.equal(await page.locator('#pilot-impact').count(),0);
 const cpuMs=await page.evaluate(()=>qa.step(20));d=await page.evaluate(()=>battleDiagnostics());
 assert(d.robot.hits.shell>0&&d.robot.hits.rocket>0&&d.robot.hits.infantry>0);assert(d.robot.damageByTeam.every(n=>n>0));assert(d.robot.returnShots>=1);assert(d.beam.shieldHits>0||d.combat.units.some(u=>u.kind!=='robot'&&u.health<(u.kind==='tank'?100:u.kind==='helicopter'?90:35)));
 console.log('PASS autonomous battle',JSON.stringify({robot:d.robot,impacts:d.weaponImpacts,sim20SecondsCpuMs:Math.round(cpuMs)}));
 // Use the real pilot button, mouse aiming, and Space fire path.
 await page.locator('[data-view="overview"]').click();await page.locator('#viewport').scrollIntoViewIfNeeded();await page.evaluate(()=>qa.render());await page.locator('.heli-pick.north').first().click();await page.evaluate(()=>qa.pause());
 assert((await page.evaluate(()=>battleDiagnostics())).pilot.active);
 await page.locator('#viewport').scrollIntoViewIfNeeded();const box=await page.locator('canvas').boundingBox();
 for(let i=0;i<2;i++){
  const a=await page.evaluate(()=>qa.aim()),p=(await page.evaluate(()=>battleDiagnostics())).pilot;let yaw=a.yaw-p.yaw;while(yaw>Math.PI)yaw-=2*Math.PI;while(yaw<-Math.PI)yaw+=2*Math.PI;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-yaw/.005,box.y+box.height/2-(a.pitch-p.pitch)/.004,{steps:6});await page.mouse.up();await page.evaluate(()=>qa.render());
 }
 const before=(await page.evaluate(()=>battleDiagnostics())).robot.health;
 // OnEnter left the game unpaused; toggling pause resumes it for a normal launch.
 await page.locator('#pause').click();await page.locator('canvas').focus();await page.keyboard.down('Space');await page.evaluate(()=>qa.step(.075));await page.keyboard.up('Space');await page.evaluate(()=>qa.pause());await page.evaluate(()=>qa.step(1.5));
 d=await page.evaluate(()=>battleDiagnostics());assert(d.playerMissiles>=1);assert.equal(d.pilot.lastImpact?.unitId,'siege-walker');assert(d.robot.health<before);assert.equal(await page.locator('#pilot-impact').count(),0);
 console.log('PASS manually piloted helicopter missile damages the robot',JSON.stringify({missiles:d.playerMissiles,impact:d.pilot.lastImpact}));
 await page.locator('#exit-pilot').click();await page.locator('[data-view="robot"]').click();await page.locator('#viewport').scrollIntoViewIfNeeded();
 // Exercise the normal damage/disable callback; either faction may win the beam encounter.
 await page.evaluate(()=>{qa.step(10);qa.defeat();});
 d=await page.evaluate(()=>battleDiagnostics());assert.equal(d.robot.alive,false);await page.evaluate(()=>qa.step(2));
 const falling=await page.evaluate(()=>qa.wreck());assert.equal(falling.length,17);await page.evaluate(()=>qa.step(1));const fallen=await page.evaluate(()=>qa.wreck());assert(fallen.every(w=>w.finite&&Math.abs(w.y-w.renderedY)<.001));assert(fallen.some((w,i)=>w.y<falling[i].y-.2),'actual rigid parts fall');
 await page.evaluate(()=>qa.render());if(!process.env.SKIP_SCREENSHOTS)await page.locator('#viewport').screenshot({path:'/tmp/walker-destroyed.png'});
 const shots=(await page.evaluate(()=>battleDiagnostics())).shotsFired;await page.evaluate(()=>qa.step(5));assert.equal((await page.evaluate(()=>battleDiagnostics())).shotsFired,shots,'armies hold fire after robot death');
 console.log('PASS damage-triggered destruction, 17 falling rendered wrecks and allied ceasefire',JSON.stringify({seconds:d.seconds,robot:d.robot}));
 await page.locator('#reset').click();d=await page.evaluate(()=>battleDiagnostics());assert.equal(d.robot.health,12000);assert.equal(d.robot.broken,false);assert.equal(d.robot.wreckBodies,0);assert.equal(d.combat.disabled,0);assert.equal(d.physics.detached,0);assert.equal(d.playerMissiles,0);assert(!d.pilot.active);assert.equal(d.robot.returnShots,0);
 assert.deepEqual(errors,[]);console.log('PASS complete rebuild, no hit popup and no browser errors');
 // Responsive phone view and touch pilot/fire controls.
 await page.close();const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.route('**/battle.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'dist/battle.js'),'utf8').replace('requestAnimationFrame(animate);const elapsed=', 'requestAnimationFrame(animate);if(window.__qaStopRender)return;const elapsed=')+harness}));await mobile.goto(process.env.BASE_URL||'http://127.0.0.1:8765',{waitUntil:'domcontentloaded',timeout:60000});await mobile.waitForFunction(()=>window.battleDiagnostics?.().loaded,null,{timeout:60000});await mobile.evaluate(()=>qa.pause());await mobile.locator('#viewport').scrollIntoViewIfNeeded();await mobile.evaluate(()=>qa.render());if(!process.env.SKIP_SCREENSHOTS)await mobile.locator('#viewport').screenshot({path:'/tmp/walker-phone.png'});assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await mobile.locator('[data-view="overview"]').tap();await mobile.locator('#viewport').scrollIntoViewIfNeeded();await mobile.evaluate(()=>qa.render());await mobile.locator('.heli-pick.north').first().tap();assert((await mobile.evaluate(()=>battleDiagnostics())).pilot.active);await mobile.locator('#pilot-fire').tap();await mobile.evaluate(()=>qa.pause());assert.equal((await mobile.evaluate(()=>battleDiagnostics())).playerMissiles,1);await mobile.locator('#exit-pilot').tap();assert(!(await mobile.evaluate(()=>battleDiagnostics())).pilot.active);assert.deepEqual(errors,[]);console.log('PASS 390px layout, touch entry / quick fire / exit');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
