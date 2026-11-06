const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright-core');
const fs=require('fs'),assert=require('assert/strict');
const hook=`window.__qaStopRender=true;window.gapQA={
 adapter(){return testingArena?.bastion||evacuationReinforcement.adapter;},
 start(point,seed=7){const a=this.adapter();if(!a.enabled)a.reset(true);runner.motion.reset({x:point.x,y:.08,z:point.z});runner.root.position.copy(runner.motion.position);const b=a.boss;b.state.reset(seed);b.player=a.player();b.state.patterns=['beam-wall'];b.state.enter('barrage');b.beamWalls.begin();return this.snapshot();},
 snapshot(){const b=this.adapter().boss,f=b.beamWalls,c=f.config;return{...f.diagnostics(),controlled:b.player?.entity===runner,heroBounds:{...runner.motion.bounds},hits:b.state.hitsTaken,edges:f.waves.flatMap(w=>[-1,1].map(side=>f.field.localToWorld(new THREE.Vector3(w.gap+side*c.gapWidth/2,.08,0)).toArray()))};},
 layouts(){const b=runner.motion.bounds,cases=[];for(const x of[b.minX,(b.minX+b.maxX)/2,b.maxX])for(const z of[b.minZ,(b.minZ+b.maxZ)/2,b.maxZ])for(const seed of[1,7,11,31,99])cases.push(this.start({x,z},seed));return cases;},
 step(seconds){const f=this.adapter().boss.beamWalls;for(let t=0;t<seconds-1e-8;t+=1/120)f.update(Math.min(1/120,seconds-t));return this.snapshot();},
 crossings(){const b=this.adapter().boss,f=b.beamWalls;b.state.hitsTaken=0;for(const w of f.waves)w.active=false;for(const w of f.waves){w.active=true;w.hit=false;w.previousZ=w.z=0;const p=z=>f.field.localToWorld(new THREE.Vector3(w.gap,.08,z));f.checkPlayer({position:p(-3)},p(3));w.active=false;}return b.state.hitsTaken;},
 render(){const f=this.adapter().boss.beamWalls;if(innerWidth<700){const w=f.waves[1],target=f.field.localToWorld(new THREE.Vector3(w.gap,24,w.z)),offset=new THREE.Vector3(30,32,55).applyAxisAngle(new THREE.Vector3(0,1,0),f.yaw);camera.position.copy(target).add(offset);camera.lookAt(target);}else{const center=f.field.position;camera.position.copy(center).add(new THREE.Vector3(190,190,260));camera.lookAt(center.clone().add(new THREE.Vector3(0,15,0)));}renderer.render(scene,camera);},
 reset(){this.adapter().boss.reset();return this.snapshot();}
};`;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const mobile of[false,true])for(const scene of['testing&enemy=bastion','evacuation']){
   const p=await browser.newPage({viewport:mobile?{width:430,height:932}:{width:1400,height:1000},isMobile:mobile,hasTouch:mobile});p.setDefaultTimeout(120000);
   const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>localStorage.setItem('crossfire-hero-roster-v2',JSON.stringify(['volt'])));
   await p.route('**/battle.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('dist/battle.js','utf8').replace('requestAnimationFrame(animate);const elapsed=','requestAnimationFrame(animate);if(window.__qaStopRender)return;const elapsed=')+hook}));
   await p.goto('http://127.0.0.1:8765/?scene='+scene);await p.waitForFunction(()=>window.battleDiagnostics?.().loaded);
   if(scene.startsWith('testing'))await p.selectOption('#test-hero','volt');
   await p.locator('#play-runner')[mobile?'tap':'click']();
   const cases=await p.evaluate(()=>gapQA.layouts());
   for(const s of cases){
    assert(s.running&&s.controlled);assert.deepEqual(s.arenaBounds,s.heroBounds,'live map bounds reach the boss');
    const b=s.heroBounds;assert.deepEqual(s.origin,[(b.minX+b.maxX)/2,0,(b.minZ+b.maxZ)/2]);
    for(const [x,,z]of s.edges)assert(x>=b.minX+.7-1e-7&&x<=b.maxX-.7+1e-7&&z>=b.minZ+.7-1e-7&&z<=b.maxZ-.7+1e-7,JSON.stringify({scene,edge:[x,z],bounds:b}));
    for(let i=1;i<s.waves.length;i++)assert(Math.abs(Math.abs(s.waves[i].gap-s.waves[i-1].gap)-60)<1e-7);
   }
   const bounds=cases[0].heroBounds;await p.evaluate(b=>gapQA.start({x:b.maxX-1,z:b.minZ+1}),bounds);
   let s=await p.evaluate(()=>gapQA.step(8));assert.equal(s.waves.filter(w=>w.active).length,3);
   await p.evaluate(()=>gapQA.render());await p.locator('#viewport').screenshot({path:'/tmp/map-gaps239-'+(scene.startsWith('testing')?'arena':'evac')+'-'+mobile+'.png'});
   assert.equal(await p.evaluate(()=>gapQA.crossings()),0,'world-space gap centers protect the player');
   s=await p.evaluate(()=>gapQA.step(10));assert(!s.running&&s.waves.every(w=>!w.active));
   await p.evaluate(b=>gapQA.start({x:b.minX,z:b.maxZ}),bounds);s=await p.evaluate(()=>gapQA.reset());assert(!s.running);
   await p.evaluate(()=>document.exitPointerLock?.());await p.waitForFunction(()=>!document.pointerLockElement);
   await p.locator('#reset').click();assert.deepEqual(errors,[]);
   console.log('PASS',mobile?'touch':'desktop',scene,cases.length,'live edge/corner/seed layouts, full-width playable gaps, 60m shifts, safe crossings, all three visible waves, cleanup/rebuild');await p.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
