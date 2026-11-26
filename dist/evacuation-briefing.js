import {SOLAR_CONFIG} from './lux-solar.js?v=423';
import {HEROES} from './hero-roster.js?v=404';

const training={
 lux:{tip:'Use the highway sightlines. Aim slightly above distant targets to account for Sunlance drop.',
  controls:[['Move and jump','WASD · Space','Stick · Jump'],['Sprint','Hold Shift on the ground · Casting disabled','—'],['Sunlance · charges for 1.5s','Hold left click or F to repeat · Stand still while held','Hold Sunlance to repeat · Stand still while held'],['Sunburst machine gun','Hold right click or G','Hold Sunburst'],['Light Volley','Hold E and sweep across targets · Release to fire early','Hold Lock volley and aim · Release to fire early'],
   ['Solar Blink','X to blink · X again to return · Aim at a roof edge to jump to the rooftop','Tap Solar Blink · Tap again to return'],
   ['Solar Disc','Q to toggle · Space up · Shift down','Disc to toggle · Jump / Up · Down'],
   ['Solar Communion','Hold R on solid ground · Release to cancel','Hold Recharge on solid ground · Release to cancel']],
  bonus:`Sunlance uses ${SOLAR_CONFIG.attackCosts.lance} energy, Sunburst uses ${SOLAR_CONFIG.attackCosts.spray} per shot, and each locked comet uses ${SOLAR_CONFIG.attackCosts.comet}. Flight uses ${SOLAR_CONFIG.flightDrain} per second. Release Communion to move or attack again.`},
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
   ['Release charged beam','R','Beam']
  ],
  bonus:'Longer orb charges hit harder and wider. At 100%, the barrier bursts and hurts Violet.'
 },
 rift:{
  tip:'Blink up to rooftops or past an enemy’s flank. Press Blink again within four seconds to return to your starting point.',
  controls:[
   ['Move and aim','WASD · Mouse','Left stick · Drag the scene'],
   ['Jump','Space','Jump'],
   ['Rift bolt','Left click or F','Bolt'],
   ['Blink / return','Right click or G','Blink'],
   ['Place redirect exit, then entrance','E','Redirect'],
   ['Deploy an aimed attack portal · 3 charges','R','Attack Portal']
  ],
  bonus:'Attack Portal regains one charge every five seconds. Aim the Redirect exit where you want shots to go, then place the entrance in the path of incoming fire.'
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
 constructor({inputMode,onStart,combatOnly=false,defenseMode=false,liberationMode=false}){
  this.inputMode=inputMode;
  this.onStart=onStart;
  this.liberationMode=liberationMode;this.defenseMode=defenseMode;this.combatOnly=combatOnly;
  this.pending=true;
  this.dialog=document.createElement('dialog');
  this.dialog.className=defenseMode?'evac-briefing defense-briefing':'evac-briefing';
  this.dialog.setAttribute('aria-labelledby','evac-briefing-title');
  this.dialog.addEventListener('cancel',event=>{
   event.preventDefault();
   if(this.step==='tutorial')this.show('choose');
   else if(this.step==='choose')this.show('objective');
  });
 }
 open(step='objective'){
  if(this.dialog.open)return;
  this.pending=true;
  this.hero=null;
  const host=this.defenseMode?document.querySelector('.viewer'):document.body;
  host.append(this.dialog);
  this.show(step);
  this.unsubscribe=this.inputMode.subscribe(()=>{
   if(this.step==='tutorial'&&this.pending)this.updateControls();
  });
  this.dialog.showModal();
  (this.dialog.querySelector('[data-next]')||this.dialog.querySelector('h2')).focus();
 }
 show(step){
  this.step=step;
  const title={
   objective:this.liberationMode?'City Liberation':this.defenseMode?'Wave Defense':this.combatOnly?'Mission 1':'Civilian Evacuation',
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
  if(this.liberationMode)return `<p class="evac-briefing-lead">Clear two occupied districts and defeat the Siege Walker and Bastion.</p>
   <ul class="evac-objectives"><li>Hunt Bruisers and drones for XP and credits. Each level lets you choose an upgrade.</li><li>Spend credits to heal or reroll your choices. Your build carries into the next district.</li><li>If your hero falls, the run ends.</li></ul>
   <footer><a href="./">Exit to City Battle</a><button type="button" data-next>Choose hero</button></footer>`;
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
  return `<div class="evac-briefing-heroes">${(this.defenseMode?['volt','ninja','violet','rift','lux']:['volt','ninja']).map(id=>{
   const hero=HEROES.find(entry=>entry.id===id);
   return `<button type="button" class="evac-briefing-hero" data-hero="${id}" style="--hero-accent:${hero.color}">
    <span class="evac-hero-icon" aria-hidden="true">${hero.icon}</span><strong>${hero.name}</strong>
    <span>${id==='lux'?'Snipe from cover and mark enemies for seeking light.':id==='rift'?'Blink, return, and redirect incoming fire.':id==='violet'?'Fly, block incoming fire, and unleash a force beam.':this.combatOnly?(id==='volt'?'Build charge at high speed and strike with lightning.':'Throw a laser star and teleport to a charged shuriken.'):id==='volt'?'Carry civilians out of danger with a lightning dash.':'Shield civilians from damage with protective smoke.'}</span>
   </button>`;
  }).join('')}</div>
  <footer><button type="button" class="secondary" data-back>Back</button></footer>`;
 }
 tutorial(){
  const lesson=training[this.hero];
  const tip=['lux','rift','violet'].includes(this.hero)?lesson.tip:this.combatOnly?(this.hero==='volt'?'Run to build charge, then stop briefly to fire. Use buildings as cover when the Walker winds up.':'Use shuriken teleports and wall jumps to attack from rooftops. Smoke protects allies inside its dome.'):lesson.tip;
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
