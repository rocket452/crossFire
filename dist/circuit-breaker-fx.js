import * as THREE from './vendor/three.module.js';

// Visual layer for Volt's Circuit Breaker: lightning bolts, flank marks and detonations.
// Gameplay (timing, marks, damage) stays in circuit-breaker.js; this only draws.

const CYAN=new THREE.Color('#2fd4ff'),BLUE=new THREE.Color('#1268ff'),WHITE=new THREE.Color('#f2ffff');
const ARC_POINTS=28,ARC_POOL=26,SPARKS=180,GLOWS=10;

// Camera-facing ribbon: each point is duplicated; the vertex shader pushes the pair apart
// perpendicular to both the arc tangent and the view direction.
const ribbonVertex=`
attribute vec3 tangent;attribute float side;attribute float along;
uniform float width;varying float vSide;varying float vAlong;
void main(){
 vec4 world=modelMatrix*vec4(position,1.);
 vec3 view=normalize(cameraPosition-world.xyz);
 vec3 dir=normalize(mat3(modelMatrix)*tangent+1e-5);
 vec3 offset=normalize(cross(dir,view)+1e-5);
 float taper=.35+.65*sin(clamp(along,0.,1.)*3.14159);
 world.xyz+=offset*side*width*taper;
 vSide=side;vAlong=along;
 gl_Position=projectionMatrix*viewMatrix*world;
}`;
const ribbonFragment=`
uniform vec3 color;uniform float opacity;uniform float core;varying float vSide;varying float vAlong;
void main(){
 float d=abs(vSide);
 float glow=pow(1.-d,mix(1.6,5.,core));
 float centre=smoothstep(.6,0.,d)*core;
 vec3 c=mix(color,vec3(1.),centre);
 float a=clamp(glow*mix(.85,1.2,core),0.,1.)*opacity;
 gl_FragColor=core>.5?vec4(c,a):vec4(c*a*1.6,a);
}`;

function ribbonMaterial(width,color,core){
 const additive=core<.5;
 return new THREE.ShaderMaterial({
  uniforms:{width:{value:width},color:{value:color.clone()},opacity:{value:1},core:{value:core}},
  vertexShader:ribbonVertex,fragmentShader:ribbonFragment,
  transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,
  blending:additive?THREE.AdditiveBlending:THREE.NormalBlending
 });
}

