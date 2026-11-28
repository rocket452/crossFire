import * as THREE from './vendor/three.module.js';

import {cloneSkinned} from './humanoid-character.js?v=435';
const BANNER_SECONDS=3.2;
export class LiberationUI {
 constructor(viewer,scene,{release,resume,restart}){
  Object.assign(this,{viewer,scene,release,resume,restart});
  this.hud=document.createElement('div');this.hud.className='liberation-hud';
  this.hud.innerHTML='<b></b><span></span><meter aria-label="Hero health" min="0"></meter>';
  viewer.append(this.hud);
  // Stage beats (elite, power-up, surge, mini-boss) are called out in a short centre-screen banner.
  this.banner=document.createElement('div');this.banner.className='liberation-banner';this.banner.hidden=true;
  this.banner.setAttribute('role','status');this.banner.innerHTML='<strong></strong><span></span>';viewer.append(this.banner);this.bannerLife=0;
  const geometry=new THREE.RingGeometry(.965,1,48);
  this.rings=Array.from({length:12},()=>{
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,toneMapped:false}));
   mesh.rotation.x=-Math.PI/2;scene.add(mesh);return mesh;
  });
  this.lines=Array.from({length:96},()=>{
   const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3));
   const line=new THREE.Line(geo,new THREE.LineBasicMaterial({transparent:true,toneMapped:false}));line.frustumCulled=false;scene.add(line);return line;
  });this.lineIndex=0;
  this.entities=Array.from({length:32},()=>{
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide,toneMapped:false}));
   const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.65,1),mesh.material);mesh.add(core);scene.add(mesh);return mesh;
  });
  this.depot=new THREE.Group();scene.add(this.depot);
  const part=(geometry,color,x,y,z,emissive=false)=>{
   const mat=emissive?new THREE.MeshBasicMaterial({color,toneMapped:false}):new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.36});
   const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);this.depot.add(mesh);return mesh;
  };
  part(new THREE.CylinderGeometry(4,4.4,.32,8),0x182e43,0,.18,0);
  for(const x of [-3,3]){
   part(new THREE.BoxGeometry(.55,4,2),0x1c3a52,x,2,0);
   part(new THREE.BoxGeometry(.14,3,.14),0x55ffd6,x,2,1.04,true);
  }
  part(new THREE.CylinderGeometry(4,4,.42,8),0x283e52,0,4.15,0);
  part(new THREE.OctahedronGeometry(1.1),0x6bffcb,0,6,0,true);
  const beam=part(new THREE.CylinderGeometry(.24,.48,100,12),0x5affdb,0,54,0,true);
  beam.material.transparent=true;beam.material.opacity=.42;beam.material.depthWrite=false;
  this.access=document.createElement('div');this.access.className='liberation-access';viewer.append(this.access);
  this.shopButton=this.button(this.access,'Supply depot',()=>this.open('shop'));
  this.button(this.access,'Inventory · I',()=>this.open('inventory'));
  window.addEventListener('keydown',e=>{
   if(!this.run||e.repeat||!['KeyB','KeyI','Escape'].includes(e.code))return;
   if(this.run.menu){e.preventDefault();e.stopImmediatePropagation();this.close();return;}
   if(e.code!=='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();this.open(e.code==='KeyB'?'shop':'inventory');}
  },true);
  this.reset();
 }
 ghost(from,to,color,life=.45){
  const model=this.run?.hero.character?.body;if(!model)return;
  if(!this.ghostMesh){
   this.ghostMesh=cloneSkinned(model);this.ghostMaterial=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.56,depthWrite:false});
   this.ghostMesh.traverse(o=>{if(o.isMesh){o.material=this.ghostMaterial;o.castShadow=false;}});
   this.scene.add(this.ghostMesh);
  }
  const h=this.run.hero;
  this.ghostMesh.visible=true;this.ghostMaterial.color.set(color);
  this.ghostMesh.quaternion.copy(h.root.quaternion);this.ghostMesh.position.copy(from);
  this.ghostMotion={from:new THREE.Vector3().copy(from),to:new THREE.Vector3().copy(to),age:0,life};
 }
 bind(run){this.run=run;this.depot.visible=true;this.access.hidden=false;}
 open(menu){
  const r=this.run;if(!r||r.ended||r.upgradePending||menu==='shop'&&r.hero.root.position.distanceTo(this.depot.position)>10)return;
  r.menu=menu;this.sync(r);
 }
 close(){if(this.run?.menu){this.run.menu=null;this.sync(this.run);}}
 arc(a,b,color='#8ceeff'){
  const line=this.lines[this.lineIndex++%this.lines.length],v=line.geometry.attributes.position;
  v.setXYZ(0,a.x,a.y,a.z);v.setXYZ(1,b.x,b.y,b.z);v.needsUpdate=true;
  line.material.color.set(color);line.material.opacity=1;line.userData.life=.18;line.visible=true;
 }
 reset(){
  if(this.ghostMesh){this.scene.remove(this.ghostMesh);this.ghostMesh.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});this.ghostMaterial.dispose();this.ghostMesh=null;this.ghostMotion=null;}
  this.run=null;this.access.hidden=true;this.depot.visible=false;for(const obj of [...this.entities,...this.lines])obj.visible=false;
  this.dialog?.remove();this.dialog=null;this.hud.hidden=true;this.ringIndex=0;this.banner.hidden=true;this.bannerLife=0;
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
 announce(title,subtitle=''){
  this.banner.firstChild.textContent=title;this.banner.lastChild.textContent=subtitle;
  this.banner.hidden=false;this.bannerLife=BANNER_SECONDS;this.banner.style.opacity=1;
 }
 step(dt){
  if(this.bannerLife>0){this.bannerLife-=dt;this.banner.style.opacity=Math.min(1,this.bannerLife/.6);if(this.bannerLife<=0)this.banner.hidden=true;}
  const ghost=this.ghostMotion;
  if(ghost){ghost.age+=dt;const t=Math.min(1,ghost.age/ghost.life);this.ghostMesh.position.lerpVectors(ghost.from,ghost.to,t);this.ghostMaterial.opacity=.55*(1-t);
   if(t>=1){this.ghostMesh.visible=false;this.ghostMotion=null;}}
  for(const l of this.lines)if(l.visible){l.userData.life-=dt;l.visible=l.userData.life>0;l.material.opacity=Math.max(0,l.userData.life/.18);}
  const c=this.run?.combat;
  if(c){
   const entities=[...c.satellites.map(o=>[o.position,1.8,'#7eeaff']),...c.fields.filter(f=>f.type==='sun'||f.type==='crosscut').map(f=>[f.p,f.type==='sun'?1.25:1.8,f.color])];
   for(let i=0;i<this.entities.length;i++){
    const m=this.entities[i],e=entities[i];m.visible=!!e;if(e){m.position.copy(e[0]);m.scale.setScalar(e[1]);m.material.color.set(e[2]);m.rotation.y+=dt*2;m.rotation.z+=dt;}
   }
  }
  for(const mesh of this.rings)if(mesh.visible){mesh.userData.age+=dt;this.animateRing(mesh);}}
 panel(title,subtitle){
  if(!this.dialog){
   this.release();this.dialog=document.createElement('dialog');
   this.dialog.className='evac-briefing liberation-panel';this.dialog.setAttribute('aria-labelledby','liberation-title');
   this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.viewer.append(this.dialog);
  }
  this.dialog.innerHTML='<div class="evac-briefing-inner"><h2 id="liberation-title"></h2><p></p><div class="liberation-cards"></div><footer></footer></div>';
  this.dialog.querySelector('h2').textContent=title;this.dialog.querySelector('p').textContent=subtitle;
 }
 button(parent,title,action){
  const button=document.createElement('button');button.type='button';button.textContent=title;
  button.onclick=action;parent.append(button);return button;
 }
 card(btn,title,label,detail,tags){
  for(const [tag,value] of [['small',label],['strong',title],['span',detail],['small',tags.join(' · ')]]){
   const el=document.createElement(tag);el.textContent=value;btn.append(el);
  }
 }
 sync(run){
  const b=run.build;
  this.hud.hidden=false;
  const objective=run.objective();
  const title='District '+(run.stage+1)+' / 2 · '+objective;
  const status=Math.ceil(b.hp)+' HP'+(b.shield?' +'+Math.ceil(b.shield)+' shield':'')+' · Lv '+b.level+' · '+Math.floor(b.xp)+'/'+b.threshold+' XP · '+b.credits+' credits';
  if(this.hud.firstChild.textContent!==title)this.hud.firstChild.textContent=title;
  if(this.hud.children[1].textContent!==status)this.hud.children[1].textContent=status;
  const meter=this.hud.lastChild;if(meter.max!==b.maxHP)meter.max=b.maxHP;if(meter.value!==b.hp)meter.value=b.hp;
  const boss=document.querySelector('.boss-health-hud');
  boss.hidden=!run.miniBossActive&&(run.phase!=='boss'||run.stage===1&&!run.options.bastionActive());
  const label=run.miniBossActive?'ASTRA RONIN · MINI-BOSS':run.stage===0?'SIEGE WALKER · WEAPONS':null;
  if(!boss.hidden&&label&&boss.querySelector('b').textContent!==label)boss.querySelector('b').textContent=label;
  const distance=Math.round(run.hero.root.position.distanceTo(this.depot.position));
  this.shopButton.textContent=distance<=10?'Open supply depot · B':'◆ Depot · '+distance+' m';
  this.shopButton.disabled=distance>10;this.access.hidden=run.ended;
  if(run.ended){
   if(this.dialog?.dataset.result)return;
   this.panel(run.phase==='won'?'City liberated':'Hero down',
    b.kills+' robots defeated · Level '+b.level+' · '+b.credits+' credits · '+Math.floor(run.elapsed/60)+'m '+Math.floor(run.elapsed%60)+'s');
   this.dialog.dataset.result='true';

   this.dialog.querySelector('.liberation-cards').textContent=[...b.ranks.values()].map(e=>e.upgrade.name+' ×'+e.rank).join(' · ');
   this.button(this.dialog.querySelector('footer'),'New run',this.restart);
  }else if(run.menu){
   const shop=run.menu==='shop';
   this.panel(shop?'Supply depot':'Run inventory',b.credits+' credits · District '+(run.stage+1));
   const list=this.dialog.querySelector('.liberation-cards'),footer=this.dialog.querySelector('footer');
   if(shop){
    const ownedTags=new Set([...b.ranks.values()].flatMap(row=>row.upgrade.tags));
    for(const {card,sold} of b.stock){
     const rank=b.ranks.get(card.id)?.rank||0;
     const btn=this.button(list,'',()=>{if(b.buy(card.id))this.sync(run);});
     btn.disabled=sold||b.credits<card.price;btn.dataset.rarity=card.rarity;
     this.card(btn,card.icon+' '+card.name,sold?'Sold out':card.price+' credits · '+card.rarity,
      'Owned ×'+rank+' → '+card.describe(card.value(rank+1)),card.tags.map(t=>ownedTags.has(t)?'◆ '+t:t));
    }
    this.button(footer,'Refresh · '+b.refreshPrice+' credits',()=>{if(b.refresh())this.sync(run);}).disabled=b.credits<b.refreshPrice;
   }
   const inventory=document.createElement('section');inventory.className='liberation-inventory';list.after(inventory);
   for(const {upgrade,rank} of b.ranks.values()){
    const row=document.createElement('div');row.textContent=upgrade.name+(upgrade.value?' ×'+rank:'')+' · '+(upgrade.detail||upgrade.describe(upgrade.value(rank)));inventory.append(row);
   }
   if(!inventory.childElementCount)inventory.textContent='Your inventory is empty.';
   this.button(footer,'Resume combat',()=>this.close());
  }else if(run.upgradePending){
   const cards=b.draft();if(!cards.length)return this.sync(run);
   if(this.dialog?.dataset.revision===String(b.revision))return;
   const note=b.rewards[0]==='level'?b.headline:null;
   this.panel(b.rewards[0]==='boss'?'District liberated':note?note.title+' · Level '+b.level:'Level '+b.level,
    b.rewards[0]==='boss'?'Choose a relic. Earned 60 credits. The depot has new stock.':note?note.detail:'Choose an ability evolution for this run.');
   this.dialog.dataset.revision=b.revision;
   for(const u of cards){
    const btn=this.button(this.dialog.querySelector('.liberation-cards'),'',()=>{if(b.choose(u.id)){this.ring(run.hero.root.position,4,'#8dffe9');this.sync(run);}});
    this.card(btn,u.name,u.rarity,u.detail,u.tags);
   }
  }else{
   if(this.dialog){this.dialog.remove();this.dialog=null;this.resume();}
   return;
  }
  if(!this.dialog.open)this.dialog.showModal();
 }
}
