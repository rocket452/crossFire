import * as THREE from './vendor/three.module.js';

// Procedural animation for Pyroclast's rigid-part model. Each frame builds a target pose from the
// boss state (hover, fireball volley, tornado summon, meteor call, stun, death) and drives every
// joint toward it with a damped spring, so moves blend with anticipation and follow-through.
const clamp=THREE.MathUtils.clamp,ease=t=>t*t*(3-2*t);
const JOINTS=['pelvis','torso','head','shoulderL','shoulderR','elbowL','elbowR','handL','handR','hipL','hipR','kneeL','kneeR','ankleL','ankleR','cape','tail-1','tail1'];
const SIDE={L:1,R:-1};

export class PyroclastRig {
 constructor(model){
  this.model=model;this.P=model.parts;this.joints={};
  for(const k of JOINTS)if(this.P[k])this.joints[k]={x:new THREE.Vector3().setFromEuler(this.P[k].rotation),v:new THREE.Vector3()};
  this.curl={L:{x:.45,v:0},R:{x:.45,v:0}};
  this.lastHealth=null;this.flow=0;
 }
 reset(){for(const j of Object.values(this.joints)){j.x.set(0,0,0);j.v.set(0,0,0);}for(const c of Object.values(this.curl)){c.x=.45;c.v=0;}this.flow=0;}
 // Sharp reaction to damage: torso and head snap back, arms fling out, then the springs recover.
 flinch(strength=1){
  const s=clamp(strength,.2,1.5),J=this.joints;
  J.torso?.v.add(new THREE.Vector3(-5*s,(Math.random()-.5)*4*s,(Math.random()-.5)*3*s));J.head?.v.add(new THREE.Vector3(-7*s,0,0));
  J.shoulderL?.v.add(new THREE.Vector3(1.5*s,0,4*s));J.shoulderR?.v.add(new THREE.Vector3(1.5*s,0,-4*s));
  J.hipL?.v.add(new THREE.Vector3(3*s,0,0));J.hipR?.v.add(new THREE.Vector3(3*s,0,0));
 }
 kick(joint,x=0,y=0,z=0){this.joints[joint]?.v.add(new THREE.Vector3(x,y,z));}