class Arc {
 constructor(group){
  const count=ARC_POINTS*2,geometry=new THREE.BufferGeometry();
  this.position=new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage);
  this.tangent=new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage);
  const side=new Float32Array(count),along=new Float32Array(count),index=[];
  for(let i=0;i<ARC_POINTS;i++){side[i*2]=-1;side[i*2+1]=1;along[i*2]=along[i*2+1]=i/(ARC_POINTS-1);}
  for(let i=0;i<ARC_POINTS-1;i++){const a=i*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}
  geometry.setAttribute('position',this.position).setAttribute('tangent',this.tangent)
   .setAttribute('side',new THREE.BufferAttribute(side,1)).setAttribute('along',new THREE.BufferAttribute(along,1)).setIndex(index);
  this.glow=new THREE.Mesh(geometry,ribbonMaterial(.42,CYAN,0));
  this.core=new THREE.Mesh(geometry,ribbonMaterial(.075,WHITE,1));
  for(const m of [this.glow,this.core]){m.frustumCulled=false;m.visible=false;m.renderOrder=6;group.add(m);}
  this.from=new THREE.Vector3();this.to=new THREE.Vector3();this.points=Array.from({length:ARC_POINTS},()=>new THREE.Vector3());
  this.life=0;this.age=0;
 }
 fire(from,to,{life=.16,jag=.22,width=1,flicker=.03,color=CYAN}={}){
  this.from.copy(from);this.to.copy(to);this.life=life;this.age=0;this.jag=jag;this.flicker=flicker;this.reshape=0;
  this.glow.material.uniforms.width.value=.42*width;this.core.material.uniforms.width.value=.08*width;
  this.glow.material.uniforms.color.value.copy(color);
  this.shape();this.glow.visible=this.core.visible=true;
 }
 shape(){
  // Midpoint-displacement lightning between the endpoints.
  const n=ARC_POINTS-1,d=new THREE.Vector3().subVectors(this.to,this.from),length=d.length();
  const u=new THREE.Vector3().crossVectors(d,Math.abs(d.y)<length*.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize();
  const w=new THREE.Vector3().crossVectors(d,u).normalize();
  const offsets=new Float32Array((n+1)*2);
  const split=(a,b,scale)=>{if(b-a<2)return;const m=(a+b)>>1;
   offsets[m*2]=(offsets[a*2]+offsets[b*2])/2+(Math.random()-.5)*scale;
   offsets[m*2+1]=(offsets[a*2+1]+offsets[b*2+1])/2+(Math.random()-.5)*scale;
   split(a,m,scale*.58);split(m,b,scale*.58);};
  split(0,n,Math.min(4,length*this.jag));
  for(let i=0;i<=n;i++){
   const t=i/n,p=this.points[i].copy(this.from).addScaledVector(d,t);
   const k=Math.min(1,t*n,(1-t)*n);
   p.addScaledVector(u,offsets[i*2]*k).addScaledVector(w,offsets[i*2+1]*k);
  }
  for(let i=0;i<=n;i++){
   const p=this.points[i],prev=this.points[Math.max(0,i-1)],next=this.points[Math.min(n,i+1)];
   for(const k of [i*2,i*2+1]){this.position.setXYZ(k,p.x,p.y,p.z);this.tangent.setXYZ(k,next.x-prev.x,next.y-prev.y,next.z-prev.z);}
  }
  this.position.needsUpdate=this.tangent.needsUpdate=true;
 }
 step(dt){
  if(!this.core.visible)return false;
  this.age+=dt;this.reshape-=dt;
  if(this.age>=this.life){this.glow.visible=this.core.visible=false;return false;}
  if(this.reshape<=0){this.shape();this.reshape=this.flicker;}
  const fade=1-this.age/this.life,strobe=.75+.25*Math.sin(this.age*95);
  this.glow.material.uniforms.opacity.value=fade*strobe;
  this.core.material.uniforms.opacity.value=Math.min(1,fade*1.6);
  return true;
 }
 hide(){this.life=0;this.glow.visible=this.core.visible=false;}
}

const glowVertex=`varying vec2 vUv;void main(){vUv=uv*2.-1.;
 vec4 view=modelViewMatrix*vec4(0.,0.,0.,1.);
 vec2 scale=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));
 view.xy+=position.xy*scale;gl_Position=projectionMatrix*view;}`;
const glowFragment=`uniform vec3 color;uniform float opacity;varying vec2 vUv;void main(){
 float r=length(vUv);float a=pow(max(0.,1.-r),1.8);float hot=pow(max(0.,1.-r*1.7),2.);
 vec3 c=mix(color*a,vec3(1.),hot);gl_FragColor=vec4(c*opacity,1.);}`;

const sparkVertex=`attribute float life;attribute float size;varying float vLife;
void main(){vLife=life;vec4 view=modelViewMatrix*vec4(position,1.);gl_PointSize=size*life*(260./-view.z);gl_Position=projectionMatrix*view;}`;
const sparkFragment=`varying float vLife;void main(){if(vLife<=0.)discard;vec2 c=gl_PointCoord*2.-1.;float a=max(0.,1.-dot(c,c));
 vec3 col=mix(vec3(.15,.75,1.),vec3(1.),a*a*vLife);gl_FragColor=vec4(col*a*1.4,a);}`;

