import * as THREE from './vendor/three.module.js';
import {EYE_BEAMS,RobotEyeCycle,segmentSphereFraction} from './robot-eye-cycle.js?v=eye-beams-33';
export class RobotEyeBeams{
 constructor(scene,{getRobot,getRunner,canAttack,traceWorld,onImpact,onLaunch=()=>{}}){
  Object.assign(this,{scene,getRobot,getRunner,canAttack,traceWorld,onImpact,onLaunch});this.cycle=new RobotEyeCycle();this.root=new THREE.Group();this.root.name='Robot eye beams';scene.add(this.root);this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);
  const material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});
  const cylinder=new THREE.CylinderGeometry(1,1,1,5,1,true),ball=new THREE.IcosahedronGeometry(1,1);
  this.core=new THREE.InstancedMesh(cylinder,material('#fff1d8',1),EYE_BEAMS.maxBolts);this.glow=new THREE.InstancedMesh(cylinder,material('#ff163c',.6),EYE_BEAMS.maxBolts);this.charges=new THREE.InstancedMesh(ball,material('#ff1737',.85),4);this.guides=new THREE.InstancedMesh(cylinder,material('#ff2548',.16),2);
  for(const m of[this.core,this.glow,this.charges,this.guides]){m.count=0;m.frustumCulled=false;this.root.add(m);}this.reset();
 }
 reset(){this.cycle.reset();this.bolts=[];this.previousCenters=null;this.hits=0;this.coverHits=0;this.expired=0;this.sequence=0;this.lastHit=null;this.history=[];for(const m of[this.core,this.glow,this.charges,this.guides])m.count=0;const robot=this.getRobot();if(robot)robot.eyeTarget=null;}
 muzzles(){const robot=this.getRobot(),visor=robot.nodes.visor,box=robot.boxes.visor;robot.root.updateMatrixWorld(true);return[-1,1].map(side=>visor.localToWorld(new THREE.Vector3(box.center.x+side*box.size.x*.29,box.center.y,box.center.z+box.size.z*.5+.13)));}
 centers(runner){return[.65,1.5,2.05].map(h=>runner.root.position.clone().addScaledVector(runner.bodyUp,h));}
 update(dt,time){
  const robot=this.getRobot(),runner=this.getRunner(),alive=!robot.dead&&!!robot.combatUnit?.alive,enabled=runner&&runner.enabled!==false;
  if(!alive){this.cycle.cancel();this.bolts=[];robot.eyeTarget=null;this.render(time,[]);return;}
  const muzzles=this.muzzles(),target=enabled?runner.root.position.clone().addScaledVector(runner.bodyUp,1.25):null,origin=muzzles[0],direction=new THREE.Vector3(0,0,1).transformDirection(robot.nodes.head.matrixWorld),desired=this.cycle.target?new THREE.Vector3(this.cycle.target.x,this.cycle.target.y,this.cycle.target.z).sub(origin).normalize():direction;
  const aims=this.cycle.step(dt,{alive,target,origin,velocity:runner?.motion.velocity,allowed:this.canAttack(),aligned:direction.dot(desired)>.82});robot.eyeTarget=this.cycle.target;
  for(const aim of aims)for(const from of muzzles){if(this.bolts.length>=EYE_BEAMS.maxBolts)break;const dir=new THREE.Vector3(aim.x,aim.y,aim.z).sub(from).normalize();this.bolts.push({id:++this.sequence,position:from.clone(),dir,age:0});this.history.push({from:from.toArray(),target:{...aim},time});this.onLaunch(from);}
  this.history=this.history.slice(-12);const centers=enabled?this.centers(runner):[],previous=this.previousCenters||centers;
  for(let i=this.bolts.length-1;i>=0;i--){const b=this.bolts[i],from=b.position.clone(),to=from.clone().addScaledVector(b.dir,EYE_BEAMS.speed*dt);let hit=this.traceWorld(from,to,EYE_BEAMS.radius);
   if(enabled)for(let j=0;j<centers.length;j++){const t=segmentSphereFraction(from,to,centers[j],.48+EYE_BEAMS.radius,previous[j]||centers[j]);if(t!==null&&(!hit||t<hit.t))hit={kind:'speedster',t,point:from.clone().lerp(to,t)};}
   if(hit){b.position.set(hit.point.x,hit.point.y,hit.point.z);this.lastHit=hit.kind;if(hit.kind==='speedster'){this.hits++;runner.receiveEyeHit?.(b.position);}else this.coverHits++;this.onImpact(b.position.clone(),hit);this.bolts.splice(i,1);continue;}
   b.position.copy(to);b.age+=dt;if(b.age>EYE_BEAMS.range/EYE_BEAMS.speed){this.expired++;this.bolts.splice(i,1);}
  }
  this.previousCenters=centers.map(p=>p.clone());this.render(time,muzzles);
 }
 segment(mesh,index,a,b,radius){this.dummy.position.copy(a).add(b).multiplyScalar(.5);this.dummy.quaternion.setFromUnitVectors(this.up,b.clone().sub(a).normalize());this.dummy.scale.set(radius,a.distanceTo(b),radius);this.dummy.updateMatrix();mesh.setMatrixAt(index,this.dummy.matrix);}
 render(time,muzzles){
  this.core.count=this.glow.count=this.bolts.length;
  for(let i=0;i<this.bolts.length;i++){const b=this.bolts[i],tail=b.position.clone().addScaledVector(b.dir,-Math.min(3,EYE_BEAMS.speed*b.age));this.segment(this.core,i,tail,b.position,.075);this.segment(this.glow,i,tail,b.position,.25);}
  this.charges.count=this.guides.count=0;const charging=this.cycle.phase==='charging',progress=charging?Math.min(1,this.cycle.elapsed/EYE_BEAMS.charge):0;
  if(charging&&this.cycle.target){const end=new THREE.Vector3(this.cycle.target.x,this.cycle.target.y,this.cycle.target.z);for(let i=0;i<muzzles.length;i++){this.segment(this.guides,i,muzzles[i],end,.018);for(let j=0;j<2;j++){this.dummy.position.copy(muzzles[i]);this.dummy.quaternion.identity();this.dummy.scale.setScalar((.18+progress*.3)*(j?1.65:1)*(1+.08*Math.sin(time*35)));this.dummy.updateMatrix();this.charges.setMatrixAt(i*2+j,this.dummy.matrix);}}this.charges.count=4;this.guides.count=2;}
  for(const m of[this.core,this.glow,this.charges,this.guides])m.instanceMatrix.needsUpdate=true;
 }
 diagnostics(){return{...this.cycle.diagnostics(),liveBolts:this.bolts.length,hits:this.hits,coverHits:this.coverHits,expired:this.expired,lastHit:this.lastHit,history:this.history.map(h=>({...h,from:[...h.from],target:{...h.target}}))};}
}
