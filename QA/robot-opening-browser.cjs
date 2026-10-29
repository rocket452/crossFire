const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright-core');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const harness=`window.__qaStopRender=true;window.qa={
 state:()=>({time:simTime,arsenal:arsenal.diagnostics(),beam:robot.weapon.diagnostics(),pod:robotMissiles.diagnostics(),plasma:plasmaArtillery.diagnostics(),eyes:eyeBeams.diagnostics(),status:$('robot-status').textContent}),
 step:s=>{for(let i=0;i<Math.round(s*60);i++){simTime+=1/60;updateCombat(1/60);physics.step(1/60);for(const c of physics.dynamic)syncChunk(c);robot.syncWrecks();refreshUnitShapes();updateEffects(1/60);
 const beam=['charging','firing'].includes(robot.weapon.phase),pod=robotMissiles.pending||robotMissiles.missiles.some(m=>m.alive),plasma=plasmaArtillery.busy;
 if((beam&&pod)||(beam&&plasma)||(pod&&plasma))throw Error('heavy weapons overlapped');
 if(arsenal.phase==='startup'&&(beam||pod||plasma||eyeBeams.cycle.phase!=='idle'||eyeBeams.bolts.length))throw Error('robot attacked during startup');
 }updateStats();return qa.state();},
 durable:()=>{robot.combatUnit.health=robot.combatUnit.maxHealth=1e7;},
 render:()=>{updateCamera(1/60);renderer.render(scene,camera);renderer.getContext().finish();}
};`;
function quiet(s){assert.equal(s.arsenal.phase,'startup');assert(!['charging','firing'].includes(s.beam.phase));assert.equal(s.beam.bursts,0);assert.equal(s.pod.launched,0);assert.equal(s.plasma.launched,0);assert.equal(s.plasma.active,0);assert.equal(s.eyes.shots,0);assert.match(s.status,/ATTACKS IN/);}
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const mobile of [false,true]){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1100,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1}),errors=[];p.setDefaultTimeout(60000);
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/.test(m.text()))errors.push(m.text());});
 await p.route('**/battle.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'dist/battle.js'),'utf8').replace('requestAnimationFrame(animate);const elapsed=','requestAnimationFrame(animate);if(window.__qaStopRender)return;const elapsed=')+harness}));
 await p.goto('http://127.0.0.1:8765',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.battleDiagnostics?.().loaded);
 let s=await p.evaluate(()=>qa.state());quiet(s);assert.equal(s.arsenal.startupRemaining,5);await p.evaluate(()=>qa.durable());
 s=await p.evaluate(()=>qa.step(4.95));quiet(s);assert(Math.abs(s.arsenal.startupRemaining-.05)<1e-6);
 const frozen=JSON.stringify(s);await p.waitForTimeout(120);assert.equal(JSON.stringify(await p.evaluate(()=>qa.state())),frozen,'countdown uses simulation time');
 s=await p.evaluate(()=>qa.step(.1));assert.equal(s.arsenal.phase,'beam');assert.equal(s.arsenal.startupRemaining,0);assert.equal(s.pod.launched,0);assert.equal(s.plasma.active,0);assert.equal(s.eyes.shots,0);
 s=await p.evaluate(()=>qa.step(84.95));assert(s.arsenal.turns.length>=4);assert.deepEqual(s.arsenal.turns.slice(0,4).map(t=>t.weapon),['beam','pod','plasma','beam']);
 for(const rest of s.arsenal.transitions.filter(t=>t.event==='rest')){const ready=s.arsenal.transitions.find(t=>t.event==='ready'&&t.next===rest.next&&t.time>=rest.time);if(ready)assert(Math.abs(ready.time-rest.time-5)<.017);}
 console.log('ROTATION',mobile?'phone':'desktop',JSON.stringify(s.arsenal.turns));
 await p.locator('#reset').click();s=await p.evaluate(()=>qa.state());quiet(s);assert.equal(s.arsenal.startupRemaining,5);assert.equal(s.arsenal.turns.length,0);assert.equal(s.time,0);
 s=await p.evaluate(()=>qa.step(4.95));quiet(s);s=await p.evaluate(()=>qa.step(4));assert.equal(s.arsenal.phase,'beam');assert.equal(s.beam.bursts,1);assert.equal(s.pod.launched,0);assert.equal(s.plasma.active,0);
 await p.locator('#reset').click();quiet(await p.evaluate(()=>qa.state()));await p.evaluate(()=>qa.render());assert.deepEqual(errors,[]);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS',mobile?'phone':'desktop','five-second initial/rebuild grace, no early eye/heavy attacks, beam/pod/plasma cycle, five-second transitions, no overlap or renderer errors');await p.close();
 }
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
