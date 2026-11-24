import * as T from './vendor/three.module.js';
import {HumanoidCharacter} from './humanoid-character.js?v=overall-performance-238';
import {RiftPlayer} from './rift-player.js?v=404';

const spells={
 lance:{speed:205,life:1.8,damage:190,gap:.85,length:3,width:.12,color:0xffdc53},
 spray:{speed:115,life:.85,damage:19,gap:.085,length:.95,width:.09,color:0xffae31},
 comet:{speed:66,life:3,damage:115,length:1.65,width:.24,color:0xffef90}
};
const lockTime=.35;
const maxLocks=4;
const targetable=unit=>unit.alive&&unit.shapes.length>0;
const up=new T.Vector3(0,1,0),forward=new T.Vector3(0,0,1);
const gem=new T.OctahedronGeometry(1),ring=new T.TorusGeometry(1,.075,5,32);
const glow=color=>new T.MeshBasicMaterial({color,toneMapped:false,blending:T.AdditiveBlending,transparent:true,depthWrite:false});
const white=glow(0xfff8cf),gold=glow(0xffc145);
function halo(){
 const mark=new T.Mesh(ring,gold);
 const star=new T.Mesh(gem,white);
 star.scale.set(.12,.26,.08);star.position.y=1;
 mark.add(star);
 return mark;
}
export class Luxmancer {
 constructor(scene,model,options){
  Object.assign(this,options);
  this.scene=scene;this.root=new T.Group();this.root.name='Luxmancer';
  this.character=new HumanoidCharacter(model,{height:2.5});
  this.root.add(this.character.root);scene.add(this.root);
  this.shots=[];this.free={};this.flashes=[];
  for(const [kind,s] of Object.entries(spells)){
   this.free[kind]=[];s.material??=glow(s.color);
  }
  this.marks=Array.from({length:maxLocks},()=>{const m=halo();scene.add(m);m.visible=false;return m;});
  this.pendingMark=new T.Mesh(ring,glow(0xfff1af));
  scene.add(this.pendingMark);
  this.reset();this.setEnabled(false);
 }
 reset(){
  for(const shot of this.shots)this.recycle(shot);
  this.shots.length=0;
  for(const f of this.flashes)this.scene.remove(f.mesh);
  this.flashes.length=0;this.clearLocks();
  this.cool={lance:0,spray:0,comet:0};this.castRemaining=0;this.character.reset();
 }
 setEnabled(value){this.enabled=value;this.root.visible=value;if(!value){this.player?.exit();this.reset();}}
 receiveEyeHit(){if(this.active)this.player.hurt.hit();}
 recycle(shot){shot.mesh.visible=false;this.free[shot.kind].push(shot.mesh);}
 flash(point,size){
  const mesh=halo();mesh.position.copy(point);mesh.quaternion.copy(this.player.camera.quaternion);
  mesh.scale.setScalar(.1);this.scene.add(mesh);this.flashes.push({mesh,size,time:0});
 }
 shoot(kind,origin,direction,target=null){
  const s=spells[kind];let mesh=this.free[kind].pop();
  if(!mesh){
   mesh=new T.Mesh(gem,s.material);
   const core=new T.Mesh(gem,white);core.scale.set(.52,.52,1.15);mesh.add(core);
   if(kind==='comet'){
    for(let i=0;i<2;i++){
     const orbit=new T.Mesh(ring,s.material);
     orbit.rotation.x=i?.72:-.72;orbit.scale.set(2.1,2.1,.3);mesh.add(orbit);
    }
   }
   this.scene.add(mesh);
  }
  mesh.visible=true;mesh.scale.set(s.width,s.width,s.length);
  mesh.position.copy(origin);mesh.quaternion.setFromUnitVectors(forward,direction);
  const velocity=direction.clone().multiplyScalar(s.speed);
  if(kind==='lance')velocity.y+=4;
  this.shots.push({mesh,kind,target,v:velocity,life:s.life});
  this.castRemaining=.22;
 }
 clearLocks(){
  this.locks=[];this.charging=false;
  this.pendingTarget=null;this.pendingTime=0;
  this.pendingMark.visible=false;
  this.marks.forEach(mark=>mark.visible=false);
 }
 lock(origin,aim,dt){
  this.locks=this.locks.filter(targetable);
  if(this.locks.length>=maxLocks)return;
  let best=null,bestAlignment=.90;
  const delta=new T.Vector3();
  for(const unit of this.getUnits()){
   if(unit.kind!=='robot'||!targetable(unit)||this.locks.includes(unit))continue;
   const center=unit.shapes[0].center;
   const distance=delta.copy(center).sub(origin).length();
   if(distance>140||distance<.1)continue;
   const alignment=delta.dot(aim)/distance;
   if(alignment<.90||(unit!==this.pendingTarget&&alignment<bestAlignment)||!this.visible(origin,center))continue;
   best=unit;bestAlignment=alignment;
   if(unit===this.pendingTarget)break;
  }
  if(best!==this.pendingTarget){this.pendingTarget=best;this.pendingTime=0;}
  if(!best)return;
  this.pendingTime+=dt;
  if(this.pendingTime>=lockTime-1e-8){
   this.locks.push(best);this.pendingTarget=null;this.pendingTime=0;
  }
 }
 drawLocks(camera){
  for(const [i,mark] of this.marks.entries()){
   const unit=this.locks[i];
   mark.visible=!!unit;
   if(!unit)continue;
   mark.position.copy(unit.shapes[0].center);mark.scale.setScalar(1.5);
   mark.quaternion.copy(camera.quaternion);
  }
  const pending=this.pendingTarget;
  this.pendingMark.visible=!!pending;
  if(pending){
   this.pendingMark.position.copy(pending.shapes[0].center);
   this.pendingMark.quaternion.copy(camera.quaternion);
   this.pendingMark.scale.setScalar(2.8-1.3*this.pendingTime/lockTime);
  }
 }
 stepShots(dt){
  for(let i=this.shots.length-1;i>=0;i--){
   const shot=this.shots[i],s=spells[shot.kind],p=shot.mesh.position;
   const step=Math.min(dt,shot.life);
   if(shot.kind==='lance')shot.v.y-=9*step;
   if(shot.target?.alive&&shot.target.shapes.length){
    const toward=new T.Vector3().copy(shot.target.shapes[0].center).sub(p).normalize();
    shot.v.lerp(toward.multiplyScalar(s.speed),1-Math.exp(-8*step)).normalize().multiplyScalar(s.speed);
   }
   const end=p.clone().addScaledVector(shot.v,step),hit=this.traceBolt(p,end);
   shot.life-=step;
   if(hit){this.onHit(hit,new T.Vector3().copy(hit.point),s.damage);this.flash(hit.point,shot.kind==='spray'?.55:2);}
   if(hit||shot.life<=0){this.recycle(shot);this.shots.splice(i,1);continue;}
   p.copy(end);shot.mesh.quaternion.setFromUnitVectors(forward,shot.v.clone().normalize());
   if(shot.kind==='comet')shot.mesh.rotateZ(shot.life*10);
  }
  for(let i=this.flashes.length-1;i>=0;i--){
   const f=this.flashes[i];f.time+=dt;f.mesh.scale.setScalar(f.size*(.1+f.time*5));
   if(f.time>.18){this.scene.remove(f.mesh);this.flashes.splice(i,1);}
  }
 }
 update(dt){
  if(!this.enabled||!this.active||!this.player.available())return;
  this.player.update(dt);this.player.hurt.applyPose();this.stepShots(dt);
 }
}
export class LuxPlayer extends RiftPlayer {
 constructor(hero,options){
  super(hero,options,{hint:'WASD move · Space jump · LMB Sunlance · RMB Sunburst · Hold E to lock, release to fire',
   actions:[['Jump','Space'],['Sunlance','Fire'],['Sunburst','Shield'],['Lock volley','KeyE']],
   codes:['KeyW','KeyA','KeyS','KeyD','Space','KeyE','KeyF','KeyG']});
 }
 clear(){super.clear();this.hero.clearLocks();}
 update(dt){
  const h=this.hero;
  this.hurt.step(dt);this.move(dt);this.frame();this.face(dt);
  h.character.update(this.grounded?(this.walking?'Run':'Idle'):(this.vertical>0?'Jump':'Fall'),dt);
  const ray=this.camera.getWorldDirection(new T.Vector3()),eye=this.camera.position;
  const end=eye.clone().addScaledVector(ray,380),aim=h.traceBolt(eye,end)?.point||end;
  for(const key of Object.keys(h.cool))h.cool[key]=Math.max(0,h.cool[key]-dt);
  h.castRemaining=Math.max(0,h.castRemaining-dt);
  const down=k=>this.keys.has(k)||this.taps.has(k);
  const lance=down('Fire')||down('KeyF'),spray=down('Shield')||down('KeyG');
  if(lance||spray||h.charging||h.castRemaining)h.character.arm('R',h.character.world('B_R_UpperArm').addScaledVector(ray,.8));
  const origin=h.character.hand('R'),dir=new T.Vector3().copy(aim).sub(origin).normalize();
  for(const kind of ['lance','spray']){
   if(!(kind==='lance'?lance:spray)||h.cool[kind]>0)continue;
   const velocity=dir.clone();
   if(kind==='spray'){
    const right=new T.Vector3().crossVectors(dir,up).normalize(),vertical=right.clone().cross(dir);
    const angle=Math.random()*Math.PI*2,r=.21*Math.sqrt(Math.random());
    velocity.addScaledVector(right,r*Math.cos(angle)).addScaledVector(vertical,r*Math.sin(angle)).normalize();
   }
   h.shoot(kind,origin,velocity);h.flash(origin,kind==='lance'?.7:.28);h.cool[kind]=spells[kind].gap;
  }
  if(this.keys.has('KeyE')&&!h.cool.comet){h.charging=true;h.lock(origin,ray,dt);}
  if(h.charging&&!this.keys.has('KeyE')){
   const locked=h.locks.filter(targetable);
   for(const [i,u] of locked.entries()){
    const fan=dir.clone().applyAxisAngle(up,(i-(locked.length-1)/2)*.28);
    h.shoot('comet',origin,fan.addScaledVector(up,.4).normalize(),u);
   }
   if(locked.length){h.flash(origin,1);h.cool.comet=4;}
   h.clearLocks();
  }
  h.drawLocks(this.camera);
  const progress=h.pendingTarget?' · Acquiring '+Math.floor(100*h.pendingTime/lockTime)+'%':'';
  this.output.textContent=h.charging?'Targets locked '+h.locks.length+' / '+maxLocks+progress:
   h.cool.comet?'Light volley '+h.cool.comet.toFixed(1)+'s':'Light volley ready';
  this.taps.clear();
 }
}
