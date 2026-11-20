import * as THREE from './vendor/three.module.js';
export class ChargedShuriken {
 constructor(config,{world,origin,aim,hit,teleport,event=()=>{}}){Object.assign(this,{config,world,origin,aim,hit,onTeleport:teleport,event});this.reset();}
 reset(){this.crosscutTarget=null;this.charging=false;this.charge=0;this.full=false;this.held=false;this.suppressed=false;this.anchor=null;this.stars=[];this.cooldown=0;this.failure=0;this.flash=0;this.previewClock=0;this.preview=null;this.resolution=null;this.events=[];this.throws=0;this.teleports=0;this.failures=0;this.strikes=0;this.backstabs=0;this.sequence=0;}
 emit(type,data={}){const e={type,...data};this.events.push(e);if(this.events.length>this.config.feedback.eventHistory)this.events.shift();this.event(e);}
 cancelCharge(){const suppress=this.held||this.charging;this.charging=false;this.charge=0;this.full=false;this.held=false;this.preview=null;this.suppressed=suppress;}
 cancel(){if(this.anchor)this.remove(this.anchor);this.cancelCharge();this.emit('cancel');}
 remove(star){this.stars=this.stars.filter(s=>s!==star);if(this.anchor===star)this.anchor=null;}
 begin(){this.resolution=null;this.failure=0;if(this.anchor)this.remove(this.anchor);this.charging=true;this.charge=0;this.full=false;this.previewClock=0;this.emit('charge');}
 throw(){if(!this.charging)return;const tier=this.full&&this.cooldown<=0?'full':'early',c=this.config[tier],position=this.origin().clone(),dir=this.aim().clone().sub(position).normalize();this.charging=false;this.preview=null;if(tier==='early'&&this.stars.filter(s=>s.tier==='early').length>=this.config.collision.maxEarlyStars)this.remove(this.stars.find(s=>s.tier==='early'));const star={id:++this.sequence,tier,position,origin:position.clone(),dir,travelled:0,age:0,stationaryAge:0,state:'flying',radius:c.radius,passed:new Set(),surface:null};this.stars.push(star);if(tier==='full')this.anchor=star;this.throws++;this.emit('throw',{star,tier});}
 input(held,dt,dashing=false){if(!held)this.suppressed=false;if(dashing&&this.config.charge.dashCancels&&this.charging)this.cancelCharge();if(held&&!this.held&&!this.suppressed)this.begin();if(held&&this.charging){this.charge=Math.min(this.config.charge.fullSeconds,this.charge+dt);if(!this.full&&this.charge>=this.config.charge.fullSeconds&&this.cooldown<=0){this.full=true;this.flash=this.config.feedback.flashSeconds;this.emit('full');}}if(!held&&this.held&&this.charging)this.throw();this.held=held;}
 predict(){
  const from=this.origin().clone(),c=this.full?this.config.full:this.config.early;
  const dir=this.aim().clone().sub(from).normalize(),far=from.clone().addScaledVector(dir,c.range);
  const solid=this.world.flightSolid(from,far,c.radius,this.full||c.pierces);
  const end=solid?new THREE.Vector3().copy(solid.point):far,hits=this.world.enemies(from,end,c.radius);
  if(this.full&&hits.length){
   const hit=hits[0];this.preview={from,end:new THREE.Vector3().copy(hit.point),hits:[hit],landing:this.world.rearLanding(hit.unit,hit.point),forbidden:false};return;
  }
  const first=!c.pierces&&hits[0],endpoint=first?new THREE.Vector3().copy(first.point):end;
  const virtual={position:endpoint,origin:from,dir,radius:c.radius,travelled:from.distanceTo(endpoint),surface:first?null:solid};
  const forbidden=this.world.forbidden(virtual.surface),landing=forbidden?{valid:false,point:endpoint,reason:'unteleportable surface',samples:[]}:this.world.resolve(virtual);
  this.preview={from,end:endpoint,hits:c.pierces?hits:hits.slice(0,1),landing,forbidden};
 }
 update(dt,{held=false,dashing=false}={}){this.cooldown=Math.max(0,this.cooldown-dt);this.failure=Math.max(0,this.failure-dt);this.flash=Math.max(0,this.flash-dt);if(this.crosscutTarget&&!this.crosscutTarget.alive)this.crosscutTarget=null;this.input(held,dt,dashing);if(this.charging){this.previewClock-=dt;if(this.previewClock<=0){this.predict();this.previewClock=this.config.preview.intervalSeconds;}}
  for(const star of [...this.stars]){const c=this.config[star.tier];star.age+=dt;
   if(star.state==='lodged'){
    star.stationaryAge+=dt;
    if(!star.host.alive||star.host.hidden||star.stationaryAge>=c.markSeconds){this.emit('expired',{star});this.remove(star);}
    else star.host.entity.root.localToWorld(star.position.copy(star.localPoint));
    continue;
   }
   if(star.state==='stationary'){star.stationaryAge+=dt;if(star.stationaryAge>=c.stickSeconds){this.emit('expired',{star});this.remove(star);}continue;}if(star.tier==='full'&&star.age>=c.flightSeconds){this.emit('expired',{star});this.remove(star);continue;}
   const distance=Math.min(c.speed*dt,c.range-star.travelled),to=star.position.clone().addScaledVector(star.dir,Math.max(0,distance)),solid=this.world.flightSolid(star.position,to,c.radius,star.tier==='full'||c.pierces),limit=solid?.t??1,hits=[...this.world.enemies(star.position,to,c.radius),this.world.traceThreat?.(star.position,to,c.radius)].filter(Boolean).sort((a,b)=>a.t-b.t);let stopped=false;
   for(const hit of hits){if(hit.t>limit+1e-7||hit.unit&&star.passed.has(hit.unit))continue;if(hit.unit)star.passed.add(hit.unit);this.hit(hit,c.pierces?c.pierceDamage:c.damage,'charged-shuriken');
    if(star.tier==='full'&&hit.unit){
     star.position.copy(hit.point);star.state='lodged';star.host=hit.unit;
     star.localPoint=hit.unit.entity.root.worldToLocal(star.position.clone());
     if(hit.unit.alive)this.emit('lodged',{star});else this.remove(star);
     stopped=true;break;
    }
    if(star.tier==='early'&&!c.pierces){star.travelled+=star.position.distanceTo(hit.point);star.position.copy(hit.point);if(star.tier==='full'){star.state='stationary';star.stationaryAge=0;this.emit('stationary',{star});}else this.remove(star);stopped=true;break;}}if(stopped)continue;
   const endpoint=solid?new THREE.Vector3().copy(solid.point):to;star.travelled+=star.position.distanceTo(endpoint);star.position.copy(endpoint);if(solid||star.travelled>=c.range-1e-6){if(solid)this.hit(solid,c.damage,'shuriken');if(star.tier==='early'){this.remove(star);continue;}if(this.world.forbidden(solid)){this.failure=this.config.feedback.failSeconds;this.resolution={valid:false,point:star.position.clone(),reason:'unteleportable surface',samples:[]};this.emit('blocked',{star});this.remove(star);continue;}star.state='stationary';star.surface=solid||null;star.stationaryAge=0;this.emit('stationary',{star});}
  }
 }
 teleport(){const star=this.anchor;if(!star){this.emit('unavailable');return false;}if(star.host&&!star.host.alive){this.remove(star);this.emit('expired',{star});return false;}
  if(star.host)star.host.entity.root.localToWorld(star.position.copy(star.localPoint));
  const result=star.host?this.world.rearLanding(star.host,star.position):this.world.resolve(star);this.resolution=result;if(!result.valid){this.failure=this.config.feedback.failSeconds;this.failures++;this.emit('failed',{point:result.point,reason:result.reason});return false;}
  const from=this.onTeleport(result.point.clone(),this.config.arrival);this.cooldown=this.config.cooldownSeconds;this.teleports++;this.remove(star);this.emit('teleport',{from,to:result.point.clone()});
  this.crosscutTarget=star.host||null;
  if(star.host)this.emit('behind',{target:star.host.entity.root.getWorldPosition(new THREE.Vector3()).setY(star.position.y)});
  return true;
 }
 dashStrike(hit){
  if(!hit.unit||hit.unit!==this.crosscutTarget)return null;
  this.crosscutTarget=null;
  const target=hit.unit.entity.root.getWorldPosition(new THREE.Vector3());
  const c=this.config.arrival,result=this.hit(hit,c.damage*c.backstabMultiplier,'arrival-strike');
  this.strikes++;this.backstabs++;
  this.emit('backstab',{target,point:hit.point,dash:true});
  return result;
 }
 get state(){return this.charging?(this.full?'full-ready':'charging'):this.anchor?this.anchor.state:this.cooldown>0?'cooldown':'idle';}
 diagnostics(){return{state:this.state,charge:this.charge,full:this.full,cooldown:this.cooldown,throws:this.throws,teleports:this.teleports,failures:this.failures,strikes:this.strikes,backstabs:this.backstabs,anchor:this.anchor?{position:this.anchor.position.toArray(),state:this.anchor.state,passed:[...this.anchor.passed].map(u=>u.id),remaining:this.anchor.host?this.config.full.markSeconds-this.anchor.stationaryAge:this.anchor.state==='stationary'?this.config.full.stickSeconds-this.anchor.stationaryAge:this.config.full.flightSeconds-this.anchor.age}:null,landing:this.resolution?{valid:this.resolution.valid,point:this.resolution.point.toArray(),reason:this.resolution.reason,samples:this.resolution.samples.map(s=>({point:s.point.toArray(),valid:s.valid,reason:s.reason,type:s.type}))}:null};}
}
