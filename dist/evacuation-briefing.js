import {HEROES} from './hero-roster.js?v=evac-briefing-319';

const training={
 volt:{
  tip:'Run to build charge. Hold the rescue dash through a civilian group and release in a clear spot closer to the Chinook.',
  controls:[
   ['Move and aim','WASD · Mouse','Left stick · Drag the scene'],
   ['Boost / jump','Shift / Space','Boost / Jump'],
   ['Lightning','Hold left click or F','Hold Fire'],
   ['Rescue dash','Hold E','Hold Dash'],
   ['Weld / robot stun','Hold R / Q','Hold Weld / Stun'],
   ['Sky Strike / Ball Lightning','Z / V','Sky Strike / Ball Lightning'],
   ['Critical Mass','Hold and release right click','Hold and release Mass']
  ],
  bonus:'Release Critical Mass before 2.6 seconds to avoid overloading. Attack while stopped, then get moving again to recharge.'
 },
 ninja:{
  tip:'Throw smoke at civilians crossing open streets or waiting at the pad. Allies inside the dome are protected from damage.',
  controls:[
   ['Move and aim','WASD · Mouse','Left stick · Drag the scene'],
   ['Jump again in air or near a wall','Space','Jump'],
   ['Store and throw kunai','Hold and release left click or F','Hold and release Kunai'],
   ['Charge and throw shuriken','Hold and release right click or G','Hold and release Shuriken'],
   ['Teleport to a fully charged star','Q','Teleport'],
   ['Dash / sword slash','Shift / R','Dash / Slash'],
   ['Explosive bomb / protective smoke','C / V','Bomb / Smoke']
  ],
  bonus:'Dash toward the reticle. A dash that destroys an enemy or missile resets the cooldown.'
 }
};

export function evacuationTeam(lead,current){
 const allies=current.filter(id=>id!==lead);
 allies.sort((a,b)=>Number(Boolean(training[a]))-Number(Boolean(training[b])));
 return [lead,...allies].slice(0,3);
}

export class EvacuationBriefing {
 constructor({inputMode,onStart}){
  this.inputMode=inputMode;
  this.onStart=onStart;
  this.pending=true;
  this.dialog=document.createElement('dialog');
  this.dialog.className='evac-briefing';
  this.dialog.setAttribute('aria-labelledby','evac-briefing-title');
  this.dialog.addEventListener('cancel',event=>{
   event.preventDefault();
   if(this.step==='tutorial')this.show('choose');
   else if(this.step==='choose')this.show('objective');
  });
  this.unsubscribe=inputMode.subscribe(()=>{
   if(this.step==='tutorial'&&this.pending)this.updateControls();
  });
  document.body.append(this.dialog);
 }
 open(){
  this.show('objective');
  this.dialog.showModal();
  this.dialog.querySelector('[data-next]').focus();
 }
 show(step){
  this.step=step;
  const title={
   objective:'Civilian Evacuation',
   choose:'Choose your hero',
   tutorial:HEROES.find(hero=>hero.id===this.hero)?.name
  }[step];
  this.dialog.innerHTML=`<div class="evac-briefing-inner">
   <header>${step==='choose'?'':`<p class="evac-briefing-stage">${step==='objective'?'Mission briefing':'How to play'}</p>`}
   <h2 id="evac-briefing-title" tabindex="-1">${title}</h2></header>
   ${step==='objective'?this.objective():step==='choose'?this.choices():this.tutorial()}
  </div>`;
  const back=this.dialog.querySelector('[data-back]');
  if(back)back.onclick=()=>this.show(step==='tutorial'?'choose':'objective');
  const next=this.dialog.querySelector('[data-next]');
  if(next)next.onclick=()=>this.show('choose');
  for(const card of this.dialog.querySelectorAll('[data-hero]'))card.onclick=()=>{
   this.hero=card.dataset.hero;
   this.show('tutorial');
  };
  const start=this.dialog.querySelector('[data-start]');
  if(start)start.onclick=()=>{
   if(!this.pending)return;
   this.pending=false;
   this.dialog.close();
   this.unsubscribe();
   this.onStart(this.hero);
   this.dialog.remove();
  };
  this.dialog.querySelector('h2').focus();
 }
 objective(){
  return `<p class="evac-briefing-lead">Get civilians from the subway entrance to the evacuation Chinook.</p>
   <ul class="evac-objectives"><li>Protect each group as it crosses the exposed street and boards.</li>
   <li>Intercept missiles and hold off the robots while the Chinook takes off.</li>
   <li>Destroy the Siege Walker’s weapons to take it down.</li></ul>
   <footer><a href="./">Exit to City Battle</a><button type="button" data-next>Choose hero</button></footer>`;
 }
 choices(){
  return `<div class="evac-briefing-heroes">${['volt','ninja'].map(id=>{
   const hero=HEROES.find(entry=>entry.id===id);
   return `<button type="button" class="evac-briefing-hero" data-hero="${id}" style="--hero-accent:${hero.color}">
    <span class="evac-hero-icon" aria-hidden="true">${hero.icon}</span><strong>${hero.name}</strong>
    <span>${id==='volt'?'Carry civilians out of danger with a lightning dash.':'Shield civilians from damage with protective smoke.'}</span>
   </button>`;
  }).join('')}</div>
  <footer><button type="button" class="secondary" data-back>Back</button></footer>`;
 }
 tutorial(){
  const lesson=training[this.hero];
  return `<p class="evac-briefing-lead">${lesson.tip}</p>
   <dl class="evac-briefing-controls">${this.controlRows()}</dl>
   <p class="evac-briefing-tip">${lesson.bonus}</p>
   <footer><button type="button" class="secondary" data-back>Change hero</button>
   <button type="button" data-start>Start mission</button></footer>`;
 }
 controlRows(){
  return training[this.hero].controls.map(([action,desktop,touch])=>
   `<div><dt>${action}</dt><dd>${this.inputMode.desktop?desktop:touch}</dd></div>`).join('');
 }
 updateControls(){
  this.dialog.querySelector('.evac-briefing-controls').innerHTML=this.controlRows();
 }
}