 // ---- poses ----------------------------------------------------------------------------------
 hover(c){
  const t=c.t,br=Math.sin(t*1.6),lv=c.localVel,fwd=clamp(lv.z/13,-1,1),lat=clamp(lv.x/13,-1,1),up=clamp(lv.y/8,-1,1);
  return {
   pelvis:[0,0,0],torso:[-.07+.025*br+fwd*.05,0,-lat*.06],head:[c.look.pitch*.85,c.look.yaw*.8,0],
   shoulderL:[.14-fwd*.1+up*.15,0,.5+.04*br+Math.max(0,-lat)*.15],shoulderR:[.14-fwd*.1+up*.15,0,-.5-.04*br-Math.max(0,lat)*.15],
   elbowL:[-.55-.05*br,0,0],elbowR:[-.55-.05*br,0,0],handL:[-.2,0,.15],handR:[-.2,0,-.15],
   hipL:[.02+fwd*.35+.05*Math.sin(t*2.1)-up*.1,0,.07-lat*.05],hipR:[.26+fwd*.35+.05*Math.sin(t*2.1+1.3)-up*.1,0,-.06-lat*.05],
   kneeL:[.28+fwd*.25+Math.max(0,up)*.2,0,0],kneeR:[.78+fwd*.2,0,0],ankleL:[.55,0,0],ankleR:[.42,0,0],
   curl:{L:.5,R:.5},k:{}
  };
 }
 // Arm presets for a hand on side s ('L' +1, 'R' -1).
 static arm(name,s,pitch){
  switch(name){
   case 'cock':return {sh:[.62,0,s*.3],el:[-2.05,0,0],hd:[-.35,0,0],curl:.25};
   case 'thrust':return {sh:[-1.5+pitch,0,s*.1],el:[-.06,0,0],hd:[-1.05,0,0],curl:.02};
   case 'aim':return {sh:[-1.35+pitch,0,s*.12],el:[-.18,0,0],hd:[-.85,0,0],curl:.12};
   case 'guard':return {sh:[-.75+pitch*.5,0,s*.28],el:[-1.15,0,0],hd:[-.45,0,0],curl:.55};
   case 'raise':return {sh:[-2.85,0,s*.28],el:[-.12,0,0],hd:[-.3,0,0],curl:.95};
   case 'point':return {sh:[-1.45+pitch,0,s*.1],el:[-.05,0,0],hd:[-.5,0,0],curl:.12};
  }
 }
 setArm(p,key,name,pitch,blend=1){
  const a=PyroclastRig.arm(name,SIDE[key],pitch),mix=(from,to)=>from.map((v,i)=>v+(to[i]-v)*blend);
  p['shoulder'+key]=mix(p['shoulder'+key],a.sh);p['elbow'+key]=mix(p['elbow'+key],a.el);p['hand'+key]=mix(p['hand'+key],a.hd);
  p.curl[key]+=(a.curl-p.curl[key])*blend;
 }
 pose(c){
  const p=this.hover(c),s=c.state,pitch=clamp(c.look.pitch,-.5,.9),t=c.t;
  if(c.mode==='dying'){
   const flail=(k,ph)=>{const sd=SIDE[k];p['shoulder'+k]=[Math.sin(t*7+ph)*1.1-.6,0,sd*(1.3+.5*Math.sin(t*5+ph))];p['elbow'+k]=[-.7+.5*Math.sin(t*9+ph),0,0];p['hand'+k]=[.3,0,0];p.curl[k]=.9;
    p['hip'+k]=[.6*Math.sin(t*6+ph*1.5),0,sd*.25];p['knee'+k]=[.9+.3*Math.sin(t*8+ph),0,0];};
   flail('L',0);flail('R',2.1);p.torso=[-.45,0,.2*Math.sin(t*4)];p.head=[-.7,0,0];p.k={all:10};return p;
  }
  if(c.stunned){
   for(const k of ['L','R']){const sd=SIDE[k];p['shoulder'+k]=[.3,0,sd*.18];p['elbow'+k]=[-.25,0,0];p['hand'+k]=[.1,0,0];p.curl[k]=.25;p['hip'+k]=[.4,0,sd*.04];p['knee'+k]=[.5,0,0];p['ankle'+k]=[.35,0,0];}
   p.torso=[.5,0,.08*Math.sin(t*3)+.04*Math.sin(t*31)];p.head=[.75,0,.05*Math.sin(t*2.3)];p.k={all:5};return p;
  }
  const a=c.attack,active=s.name==='windup'||s.name==='attack';
  if(a==='fireballs'&&(active||(s.name==='recover'&&c.throw.last&&t-c.throw.last.time<.35))){
   const th=c.throw,lead=.09,w=s.name==='windup'?ease(Math.min(1,s.t/s.duration)):1;
   let twist=0;
   for(const k of ['L','R']){
    const sd=SIDE[k],recent=th.last&&th.last.hand===k&&t-th.last.time<.3,early=th.next===k&&th.untilNext<lead&&th.remaining>0;
    if(recent||early){this.setArm(p,k,'thrust',pitch);twist+=sd*-.32;}
    else if(th.next===k&&th.remaining>0){this.setArm(p,k,'cock',pitch,s.name==='windup'?w:1);twist+=sd*.42*(s.name==='windup'?w:1);}
    else this.setArm(p,k,s.name==='windup'?'aim':'guard',pitch,s.name==='windup'?w:1);
   }
   p.torso=[p.torso[0]-.06*w,clamp(twist,-.5,.5),p.torso[2]];p.pelvis=[0,-p.torso[1]*.35,0];p.head=[pitch*.9,c.look.yaw*.8-p.torso[1]*.85,0];
   p.hipL=[-.15,0,.13];p.hipR=[.32,0,-.1];p.kneeL=[.5,0,0];p.kneeR=[.85,0,0];
   p.k={arms:s.name==='windup'?14:30,torso:20};return p;
  }
  if(a==='tornadoes'&&(active||s.name==='recover')){
   if(s.name==='windup'){
    const w=ease(Math.min(1,s.t/s.duration));
    for(const k of ['L','R']){const sd=SIDE[k];p['shoulder'+k]=[-.3*w,0,sd*(.5+1.85*w)];p['elbow'+k]=[-.45+.25*w,0,0];p['hand'+k]=[-.2*w,0,sd*.3*w];p.curl[k]=w<.8?.5*(1-w/.8):(w-.8)/.2*.95;
     p['hip'+k]=[.1-.35*w,0,sd*(.07+.1*w)];p['knee'+k]=[.4+.6*w,0,0];p['ankle'+k]=[.5,0,0];}
    p.torso=[-.07-.28*w,0,0];p.head=[pitch*(1-w)-.45*w,0,0];p.k={arms:9,torso:9};
   }else{
    // Aerial slam: arms whip down and out, knees tuck, head drives down at the ground.
    const r=s.name==='recover'?ease(Math.min(1,s.t/s.duration)):0,hold=1-r;
    const slam={shoulder:-1.05+pitch*.3,el:-.08,hand:-.9};
    for(const k of ['L','R']){const sd=SIDE[k],h=p;
     h['shoulder'+k]=h['shoulder'+k].map((v,i)=>v*r+[slam.shoulder,0,sd*.42][i]*hold);h['elbow'+k]=h['elbow'+k].map((v,i)=>v*r+[slam.el,0,0][i]*hold);
     h['hand'+k]=h['hand'+k].map((v,i)=>v*r+[slam.hand,0,0][i]*hold);h.curl[k]=h.curl[k]*r;
     h['hip'+k]=h['hip'+k].map((v,i)=>v*r+[-.62,0,sd*.16][i]*hold);h['knee'+k]=h['knee'+k].map((v,i)=>v*r+[1.4,0,0][i]*hold);h['ankle'+k]=[.2*hold+.5*r,0,0];}
    p.torso=p.torso.map((v,i)=>v*r+[.42,0,0][i]*hold);p.head=p.head.map((v,i)=>v*r+[.35+pitch*.4,0,0][i]*hold);
    p.k={arms:30,torso:24,legs:20};
   }
   return p;
  }
  if(a==='meteors'&&(active||s.name==='recover')){
   if(s.name==='windup'){
    const w=ease(Math.min(1,s.t/s.duration));
    for(const k of ['L','R']){const sd=SIDE[k];p['shoulder'+k]=[-2.95*w+p['shoulder'+k][0]*(1-w),0,sd*(.5-.22*w)];p['elbow'+k]=[-.55+.45*w,0,0];p['hand'+k]=[-.25*w,0,0];p.curl[k]=.5*(1-w);
     p['hip'+k]=[.02,0,sd*.03];p['knee'+k]=[.25-.1*w,0,0];p['ankle'+k]=[.6+.2*w,0,0];}
    p.torso=[-.07-.22*w,0,0];p.head=[pitch*(1-w)-.6*w,0,0];p.k={arms:8,torso:8};
   }else if(s.name==='attack'){
    // Conductor: one fist raised to the sky, the other hand directs the shower at the hero; swap.
    const phase=Math.floor(s.t/.85)%2,up=phase?'L':'R',down=phase?'R':'L';
    this.setArm(p,up,'raise',pitch);this.setArm(p,down,'point',pitch);p['shoulder'+up][0]+=.12*Math.sin(t*9);
    for(const k of ['L','R']){const sd=SIDE[k];p['hip'+k]=[.05+.04*Math.sin(t*2+sd),0,sd*.04];p['knee'+k]=[.2,0,0];p['ankle'+k]=[.75,0,0];}
    p.torso=[-.05,SIDE[down]*-.18,0];p.head=[pitch*.9,c.look.yaw*.8+SIDE[down]*.15,0];p.k={arms:16,torso:12};
   }
   return p;
  }
  return p;
 }
 // ---- integrate --------------------------------------------------------------------------------
 update(dt,c){
  const pose=this.pose(c),k=pose.k||{},P=this.P;
  const stiff=key=>k.all??(key.startsWith('shoulder')||key.startsWith('elbow')||key.startsWith('hand')?k.arms:key.startsWith('hip')||key.startsWith('knee')||key.startsWith('ankle')?k.legs:key==='torso'||key==='pelvis'||key==='head'?k.torso:null)??12;
  // Cape and coat tails lag behind the body; they stream back and lift with speed.
  const speed=c.localVel.length(),flowTarget=clamp(speed/14,0,1);this.flow+=(flowTarget-this.flow)*Math.min(1,dt*2.5);
  const lat=clamp(c.localVel.x/13,-1,1);
  pose.cape=[.12+this.flow*.45-clamp(c.localVel.y/10,-.4,.4)*.3,0,-lat*.12];pose['tail-1']=[.2+this.flow*.4,0,-.05];pose.tail1=[.2+this.flow*.4,0,.05];
  const n=Math.max(1,Math.ceil(dt/(1/120))),h=dt/n,zeta=.72,tmp=new THREE.Vector3();
  for(const [key,j] of Object.entries(this.joints)){
   const target=pose[key];if(!target)continue;tmp.set(...target);
   const w=key==='cape'||key.startsWith('tail')?6:key==='head'?Math.max(10,stiff(key)):stiff(key);
   for(let i=0;i<n;i++){j.v.addScaledVector(tmp.clone().sub(j.x),w*w*h).addScaledVector(j.v,-2*zeta*w*h);j.x.addScaledVector(j.v,h);}
   P[key].rotation.set(j.x.x,j.x.y,j.x.z);
  }
  for(const key of ['L','R']){
   const cs=this.curl[key],target=pose.curl?.[key]??.5,w=18;
   for(let i=0;i<n;i++){cs.v+=((target-cs.x)*w*w-2*zeta*w*cs.v)*h;cs.x+=cs.v*h;}
   const cv=clamp(cs.x,-.1,1.1);for(const f of P['fingers'+key]||[]){f.base.rotation.x=cv*1.25;f.mid.rotation.x=cv*1.45;}
   if(P['thumb'+key])P['thumb'+key].rotation.x=cv*.9;
   // Pauldrons ride partway with the arm; tassets lift when the thigh swings forward.
   const sh=P['shoulder'+key],pd=P['pauldron'+key];if(pd)pd.rotation.set(sh.rotation.x*.28,0,sh.rotation.z*.32-SIDE[key]*.08);
   const hip=P['hip'+key],ts=P['tasset'+key];if(ts)ts.rotation.set(Math.min(0,hip.rotation.x)*.85,0,hip.rotation.z*.6);
  }
  return {flow:this.flow,sway:-lat};
 }
}
