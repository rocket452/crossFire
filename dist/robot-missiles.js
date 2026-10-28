import * as THREE from './vendor/three.module.js';
import {segmentBoxFraction} from './combat-collision.js?v=robot-1';

// Bounded, swept-collision missiles. An intercepted warhead has no damaging blast.
export class RobotMissiles {
 constructor(scene,model,{getMuzzles,getTargets,isRobotAlive,traceWorld,onImpact,onBurst=()=>{},onTrail=()=>{},onLaunch=()=>{},onSalvo=()=>{}}){
  Object.assign(this,{scene,getMuzzles,getTargets,isRobotAlive,traceWorld,onImpact,onBurst,onTrail,onLaunch,onSalvo});
  this.template=model.scene;this.forward=new THREE.Vector3(0,0,1);this.flameGeometry=new THREE.ConeGeometry(.24,1.3,6);this.flameGeometry.rotateX(-Math.PI/2);this.flameMaterial=new THREE.MeshBasicMaterial({color:'#ffaf39',toneMapped:false});this.reset();
 }
 reset(){for(const m of this.missiles||[])this.scene.remove(m.mesh);this.missiles=[];this.clock=0;this.cooldown=5.2;this.pending=0;this.launchClock=0;this.launched=0;this.salvos=0;this.intercepted=0;this.impacts=0;this.expired=0;this.byHero={violet:0,volt:0,other:0};this.sequence=0;this.targetIndex=0;}
 beginSalvo(){if(!this.isRobotAlive()||this.pending||this.missiles.filter(m=>m.alive).length>6||!this.getTargets().length)return false;this.pending=6;this.launchClock=0;this.salvos++;this.onSalvo();return true;}
 launch(){
  const targets=this.getTargets().filter(u=>u.alive&&u.shapes?.length);if(!targets.length)return;
  const index=this.targetIndex++,target=targets[index%targets.length],rail=(6-this.pending)%6,muzzle=this.getMuzzles()[rail];if(!muzzle)return;
  const mesh=this.template.clone(true);mesh.position.copy(muzzle.position);const flame=new THREE.Mesh(this.flameGeometry,this.flameMaterial);flame.position.z=-1.35;mesh.add(flame);this.scene.add(mesh);
  const m={id:'siege-missile-'+(++this.sequence),alive:true,health:18,age:0,life:22,speed:8.5,radius:.36,position:mesh.position,previous:mesh.position.clone(),direction:muzzle.direction.clone().normalize(),velocity:new THREE.Vector3(),origin:mesh.position.clone(),target,targetPoint:new THREE.Vector3().copy(target.shapes[0].center),mesh,flame,trail:0,claim:null,claimUntil:0};
  this.missiles.push(m);this.launched++;this.onLaunch(m.position);return m;
 }
 hurt(m,damage,hero='other'){
  if(!m?.alive||!(damage>0))return 0;const dealt=Math.min(m.health,damage);m.health-=dealt;
  if(m.health<=0){m.alive=false;this.intercepted++;this.byHero[hero]=(this.byHero[hero]||0)+1;this.onBurst(m.position,hero);this.scene.remove(m.mesh);}
  return dealt;
 }
 claim(m,hero,seconds=1.1){if(m?.alive){m.claim=hero;m.claimUntil=this.clock+seconds;}}
 trace(from,to,radius=0){
  let best=null;for(const m of this.missiles){if(!m.alive)continue;const half={x:m.radius,y:m.radius,z:m.radius};const t=segmentBoxFraction(from,to,m.position,half,undefined,radius,m.previous);if(t!==null&&(!best||t<best.t))best={kind:'missile',missile:m,t,point:{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t}};}
  return best;
 }
 selectThreat(from,hero,canSee=()=>true){
  const candidates=this.missiles.filter(m=>m.alive&&from.distanceToSquared(m.position)<110*110&&canSee(m));
  candidates.sort((a,b)=>{const score=m=>(m.claim&&m.claim!==hero&&m.claimUntil>this.clock?30:0)+m.position.distanceTo(m.targetPoint)/m.speed+from.distanceTo(m.position)*.035;return score(a)-score(b);});return candidates[0]||null;
 }
 update(dt,time){
  this.clock+=dt;
  if(this.isRobotAlive()){
   this.cooldown-=dt;if(this.cooldown<=0){if(this.beginSalvo())this.cooldown=19;else this.cooldown=.5;}
   this.launchClock-=dt;while(this.pending&&this.launchClock<=0){this.launch();this.pending--;this.launchClock+=.43;}
  }else this.pending=0;
  for(const m of this.missiles){
   if(!m.alive)continue;m.previous.copy(m.position);m.age+=dt;m.life-=dt;
   if(m.target.alive&&m.target.shapes[0])m.targetPoint.copy(m.target.shapes[0].center);
   // Clear the shoulder and climb above most roofs before steering down at a target.
   const goal=m.age<2.25?m.origin.clone().lerp(m.targetPoint,.35).setY(Math.max(32,m.origin.y+12)):m.targetPoint;
   const desired=goal.clone().sub(m.position).normalize();m.direction.lerp(desired,1-Math.exp(-(m.age<.5?1.4:2.4)*dt)).normalize();m.velocity.copy(m.direction).multiplyScalar(m.speed);
   const end=m.position.clone().addScaledVector(m.velocity,dt),hit=this.traceWorld(m.position,end,m.radius);
   if(hit){m.position.set(hit.point.x,hit.point.y,hit.point.z);m.alive=false;this.impacts++;this.scene.remove(m.mesh);this.onImpact(m.position,hit);continue;}
   m.position.copy(end);m.mesh.quaternion.setFromUnitVectors(this.forward,m.direction);m.flame.scale.setScalar(.8+Math.sin(time*27+m.age*3)*.2);
   m.trail-=dt;if(m.trail<=0){this.onTrail(m.position,m.direction);m.trail=.09;}
   if(m.life<=0){m.alive=false;this.expired++;this.scene.remove(m.mesh);this.onBurst(m.position,'expired');}
  }
  this.missiles=this.missiles.filter(m=>m.alive);
 }
 diagnostics(){return{salvos:this.salvos,launched:this.launched,pending:this.pending,active:this.missiles.filter(m=>m.alive).length,intercepted:this.intercepted,impacts:this.impacts,expired:this.expired,byHero:{...this.byHero},cooldown:this.cooldown,missiles:this.missiles.filter(m=>m.alive).map(m=>({id:m.id,position:m.position.toArray(),health:m.health,speed:m.speed,age:m.age,target:m.target.id,claim:m.claim}))};}
}
