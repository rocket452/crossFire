import * as THREE from './vendor/three.module.js';

export const CIRCUIT_BREAKER=Object.freeze({
 key:'y',cost:12,shots:3,duration:.3,range:52,damage:55,markSeconds:4,angleDegrees:90,bonusDamage:2
});
const UP=new THREE.Vector3(0,1,0);

export class CircuitBreaker {
 constructor(scene,{hit,detonate},config=CIRCUIT_BREAKER){
  Object.assign(this,{scene,hit,detonate,config});
  this.marks=new Map();
  this.ringGeometry=new THREE.RingGeometry(.91,1,64,1,0,Math.PI*2);
  this.ringGeometry.rotateX(-Math.PI/2);
  this.ringMaterial=new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
   uniforms:{threshold:{value:-Math.cos(config.angleDegrees*Math.PI/180)}},
   vertexShader:'varying vec2 radial; void main(){radial=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`varying vec2 radial; uniform float threshold; void main(){
    float valid=step(threshold,normalize(radial).x);
    float glow=mix(.23,.97,valid);
    gl_FragColor=vec4(mix(vec3(.35,.52,.65),vec3(.12,.82,1.),valid),glow);
   }`
  });
  this.boltGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(27),3));
  this.bolt=new THREE.Line(this.boltGeometry,new THREE.LineBasicMaterial({color:0x99f8ff,transparent:true,toneMapped:false}));
  this.bolt.frustumCulled=false;scene.add(this.bolt);
  this.shockwave=new THREE.Group();
  const rim=new THREE.RingGeometry(.92,1,48);
  const material=new THREE.MeshBasicMaterial({color:0x46e8ff,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:THREE.AdditiveBlending});
  for(const [x,y] of [[Math.PI/2,0],[.42,.65],[-.55,-.8]]){
   const ring=new THREE.Mesh(rim,material);
   ring.rotation.set(x,y,0);this.shockwave.add(ring);
  }
  scene.add(this.shockwave);
  this.reset();
 }
 reset(){
  for(const unit of this.marks.keys())this.remove(unit);
  this.cancel();this.shockwave.visible=false;this.shockAge=1;this.time=0;this.bursts=this.shots=this.detonations=0;
 }
 cancel(){this.burst=null;this.flash=0;this.bolt.visible=false;}
 get active(){return !!this.burst;}
 start(energy,blocked){
  if(blocked||this.active||!energy.spend(this.config.cost))return false;
  this.burst={elapsed:0,fired:0};this.bursts++;return true;
 }
 remove(unit){this.scene.remove(this.marks.get(unit).ring);this.marks.delete(unit);}
 side(unit,position){
  const side=position.clone().sub(unit.entity.root.position).setY(0);
  return side.lengthSq()>1e-8?side.normalize():null;
 }
 primed(unit,position){
  const mark=this.marks.get(unit),side=mark&&this.side(unit,position);
  return !!side&&unit.alive&&mark.until>this.time&&
   side.dot(mark.side)<=Math.cos(this.config.angleDegrees*Math.PI/180)+1e-8;
 }
 updateRing(unit,ring){
  const root=unit.entity.root.position;
  const shape=unit.shapes[0];
  ring.position.set(root.x,Math.max(root.y+.16,shape?.center.y??root.y),root.z);
  ring.scale.setScalar(Math.max(1.55,Math.min(9,Math.max(shape?.half.x??0,shape?.half.z??0)+.7)));
 }
 register(hit,position){
  if(hit?.unit?.kind!=='robot'||!hit.unit.alive)return;
  const {unit}=hit,side=this.side(unit,position),detonates=this.primed(unit,position);
  if(!this.hit(hit,this.config.damage*(detonates?1+this.config.bonusDamage:1)))return;
  if(detonates){this.consume(hit);return;}
  if(!side||!unit.alive||this.marks.has(unit))return;
  const ring=new THREE.Mesh(this.ringGeometry,this.ringMaterial);
  ring.quaternion.setFromAxisAngle(UP,Math.atan2(side.z,-side.x));
  this.scene.add(ring);this.updateRing(unit,ring);
  this.marks.set(unit,{side,ring,until:this.time+this.config.markSeconds});
 }
 consume(hit){
  if(!this.marks.has(hit.unit))return;
  this.remove(hit.unit);this.detonations++;
  this.shockwave.position.copy(hit.point);this.shockAge=0;this.updateShockwave(0);
  this.detonate(hit.point);
 }
 updateShockwave(dt){
  this.shockAge+=dt;
  const age=Math.min(1,this.shockAge/.32);
  this.shockwave.visible=age<1;
  this.shockwave.scale.setScalar(.2+5*age);
  this.shockwave.children[0].material.opacity=.95*(1-age);
 }
 step(dt,aim,position){
  this.updateShockwave(dt);
  this.time+=dt;
  for(const [unit,mark] of this.marks){
   if(!unit.alive||unit.hidden||!unit.shapes.length||mark.until<=this.time)this.remove(unit);
   else this.updateRing(unit,mark.ring);
  }
  this.flash-=dt;this.bolt.visible=this.flash>0;
  if(this.bolt.visible)this.bolt.material.opacity=Math.min(1,this.flash/.09);
  const burst=this.burst,c=this.config;
  if(!burst||!aim)return;
  if(burst.fired)burst.elapsed+=dt;
  while(burst.fired<c.shots&&burst.elapsed+1e-8>=c.duration*burst.fired/Math.max(1,c.shots-1)){
   const {from,end,hit}=aim();
   this.drawBolt(from,end);this.register(hit,position);
   burst.fired++;this.shots++;
  }
  if(burst.elapsed+1e-8>=c.duration)this.burst=null;
 }
 drawBolt(from,to){
  const points=this.boltGeometry.attributes.position,p=new THREE.Vector3();
  for(let i=0;i<points.count;i++){
   const t=i/(points.count-1),j=Math.sin(t*Math.PI)*.17;
   p.lerpVectors(from,to,t);p.x+=j*Math.sin(i*17+this.shots);p.y+=j*Math.cos(i*8+this.shots);p.z+=j*Math.cos(i*11);
   points.setXYZ(i,p.x,p.y,p.z);
  }
  points.needsUpdate=true;
  this.flash=.09;this.bolt.visible=true;this.bolt.material.opacity=1;
 }
}
