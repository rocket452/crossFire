import * as THREE from './vendor/three.module.js';
import {VOLT_STORM as C} from './runner-storm.js?v=424';
import {LightningKit,WHITE,CYAN} from './lightning-kit.js?v=448';
export const SKY_STRIKE_ART=Object.freeze({life:1.5,segments:320,sparks:64,boltHeight:C.strikeHeight});
const UP=new THREE.Vector3(0,1,0);
const flatVertex=`varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
// Storm vortex gathering overhead during the warning; flickers with intra-cloud lightning.
const vortexFragment=`varying vec2 vP;uniform float time;uniform float progress;uniform float flicker;void main(){
 float r=length(vP),a=atan(vP.y,vP.x);
 float swirl=.5+.5*sin(a*3.+r*10.-time*1.4+sin(r*18.-time*2.)*.6);
 float clouds=.5+.5*sin(a*7.-r*16.+time*.8+swirl*2.);
 float density=smoothstep(1.,.25,r)*(.45+.55*swirl*clouds);
 float eye=smoothstep(.18*progress+.02,0.,r);
 vec3 col=mix(vec3(.025,.03,.08),vec3(.2,.2,.48),clouds*swirl);
 col+=vec3(.45,.75,1.)*flicker*clouds*smoothstep(1.,.1,r)+vec3(.6,.95,1.)*eye*(.4+.6*progress);
 gl_FragColor=vec4(col,clamp(density*(.25+.7*progress)+eye,0.,1.));}`;
// Ground countdown: tick ring, sweeping fill and a shrinking inner ring that pulses faster near impact.
const timerFragment=`varying vec2 vP;uniform float time;uniform float progress;void main(){
 float r=length(vP),a=fract(atan(vP.x,vP.y)/6.2832+.5);
 float pulse=.55+.45*sin(time*(5.+22.*progress));
 float rim=smoothstep(.93,.965,r)*smoothstep(1.,.985,r);
 float ticks=step(fract(a*36.),.28)*smoothstep(.8,.82,r)*smoothstep(.9,.88,r);
 float sweep=step(a,progress)*smoothstep(.62,.7,r)*smoothstep(.8,.78,r);
 float ir=1.-progress*.9;float inner=smoothstep(.035,0.,abs(r-ir));
 float fill=smoothstep(1.,0.,r)*.12*progress;
 vec3 c=mix(vec3(.15,.75,1.),vec3(.9,.85,1.),smoothstep(.75,.95,progress));
 float v=rim*(.6+.4*pulse)+ticks*.55+sweep*.35*pulse+inner*(.7+.3*pulse)+fill*pulse;
 gl_FragColor=vec4(c*v,1.);}`;
// Scorched, glowing crack pattern left by the strike.
const scorchFragment=`varying vec2 vP;uniform float fade;uniform float seed;void main(){
 float r=length(vP),a=atan(vP.y,vP.x);
 float cracks=pow(max(0.,sin(a*9.+seed+sin(r*11.+seed)*1.3)),36.)+pow(max(0.,sin(a*14.-seed*.7+sin(r*17.)*1.1)),48.)*.7;
 cracks*=smoothstep(1.,.15,r);
 float centre=exp(-r*5.);
 vec3 c=mix(vec3(.1,.55,1.),vec3(1.),centre*fade);
 float v=(cracks*1.4+centre*1.2)*fade*fade;
 gl_FragColor=vec4(c*v,1.);}`;
const ringFragment=`varying vec2 vP;uniform float opacity;void main(){float r=length(vP);float band=smoothstep(.78,.93,r)*smoothstep(1.,.95,r);
 gl_FragColor=vec4(mix(vec3(.2,.8,1.),vec3(1.),band*band)*band*opacity*1.4,1.);}`;
const beamVertex=`varying vec3 vN;varying vec3 vV;void main(){vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}`;
const beamFragment=`varying vec3 vN;varying vec3 vV;uniform float opacity;void main(){float f=pow(abs(dot(normalize(vN),normalize(vV))),2.5);
 gl_FragColor=vec4(mix(vec3(.25,.55,1.),vec3(.85,.97,1.),f)*f*opacity*2.2,1.);}`;
const flat=(fragmentShader,uniforms)=>new THREE.ShaderMaterial({uniforms,vertexShader:flatVertex,fragmentShader,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:THREE.AdditiveBlending});
export class SkyStrikeFX {
 constructor(parent){this.root=new THREE.Group();this.root.name='Sky Strike corona and afterglow';parent.add(this.root);const mat=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false}),cylinder=new THREE.CylinderGeometry(1,1,1,5,1,true);this.core=new THREE.InstancedMesh(cylinder,mat('#f1ffff'),SKY_STRIKE_ART.segments);this.glow=new THREE.InstancedMesh(cylinder,mat('#268eff',.28),SKY_STRIKE_ART.segments);this.sparks=new THREE.InstancedMesh(cylinder,mat('#b9faff'),SKY_STRIKE_ART.sparks);for(const m of[this.core,this.glow,this.sparks]){m.frustumCulled=false;this.root.add(m);}this.rings=Array.from({length:3},()=>{const m=new THREE.Mesh(new THREE.RingGeometry(.96,1,80),mat('#62dbff',.8));m.rotation.x=-Math.PI/2;this.root.add(m);return m;});this.crown=Array.from({length:3},()=>new THREE.Mesh(new THREE.TorusGeometry(1,.025,4,48),mat('#8eb8ff',.7)));
  this.channel=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,24,1,true),mat('#7bb8ff',.19));
  this.root.add(...this.crown,this.channel);
  this.charge=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),mat('#bceeff',.65));this.flash=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),mat('#c6faff',.25));this.disc=new THREE.Mesh(new THREE.CircleGeometry(1,64),mat('#288eff',.12));this.disc.rotation.x=-Math.PI/2;this.root.add(this.charge,this.flash,this.disc);this.dummy=new THREE.Object3D();
  this.kit=new LightningKit(this.root,{arcs:30,glows:8,sparks:320,bigArcs:6,bigPoints:72});
  const circle=new THREE.CircleGeometry(1,96);
  this.vortex=new THREE.Mesh(circle,new THREE.ShaderMaterial({uniforms:{time:{value:0},progress:{value:0},flicker:{value:0}},vertexShader:flatVertex,fragmentShader:vortexFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  this.vortex.rotation.x=Math.PI/2;this.vortex.renderOrder=2;
  this.timer=new THREE.Mesh(circle,flat(timerFragment,{time:{value:0},progress:{value:0}}));this.timer.rotation.x=-Math.PI/2;this.timer.renderOrder=3;
  this.scorch=new THREE.Mesh(circle,flat(scorchFragment,{fade:{value:0},seed:{value:0}}));this.scorch.rotation.x=-Math.PI/2;this.scorch.renderOrder=3;
  this.shockRing=new THREE.Mesh(circle,flat(ringFragment,{opacity:{value:0}}));this.shockRing.rotation.x=-Math.PI/2;this.shockRing.renderOrder=4;
  this.channel.material=new THREE.ShaderMaterial({uniforms:{opacity:{value:0}},vertexShader:beamVertex,fragmentShader:beamFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:THREE.AdditiveBlending});
  this.guide=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,16,1,true),new THREE.ShaderMaterial({uniforms:{opacity:{value:0}},vertexShader:beamVertex,fragmentShader:beamFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:THREE.AdditiveBlending}));this.guide.renderOrder=3;
  this.root.add(this.vortex,this.timer,this.scorch,this.shockRing,this.guide);this.flicker=0;this.light=null;this.lightActive=false;
  this.clear();}
 clear(){this.seen=new WeakSet();this.bursts=[];this.hide();this.kit?.clear();if(this.light)this.light.intensity=0;}
 hide(){this.core.count=this.glow.count=this.sparks.count=0;for(const m of[...this.rings,...this.crown,this.channel,this.charge,this.flash,this.disc,this.vortex,this.timer,this.scorch,this.shockRing,this.guide].filter(Boolean))m.visible=false;}
 sound(audio){if(!audio||audio.state!=='running')return;try{const t=audio.currentTime,buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.65),audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**2;const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();noise.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(2400,t);filter.frequency.exponentialRampToValueAtTime(90,t+.6);gain.gain.setValueAtTime(.13,t);gain.gain.exponentialRampToValueAtTime(.001,t+.65);noise.connect(filter);filter.connect(gain);gain.connect(audio.destination);noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};noise.start();}catch{}}
 fire(b){
  // The big strike: thick main bolt and branches, ground arcs, flashes and sparks.
  const p=b.point.clone().add(new THREE.Vector3(0,.15,0)),top=p.clone().addScaledVector(UP,SKY_STRIKE_ART.boltHeight);
  this.kit.bigArc(top,p,{life:.42,width:7,jag:.05,maxJag:10,flicker:.035,coreWidth:1.6});
  for(let i=0;i<3;i++){const a=i*2.1+Math.random(),h=30+Math.random()*50,from=p.clone().add(new THREE.Vector3(Math.cos(a)*6,h,Math.sin(a)*6)),to=p.clone().add(new THREE.Vector3(Math.cos(a)*(8+Math.random()*6),4+Math.random()*10,Math.sin(a)*(8+Math.random()*6)));
   this.kit.bigArc(from,to,{life:.3,width:2.4,jag:.12,maxJag:6,flicker:.04});}
  for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.random()*.5,r=C.strikeRadius*(.45+Math.random()*.55);this.kit.arc(p,p.clone().add(new THREE.Vector3(Math.cos(a)*r,.15+Math.random()*.6,Math.sin(a)*r)),{life:.45+Math.random()*.3,width:1.3,jag:.16,maxJag:2,flicker:.05});}
  this.kit.glow(p.clone().addScaledVector(UP,1.5),{size:8,life:.3,grow:.9,color:WHITE,peak:.85});
  this.kit.glow(p.clone().addScaledVector(UP,3),{size:26,life:.75,grow:.35,peak:.6});
  this.kit.glow(p.clone().addScaledVector(UP,46),{size:34,life:.35,grow:.3,peak:.6});
  this.kit.spark(p,220,20,12,{life:.55,size:.16,sizeSpread:.22,gravity:18});
 }
 segment(mesh,index,a,b,width){const d=b.clone().sub(a),length=d.length();if(length<1e-6)return;this.dummy.position.copy(a).lerp(b,.5);this.dummy.quaternion.setFromUnitVectors(UP,d.multiplyScalar(1/length));this.dummy.scale.set(width,length,width);this.dummy.updateMatrix();mesh.setMatrixAt(index,this.dummy.matrix);}
 update(dt,time,storm){this.hide();for(const b of this.bursts)b.age+=Math.max(0,dt);this.bursts=this.bursts.filter(b=>b.age<SKY_STRIKE_ART.life);for(const e of storm.events)if(e.kind==='strike'&&!this.seen.has(e)){this.seen.add(e);const burst={point:e.point.clone(),age:e.age,seed:time,restruck:false};this.bursts.push(burst);this.fire(burst);if(this.bursts.length>2)this.bursts.shift();}let n=0,particles=0;this.kit.step(Math.max(0,dt));this.lightActive=false;
  const line=(a,b,width)=>{if(n>=SKY_STRIKE_ART.segments)return;this.segment(this.core,n,a,b,width*.45);this.segment(this.glow,n,a,b,width*2.2);n++;},bolt=(a,b,width,seed,steps=14)=>{let last=a.clone();for(let i=1;i<=steps;i++){const f=i/steps,p=a.clone().lerp(b,f);if(i<steps)p.add(new THREE.Vector3(Math.sin(i*13+seed),Math.cos(i*7+seed)*.12,Math.cos(i*17-seed)).multiplyScalar(.45+.65*(1-f)));line(last,p,width);last=p;}};
  const s=storm.strike;
  if(s){
   const progress=THREE.MathUtils.clamp(1-s.remaining/C.strikeDelay,0,1);
   const origin=s.point.clone().add(new THREE.Vector3(0,.12,0));
   this.disc.visible=true;
   this.disc.position.copy(origin);
   this.disc.scale.setScalar(C.strikeRadius);
   this.disc.material.opacity=.035+progress*.07;
   for(const [i,ring] of this.rings.entries()){
    ring.visible=true;
    ring.position.copy(origin).y+=i*.02;
    const radius=i===0?C.strikeRadius:i===1?C.strikeRadius*(.93-progress*.78):C.strikeRadius*.3;
    ring.scale.setScalar(radius);
    ring.material.opacity=(.1+progress*(i===0?.2:.28));
    ring.material.color.set(progress>.82?'#b9b3ff':'#3aa8ff');
   }
   this.vortex.visible=this.timer.visible=true;
   this.vortex.position.copy(origin).y+=34;this.vortex.scale.setScalar(C.strikeRadius*(1.6+1.2*progress));
   this.flicker=Math.max(0,this.flicker-dt*6);
   if(Math.random()<Math.max(0,dt)*(1.5+9*progress)){this.flicker=.6+Math.random()*.4;
    for(let k=0;k<1+Math.floor(progress*2);k++){const a=Math.random()*Math.PI*2,b=a+1+Math.random()*2,r=C.strikeRadius*(.4+Math.random()*.9);
     const from=this.vortex.position.clone().add(new THREE.Vector3(Math.cos(a)*r,-1-Math.random()*2,Math.sin(a)*r)),to=this.vortex.position.clone().add(new THREE.Vector3(Math.cos(b)*r*.8,-1-Math.random()*3,Math.sin(b)*r*.8));
     this.kit.arc(from,to,{life:.14,width:2.2,jag:.18,maxJag:3,flicker:.04});}}
   const vu=this.vortex.material.uniforms;vu.time.value=time;vu.progress.value=progress;vu.flicker.value=this.flicker;
   this.guide.visible=true;this.guide.position.copy(origin).y+=17;this.guide.scale.set(.3+.3*progress,34,.3+.3*progress);
   this.guide.material.uniforms.opacity.value=(.05+.22*progress*progress)*(.7+.3*Math.sin(time*(9+25*progress)))+this.flicker*.12;
   this.timer.position.copy(origin).y+=.05;this.timer.scale.setScalar(C.strikeRadius);
   const tu=this.timer.material.uniforms;tu.time.value=time;tu.progress.value=progress;
   if(Math.random()<Math.max(0,dt)*(20+90*progress))this.kit.spark(origin,1+Math.floor(progress*2),.6,3+5*progress,{life:.7,size:.12,sizeSpread:.14,gravity:-7,spread:C.strikeRadius*.95});
   if(this.light){this.lightActive=true;this.light.position.copy(origin).y+=7;this.light.intensity=(30+220*progress*progress)*(.75+.25*Math.sin(time*(6+20*progress)))+this.flicker*120;}
   this.charge.visible=true;
   this.charge.position.copy(origin).y+=.35;
   this.charge.scale.setScalar(.2+progress*.8);
   this.charge.material.opacity=.35+progress*.5;
   for(const [i,ring] of this.crown.entries()){
    if(progress<i*.17)continue;
    ring.visible=true;
    ring.position.copy(origin).y+=9+i*4;
    ring.rotation.set(Math.PI*.5+i*.12,time*(i%2?-.65:.65),i*.28);
    ring.scale.setScalar((4.6-i*.75)*(1-progress*.62));
    ring.material.opacity=(.05+progress*.18)*(1-i*.14);
   }
   for(let i=0;i<8;i++){
    const angle=time*(1+progress*4)+i*Math.PI/4;
    const radius=C.strikeRadius*(.15+.72*(1-progress));
    const from=origin.clone().add(new THREE.Vector3(Math.cos(angle)*radius,.1,Math.sin(angle)*radius));
    const to=origin.clone().add(new THREE.Vector3(0,.4+progress,0));
    bolt(from,to,.015+progress*.027,i+Math.floor(time*12),4);
   }
   if(progress>.83){
    const height=SKY_STRIKE_ART.boltHeight;
    const leader=(progress-.83)/.17;
    const top=origin.clone().addScaledVector(UP,height);
    const end=origin.clone().addScaledVector(UP,height*(1-leader));
    bolt(top,end,.04,Math.floor(time*20),12);
   }
  }
  for(const b of this.bursts){
   const age=b.age,p=b.point.clone().add(new THREE.Vector3(0,.15,0)),fade=Math.max(0,1-age/SKY_STRIKE_ART.life);
   if(age<.55){
    const primary=Math.exp(-age*9),returnStroke=Math.max(0,1-Math.abs(age-.19)/.06)*.55;
    const strength=primary+returnStroke;
    const top=p.clone().addScaledVector(UP,SKY_STRIKE_ART.boltHeight);
    const seed=b.seed+Math.floor(age*21);
    bolt(top,p,.42*strength,seed,26);
    for(let i=0;i<7;i++){
     const angle=i*2.39996+b.seed,height=10+i*6;
     const fork=p.clone().add(new THREE.Vector3(Math.cos(angle)*(3+i*.8),height+9,Math.sin(angle)*(3+i*.8)));
     bolt(fork,p.clone().addScaledVector(UP,height*.28),.11*strength,seed+i*3,10);
    }
    this.channel.visible=true;
    this.channel.position.copy(p).y+=SKY_STRIKE_ART.boltHeight*.5;
    this.channel.scale.set(C.strikeRadius,SKY_STRIKE_ART.boltHeight,C.strikeRadius);
    this.channel.material.opacity=.16*strength;this.channel.material.uniforms.opacity.value=.16*strength;

   }
   if(!b.restruck&&age>=.19){b.restruck=true;this.kit.bigArc(p.clone().addScaledVector(UP,SKY_STRIKE_ART.boltHeight),p,{life:.12,width:4.5,jag:.05,maxJag:9,flicker:.03,coreWidth:1.4});this.kit.glow(p.clone().addScaledVector(UP,1.5),{size:12,life:.2,color:WHITE,peak:.8});}
   this.scorch.visible=age<1.4;this.scorch.position.copy(p).y-=.1;this.scorch.scale.setScalar(C.strikeRadius*.95);
   this.scorch.material.uniforms.fade.value=Math.max(0,1-age/1.4);this.scorch.material.uniforms.seed.value=b.seed%6.28;
   const sr=Math.min(1,age/.5);this.shockRing.visible=sr<1;this.shockRing.position.copy(p).y-=.05;this.shockRing.scale.setScalar(.5+C.strikeRadius*1.45*(1-Math.pow(1-sr,3)));this.shockRing.material.uniforms.opacity.value=1-sr;
   if(this.light){this.lightActive=true;this.light.position.copy(p).y+=9;this.light.intensity=3400*Math.exp(-age*7)+2000*Math.max(0,1-Math.abs(age-.19)/.07);}
   this.flash.visible=true;this.flash.position.copy(p);const radius=C.strikeRadius*(1-Math.exp(-age*12));this.flash.scale.set(Math.max(.2,radius),Math.max(.15,radius*.45),Math.max(.2,radius));this.flash.material.opacity=.42*Math.exp(-age*7);this.disc.visible=true;this.disc.position.copy(p);this.disc.scale.setScalar(C.strikeRadius*.9);this.disc.material.opacity=.18*fade*fade;
   for(let i=0;i<3;i++){const t=Math.max(0,age-i*.09),m=this.rings[i],r=Math.min(C.strikeRadius,t*(16+i*2));m.visible=t>0&&age<.9;m.position.copy(p).y+=i*.025;m.scale.setScalar(Math.max(.1,r));m.material.opacity=Math.max(0,1-t/.7)*(.85-i*.15);}
   for(let i=0;i<10;i++){const a=i*Math.PI/5+b.seed,r=C.strikeRadius*(.25+.65*((i*7%10)/10)),end=p.clone().add(new THREE.Vector3(Math.cos(a)*r,.03,Math.sin(a)*r));if(age<1.1)bolt(p,end,.047*fade,Math.floor(age*16)+i,4);}
   for(let i=0;i<SKY_STRIKE_ART.sparks&&particles<SKY_STRIKE_ART.sparks;i++){const t=age-i%5*.015;if(t<0||t>1.2)continue;const a=i*2.39996+b.seed,speed=2+i%7*.75,velocity=new THREE.Vector3(Math.cos(a)*speed,4+i%6,Math.sin(a)*speed),position=p.clone().addScaledVector(velocity,t);position.y-=5*t*t;if(position.y<p.y)continue;const tail=position.clone().addScaledVector(velocity,-.025*(1-t/1.3));this.segment(this.sparks,particles++,tail,position,.025*(1-t/1.3));}
  }
  this.core.count=this.glow.count=n;this.sparks.count=particles;for(const mesh of[this.core,this.glow,this.sparks])mesh.instanceMatrix.needsUpdate=true;
 }
 diagnostics(){return{warning:this.charge.visible,crown:this.crown.filter(r=>r.visible).length,channel:this.channel.visible,bursts:this.bursts.length,segments:this.core.count,sparks:this.sparks.count,segmentLimit:SKY_STRIKE_ART.segments,sparkLimit:SKY_STRIKE_ART.sparks};}
}
