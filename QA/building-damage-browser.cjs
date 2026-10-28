const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright-core');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const harness=`
window.qa={
 pause:()=>{paused=true;window.__qaStopRender=true;},
 sample:()=>{const c=physics.chunks[5],color=new THREE.Color();chunkBatches[c.type].getColorAt(c.index,color);return{hp:c.hp,maxHp:c.maxHp,scorch:c.scorch,state:c.state,color:color.toArray(),original:new THREE.Color(c.tint).toArray(),pending:physics.pending.has(c)};},
 weak:power=>{const c=physics.chunks[5];physics.impact(c.body.position,power,.01,c,{player:true});},
 watch:()=>{const c=physics.chunks[5],n=new THREE.Vector3(Math.sin(c.yaw),0,Math.cos(c.yaw));view='free';controls.target.set(c.x,c.y+1,c.z);camera.position.set(c.x+n.x*13,c.y+4,c.z+n.z*13);controls.update();},
 render:()=>{renderer.render(scene,camera);renderer.getContext().finish();return{calls:renderer.info.render.calls,materials:renderer.info.memory};},
 restore:()=>{physics.chunks[5].maxHp=5.2;},
 robotDamage:()=>{const target=robot.aimPoint(new THREE.Vector3()),from=target.clone().add(new THREE.Vector3(0,0,6)),before=robot.combatUnit.health;electricAttack(from,target,.1,{cpu:true});return before-robot.combatUnit.health;},
 weapon:kind=>{const c=physics.chunks[5];c.hp=c.maxHp=1000;const p=new THREE.Vector3(c.x,c.y,c.z),n=new THREE.Vector3(Math.sin(c.yaw),0,Math.cos(c.yaw)),from=p.clone().addScaledVector(n,2);
  if(['shell','rocket','ai-rocket','robot-rocket'].includes(kind)){fire(from,p,0,kind==='shell'?'shell':'rocket',kind==='rocket',kind==='robot-rocket'?'siege-walker':kind==='shell'?'tank-0-0':'helicopter-0-0');for(let i=0;i<12;i++){simTime+=1/60;updateCombat(1/60);physics.step(1/60);for(const d of physics.dynamic)syncChunk(d);refreshUnitShapes();}}
  if(kind==='electric'||kind==='cpu-electric')electricAttack(from,p,.1,{cpu:kind==='cpu-electric'});
  if(kind==='beam')beamCombat.update(from,n.clone().negate(),.1);
  if(kind==='force')hero.onOrbHit({section:c},p);
  if(kind==='rifle')soldierCrowd.onShot(from,p,0,{i:0});
  if(kind==='portal')portalBoltHit({section:c},p);
  if(kind==='plasma')plasmaImpact(p,{section:c},7);
  return window.qa.sample();
 }
};`;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const mobile of [false,true]){
   const errors=[],page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1100,height:1000},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/battle.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'dist/battle.js'),'utf8').replace('requestAnimationFrame(animate);const elapsed=','requestAnimationFrame(animate);if(window.__qaStopRender)return;const elapsed=')+harness}));
   await page.goto('http://127.0.0.1:8765',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.battleDiagnostics?.().loaded);await page.evaluate(()=>qa.pause());await page.locator('#reset').click();
   const before=await page.evaluate(()=>{qa.watch();return qa.sample();});assert.equal(before.maxHp,5.2);assert.deepEqual(before.color,before.original.map(Math.fround));
   await page.locator('#viewport').scrollIntoViewIfNeeded();const clean=await page.evaluate(()=>qa.render());
   await page.locator('#viewport').screenshot({path:'/tmp/armored-building-clean'+(mobile?'-phone':'')+'.png'});
   let damaged=await page.evaluate(()=>{qa.weak(4.5);return qa.sample();});assert.equal(damaged.state,'intact');assert(Math.abs(damaged.hp-4.75)<1e-9);assert(!damaged.pending);assert(damaged.color.every((v,i)=>v<before.color[i]*.8));
   await page.evaluate(()=>qa.weak(.2));const darker=await page.evaluate(()=>qa.sample());assert(darker.color.every((v,i)=>v<damaged.color[i]));
   const scorched=await page.evaluate(()=>qa.render());assert.equal(scorched.calls,clean.calls,'scorch requires no extra draw calls');
   await page.locator('#viewport').screenshot({path:'/tmp/armored-building-scorched'+(mobile?'-phone':'')+'.png'});
   for(const [kind,expected]of Object.entries({shell:2.3,rocket:1.8,'ai-rocket':1.8,electric:1.2,'cpu-electric':1.2,force:2.6,rifle:.035,portal:.2,beam:35,'robot-rocket':18,plasma:32})){
    await page.locator('#reset').click();const result=await page.evaluate(k=>qa.weapon(k),kind);assert(Math.abs(result.maxHp-result.hp-expected)<1e-6,kind+' source-aware damage must equal '+expected+' but was '+(result.maxHp-result.hp));assert(result.scorch>0,kind+' scorches its contacted panel');assert(result.color.every((v,i)=>v<result.original[i]),kind+' updates GPU instance tint');console.log('PASS',mobile?'phone':'desktop',kind,JSON.stringify(result));
   }
   assert(Math.abs(await page.evaluate(()=>qa.robotDamage())-15)<1e-8,'building armor does not reduce electricity damage to robot units');await page.evaluate(()=>qa.restore());
   await page.locator('#reset').click();const rebuilt=await page.evaluate(()=>qa.sample());assert.equal(rebuilt.hp,5.2);assert.equal(rebuilt.scorch,0);assert.deepEqual(rebuilt.color,before.color);assert.equal(rebuilt.state,'intact');assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   console.log('PASS',mobile?'phone':'desktop','surviving panel darkens progressively, fixed draw calls, all eleven source paths at exact damage values, unchanged unit damage, full reset, no page errors');await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
