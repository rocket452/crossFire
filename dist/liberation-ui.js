import * as THREE from './vendor/three.module.js';

export class LiberationUI {
 constructor(viewer,scene,{release,resume,restart}){
  Object.assign(this,{viewer,release,resume,restart});
  this.hud=document.createElement('div');this.hud.className='liberation-hud';
  this.hud.innerHTML='<b></b><span></span><meter aria-label="Hero health" min="0"></meter>';
  viewer.append(this.hud);
  const geometry=new THREE.RingGeometry(.965,1,48);
  this.rings=Array.from({length:12},()=>{
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,toneMapped:false}));
   mesh.rotation.x=-Math.PI/2;scene.add(mesh);return mesh;
  });
  this.reset();
 }
 reset(){
  this.dialog?.remove();this.dialog=null;this.hud.hidden=true;this.ringIndex=0;
  for(const mesh of this.rings)mesh.visible=false;
 }
 ring(point,radius,color){
  const mesh=this.rings[this.ringIndex++%this.rings.length];
  mesh.position.copy(point);mesh.position.y+=.22;mesh.material.color.set(color);
  mesh.userData={radius,age:0};mesh.visible=true;this.animateRing(mesh);
 }
 animateRing(mesh){
  const fraction=mesh.userData.age/.4;
  mesh.scale.setScalar(mesh.userData.radius*(.18+.82*fraction));mesh.material.opacity=.85*(1-fraction);
  if(fraction>=1)mesh.visible=false;
 }
 step(dt){for(const mesh of this.rings)if(mesh.visible){mesh.userData.age+=dt;this.animateRing(mesh);}}
 panel(title,subtitle){
  if(!this.dialog){
   this.release();this.dialog=document.createElement('dialog');
   this.dialog.className='evac-briefing liberation-panel';this.dialog.setAttribute('aria-labelledby','liberation-title');
   this.dialog.addEventListener('cancel',e=>e.preventDefault());this.viewer.append(this.dialog);
  }
  this.dialog.innerHTML='<div class="evac-briefing-inner"><h2 id="liberation-title"></h2><p></p><div class="liberation-cards"></div><footer></footer></div>';
  this.dialog.querySelector('h2').textContent=title;this.dialog.querySelector('p').textContent=subtitle;
 }
 button(parent,title,action){
  const button=document.createElement('button');button.type='button';button.textContent=title;
  button.onclick=action;parent.append(button);return button;
 }
 sync(run){
  const b=run.build;
  this.hud.hidden=false;
  const countdown=Math.max(0,Math.ceil(run.district.seconds-run.stageTime));
  const objective=run.phase==='cleared'?'Bastion defeated':run.phase==='boss'?'Defeat '+run.district.boss:run.district.boss+' in '+Math.floor(countdown/60)+':'+String(countdown%60).padStart(2,'0');
  const title='District '+(run.stage+1)+' / 2 · '+objective;
  const status=Math.ceil(b.hp)+' HP · Lv '+b.level+' · '+Math.floor(b.xp)+'/'+b.threshold+' XP · '+b.credits+' credits';
  if(this.hud.firstChild.textContent!==title)this.hud.firstChild.textContent=title;
  if(this.hud.children[1].textContent!==status)this.hud.children[1].textContent=status;
  const meter=this.hud.lastChild;if(meter.max!==b.maxHP)meter.max=b.maxHP;if(meter.value!==b.hp)meter.value=b.hp;
  const boss=document.querySelector('.boss-health-hud');
  boss.hidden=run.phase!=='boss'||run.stage===1&&!run.options.bastionActive();
  if(!boss.hidden&&run.stage===0)boss.querySelector('b').textContent='SIEGE WALKER · WEAPONS';
  if(run.ended){
   if(this.dialog?.dataset.result)return;
   this.panel(run.phase==='won'?'City liberated':'Hero down',
    b.kills+' robots defeated · Level '+b.level+' · '+b.credits+' credits · '+Math.floor(run.elapsed/60)+'m '+Math.floor(run.elapsed%60)+'s');
   this.dialog.dataset.result='true';
   if(run.phase==='won')this.dialog.querySelector('p').append(' · Earned 12 starting credits for your next run.');
   this.dialog.querySelector('.liberation-cards').textContent=[...b.ranks.values()].map(e=>e.upgrade.name+' ×'+e.rank).join(' · ');
   this.button(this.dialog.querySelector('footer'),'New run',this.restart);
  }else if(run.upgradePending){
   const cards=b.draft();if(!cards.length)return this.sync(run);
   if(this.dialog?.dataset.revision===String(b.revision))return;
   this.panel(b.rewards[0]==='boss'?'Siege Walker defeated':'Level '+b.level+' upgrade',
    (b.rewards[0]==='boss'?'Awarded 35 credits and up to 35 HP. ':'')+'Choose one upgrade. Combat is paused. '+Math.ceil(b.hp)+'/'+b.maxHP+' HP · '+b.credits+' credits.');
   this.dialog.dataset.revision=b.revision;
   for(const u of cards){
    const btn=this.button(this.dialog.querySelector('.liberation-cards'),'',()=>{
     if(b.choose(u.id)){this.ring(run.hero.root.position,4,'#8dffe9');this.sync(run);}
    });
    btn.dataset.rarity=u.rarity;
    const rank=(b.ranks.get(u.id)?.rank||0)+1;
    for(const [tag,value] of [['small',u.rarity+' · Rank '+rank+'/'+u.max],['strong',u.name],['span',u.detail]]){
     const el=document.createElement(tag);el.textContent=value;btn.append(el);
    }
   }
   const footer=this.dialog.querySelector('footer');
   for(const [action,label,disabled] of [['reroll','Reroll · 8 credits',b.credits<8],['repair','Heal 30 HP · 12 credits',b.credits<12||b.hp>=b.maxHP]]){
    this.button(footer,label,()=>{if(b.spend(action))this.sync(run);}).disabled=disabled;
   }
  }else{
   if(this.dialog){this.dialog.remove();this.dialog=null;this.resume();}
   return;
  }
  if(!this.dialog.open)this.dialog.showModal();
 }
}
