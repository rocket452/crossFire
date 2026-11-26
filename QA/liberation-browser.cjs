const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:850,height:600}}),errors=[];
  page.setDefaultTimeout(65000);page.on('pageerror',e=>errors.push(e.message));
  // Expose the existing simulation only inside this test to skip travel and earn fixture credits.
  await page.route('**/battle.js*',async route=>{
   const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nwindow.liberationTest=()=>missionRaiders;'});
  });
  await page.goto((process.env.GAME_URL||'http://localhost:8234/')+'?scene=city-liberation');
  await page.locator('dialog[open] [data-next]').click();
  for(const id of ['volt','ninja','lux']){
   await page.locator('[data-hero="'+id+'"]').click();await page.locator('[data-start]').click();
   await page.waitForFunction(()=>window.liberationTest?.()?.elapsed>.15);
   assert.equal(await page.evaluate(()=>liberationTest().build.hero),id);
   await page.keyboard.press('i');await page.waitForSelector('.liberation-panel[open]');
   const clock=await page.evaluate(()=>liberationTest().elapsed);
   await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>liberationTest().elapsed),clock);
   await page.keyboard.press('Escape');
   await page.evaluate(()=>{const r=liberationTest();r.hero.root.position.set(0,.12,0);r.build.credits=180;r.options.ui.sync(r);r.options.ui.open('shop');});
   assert.equal(await page.locator('.liberation-cards button').count(),5);
   await page.locator('.liberation-cards button').first().click();assert(await page.locator('.liberation-cards button').first().isDisabled());
   await page.getByRole('button',{name:'Refresh · 10 credits'}).click();await page.getByRole('button',{name:'Resume combat'}).click();
   await page.evaluate(()=>{const r=liberationTest();r.build.rewards.push('level');r.options.ui.sync(r);});
   assert.equal(await page.locator('.liberation-cards button').count(),3);
   await page.locator('.liberation-cards button').first().click();
   await page.waitForFunction(()=>!liberationTest().upgradePending);
   console.log(id+' selected, paused, bought an item, refreshed, evolved and resumed');
   if(id!=='lux')await page.evaluate(()=>document.getElementById('reset').click());
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
