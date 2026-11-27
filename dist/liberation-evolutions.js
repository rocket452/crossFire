import {Vector3,Line3} from './vendor/three.module.js';
import {LiberationCombat} from './liberation-combat.js';
const vec=p=>new Vector3().copy(p);
const crosses=(a,b,p,r)=>new Line3(vec(a),vec(b)).closestPointToPoint(vec(p),true,new Vector3()).distanceToSquared(p)<=r*r;
const solar='#ffcf55',violet='#ad88ff',electric='#77e4ff';
function inside(p,polygon){
 let odd=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)odd=!odd;
 }
 return odd;
}
export class HeroEvolutionCombat extends LiberationCombat {
 constructor(run){
  super(run);this.satellites=[];this.trail=[];this.heatTargets=new Set();this.wires=new Set();
  this.linked=new Set();this.shadows=[];this.momentum=0;this.nextTick=0;this.debt=0;
  this.spent=this.hero.energy?.spent||0;this.spree=0;
 }
 lockUnits(units){
  this.lockParts??=new WeakMap();
  const result=[];
  for(const unit of units){
   const e=unit.entity;if(!unit.alive||(!e?.weapons&&!e?.armsHealth)){result.push(unit);continue;}
   let parts=this.lockParts.get(unit);if(!parts){parts=new Map();this.lockParts.set(unit,parts);}
   for(const shape of unit.shapes){
    const part=shape.part,health=this.partHP({unit,part});
    if(part!=='chest'&&!(health>0))continue;
    if(!parts.has(part))parts.set(part,{kind:unit.kind,get alive(){return unit.alive&&(part==='chest'||this.hp()>0);},
     hp:()=>this.partHP({unit,part}),get shapes(){return unit.shapes.filter(s=>s.part===part);}});
   }
   result.push(...[...parts.values()].filter(p=>p.alive&&p.shapes.length));
  }
  return result;
 }
 orbs(){return [this.hero.storm?.orb,...this.satellites].filter(Boolean);}
 orb(p,energy,direction=new Vector3()){
  if(this.satellites.length>=7)return;
  const s=this.hero.storm,o={id:++s.sequence,position:vec(p),direction,energy,age:0,zapClock:.25,parked:false,flash:1,buildingClock:0,contacting:false,supplied:0};
  this.satellites.push(o);return o;
 }
 orbCharged(o,gain){
  o.supplied=(o.supplied||0)+gain;
  if(gain>0&&o.energy>=100&&this.v('Mitosis')&&this.satellites.length<7){
   const dir=o.direction.clone().applyAxisAngle(new Vector3(0,1,0),.8);if(!dir.lengthSq())dir.set(1,0,0);
   const p=o.position.clone().addScaledVector(dir,3);
   if(this.hero.storm.clear(o.position,p,.4)){
    o.energy=50;this.orb(p,50,dir);this.run.options.ring(p,4,electric);
   }
  }
 }
 weldOrb(o){if(o&&this.v('Arc Furnace'))o.furnaceUntil=this.now+3;}
 expireOrb(o){if(this.v('Supernova'))this.area(o.position,14,130+2*(o.supplied||0),null,'Supernova',electric,null,false);}
 strike(p){
  const ctx=this.casts.get('sky-strike');
  if(this.v('Storm Network'))for(const o of this.orbs()){
   this.run.options.arc(o.position.clone().add(new Vector3(0,30,0)),o.position,electric);
   this.area(o.position,10,230,ctx,'Storm Network',electric,null,false);
  }
  if(this.v('Thunder Debt'))for(let i=0;i<this.debt;i++)this.delay(.12*(i+1),()=>{
   const target=this.targets(p,18)[0],q=target?vec(target.point):p;
   this.run.options.arc(vec(q).add(new Vector3(0,30,0)),q,electric);this.area(q,9,155,ctx,'Thunder Debt',electric,null,false);
  });
  this.debt=0;if(this.v('Storm Seed'))this.orb(vec(p).add(new Vector3(0,3,0)),85);
 }
 sun(p){return this.field('sun',vec(p).add(new Vector3(0,1,0)),9,9,48,solar,.8);}
 sunTransit(shot,a,b){
  if(!((shot.kind==='lance'&&this.v('Solar Fusion'))||(shot.kind==='spray'&&this.v('Refraction'))))return;
  const f=this.fields.find(f=>f.type==='sun'&&f.life>0&&f!==shot.lastSun&&crosses(a,b,f.p,3));
  if(!f)return;shot.lastSun=f;
  if(shot.kind==='lance'){f.life=0;shot.power*=1.65;shot.mesh.scale.multiplyScalar(1.45);}
  else{const group=this.targets(f.p,48);for(let i=0;i<3&&group.length;i++)this.bolt(f.p,group[i%group.length],shot.power*1.5,shot.cast,'Refraction',{color:solar,passive:false});}
 }
 solarImpact(shot,hit){
  if(shot.kind!=='lance')return;
  if(this.v('Second Sun'))this.sun(hit.point);
  if(hit.unit&&this.v('Prismatic Lance'))for(const t of this.targets(hit.point,35,hit.unit.entity).slice(0,3))this.bolt(hit.point,t,shot.power*.35,shot.cast,'Prismatic Lance',{color:solar,passive:false});
 }
 nursery(target,cast){
  if(!this.v('Comet Nursery'))return;
  for(const f of this.fields.filter(f=>f.type==='sun'&&f.life>0).slice(0,8))this.hero.shoot('comet',f.p,new Vector3(0,1,0),target,{free:true,cast});
 }
 communion(dt){
  if(this.v('Dawn Chorus'))for(const f of this.fields)if(f.type==='sun'&&f.p.distanceTo(this.pos)<=22){
   f.life=Math.min(16,f.life+dt*2);f.power=Math.min(140,f.power+dt*9);
  }
  if(this.v('Consecration')){
   const f=this.inField('consecration',this.pos);if(f)f.life=6;else this.field('consecration',this.pos,8,6,0,solar,.45);
  }
 }
 phantom(p){
  if(this.v('Phantom Engine')){const origin=vec(p);this.delay(.65,()=>this.area(origin,10,this.v('Phantom Engine'),null,'Phantom Engine',violet));}
 }
 blink(from,to,returning){
  this.events.emit('teleport',{from,to,returning});this.phantom(from);if(!returning)return;
  if(this.v('Radiant Double')){this.doubleAt=vec(from);this.run.options.ui?.ghost?.(from,from,solar,1.2);}
  if(this.v('Flashpoint')){this.sun(from);this.sun(to);}
 }
 barrage(p){
  const count=this.hero.attacks?.stored||0;
  if(count&&this.v('Shadow Barrage')){
   const group=this.targets(p,75);for(let i=0;i<count&&group.length;i++)this.bolt(p,group[i%group.length],65,null,'Shadow Barrage',{color:violet,passive:false});
  }
 }
 teleport(from,to,star){
  this.events.emit('teleport',{from,to});this.phantom(from);this.barrage(to);
  if(this.v('Dimensional Cut'))this.line(from,to,3,130,null,'Dimensional Cut',violet);
  if(!star.host||!this.v('Shadow Relay'))return;
  const target=this.targets(to,25,star.host.entity)[0];if(!target)return;
  if(this.hero.kunaiMarks){this.hero.kunaiMarks.place(target.unit,3,3);return;}
  const s=this.hero.shuriken;star.host=target.unit;star.position.copy(target.point);
  star.localPoint=star.host.entity.root.worldToLocal(star.position.clone());star.stationaryAge=Math.max(0,s.config.full.markSeconds-3);
  s.stars.push(star);s.anchor=star;s.emit('lodged',{star});
 }
 foundry(bolt,a,b,power){
  const star=this.hero.laserStar;
  if(bolt.forged||!this.v('Blade Foundry')||star.state!=='grinding'||!crosses(a,b,star.mesh.position,star.radius))return;
  bolt.forged=true;const targets=this.targets(star.mesh.position,65);
  for(let i=0;i<2&&targets.length;i++)this.bolt(star.mesh.position,targets[i%targets.length],power,bolt.cast,'Blade Foundry',{color:violet,passive:false});
 }
 dashStart(p){
  this.events.emit('dash',{from:p});this.dashFrom=vec(p);this.linked=new Set();this.crossed=false;
  this.cast('ninja-dash',130,p);this.phantom(p);this.barrage(p);
 }
 dashEnd(p){
  if(!this.dashFrom)return;const a=this.dashFrom,b=vec(p),ctx=this.casts.get('ninja-dash');
  if(this.v('Aftershadow'))this.delay(1,()=>{this.run.options.ui?.ghost?.(a,b,violet,.28);this.line(a,b,3,ctx.power,ctx,'Aftershadow',violet);});
  const star=this.hero.laserStar;
  if(this.v('Crosscut')&&star.mesh.visible&&star.state!=='charging'&&crosses(a,b,star.mesh.position,star.radius+1)){
   const side=b.clone().sub(a).normalize().applyAxisAngle(new Vector3(0,1,0),Math.PI/2);
   for(const sign of [-1,1]){const f=this.field('crosscut',star.mesh.position,star.radius,1.3,55,violet,.2);f.velocity=side.clone().multiplyScalar(sign*18);}
  }
  this.dashFrom=null;
 }
 rebound(){
  if(!this.v('Death From Above'))return;
  this.hero.motion.jumps=1;
  const atk=this.hero.attacks,p=this.pos.clone().add(new Vector3(0,1,0));
  for(let i=0;i<8;i++)atk.queue.push({origin:p.clone(),dir:new Vector3(Math.cos(i*Math.PI/4),0,Math.sin(i*Math.PI/4))});
 }
 onAbilityHit(hit,e,s){
  const {kind,power,c}=e,unit=hit.unit,p=vec(hit.point);
  if(kind==='electric'){
   if(this.v('Power Grid'))for(const o of this.orbs())if(o.position.distanceTo(p)<=26&&this.hero.storm.clear(p,o.position)){
    this.hero.storm.recharge(power*.7,o);this.run.options.arc(p,o.position,electric);
   }
   if(this.v('Live Wire')){s.wire=this.now>(s.lastBeam??-10)+.35?0:s.wire;s.wire+=power;s.lastBeam=this.now;
    if(s.wire>=48){s.wireUntil=this.now+4;this.wires.add(unit);}}
  }
  if(kind==='welding'&&this.v('Critical Temperature')){if(this.now>(s.weldAt??this.now)+.35)s.weld=0;s.weldAt=this.now;s.weld+=power;this.heatTargets.add(unit);}
  if(kind==='spray'&&this.v('Ignition')){s.heat=Math.min(12,s.heat+1);this.events.emit('statusApplied',{unit,status:'solarHeat',stacks:s.heat});}
  if(s.heat&&kind!=='spray'){const heat=s.heat;s.heat=0;this.events.emit('statusConsumed',{unit,status:'solarHeat',stacks:heat});this.area(p,9,35*heat,c,'Ignition',solar,null,false);}
  if(kind==='kunai'&&this.v('Hidden Arsenal'))s.embed=Math.min(10,s.embed+1);
  if(kind==='ninja-dash'||kind==='arrival-strike'){
   if(this.v('Execution Line')){this.linked.add(unit);s.link=this.linked;}
  }
  if(kind==='ninja-slash'){
   const effects=Number(s.embed>0)+Number(this.hero.shuriken?.anchor?.host===unit||!!this.hero.kunaiMarks?.count(unit))+Number(this.hero.laserStar?.host===unit)+Number(!!s.link?.size);
   if(this.v('Severance')&&effects)this.delay(.12,()=>{const t=this.targets(p,30).find(t=>t.unit===unit);if(t){this.run.options.arc(this.pos,t.point,violet);this.damage(t,power*.4*effects,{kind,ancestry:['Severance']});}});
   if(s.embed){const group=this.targets(p,45,unit.entity);for(let i=0;i<s.embed&&group.length;i++)this.bolt(p,group[i%group.length],66,c,'Hidden Arsenal',{color:violet,passive:false});s.embed=0;}
  }
 }
 onTakedown(hit,e,excess){
  const {kind,c}=e,unit=hit.unit,p=vec(hit.point);
  if(this.hero.storm?.strike)this.debt=Math.min(18,this.debt+1);
  if(this.v('Judgment')&&kind==='lance'&&excess)this.area(p,15,excess*.85,c,'Judgment',solar,unit.entity,false);
  if(this.v('Celestial Chain')&&kind==='comet'&&excess){
   const next=this.targets(p,45,unit.entity)[0],ctx=this.branch(c,'comet hop '+c.ancestry.length);
   if(next&&ctx&&this.hero.shots.length<64)this.hero.shoot('comet',p,vec(next.point).sub(p).normalize(),next.unit,{free:true,cast:ctx,scale:excess/115});
  }
  if(!e.generated&&this.v('Killing Spree')&&['ninja-dash','arrival-strike'].includes(kind)){this.spree=Math.min(6,this.spree+1);this.spreeUntil=this.now+5;}
  const link=this.stats(unit).link;
  if(link){link.delete(unit);const ctx=this.branch(c,'Execution Line');if(ctx)for(const other of link){const shape=other.shapes[0];if(shape)this.damage({unit:other,part:shape.part,point:shape.center},120,ctx);}}
 }
 stepHero(dt,dist){
  const h=this.hero;
  for(const f of this.fields)if(f.polygon&&f.next<=dt){for(let i=1;i<f.polygon.length;i++)this.run.options.arc(f.polygon[i-1],f.polygon[i],electric);
   for(const t of this.targets(f.p,150))if(inside(t.point,f.polygon))this.damage(t,35,{kind:'circuit',ancestry:['Closed Circuit']});}
  for(const f of this.fields)if(f.velocity)f.p.addScaledVector(f.velocity,dt);
  if(this.spreeUntil<this.now)this.spree=0;
  if(this.b.hero==='lux'){
   if(h.energy>100&&h.solarMode!=='communion')h.energy=Math.max(100,h.energy-dt*2);
   return;
  }
  if(this.b.hero==='ninja'){
   const star=h.laserStar;if(!star)return;
   if(this.v('Phantom Footing')&&h.motion.mode==='air'&&(star.mesh.visible&&star.state!=='charging'&&star.mesh.position.distanceTo(this.pos)<4||h.shuriken.anchor?.position.distanceTo(this.pos)<4||[...(h.kunaiMarks?.marks.keys()||[])].some(u=>h.kunaiMarks.anchor(u)?.distanceTo(this.pos)<4)))h.motion.jumps=Math.min(h.motion.jumps,1);
   if(this.v('Grinding Singularity')&&star.state==='grinding')this.pull(star.mesh.position,star.radius+7,dt*8);
   return;
  }
  const storm=h.storm;if(!storm)return;
  this.expend(Math.max(0,h.energy.spent-this.spent));this.spent=h.energy.spent;
  
  if(!h.welder.active){for(const u of this.heatTargets){const s=this.stats(u);if(u.alive&&s.weld>=330)this.area(u.entity.root.position,13,340,null,'Critical Temperature','#ffbb77',null,false);s.weld=0;}this.heatTargets.clear();}
  const boosting=(h.boost||h.keys?.has('shift'))&&dist>dt*12;
  if(boosting){
   this.momentum=Math.min(4,this.momentum+dt);
   if(dist>.001)this.heading=vec(this.pos).sub(this.previous).normalize();
   if(this.v('Closed Circuit')&&(!this.trail.length||this.trail.at(-1).distanceTo(this.pos)>2)){
    const path=this.trail,index=path.findIndex((p,i)=>i<path.length-6&&p.distanceTo(this.pos)<3.8);
    if(path.length)this.run.options.arc(path.at(-1),this.pos,electric);
    if(index>=0){
     const polygon=path.slice(index);polygon.push(vec(this.pos));
     for(const t of this.targets(this.pos,150))if(inside(t.point,polygon))this.damage(t,260,{kind:'circuit',ancestry:['Closed Circuit']});
     for(let i=1;i<polygon.length;i++)this.run.options.arc(polygon[i-1],polygon[i],electric);
     const field=this.field('circuit',this.pos,1,2.8,0,electric,.45);field.polygon=polygon;
     path.length=0;
    }
    const point=vec(this.pos);point.created=this.now;path.push(point);if(path.length>80)path.shift();
   }
  }else if(this.momentum){
   if(this.v('Terminal Velocity')&&this.momentum>.25)this.line(vec(this.pos).add(new Vector3(0,1,0)),vec(this.pos).add(new Vector3(0,1,0)).addScaledVector(this.heading,8+5*this.momentum),4,55+85*this.momentum,null,'Terminal Velocity',electric);
   this.momentum=0;
  }
  this.trail=this.trail.filter(p=>this.now-p.created<6);
  const primary=storm.orb;
  for(const o of [...this.satellites]){storm.orb=o;storm.stepOrb(dt);if(!storm.orb)this.satellites.splice(this.satellites.indexOf(o),1);}
  storm.orb=primary;
  if(this.now<this.nextTick)return;this.nextTick=this.now+.35;
  for(let i=1;i<this.trail.length;i++)this.run.options.arc(this.trail[i-1],this.trail[i],electric);
  const orbs=this.orbs();
  for(const [i,o] of orbs.entries()){
   if(o.furnaceUntil>this.now)this.area(o.position,8,145,null,'Arc Furnace','#ffad68',null,false);
   if(this.v('Orbital Current'))for(const other of orbs.slice(i+1))if(other.position.distanceTo(o.position)<42&&storm.clear(o.position,other.position))this.line(o.position,other.position,2,65,null,'Orbital Current',electric);
  }
  const live=[...this.wires].filter(u=>u.alive&&this.stats(u).wireUntil>this.now);this.wires=new Set(live);
  for(const u of live){const t=this.targets(u.entity.root.position,22,u.entity).find(t=>this.wires.has(t.unit));if(t){this.run.options.arc(u.entity.root.position,t.point,electric);this.damage(t,38,{kind:'wire',ancestry:['Live Wire']});}}
 }
}
