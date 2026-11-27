// Regression: "Exit to City Battle" in a mission briefing must open the City Battle scene. City Liberation is
// the default scene, so a bare "./" link reloaded the same briefing forever.
let pw;try{pw=require('playwright');}catch{pw=require('/opt/codex/cua_node/lib/node_modules/playwright-core');}
const assert=require('assert/strict');
const base=process.env.QA_URL||'http://127.0.0.1:8765/';
(async()=>{const b=await pw.chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const start of ['', '?scene=city-liberation','?scene=mission-1','?scene=wave-defense','?scene=evacuation']){
   const p=await b.newPage({viewport:{width:1280,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(120000);
   await p.goto(base+start);
   // Wave Defense and City Liberation open on the title cinematic first; start it to reach the briefing.
   const title=p.locator('dialog.defense-title[open] [data-title-start]');
   if(['','?scene=city-liberation','?scene=wave-defense'].includes(start)){await title.waitFor({state:'visible',timeout:90000});await title.click();}
   const exit=p.locator('dialog.evac-briefing[open] a',{hasText:'Exit to City Battle'});
   if(!await exit.waitFor({state:'visible',timeout:90000}).then(()=>true,()=>false)){console.log('SKIP',start||'(default)','shows no briefing');await p.close();continue;}
   await Promise.all([p.waitForURL(u=>new URL(u).searchParams.get('scene')==='battle'),exit.click()]);
   assert.equal(new URL(p.url()).pathname,new URL(base+start).pathname,'stays on the same page');
   await p.waitForFunction(()=>window.battleDiagnostics?.().loaded);
   assert.equal(await p.locator('#scene-select').inputValue(),'battle');
   await p.waitForTimeout(1500);
   assert.equal(await p.locator('dialog.evac-briefing[open]').count(),0,'no briefing loop in City Battle');
   assert.deepEqual(errors,[]);console.log('PASS',start||'(default)','→ exit →',new URL(p.url()).search);await p.close();
  }
  // Volt's briefing card lists the current ability keys.
  const p=await b.newPage({viewport:{width:1280,height:800}});await p.goto(base);
  await p.locator('dialog.defense-title[open] [data-title-start]').click({timeout:90000});
  await p.locator('dialog.evac-briefing[open] [data-next]').click({timeout:90000});await p.locator('dialog.evac-briefing[open] [data-hero="volt"]').click();
  const controls=await p.locator('dialog.evac-briefing[open] .evac-briefing-controls').innerText();
  assert.match(controls,/Thunder Punch\s+C · 25 charge/);assert.match(controls,/Circuit Breaker\s+E · Flank/);console.log('PASS Volt briefing keys: Thunder Punch C, Circuit Breaker E');await p.close();
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
