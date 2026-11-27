import * as THREE from './vendor/three.module.js';
import {flame} from './pyroclast-fx.js?v=461';

// Meteor shower spectacle for Pyroclast: a burning rift that opens in the sky, target beams over each
// warning ring, molten rocks with glowing cracks, smoke trails, flying debris and fires left burning in
// the craters. Pure visuals; damage and timing stay in pyroclast.js.
const NOISE=`float mh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float mn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mh(i),mh(i+vec2(1,0)),f.x),mix(mh(i+vec2(0,1)),mh(i+vec2(1,1)),f.x),f.y);}
float mf(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*mn(p);p=p*2.02+vec2(4.1,1.3);a*=.5;}return v;}
vec3 fireRamp(float t){t=clamp(t,0.,1.);return mix(mix(vec3(.35,.03,.02),vec3(1.,.32,.05),smoothstep(0.,.45,t)),mix(vec3(1.,.72,.2),vec3(1.,.97,.8),smoothstep(.75,1.,t)),smoothstep(.45,.8,t));}`;
const additive={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide};

// Sky rift: a downward-facing vortex of fire with a dark core and a burning rim.
const riftFragment=NOISE+`uniform float time;uniform float open;varying vec2 vP;void main(){
 float r=length(vP);if(r>1.)discard;float a=atan(vP.y,vP.x);
 float spiral=sin(a*5.+r*14.-time*2.6+mf(vP*3.+time*.2)*4.);
 float swirl=mf(vec2(a*2.5+r*5.-time*.9,r*5.-time*1.4));
 float arms=smoothstep(.1,.9,spiral*.5+.5)*swirl;
 float rim=smoothstep(.72,.92,r)*smoothstep(1.,.93,r)*(.75+.5*mf(vec2(a*6.,time*2.)));
 float core=smoothstep(.32,.05,r);
 float heat=arms*smoothstep(.15,.6,r)*smoothstep(1.,.75,r)+rim;
 vec3 c=fireRamp(heat*.95+.05)*heat*1.6+vec3(.5,.04,.03)*core*.6;
 float v=open*(1.-smoothstep(.97,1.,r));
 gl_FragColor=vec4(c*v,1.);}`;
// Target beam: a camera-facing column rising from a warning ring, hotter and faster as impact nears.
const beamVertex=`varying vec2 vUv;void main(){vUv=vec2(position.x+.5,position.y);
 vec3 center=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));
 vec3 view=normalize(cameraPosition-center);vec3 right=normalize(cross(vec3(0.,1.,0.),view)+vec3(1e-5,0.,0.));
 gl_Position=projectionMatrix*viewMatrix*vec4(center+right*position.x*sc.x+vec3(0.,1.,0.)*position.y*sc.y,1.);}`;
const beamFragment=`uniform float progress;uniform float time;uniform float fade;varying vec2 vUv;void main(){
 float x=abs(vUv.x-.5)*2.,h=vUv.y;
 float core=smoothstep(.22,0.,x),glow=smoothstep(1.,0.,x)*.35;
 float pulse=.65+.35*sin(time*(6.+22.*progress)-h*8.);
 float rise=smoothstep(0.,.05,h)*pow(1.-h,1.6);
 vec3 c=mix(vec3(1.,.18,.05),vec3(1.,.85,.4),progress*progress);
 float v=(core*.9+glow)*rise*pulse*fade*(.45+.75*progress);
 gl_FragColor=vec4(c*v,1.);}`;
// Soft smoke billboard (normal blending) for dark trails and dust rings.
const smokeVertex=`varying vec2 vUv;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);
 vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));mv.xy+=position.xy*sc;gl_Position=projectionMatrix*mv;}`;
const smokeFragment=NOISE+`uniform float alpha;uniform float seed;uniform vec3 tint;varying vec2 vUv;void main(){
 vec2 p=vUv-.5;float r=length(p)*2.;float n=mf(p*3.+seed);float m=smoothstep(1.,.25,r+n*.45-.2);
 if(m<.01)discard;gl_FragColor=vec4(tint*(.75+.5*n),m*alpha);}`;

