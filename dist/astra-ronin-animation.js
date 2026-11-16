import * as THREE from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const READY={torso:[.05,-.15,-.025],head:[-.03,.15,0],'right-upper-arm':[-.2,.15,-.13],'right-lower-arm':[-.28,0,0],sword:[.82,0,0],'left-upper-arm':[-.35,.12,.28],'left-lower-arm':[-1.05,.1,0]};
const SWEEP_WIND={torso:[-.07,.7,-.12],head:[.03,-.65,.06],'right-upper-arm':[-.85,1.15,-.6],'right-lower-arm':[-.42,0,0],sword:[.8,.2,0],'left-upper-arm':[-.75,-.2,.4],'left-lower-arm':[-1.25,0,0]};
const SWEEP_END={torso:[.25,-.7,.1],head:[-.12,.6,-.05],'right-upper-arm':[-.45,-1.1,-.2],'right-lower-arm':[-.08,0,0],sword:[.82,-.1,0],'left-upper-arm':[-.2,.2,.45],'left-lower-arm':[-1,0,0]};
const OVER_WIND={torso:[-.17,.25,-.04],head:[.05,-.2,0],'right-upper-arm':[-2.55,.1,-.2],'right-lower-arm':[-.8,0,0],sword:[.3,0,0],'left-upper-arm':[-.65,-.15,.3],'left-lower-arm':[-1.1,0,0]};
const OVER_END={torso:[.38,-.25,.06],head:[-.2,.2,0],'right-upper-arm':[-.4,-.16,-.1],'right-lower-arm':[.08,0,0],sword:[.85,0,0],'left-upper-arm':[-.2,.1,.4],'left-lower-arm':[-1,0,0]};
const DASH_WIND={torso:[.08,.65,-.14],head:[-.08,-.6,.06],'right-upper-arm':[-.65,2.2,-.4],'right-lower-arm':[-.8,0,0],sword:[.55,-.2,0],'left-upper-arm':[-.9,-.2,.35],'left-lower-arm':[-1.1,0,0]};
const FLIGHT_POSE={torso:[.32,0,-.025],head:[-.22,0,0],'right-upper-arm':[.1,1.5,-.25],'right-lower-arm':[-.38,0,0],sword:[.55,0,0],'left-upper-arm':[-.65,.05,.35],'left-lower-arm':[-.85,0,0]};
export class RoninAnimation{
 constructor(model){this.m=model;this.feet=[];this.history=[];const geometry=new THREE.BufferGeometry();this.vertices=new Float32Array(12*6*3);geometry.setAttribute('position',new THREE.BufferAttribute(this.vertices,3).setUsage(THREE.DynamicDrawUsage));this.ribbon=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#76edff',transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));this.ribbon.name='Ronin sword motion ribbon';this.ribbon.frustumCulled=false;model.root.add(this.ribbon);
  this.warning=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#ffb34d',transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));this.warning.name='Ronin dash path warning';this.warning.rotation.x=-Math.PI/2;this.warning.position.y=.08;model.root.add(this.warning);
  this.streaks=Array.from({length:3},(_,i)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,1),new THREE.MeshBasicMaterial({color:'#83efff',transparent:true,opacity:.45,depthWrite:false}));mesh.position.set((i-1)*.9,2+i*.65,-2.5);model.root.add(mesh);return mesh;});this.reset();}
 reset(){this.feet=[];this.phase=.25;this.lastPosition=null;this.moveBlend=0;this.history.length=0;this.ribbon.visible=false;this.attackWasActive=false;this.cancelDash();}
 cancelDash(){this.warning.visible=false;for(const s of this.streaks)s.visible=false;this.feet=[];this.history.length=0;this.ribbon.visible=false;}
 pose(a,b,t){for(const id of Object.keys(READY)){const x=a[id]||READY[id],y=b[id]||READY[id];this.m.parts[id].rotation.set(...x.map((v,i)=>THREE.MathUtils.lerp(v,y[i],t)));}}
 update(dt,time,e){const m=this.m,p=m.parts,root=m.root;dt=Math.min(dt,.1);for(const [node,bind]of m.bind){node.position.copy(bind.p);node.quaternion.copy(bind.q);}const attack=!!e.swordState,wind=e.config.swordWindup,swing=e.config.swordSwing,age=e.swordAge||0;
  const traveled=this.lastPosition?root.position.distanceTo(this.lastPosition):0;this.lastPosition=root.position.clone();const moving=e.moving&&!attack&&!e.stunRemaining;this.moveBlend=THREE.MathUtils.damp(this.moveBlend,moving?1:0,8,dt);if(moving)this.phase+=Math.min(traveled,.9)/5.8;
  this.pose(READY,READY,0);p.torso.rotation.y+=Math.sin(time*1.7)*.025;p.torso.position.y+=Math.sin(time*1.7)*.025;
  const stride=Math.sin(this.phase*Math.PI*2)*this.moveBlend;p.torso.rotation.y-=stride*.1;p['left-upper-arm'].rotation.x+=stride*.12;p['right-upper-arm'].rotation.x-=stride*.1;m.frame.position.y-=.11*this.moveBlend;m.frame.position.z+=.08*this.moveBlend;
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
  m.energy.emissiveIntensity=dash&&stage==='windup'?2+Math.pow(clock/e.config.dashWindup,2)*(2+Math.sin(time*35)):attack&&age<wind?1.8+Math.pow(age/wind,2)*(1.5+Math.sin(time*30)*.8):1.7;
  for(const jet of m.jets){jet.visible=!!flight||this.moveBlend>.1||dash&&stage==='dash'||attack&&age>=wind&&age<wind+swing;jet.scale.y=flight?(flight.phase==='cruise'?2.5:1.65):dash&&stage==='dash'?2.8:.4+this.moveBlend*.65+Math.sin(time*36)*.08;}
  this.warning.visible=dash&&stage==='windup'&&!e.stunRemaining;this.warning.scale.set(e.config.dashWarningWidth/root.scale.x,Math.max(1,(e.dashLength||1)/root.scale.z),1);this.warning.position.z=(e.dashLength||1)/root.scale.z*.5;this.warning.material.opacity=.14+.1*(.5+.5*Math.sin(time*18));
  for(const [i,streak]of this.streaks.entries()){streak.visible=(dash&&stage==='dash'||flight&&flight.phase==='cruise')&&!e.stunRemaining;streak.scale.z=3+i;}
  const active=attack&&(dash?stage==='slash':age>=wind&&age<wind+swing+.08)&&!e.stunRemaining;
  if(active){this.history.unshift({base:root.worldToLocal(m.bladeBase.getWorldPosition(V())),tip:root.worldToLocal(m.tip.getWorldPosition(V())),age:0});}for(const h of this.history)h.age+=dt;this.history=this.history.filter(h=>h.age<.13).slice(0,13);let index=0;for(let i=1;i<this.history.length;i++){const a=this.history[i-1],b=this.history[i];for(const v of[a.base,a.tip,b.tip,a.base,b.tip,b.base]){this.vertices[index++]=v.x;this.vertices[index++]=v.y;this.vertices[index++]=v.z;}}this.ribbon.geometry.setDrawRange(0,index/3);this.ribbon.geometry.attributes.position.needsUpdate=true;this.ribbon.visible=index>0&&!e.dead;this.attackWasActive=attack;
 }
 beginDefeat(){this.cancelDash();this.deathPose=new Map();for(const node of Object.values(this.m.parts))this.deathPose.set(node,{p:node.position.clone(),q:node.quaternion.clone()});this.history.length=0;this.ribbon.visible=false;}
 defeat(t){t=clamp(t,0,1);const m=this.m,p=m.parts,crouch=smooth(t/.65),fall=smooth((t-.35)/.65);for(const [node,pose]of this.deathPose){node.position.copy(pose.p);node.quaternion.copy(pose.q);}m.frame.position.y-=1.6*crouch;m.frame.position.z+=.6*fall;p.torso.rotation.x+=.7*fall;p.torso.rotation.z-=.14*fall;p.head.rotation.x+=.35*crouch;p['right-upper-arm'].rotation.x+=.5*fall;p['left-upper-arm'].rotation.x-=.6*fall;p['left-lower-arm'].rotation.x=-.4;m.root.updateWorldMatrix(true,true);this.updateFeet(0,false,true);m.root.updateWorldMatrix(true,true);m.energy.emissiveIntensity=1.7*(1-t);for(const jet of m.jets)jet.visible=false;}
 updateFeet(dt,moving,attack){const m=this.m,root=m.root;for(const [i,side]of['left','right'].entries()){
   const sign=i?1:-1,phase=(this.phase+i*.5)%1,ideal=root.localToWorld(V(sign*.9,.37,side==='left'?.42:-.3));let f=this.feet[i];if(!f){f=this.feet[i]={point:ideal.clone(),from:ideal.clone(),to:ideal.clone(),swing:false,settle:0};}
   const swingPhase=moving&&phase>=.58;
   if(swingPhase&&!f.swing){f.from.copy(f.point);f.to.copy(root.localToWorld(V(sign*.9,.37,1.1+5.8*(1-phase)/root.scale.z)));}
   if(swingPhase){const t=smooth((phase-.58)/.42);f.point.lerpVectors(f.from,f.to,t);f.point.y+=Math.sin(t*Math.PI)*.48*root.scale.y;f.settle=0;}
   else if(f.swing){f.point.copy(f.to);}
   // A stationary turning/recovery step repositions only the outlying foot.
   if(!moving&&!attack){const far=f.point.distanceTo(ideal)>.45*root.scale.x;if(f.settle>0||far){if(f.settle===0){f.from.copy(f.point);f.to.copy(ideal);}f.settle+=dt;const t=Math.min(1,f.settle/.28);f.point.lerpVectors(f.from,f.to,smooth(t));f.point.y+=Math.sin(t*Math.PI)*.22*root.scale.y;if(t===1)f.settle=0;}}
   f.swing=swingPhase;this.solveLeg(side,root.worldToLocal(f.point.clone()));
  }}
 solveLeg(side,target){const p=this.m.parts,hip=p[side+'-upper-leg'],shin=p[side+'-lower-leg'],foot=p[side+'-foot'];this.m.root.updateWorldMatrix(true,true);const parent=hip.parent,world=this.m.root.localToWorld(target.clone()),goal=parent.worldToLocal(world).sub(hip.position),L1=2.05,L2=2.1,d=clamp(goal.length(),.2,L1+L2-.005),direction=goal.clone().normalize();const kneeAxis=V(0,0,1).addScaledVector(direction,-direction.z).normalize(),along=(L1*L1-L2*L2+d*d)/(2*d),height=Math.sqrt(Math.max(0,L1*L1-along*along)),knee=direction.clone().multiplyScalar(along).addScaledVector(kneeAxis,height);hip.quaternion.setFromUnitVectors(V(0,-1,0),knee.clone().normalize());const lower=goal.clone().sub(knee).normalize(),q=new THREE.Quaternion().setFromUnitVectors(V(0,-1,0),lower);shin.quaternion.copy(hip.quaternion.clone().invert().multiply(q));foot.quaternion.copy(q.invert());}
}
