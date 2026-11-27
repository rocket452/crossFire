import * as T from './vendor/three.module.js';
import {LightningKit,glowBillboard} from './lightning-kit.js?v=451';
const GOLD=new T.Color('#ffb43a'),SUN=new T.Color('#ffd879'),HOT=new T.Color('#fff4d2');
// Sunburst decal: soft radial rays that flare out on impact.
const rayVertex=`varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const rayFragment=`varying vec2 vP;uniform float opacity;uniform float seed;void main(){float r=length(vP),a=atan(vP.y,vP.x);
 float rays=pow(max(0.,sin(a*8.+seed)),6.)*.7+pow(max(0.,sin(a*13.-seed*1.7)),10.)*.5;
 float body=smoothstep(1.,.0,r);float core=exp(-r*7.);
 vec3 c=mix(vec3(1.,.55,.12),vec3(1.,.95,.75),core+rays*.3);
 gl_FragColor=vec4(c*(rays*body*1.3+core*1.6)*opacity,1.);}`;

const spark=new T.OctahedronGeometry(1,0);
const rim=new T.TorusGeometry(1,.024,5,40);
const streak=new T.CylinderGeometry(.3,1,1,4).rotateX(Math.PI/2);
const forward=new T.Vector3(0,0,1);
const white=new T.Color(0xffe2a0),amber=new T.Color(0xff7a14);
const styles={
 lance:{radius:2.2,time:.34,sparks:16,size:.12},
 spray:{radius:.46,time:.16,sparks:4,size:.065},
 comet:{radius:2.3,time:.44,sparks:20,size:.15}
};
function light(color,opacity=1){
 return new T.MeshBasicMaterial({color,opacity,transparent:true,depthWrite:false,
  blending:T.AdditiveBlending,toneMapped:false});
}
function chargeLight(color,opacity){
 return new T.ShaderMaterial({
  uniforms:{tint:{value:new T.Color(color)},opacity:{value:opacity},aspect:{value:1}},
  transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,side:T.DoubleSide,
  vertexShader:`
   #include <common>
   #include <logdepthbuf_pars_vertex>
   varying vec4 vClip;
   void main(){
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    vClip=gl_Position;
    #include <logdepthbuf_vertex>
   }`,
  fragmentShader:`
   #include <logdepthbuf_pars_fragment>
   uniform vec3 tint;
   uniform float opacity,aspect;
   varying vec4 vClip;
   void main(){
    #include <logdepthbuf_fragment>
    vec2 screen=vClip.xy/vClip.w;
    // Feather all charge light out of a fixed circle around the reticle.
    float clearAim=smoothstep(.17,.32,length(screen*vec2(aspect,1.0)));
    gl_FragColor=vec4(tint,opacity*clearAim);
   }`
 });
}
function instances(geometry,count,scene){
 const mesh=new T.InstancedMesh(geometry,light(0xffffff),count);
 mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
 mesh.frustumCulled=false;mesh.count=0;scene.add(mesh);
 return mesh;
}
export class LuxEffects {
 constructor(scene){
  this.scene=scene;
  this.streaks=instances(streak,1200,scene);
  this.sparks=instances(spark,600,scene);
  this.bursts=[];this.freeRings=[];
  this.dummy=new T.Object3D();
  this.direction=new T.Vector3();this.tint=new T.Color();
  this.sigil=new T.Group();
  this.sigilRays=new T.Group();this.sigil.add(this.sigilRays);
  this.sigilRays.add(new T.Mesh(rim,light(0xffc65a,.55)));
  for(let i=0;i<6;i++){
   const angle=i*Math.PI/3,ray=new T.Mesh(spark,light(0xffcf73,.5));
   ray.position.set(Math.cos(angle),Math.sin(angle),0);
   ray.scale.set(.22,.055,.075);ray.rotation.z=angle;
   this.sigilRays.add(ray);
  }
  this.lanceGather=new T.Group();
  const core=chargeLight(0xffe7a0,.75),rings=chargeLight(0xff9a1a,.5),motes=chargeLight(0xffa83a,.42);
  this.chargeMaterials=[core,rings,motes];
  this.lanceCore=new T.Mesh(spark,core);
  this.lanceGather.add(this.lanceCore);
  this.lanceRings=Array.from({length:3},()=>{
   const mesh=new T.Mesh(rim,rings);this.lanceGather.add(mesh);return mesh;
  });
  this.lanceMotes=Array.from({length:18},()=>{
   const mote=new T.Mesh(spark,motes);
   this.lanceGather.add(mote);return mote;
  });
  this.lanceSeal=new T.Mesh(rim,rings);
  this.lanceSeal.rotation.x=-Math.PI/2;
  this.sigil.add(this.lanceGather);scene.add(this.sigil,this.lanceSeal);
  // Warm glow layers: shot heads, charge sun, impact sunbursts, sparks and a light.
  this.kit=new LightningKit(scene,{arcs:4,glows:40,sparks:420,sparkColor:new T.Color(1,.55,.12)});
  this.heads=Array.from({length:48},()=>{const g=glowBillboard(GOLD,8);g.visible=false;scene.add(g);return g;});
  this.chargeSun=glowBillboard(SUN,9);this.chargeSun.material.depthTest=false;this.chargeSun.visible=false;scene.add(this.chargeSun);
  this.rayGeometry=new T.CircleGeometry(1,48);this.rays=[];
  this.light=new T.PointLight('#ffb54a',0,40,2);scene.add(this.light);this.flash=0;this.flashPos=new T.Vector3();
  this.clock=0;this.reset();
 }
 reset(){
  for(const b of this.bursts)if(b.ring)this.recycleRing(b.ring);
  this.bursts.length=0;this.streaks.count=0;this.sparks.count=0;this.sigil.visible=false;this.lanceGather.visible=false;this.lanceSeal.visible=false;
  this.kit?.clear();for(const h of this.heads||[])h.visible=false;if(this.chargeSun)this.chargeSun.visible=false;for(const r of this.rays||[])r.mesh.visible=false;if(this.light)this.light.intensity=0;this.flash=0;
 }
 recycleRing(ring){ring.visible=false;this.freeRings.push(ring);}
 cast(kind,hand,direction,power,charge=0,aspect=1,feet=null){
  this.sigil.visible=!!kind;
  if(this.chargeSun)this.chargeSun.visible=kind==='lance'&&charge>0;
  this.lanceGather.visible=kind==='lance'&&charge>0;
  this.lanceSeal.visible=this.lanceGather.visible&&!!feet;
  this.sigilRays.visible=!this.lanceGather.visible;
  if(!kind)return;
  this.sigil.position.copy(hand).addScaledVector(direction,.22);
  this.sigil.quaternion.setFromUnitVectors(forward,direction);
  this.sigil.rotateZ(this.clock*(kind==='comet'?2.4:kind==='spray'?12:4));
  const base=kind==='comet'?.30:kind==='spray'?.16:.19;
  this.sigil.scale.setScalar(base*(.8+.65*power+.45*charge+.08*Math.sin(this.clock*20)));
  if(!this.lanceGather.visible)return;
  {const full=charge>=.999,beat=full?.85+.15*Math.sin(this.clock*24):1;
   this.chargeSun.position.copy(hand).addScaledVector(direction,.3);this.chargeSun.scale.setScalar((.5+1.9*charge)*beat);
   this.chargeSun.material.uniforms.opacity.value=(.35+.65*charge)*beat;
   if(Math.random()<.5+charge)this.kit.spark(this.chargeSun.position,1,1.2+charge*2,.4,{life:.3,size:.05,sizeSpread:.06,gravity:-1});}
  for(const material of this.chargeMaterials)material.uniforms.aspect.value=aspect;
  this.lanceCore.scale.setScalar(.28+.96*charge);
  this.lanceCore.rotation.set(this.clock*5,this.clock*8,0);
  for(const [i,ring] of this.lanceRings.entries()){
   ring.rotation.set(this.clock*(2+i)+i*.8,i*1.2,this.clock*3);
   ring.scale.setScalar(2.25-i*.39-charge*.54);
  }
  for(const [i,mote] of this.lanceMotes.entries()){
   const phase=(i/this.lanceMotes.length+this.clock*(1+charge))%1;
   const angle=i*2.4+this.clock*(2+charge*3)+phase*4;
   const radius=(.55+phase*3.8)*(1-.39*charge);
   mote.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,(phase-.5)*2);
   mote.rotation.z=angle;
   mote.scale.set(.29,.075,.13).multiplyScalar(Math.sin(Math.PI*phase));
  }
  if(feet){
   this.lanceSeal.position.copy(feet);this.lanceSeal.position.y+=.045;
   this.lanceSeal.scale.setScalar(.72+.85*charge);
  }

 }
 burst(kind,point,normal,impact){
  const style=styles[kind];
  this.solar(kind,point,normal,impact);
  let ring=null;
  if(kind!=='spray'){
   ring=this.freeRings.pop();
   if(!ring){ring=new T.Mesh(rim,light(0xffa640));this.scene.add(ring);}
   ring.visible=true;ring.position.copy(point);
   ring.quaternion.setFromUnitVectors(forward,normal.clone().normalize());
   ring.scale.setScalar(.12);ring.material.opacity=.95;
  }
  this.bursts.push({style,point:new T.Vector3().copy(point),ring,age:0,
   radius:style.radius*(impact?1:.51),
   rays:Array.from({length:style.sparks},()=>new T.Vector3().randomDirection())});
 }
 lockPing(center){
  const p=new T.Vector3().copy(center);
  this.kit.glow(p,{size:2.6,life:.28,grow:1.1,color:SUN,peak:.85});
  this.kit.glow(p,{size:1.1,life:.14,color:HOT});
  this.kit.spark(p,16,5,1.5,{life:.4,size:.07,sizeSpread:.08,gravity:3});
 }
 solar(kind,point,normal,impact){
  const p=new T.Vector3().copy(point),big=kind==='lance'?1:kind==='comet'?.85:.3;
  if(!impact){this.kit.glow(p,{size:.7+big*1.1,life:.12+big*.08,grow:1,color:SUN,peak:.9});if(kind!=='spray')this.kit.spark(p,6+big*10,4+big*4,.5,{life:.25,size:.06});return;}
  this.kit.glow(p,{size:1+big*2.6,life:.16+big*.12,grow:1.3,color:HOT,peak:.85});
  this.kit.glow(p,{size:1.6+big*5,life:.3+big*.3,grow:.8,color:GOLD,peak:.55});
  this.kit.spark(p,kind==='spray'?5:18+big*30,kind==='spray'?5:9+big*8,2+big*2,{life:.35+big*.25,size:.07+big*.05,sizeSpread:.1,gravity:9});
  if(kind!=='spray'){
   let r=this.rays.find(x=>!x.mesh.visible);
   if(!r){r={mesh:new T.Mesh(this.rayGeometry,new T.ShaderMaterial({uniforms:{opacity:{value:0},seed:{value:0}},vertexShader:rayVertex,fragmentShader:rayFragment,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending}))};r.mesh.renderOrder=7;this.scene.add(r.mesh);this.rays.push(r);}
   r.mesh.visible=true;r.age=0;r.life=.32+big*.12;r.size=1.2+big*3.2;r.mesh.position.copy(p);
   r.mesh.quaternion.setFromUnitVectors(forward,new T.Vector3().copy(normal).normalize().negate());r.mesh.material.uniforms.seed.value=Math.random()*6.28;
   this.flash=Math.max(this.flash,big);this.flashPos.copy(p);
  }
 }
 update(dt,shots){
  this.clock+=dt;
  this.kit.step(dt);
  for(const r of this.rays){if(!r.mesh.visible)continue;r.age+=dt;const t=r.age/r.life;if(t>=1){r.mesh.visible=false;continue;}
   r.mesh.scale.setScalar(r.size*(.35+.65*(1-(1-t)**3)));r.mesh.material.uniforms.opacity.value=(1-t)**1.5;}
  this.flash=Math.max(0,this.flash-dt*5);if(this.flash>.01){this.light.position.copy(this.flashPos);this.light.intensity=Math.max(this.light.intensity,this.flash*this.flash*420);}
  {let h=0;for(const shot of shots){if(h>=this.heads.length)break;const g=this.heads[h++],k=shot.kind;g.visible=true;g.position.copy(shot.mesh.position);
    const size=k==='lance'?1.5:k==='comet'?2.4:.5,flick=.85+.15*Math.sin(this.clock*40+h);g.scale.setScalar(size*flick);g.material.uniforms.opacity.value=k==='spray'?.7:1;
    if(k==='comet')this.kit.spark(shot.mesh.position,2,1.6,.4,{life:.55,size:.09,sizeSpread:.1,gravity:1.5});
    if(k==='lance'&&Math.random()<.8)this.kit.spark(shot.mesh.position,1,2,.3,{life:.25,size:.07,gravity:3});}
   for(;h<this.heads.length;h++)this.heads[h].visible=false;}
  const dummy=this.dummy;
  let count=0;
  for(const shot of shots){
   let head=shot.mesh.position;
   for(const [index,node] of shot.trail.entries()){
    this.direction.subVectors(head,node);
    const length=this.direction.length();
    if(length>.001&&count<this.streaks.instanceMatrix.count){
     const fade=1-index/shot.trail.length;
     const width=(shot.kind==='lance'?.18:shot.kind==='comet'?.34:.075)*fade;
     dummy.position.copy(head).lerp(node,.5);
     dummy.quaternion.setFromUnitVectors(forward,this.direction.divideScalar(length));
     dummy.scale.set(width,width,length);
     dummy.updateMatrix();this.streaks.setMatrixAt(count,dummy.matrix);
     this.streaks.setColorAt(count++,this.tint.copy(white).lerp(amber,1-fade).multiplyScalar(fade*.85));
    }
    head=node;
   }
  }
  this.streaks.count=count;this.streaks.instanceMatrix.needsUpdate=true;
  if(this.streaks.instanceColor)this.streaks.instanceColor.needsUpdate=true;
  count=0;
  for(let i=this.bursts.length-1;i>=0;i--){
   const b=this.bursts[i];b.age+=dt;
   const t=b.age/b.style.time;
   if(t>=1){
    if(b.ring)this.recycleRing(b.ring);
    this.bursts.splice(i,1);continue;
   }
   const reach=b.radius*(1-(1-t)**2);
   if(b.ring){b.ring.scale.setScalar(.12+reach);b.ring.material.opacity=.45*(1-t)*(1-t);}
   for(const ray of b.rays){
    if(count>=this.sparks.instanceMatrix.count)break;
    dummy.position.copy(b.point).addScaledVector(ray,reach*(.7+.22*ray.y));
    dummy.quaternion.setFromUnitVectors(forward,ray);
    const size=b.style.size*(1-t)*.7;
    dummy.scale.set(size,size,size*3.6);
    dummy.updateMatrix();this.sparks.setMatrixAt(count,dummy.matrix);
    this.sparks.setColorAt(count++,this.tint.copy(white).lerp(amber,.35+t*.65).multiplyScalar((1-t)*.8));
   }
  }
  this.sparks.count=count;this.sparks.instanceMatrix.needsUpdate=true;
  if(this.sparks.instanceColor)this.sparks.instanceColor.needsUpdate=true;
 }
}
