const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright-core'),fs=require('fs'),assert=require('assert/strict');
const hook=`window.__qaStopRender=true;paused=true;
window.roninQA=(pose='ready')=>{
 const r=testingArena.ronin;r.model.reset();r.root.position.set(0,.1,0);r.root.rotation.set(0,0,0);
 const e={config:r.config,moving:pose==='walk',swordState:pose.includes('sweep')||pose.includes('overhead'),overhead:pose.includes('overhead'),swordAge:0};
 const end=pose.includes('wind')?.94:pose.includes('strike')?1.14:1;
 for(let i=0;i<=Math.ceil(end*60);i++){e.swordAge=i/60;if(e.moving)r.root.position.z+=8/60;r.model.animate(1/60,i/60,e);}
 if(pose==='defeat'){r.destroy();r.update(.8,1);}
 r.sync();camera.position.set(21,16,28);camera.lookAt(0,7.5,0);renderer.render(scene,camera);
 return{...r.diagnostics(),trail:r.model.animation.ribbon.visible,shapes:r.combatUnit.shapes.length};
};`;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const mobile of[false,true]){
  const p=await browser.newPage({viewport:mobile?{width:430,height:932}:{width:1400,height:1000},isMobile:mobile,hasTouch:mobile});p.setDefaultTimeout(90000);const errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.route('**/battle.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('dist/battle.js','utf8').replace('requestAnimationFrame(animate);const elapsed=','requestAnimationFrame(animate);if(window.__qaStopRender)return;const elapsed=')+hook}));
  await p.goto('http://127.0.0.1:8765/?scene=testing&enemy=ronin');await p.waitForFunction(()=>window.battleDiagnostics?.().loaded);await p.locator('#test-spawn').click();
  for(const pose of ['ready','walk','sweep-wind','sweep-strike','overhead-wind','overhead-strike','defeat']){
   const d=await p.evaluate(pose=>roninQA(pose),pose);assert.equal(d.name,'Astra Ronin');if(pose!=='defeat'){assert(d.alive);assert(d.shapes>=10);}else assert(!d.alive&&d.shapes===0);if(pose.endsWith('strike'))assert(d.trail);
   await p.locator('#viewport').screenshot({path:'/tmp/ronin-295-'+mobile+'-'+pose+'.png'});
  }
  await p.locator('#test-spawn').click();assert((await p.evaluate(()=>roninQA())).alive);assert.deepEqual(errors,[]);console.log('PASS',mobile?'touch':'desktop','selection, rigged poses, blade trail, defeat/rebuild and no browser errors');await p.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
