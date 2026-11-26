import {Vector3,Line3} from './vendor/three.module.js';
import {CombatEvents,abilityTags} from './liberation-events.js';
const vec=p=>new Vector3().copy(p);
const rapid=new Set(['electric','welding','laser-grind','spray']);
const projectiles=new Set(['kunai','charged-shuriken','lance','spray','comet','shuriken','ball-lightning']);
const passiveColor='#9fffe2';
export const LIMITS={generations:5,eventsPerFrame:160,shots:64,fields:24};
export class LiberationCombat {
 constructor(run){
  this.events=new CombatEvents();
  this.events.on('hit',({hit,e,s})=>{if(!e.generated||e.c.castReplay)this.onAbilityHit?.(hit,e,s);});
  this.events.on('kill',({hit,e,excess})=>this.onTakedown?.(hit,e,excess));
  this.run=run;this.hero=run.hero;this.b=run.build;this.pos=this.hero.root.position;
  this.previous=this.pos.clone();this.sequence=0;this.casts=new Map();this.history=new Map();
  this.shots=[];this.fields=[];this.delays=[];this.status=new WeakMap();
  this.stationary=this.travel=this.effectiveShots=this.charge=this.bank=this.savedSeconds=0;
  this.budget=LIMITS.eventsPerFrame;this.nextDouble=15;this.lastEnergy=this.energy();
 }
 v(id){return this.b.value(id);}
 get now(){return this.b.time;}
 energy(){return this.hero.energy?.amount??(typeof this.hero.energy==='number'?this.hero.energy:0);}
 targets(point,radius,exclude=null){return this.run.nearby(point,radius,exclude);}
 stats(unit){
  if(!this.status.has(unit))this.status.set(unit,{hits:0,heat:0,weld:0,embed:0,wire:0,wireUntil:0});
  return this.status.get(unit);
 }
 cast(kind,power,from=this.pos){
  const c={kind,power,origin:vec(from),seq:++this.sequence,kills:0,ancestry:[],factor:1};
  c.tags=abilityTags(kind);this.events.emit('cast',c);this.casts.set(kind,c);this.lastCast=c;
  for(const [k,t] of this.history)if(t<this.now-5)this.history.delete(k);
  this.history.set(kind,this.now);
  if(this.history.size>=3&&this.v('Combination Lock')){c.factor+=this.v('Combination Lock')/100;this.history.clear();}
  if(this.inField('consecration',from))c.factor*=1.5;
  c.bonus=this.bank;this.bank=0;
  if(this.b.hero==='ninja'&&kind!=='laser-grind')this.expend(15);
  if(this.roll('Echo Chamber',1))this.delay(.22,()=>this.repeat(c,'Echo Chamber',from));
  if(this.doubleAt){const p=this.doubleAt;this.doubleAt=null;this.repeat(c,'Radiant Double',p);}
  return c;
 }
 delay(seconds,fn){if(this.delays.length<48)this.delays.push({at:this.now+seconds,fn});}
 roll(id,coeff){return this.b.random()<Math.min(1,this.v(id)/100)*coeff;}
 branch(parent,id){
  const path=parent?.ancestry||[];
  if(path.includes(id)||path.length>=LIMITS.generations||this.budget<=0)return null;
  return {kind:id,power:0,factor:1,...parent,ancestry:[...path,id]};
 }
 bolt(from,target,power,parent,id,{speed=70,color=passiveColor,passive=true}={}){
  const context=this.branch(parent,id);
  if(!context||!target||power<=0||this.shots.length>=LIMITS.shots)return;
  this.shots.push({p:vec(from),target,power,context:{...context,passive},pierced:new Set(),penetrations:this.v('Phase Ammunition'),speed,color,life:2.5});
 }
 repeat(c,id,from){
  const ctx=this.branch(c,id);if(!ctx)return;
  const group=this.targets(from,130),target=group[0];
  const at=vec(from).add(new Vector3(0,1,0)),aim=target?vec(target.point):this.hero.aim?.();
  if(!aim)return;
  const dir=vec(aim).sub(at).normalize();ctx.castReplay=true;ctx.kills=0;
  this.run.options.ui?.ghost?.(from,from,'#d2b4ff');
  this.events.emit('generatedCast',{cast:ctx,origin:at});this.run.options.ring(at,2.5,'#cca3ff');
  if(['lance','spray','comet'].includes(c.kind)&&this.hero.shoot){
   this.hero.shoot(c.kind,at,dir,c.kind==='comet'?target?.unit:null,{free:true,cast:ctx});
  }else if(c.kind==='sky-strike'){
   this.area(c.origin,10,c.power,ctx,'echo strike','#7eeaff',null,false);
  }else if(c.kind==='ball-lightning'){
   this.orb(at,50,dir);
  }else if(c.kind==='kunai'&&this.hero.attacks){
   this.hero.attacks.queue.push({origin:at,dir,cast:ctx});
  }else if(['ninja-dash','ninja-slash','electric','welding'].includes(c.kind)){
   const range={'ninja-dash':25,'ninja-slash':9,electric:55,welding:6}[c.kind];
   this.line(at,at.clone().addScaledVector(dir,range),c.kind==='ninja-slash'?4:2,c.power,ctx,'spectral strike','#ceb0ff');
  }else if(target){
   this.bolt(at,target,c.power*(c.factor||1),ctx,'spectral projectile',{passive:false,color:'#ceb0ff'});
  }
 }
 damage(t,power,ctx){
  if(!t?.unit?.alive||power<=0||--this.budget<0)return;
  const previous=this.current;this.current=ctx;
  try{
   const h={unit:t.unit,part:t.part,point:vec(t.point)};
   if(this.run.options.applyHit)this.run.options.applyHit(h,power,ctx.kind);
   else {const scaled=this.before(h,power,ctx.kind);this.after(h,this.run.damage.hurt(h.unit,scaled,h.point,h.part));}
  }finally{this.current=previous;}
 }
 area(point,radius,power,parent,id,color=passiveColor,exclude=null,passive=true){
  const ctx=this.branch(parent,id);if(!ctx)return;
  const targets=this.targets(point,radius,exclude);
  this.events.emit('explosion',{point,radius,targets,source:id});
  const scale=this.areaScale(radius,targets.length);
  this.run.options.ring(point,radius,color);
  if(passive&&this.now>=(this.nextSound||0)){this.nextSound=this.now+.25;this.run.options.sound?.(id==='Volatile Core'?140:360,85);}
  for(const t of targets)this.damage(t,power*scale,{...ctx,passive,castReplay:false});
 }
 areaScale(radius,count){return (1+this.v('Critical Mass')*.01*count)*(1+this.v('Singularity')*.03*radius);}
 line(a,b,width,power,parent,id,color){
  this.run.options.arc(vec(a),b,color);
  const line=new Line3(vec(a),vec(b)),ctx=this.branch(parent,id);
  if(!ctx)return;
  for(const t of this.targets(a,vec(a).distanceTo(b)+width)){
   if(line.closestPointToPoint(vec(t.point),true,new Vector3()).distanceTo(t.point)<=width)this.damage(t,power,{...ctx,passive:false});
  }
 }
 before(hit,power,kind){
  if(!hit.unit)return power;
  kind=kind.startsWith('ball-lightning-')?'ball-lightning':kind;
  const c=this.current||hit.cast||this.casts.get(kind)||{kind,ancestry:[],factor:1,power};
  const generated=c.ancestry.length>0,coeff=generated?.35:rapid.has(kind)?Math.min(1,power/(kind==='spray'?75:110)):1;
  const critical=this.b.random()<Math.min(1,.05+this.v('Targeting Chip')/100)*coeff;
  let factor=generated?(c.passive?1+this.v('Secondary Amplifier')/100:1):c.factor;
  factor*=1+this.v('Siege Platform')*.01*Math.min(1,this.stationary/3);
  if(!generated&&['arrival-strike','ninja-dash'].includes(kind))factor*=1+(this.spree||0)*.25;
  if(!generated&&(this.v('Critical Mass')||this.v('Singularity'))){
   const radius=kind==='sky-strike'?10:kind==='laser-grind'?this.hero.laserStar?.radius:kind==='ninja-slash'?9:0;
   if(radius)factor*=this.areaScale(radius,this.targets(kind==='sky-strike'?c.origin||hit.point:kind==='laser-grind'?this.hero.laserStar.mesh.position:this.pos,radius).length);
  }
  if(!generated&&['electric','welding'].includes(kind))factor*=1+this.v('Overclock Chip')/100;
  power=(power*factor+(generated?0:c.bonus||0))*(critical?2:1);
  if(this.v('Execution Engine')&&this.run.actors.includes(hit.unit.entity)&&hit.unit.health/hit.unit.maxHealth<this.v('Execution Engine')/100)power=Math.max(power,hit.unit.maxHealth*2);
  if(c.bonus&&!generated)c.bonus=0;
  hit.liberation={c,kind,power,coeff,critical,hp:hit.unit.health,partHP:this.partHP(hit),generated};
  return power;
 }
 partHP(h){
  const e=h.unit.entity;
  return e.weapons?.forPart(h.part)?.health??e.engines?.find(x=>x.id===h.part)?.health??
   (h.part==='arm-left'?e.armsHealth?.[0]:h.part==='arm-right'?e.armsHealth?.[1]:e.state?.launchers?.find?.(x=>x.id===h.part)?.health);
 }
 after(hit,amount){
  const e=hit.liberation;if(!e)return;
  const component=e.partHP>0&&this.partHP(hit)<=0;
  if(amount<=0&&!component&&!(this.partHP(hit)<e.partHP))return;
  const {c,kind,power,coeff,critical,generated}=e,p=vec(hit.point),unit=hit.unit,s=this.stats(unit);
  const others=(r=32)=>this.targets(p,r,unit.entity);
  this.events.emit('hit',{hit,e,s});if(critical)this.events.emit('critical',{hit,e});
  if(!generated&&kind==='ball-lightning'){
   this.projectile(kind,p,power,c);
   for(const t of others(24).slice(0,this.v('Phase Ammunition')))this.bolt(p,t,power,c,'Phase Ammunition',{color:'#94dfff'});
  }
  if(this.roll('Arc Relay',coeff)){
   const ctx=this.branch(c,'Arc Relay');
   const chain=this.run.chainTargets?.(p,32,hit)||others();
   if(ctx)for(const t of chain.slice(0,2)){
    this.run.options.arc(p,t.point);this.damage(t,power*.6,{...ctx,passive:true});
   }
  }
  if(critical){
   this.run.options.ring(p,2.4,'#ffd479');
   this.recover(this.v('Feedback Circuit'));
   if(this.v('Shatter Crystal')){
    const pool=this.targets(p,38);
    for(let i=0;i<Math.min(12,this.v('Shatter Crystal'))&&pool.length;i++)this.bolt(p,pool[i%pool.length],power*.32,c,'Shatter Crystal');
   }
  }
  if(this.v('Resonance Chamber')&&(s.hits+=coeff)>=10){
   s.hits-=10;this.area(p,10,power*this.v('Resonance Chamber')/100,c,'Resonance Chamber');
  }
  if(projectiles.has(kind))this.events.emit('projectileImpact',{hit,e});
  if(projectiles.has(kind)&&this.roll('Quantum Prism',coeff)){
   const pool=this.targets(p,30);for(let i=0;i<2&&pool.length;i++)this.bolt(p,pool[i%pool.length],power*.55,c,'Quantum Prism');
  }
  if(this.kinetic&&this.v('Kinetic Capacitor')){
   this.kinetic=false;const pool=this.targets(p,36);
   for(let i=0;i<Math.min(12,this.v('Kinetic Capacitor'))&&pool.length;i++)this.bolt(p,pool[i%pool.length],85,c,'Kinetic Capacitor');
  }
  if(!generated&&this.v('Gravity Well')&&['lance','comet','laser-shuriken','ball-lightning','sky-strike'].includes(kind))this.pull(p,this.v('Gravity Well'),4+this.v('Gravity Well')*.2);
  if((!unit.alive||component)&&e.hp>0){
   // Resolve once even when secondary damage kills the victim inside this handler.
   if(!unit.alive&&s.killed)return;
   if(!unit.alive)s.killed=true;
   const excess=Math.max(0,power-(component?e.partHP:e.hp));
   this.events.emit('kill',{hit,e,excess,component});
   this.reduce(this.v('Time Fragment'));
   if(this.v('Volatile Core'))this.area(p,12,Math.min(component?e.partHP:unit.maxHealth,1500)*this.v('Volatile Core')/100,c,'Volatile Core','#ffa659',unit.entity);
   if(excess&&this.v('Overflow Reactor'))this.area(p,12,excess*this.v('Overflow Reactor')/100,c,'Overflow Reactor','#ffc75b',unit.entity);
   if(c.passive&&this.v('Closed Loop'))this.repeat({kind:{volt:'electric',ninja:'kunai',lux:'lance'}[this.b.hero],power:{volt:75,ninja:65,lux:350}[this.b.hero],ancestry:c.ancestry},'Closed Loop',p);
   if(!generated&&++c.kills===3&&this.v('Perpetual Engine'))this.repeat(c,'Perpetual Engine',this.pos);
  }
 }
 projectile(kind,origin,power,c){
  this.events.emit('projectileCreated',{kind,origin,power,cast:c});
  if(++this.effectiveShots%5===0&&this.v('Companion Shot')){
   const targets=this.targets(origin,90);
   for(let i=0;i<Math.min(12,this.v('Companion Shot'))&&targets.length;i++)this.bolt(origin,targets[i%targets.length],power*.6,c,'Companion Shot');
  }
 }
 cooldowns(){
  const h=this.hero;
  return [[h.motion,'cooldown'],[h.shuriken,'cooldown'],[h.attacks,'slashCooldown'],[h.attacks,'cooldown'],
   [h.storm,'strikeCooldown'],[h.storm,'ultimateCooldown'],[h.player,'blinkCooldown'],...Object.keys(h.cool||{}).map(k=>[h.cool,k])].filter(([o,k])=>typeof o?.[k]==='number');
 }
 reduce(amount,store=true){
  if(!amount)return 0;let used=0;
  for(const [o,k] of this.cooldowns()){used=Math.max(used,Math.min(o[k],amount));o[k]=Math.max(0,o[k]-amount);}
  if(store&&this.v('Stolen Seconds'))this.savedSeconds=Math.min(10,this.savedSeconds+amount-used);
  if(used)this.events.emit('cooldownReduced',{seconds:used});return used;
 }
 recover(amount){
  if(!amount)return;if(this.b.hero==='ninja'){this.reduce(amount/8);return;}
  const energy=this.energy(),gain=Math.min(amount,Math.max(0,100-energy));
  if(this.b.hero==='lux')this.hero.energy+=gain;else this.hero.energy.amount+=gain;
  this.events.emit('energyRecovered',{gain,overflow:amount-gain});this.overflow(amount-gain);
 }
 overflow(amount){this.bank=Math.min(this.v('Excess Charge'),this.bank+Math.max(0,amount));}
 expend(amount){
  this.events.emit('energySpent',{amount});if(!this.v('Unstable Capacitor'))return;this.charge+=amount;
  if(this.charge>=60){this.charge%=60;this.area(this.pos,16,this.v('Unstable Capacitor'),null,'Unstable Capacitor');}
 }
 pull(p,radius,strength){
  for(const t of this.targets(p,radius)){
   const actor=t.unit.entity;if(!this.run.actors.includes(actor))continue;
   const dir=vec(p).sub(t.point).clampLength(0,strength);
   if(actor.body?.velocity){actor.body.velocity.x+=dir.x;actor.body.velocity.z+=dir.z;}
   else{const dest=actor.root.position.clone().add(dir);dest.y=actor.root.position.y;if(this.run.options.visible(t.point,vec(t.point).add(dir)))actor.root.position.copy(dest);}
  }
 }
 inField(type,p){return this.fields.find(f=>f.type===type&&f.p.distanceToSquared(p)<=f.radius**2);}
 field(type,p,radius,life,power,color,interval=1){
  if(this.fields.length>=LIMITS.fields)this.fields.shift();
  const f={type,p:vec(p),radius,life,power,color,interval,next:0};
  this.events.emit('entityCreated',f);this.fields.push(f);return f;
 }
 step(dt){
  this.budget=LIMITS.eventsPerFrame;
  const dist=this.pos.distanceTo(this.previous);
  if(dist)this.events.emit('movement',{from:this.previous,to:this.pos,dist});
  const grounded=this.hero.player?.grounded??(this.hero.motion?.mode==='ground');
  if(this.grounded!==undefined&&this.grounded!==grounded)this.events.emit(grounded?'land':'jump',{point:this.pos});
  this.grounded=grounded;
  this.stationary=dist<dt*.8?this.stationary+dt:0;
  if(dist<dt*100)this.travel+=dist;
  if(this.travel>=40){this.kinetic=true;this.travel%=40;}
  if(this.savedSeconds)this.savedSeconds-=this.reduce(this.savedSeconds,false);
  this.reduce(dt*this.v('Overclock Chip')/100,false);
  if(this.now>=this.nextDouble){this.nextDouble=this.now+15;if(this.v('Quantum Doppelganger')&&this.lastCast)this.repeat(this.lastCast,'Quantum Doppelganger',this.pos.clone().add(new Vector3(1.7,0,0)));}
  for(const task of this.delays.filter(t=>t.at<=this.now))task.fn();
  this.delays=this.delays.filter(t=>t.at>this.now);
  this.stepHero?.(dt,dist);
  for(const f of this.fields){
   f.life-=dt;f.next-=dt;if(f.next>0||f.life<=0)continue;f.next=f.interval;
   this.run.options.ring(f.p,f.radius,f.color);
   if(f.power)this.area(f.p,f.radius,f.power,null,f.type,f.color,null,false);
  }
  this.fields=this.fields.filter(f=>f.life>0);
  for(const shot of [...this.shots]){
   shot.life-=dt;if(shot.life<=0||!shot.target.unit.alive){shot.life=0;continue;}
   const shape=shot.target.unit.shapes.find(s=>s.part===shot.target.part)||shot.target.unit.shapes[0];if(!shape){shot.life=0;continue;}
   const p=vec(shape.center),step=vec(p).sub(shot.p).clampLength(0,shot.speed*dt),next=vec(shot.p).add(step);
   if(!this.run.options.visible(shot.p,next)){shot.life=0;continue;}
   this.run.options.arc(shot.p,next,shot.color);shot.p.copy(next);
   if(next.distanceToSquared(p)<.25){
    shot.pierced.add(shot.target.unit);this.damage({...shot.target,point:p},shot.power,shot.context);
    const direction=step.normalize();
    const nextTarget=shot.penetrations>0&&this.targets(p,30).find(t=>!shot.pierced.has(t.unit)&&vec(t.point).sub(p).normalize().dot(direction)>.9);
    if(nextTarget){shot.target=nextTarget;shot.penetrations--;this.events.emit('penetration',{shot});}else shot.life=0;
   }
  }
  this.shots=this.shots.filter(s=>s.life>0);this.previous.copy(this.pos);
 }
}
