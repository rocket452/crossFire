import * as THREE from './vendor/three.module.js';
import {LightningKit} from './lightning-kit.js?v=451';

// Fire visuals for Pyroclast: procedural flame billboards, tornado funnels, ground decals,
// explosions and a shared glow/spark pool. Gameplay lives in pyroclast.js.

const NOISE=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
vec3 firePalette(float t){t=clamp(t,0.,1.);
 vec3 c=mix(vec3(.5,.02,.02),vec3(1.,.22,.02),smoothstep(0.,.35,t));
 c=mix(c,vec3(1.,.62,.08),smoothstep(.3,.65,t));
 return mix(c,vec3(1.,.97,.8),smoothstep(.7,1.,t));}
`;

// Upright (cylindrical) billboard flame. Geometry spans x -0.5..0.5, y 0..1; scale.y<0 points it down.
const flameVertex=`varying vec2 vUv;varying float vNear;
void main(){vUv=vec2(position.x+.5,position.y);
 vec3 center=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;
 vec3 sx=vec3(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)*sign(modelMatrix[1].y+1e-6),0.);
 vec3 view=normalize(cameraPosition-center);vec3 up=vec3(0.,1.,0.);
 vec3 right=normalize(cross(up,view)+vec3(1e-5,0.,0.));
vec3 world=center+right*position.x*sx.x+up*position.y*sx.y;vNear=smoothstep(1.5,5.,distance(cameraPosition,world));
 gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`;
const flameFragment=NOISE+`uniform float time;uniform float seed;uniform float intensity;uniform float speed;varying vec2 vUv;varying float vNear;
void main(){
 vec2 p=vUv;float x=(p.x-.5)*2.;
 float n=fbm(vec2(x*1.6+seed,p.y*2.6-time*speed+seed*3.1));
 float n2=fbm(vec2(x*3.5-seed,p.y*5.-time*speed*1.7));
 x+=(n2-.5)*.5*p.y+(n-.5)*.25*p.y;
 float width=pow(1.-p.y,.9)*(.35+.75*n)+.03;
 // Tongues: split the upper flame into licks.
 float licks=.55+.45*sin(x*9.+n2*6.+time*speed*1.3);
 width*=mix(1.,licks,smoothstep(.25,.8,p.y));
 float body=smoothstep(width,width*.2,abs(x));
 body*=smoothstep(0.,.07,p.y)*smoothstep(1.,.35+.45*n,p.y);
 float heat=body*(1.-p.y*.85)*(.65+.55*n2);
 vec3 c=firePalette(heat*.95);
 float a=clamp(body*1.25,0.,1.)*intensity*vNear;
 gl_FragColor=vec4(c*a,a);}`;

export function flameMaterial({seed=Math.random()*10,speed=2.6,intensity=1}={}){
 return new THREE.ShaderMaterial({uniforms:{time:{value:0},seed:{value:seed},intensity:{value:intensity},speed:{value:speed}},
  vertexShader:flameVertex,fragmentShader:flameFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide});
}
const flameGeometry=new THREE.PlaneGeometry(1,1,1,1).translate(0,.5,0);
export function flame(width,height,options){const m=new THREE.Mesh(flameGeometry,flameMaterial(options));m.scale.set(width,height,1);m.frustumCulled=false;m.renderOrder=7;return m;}

// Twisting tornado funnel: open cone, scrolling noise along a spiral.
const tornadoVertex=`varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying float vNear;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);vNear=smoothstep(2.,7.,distance(cameraPosition,w.xyz));gl_Position=projectionMatrix*viewMatrix*w;}`;
const tornadoFragment=NOISE+`uniform float time;uniform float seed;uniform float intensity;varying vec2 vUv;varying vec3 vN;varying vec3 vV;varying float vNear;
void main(){
 float a=vUv.x*6.2832,h=vUv.y;
 float swirl=fbm(vec2(vUv.x*5.+h*2.4-time*1.4+seed,h*3.-time*2.6));
 float streak=fbm(vec2(vUv.x*12.+h*5.-time*2.2,h*1.5-time*.8+seed));
 float band=smoothstep(.35,.75,swirl+streak*.4);
 float rim=1.-abs(dot(normalize(vN),normalize(vV)));
 float fade=smoothstep(0.,.08,h)*smoothstep(1.,.62,h);
 float heat=band*(1.0-h*.6);
 vec3 smoke=mix(vec3(.08,.03,.03),vec3(.22,.07,.03),swirl);
 vec3 c=mix(smoke,firePalette(heat*.85+.05)*1.05,band);
 float al=clamp((.32+.6*band+rim*.25)*fade*intensity,0.,1.)*vNear;
 gl_FragColor=vec4(c,al);}`;

const flatVertex=`varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
// Meteor warning decal: pulsing outer ring, inner disc that fills as impact approaches.
const warnFragment=`varying vec2 vP;uniform float progress;uniform float time;uniform float fade;void main(){
 float r=length(vP)*1.5;if(r>1.5)discard;float a=atan(vP.y,vP.x);
 float ring=smoothstep(.86,.93,r)*smoothstep(1.,.97,r);
 float fill=step(r,progress)*(.18+.25*smoothstep(progress-.08,progress,r));
 float ticks=step(.5,fract(a*12./6.2832-time*.6))*smoothstep(.76,.8,r)*smoothstep(.86,.82,r);
 float pulse=.6+.4*sin(time*(7.+18.*progress));
 float cross=(smoothstep(.04,0.,abs(vP.x*1.5))+smoothstep(.04,0.,abs(vP.y*1.5)))*smoothstep(.3,.0,r)*.8;
 float lockR=1.5-.5*progress;float lock=smoothstep(.035,0.,abs(r-lockR))*(.35+.65*progress)*step(.5,fract(a*4./6.2832+time*.35+.25));
 vec3 c=mix(vec3(1.,.25,.05),vec3(1.,.8,.3),progress);
 float v=(ring*(.7+.3*pulse)+fill*pulse+ticks*.45+cross*pulse+lock*1.2)*fade;
 gl_FragColor=vec4(c*v,1.);}`;
