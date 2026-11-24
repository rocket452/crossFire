import * as T from './vendor/three.module.js';

export const SOLAR_CONFIG=Object.freeze({
 capacity:100,
 flightDrain:5,
 flightSpeed:31,
 climbSpeed:19,
 glideSpeed:12,
 landingSpeed:8,
 windup:.75,
 recharge:25,
 attackCosts:Object.freeze({lance:10,spray:1,comet:6})
});

const up=new T.Vector3(0,1,0);
const facet=new T.OctahedronGeometry(1);
const light=(color,opacity)=>new T.MeshBasicMaterial({
 color,opacity,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,side:T.DoubleSide
});
function circle(radius,color,opacity){
 const mesh=new T.Mesh(new T.TorusGeometry(radius,.024,6,64),light(color,opacity));
 mesh.rotation.x=-Math.PI/2;
 return mesh;
}
function sunSeal(radius){
 const seal=new T.Group(),material=light(0xffd46d,.86);
 seal.add(circle(radius,0xffd453,.93),circle(radius*.69,0xfff5c5,.8));
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6;
  const ray=new T.Mesh(facet,material);
  ray.scale.set(.19,.026,.061);
  ray.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);
  ray.rotation.y=-angle;
  seal.add(ray);
 }
 return seal;
}
function beam(radius,height,color,opacity){
 const mesh=new T.Mesh(new T.CylinderGeometry(radius*1.55,radius,height,40,1,true),
  new T.ShaderMaterial({
   uniforms:{tint:{value:new T.Color(color)},alpha:{value:opacity},clock:{value:0}},
   transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,
   vertexShader:`varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`uniform vec3 tint;uniform float alpha,clock;varying vec2 vUv;
    void main(){
     float fade=smoothstep(0.,.04,vUv.y)*(1.-smoothstep(.72,1.,vUv.y));
     float rays=pow(.5+.5*cos(vUv.x*75.398+clock*1.7),5.);
     float flow=.75+.25*sin(vUv.y*54.+clock*7.);
     gl_FragColor=vec4(tint,fade*alpha*(.38+.62*rays)*flow);
    }`
  }));
 mesh.position.y=height/2;
 return mesh;
}
export class LuxSolarEffects {
 constructor(scene){
  this.disc=new T.Group();
  this.discSeal=sunSeal(.98);
  const disk=new T.Mesh(new T.CircleGeometry(1.2,64),new T.ShaderMaterial({
   uniforms:{clock:{value:0}},
   transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,
   vertexShader:`varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`uniform float clock;varying vec2 vUv;
    void main(){
     vec2 p=vUv*2.-1.;
     float radius=length(p);
     float angle=atan(p.y,p.x+.00001);
     float scroll=.5+.5*cos(angle*12.+radius*21.-clock*4.);
     float edge=exp(-abs(radius-.82)*23.);
     float fill=(1.-smoothstep(.25,1.,radius))*(.18+.22*pow(scroll,4.));
     gl_FragColor=vec4(1.,.68+.29*edge,.20+.55*edge,fill+.47*edge);
    }`
  }));
  this.discSurface=disk;
  disk.rotation.x=-Math.PI/2;
  const underside=circle(1.10,0xff9e26,.6);underside.position.y=-.09;
  this.disc.add(disk,this.discSeal,underside);
  this.pillar=new T.Group();
  this.groundSeal=sunSeal(1.72);
  this.beams=[beam(1.45,65,0xffb429,.47),beam(.66,65,0xffeea2,.55),beam(.27,65,0xfff8dc,.74)];
  this.motes=new T.Group();
  const material=light(0xffe887,.85);
  for(let i=0;i<18;i++)this.motes.add(new T.Mesh(facet,material));
  this.pillar.add(this.groundSeal,...this.beams,this.motes);
  this.blinkAnchor=sunSeal(1.12);
  this.blinkPulses=Array.from({length:2},()=> {
   const group=new T.Group(),seal=sunSeal(1.2),shaft=beam(.63,3.7,0xffd452,.8);
   group.add(seal,shaft);return {group,seal,shaft};
  });
  scene.add(this.disc,this.pillar,this.blinkAnchor,...this.blinkPulses.map(p=>p.group));
  this.reset();
 }
 reset(){
  this.clock=0;this.disc.visible=false;this.pillar.visible=false;this.blinkAnchor.visible=false;
  for(const pulse of this.blinkPulses)pulse.group.visible=false;
 }
 blink(from,to){
  this.blinkPulses.forEach((pulse,index)=>{
   pulse.start=this.clock;
   pulse.group.position.copy(index?to:from).addScaledVector(up,.05);
   pulse.group.visible=true;
  });
 }
 updateBlink(anchor){
  this.blinkAnchor.visible=!!anchor;
  if(anchor){
   this.blinkAnchor.position.copy(anchor.feet).addScaledVector(up,.04);
   this.blinkAnchor.rotation.y=this.clock*.9;
   const scale=.84+.08*Math.sin(this.clock*6);
   this.blinkAnchor.scale.set(scale,1,scale);
  }
  for(const {group,seal,shaft,start} of this.blinkPulses){
   if(!group.visible)continue;
   const progress=(this.clock-start)/.52;
   group.visible=progress<1;
   seal.scale.setScalar(.46+progress*1.33);
   seal.rotation.y=progress*2;
   shaft.scale.setScalar(Math.max(.02,1-progress*.75));
   shaft.material.uniforms.alpha.value=.85*Math.max(0,1-progress);
   shaft.material.uniforms.clock.value=this.clock;
  }
 }
 update(dt,position,mode,windup){
  this.clock+=dt;
  this.disc.visible=mode==='flight'||mode==='landing';
  this.pillar.visible=mode==='communion';
  if(this.disc.visible){
   this.disc.position.copy(position);this.disc.position.y+=.035;
   this.discSeal.rotation.y=this.clock*2.7;
   this.discSurface.material.uniforms.clock.value=this.clock;
   const pulse=mode==='landing'?.86+.13*Math.sin(this.clock*19):1;
   this.disc.scale.set(pulse,1,pulse);
  }
  if(!this.pillar.visible)return;
  this.pillar.position.copy(position);
  this.groundSeal.rotation.y=this.clock*.8;
  const progress=1-windup/SOLAR_CONFIG.windup;
  this.groundSeal.scale.setScalar(.60+.40*progress);
  this.beams.forEach((mesh,i)=>{
   mesh.visible=progress>.12*i;
   mesh.scale.set(.23+.77*progress,1,.23+.77*progress);
   mesh.material.uniforms.alpha.value=(.19+.28*progress)*(1+i*.24);
   mesh.material.uniforms.clock.value=this.clock;
  });
  this.motes.children.forEach((mesh,i)=>{
   const phase=(this.clock*.78+i/18)%1,angle=i*2.39996+this.clock*2;
   const radius=1.65-.95*phase;
   mesh.position.set(Math.cos(angle)*radius,.14+phase*4.5,Math.sin(angle)*radius);
   mesh.quaternion.setFromAxisAngle(up,angle);
   mesh.scale.set(.06,.16,.06).multiplyScalar(progress*Math.sin(phase*Math.PI));
  });
 }
}
