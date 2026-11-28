import * as THREE from './vendor/three.module.js';
import {CHANNELS,READY,POSES,EASE,blend,track,sweepKeys,overheadKeys,waveKeys,DEATH_KEYS} from './astra-ronin-poses.js?v=472';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const RIBBON=22,TRAIL_LIFE=.17;
// Mecha weight comes from damped springs on every channel: [angular frequency, damping ratio].
// Heavy pelvis, quick weapon chain, lagging head and wing binders for follow-through.
const TUNE={frameP:[10,.78],frameR:[10,.7],hips:[13,.7],torso:[12,.6],neck:[10,.55],head:[8.5,.5],
 'right-upper-arm':[15,.58],'left-upper-arm':[12,.64],'right-lower-arm':[17,.56],'left-lower-arm':[14,.62],'right-wrist':[20,.55],'left-wrist':[20,.55],
 sword:[17,.5],wings:[6.5,.42],thrusters:[9,.72],shield:[11,.65]};
// During strikes the weapon chain and torso stiffen so the blade lands on the gameplay frame.
const SNAP=new Set(['frameP','frameR','hips','torso','right-upper-arm','right-lower-arm','right-wrist','sword','left-upper-arm','left-lower-arm']);
const JOINTS=['hips','torso','neck','head','right-upper-arm','right-lower-arm','right-wrist','sword','left-upper-arm','left-lower-arm','left-wrist'];
class Spring{
 constructor(){this.x=[0,0,0];this.v=[0,0,0];this.ready=false;}
 set(t){for(let i=0;i<3;i++){this.x[i]=t[i];this.v[i]=0;}this.ready=true;}
 step(t,dt,w,z){if(!this.ready){this.set(t);return this.x;}const n=Math.max(1,Math.ceil(dt*240)),h=dt/n,x=this.x,v=this.v;
  for(let k=0;k<n;k++)for(let i=0;i<3;i++){v[i]+=(w*w*(t[i]-x[i])-2*z*w*v[i])*h;x[i]+=v[i]*h;}return x;}
}
const euler=new THREE.Euler(),quat=new THREE.Quaternion();
export class RoninAnimation{
 constructor(model){this.m=model;this.feet=[];this.history=[];
  const geometry=new THREE.BufferGeometry();this.vertices=new Float32Array(RIBBON*6*3);this.colors=new Float32Array(RIBBON*6*3);
  geometry.setAttribute('position',new THREE.BufferAttribute(this.vertices,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3).setUsage(THREE.DynamicDrawUsage));
  // Additive, vertex-coloured smear: bright at the blade, fading to nothing along the trail.
  this.ribbon=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false}));this.ribbon.name='Ronin sword motion ribbon';this.ribbon.frustumCulled=false;model.root.add(this.ribbon);
  this.warning=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#ffb34d',transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));this.warning.name='Ronin dash path warning';this.warning.rotation.x=-Math.PI/2;this.warning.position.y=.08;model.root.add(this.warning);
  this.areaFill=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:'#ffb34d',transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));
  this.areaRim=new THREE.Mesh(new THREE.RingGeometry(.97,1,64),new THREE.MeshBasicMaterial({color:'#ffb34d',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
  this.areaImpact=new THREE.Mesh(new THREE.RingGeometry(.94,1,64),new THREE.MeshBasicMaterial({color:'#9cfaff',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  for(const mesh of[this.areaFill,this.areaRim,this.areaImpact]){mesh.rotation.x=-Math.PI/2;mesh.name='Ronin predicted sword strike area';mesh.frustumCulled=false;model.root.add(mesh);}
  this.streaks=Array.from({length:3},(_,i)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,1),new THREE.MeshBasicMaterial({color:'#83efff',transparent:true,opacity:.45,depthWrite:false}));mesh.position.set((i-1)*.9,2+i*.65,-2.5);model.root.add(mesh);return mesh;});
  const c=model.config;this.sweepKeys=sweepKeys(c.swordWindup,c.swordSwing,c.swordRecovery);this.overheadKeys=overheadKeys(c.swordWindup,c.swordSwing,c.swordRecovery);this.waveKeys=c.waveWindup?waveKeys(c):null;
  this.springs=Object.fromEntries(CHANNELS.map(id=>[id,new Spring()]));this.legSprings={left:new Spring(),right:new Spring()};this.legPitch={left:new Spring(),right:new Spring()};
  this.target={};this.reset();}
 reset(){this.m.propulsion?.clear();this.feet=[];this.phase=.25;this.lastPosition=null;this.lastYaw=null;this.yawRate=0;this.moveBlend=0;this.history.length=0;this.ribbon.visible=false;this.attackWasActive=false;this.glide=false;
  for(const s of Object.values(this.springs||{}))s.ready=false;for(const group of[this.legSprings,this.legPitch])for(const s of Object.values(group||{}))s.ready=false;
  this.prev={flinch:0,blocked:0,stage:null,flying:false,swordAge:0,struck:false};this.deathT=0;this.cancelDash();}
 cancelDash(){this.comboPose=null;this.warning.visible=false;this.areaFill.visible=this.areaRim.visible=this.areaImpact.visible=false;for(const s of this.streaks)s.visible=false;this.history.length=0;this.ribbon.visible=false;}
 // Successive combo dashes coil straight out of the previous slash; the springs carry the momentum.
 beginComboWindup(){this.cancelDash();this.comboPose=true;}
 kick(channel,i,velocity){const s=this.springs[channel];if(s?.ready)s.v[i]+=velocity;}
 // Pose a full target directly (no springs): used by defeat snapshots and the pose lab.
 applyPose(pose){const m=this.m,p=m.parts;for(const [node,bind]of m.bind){node.position.copy(bind.p);node.quaternion.copy(bind.q);}this.applyChannels(pose,0);}
 applyChannels(x,time){const m=this.m,p=m.parts,frame=m.frame,bind=m.bind.get(frame);
  frame.position.copy(bind.p).add(V(...x.frameP));frame.quaternion.setFromEuler(euler.set(...x.frameR));
  for(const id of JOINTS){const node=p[id];if(!node)continue;node.quaternion.copy(m.bind.get(node).q).multiply(quat.setFromEuler(euler.set(...x[id])));}
  // Wing binders fold back along the pack at rest (spread 0) and swing out into an open fan (spread 1).
  const w=x.wings,flutter=Math.sin(time*9)*.04*w[2];
  for(const [side,s]of[['left',-1],['right',1]]){const wing=p[side+'-wing'];if(wing){wing.quaternion.copy(m.bind.get(wing).q).multiply(quat.setFromEuler(euler.set(-w[1]*.5,s*(.95-w[0]*1.05),-s*(w[0]*.14+flutter))));}
   const pod=p[side+'-thruster'];if(pod)pod.quaternion.copy(m.bind.get(pod).q).multiply(quat.setFromEuler(euler.set(x.thrusters[0],0,0)));}
 }
 update(dt,time,e){const m=this.m,p=m.parts,root=m.root,c=e.config;dt=Math.min(dt,.1);
  for(const [node,bind]of m.bind){node.position.copy(bind.p);node.quaternion.copy(bind.q);}
  const attack=!!e.swordState,dash=attack&&e.dashAttack,stage=e.dashStage,clock=e.dashClock||0,flight=e.flight,stunned=e.stunRemaining>0,guarding=!attack&&!flight?e.guardWeight||0:0;
  const traveled=this.lastPosition?root.position.distanceTo(this.lastPosition):0;this.lastPosition=root.position.clone();
  const yaw=root.rotation.y;if(this.lastYaw!==null&&dt>0){const d=Math.atan2(Math.sin(yaw-this.lastYaw),Math.cos(yaw-this.lastYaw));this.yawRate=THREE.MathUtils.damp(this.yawRate,d/dt,6,dt);}this.lastYaw=yaw;
  const moving=e.moving&&!attack&&!stunned&&!flight;this.moveBlend=THREE.MathUtils.damp(this.moveBlend,moving?1:0,7,dt);if(moving)this.phase+=Math.min(traveled,.9)/7.4;
  // ---- base layer: heroic idle stance blended into the walking carriage, gait cycle on top.
  const T=blend(READY,POSES.WALK,this.moveBlend,this.target),mb=this.moveBlend,idle=1-mb;
  const cycle=this.phase*Math.PI*2,stride=Math.sin(cycle)*mb,pump=Math.cos(cycle)*mb;
  T.frameP[1]+=Math.cos(cycle*2)*.075*mb+Math.sin(time*1.55)*.035*idle;T.frameP[0]+=Math.sin(cycle)*.1*mb+Math.sin(time*.41)*.08*idle;
  T.frameR[2]-=stride*.035;T.frameR[1]+=Math.sin(time*.41)*.05*idle;T.hips[1]+=stride*.16;T.hips[2]+=stride*.04;
  T.torso[1]-=stride*.15;T.torso[2]+=stride*.03;T.torso[0]+=Math.sin(time*1.55+.8)*.02*idle;T.head[1]+=stride*.06;
  T['right-upper-arm'][0]-=pump*.46;T['left-upper-arm'][0]+=pump*.22;T['right-lower-arm'][0]-=Math.max(0,-pump)*.25;T['left-lower-arm'][0]-=Math.max(0,pump)*.12;
  T.wings[2]=mb*.5;
  // ---- action layer
  let snap=0,lock=.85,tremble=0;
  if(dash){const Wd=e.dashWindupDuration||c.dashWindup,S=c.swordSwing,Rd=c.dashRecovery;
   if(stage==='windup'){const u=clamp(clock/Wd,0,1);blend(T,POSES.DASH_COIL,1,T);T.frameP[1]+=.3*Math.sin(Math.min(1,u/.28)*Math.PI)*(e.dashComboIndex>1?.4:1)-.18*u*u;tremble=Math.max(0,(u-.62)/.38);}
   else if(stage==='dash'){blend(T,POSES.DASH_RUN,1,T);snap=.7;lock=.4;T.frameR[2]+=Math.sin(time*13)*.025;}
   else if(stage==='slash'){blend(POSES.DASH_RUN,POSES.DASH_SLASH,EASE.out(clamp(clock/(S*.8),0,1)),T);snap=1;lock=.4;}
   else track([[0,POSES.DASH_SLASH],[Rd*.18,POSES.DASH_SKID,'out'],[Rd*.55,POSES.DASH_SKID],[Rd,READY,'inout']],clock,T);
  }else if(attack&&e.waveAttack&&this.waveKeys){const t=e.waveClock||0,W=c.waveWindup,S=c.waveSwing,I=c.waveVolleyInterval;track(this.waveKeys,t,T);
   snap=t>=W-.06&&t<W+S+.1||t>=W+I-.06&&t<W+I+S+.1?1:0;tremble=t<W?clamp((t-W*.55)/(W*.45),0,1):0;
  }else if(attack){const W=c.swordWindup,S=c.swordSwing,age=e.swordAge||0;track(e.overhead?this.overheadKeys:this.sweepKeys,age,T);
   snap=age>=W-.06&&age<W+S+.16?1:0;tremble=age<W?clamp((age-W*.7)/(W*.3),0,1):0;
   const hit=W+S*.5;if(this.prev.swordAge<hit&&age>=hit){this.kick('frameP',1,e.overhead?-4.5:-2.5);this.kick('torso',0,e.overhead?3:1.5);}
  }else if(flight){lock=.45;const speed=clamp((flight.speed||0)/c.flightSpeed,0,1);
   if(flight.phase==='takeoff')blend(POSES.FLIGHT_TAKEOFF,POSES.FLIGHT_HOVER,smooth(flight.age/c.flightTakeoffTime),T);
   else blend(POSES.FLIGHT_HOVER,POSES.FLIGHT_CRUISE,flight.phase==='landing'?speed*.6:speed,T);
   const bank=clamp(-this.yawRate*.38,-.5,.5);T.frameR[2]+=bank;T.torso[2]+=bank*.4;T.head[2]-=bank*.5;
   T.frameP[1]+=Math.sin(time*2.3)*.09;T.frameR[0]+=Math.sin(time*1.7)*.03;T.wings[2]=1;
  }
  if(guarding>0)blend(T,POSES.GUARD,smooth(guarding),T);
  if(stunned){blend(T,POSES.STUN,1,T);lock=0;snap=0;}
  // ---- head locks on: the eyes stay on the target while the body coils and unwinds.
  if(lock>0&&e.lastSeen&&!e.dead){const local=root.worldToLocal(e.lastSeen.clone()),yawTo=Math.atan2(local.x,local.z),pitchTo=Math.atan2(9.5-local.y,Math.max(2,Math.hypot(local.x,local.z)));
   T.head[1]=THREE.MathUtils.lerp(T.head[1],clamp(yawTo-T.frameR[1]-T.torso[1]-T.hips[1],-1.15,1.15),lock);
   T.head[0]=THREE.MathUtils.lerp(T.head[0],clamp(pitchTo-T.frameR[0]-T.torso[0],-.45,.55),lock*.55);}
  // ---- impulses: hits, blocks, touchdown, dash arrest
  if(e.flinch>this.prev.flinch+.01){const side=Math.sin(time*7.3)>0?1:-1;this.kick('torso',0,-7.5);this.kick('torso',2,2.5*side);this.kick('head',0,-9);this.kick('frameP',2,-3.2);this.kick('frameR',1,1.6*side);this.kick('right-upper-arm',2,3);this.kick('left-upper-arm',2,-3);}
  if((e.blockedHits||0)>this.prev.blocked){this.kick('torso',0,-4);this.kick('left-upper-arm',0,6);this.kick('frameP',2,-3);this.kick('frameP',1,-1.5);}
  if(this.prev.flying&&!flight){this.kick('frameP',1,-7);this.kick('torso',0,3);}
  if(this.prev.stage==='dash'&&stage!=='dash'){this.kick('frameP',2,3.5);this.kick('torso',0,3);}
  // ---- springs
  const x={};for(const id of CHANNELS){const [w,z]=TUNE[id],k=SNAP.has(id)?1+snap*1.5:1;x[id]=this.springs[id].step(T[id],dt,w*k,z);}
  if(tremble>0||stunned){const a=stunned?.02:.012*tremble,f=stunned?23:41;x.frameP=[x.frameP[0]+Math.sin(time*f)*a,x.frameP[1]+Math.sin(time*f*1.3)*a,x.frameP[2]];x.torso=[x.torso[0]+Math.sin(time*f*1.1+1)*a*1.5,x.torso[1]+Math.sin(time*f*.9)*a,x.torso[2]];x.sword=[x.sword[0]+Math.sin(time*f*1.2+2)*a*2,x.sword[1],x.sword[2]];}
  this.applyChannels(x,time);root.updateWorldMatrix(true,true);
  // ---- legs: planted stance with steps on the ground, sprung leg targets while boosting or flying.
  const glide=!!flight||dash&&(stage==='dash'||stage==='slash');
  if(glide&&T.legs){if(!this.glide){this.glide=true;this.feet=[];for(const side of['left','right']){const foot=root.worldToLocal(p[side+'-foot'].getWorldPosition(V()));this.legSprings[side].set([foot.x,foot.y,foot.z]);this.legPitch[side].set([0,0,0]);}}
   for(const side of['left','right']){const t=T.legs[side],pos=this.legSprings[side].step(t,dt,11,.7),pitch=this.legPitch[side].step([t[3],0,0],dt,9,.7);this.solveLeg(side,V(pos[0],pos[1],pos[2]),pitch[0]);}
  }else{if(this.glide){this.glide=false;this.plantFeet();}this.updateFeet(dt,moving,T.feet,attack||guarding>0?.17:.24);}
  root.updateWorldMatrix(true,true);
  this.articulateSegments(e);this.followArmor();root.updateWorldMatrix(true,true);
  this.orientShield(x.shield,smooth(guarding));m.updateShieldVisual(e);
  m.energy.emissiveIntensity=dash&&stage==='windup'?2.8+Math.pow(clock/(e.dashWindupDuration||c.dashWindup),2)*(2.4+Math.sin(time*35)):attack&&!e.waveAttack&&(e.swordAge||0)<c.swordWindup?2.6+Math.pow((e.swordAge||0)/c.swordWindup,2)*(2+Math.sin(time*30)*.8):flight?3.2:2.6;
  // Neon traces pulse with time; the magenta trim stutters now and then like an old sign.
  m.cyberTime.value=time;const stutter=Math.sin(time*.73)*Math.sin(time*1.91);m.neon.emissiveIntensity=3.4*(stutter>.93?.3+.7*(Math.sin(time*57)>0):1);
  // Scarf streams out behind as the body moves fast (boost, flight, lunges) and swings with turns.
  const speed=dt>0?traveled/dt:0,streaming=flight||dash&&stage==='dash'?1:clamp((speed-6)/22,0,1);this.stream=THREE.MathUtils.damp(this.stream||0,streaming,streaming>(this.stream||0)?6:2.2,dt);
  m.underglow.material.uniforms.uPower.value=THREE.MathUtils.damp(m.underglow.material.uniforms.uPower.value,flight||e.dead?0:1,flight?10:3,dt);const scarf=m.scarf.userData.scarf;scarf.uStream.value=this.stream;scarf.uSway.value.set(THREE.MathUtils.damp(scarf.uSway.value.x,clamp(-this.yawRate*.5,-1.2,1.2),4,dt),THREE.MathUtils.damp(scarf.uSway.value.y,clamp(-(x.frameP[2]-READY.frameP[2])*1.5,-1,1),4,dt));
  m.propulsion.update(dt,time,e);
  this.warning.visible=dash&&stage==='windup'&&!stunned;
  const area=e.dashArea;
  if(area){const end=root.worldToLocal((e.dashEnd||area.center).clone()),yawTo=Math.atan2(end.x,end.z);this.warning.quaternion.setFromAxisAngle(V(0,1,0),yawTo).multiply(new THREE.Quaternion().setFromAxisAngle(V(1,0,0),-Math.PI/2));this.warning.position.set(end.x*.5,.08,end.z*.5);this.warning.scale.set(c.dashWarningWidth/root.scale.x,Math.max(1,Math.hypot(end.x,end.z)),1);this.warning.material.color.set(area.locked?'#ff3949':'#ffb34d');}
  else{this.warning.scale.set(c.dashWarningWidth/root.scale.x,Math.max(1,(e.dashLength||1)/root.scale.z),1);this.warning.position.z=(e.dashLength||1)/root.scale.z*.5;}
  this.warning.material.opacity=.14+.1*(.5+.5*Math.sin(time*18));
  this.updateDashArea(e,time);
  for(const [i,streak]of this.streaks.entries()){streak.visible=(dash&&stage==='dash'||flight&&flight.phase==='cruise')&&!stunned;streak.scale.z=3+i;}
  const W=c.swordWindup,S=c.swordSwing,age=e.swordAge||0,wt=e.waveClock||0,ww=c.waveWindup,wi=c.waveVolleyInterval,ws=c.waveSwing;
  const active=attack&&(dash?stage==='slash'||stage==='recovery'&&clock<.06:e.waveAttack?wt>=ww-.02&&wt<ww+ws+.08||wt>=ww+wi-.02&&wt<ww+wi+ws+.08:age>=W-.02&&age<W+S+.1)&&!stunned;
  // The plasma edge charges through the wave windup and flares on each release.
  m.plasma.emissiveIntensity=e.waveAttack&&attack?(wt<ww?4.2+5*Math.pow(wt/ww,2)*(1+.25*Math.sin(time*40)):active?9:4.6):active?7:4.2;
  // Plasma sheath breathes at rest, builds through every windup and blazes through the cut.
  const charge=attack?(dash?(stage==='windup'?clock/(e.dashWindupDuration||c.dashWindup):1):e.waveAttack?Math.min(1,wt/ww):Math.min(1,age/W)):0;
  m.sheath.uniforms.uPower.value=THREE.MathUtils.damp(m.sheath.uniforms.uPower.value,stunned?.1:active?2.4:.38+charge*charge*1.5+Math.sin(time*2.1)*.06,active?30:8,dt);
  this.updateRibbon(dt,active,e);this.attackWasActive=attack;
  Object.assign(this.prev,{flinch:e.flinch||0,blocked:e.blockedHits||0,stage:dash?stage:null,flying:!!flight,swordAge:attack&&!dash&&!e.waveAttack?age:0});
 }
 updateRibbon(dt,active,e){const m=this.m,root=m.root;
  if(active){const tip=root.worldToLocal(m.tip.getWorldPosition(V()));this.history.unshift({base:root.worldToLocal(m.bladeBase.getWorldPosition(V())).lerp(tip,.38),tip,age:0});}
  for(const h of this.history)h.age+=dt;this.history=this.history.filter(h=>h.age<TRAIL_LIFE).slice(0,RIBBON+1);
  let index=0;const cyan=[1,.32,.88];
  for(let i=1;i<this.history.length;i++){const a=this.history[i-1],b=this.history[i],fa=Math.max(0,1-a.age/TRAIL_LIFE)*(1-(i-1)/RIBBON),fb=Math.max(0,1-b.age/TRAIL_LIFE)*(1-i/RIBBON);
   // The band starts partway up the blade and its inner edge dims: a crescent along the cutting edge.
   for(const [v,f]of[[a.base,fa*.25],[a.tip,fa],[b.tip,fb],[a.base,fa*.25],[b.tip,fb],[b.base,fb*.25]]){this.vertices[index]=v.x;this.vertices[index+1]=v.y;this.vertices[index+2]=v.z;this.colors[index]=cyan[0]*f;this.colors[index+1]=cyan[1]*f;this.colors[index+2]=cyan[2]*f;index+=3;}}
  const g=this.ribbon.geometry;g.setDrawRange(0,index/3);g.attributes.position.needsUpdate=true;g.attributes.color.needsUpdate=true;this.ribbon.visible=index>0&&!e.dead;
 }
 updateDashArea(e,time){const root=this.m.root,area=e.dashArea,active=!!area&&e.dashAttack&&!e.stunRemaining&&!e.dead,show=active&&['windup','dash','slash'].includes(e.dashStage);this.areaFill.visible=this.areaRim.visible=show;
  const impactTime=e.dashStage==='slash'?e.dashClock-e.config.swordSwing*.25:e.dashStage==='recovery'?e.config.swordSwing*.75+e.dashClock:-1;this.areaImpact.visible=active&&impactTime>=0&&impactTime<.35;if(!show&&!this.areaImpact.visible)return;
  const center=root.worldToLocal(area.center.clone()),radius=area.radius/root.scale.x;for(const mesh of[this.areaFill,this.areaRim,this.areaImpact])mesh.position.copy(center);
  this.areaFill.scale.setScalar(radius);this.areaRim.scale.setScalar(radius);const color=area.locked?'#ff3949':'#ffb34d';this.areaFill.material.color.set(color);this.areaRim.material.color.set(color);this.areaFill.material.opacity=.13+Math.sin(time*12)*.025;this.areaRim.material.opacity=area.locked?.95:.65;
  this.areaImpact.scale.setScalar(radius*(.15+.85*smooth(impactTime/.22)));this.areaImpact.material.opacity=.95*(1-Math.max(0,impactTime)/.35);
 }
 articulateSegments(e={}){const p=this.m.parts;
  for(const [side,sign]of[['left',-1],['right',1]]){
   const arm=p[side+'-upper-arm'],fore=p[side+'-lower-arm'],shin=p[side+'-lower-leg'],bend=Math.abs(new THREE.Euler().setFromQuaternion(shin.quaternion).x),slashTime=e.dashAttack?(e.dashStage==='slash'?e.dashClock:-1):(e.swordAge||0)-(e.config?.swordWindup||0),strike=e.swordState&&slashTime>=0&&slashTime<e.config.swordSwing?Math.sin(slashTime/e.config.swordSwing*Math.PI):0;
   const armE=new THREE.Euler().setFromQuaternion(arm.quaternion),foreE=new THREE.Euler().setFromQuaternion(fore.quaternion),shinE=new THREE.Euler().setFromQuaternion(shin.quaternion);
   p[side+'-bicep'].rotation.y=armE.y*.2;
   p[side+'-forearm-shell'].rotation.y=armE.y*.12;
   p[side+'-elbow-guard'].rotation.x=-foreE.x*.4;
   if(side==='right'){const w=p[side+'-wrist'];w.quaternion.multiply(quat.setFromEuler(euler.set(strike*.09,armE.y*.06,sign*strike*.035)));}
   p[side+'-thigh-armor'].rotation.y=-new THREE.Euler().setFromQuaternion(p[side+'-upper-leg'].quaternion).y*.2;
   p[side+'-knee-guard'].rotation.x=-shinE.x*.45;
   p[side+'-knee-guard'].position.z=this.m.bind.get(p[side+'-knee-guard']).p.z+Math.sin(bend)*.09;
   p[side+'-shin-cuff'].position.y=this.m.bind.get(p[side+'-shin-cuff']).p.y+Math.min(.1,bend*.06);
   p[side+'-toe'].rotation.x=e.moving?-Math.max(0,new THREE.Euler().setFromQuaternion(p[side+'-upper-leg'].quaternion).x)*.3:0;
  }
 }
 // Shoulder armour counter-rotates so fins clear the helmet; front skirts ride up with the thighs.
 followArmor(){const p=this.m.parts,down=V(0,-1,0);
  for(const side of['left','right']){const arm=new THREE.Euler().setFromQuaternion(p[side+'-upper-arm'].quaternion);p[side+'-shoulder'].rotation.set(-arm.x*.32,0,-arm.z*.18);
   const thigh=down.clone().applyQuaternion(p[side+'-upper-leg'].quaternion),forward=Math.atan2(thigh.z,-thigh.y);p[side+'-skirt'].rotation.x=-.1-Math.max(0,forward)*.85;p[side+'-skirt'].rotation.z=(side==='left'?-1:1)*Math.max(0,Math.abs(thigh.x)-.2)*.6;}
 }
 // The shield pivots on its forearm mount toward the body's front; a raised guard squares it fully.
 orientShield(channel,guard=0){const m=this.m,shield=m.parts.shield,root=m.root,weight=THREE.MathUtils.lerp(clamp(channel[0],0,1),1,guard),yaw=channel[1]*(1-guard),pitch=channel[2]*(1-guard);
  if(weight<=0)return;const world=root.getWorldQuaternion(new THREE.Quaternion()).multiply(quat.setFromEuler(euler.set(pitch,yaw,0))),facing=shield.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world);
  shield.quaternion.copy(m.bind.get(shield).q).slerp(facing,weight);root.updateWorldMatrix(true,true);}
 beginDefeat(){this.m.propulsion.clear();this.cancelDash();this.history.length=0;this.ribbon.visible=false;this.deathT=0;}
 defeat(t){t=clamp(t,0,1);const m=this.m,root=m.root,dt=clamp((t-this.deathT)*m.config.collapseDuration,0,.1);this.deathT=t;
  for(const [node,bind]of m.bind){node.position.copy(bind.p);node.quaternion.copy(bind.q);}
  const T=track(DEATH_KEYS,t,this.target),x={};for(const id of CHANNELS){const [w,z]=TUNE[id];x[id]=this.springs[id].step(T[id],dt,w*1.2,z);}
  this.applyChannels(x,0);root.updateWorldMatrix(true,true);if(this.glide){this.glide=false;this.plantFeet();}this.updateFeet(dt,false,T.feet,.3,true);
  this.articulateSegments();this.followArmor();root.updateWorldMatrix(true,true);this.orientShield(x.shield);m.energy.emissiveIntensity=2.6*(1-t);m.neon.emissiveIntensity=3.4*(1-t)*(Math.sin(t*90)>-.3?1:.2);m.sheath.uniforms.uPower.value=.4*(1-t);m.propulsion.clear();}
 plantFeet(){const m=this.m,root=m.root;root.updateWorldMatrix(true,true);const ground=root.localToWorld(V(0,.37,0)).y;
  this.feet=['left','right'].map(side=>{const point=m.parts[side+'-foot'].getWorldPosition(V());point.y=ground;return this.footState(point);});}
 footState(point){return{anchor:point.clone(),point:point.clone(),from:point.clone(),to:point.clone(),swing:false,step:null,settle:0,pitch:0,contact:point.clone(),solvedContact:point.clone()};}
 updateFeet(dt,moving,stance=READY.feet,stepTime=.24,planted=false){const m=this.m,root=m.root,stanceFrac=.6,strideLength=7.4,scale=root.scale.y;
  for(const [i,side]of ['left','right'].entries()){
   const sign=i?1:-1,phase=(this.phase+i*.5)%1,goal=stance?.[side]||READY.feet[side],ideal=root.localToWorld(V(goal[0],.37,goal[1]));let f=this.feet[i];
   if(!f)f=this.feet[i]=this.footState(ideal);
   if(moving){const swingPhase=phase>=stanceFrac;f.step=null;
    if(swingPhase&&!f.swing){f.from.copy(f.anchor);f.swingStart=phase;f.fromPitch=f.pitch;f.to.copy(root.localToWorld(V(sign*.8,.37,1.05+strideLength*(1-phase)/root.scale.z)));}
    if(swingPhase){const t=(phase-f.swingStart)/(1-f.swingStart);f.anchor.lerpVectors(f.from,f.to,smooth(t));f.anchor.y+=Math.sin(t*Math.PI)**2*.7*root.scale.y;f.pitch=THREE.MathUtils.lerp(f.fromPitch,-.12,smooth(t));}
    else{if(f.swing){f.anchor.copy(f.to);this.stomp(.6);}const t=phase/stanceFrac;f.pitch=t<.2?-.12*(1-smooth(t/.2)):.22*smooth((t-.75)/.25);}
    f.swing=swingPhase;
   }else{
    // Interrupted strides finish as a step; otherwise one foot at a time steps into the action's stance.
    if(f.swing){f.swing=false;f.step={from:f.anchor.clone(),to:ideal.clone(),t:0,dur:stepTime,lift:.45};}
    const other=this.feet[1-i];
    if(!planted&&!f.step&&f.anchor.distanceTo(ideal)>.3*scale&&!other?.step)f.step={from:f.anchor.clone(),to:ideal.clone(),t:0,dur:stepTime,lift:Math.min(.55,.18+f.anchor.distanceTo(ideal)/scale*.22)};
    if(f.step){const s=f.step;if(!planted)s.to.copy(ideal);s.t+=dt;const u=Math.min(1,s.t/s.dur);f.anchor.lerpVectors(s.from,s.to,smooth(u));f.anchor.y+=Math.sin(u*Math.PI)*s.lift*scale;f.pitch=-.2*Math.sin(u*Math.PI);if(u>=1){f.step=null;this.stomp(1);}}
    else f.pitch=THREE.MathUtils.damp(f.pitch,0,14,dt);
   }
   // Roll about the heel/toe contact instead of sliding a flat foot across the road.
   const pivot=V(0,-.36,f.pitch>=0?1.45:-.45),rotated=pivot.clone().applyAxisAngle(V(1,0,0),f.pitch),frame=root.getWorldQuaternion(new THREE.Quaternion()),offset=pivot.clone().sub(rotated).multiplyScalar(root.scale.y).applyQuaternion(frame);
   f.point.copy(f.anchor).add(offset);f.contact.copy(f.anchor).add(pivot.clone().multiplyScalar(root.scale.y).applyQuaternion(frame));
   this.solveLeg(side,root.worldToLocal(f.point.clone()),f.pitch);root.updateWorldMatrix(true,true);
   f.solvedContact.copy(m.parts[side+'-foot'].localToWorld(pivot.clone()));
  }
 }
 // Each footfall loads the pelvis: a small downward impulse sells the mass.
 stomp(strength){this.kick('frameP',1,-1.1*strength);this.kick('torso',0,.5*strength);}
 solveLeg(side,target,pitch=0){const p=this.m.parts,hip=p[side+'-upper-leg'],shin=p[side+'-lower-leg'],ankle=p[side+'-ankle'];this.m.root.updateWorldMatrix(true,true);
  const origin=hip.getWorldPosition(V()),goal=this.m.root.localToWorld(target.clone()),L1=shin.position.length()*this.m.root.scale.y,L2=ankle.position.length()*this.m.root.scale.y,delta=goal.clone().sub(origin),d=clamp(delta.length(),.2,L1+L2-.005),direction=delta.normalize(),frame=this.m.root.getWorldQuaternion(new THREE.Quaternion());
  const pole=V(0,0,1).applyQuaternion(frame);pole.addScaledVector(direction,-pole.dot(direction)).normalize();const along=(L1*L1-L2*L2+d*d)/(2*d),height=Math.sqrt(Math.max(0,L1*L1-along*along)),knee=direction.clone().multiplyScalar(along).addScaledVector(pole,height),upperWorld=new THREE.Quaternion().setFromUnitVectors(V(0,-1,0),knee.clone().normalize()),lowerWorld=new THREE.Quaternion().setFromUnitVectors(V(0,-1,0),direction.clone().multiplyScalar(d).sub(knee).normalize());
  hip.quaternion.copy(hip.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(upperWorld);shin.quaternion.copy(upperWorld.clone().invert()).multiply(lowerWorld);ankle.quaternion.copy(lowerWorld.clone().invert()).multiply(frame.multiply(new THREE.Quaternion().setFromAxisAngle(V(1,0,0),pitch)));p[side+'-foot'].quaternion.identity();
 }
}
