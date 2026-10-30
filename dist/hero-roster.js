export const HEROES=Object.freeze([
 {id:'mochi',name:'Mochi Pink',element:'JOY / DECORA',role:'Bubble defense & daze',detail:'Sakura “Koko” Tanaka skates on glittering light, shields allies with neon bubbles, and dazes robots with her wand.',control:'CPU defender',color:'#ff99d5',icon:'♥'},
 {id:'volt',name:'Volt Rush',element:'LIGHTNING',role:'Speed & rescue',detail:'Run to charge lightning, interrupt robot attacks with Overload, and dash allies out of danger.',control:'Player or CPU',color:'#81e8f5',icon:'ϟ'},
 {id:'violet',name:'Violet Sentinel',element:'FORCE',role:'Air defense',detail:'Absorb hits with a force shield to power a stationary sustained beam. Also fires purple orbs.',control:'CPU defender',color:'#bc8bf5',icon:'◈'},
 {id:'solara',name:'Solara Frost',element:'FIRE / ICE',role:'Missile / plasma defense',detail:'Track incoming missiles with fireballs, ride an ice path and raise protective domes over allies.',control:'CPU defender',color:'#9bdfff',icon:'✦'},
 {id:'rift',name:'Rift Warden',element:'PORTALS',role:'Evacuation & barrage',detail:'Personal teleport, up to three autonomous firing portals, and a large transport pair for allies and projectiles.',control:'CPU defender',color:'#a6e8bf',icon:'◎'}
]);
export const DEFAULT_HEROES=Object.freeze(['volt','violet','rift']);
export function validRoster(ids){return Array.isArray(ids)&&ids.length<=3&&new Set(ids).size===ids.length&&ids.every(id=>HEROES.some(h=>h.id===id));}
export class HeroRoster {
 constructor({storage,onApply=()=>{},onOpen=()=>{},onClose=()=>{}}={}){if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}this.storage=storage;this.onApply=onApply;this.onOpen=onOpen;this.onClose=onClose;this.active=[...DEFAULT_HEROES];try{const saved=JSON.parse(storage?.getItem('crossfire-hero-roster-v2')||'null');if(validRoster(saved))this.active=[...saved];}catch{}this.draft=[...this.active];}
 has(id){return this.active.includes(id);}
 apply(ids){if(!validRoster(ids))return false;this.active=[...ids];try{this.storage?.setItem('crossfire-hero-roster-v2',JSON.stringify(this.active));}catch{}this.onApply(this.active);return true;}
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
