const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright-core');
const fs=require('node:fs'),assert=require('node:assert/strict');
const harness=`
window.collapseQA={
 stop:()=>{paused=true;window.__qaStopRender=true;},
 tower:()=>physics.buildings.get(layout.buildings.reduce((a,b)=>a.floors>b.floors?a:b).id),
 aim:()=>{const b=layout.buildings.find(b=>physics.buildings.get(b.id)===collapseQA.tower());view='free';camera.position.set(b.x+25,15,b.z+28);controls.target.set(b.x,b.floors*1.5,b.z);controls.update();},
 sample:()=>{const b=collapseQA.tower();const elevationExcess=Math.max(...b.chunks.map(c=>c.body.position.y-physics.terrainHeight(c.body.position.x,c.body.position.z)-Math.hypot(...c.size)/2));return{elevationExcess,released:b.collisionDisabled,falling:physics.falling.size,active:physics.dynamic.length,queued:physics.queue.length,top:Math.max(...b.chunks.map(c=>c.body.position.y)),intact:b.chunks.filter(c=>c.state==='intact').length,total:b.chunks.length,stats:physics.stats()};},
 breakSupports:()=>{const b=collapseQA.tower();for(const c of b.chunks.filter(c=>c.type==='column'&&c.floor===0).slice(0,2))physics.impact(c.body.position,40,.01,c,{source:'siege-walker',player:true});},
 release:()=>{const b=collapseQA.tower();for(const c of b.chunks){if(b.collisionDisabled)break;physics.damageChunk(c,100,{source:'siege-walker'});}},
 tick:seconds=>{let peak=0;for(let t=0;t<seconds;t+=1/60){physics.step(1/60);for(const c of physics.dynamic)syncChunk(c);peak=Math.max(peak,physics.dynamic.length);}return{...collapseQA.sample(),peak};},
 render:()=>{renderer.render(scene,camera);renderer.getContext().finish();const b=collapseQA.tower(),matrix=new THREE.Matrix4(),p=new THREE.Vector3();let delta=0;for(const c of b.chunks){chunkBatches[c.type].getMatrixAt(c.index,matrix);p.setFromMatrixPosition(matrix);delta=Math.max(delta,p.distanceTo(new THREE.Vector3().copy(c.body.position)));}return{delta,calls:renderer.info.render.calls};}
};`;
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const mobile of[false,true])for(const scene of['testing','evacuation','battle']){
  const page=await browser.newPage({viewport:mobile?{width:430,height:932}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/battle.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('dist/battle.js','utf8').replace('requestAnimationFrame(animate);const elapsed=','requestAnimationFrame(animate);if(window.__qaStopRender)return;const elapsed=')+harness}));
  await page.goto('http://127.0.0.1:8765/?scene='+scene);await page.waitForFunction(()=>window.battleDiagnostics?.().loaded);await page.evaluate(()=>collapseQA.stop());await page.locator('#reset').click();await page.evaluate(()=>collapseQA.aim());const before=await page.evaluate(()=>collapseQA.sample());
  if(scene==='testing'){
   await page.locator('#viewport').screenshot({path:'/tmp/building147-intact-'+(mobile?'phone':'desktop')+'.png'});
   await page.evaluate(()=>collapseQA.breakSupports());const middle=await page.evaluate(()=>collapseQA.tick(1.5));assert(middle.stats.collapses>0);await page.evaluate(()=>collapseQA.render());await page.locator('#viewport').screenshot({path:'/tmp/building147-falling-'+(mobile?'phone':'desktop')+'.png'});
   const ended=await page.evaluate(()=>collapseQA.tick(50));assert(ended.released&&ended.falling===0&&ended.queued===0&&ended.elevationExcess<.1,JSON.stringify(ended));assert(ended.peak<=(mobile?110:160));
  }else{await page.evaluate(()=>collapseQA.release());const released=await page.evaluate(()=>collapseQA.sample());assert(released.released&&released.falling>0);const ended=await page.evaluate(()=>collapseQA.tick(12));assert(ended.falling===0&&ended.elevationExcess<.1);}
  const synced=await page.evaluate(()=>collapseQA.render());assert(synced.delta<1e-4,'GPU rubble follows settled physics');await page.locator('#viewport').scrollIntoViewIfNeeded();await page.locator('#viewport').screenshot({path:'/tmp/building147-settled-'+scene+'-'+(mobile?'phone':'desktop')+'.png'});
  await page.locator('#reset').click();const reset=await page.evaluate(()=>collapseQA.sample());assert(!reset.released&&reset.falling===0&&reset.intact===reset.total&&reset.top===before.top);assert.deepEqual(errors,[]);console.log('PASS',mobile?'phone':'desktop',scene,JSON.stringify({before,reset,synced}));await page.close();
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
