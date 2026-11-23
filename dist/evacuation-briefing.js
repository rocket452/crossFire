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
 violet:{
  tip:'Fly above the streets to intercept attackers. Face incoming fire and raise your barrier to charge the force beam.',
  controls:[
   ['Fly and aim','WASD · Mouse','Left stick · Drag the scene'],
   ['Ascend / descend','Space / Shift','Rise / Down'],
   ['Charge and release force orb','Hold left click or F','Hold Orb'],
   ['Hold barrier','Right click or G','Hold Barrier'],
   ['Barrier pulse','E','Pulse'],
   ['Release charged beam','R','Beam']
  ],
  bonus:'Longer orb charges hit harder and wider. Barrier Pulse spends 10% shield charge to stun nearby raiders. At 100%, the barrier bursts and hurts Violet.'
 },
 rift:{
  tip:'Blink up to rooftops or past an enemy’s flank. Press Blink again within four seconds to return to your starting point.',
  controls:[
   ['Move and aim','WASD · Mouse','Left stick · Drag the scene'],
   ['Jump','Space','Jump'],
   ['Rift bolt','Left click or F','Bolt'],
   ['Blink / return','Right click or G','Blink'],
   ['Redirect projectiles','E','Redirect']
  ],
  bonus:'Set a redirect portal in the path of incoming fire. While a return portal is open, the redirect exit uses that position.'
 },
 ninja:{
  tip:'Throw smoke at civilians crossing open streets or waiting at the pad. Allies inside the dome are protected from damage.',
  controls:[
   ['Move and aim','WASD · Mouse','Left stick · Drag the scene'],
   ['Jump again in air or near a wall','Space','Jump'],
   ['Throw or store kunai','Tap LMB or F to throw · Hold to store','Tap Kunai to throw · Hold to store'],
   ['Throw, stop and recall laser star','Hold RMB or G, release, then press twice','Hold Laser Star, release, then tap twice'],
   ['Charge and throw shuriken','Hold and release T','Hold and release Shuriken'],
   ['Teleport to a fully charged star','Q','Teleport'],
   ['Dash / sword slash','Shift / R','Dash / Slash'],
   ['Explosive bomb / protective smoke','C / V','Bomb / Smoke']
  ],
  bonus:'Dash toward the reticle. A dash that destroys an enemy or missile resets the cooldown.'
 }
};

export function evacuationTeam(lead,current){
 const allies=current.filter(id=>id!==lead);
 allies.sort((a,b)=>Number(['volt','ninja'].includes(a))-Number(['volt','ninja'].includes(b)));
 return [lead,...allies].slice(0,3);
}

export class EvacuationBriefing {
 constructor({inputMode,onStart,combatOnly=false,defenseMode=false}){
  this.inputMode=inputMode;
  this.onStart=onStart;
  this.defenseMode=defenseMode;this.combatOnly=combatOnly;
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
   objective:this.defenseMode?'Wave Defense':this.combatOnly?'Mission 1':'Civilian Evacuation',
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
  if(this.defenseMode)return `<p class="evac-briefing-lead">Protect the evacuation rocket while it prepares for liftoff.</p>
   <ul class="evac-objectives"><li>Clear the first two waves and defeat the Siege Walker to launch the rocket.</li><li>Enemies engage nearby heroes. Choose an upgrade between waves. Defeat the Bastion if reinforcements arrive.</li><li>If the relay falls, the mission ends.</li></ul>
   <footer><a href="./">Exit to City Battle</a><button type="button" data-next>Choose hero</button></footer>`;

  if(this.combatOnly)return `<p class="evac-briefing-lead">Take down the Siege Walker in the cyberpunk district.</p>
   <ul class="evac-objectives"><li>Destroy its three weapons to defeat it.</li>
   <li>Watch the radar for Bruisers from the south and combat drones from the north.</li></ul>
   <footer><a href="./">Exit to City Battle</a><button type="button" data-next>Choose hero</button></footer>`;
  return `<p class="evac-briefing-lead">Get civilians from the subway entrance to the evacuation Chinook.</p>
   <ul class="evac-objectives"><li>Protect each group as it crosses the exposed street and boards.</li>
   <li>Intercept missiles and hold off the robots while the Chinook takes off.</li>
   <li>Destroy the Siege Walker’s weapons to take it down.</li></ul>
   <footer><a href="./">Exit to City Battle</a><button type="button" data-next>Choose hero</button></footer>`;
 }
 choices(){
  return `<div class="evac-briefing-heroes">${(this.defenseMode?['volt','ninja','violet','rift']:['volt','ninja']).map(id=>{
   const hero=HEROES.find(entry=>entry.id===id);
   return `<button type="button" class="evac-briefing-hero" data-hero="${id}" style="--hero-accent:${hero.color}">
    <span class="evac-hero-icon" aria-hidden="true">${hero.icon}</span><strong>${hero.name}</strong>
    <span>${id==='rift'?'Blink, return, and redirect incoming fire.':id==='violet'?'Fly, block incoming fire, and unleash a force beam.':this.combatOnly?(id==='volt'?'Build charge at high speed and strike with lightning.':'Throw a laser star and teleport to a charged shuriken.'):id==='volt'?'Carry civilians out of danger with a lightning dash.':'Shield civilians from damage with protective smoke.'}</span>
   </button>`;
  }).join('')}</div>
  <footer><button type="button" class="secondary" data-back>Back</button></footer>`;
 }
 tutorial(){
  const lesson=training[this.hero];
  const tip=this.hero==='violet'?lesson.tip:this.combatOnly?(this.hero==='volt'?'Run to build charge, then stop briefly to fire. Use buildings as cover when the Walker winds up.':'Use shuriken teleports and wall jumps to attack from rooftops. Smoke protects allies inside its dome.'):lesson.tip;
  return `<p class="evac-briefing-lead">${tip}</p>
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
