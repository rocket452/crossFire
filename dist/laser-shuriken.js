import * as THREE from './vendor/three.module.js';
import {terrainHeight} from './runner-motion.js?v=424';

const RING_TUBE_RADIUS=.045;
const HAND_OFFSET=.22;
const SPAWN_HAND_OFFSET=HAND_OFFSET*1.2;

function makeStar(){
 const shape=new THREE.Shape();
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2;
  for(const [j,[x,y]] of [[.25,-.18],[1,.12],[.48,.29]].entries()){
   const px=x*Math.cos(a)-y*Math.sin(a),py=x*Math.sin(a)+y*Math.cos(a);
   if(i===0&&j===0)shape.moveTo(px,py);else shape.lineTo(px,py);
  }
 }
 shape.closePath();
 const blade=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0x8cfaff,side:THREE.DoubleSide,toneMapped:false}));
 const edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shape.getPoints()),new THREE.LineBasicMaterial({color:0xffffff,toneMapped:false}));
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,RING_TUBE_RADIUS,6,32),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));
 blade.add(edge,ring);return blade;
}

export class LaserShuriken {
 constructor(hero,config){
  this.hero=hero;this.c=config;this.mesh=makeStar();hero.scene.add(this.mesh);
  const rangeGeometry=new THREE.RingGeometry(.94,1,64).rotateX(-Math.PI/2);
  const rangeMaterial=new THREE.MeshBasicMaterial({color:0xb5a4ff,side:THREE.DoubleSide,
   transparent:true,opacity:.9,depthWrite:false,toneMapped:false});
  this.groundRange=new THREE.Mesh(rangeGeometry,rangeMaterial);hero.scene.add(this.groundRange);
  this.direction=new THREE.Vector3();this.seen=new Set();this.reset();
 }
 reset(){
  this.state='ready';this.held=false;this.charge=0;this.host=this.recent=null;
  this.groundRange.visible=false;
  this.mesh.visible=false;this.seen.clear();this.stopSound();
 }
 stopSound(){
  if(!this.voice)return;
  this.voice.stop();this.voice=null;
 }
 sound(){
  const a=this.hero.shurikenEffects.audio;
  if(!a||a.state!=='running'||!this.hero.shurikenConfig.feedback.sound)return;
  if(!this.voice){
   const osc=a.createOscillator(),gain=a.createGain();osc.type='triangle';gain.gain.value=.022;
   osc.connect(gain);gain.connect(a.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start();this.voice=osc;
  }
  const hz=this.state==='charging'?170+570*this.power:this.state==='grinding'?135:this.state==='returning'?950:425;
  this.voice.frequency.setTargetAtTime(hz,a.currentTime,.035);
 }
 get power(){return Math.min(1,this.charge/this.c.chargeSeconds);}
 get radius(){return THREE.MathUtils.lerp(this.c.minRadius,this.c.maxRadius,this.power);}
 holdPosition(offset=HAND_OFFSET){
  const position=this.hero.character.hand('R').clone();
  position.y+=offset;
  return position;
 }
 showGroundRange(center){
  const ring=this.groundRange,radius=this.radius;
  ring.position.set(center.x,0,center.z);
  ring.scale.set(radius,1,radius);
  // Sample the perimeter once on impact so the outline follows raised terrain.
  const vertices=ring.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
   const x=center.x+vertices.getX(i)*radius,z=center.z+vertices.getZ(i)*radius;
   vertices.setY(i,terrainHeight(x,z)+.055);
  }
  vertices.needsUpdate=true;
  ring.geometry.computeBoundingSphere();
  ring.visible=true;
 }
 stop(impact){
  this.state='grinding';this.age=0;this.tick=0;
  if(impact?.kind==='ground'){
   const p=this.mesh.position;
   p.y=terrainHeight(p.x,p.z)+RING_TUBE_RADIUS*this.radius+.02;
   this.showGroundRange(p);
   return;
  }
  // A slow pass across a large hull can last longer than the timing grace.
  for(const unit of this.hero.getDashEnemies()){
   if(!unit.alive||unit.hidden||unit.dashPhased)continue;
   const near=this.hero.shurikenWorld.nearest(unit,this.mesh.position);
   if(near&&near.distance<=this.radius&&!this.hero.shurikenWorld.flightSolid(this.mesh.position,near.point,0,true)){
    this.host=unit;this.local=unit.entity.root.worldToLocal(this.mesh.position.clone());return;
   }
  }
  if(this.recent?.unit.alive&&this.grace>0){
   this.host=this.recent.unit;
   this.mesh.position.copy(this.host.entity.root.localToWorld(this.local.clone()));
  }
 }
 recall(){this.state='returning';this.groundRange.visible=false;this.seen.clear();this.hero.shurikenEffects.tone(1080,true);}
 update(dt,held){
  const c=this.c,h=this.hero,p=this.mesh.position,world=h.shurikenWorld;
  const pressed=held&&!this.held,released=!held&&this.held;this.held=held;
  if(pressed){
   if(this.state==='ready'){this.state='charging';this.charge=0;this.mesh.visible=true;}
   else if(this.state==='flying')this.stop();
   else if(this.state==='grinding')this.recall();
  }
  if(this.state==='ready')return;
  if(this.state==='charging'){
   p.copy(this.holdPosition(SPAWN_HAND_OFFSET));this.charge=Math.min(c.chargeSeconds,this.charge+dt*(1+(h.liberation?.v('Overclock Chip')||0)/100));
   if(released){
    this.direction.copy(h.aim()).sub(p).normalize();this.state='flying';this.travel=0;h.liberation?.cast('laser-grind',this.c.grindDamage||65,p);
    this.grace=0;this.seen.clear();this.host=this.recent=null;h.throwPose=.18;
   }
  }
  if(this.state==='flying'||this.state==='returning'){
   const returning=this.state==='returning',hand=returning?this.holdPosition():null;
   if(returning)this.direction.copy(hand).sub(p).normalize();
   const distance=returning?Math.min(c.returnSpeed*dt,p.distanceTo(hand)):Math.min(c.speed*dt,c.range-this.travel);
   const end=p.clone().addScaledVector(this.direction,distance);
   const wall=!returning&&world.flightSolid(p,end,.1,true);
   if(wall)end.copy(wall.point);
   this.grace-=dt;
   const threat=world.traceThreat?.(p,end,this.radius);
   for(const hit of [...world.enemies(p,end,this.radius),threat].filter(Boolean)){
    const key=hit.unit||hit.missile||hit.orb;
    if(this.seen.has(key))continue;
    this.seen.add(key);h.hit(hit,returning?c.recallDamage:c.throwDamage,'laser-shuriken');
    if(!returning&&hit.unit?.alive){
     this.recent=hit;this.grace=c.stopGrace;
     this.local=hit.unit.entity.root.worldToLocal(new THREE.Vector3().copy(hit.point));
    }
   }
   this.travel+=p.distanceTo(end);p.copy(end);
   if(returning&&p.distanceToSquared(hand)<.0001){this.reset();this.held=held;return;}
   if(!returning&&(wall||this.travel>=c.range-.001))this.stop(wall);
  }
  if(this.state==='grinding'){
   if(this.host?.alive)this.host.entity.root.localToWorld(p.copy(this.local));
   this.age+=dt;this.tick-=dt;
   if(this.tick<=0&&this.age<=c.grindSeconds){
    this.tick+=c.tickSeconds;
    for(const unit of h.getDashEnemies()){
     if(!unit.alive||unit.hidden||unit.dashPhased)continue;
     const near=world.nearest(unit,p);
     if(!near||near.distance>this.radius||world.flightSolid(p,near.point,0,true))continue;
     h.hit({kind:'unit',unit,point:near.point,part:near.part},THREE.MathUtils.lerp(c.minDps,c.maxDps,this.power)*c.tickSeconds,'laser-grind');
    }
   }
   if(this.age>=c.grindSeconds)this.recall();
  }
  this.mesh.rotation.x=-.85;
  this.mesh.rotation.z+=dt*(8+this.power*28);
  this.mesh.scale.setScalar(this.radius);this.mesh.material.color.setHex(this.state==='returning'?0xffeb98:this.state==='grinding'?0xa995ff:0x8cfaff);
  this.sound();
 }
 get label(){return ({ready:'LASER STAR',charging:'RELEASE · '+Math.round(this.power*100)+'%',flying:'STOP STAR',grinding:'RECALL STAR',returning:'RETURNING'})[this.state];}
}