// Flank mark: a band around the target whose valid flank arc is bright, with chevrons
// streaming toward the flank, rotating dashes and an expiry sweep.
const markVertex=`varying vec2 radial;varying float vBand;void main(){radial=position.xz;vBand=clamp((length(position.xz)-.7)/.36,0.,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const markFragment=`varying vec2 radial;varying float vBand;uniform float threshold;uniform float time;uniform float remaining;uniform float pulse;
void main(){
 vec2 dir=normalize(radial);
 float angle=atan(dir.y,dir.x);
 float flank=smoothstep(threshold-.04,threshold+.04,dir.x);
 float edge=pow(1.-abs(vBand*2.-1.),1.5);
 float toward=sign(angle);
 float dashes=smoothstep(.35,.5,fract(abs(angle)*9./3.1416+time*1.8))*smoothstep(1.,.85,fract(abs(angle)*9./3.1416+time*1.8));
 float chevron=step(.62,fract(abs(angle)*5./3.1416+time*2.2+abs(vBand-.5)*1.4));
 float left=step(angle/6.2832+.5,remaining);
 vec3 near=vec3(.1,.6,1.),hot=vec3(.25,.9,1.);
 vec3 col=mix(near*(1.1+1.8*dashes),mix(hot,vec3(1.),chevron*.75)*1.4,flank);
 float alpha=edge*(.55+.45*left)*(1.+pulse*1.5);
 gl_FragColor=vec4(mix(col,vec3(1.),pulse*.5)*alpha,1.);
}`;

// Translucent wall over the flank half of the mark: rising scan stripes say "strike from here".
const wallVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const wallFragment=`varying vec2 vUv;uniform float time;uniform float remaining;uniform float pulse;void main(){
 float bars=smoothstep(.35,.5,abs(fract(vUv.x*14.)-.5)*2.);
 float scan=pow(fract(vUv.y*2.2-time*1.6),6.);
 float fade=pow(1.-vUv.y,1.6)*smoothstep(0.,.08,vUv.x)*smoothstep(1.,.92,vUv.x);
 float base=smoothstep(.12,0.,vUv.y);
 vec3 col=mix(vec3(.15,.75,1.),vec3(1.),scan*.7+base*.6);
 float a=(.12+.28*bars+.5*scan+.55*base)*fade*(.35+.65*remaining)*(1.+pulse);
 gl_FragColor=vec4(col*clamp(a,0.,1.),1.);}`;

const shockVertex=`varying vec2 vUv;void main(){vUv=vec2(0.,clamp((length(position.xy)-.86)/.14,0.,1.));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const shockFragment=`uniform float opacity;uniform vec3 color;varying vec2 vUv;void main(){float band=pow(1.-abs(vUv.y*2.-1.),2.);
 gl_FragColor=vec4(mix(color,vec3(1.),band*band*.7)*band*opacity*1.3,1.);}`;

function markerTexture(){
 // Hexagonal badge with a lightning bolt, drawn once.
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
 const hex=(r)=>{g.beginPath();for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;g.lineTo(64+Math.cos(a)*r,64+Math.sin(a)*r);}g.closePath();};
 g.shadowColor='#36e0ff';g.shadowBlur=18;g.lineWidth=7;g.strokeStyle='#7ff3ff';hex(50);g.stroke();
 g.shadowBlur=0;g.fillStyle='rgba(20,120,190,.45)';hex(43);g.fill();
 g.shadowColor='#ffffff';g.shadowBlur=12;g.fillStyle='#f4ffff';g.beginPath();
 for(const [x,y] of [[72,20],[42,70],[62,70],[52,108],[88,54],[67,54],[80,20]])g.lineTo(x,y);g.closePath();g.fill();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export class CircuitBreakerFX {
 constructor(scene,{angleDegrees}){
  this.scene=scene;this.group=new THREE.Group();this.group.name='CircuitBreakerFX';scene.add(this.group);
  this.time=0;
  this.arcs=Array.from({length:ARC_POOL},()=>new Arc(this.group));this.arcCursor=0;
  // Additive glow billboards (muzzle, impact, detonation core).
  this.glowGeometry=new THREE.PlaneGeometry(1,1);
  this.glows=Array.from({length:GLOWS},()=>{
   const m=new THREE.Mesh(this.glowGeometry,new THREE.ShaderMaterial({uniforms:{color:{value:CYAN.clone()},opacity:{value:0}},
    vertexShader:glowVertex,fragmentShader:glowFragment,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,blending:THREE.AdditiveBlending}));
   m.frustumCulled=false;m.visible=false;m.renderOrder=7;this.group.add(m);return {mesh:m,age:0,life:0,size:1,grow:0};
  });this.glowCursor=0;
  // Spark particles.
  const sg=new THREE.BufferGeometry();
  this.sparkPos=new THREE.BufferAttribute(new Float32Array(SPARKS*3),3).setUsage(THREE.DynamicDrawUsage);
  this.sparkLife=new THREE.BufferAttribute(new Float32Array(SPARKS),1).setUsage(THREE.DynamicDrawUsage);
  this.sparkSize=new THREE.BufferAttribute(new Float32Array(SPARKS),1);
  sg.setAttribute('position',this.sparkPos).setAttribute('life',this.sparkLife).setAttribute('size',this.sparkSize);
  this.sparkVel=new Float32Array(SPARKS*3);this.sparkAge=new Float32Array(SPARKS);this.sparkMax=new Float32Array(SPARKS);this.sparkCursor=0;
  this.sparks=new THREE.Points(sg,new THREE.ShaderMaterial({vertexShader:sparkVertex,fragmentShader:sparkFragment,transparent:true,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));
  this.sparks.frustumCulled=false;this.sparks.renderOrder=8;this.group.add(this.sparks);
  // Mark band and detonation shock rings.
  this.markGeometry=new THREE.RingGeometry(.7,1.06,96,1);this.markGeometry.rotateX(-Math.PI/2);
  const t=-Math.cos(angleDegrees*Math.PI/180),start=Math.asin(Math.max(-1,Math.min(1,t)));
  this.wallGeometry=new THREE.CylinderGeometry(1.02,1.02,1,64,1,true,start,Math.PI-2*start);this.wallGeometry.translate(0,.5,0);
  this.wallMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0},remaining:{value:1},pulse:{value:0}},vertexShader:wallVertex,fragmentShader:wallFragment,
   transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:THREE.AdditiveBlending});
  this.markMaterial=new THREE.ShaderMaterial({uniforms:{threshold:{value:-Math.cos(angleDegrees*Math.PI/180)},time:{value:0},remaining:{value:1},pulse:{value:0}},
   vertexShader:markVertex,fragmentShader:markFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:THREE.AdditiveBlending});
  const shockGeometry=new THREE.RingGeometry(.86,1,72,1);
  this.shock=new THREE.Group();this.shock.visible=false;this.group.add(this.shock);
  for(const [x,y] of [[Math.PI/2,0],[.5,.6],[-.62,-.75]]){
   const ring=new THREE.Mesh(shockGeometry,new THREE.ShaderMaterial({uniforms:{opacity:{value:1},color:{value:CYAN.clone()}},
    vertexShader:shockVertex,fragmentShader:shockFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:THREE.AdditiveBlending}));
   ring.rotation.set(x,y,0);ring.renderOrder=6;this.shock.add(ring);
  }
  this.shockAge=1;this.marks=new Set();
  this.markerMaterial=typeof document!=='undefined'?new THREE.SpriteMaterial({map:markerTexture(),transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}):null;
 }
 nextArc(){const a=this.arcs[this.arcCursor];this.arcCursor=(this.arcCursor+1)%this.arcs.length;return a;}
 glow(position,{size=1,life=.15,grow=0,color=CYAN}={}){
  const g=this.glows[this.glowCursor];this.glowCursor=(this.glowCursor+1)%this.glows.length;
  g.mesh.position.copy(position);g.mesh.material.uniforms.color.value.copy(color);
  Object.assign(g,{age:0,life,size,grow});g.mesh.visible=true;g.mesh.scale.setScalar(size);
 }
 spark(position,count,speed,up=1.5){
  for(let n=0;n<count;n++){
   const i=this.sparkCursor;this.sparkCursor=(this.sparkCursor+1)%SPARKS;
   const v=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(speed*(.35+Math.random()*.65));
   v.y+=up*Math.random();
   this.sparkPos.setXYZ(i,position.x,position.y,position.z);this.sparkVel.set([v.x,v.y,v.z],i*3);
   this.sparkAge[i]=0;this.sparkMax[i]=.25+Math.random()*.35;this.sparkSize.setX(i,.09+Math.random()*.12);this.sparkLife.setX(i,1);
  }
  this.sparkSize.needsUpdate=true;
 }
 bolt(from,to,index=0){
  // Main bolt, two forks off it, a muzzle glow and an impact burst.
  const main=this.nextArc();main.fire(from,to,{life:.17,jag:.2,width:1.15});
  const d=new THREE.Vector3().subVectors(to,from);
  for(let f=0;f<2;f++){
   const start=new THREE.Vector3().copy(from).addScaledVector(d,.35+Math.random()*.4);
   const end=start.clone().addScaledVector(d,.12+Math.random()*.15).add(new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(d.length()*.16));
   this.nextArc().fire(start,end,{life:.11,jag:.35,width:.55});
  }
  this.glow(from,{size:.9,life:.12});
  this.glow(to,{size:1.6+index*.2,life:.2,grow:1.6});
  for(let k=0;k<3;k++){
   const dir=new THREE.Vector3(Math.random()-.5,Math.random()-.3,Math.random()-.5).normalize();
   const p=new THREE.Vector3().copy(to);this.nextArc().fire(p,p.clone().addScaledVector(dir,.8+Math.random()*.9),{life:.12,jag:.45,width:.5,flicker:.025});
  }
  this.spark(to,16,7);
 }
 addMark(ring){
  const band=new THREE.Mesh(this.markGeometry,this.markMaterial.clone());band.renderOrder=5;
  const wall=new THREE.Mesh(this.wallGeometry,this.wallMaterial.clone());wall.renderOrder=5;wall.scale.set(1,.9,1);
  ring.add(band,wall);ring.userData.band=band;ring.userData.wall=wall;
  if(this.markerMaterial){const marker=new THREE.Sprite(this.markerMaterial.clone());marker.renderOrder=9;marker.material.opacity=0;const k=1/ring.scale.x;marker.scale.set(1.05*k,1.05*k,1);marker.position.set(0,.5+.75*k,0);ring.add(marker);ring.userData.marker=marker;}
  band.material.uniforms.pulse.value=1;wall.material.uniforms.pulse.value=1;ring.userData.age=0;ring.userData.crackle=0;this.marks.add(ring);
  this.glow(ring.position,{size:ring.scale.x*2.2,life:.22,grow:1});
 }
 removeMark(ring){this.marks.delete(ring);for(const key of ['band','wall','marker']){const m=ring.userData[key];if(m){m.material.dispose();ring.remove(m);}}}
 detonate(hitPoint){
  const point=new THREE.Vector3().copy(hitPoint);
  this.shock.position.copy(point);this.shockAge=0;this.shock.visible=true;
  this.glow(point,{size:1.9,life:.2,grow:2.6,color:WHITE});
  this.glow(point,{size:3.4,life:.4,grow:4});
  for(let i=0;i<9;i++){
   const dir=new THREE.Vector3(Math.random()-.5,(Math.random()-.25)*.9,Math.random()-.5).normalize();
   this.nextArc().fire(point,point.clone().addScaledVector(dir,1.7+Math.random()*1.7),{life:.26+Math.random()*.12,jag:.38,width:.85,flicker:.035});
  }
  this.spark(point,70,15,4);
 }
 step(dt,markInfo){
  this.time+=dt;
  for(const a of this.arcs)a.step(dt);
  for(const g of this.glows){
   if(!g.mesh.visible)continue;g.age+=dt;
   if(g.age>=g.life){g.mesh.visible=false;continue;}
   const t=g.age/g.life;g.mesh.scale.setScalar(g.size*(1+g.grow*t));g.mesh.material.uniforms.opacity.value=(1-t)*(1-t);
  }
  let alive=false;
  for(let i=0;i<SPARKS;i++){
   if(this.sparkLife.getX(i)<=0)continue;alive=true;
   this.sparkAge[i]+=dt;const life=1-this.sparkAge[i]/this.sparkMax[i];
   if(life<=0){this.sparkLife.setX(i,0);continue;}
   this.sparkVel[i*3+1]-=14*dt;for(let k=0;k<3;k++)this.sparkVel[i*3+k]*=1-2.2*dt;
   this.sparkPos.setXYZ(i,this.sparkPos.getX(i)+this.sparkVel[i*3]*dt,this.sparkPos.getY(i)+this.sparkVel[i*3+1]*dt,this.sparkPos.getZ(i)+this.sparkVel[i*3+2]*dt);
   this.sparkLife.setX(i,life);
  }
  if(alive){this.sparkPos.needsUpdate=this.sparkLife.needsUpdate=true;}
  for(const ring of this.marks){
   const info=markInfo(ring),u=ring.userData.band.material.uniforms;ring.userData.age+=dt;
   u.time.value=this.time;u.remaining.value=info.remaining;u.pulse.value=Math.max(0,1-ring.userData.age/.25);
   const w=ring.userData.wall.material.uniforms;w.time.value=this.time;w.remaining.value=info.remaining;w.pulse.value=u.pulse.value;
   // The gameplay anchor sits at body height; draw the band and wall at the target's feet so the body can't hide them.
   const drop=(ring.position.y-(info.ground+.18))/ring.scale.x;
   ring.userData.band.position.y=-drop;ring.userData.wall.position.y=-drop;
   const marker=ring.userData.marker;
   if(marker){
    // Constant world size above the target; pops in, bobs, blinks in the last quarter.
    const k=1/ring.scale.x,pop=1+.6*u.pulse.value,size=1.05*pop;
    marker.scale.set(size*k,size*k,1);marker.position.set(0,.5+(.75+.12*Math.sin(this.time*4))*k,0);
    const blink=info.remaining<.25?(Math.sin(this.time*28)>0?1:.25):1;
    marker.material.opacity=Math.min(1,ring.userData.age/.12)*blink;
   }
   ring.userData.crackle-=dt;
   if(ring.userData.crackle<=0){
    // Small arcs leap between the band and the target's core.
    ring.userData.crackle=.07+Math.random()*.08;
    const angle=Math.random()*Math.PI*2,r=ring.scale.x*.9;
    const from=new THREE.Vector3(Math.cos(angle)*r,0,Math.sin(angle)*r).add(ring.position);
    const to=ring.position.clone().add(new THREE.Vector3((Math.random()-.5)*r*.6,(Math.random()-.2)*r*.7,(Math.random()-.5)*r*.6));
    this.nextArc().fire(from,to,{life:.09,jag:.4,width:.42,flicker:.03});
   }
  }
  this.shockAge+=dt;const age=Math.min(1,this.shockAge/.42);
  this.shock.visible=age<1;
  if(this.shock.visible){
   const ease=1-Math.pow(1-age,3);this.shock.scale.setScalar(.4+5.2*ease);
   this.shock.children.forEach((ring,i)=>{ring.material.uniforms.opacity.value=(1-age)*(i?0.7:1);ring.rotation.z+=dt*(i?3:1);});
  }
 }
 clear(){
  for(const a of this.arcs)a.hide();for(const g of this.glows)g.mesh.visible=false;
  for(let i=0;i<SPARKS;i++)this.sparkLife.setX(i,0);this.sparkLife.needsUpdate=true;
  this.shock.visible=false;this.shockAge=1;
 }
}
