import * as THREE from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const READY={torso:[.05,-.15,-.025],head:[-.03,.15,0],'right-upper-arm':[-.12,.08,.18],'right-lower-arm':[-.42,0,0],sword:[.82,0,0],'left-upper-arm':[-.18,.05,-.18],'left-lower-arm':[-.65,.05,0]};
const SWEEP_WIND={torso:[-.07,.7,-.12],head:[.03,-.65,.06],'right-upper-arm':[-.85,1.15,-.6],'right-lower-arm':[-.42,0,0],sword:[.8,.2,0],'left-upper-arm':[-.55,-.15,-.16],'left-lower-arm':[-.85,0,0]};
const SWEEP_END={torso:[.25,-.7,.1],head:[-.12,.6,-.05],'right-upper-arm':[-.45,-1.1,-.2],'right-lower-arm':[-.08,0,0],sword:[.82,-.1,0],'left-upper-arm':[-.2,.1,-.18],'left-lower-arm':[-.7,0,0]};
const OVER_WIND={torso:[-.17,.25,-.04],head:[.05,-.2,0],'right-upper-arm':[-2.55,.1,-.2],'right-lower-arm':[-.8,0,0],sword:[.3,0,0],'left-upper-arm':[-.5,-.1,-.16],'left-lower-arm':[-.8,0,0]};
const OVER_END={torso:[.38,-.25,.06],head:[-.2,.2,0],'right-upper-arm':[-.4,-.16,-.1],'right-lower-arm':[.08,0,0],sword:[.85,0,0],'left-upper-arm':[-.2,.1,-.18],'left-lower-arm':[-.7,0,0]};
const DASH_WIND={torso:[.08,.65,-.14],head:[-.08,-.6,.06],'right-upper-arm':[-.65,2.2,-.4],'right-lower-arm':[-.8,0,0],sword:[.55,-.2,0],'left-upper-arm':[-.65,-.1,-.16],'left-lower-arm':[-.85,0,0]};
const FLIGHT_POSE={torso:[.32,0,-.025],head:[-.22,0,0],'right-upper-arm':[.1,1.5,-.25],'right-lower-arm':[-.38,0,0],sword:[.55,0,0],'left-upper-arm':[-.4,.05,-.22],'left-lower-arm':[-.65,0,0]};
const GUARD_POSE={torso:[.04,0,0],head:[-.02,0,0],'right-upper-arm':[.15,.1,-.18],'right-lower-arm':[-.25,0,0],sword:[.95,0,0],'left-upper-arm':[-.9,0,.8],'left-lower-arm':[-.5,0,.9]};
export class RoninAnimation{
 constructor(model){this.m=model;this.feet=[];this.history=[];const geometry=new THREE.BufferGeometry();this.vertices=new Float32Array(12*6*3);geometry.setAttribute('position',new THREE.BufferAttribute(this.vertices,3).setUsage(THREE.DynamicDrawUsage));this.ribbon=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#76edff',transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));this.ribbon.name='Ronin sword motion ribbon';this.ribbon.frustumCulled=false;model.root.add(this.ribbon);
  this.warning=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#ffb34d',transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));this.warning.name='Ronin dash path warning';this.warning.rotation.x=-Math.PI/2;this.warning.position.y=.08;model.root.add(this.warning);
  this.areaFill=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:'#ffb34d',transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));
  this.areaRim=new THREE.Mesh(new THREE.RingGeometry(.97,1,64),new THREE.MeshBasicMaterial({color:'#ffb34d',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
  this.areaImpact=new THREE.Mesh(new THREE.RingGeometry(.94,1,64),new THREE.MeshBasicMaterial({color:'#9cfaff',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  for(const mesh of[this.areaFill,this.areaRim,this.areaImpact]){mesh.rotation.x=-Math.PI/2;mesh.name='Ronin predicted sword strike area';mesh.frustumCulled=false;model.root.add(mesh);}
  this.streaks=Array.from({length:3},(_,i)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,1),new THREE.MeshBasicMaterial({color:'#83efff',transparent:true,opacity:.45,depthWrite:false}));mesh.position.set((i-1)*.9,2+i*.65,-2.5);model.root.add(mesh);return mesh;});this.reset();}
 reset(){this.feet=[];this.phase=.25;this.lastPosition=null;this.moveBlend=0;this.history.length=0;this.ribbon.visible=false;this.attackWasActive=false;this.cancelDash();}
 cancelDash(){this.warning.visible=false;this.areaFill.visible=this.areaRim.visible=this.areaImpact.visible=false;for(const s of this.streaks)s.visible=false;this.feet=[];this.history.length=0;this.ribbon.visible=false;}
 pose(a,b,t){for(const id of Object.keys(READY)){const x=a[id]||READY[id],y=b[id]||READY[id];this.m.parts[id].rotation.set(...x.map((v,i)=>THREE.MathUtils.lerp(v,y[i],t)));}}
 update(dt,time,e){const m=this.m,p=m.parts,root=m.root;dt=Math.min(dt,.1);for(const [node,bind]of m.bind){node.position.copy(bind.p);node.quaternion.copy(bind.q);}const attack=!!e.swordState,wind=e.config.swordWindup,swing=e.config.swordSwing,age=e.swordAge||0;
  const traveled=this.lastPosition?root.position.distanceTo(this.lastPosition):0;this.lastPosition=root.position.clone();const moving=e.moving&&!attack&&!e.stunRemaining;this.moveBlend=THREE.MathUtils.damp(this.moveBlend,moving?1:0,8,dt);if(moving)this.phase+=Math.min(traveled,.9)/7.4;
  this.pose(READY,READY,0);p.torso.rotation.y+=Math.sin(time*1.7)*.025;p.torso.position.y+=Math.sin(time*1.7)*.025;
  const cycle=this.phase*Math.PI*2,stride=Math.sin(cycle)*this.moveBlend,pump=Math.cos(cycle)*this.moveBlend;
  // Pelvis leads; chest and head counter-rotate, as in Volt Rush's anatomical gait.
  m.frame.position.y+=(-.16+Math.cos(cycle*2)*.055)*this.moveBlend;
  m.frame.position.x+=Math.sin(cycle)*.09*this.moveBlend;m.frame.rotation.z=-stride*.025;
  p.hips.rotation.y=stride*.12;p.hips.rotation.z=stride*.035;
  p.torso.rotation.y=THREE.MathUtils.lerp(p.torso.rotation.y,0,this.moveBlend)-stride*.14;
  p.torso.rotation.x+=.11*this.moveBlend;p.torso.rotation.z+=stride*.025;p.head.rotation.x-=.08*this.moveBlend;p.head.rotation.y+=stride*.07;
  p['left-upper-arm'].rotation.x+=pump*.4;p['right-upper-arm'].rotation.x-=pump*.48;
  p['left-lower-arm'].rotation.x-=Math.max(0,pump)*.2;p['right-lower-arm'].rotation.x-=Math.max(0,-pump)*.32;
  p.sword.rotation.x-=.24*this.moveBlend;

  let shift=0,crouch=0;
  if(attack){const windPose=e.overhead?OVER_WIND:SWEEP_WIND,endPose=e.overhead?OVER_END:SWEEP_END;
   if(age<wind){const t=smooth(age/wind);this.pose(READY,windPose,t);shift=-.18*t;crouch=.13*t;}
   else if(age<wind+swing){const t=smooth((age-wind)/swing);this.pose(windPose,endPose,t);shift=THREE.MathUtils.lerp(-.18,.3,t);crouch=THREE.MathUtils.lerp(.13,.38,t);}
   else{const t=smooth((age-wind-swing)/e.config.swordRecovery);this.pose(endPose,READY,t);shift=.3*(1-t);crouch=.38*(1-t);}
   m.frame.position.z+=shift;m.frame.position.y-=crouch;
  }
  const dash=attack&&e.dashAttack,stage=e.dashStage,clock=e.dashClock||0;
  if(dash){if(stage==='windup'){const t=smooth(clock/e.config.dashWindup);this.pose(READY,DASH_WIND,t);m.frame.position.y-=.48*t;m.frame.position.z-=.2*t;}
   else if(stage==='dash'){this.pose(DASH_WIND,DASH_WIND,0);p.torso.rotation.x+=.25;m.frame.position.y-=.55;m.frame.position.z+=.25;}
   else if(stage==='slash'){const t=smooth(clock/e.config.swordSwing);this.pose(DASH_WIND,SWEEP_END,t);m.frame.position.y-=.55;m.frame.position.z+=.4*t;}
   else{const t=smooth(clock/e.config.dashRecovery);this.pose(SWEEP_END,READY,t);m.frame.position.y-=.55*(1-t);m.frame.position.z+=.4*(1-t);}
  }
  const flight=e.flight;
  if(flight){const lift=flight.phase==='takeoff'?smooth(flight.age/e.config.flightTakeoffTime):1;this.pose(READY,FLIGHT_POSE,lift);m.frame.position.y-=.18*lift;m.frame.rotation.x=flight.phase==='cruise'?.06:0;p.torso.position.y+=Math.sin(time*4)*.025;}
  const guarding=e.guardWeight||0;if(guarding>0){this.pose(READY,GUARD_POSE,smooth(guarding));m.frame.position.y-=.12*guarding;}
  if(e.flinch>0){const recoil=Math.sin(clamp(e.flinch/.12,0,1)*Math.PI/2);p.torso.rotation.x-=recoil*.18;p.torso.rotation.z+=recoil*.07;p.head.rotation.x-=recoil*.12;}
  if(e.stunRemaining>0){m.frame.position.y-=.48;p.torso.rotation.x=.25;p.head.rotation.x=.2;p['right-upper-arm'].rotation.x=.15;p['left-upper-arm'].rotation.x=.1;}
  // Upper armor counter-rotates so shoulder fins clear the helmet at full lift.
  for(const side of['left','right']){p[side+'-shoulder'].rotation.x=-p[side+'-upper-arm'].rotation.x*.32;p[side+'-skirt'].rotation.x=-.12-Math.max(0,(side==='left'?stride:-stride))*.25;}
  root.updateWorldMatrix(true,true);
  if(flight){this.feet=[];for(const [i,side]of ['left','right'].entries())this.solveLeg(side,V(i?.95:-.95,.9,-.65+(i?.2:-.2)));}
  else if(dash&&stage!=='windup'){
   // Fast ground glide: feet travel with the rig instead of stretching back to old plants.
   const recover=stage==='recovery'?smooth(clock/e.config.dashRecovery):0;this.feet=[];
   for(const [i,side]of ['left','right'].entries()){const sign=i?1:-1;this.solveLeg(side,V(sign*1.05,.42,(i?-1.05:1.1)*(1-recover)));}
  }else this.updateFeet(dt,moving,attack);root.updateWorldMatrix(true,true);
  this.articulateSegments(e);root.updateWorldMatrix(true,true);
  if(guarding>0){const shield=p.shield,world=root.getWorldQuaternion(new THREE.Quaternion()),facing=shield.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world);shield.quaternion.copy(m.bind.get(shield).q).slerp(facing,smooth(guarding));root.updateWorldMatrix(true,true);}m.updateShieldVisual(e);
  m.energy.emissiveIntensity=dash&&stage==='windup'?2+Math.pow(clock/e.config.dashWindup,2)*(2+Math.sin(time*35)):attack&&age<wind?1.8+Math.pow(age/wind,2)*(1.5+Math.sin(time*30)*.8):1.7;
  for(const jet of m.jets){jet.visible=!!flight||this.moveBlend>.1||dash&&stage==='dash'||attack&&age>=wind&&age<wind+swing;jet.scale.y=flight?(flight.phase==='cruise'?2.5:1.65):dash&&stage==='dash'?2.8:.4+this.moveBlend*.65+Math.sin(time*36)*.08;}
  this.warning.visible=dash&&stage==='windup'&&!e.stunRemaining;
  const area=e.dashArea;
  if(area){const end=root.worldToLocal((e.dashEnd||area.center).clone()),yaw=Math.atan2(end.x,end.z);this.warning.quaternion.setFromAxisAngle(V(0,1,0),yaw).multiply(new THREE.Quaternion().setFromAxisAngle(V(1,0,0),-Math.PI/2));this.warning.position.set(end.x*.5,.08,end.z*.5);this.warning.scale.set(e.config.dashWarningWidth/root.scale.x,Math.max(1,Math.hypot(end.x,end.z)),1);this.warning.material.color.set(area.locked?'#ff3949':'#ffb34d');}
  else{this.warning.scale.set(e.config.dashWarningWidth/root.scale.x,Math.max(1,(e.dashLength||1)/root.scale.z),1);this.warning.position.z=(e.dashLength||1)/root.scale.z*.5;}
  this.warning.material.opacity=.14+.1*(.5+.5*Math.sin(time*18));
  this.updateDashArea(e,time);
  for(const [i,streak]of this.streaks.entries()){streak.visible=(dash&&stage==='dash'||flight&&flight.phase==='cruise')&&!e.stunRemaining;streak.scale.z=3+i;}
  const active=attack&&(dash?stage==='slash':age>=wind&&age<wind+swing+.08)&&!e.stunRemaining;
  if(active){this.history.unshift({base:root.worldToLocal(m.bladeBase.getWorldPosition(V())),tip:root.worldToLocal(m.tip.getWorldPosition(V())),age:0});}for(const h of this.history)h.age+=dt;this.history=this.history.filter(h=>h.age<.13).slice(0,13);let index=0;for(let i=1;i<this.history.length;i++){const a=this.history[i-1],b=this.history[i];for(const v of[a.base,a.tip,b.tip,a.base,b.tip,b.base]){this.vertices[index++]=v.x;this.vertices[index++]=v.y;this.vertices[index++]=v.z;}}this.ribbon.geometry.setDrawRange(0,index/3);this.ribbon.geometry.attributes.position.needsUpdate=true;this.ribbon.visible=index>0&&!e.dead;this.attackWasActive=attack;
 }
 updateDashArea(e,time){const root=this.m.root,area=e.dashArea,active=!!area&&e.dashAttack&&!e.stunRemaining&&!e.dead,show=active&&['windup','dash','slash'].includes(e.dashStage);this.areaFill.visible=this.areaRim.visible=show;
  const impactTime=e.dashStage==='slash'?e.dashClock-e.config.swordSwing*.25:e.dashStage==='recovery'?e.config.swordSwing*.75+e.dashClock:-1;this.areaImpact.visible=active&&impactTime>=0&&impactTime<.35;if(!show&&!this.areaImpact.visible)return;
  const center=root.worldToLocal(area.center.clone()),radius=area.radius/root.scale.x;for(const mesh of[this.areaFill,this.areaRim,this.areaImpact])mesh.position.copy(center);
  this.areaFill.scale.setScalar(radius);this.areaRim.scale.setScalar(radius);const color=area.locked?'#ff3949':'#ffb34d';this.areaFill.material.color.set(color);this.areaRim.material.color.set(color);this.areaFill.material.opacity=.13+Math.sin(time*12)*.025;this.areaRim.material.opacity=area.locked?.95:.65;
  this.areaImpact.scale.setScalar(radius*(.15+.85*smooth(impactTime/.22)));this.areaImpact.material.opacity=.95*(1-Math.max(0,impactTime)/.35);
 }
 articulateSegments(e={}){const p=this.m.parts;
  for(const [side,sign]of[['left',-1],['right',1]]){
   const arm=p[side+'-upper-arm'],fore=p[side+'-lower-arm'],shin=p[side+'-lower-leg'],bend=Math.abs(shin.rotation.x),slashTime=e.dashAttack?(e.dashStage==='slash'?e.dashClock:-1):(e.swordAge||0)-(e.config?.swordWindup||0),strike=e.swordState&&slashTime>=0&&slashTime<e.config.swordSwing?Math.sin(slashTime/e.config.swordSwing*Math.PI):0;
   p[side+'-bicep'].rotation.y=arm.rotation.y*.2;
   p[side+'-forearm-shell'].rotation.y=arm.rotation.y*.12;
   p[side+'-elbow-guard'].rotation.x=-fore.rotation.x*.4;
   p[side+'-wrist'].rotation.set(side==='right'?strike*.09:0,side==='right'?arm.rotation.y*.06:0,sign*strike*.035);
   p[side+'-thigh-armor'].rotation.y=-p[side+'-upper-leg'].rotation.y*.2;
   p[side+'-knee-guard'].rotation.x=-shin.rotation.x*.45;
   p[side+'-knee-guard'].position.z=this.m.bind.get(p[side+'-knee-guard']).p.z+Math.sin(bend)*.09;
   p[side+'-shin-cuff'].position.y=this.m.bind.get(p[side+'-shin-cuff']).p.y+Math.min(.1,bend*.06);
   p[side+'-toe'].rotation.x=e.moving?-Math.max(0,p[side+'-upper-leg'].rotation.x)*.3:0;
  }
 }
 beginDefeat(){this.cancelDash();this.deathPose=new Map();for(const node of Object.values(this.m.parts))this.deathPose.set(node,{p:node.position.clone(),q:node.quaternion.clone()});this.history.length=0;this.ribbon.visible=false;}
 defeat(t){t=clamp(t,0,1);const m=this.m,p=m.parts,crouch=smooth(t/.65),fall=smooth((t-.35)/.65);for(const [node,pose]of this.deathPose){node.position.copy(pose.p);node.quaternion.copy(pose.q);}m.frame.position.y-=1.6*crouch;m.frame.position.z+=.6*fall;p.torso.rotation.x+=.7*fall;p.torso.rotation.z-=.14*fall;p.head.rotation.x+=.35*crouch;p['right-upper-arm'].rotation.x+=.5*fall;p['left-upper-arm'].rotation.x-=.6*fall;p['left-lower-arm'].rotation.x=-.4;m.root.updateWorldMatrix(true,true);this.updateFeet(0,false,true);this.articulateSegments();m.root.updateWorldMatrix(true,true);m.energy.emissiveIntensity=1.7*(1-t);for(const jet of m.jets)jet.visible=false;}
 updateFeet(dt,moving,attack){const m=this.m,root=m.root,stance=.6,strideLength=7.4;
  for(const [i,side]of ['left','right'].entries()){
   const sign=i?1:-1,phase=(this.phase+i*.5)%1,ideal=root.localToWorld(V(sign*.78,.37,side==='left'?.35:-.25));let f=this.feet[i];
   if(!f)f=this.feet[i]={anchor:ideal.clone(),point:ideal.clone(),from:ideal.clone(),to:ideal.clone(),swing:false,settle:0,pitch:0,contact:ideal.clone(),solvedContact:ideal.clone()};
   const swingPhase=moving&&phase>=stance;
   if(swingPhase&&!f.swing){f.from.copy(f.anchor);f.swingStart=phase;f.fromPitch=f.pitch;f.to.copy(root.localToWorld(V(sign*.78,.37,1.05+strideLength*(1-phase)/root.scale.z)));}
   if(swingPhase){const t=(phase-f.swingStart)/(1-f.swingStart);f.anchor.lerpVectors(f.from,f.to,smooth(t));f.anchor.y+=Math.sin(t*Math.PI)**2*.7*root.scale.y;f.settle=0;f.pitch=THREE.MathUtils.lerp(f.fromPitch,-.12,smooth(t));}
   else{if(f.swing)f.anchor.copy(f.to);const t=phase/stance;f.pitch=moving?(t<.2?-.12*(1-smooth(t/.2)):.22*smooth((t-.75)/.25)):THREE.MathUtils.damp(f.pitch,0,14,dt);}
   if(!moving&&!attack){const far=f.anchor.distanceTo(ideal)>.45*root.scale.x;if(f.settle>0||far){if(f.settle===0){f.from.copy(f.anchor);f.to.copy(ideal);}f.settle+=dt;const t=Math.min(1,f.settle/.28);f.anchor.lerpVectors(f.from,f.to,smooth(t));f.anchor.y+=Math.sin(t*Math.PI)*.22*root.scale.y;if(t===1)f.settle=0;}}
   // Roll about the heel/toe contact instead of sliding a flat foot across the road.
   const pivot=V(0,-.36,f.pitch>=0?1.45:-.45),rotated=pivot.clone().applyAxisAngle(V(1,0,0),f.pitch),frame=root.getWorldQuaternion(new THREE.Quaternion()),offset=pivot.clone().sub(rotated).multiplyScalar(root.scale.y).applyQuaternion(frame);
   f.point.copy(f.anchor).add(offset);f.contact.copy(f.anchor).add(pivot.clone().multiplyScalar(root.scale.y).applyQuaternion(frame));
   f.swing=swingPhase;this.solveLeg(side,root.worldToLocal(f.point.clone()),f.pitch);root.updateWorldMatrix(true,true);
   f.solvedContact.copy(m.parts[side+'-foot'].localToWorld(pivot.clone()));
  }
 }
 solveLeg(side,target,pitch=0){const p=this.m.parts,hip=p[side+'-upper-leg'],shin=p[side+'-lower-leg'],ankle=p[side+'-ankle'];this.m.root.updateWorldMatrix(true,true);
  const origin=hip.getWorldPosition(V()),goal=this.m.root.localToWorld(target.clone()),L1=shin.position.length()*this.m.root.scale.y,L2=ankle.position.length()*this.m.root.scale.y,delta=goal.clone().sub(origin),d=clamp(delta.length(),.2,L1+L2-.005),direction=delta.normalize(),frame=this.m.root.getWorldQuaternion(new THREE.Quaternion());
  const pole=V(0,0,1).applyQuaternion(frame);pole.addScaledVector(direction,-pole.dot(direction)).normalize();const along=(L1*L1-L2*L2+d*d)/(2*d),height=Math.sqrt(Math.max(0,L1*L1-along*along)),knee=direction.clone().multiplyScalar(along).addScaledVector(pole,height),upperWorld=new THREE.Quaternion().setFromUnitVectors(V(0,-1,0),knee.clone().normalize()),lowerWorld=new THREE.Quaternion().setFromUnitVectors(V(0,-1,0),direction.clone().multiplyScalar(d).sub(knee).normalize());
  hip.quaternion.copy(hip.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(upperWorld);shin.quaternion.copy(upperWorld.clone().invert()).multiply(lowerWorld);ankle.quaternion.copy(lowerWorld.clone().invert()).multiply(frame.multiply(new THREE.Quaternion().setFromAxisAngle(V(1,0,0),pitch)));p[side+'-foot'].quaternion.identity();
 }
}
