import * as THREE from './vendor/three.module.js';

// Shared lightning visuals for Volt's abilities: camera-facing crackling arcs,
// additive glow billboards and spark particles, all pooled.

export const CYAN=new THREE.Color('#2fd4ff'),BLUE=new THREE.Color('#1268ff'),WHITE=new THREE.Color('#f2ffff');
const ARC_POINTS=28;

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

export function ribbonMaterial(width,color,core){
 const additive=core<.5;
 return new THREE.ShaderMaterial({
  uniforms:{width:{value:width},color:{value:color.clone()},opacity:{value:1},core:{value:core}},
  vertexShader:ribbonVertex,fragmentShader:ribbonFragment,
  transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide,
  blending:additive?THREE.AdditiveBlending:THREE.NormalBlending
 });
}

export class Arc {
 constructor(group,points=ARC_POINTS){
  this.n=points;const ARC_POINTS_=points,count=points*2,geometry=new THREE.BufferGeometry();
  this.position=new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage);
  this.tangent=new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage);
  const side=new Float32Array(count),along=new Float32Array(count),index=[];
  for(let i=0;i<ARC_POINTS_;i++){side[i*2]=-1;side[i*2+1]=1;along[i*2]=along[i*2+1]=i/(ARC_POINTS_-1);}
  for(let i=0;i<ARC_POINTS_-1;i++){const a=i*2;index.push(a,a+1,a+2,a+1,a+3,a+2);}
  geometry.setAttribute('position',this.position).setAttribute('tangent',this.tangent)
   .setAttribute('side',new THREE.BufferAttribute(side,1)).setAttribute('along',new THREE.BufferAttribute(along,1)).setIndex(index);
  this.glow=new THREE.Mesh(geometry,ribbonMaterial(.42,CYAN,0));
  this.core=new THREE.Mesh(geometry,ribbonMaterial(.075,WHITE,1));
  for(const m of [this.glow,this.core]){m.frustumCulled=false;m.visible=false;m.renderOrder=6;group.add(m);}
  this.from=new THREE.Vector3();this.to=new THREE.Vector3();this.points=Array.from({length:ARC_POINTS_},()=>new THREE.Vector3());
  this.life=0;this.age=0;
 }
 fire(from,to,{life=.16,jag=.22,width=1,flicker=.03,color=CYAN,maxJag=4,coreWidth=1}={}){
  this.from.copy(from);this.to.copy(to);this.life=life;this.age=0;this.jag=jag;this.maxJag=maxJag;this.flicker=flicker;this.reshape=0;
  this.glow.material.uniforms.width.value=.42*width;this.core.material.uniforms.width.value=.08*width*coreWidth;
  this.glow.material.uniforms.color.value.copy(color);
  this.shape();this.glow.visible=this.core.visible=true;
 }
 shape(){
  // Midpoint-displacement lightning between the endpoints.
  const n=this.n-1,d=new THREE.Vector3().subVectors(this.to,this.from),length=d.length();
  const u=new THREE.Vector3().crossVectors(d,Math.abs(d.y)<length*.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize();
  const w=new THREE.Vector3().crossVectors(d,u).normalize();
  const offsets=new Float32Array((n+1)*2);
  const split=(a,b,scale)=>{if(b-a<2)return;const m=(a+b)>>1;
   offsets[m*2]=(offsets[a*2]+offsets[b*2])/2+(Math.random()-.5)*scale;
   offsets[m*2+1]=(offsets[a*2+1]+offsets[b*2+1])/2+(Math.random()-.5)*scale;
   split(a,m,scale*.58);split(m,b,scale*.58);};
  split(0,n,Math.min(this.maxJag,length*this.jag));
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
const sparkFragment=`uniform vec3 tint;varying float vLife;void main(){if(vLife<=0.)discard;vec2 c=gl_PointCoord*2.-1.;float a=max(0.,1.-dot(c,c));
 vec3 col=mix(tint,vec3(1.),a*a*vLife);gl_FragColor=vec4(col*a*1.4,a);}`;


export class LightningKit {
 constructor(parent,{arcs=26,glows=10,sparks=180,points=ARC_POINTS,bigArcs=0,bigPoints=64,sparkColor=new THREE.Color(.15,.75,1.)}={}){
  this.group=new THREE.Group();this.group.name='LightningKit';parent.add(this.group);
  this.arcs=Array.from({length:arcs},()=>new Arc(this.group,points));this.arcCursor=0;
  this.bigArcs=Array.from({length:bigArcs},()=>new Arc(this.group,bigPoints));this.bigCursor=0;
  this.glowGeometry=new THREE.PlaneGeometry(1,1);
  this.glows=Array.from({length:glows},()=>{
   const m=new THREE.Mesh(this.glowGeometry,new THREE.ShaderMaterial({uniforms:{color:{value:CYAN.clone()},opacity:{value:0}},
    vertexShader:glowVertex,fragmentShader:glowFragment,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,blending:THREE.AdditiveBlending}));
   m.frustumCulled=false;m.visible=false;m.renderOrder=7;this.group.add(m);return {mesh:m,age:0,life:0,size:1,grow:0,peak:1};
  });this.glowCursor=0;
  const count=this.sparkCount=sparks,sg=new THREE.BufferGeometry();
  this.sparkPos=new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage);
  this.sparkLife=new THREE.BufferAttribute(new Float32Array(count),1).setUsage(THREE.DynamicDrawUsage);
  this.sparkSize=new THREE.BufferAttribute(new Float32Array(count),1);
  sg.setAttribute('position',this.sparkPos).setAttribute('life',this.sparkLife).setAttribute('size',this.sparkSize);
  this.sparkVel=new Float32Array(count*3);this.sparkAge=new Float32Array(count);this.sparkMax=new Float32Array(count);this.sparkGravity=new Float32Array(count);this.sparkCursor=0;
  this.sparks=new THREE.Points(sg,new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(sparkColor)}},vertexShader:sparkVertex,fragmentShader:sparkFragment,transparent:true,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));
  this.sparks.frustumCulled=false;this.sparks.renderOrder=8;this.group.add(this.sparks);
 }
 arc(from,to,options){const a=this.arcs[this.arcCursor];this.arcCursor=(this.arcCursor+1)%this.arcs.length;a.fire(from,to,options);return a;}
 bigArc(from,to,options){if(!this.bigArcs.length)return this.arc(from,to,options);const a=this.bigArcs[this.bigCursor];this.bigCursor=(this.bigCursor+1)%this.bigArcs.length;a.fire(from,to,options);return a;}
 glow(position,{size=1,life=.15,grow=0,color=CYAN,peak=1}={}){
  const g=this.glows[this.glowCursor];this.glowCursor=(this.glowCursor+1)%this.glows.length;
  g.mesh.position.copy(position);g.mesh.material.uniforms.color.value.copy(color);
  Object.assign(g,{age:0,life,size,grow,peak});g.mesh.visible=true;g.mesh.scale.setScalar(size);g.mesh.material.uniforms.opacity.value=peak;
  return g;
 }
 spark(position,count,speed,up=1.5,{life=.3,lifeSpread=.35,size=.09,sizeSpread=.12,gravity=14,spread=null}={}){
  for(let n=0;n<count;n++){
   const i=this.sparkCursor;this.sparkCursor=(this.sparkCursor+1)%this.sparkCount;
   const v=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(speed*(.35+Math.random()*.65));
   v.y+=up*Math.random();
   let x=position.x,y=position.y,z=position.z;
   if(spread){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*spread;x+=Math.cos(a)*r;z+=Math.sin(a)*r;}
   this.sparkPos.setXYZ(i,x,y,z);this.sparkVel.set([v.x,v.y,v.z],i*3);this.sparkGravity[i]=gravity;
   this.sparkAge[i]=0;this.sparkMax[i]=life*(.8+Math.random()*lifeSpread*3);this.sparkSize.setX(i,size+Math.random()*sizeSpread);this.sparkLife.setX(i,1);
  }
  this.sparkSize.needsUpdate=true;
 }
 step(dt){
  for(const a of this.arcs)a.step(dt);for(const a of this.bigArcs)a.step(dt);
  for(const g of this.glows){
   if(!g.mesh.visible)continue;g.age+=dt;
   if(g.age>=g.life){g.mesh.visible=false;continue;}
   const t=g.age/g.life;g.mesh.scale.setScalar(g.size*(1+g.grow*t));g.mesh.material.uniforms.opacity.value=(1-t)*(1-t)*g.peak;
  }
  let alive=false;
  for(let i=0;i<this.sparkCount;i++){
   if(this.sparkLife.getX(i)<=0)continue;alive=true;
   this.sparkAge[i]+=dt;const life=1-this.sparkAge[i]/this.sparkMax[i];
   if(life<=0){this.sparkLife.setX(i,0);continue;}
   this.sparkVel[i*3+1]-=this.sparkGravity[i]*dt;for(let k=0;k<3;k++)this.sparkVel[i*3+k]*=1-2.2*dt;
   this.sparkPos.setXYZ(i,this.sparkPos.getX(i)+this.sparkVel[i*3]*dt,this.sparkPos.getY(i)+this.sparkVel[i*3+1]*dt,this.sparkPos.getZ(i)+this.sparkVel[i*3+2]*dt);
   this.sparkLife.setX(i,life);
  }
  if(alive){this.sparkPos.needsUpdate=this.sparkLife.needsUpdate=true;}
 }
 clear(){
  for(const a of this.arcs)a.hide();for(const a of this.bigArcs)a.hide();for(const g of this.glows)g.mesh.visible=false;
  for(let i=0;i<this.sparkCount;i++)this.sparkLife.setX(i,0);this.sparkLife.needsUpdate=true;
 }
}

// A standalone soft glow billboard for persistent auras (always faces the camera, additive).
export function glowBillboard(color=CYAN,renderOrder=7){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({uniforms:{color:{value:new THREE.Color(color)},opacity:{value:1}},
  vertexShader:glowVertex,fragmentShader:glowFragment,transparent:true,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));
 m.frustumCulled=false;m.renderOrder=renderOrder;return m;
}
