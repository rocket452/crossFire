import * as THREE from './vendor/three.module.js';
import {LightningKit,CYAN,WHITE,BLUE} from './lightning-kit.js?v=451';

// Thunder Punch spectacle: lightning gathers into Volt's fist, then the hit detonates in a white-hot
// flash with a fresnel shock dome, punch-facing shock rings, a cone of lightning spears driven through
// the target, branching radial arcs, arcs crawling over the enemy, a directional spark cone and an
// electric scorch on nearby ground. Pure visuals; damage and hit-stop live in speedster/battle.
const additive={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide};
const domeFragment=`uniform float opacity;uniform vec3 color;varying vec3 vN;varying vec3 vV;void main(){
 float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);gl_FragColor=vec4(mix(color,vec3(1.),f*.6)*f*opacity*1.6,1.);}`;
const domeVertex=`varying vec3 vN;varying vec3 vV;void main(){vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=cameraPosition-w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const ringFragment=`uniform float opacity;uniform vec3 color;uniform float soft;varying vec2 vUv;void main(){
 float r=length(vUv-.5)*2.;float band=smoothstep(1.-soft,1.-soft*.35,r)*smoothstep(1.,.96,r);
 if(band<.003)discard;gl_FragColor=vec4(mix(color,vec3(1.),band*band*.7)*band*opacity*1.5,1.);}`;
const scorchFragment=`uniform float fade;uniform float seed;varying vec2 vUv;
float h(float n){return fract(sin(n*91.7+seed)*43758.5);}
void main(){vec2 p=vUv-.5;float r=length(p)*2.;if(r>1.)discard;float a=atan(p.y,p.x);
 float cracks=0.;for(int i=0;i<7;i++){float ang=h(float(i))*6.2832;float d=r*abs(sin(a-ang));cracks=max(cracks,smoothstep(.035,0.,d)*step(0.,cos(a-ang))*smoothstep(1.,.15,r)*(.6+.4*h(float(i)+3.)));}
 float core=smoothstep(.45,0.,r);
 vec3 c=mix(vec3(.15,.55,1.),vec3(.85,1.,1.),core);
 gl_FragColor=vec4(c*(cracks*1.3+core*.8)*fade,1.);}`;

export class ThunderPunchFX {
 constructor(scene){
  this.group=new THREE.Group();this.group.name='Thunder Punch FX';scene.add(this.group);
  this.kit=new LightningKit(this.group,{arcs:34,glows:18,sparks:520,bigArcs:8,sparkColor:new THREE.Color(.35,.85,1)});
  this.dome=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),new THREE.ShaderMaterial({uniforms:{opacity:{value:0},color:{value:CYAN.clone()}},vertexShader:domeVertex,fragmentShader:domeFragment,...additive}));
  this.dome.visible=false;this.dome.frustumCulled=false;this.dome.renderOrder=6;this.group.add(this.dome);
  const ringGeo=new THREE.PlaneGeometry(2,2);
  this.rings=[[.16,6,.32,.18],[.25,4,.42,.3],[.42,7.5,.6,.12]].map(([life,radius,soft,delay])=>{
   const m=new THREE.Mesh(ringGeo,new THREE.ShaderMaterial({uniforms:{opacity:{value:0},color:{value:CYAN.clone()},soft:{value:soft}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:ringFragment,...additive}));
   m.visible=false;m.frustumCulled=false;m.renderOrder=6;this.group.add(m);return {mesh:m,life,radius,delay,age:Infinity};
  });
  this.scorch=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.ShaderMaterial({uniforms:{fade:{value:0},seed:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:scorchFragment,...additive}));
  this.scorch.visible=false;this.scorch.frustumCulled=false;this.scorch.renderOrder=4;this.group.add(this.scorch);
  this.reset();
 }
 reset(){this.kit.clear();this.age=Infinity;this.chargeAge=Infinity;this.crawl=null;this.dome.visible=false;this.scorch.visible=false;this.scorchAge=Infinity;for(const r of this.rings){r.age=Infinity;r.mesh.visible=false;}this.impacts=0;}
 // Lightning converges into the fist during the wind-up.
 charge(fist){
  fist=new THREE.Vector3().copy(fist);this.chargeAge=0;this.fist=fist;
  this.kit.glow(fist,{size:1.4,life:.16,grow:-.4,color:WHITE,peak:.9});
  for(let i=0;i<5;i++){const from=fist.clone().add(new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(1.4+Math.random()*.8));
   this.kit.arc(from,fist,{life:.12,jag:.2,width:.6,color:CYAN});}
 }
 impact(point,direction,{connected=true,detonated=false,unit=null,groundY=null}={}){
  const p=new THREE.Vector3().copy(point),d=new THREE.Vector3().copy(direction).normalize(),k=detonated?1.45:connected?1:.55;this.impacts++;
  this.age=0;this.point=p;this.direction=d;this.power=k;
  const up=Math.abs(d.y)>.95?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),side=new THREE.Vector3().crossVectors(d,up).normalize(),lift=new THREE.Vector3().crossVectors(side,d).normalize();
  // Flash stack: white-hot core, cyan bloom and a lingering blue halo.
  this.kit.glow(p,{size:1.5*k,life:.1,grow:1.3,color:WHITE,peak:1});
  this.kit.glow(p,{size:3.6*k,life:.26,grow:.8,color:CYAN,peak:.75});
  this.kit.glow(p.clone().addScaledVector(d,1.2*k),{size:6*k,life:.45,grow:.4,color:BLUE,peak:.35});
  // Shock dome and punch-facing rings.
  this.dome.visible=true;this.dome.position.copy(p);this.dome.material.uniforms.color.value.copy(detonated?WHITE:CYAN);
  for(const r of this.rings){r.age=-r.delay*.3;r.mesh.position.copy(p);r.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),d);r.k=k;}
  // Lightning spears driven through the target, fanning in a cone.
  const spears=connected?7:4,flat=new THREE.Vector3(d.x,d.y*.3,d.z).normalize();
  for(let i=0;i<spears;i++){
   const a=Math.random()*Math.PI*2,spread=.1+Math.random()*.2,len=(5+Math.random()*5)*k;
   const dir=flat.clone().addScaledVector(side,Math.cos(a)*spread*1.4).addScaledVector(lift,Math.sin(a)*spread*.7).normalize();
   this.kit.bigArc(p,p.clone().addScaledVector(dir,len),{life:.2+Math.random()*.12,jag:.35,width:i<2?1.6:1.05,color:i<2?WHITE:CYAN,maxJag:5});
  }
  // Branching radial arcs.
  for(let i=0;i<(connected?8:4);i++){
   const dir=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().addScaledVector(d,-.35).normalize();
   const mid=p.clone().addScaledVector(dir,(1.4+Math.random()*1.6)*k),end=mid.clone().add(new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(2.2*k));
   this.kit.arc(p,mid,{life:.16+Math.random()*.1,jag:.3,width:.9,color:CYAN});
   if(Math.random()<.7)this.kit.arc(mid,end,{life:.12+Math.random()*.08,jag:.3,width:.6,color:BLUE});
  }
  // Directional spark cone plus a ring of slower embers.
  this.coneSparks(p,d,side,lift,connected?110:45,24*k);
  this.kit.spark(p,connected?60:20,7*k,2,{life:.45,lifeSpread:.5,size:.12,sizeSpread:.14,gravity:9});
  // Arcs keep crawling over the struck enemy for a moment.
  this.crawl=connected&&unit?.shapes?.length?{unit,clock:0,until:.45*k}:null;
  // Electric scorch on nearby ground.
  if(groundY!==null&&p.y-groundY<3.2){this.scorch.visible=true;this.scorch.position.set(p.x,groundY+.07,p.z);this.scorch.scale.setScalar(6.5*k);this.scorch.material.uniforms.seed.value=Math.random()*10;this.scorchAge=0;}
 }
 coneSparks(p,d,side,lift,count,speed){
  const kit=this.kit;
  for(let n=0;n<count;n++){
   const i=kit.sparkCursor;kit.sparkCursor=(kit.sparkCursor+1)%kit.sparkCount;
   const a=Math.random()*Math.PI*2,spread=Math.random()*.55;
   const v=d.clone().addScaledVector(side,Math.cos(a)*spread).addScaledVector(lift,Math.sin(a)*spread).normalize().multiplyScalar(speed*(.35+Math.random()*.75));
   kit.sparkPos.setXYZ(i,p.x,p.y,p.z);kit.sparkVel.set([v.x,v.y,v.z],i*3);kit.sparkGravity[i]=12;
   kit.sparkAge[i]=0;kit.sparkMax[i]=.25+Math.random()*.35;kit.sparkSize.setX(i,.1+Math.random()*.16);kit.sparkLife.setX(i,1);
  }
  kit.sparkSize.needsUpdate=true;
 }
 update(dt,{fist=null,recovering=false}={}){
  this.kit.step(dt);
  if(fist&&this.chargeAge<.12){this.chargeAge+=dt;if(Math.random()<.6)this.kit.arc(fist.clone().add(new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(1.6)),fist,{life:.06,jag:.25,width:.5});}
  // Recovery: the fist keeps crackling with short arcs and sparks.
  if(fist&&recovering&&this.age<.42&&Math.random()<.55){const o=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(.7);
   this.kit.arc(fist,fist.clone().add(o),{life:.07,jag:.35,width:.45});if(Math.random()<.4)this.kit.spark(fist,3,2.5,.8,{life:.25,size:.06});}
  if(this.age===Infinity)return;
  this.age+=dt;const k=this.power;
  const td=this.age/.22;this.dome.visible=td<1;
  if(this.dome.visible){const e=1-Math.pow(1-td,3);this.dome.scale.setScalar((.3+2.2*e)*k);this.dome.material.uniforms.opacity.value=(1-td)*(1-td)*.7;}
  for(const r of this.rings){r.age+=dt;const t=r.age/r.life;r.mesh.visible=t>=0&&t<1;if(!r.mesh.visible)continue;
   const e=1-Math.pow(1-t,2.4);r.mesh.scale.setScalar(Math.max(.05,e*r.radius*r.k));r.mesh.material.uniforms.opacity.value=(1-t)*.95;}
  if(this.crawl){const c=this.crawl;c.clock+=dt;
   if(c.clock<c.until&&c.unit.shapes?.length&&Math.random()<.65){const s=c.unit.shapes[Math.floor(Math.random()*c.unit.shapes.length)],h=s.half||{x:1,y:1,z:1};
    const rnd=()=>new THREE.Vector3((Math.random()-.5)*2*(h.x||1),(Math.random()-.5)*2*(h.y||1),(Math.random()-.5)*2*(h.z||1));
    const a=new THREE.Vector3().copy(s.center).add(rnd()),b=new THREE.Vector3().copy(s.center).add(rnd());this.kit.arc(a,b,{life:.08,jag:.3,width:.7,color:Math.random()<.3?WHITE:CYAN});}
   if(c.clock>=c.until)this.crawl=null;}
  if(this.scorchAge!==Infinity){this.scorchAge+=dt;const t=this.scorchAge/1.6;this.scorch.material.uniforms.fade.value=t<.05?t/.05:Math.max(0,1-t)*(1-t);if(t>=1){this.scorch.visible=false;this.scorchAge=Infinity;}}
  if(this.age>1.6&&!this.crawl&&this.scorchAge===Infinity)this.age=Infinity;
 }
}
