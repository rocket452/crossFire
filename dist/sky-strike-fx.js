import * as THREE from './vendor/three.module.js';
import {VOLT_STORM as C} from './runner-storm.js?v=392';
export const SKY_STRIKE_ART=Object.freeze({life:1.5,segments:320,sparks:64,boltHeight:C.strikeHeight});
const UP=new THREE.Vector3(0,1,0);
export class SkyStrikeFX {
 constructor(parent){this.root=new THREE.Group();this.root.name='Sky Strike corona and afterglow';parent.add(this.root);const mat=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false}),cylinder=new THREE.CylinderGeometry(1,1,1,5,1,true);this.core=new THREE.InstancedMesh(cylinder,mat('#f1ffff'),SKY_STRIKE_ART.segments);this.glow=new THREE.InstancedMesh(cylinder,mat('#268eff',.28),SKY_STRIKE_ART.segments);this.sparks=new THREE.InstancedMesh(cylinder,mat('#b9faff'),SKY_STRIKE_ART.sparks);for(const m of[this.core,this.glow,this.sparks]){m.frustumCulled=false;this.root.add(m);}this.rings=Array.from({length:3},()=>{const m=new THREE.Mesh(new THREE.RingGeometry(.96,1,80),mat('#62dbff',.8));m.rotation.x=-Math.PI/2;this.root.add(m);return m;});this.crown=Array.from({length:3},()=>new THREE.Mesh(new THREE.TorusGeometry(1,.025,4,48),mat('#8eb8ff',.7)));
  this.channel=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,24,1,true),mat('#7bb8ff',.19));
  this.root.add(...this.crown,this.channel);
  this.charge=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),mat('#bceeff',.65));this.flash=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),mat('#c6faff',.25));this.disc=new THREE.Mesh(new THREE.CircleGeometry(1,64),mat('#288eff',.12));this.disc.rotation.x=-Math.PI/2;this.root.add(this.charge,this.flash,this.disc);this.dummy=new THREE.Object3D();this.clear();}
 clear(){this.seen=new WeakSet();this.bursts=[];this.hide();}
 hide(){this.core.count=this.glow.count=this.sparks.count=0;for(const m of[...this.rings,...this.crown,this.channel,this.charge,this.flash,this.disc])m.visible=false;}
 sound(audio){if(!audio||audio.state!=='running')return;try{const t=audio.currentTime,buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.65),audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**2;const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();noise.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(2400,t);filter.frequency.exponentialRampToValueAtTime(90,t+.6);gain.gain.setValueAtTime(.13,t);gain.gain.exponentialRampToValueAtTime(.001,t+.65);noise.connect(filter);filter.connect(gain);gain.connect(audio.destination);noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};noise.start();}catch{}}
 segment(mesh,index,a,b,width){const d=b.clone().sub(a),length=d.length();if(length<1e-6)return;this.dummy.position.copy(a).lerp(b,.5);this.dummy.quaternion.setFromUnitVectors(UP,d.multiplyScalar(1/length));this.dummy.scale.set(width,length,width);this.dummy.updateMatrix();mesh.setMatrixAt(index,this.dummy.matrix);}
 update(dt,time,storm){this.hide();for(const b of this.bursts)b.age+=Math.max(0,dt);this.bursts=this.bursts.filter(b=>b.age<SKY_STRIKE_ART.life);for(const e of storm.events)if(e.kind==='strike'&&!this.seen.has(e)){this.seen.add(e);this.bursts.push({point:e.point.clone(),age:e.age,seed:time});if(this.bursts.length>2)this.bursts.shift();}let n=0,particles=0;
  const line=(a,b,width)=>{if(n>=SKY_STRIKE_ART.segments)return;this.segment(this.core,n,a,b,width);this.segment(this.glow,n,a,b,width*4);n++;},bolt=(a,b,width,seed,steps=14)=>{let last=a.clone();for(let i=1;i<=steps;i++){const f=i/steps,p=a.clone().lerp(b,f);if(i<steps)p.add(new THREE.Vector3(Math.sin(i*13+seed),Math.cos(i*7+seed)*.12,Math.cos(i*17-seed)).multiplyScalar(.45+.65*(1-f)));line(last,p,width);last=p;}};
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
    ring.material.opacity=.22+progress*(i===0?.42:.57);
    ring.material.color.set(progress>.82?'#b9b3ff':'#62dbff');
   }
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
    ring.material.opacity=(.15+progress*.51)*(1-i*.14);
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
    this.channel.material.opacity=.16*strength;

   }
   this.flash.visible=true;this.flash.position.copy(p);const radius=C.strikeRadius*(1-Math.exp(-age*12));this.flash.scale.set(Math.max(.2,radius),Math.max(.15,radius*.45),Math.max(.2,radius));this.flash.material.opacity=.42*Math.exp(-age*7);this.disc.visible=true;this.disc.position.copy(p);this.disc.scale.setScalar(C.strikeRadius*.9);this.disc.material.opacity=.18*fade*fade;
   for(let i=0;i<3;i++){const t=Math.max(0,age-i*.09),m=this.rings[i],r=Math.min(C.strikeRadius,t*(16+i*2));m.visible=t>0&&age<.9;m.position.copy(p).y+=i*.025;m.scale.setScalar(Math.max(.1,r));m.material.opacity=Math.max(0,1-t/.7)*(.85-i*.15);}
   for(let i=0;i<10;i++){const a=i*Math.PI/5+b.seed,r=C.strikeRadius*(.25+.65*((i*7%10)/10)),end=p.clone().add(new THREE.Vector3(Math.cos(a)*r,.03,Math.sin(a)*r));if(age<1.1)bolt(p,end,.047*fade,Math.floor(age*16)+i,4);}
   for(let i=0;i<SKY_STRIKE_ART.sparks&&particles<SKY_STRIKE_ART.sparks;i++){const t=age-i%5*.015;if(t<0||t>1.2)continue;const a=i*2.39996+b.seed,speed=2+i%7*.75,velocity=new THREE.Vector3(Math.cos(a)*speed,4+i%6,Math.sin(a)*speed),position=p.clone().addScaledVector(velocity,t);position.y-=5*t*t;if(position.y<p.y)continue;const tail=position.clone().addScaledVector(velocity,-.025*(1-t/1.3));this.segment(this.sparks,particles++,tail,position,.025*(1-t/1.3));}
  }
  this.core.count=this.glow.count=n;this.sparks.count=particles;for(const mesh of[this.core,this.glow,this.sparks])mesh.instanceMatrix.needsUpdate=true;
 }
 diagnostics(){return{warning:this.charge.visible,crown:this.crown.filter(r=>r.visible).length,channel:this.channel.visible,bursts:this.bursts.length,segments:this.core.count,sparks:this.sparks.count,segmentLimit:SKY_STRIKE_ART.segments,sparkLimit:SKY_STRIKE_ART.sparks};}
}