const scorchFragment=NOISE+`varying vec2 vP;uniform float fade;uniform float seed;uniform float time;void main(){
 float r=length(vP);if(r>1.)discard;float a=atan(vP.y,vP.x);
 float cracks=pow(max(0.,sin(a*7.+seed+fbm(vP*3.+seed)*3.)),24.)*smoothstep(1.,.2,r);
 float pool=smoothstep(.75,0.,r)*(.5+.5*fbm(vP*4.+seed-time*.3));
 vec3 c=firePalette(.35+pool*.6);
 float v=(cracks*1.2+pool*.9)*fade*fade;
 gl_FragColor=vec4(c*v,1.);}`;
const shockFragment=`varying vec2 vP;uniform float opacity;void main(){float r=length(vP);float band=smoothstep(.72,.9,r)*smoothstep(1.,.93,r);
 gl_FragColor=vec4(mix(vec3(1.,.4,.08),vec3(1.,.9,.6),band)*band*opacity*1.5,1.);}`;
const additive={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide};
const disc=new THREE.CircleGeometry(1,48).rotateX(-Math.PI/2);
// Decals use world XZ via a rotated circle; the shaders read the pre-rotation XY.

// Meteor tail: a cone stretched behind the rock, hot at the head and fading to red smoke.
const tailFragment=NOISE+`uniform float time;uniform float seed;varying vec2 vUv;varying float vNear;void main(){
 float h=vUv.y;float n=fbm(vec2(vUv.x*6.+seed,h*4.+time*6.));
 float heat=(1.-h)*(.6+.5*n);float a=clamp((1.-h)*(.5+.6*n),0.,1.)*smoothstep(0.,.05,1.-h);
 a*=vNear;gl_FragColor=vec4(firePalette(heat)*a*1.1,a);}`;
