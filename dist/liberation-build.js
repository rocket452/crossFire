// Values are per rank. Rarity weights affect the draft, never hit registration.
const upgrade=(id,name,detail,rarity,max,value,hero=null)=>({id,name,detail,rarity,max,value,hero});
export const UPGRADES=[
 upgrade('amplifier','Power amplifier','Deal 15% more direct attack damage.','common',3,.15),
 upgrade('execution','Execution circuit','Deal 40% more damage to targets below half health.','rare',3,.4),
 upgrade('precision','Precision lens','Deal 25% more damage to heads, engines and boss weapon parts.','rare',3,.25),
 upgrade('pointBlank','Breach rounds','Deal 30% more damage within 12 m.','common',3,.30),
 upgrade('momentum','Slipstream','Moving faster than 12 m/s gives 30% extra damage.','rare',3,.30),
 upgrade('vengeance','Hot core','For four seconds after taking damage, deal 35% more damage.','rare',2,.35),
 upgrade('echo','Arc relay','An attack arcs to a second robot within 20 m for 48 damage. Recharges in 1.2 s.','epic',3,48),
 upgrade('burst','Reactor cascade','Defeated robots explode for 90 damage within 12 m.','epic',3,90),
 upgrade('reach','Field extender','Add 5 m to arc, blast and dash-pulse reach.','rare',3,5),
 upgrade('pulse','Shockstep','Starting a dash hits nearby robots for 72 damage within 10 m.','rare',3,72),
 upgrade('capacitor','Emergency cell','Gain 25 maximum HP and restore that amount now.','common',3,25),
 upgrade('armor','Impact weave','Reduce incoming damage by 12%.','common',3,.12),
 upgrade('salvage','Field medic','Recover 5 HP for each robot defeated.','common',3,5),
 upgrade('regen','Quiet current','After five seconds without damage, recover 2 HP per second.','common',3,2),
 upgrade('ward','Phase buffer','Block one hit. Recharges 18 seconds after use.','epic',1,1),
 upgrade('recovery','Dash recycler','Dash cooldown recovers 30% faster.','common',3,.3),
 upgrade('afterimage','Afterimage','Gain 0.8 seconds of protection when you finish a dash.','rare',2,.8),
 upgrade('bounty','Bounty chip','Earn 3 extra credits per robot.','common',3,3),
 upgrade('learning','Combat telemetry','Earn 25% more XP from each robot.','common',3,.25),
 upgrade('weld','Plasma cutter','Welding beam deals 55% more damage.','rare',3,.55,'volt'),
 upgrade('dynamo','Kinetic dynamo','Generate energy during a lightning dash at 130% of the normal travel rate.','rare',1,1.3,'volt'),
 upgrade('storm','Storm lens','Sky Strike and Critical Mass deal 40% more damage.','epic',3,.4,'volt'),
 upgrade('airJump','Air step','Gain a second midair jump.','rare',1,1,'ninja'),
 upgrade('backstab','Crosscut reserve','A successful gold Crosscut banks another dash.','epic',1,1,'ninja'),
 upgrade('blade','Honed edge','Sword slashes and dash strikes deal 40% more damage.','rare',3,.4,'ninja')
];
const precisionParts=new Set(['head','front-left','front-right','rear-left','rear-right','forearm_r','rocket_pod','plasma_cannon','chest','arm-left','arm-right','launcher-1','launcher-4']);
const weights={common:5,rare:3,epic:1};
export class LiberationBuild {
 constructor(hero,random=Math.random){
  this.hero=hero;this.random=random;this.ranks=new Map();this.hp=120;this.level=1;this.xp=0;
  this.credits=0;this.kills=0;this.time=0;this.lastHurt=-Infinity;this.wardAt=0;this.safeUntil=0;this.arcAt=0;
  this.rewards=[];this.cards=[];this.revision=0;
 }
 value(id){const entry=this.ranks.get(id);return entry?entry.rank*entry.upgrade.value:0;}
 get maxHP(){return 120+this.value('capacitor');}
 get threshold(){return 14+(this.level-1)*6;}
 heal(amount){this.hp=Math.min(this.maxHP,this.hp+amount);}
 tick(dt){this.time+=dt;if(this.time-this.lastHurt>=5)this.heal(this.value('regen')*dt);}
 hurt(power){
  if(this.hp<=0||this.time<this.safeUntil||power<=0)return false;
  if(this.value('ward')&&this.time>=this.wardAt){this.wardAt=this.time+18;this.safeUntil=this.time+.4;return 'ward';}
  this.hp=Math.max(0,this.hp-power*(1-this.value('armor')));this.lastHurt=this.time;this.safeUntil=this.time+.35;
  return true;
 }
 reward(drone){
  this.kills++;this.heal(this.value('salvage'));
  this.credits+=(drone?6:4)+this.value('bounty');
  this.xp+=(drone?10:7)*(1+this.value('learning'));
  while(this.xp>=this.threshold){this.xp-=this.threshold;this.level++;this.rewards.push('level');}
 }
 bossReward(final=false){
  this.credits+=35;this.heal(35);this.cards=[];
  if(final)this.rewards=[];else this.rewards.unshift('boss');
 }
 multiplier({distance,speed,healthFraction,part,kind}){
  const precise=precisionParts.has(part);
  return 1+this.value('amplifier')+(precise?this.value('precision'):0)
   +(distance<=12?this.value('pointBlank'):0)+(healthFraction<.5?this.value('execution'):0)
   +(speed>12?this.value('momentum'):0)+(this.time-this.lastHurt<4?this.value('vengeance'):0)
   +(kind==='welding'?this.value('weld'):0)+(['critical-mass','sky-strike'].includes(kind)?this.value('storm'):0)
   +(kind.startsWith('ninja-slash')||kind.startsWith('ninja-dash')||kind==='arrival-strike'?this.value('blade'):0);
 }
 draft(){
  if(!this.rewards.length||this.cards.length)return this.cards;
  const hasField=['burst','echo','pulse'].some(id=>this.value(id)>0);
  const available=UPGRADES.filter(u=>(!u.hero||u.hero===this.hero)&&(u.id!=='reach'||hasField)&&(this.ranks.get(u.id)?.rank||0)<u.max);
  while(this.cards.length<3&&available.length){
   const epic=available.filter(u=>u.rarity==='epic');
   let pool=available;
   if(!this.cards.length){
    const opening=available.filter(u=>['pulse','echo','airJump','dynamo'].includes(u.id));
    if(this.rewards[0]==='boss'&&epic.length)pool=epic;
    else if(!this.ranks.size&&opening.length)pool=opening;
   }
   let roll=this.random()*pool.reduce((sum,u)=>sum+weights[u.rarity],0);
   const card=pool.find(u=>(roll-=weights[u.rarity])<0)||pool.at(-1);
   this.cards.push(card);available.splice(available.indexOf(card),1);
  }
  if(!this.cards.length){this.heal(25);this.credits+=15;this.rewards.shift();}
  this.revision++;return this.cards;
 }
 choose(id){
  const upgrade=this.cards.find(u=>u.id===id);if(!upgrade)return false;
  const rank=1+(this.ranks.get(id)?.rank||0);this.ranks.set(id,{upgrade,rank});
  if(id==='capacitor')this.heal(upgrade.value);
  this.cards=[];this.rewards.shift();this.revision++;return true;
 }
 spend(action){
  if(!this.cards.length)return false;
  if(action==='repair'&&this.credits>=12&&this.hp<this.maxHP){this.credits-=12;this.heal(30);}
  else if(action==='reroll'&&this.credits>=8){this.credits-=8;this.cards=[];this.draft();}
  else return false;
  this.revision++;return true;
 }
}