function moltenMaterial(uniforms){
 const m=new THREE.MeshStandardMaterial({color:'#2b1b17',roughness:.85,metalness:.05,flatShading:true,emissive:'#3a0a04',emissiveIntensity:1});
 m.onBeforeCompile=sh=>{sh.uniforms.time=uniforms.time;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vObj;').replace('#include <begin_vertex>','#include <begin_vertex>\nvObj=position;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vObj;uniform float time;'+NOISE)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   {float n=mf(vObj.xy*2.6+vObj.z*1.7+vec2(time*.4,0.));float crack=1.-smoothstep(0.,.06,abs(n-.5));float pulse=.7+.3*sin(time*7.+vObj.y*5.);
    totalEmissiveRadiance+=fireRamp(.55+.45*crack*pulse)*crack*2.2+vec3(.5,.08,.02)*(1.-crack)*.4;}`);};
 m.customProgramCacheKey=()=>'pyroclast-molten';return m;
}

export class MeteorShowerFX {
 constructor(fx){
  this.fx=fx;this.group=new THREE.Group();this.group.name='Pyroclast meteor shower';fx.group.add(this.group);
  this.uniforms={time:{value:0}};this.time=0;
  this.rift=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.ShaderMaterial({uniforms:{time:this.uniforms.time,open:{value:0}},vertexShader:`varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:riftFragment,...additive}));
  this.rift.rotation.x=Math.PI/2;this.rift.visible=false;this.rift.frustumCulled=false;this.rift.renderOrder=3;this.group.add(this.rift);
  this.riftState={open:0,target:0,radius:14};
  this.molten=moltenMaterial(this.uniforms);
  this.rockGeometry=new THREE.DodecahedronGeometry(1,1);
  const beamGeo=new THREE.PlaneGeometry(1,1,1,1).translate(0,.5,0);
  this.beams=Array.from({length:24},()=>{const m=new THREE.Mesh(beamGeo,new THREE.ShaderMaterial({uniforms:{progress:{value:0},time:this.uniforms.time,fade:{value:1}},vertexShader:beamVertex,fragmentShader:beamFragment,...additive}));
   m.visible=false;m.frustumCulled=false;m.renderOrder=5;this.group.add(m);return {mesh:m,active:false};});
  const smokeGeo=new THREE.PlaneGeometry(1,1);
  this.smoke=Array.from({length:170},()=>{const m=new THREE.Mesh(smokeGeo,new THREE.ShaderMaterial({uniforms:{alpha:{value:0},seed:{value:Math.random()*9},tint:{value:new THREE.Color(.13,.1,.09)}},vertexShader:smokeVertex,fragmentShader:smokeFragment,transparent:true,depthWrite:false}));
   m.visible=false;m.frustumCulled=false;m.renderOrder=4;this.group.add(m);return {mesh:m,age:0,life:1,size:1,grow:1,vel:new THREE.Vector3(),peak:.5};});this.smokeCursor=0;
  this.debris=Array.from({length:72},()=>{const m=new THREE.Mesh(this.rockGeometry,this.molten);m.visible=false;m.castShadow=false;this.group.add(m);return {mesh:m,age:0,life:1,vel:new THREE.Vector3(),spin:new THREE.Vector3(),size:.3,ground:0};});this.debrisCursor=0;
  this.fires=Array.from({length:30},()=>{const m=flame(1,1,{speed:3.2});m.visible=false;this.group.add(m);return {mesh:m,age:0,life:1,size:1};});this.fireCursor=0;
 }
 rock(scale){const m=new THREE.Mesh(this.rockGeometry,this.molten);m.scale.setScalar(scale);m.castShadow=false;return m;}
 // ---- sky rift --------------------------------------------------------------------------------
 openRift(center,radius){this.rift.position.copy(center);this.riftState.radius=radius;this.riftState.target=1;this.rift.visible=true;}
 closeRift(){this.riftState.target=0;}
 riftPoint(spread=.55){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*this.riftState.radius*spread;return this.rift.position.clone().add(new THREE.Vector3(Math.cos(a)*r,-1,Math.sin(a)*r));}
 // ---- target beams ----------------------------------------------------------------------------
 beam(position,radius){const b=this.beams.find(b=>!b.active);if(!b)return null;b.active=true;b.mesh.visible=true;b.mesh.position.copy(position);b.mesh.scale.set(Math.max(1.2,radius*.45),Math.max(26,radius*6),1);b.mesh.material.uniforms.progress.value=0;b.mesh.material.uniforms.fade.value=1;return b;}
 setBeam(b,progress){if(b)b.mesh.material.uniforms.progress.value=progress;}
 releaseBeam(b){if(b){b.active=false;b.mesh.visible=false;}}
 // ---- smoke, debris, crater fire --------------------------------------------------------------
 puffSmoke(position,size,life,vel,{peak=.55,grow=2.2,dark=1}={}){
  const s=this.smoke[this.smokeCursor];this.smokeCursor=(this.smokeCursor+1)%this.smoke.length;
  s.mesh.visible=true;s.mesh.position.copy(position);s.age=0;s.life=life;s.size=size;s.grow=grow;s.peak=peak;s.vel.copy(vel||new THREE.Vector3(0,1.5,0));
  s.mesh.material.uniforms.tint.value.setRGB(.1*dark,.075*dark,.07*dark);
 }
 burst(point,count,speed,ground,size=.35){
  for(let i=0;i<count;i++){const d=this.debris[this.debrisCursor];this.debrisCursor=(this.debrisCursor+1)%this.debris.length;
   const a=Math.random()*Math.PI*2,up=.45+Math.random()*.8,sp=speed*(.55+Math.random()*.6);
   d.vel.set(Math.cos(a)*sp,sp*up+4,Math.sin(a)*sp);d.spin.set(Math.random()*9,Math.random()*9,Math.random()*9);
   d.mesh.visible=true;d.mesh.position.copy(point).add(new THREE.Vector3(0,.5,0));d.age=0;d.life=1.3+Math.random()*1.1;d.size=size*(.5+Math.random()*.9);d.ground=ground;}
 }
 groundFire(point,radius,count=3,life=3){
  for(let i=0;i<count;i++){const f=this.fires[this.fireCursor];this.fireCursor=(this.fireCursor+1)%this.fires.length;
   const a=Math.random()*Math.PI*2,r=Math.random()*radius*.45;f.mesh.visible=true;f.mesh.position.set(point.x+Math.cos(a)*r,point.y,point.z+Math.sin(a)*r);
   f.age=0;f.life=life*(.7+Math.random()*.5);f.size=radius*(.32+Math.random()*.3);f.mesh.material.uniforms.seed.value=Math.random()*10;}
 }
 // Full impact: debris, a ring of dust rolling outward, burning crater fires and rising smoke.
 impact(point,radius,ground){
  const p=new THREE.Vector3(point.x,ground,point.z);
  this.burst(p,radius>5?16:6,9+radius*1.6,ground,.1+radius*.022);
  const ring=radius>5?12:7;for(let i=0;i<ring;i++){const a=i/ring*Math.PI*2+Math.random()*.3;const dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
   this.puffSmoke(p.clone().addScaledVector(dir,radius*.4).setY(ground+.6),radius*.55,1.3+Math.random()*.5,dir.multiplyScalar(radius*2.2).setY(.8),{peak:.5,grow:2});}
  for(let i=0;i<(radius>5?4:2);i++)this.puffSmoke(p.clone().setY(ground+1+i*1.2),radius*.7,2.2+Math.random(),new THREE.Vector3((Math.random()-.5),3+i,(Math.random()-.5)),{peak:.55,grow:2.6,dark:.8});
  this.groundFire(p,radius,radius>5?6:2,radius>5?4.5:2.6);
 }
 clear(){this.riftState.open=this.riftState.target=0;this.rift.visible=false;for(const b of this.beams)this.releaseBeam(b);
  for(const s of this.smoke)s.mesh.visible=false;for(const d of this.debris)d.mesh.visible=false;for(const f of this.fires)f.mesh.visible=false;}
 update(dt){
  this.time+=dt;this.uniforms.time.value=this.time;
  const R=this.riftState;R.open+=(R.target-R.open)*Math.min(1,dt*(R.target>R.open?1.4:2.2));
  this.rift.material.uniforms.open.value=R.open;this.rift.scale.setScalar(R.radius*(.35+.65*R.open));this.rift.rotation.z+=dt*.35;
  if(R.open<.01&&R.target===0)this.rift.visible=false;
  for(const s of this.smoke){if(!s.mesh.visible)continue;s.age+=dt;const t=s.age/s.life;if(t>=1){s.mesh.visible=false;continue;}
   s.mesh.position.addScaledVector(s.vel,dt);s.vel.multiplyScalar(Math.max(0,1-dt*1.6));const sz=s.size*(1+s.grow*t);s.mesh.scale.set(sz,sz,1);
   s.mesh.material.uniforms.alpha.value=s.peak*Math.min(1,t*6)*(1-t)*(1-t);}
  for(const d of this.debris){if(!d.mesh.visible)continue;d.age+=dt;const t=d.age/d.life;if(t>=1){d.mesh.visible=false;continue;}
   d.vel.y-=26*dt;d.mesh.position.addScaledVector(d.vel,dt);
   if(d.mesh.position.y<d.ground+d.size*.5){d.mesh.position.y=d.ground+d.size*.5;d.vel.y=Math.abs(d.vel.y)*.32;d.vel.x*=.6;d.vel.z*=.6;}
   d.mesh.rotation.x+=d.spin.x*dt;d.mesh.rotation.y+=d.spin.y*dt;d.mesh.scale.setScalar(d.size*(t>.45?Math.max(0,1-(t-.45)/.55):1));
   if(Math.random()<.25)this.fx.kit.spark(d.mesh.position,1,.6,.5,{life:.4,size:.08,gravity:-1});}
  for(const f of this.fires){if(!f.mesh.visible)continue;f.age+=dt;const t=f.age/f.life;if(t>=1){f.mesh.visible=false;continue;}
   const s=f.size*(t<.1?t/.1:1)*(1-t*.55);f.mesh.scale.set(s,s*1.7,1);f.mesh.material.uniforms.time.value=this.time;f.mesh.material.uniforms.intensity.value=Math.min(1,(1-t)*1.6)*.85;}
 }
}
