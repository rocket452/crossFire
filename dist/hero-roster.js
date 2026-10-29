export const HEROES=Object.freeze([
 {id:'volt',name:'Volt Rush',element:'LIGHTNING',role:'Speed & rescue',detail:'Run up buildings, fire charged lightning and dash allies out of danger.',control:'Player or CPU',color:'#81e8f5',icon:'ϟ'},
 {id:'violet',name:'Violet Sentinel',element:'FORCE',role:'Air defense',detail:'Fly into the beam’s path, raise a force shield and launch charged purple orbs.',control:'CPU defender',color:'#bc8bf5',icon:'◈'},
 {id:'solara',name:'Solara Frost',element:'FIRE / ICE',role:'Plasma defense',detail:'Ride a growing ice path, throw fireballs and grow protective ice domes over allies.',control:'CPU defender',color:'#9bdfff',icon:'✦'},
 {id:'rift',name:'Rift Warden',element:'PORTALS',role:'Evacuation & barrage',detail:'Teleport threatened allies to safety and fire sparkling projectiles from portals.',control:'CPU defender',color:'#a6e8bf',icon:'◎'}
]);
export const DEFAULT_HEROES=Object.freeze(['volt','violet','solara']);
export function validRoster(ids){return Array.isArray(ids)&&ids.length===3&&new Set(ids).size===3&&ids.every(id=>HEROES.some(h=>h.id===id));}
export class HeroRoster {
 constructor({storage,onApply=()=>{},onOpen=()=>{},onClose=()=>{}}={}){if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}this.storage=storage;this.onApply=onApply;this.onOpen=onOpen;this.onClose=onClose;this.active=[...DEFAULT_HEROES];try{const saved=JSON.parse(storage?.getItem('crossfire-hero-roster-v1')||'null');if(validRoster(saved))this.active=[...saved];}catch{}this.draft=[...this.active];}
 has(id){return this.active.includes(id);}
 apply(ids){if(!validRoster(ids))return false;this.active=[...ids];try{this.storage?.setItem('crossfire-hero-roster-v1',JSON.stringify(this.active));}catch{}this.onApply(this.active);return true;}
 bind(){
  const dialog=document.getElementById('hero-select');this.dialog=dialog;const cards=document.getElementById('hero-cards');
  cards.innerHTML=HEROES.map(h=>`<button type="button" class="hero-card" data-select-hero="${h.id}" aria-pressed="false" style="--hero-accent:${h.color}"><span class="hero-card-art ${h.id}" aria-hidden="true"><span class="hero-portrait"><i></i><b>${h.icon}</b></span><em>${h.icon}</em></span><span class="hero-card-meta">${h.element}<span class="hero-check">✓</span></span><strong>${h.name}</strong><span class="hero-card-role">${h.role}</span><span class="hero-card-detail">${h.detail}</span><span class="hero-card-control">${h.control}</span></button>`).join('');
  this.refresh=()=>{for(const button of cards.querySelectorAll('[data-select-hero]')){const selected=this.draft.includes(button.dataset.selectHero);button.setAttribute('aria-pressed',String(selected));button.classList.toggle('chosen',selected);button.disabled=!selected&&this.draft.length>=3;}document.getElementById('hero-selection-count').textContent=this.draft.length+' / 3 SELECTED';document.getElementById('deploy-heroes').disabled=!validRoster(this.draft);};
  for(const button of cards.querySelectorAll('[data-select-hero]'))button.onclick=()=>{const id=button.dataset.selectHero;this.draft=this.draft.includes(id)?this.draft.filter(x=>x!==id):[...this.draft,id];this.refresh();};
  document.getElementById('choose-heroes').onclick=()=>{this.draft=[...this.active];this.refresh();this.onOpen();dialog.showModal();};
  document.getElementById('close-hero-select').onclick=()=>dialog.close();dialog.addEventListener('close',()=>this.onClose());
  document.getElementById('default-heroes').onclick=()=>{this.draft=[...DEFAULT_HEROES];this.refresh();};document.getElementById('deploy-heroes').onclick=()=>{if(this.apply(this.draft))dialog.close();};this.refresh();
 }
 diagnostics(){return{active:[...this.active],default:[...DEFAULT_HEROES]};}
}
