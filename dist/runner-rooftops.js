import {traceImpact} from './combat-collision.js?v=robot-1';
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const usable=c=>c?.type==='slab'&&c.state==='intact'&&!c.hasDetached&&c.hp!==0;

// Produces controller inputs only. Climbing, crests, roof support and falls remain physical.
export class RooftopTactics {
 constructor(){this.reset();}
 reset(){this.plan=null;this.cooldown=1.4;this.visits=0;this.completed=0;this.aborted=0;this.recoveries=0;this.lastBuilding=null;this.fireSeconds=0;this.damage=0;this.elapsed=0;this.checkClock=0;}
 cancel(cooldown=16){this.plan=null;this.cooldown=cooldown;this.checkClock=0;}
 roofPoint(b,x,z,sections){
  const hit=traceImpact({x,y:b.floors*3+.7,z},{x,y:b.floors*3-.5,z},{sections:sections.filter(c=>c.building===b.id&&usable(c)),ground:false,radius:0});
  return hit?{x,y:hit.point.y,z}:null;
 }
 firingPoints(b,sections,target,canShootFrom){
  const dx=target.x-b.x,dz=target.z-b.z,len=Math.hypot(dx,dz)||1;
  return [[dx/len*3.15,dz/len*3.15],[Math.sign(dx)*3.2,0],[0,Math.sign(dz)*3.2],[0,0]].map(([x,z])=>this.roofPoint(b,b.x+x,b.z+z,sections)).filter(p=>p&&canShootFrom(p));
 }
 choose(motion,buildings,sections,target,canShootFrom){
  const p=motion.position,candidates=[...buildings].sort((a,b)=>distance(p,a)-distance(p,b)).slice(0,6);
  for(const b of candidates.sort((a,b)=>(a.id===this.lastBuilding?8:0)+distance(p,a)-(b.id===this.lastBuilding?8:0)-distance(p,b))){
   const points=this.firingPoints(b,sections,target,canShootFrom);if(!points.length)continue;
   const dx=p.x-b.x,dz=p.z-b.z,axis=Math.abs(dx)>Math.abs(dz)?'x':'z',sign=Math.sign(axis==='x'?dx:dz)||1;
   const entry={x:axis==='x'?b.x+sign*6.8:b.x,z:axis==='z'?b.z+sign*6.8:b.z};
   return{building:b,point:points[0],entry,axis,sign,phase:'approach',age:0,attackAge:0,lostSight:0,settle:0};
  }
  return null;
 }
 move(motion,to,{boost=false}={}){
  const d=distance(motion.position,to),desired=Math.atan2(to.x-motion.position.x,to.z-motion.position.z);
  return{input:{forward:Math.min(1,d/2),boost,jump:(this.plan?.stuck||0)>.85},fire:false,yaw:motion.yaw+angle(desired,motion.yaw)*(1-Math.exp(-14*(this.dt||1/60)))};
 }
 recordDamage(amount){this.damage+=Math.max(0,amount||0);}
 update(dt,{motion,buildings=[],sections=[],target,robotAlive,canShootFrom=()=>false,urgent=false}){
  this.dt=dt;
  if(!robotAlive){this.cancel(8);return null;}
  if(urgent)return null;
  this.cooldown=Math.max(0,this.cooldown-dt);
  if(!this.plan){
   if(this.cooldown>0||!buildings.length||motion.mode==='air')return null;
   this.plan=this.choose(motion,buildings,sections,target,canShootFrom);this.cooldown=this.plan?18:3;
   if(!this.plan)return null;this.visits++;this.elapsed=0;this.checkClock=0;
  }
  const plan=this.plan,p=motion.position,b=plan.building;const moved=plan.previous?Math.hypot(p.x-plan.previous.x,p.y-plan.previous.y,p.z-plan.previous.z):1;plan.previous={...p};plan.stuck=motion.mode==='ground'&&plan.phase!=='attack'&&moved<.008&&motion.speed<.5?(plan.stuck||0)+dt:0;if(plan.stuck>.85&&plan.stuck-dt<=.85)this.recoveries++;plan.age+=dt;this.elapsed+=dt;this.checkClock-=dt;
  const inside=Math.abs(p.x-b.x)<5&&Math.abs(p.z-b.z)<5,onRoof=inside&&motion.mode==='ground'&&usable(motion.support)&&Math.abs(p.y-plan.point.y)<.6;
  if(this.checkClock<=0){
   this.checkClock=.25;
   if(!this.roofPoint(b,plan.point.x,plan.point.z,sections)){this.aborted++;this.lastBuilding=b.id;this.cancel(8);return null;}
  }
  if(plan.age>22){this.aborted++;this.lastBuilding=b.id;this.cancel(10);return null;}
  if((plan.phase==='approach'||plan.phase==='climb')&&onRoof)plan.phase='position';
  if(plan.phase==='approach'){
   if(motion.mode==='wall'){plan.phase='climb';return{input:{forward:1},fire:false,yaw:motion.yaw};}
   if(distance(p,plan.entry)<.9)plan.phase='climb';else return this.move(motion,plan.entry,{boost:distance(p,plan.entry)>10});
  }
  if(plan.phase==='climb'){
   if(motion.mode==='air')return{input:{},fire:false,yaw:motion.yaw};
   if(motion.mode==='wall')return{input:{forward:1},fire:false,yaw:motion.yaw};
   if(distance(p,plan.entry)>2.5&&p.y<plan.point.y-.8){plan.phase='approach';return this.move(motion,plan.entry);}
   return this.move(motion,b);
  }
  if(plan.phase==='position'){
   if(!onRoof){this.aborted++;this.cancel(8);return null;}
   if(distance(p,plan.point)>.65)return this.move(motion,plan.point);
   plan.phase='attack';plan.attackAge=0;plan.settle=0;
  }
  if(plan.phase==='attack'){
   if(!onRoof){this.aborted++;this.cancel(8);return null;}
   plan.attackAge+=dt;plan.settle+=dt;
   plan.sightClock=(plan.sightClock||0)-dt;if(plan.sightClock<=0){plan.visible=canShootFrom(p);plan.sightClock=.12;}
   const visible=plan.visible;plan.lostSight=visible?0:plan.lostSight+dt;
   if(plan.lostSight>.65){
    const alternative=this.firingPoints(b,sections,target,canShootFrom).find(q=>distance(q,p)>1.1);
    if(alternative){plan.point=alternative;plan.phase='position';return this.move(motion,alternative);}
    plan.phase='depart';
   }else if(plan.attackAge>=4.8){plan.phase='depart';this.completed++;this.lastBuilding=b.id;}
   else{
    const fire=visible&&plan.settle>.22&&motion.speed<1.5&&plan.attackAge%1.6<1.15;
    if(fire)this.fireSeconds+=dt;
    return{input:{},fire,yaw:Math.atan2(target.x-p.x,target.z-p.z),target,rooftopFire:fire};
   }
  }
  if(plan.phase==='depart'){
   if(motion.mode==='wall')return{input:{forward:-1},fire:false,yaw:motion.yaw};
   if(motion.mode==='air')return{input:{},fire:false,yaw:motion.yaw};
   if(!onRoof){this.cancel(14+(this.visits%3)*3);return null;}
   const exit={x:plan.axis==='x'?b.x+plan.sign*9:p.x,z:plan.axis==='z'?b.z+plan.sign*9:p.z};
   return this.move(motion,exit);
  }
  return null;
 }
 diagnostics(){return{phase:this.plan?.phase||'none',building:this.plan?.building.id||null,point:this.plan?.point?{...this.plan.point}:null,cooldown:this.cooldown,visits:this.visits,completed:this.completed,aborted:this.aborted,recoveries:this.recoveries,fireSeconds:this.fireSeconds,damage:this.damage};}
}