export function meteorTail(length,radius){
 const g=new THREE.ConeGeometry(radius,length,14,4,true).translate(0,length/2,0);
 const m=new THREE.Mesh(g,new THREE.ShaderMaterial({uniforms:{time:{value:0},seed:{value:Math.random()*9}},vertexShader:`varying vec2 vUv;varying float vNear;void main(){vUv=vec2(uv.x,1.-uv.y);vec4 w=modelMatrix*vec4(position,1.);vNear=smoothstep(2.,8.,distance(cameraPosition,w.xyz));gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:tailFragment,...additive}));
 m.frustumCulled=false;m.renderOrder=6;return m;
}
export const FIRE=Object.freeze({hot:new THREE.Color('#fff1c4'),yellow:new THREE.Color('#ffc43a'),orange:new THREE.Color('#ff6a18'),red:new THREE.Color('#c81a0c')});

export class PyroclastFX {
 constructor(scene){
  this.scene=scene;this.group=new THREE.Group();this.group.name='Pyroclast fire effects';scene.add(this.group);
  this.time=0;
  this.kit=new LightningKit(this.group,{arcs:2,glows:48,sparks:900,sparkColor:new THREE.Color(1,.42,.08)});
  this.puffs=Array.from({length:40},()=>{const m=flame(1,1,{speed:4});m.visible=false;this.group.add(m);return {mesh:m,age:0,life:1};});this.puffCursor=0;
  this.decals=[];
  this.light=new THREE.PointLight('#ff7a2a',0,60,2);this.flashLevel=0;this.flashPos=new THREE.Vector3();
 }
 setEnabled(on){if(on&&!this.light.parent)this.scene.add(this.light);if(!on&&this.light.parent)this.scene.remove(this.light);this.group.visible=on;}
 decal(kind,position,radius,life,uniforms={}){
  const fragment=kind==='warn'?warnFragment:kind==='scorch'?scorchFragment:shockFragment;
  const material=new THREE.ShaderMaterial({uniforms:{progress:{value:0},time:{value:0},fade:{value:1},seed:{value:Math.random()*6},opacity:{value:1},...uniforms},vertexShader:flatVertex,fragmentShader:fragment,...additive});
  const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,48),material);mesh.rotation.x=-Math.PI/2;mesh.position.copy(position);mesh.position.y+=kind==='warn'?.09:.06;mesh.scale.setScalar(kind==='warn'?radius*1.5:radius);mesh.renderOrder=kind==='warn'?5:4;mesh.frustumCulled=false;
  this.group.add(mesh);const d={kind,mesh,age:0,life,radius};this.decals.push(d);return d;
 }
 removeDecal(d){this.group.remove(d.mesh);d.mesh.material.dispose();d.mesh.geometry.dispose();this.decals.splice(this.decals.indexOf(d),1);}
 puff(position,size,life,rise=4){
  const p=this.puffs[this.puffCursor];this.puffCursor=(this.puffCursor+1)%this.puffs.length;
  p.mesh.visible=true;p.mesh.position.copy(position);p.age=0;p.life=life;p.size=size;p.rise=rise;p.mesh.material.uniforms.seed.value=Math.random()*10;
 }
 flash(position,level){if(level>=this.flashLevel*.6){this.flashLevel=Math.max(this.flashLevel,level);this.flashPos.copy(position);}}
 explosion(point,radius,{ground=true,scorch=true,groundY=null}={}){
  const p=new THREE.Vector3().copy(point);
  this.kit.glow(p,{size:radius*1.1,life:.22,grow:1.2,color:FIRE.hot,peak:.85});
  this.kit.glow(p,{size:radius*2.4,life:.55,grow:.6,color:FIRE.orange,peak:.6});
  this.kit.glow(p.clone().add(new THREE.Vector3(0,radius*.4,0)),{size:radius*3.2,life:.9,grow:.3,color:FIRE.red,peak:.45});
  for(let i=0;i<6;i++){const o=new THREE.Vector3((Math.random()-.5)*radius*.9,Math.random()*radius*.3,(Math.random()-.5)*radius*.9);this.puff(p.clone().add(o),radius*(.55+Math.random()*.45),.55+Math.random()*.35,radius*1.4);}
  this.kit.spark(p,Math.round(50+radius*12),radius*3.4,radius*1.6,{life:.7,lifeSpread:.5,size:.12,sizeSpread:.18,gravity:14});
  if(ground){const g=p.clone();if(groundY!==null)g.y=groundY;const near=p.y-g.y<radius*.8;this.decal('shock',g,radius*.4*(near?1:.6),.45);if(scorch&&near)this.decal('scorch',g,radius*.95,4);}
  this.flash(p,1);
 }
 update(dt){
  this.time+=dt;this.kit.step(dt);
  for(const p of this.puffs){if(!p.mesh.visible)continue;p.age+=dt;const t=p.age/p.life;if(t>=1){p.mesh.visible=false;continue;}
   const s=p.size*(.6+.9*t);p.mesh.scale.set(s,s*1.5,1);p.mesh.position.y+=p.rise*dt*(1-t);
   p.mesh.material.uniforms.time.value=this.time;p.mesh.material.uniforms.intensity.value=(1-t)*(1-t)*.75;}
  for(const d of [...this.decals]){d.age+=dt;const u=d.mesh.material.uniforms;u.time.value=this.time;
   if(d.kind==='shock'){const t=d.age/d.life;d.mesh.scale.setScalar(d.radius*(1+7*(1-Math.pow(1-t,3))));u.opacity.value=(1-t)*.55;}
   else if(d.kind==='scorch')u.fade.value=Math.max(0,1-d.age/d.life);
   if(d.kind!=='warn'&&d.age>=d.life)this.removeDecal(d);}
  this.flashLevel=Math.max(0,this.flashLevel-dt*3.2);
  if(this.light.parent){this.light.position.copy(this.flashPos);this.light.position.y+=2;this.light.intensity=this.baseLight+this.flashLevel*this.flashLevel*650;}
 }
 clear(){this.kit.clear();for(const p of this.puffs)p.mesh.visible=false;for(const d of [...this.decals])this.removeDecal(d);this.flashLevel=0;this.light.intensity=0;}
}
PyroclastFX.prototype.baseLight=0;

// Moving flame tornado hazard visual.
export class FlameTornado {
 constructor(parent,config){
  this.config=config;this.root=new THREE.Group();parent.add(this.root);
  const funnel=new THREE.CylinderGeometry(config.radius*1.7,config.radius*.5,config.height,28,6,true).translate(0,config.height/2,0);
  const core=new THREE.CylinderGeometry(config.radius*.9,config.radius*.25,config.height*.9,20,4,true).translate(0,config.height*.45,0);
  const material=(seed,blend)=>new THREE.ShaderMaterial({uniforms:{time:{value:0},seed:{value:seed},intensity:{value:1}},vertexShader:tornadoVertex,fragmentShader:tornadoFragment,...additive,blending:blend});
  this.outer=new THREE.Mesh(funnel,material(Math.random()*10,THREE.NormalBlending));this.inner=new THREE.Mesh(core,material(Math.random()*10,THREE.AdditiveBlending));this.inner.material.uniforms.intensity.value=.6;
  this.base=new THREE.Mesh(disc,new THREE.ShaderMaterial({uniforms:{fade:{value:1},seed:{value:Math.random()*6},time:{value:0}},vertexShader:`varying vec2 vP;void main(){vP=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:scorchFragment,...additive}));
  this.base.scale.setScalar(config.radius*1.9);this.base.position.y=.07;
  for(const m of [this.outer,this.inner,this.base]){m.frustumCulled=false;m.renderOrder=6;this.root.add(m);}
  this.flames=[0,1,2].map(i=>{const f=flame(config.radius*.9,config.radius*1.3,{speed:4.5,intensity:.7});this.root.add(f);return f;});
  this.root.visible=false;
 }
 update(dt,time,intensity){
  this.outer.rotation.y-=dt*4.2;this.inner.rotation.y+=dt*6.5;
  this.outer.material.uniforms.time.value=time;this.outer.material.uniforms.intensity.value=intensity;this.inner.material.uniforms.time.value=time;this.inner.material.uniforms.intensity.value=intensity*.55;
  this.base.material.uniforms.time.value=time;this.base.material.uniforms.fade.value=intensity;
  this.flames.forEach((f,i)=>{const a=time*3+i*2.1;f.position.set(Math.cos(a)*this.config.radius*.6,0,Math.sin(a)*this.config.radius*.6);f.material.uniforms.time.value=time;f.material.uniforms.intensity.value=intensity*.7;});
 }
 dispose(){this.root.removeFromParent();}
}
