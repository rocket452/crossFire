import * as THREE from './vendor/three.module.js';

// Surface coordinates are fractions of each articulated part's local bounding box.
// All sockets face forward; no cycle requires a rear-only or rooftop firing angle.
export const WEAK_POINT_LOCATIONS=Object.freeze([
 {id:'left-shoulder',part:'upperarm_l',region:'left-arm',x:0,y:.28},
 {id:'left-arm',part:'forearm_l',region:'left-arm',x:0,y:.05},
 {id:'right-shoulder',part:'upperarm_r',region:'right-arm',x:0,y:.28},
 {id:'right-arm',part:'forearm_r',region:'right-arm',x:0,y:.12},
 {id:'upper-chest',part:'chest',region:'torso',x:-.18,y:.15},
 {id:'lower-torso',part:'pelvis',region:'torso',x:.12,y:0},
 {id:'left-leg',part:'shin_l',region:'legs',x:0,y:.16},
 {id:'right-leg',part:'shin_r',region:'legs',x:0,y:.16},
 {id:'left-thigh',part:'thigh_l',region:'legs',x:0,y:0},
 {id:'right-thigh',part:'thigh_r',region:'legs',x:0,y:0}
]);
export const WEAK_POINTS=Object.freeze({count:4,health:180,radius:.62,stunDuration:5,burstFraction:.08,cooldown:12,minimumSpacing:1.8,locations:WEAK_POINT_LOCATIONS});
const shuffle=(a,random)=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(v=>v.v);
function sphereFraction(a,b,c,r){const x=a.x-c.x,y=a.y-c.y,z=a.z-c.z,dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,k=x*x+y*y+z*z-r*r;if(k<=0)return 0;const length=dx*dx+dy*dy+dz*dz;if(!length)return null;const dot=x*dx+y*dy+z*dz,disc=dot*dot-length*k;if(disc<0)return null;const t=(-dot-Math.sqrt(disc))/length;return t>=0&&t<=1?t:null;}

// One authority for health, final-point ownership and cycle completion. Not an aim target.
export class SiegeWeakPoints {
 constructor(robot,{config={},random=Math.random,onComplete=()=>{},onBreak=()=>{}}={}){
  Object.assign(this,{robot,random,onComplete,onBreak});this.config={...WEAK_POINTS,...config};
  this.coreGeometry=new THREE.IcosahedronGeometry(this.config.radius,1);
  this.ringGeometry=new THREE.TorusGeometry(this.config.radius*1.28,.055,4,24);
  this.haloGeometry=new THREE.TorusGeometry(this.config.radius*1.65,.035,4,24);
  this.points=[];this.discharge=new THREE.Group();this.discharge.name='Weak point overload rings';robot.scene.add(this.discharge);
  this.dischargeMaterial=new THREE.MeshBasicMaterial({color:'#b8fbff',transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});
  const shockGeometry=new THREE.TorusGeometry(1,.018,4,48);for(let i=0;i<2;i++){const ring=new THREE.Mesh(shockGeometry,this.dischargeMaterial);ring.rotation.x=i*Math.PI/2;this.discharge.add(ring);}this.reset();
 }
 clear(){for(const p of this.points){p.root.removeFromParent();p.material.dispose();p.haloMaterial.dispose();}this.points=[];}
 reset(){this.clear();this.burstRemaining=0;this.discharge.visible=false;this.cycle=0;this.completions=0;this.totalBurst=0;this.hits=0;this.blockedAIHits=0;this.cooldownRemaining=0;this.generate();}
 stop(){this.phase='dead';this.discharge.visible=false;this.burstRemaining=0;for(const p of this.points)p.root.visible=false;}
 generate(){
  this.clear();this.cycle++;this.phase='active';const c=this.config,groups=new Map();
  for(const s of shuffle(c.locations,this.random)){if(!this.robot.nodes[s.part])continue;if(!groups.has(s.region))groups.set(s.region,[]);groups.get(s.region).push(s);}
  const queues=shuffle([...groups.values()],this.random),candidates=[];
  // Round-robin regions before considering a second socket in any region.
  while(queues.some(g=>g.length))for(const g of queues)if(g.length)candidates.push(g.shift());
  const count=Math.min(Math.max(1,Math.floor(c.count)),candidates.length);
  while(candidates.length){
   const next=candidates.findIndex(s=>!this.points.some(p=>p.region===s.region)),[s]=candidates.splice(next<0?0:next,1);
   const box=this.robot.boxes[s.part],node=this.robot.nodes[s.part],position=box.center.clone().add(new THREE.Vector3(box.size.x*s.x,box.size.y*s.y,box.size.z/2+c.radius*.65));node.updateWorldMatrix(true,false);const world=node.localToWorld(position.clone());
   if(this.points.some(p=>p.root.getWorldPosition(new THREE.Vector3()).distanceTo(world)<c.minimumSpacing))continue;
   const root=new THREE.Group();root.name='Weak point / '+s.id;root.position.copy(position);node.add(root);
   const material=new THREE.MeshBasicMaterial({color:'#56fff0',toneMapped:false}),haloMaterial=new THREE.MeshBasicMaterial({color:'#56fff0',transparent:true,opacity:.35,depthWrite:false,toneMapped:false});
   const core=new THREE.Mesh(this.coreGeometry,material),ring=new THREE.Mesh(this.ringGeometry,material),halo=new THREE.Mesh(this.haloGeometry,haloMaterial);ring.position.z=.12;halo.position.z=.08;root.add(core,ring,halo);
   this.points.push({id:this.cycle+':'+s.id,location:s.id,region:s.region,part:s.part,health:c.health,maxHealth:c.health,root,core,ring,halo,material,haloMaterial,position:world,final:false});
   if(this.points.length>=count)break;
  }
  this.total=this.points.length;this.updateVisuals(0);
 }
 get remaining(){return this.points.filter(p=>p.health>0).length;}
 trace(from,to,radius=0){
  if(this.phase!=='active'||this.robot.dead)return null;let nearest=null;
  for(const p of this.points){if(p.health<=0)continue;p.root.updateWorldMatrix(true,false);p.root.getWorldPosition(p.position);const t=sphereFraction(from,to,p.position,this.config.radius+radius);if(t!==null&&(!nearest||t<nearest.t))nearest={kind:'unit',unit:this.robot.combatUnit,weakPoint:p,t,point:{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t}};}
  return nearest;
 }
 hurt(point,power,{player=false}={}){
  if(this.phase!=='active'||this.robot.dead||!this.robot.combatUnit?.alive||!this.points.includes(point)||point.health<=0||!Number.isFinite(power)||power<=0)return 0;
  // CPU splash, beams and in-flight bolts cannot spend the player's final stun.
  if(!player&&this.remaining===1){this.blockedAIHits++;return 0;}
  const damage=Math.min(point.health,power);point.health=Math.max(0,point.health-damage);this.hits++;
  if(point.health===0){point.root.visible=false;point.root.getWorldPosition(point.position);this.onBreak(point.position.clone());
   if(this.remaining===0){this.burstRemaining=.65;this.discharge.position.copy(this.robot.root.position).y+=12;this.discharge.scale.setScalar(2);this.dischargeMaterial.opacity=.75;this.discharge.visible=true;this.phase='stunned';this.completions++;const burst=this.robot.combatUnit.maxHealth*this.config.burstFraction;this.totalBurst+=this.onComplete({burst,seconds:this.config.stunDuration,cycle:this.cycle})||0;}
  }
  this.updateVisuals(0);return damage;
 }
 update(dt,time){
  if(this.robot.dead||!this.robot.combatUnit?.alive){this.stop();return;}
  this.burstRemaining=Math.max(0,this.burstRemaining-dt);this.discharge.visible=this.burstRemaining>0;this.discharge.scale.setScalar(2+(1-this.burstRemaining/.65)*9);this.dischargeMaterial.opacity=.75*(this.burstRemaining/.65)**2;
  if(this.phase==='stunned'&&this.robot.stunRemaining<=0){this.phase='cooldown';this.cooldownRemaining=this.config.cooldown;}
  else if(this.phase==='cooldown'&&this.robot.stunRemaining<=0){this.cooldownRemaining=Math.max(0,this.cooldownRemaining-dt);if(this.cooldownRemaining<=1e-8)this.generate();}
  this.updateVisuals(time);
 }
 updateVisuals(time){const final=this.remaining===1;
  for(const p of this.points){p.final=final&&p.health>0;if(!p.root.visible)continue;const damaged=p.health<p.maxHealth,color=p.final?'#ff69eb':damaged?'#ffb347':'#56fff0',pulse=p.final?.5+.5*Math.sin(time*Math.PI*4):damaged?.75+.25*Math.sin(time*29+p.health):.9+.1*Math.sin(time*3);
   p.material.color.set(color).multiplyScalar(p.final?1.2+pulse:damaged?.65+pulse*.35:1);p.haloMaterial.color.set(color);p.haloMaterial.opacity=p.final?.35+pulse*.55:.22+pulse*.12;p.core.scale.setScalar(1+(p.final?.12:.035)*pulse);p.ring.rotation.z=time*(p.final?2:.4);p.halo.scale.setScalar(p.final?1+pulse*.25:1);p.halo.rotation.set(p.final?Math.sin(time*3)*.35:0,time*(p.final?1.7:.4),0);
  }
 }
 status(){return this.phase==='dead'?'WEAK POINTS OFFLINE':this.phase==='stunned'?'SIEGE WALKER STUNNED':this.phase==='cooldown'?'WEAK POINTS REFORM IN '+Math.ceil(this.cooldownRemaining)+'s':this.remaining===1?'FINAL WEAK POINT — STUN READY':'WEAK POINTS: '+(this.total-this.remaining)+' / '+this.total+' DESTROYED';}
 diagnostics(){return{phase:this.phase,burstRemaining:this.burstRemaining,cycle:this.cycle,total:this.total,remaining:this.remaining,completions:this.completions,totalBurst:this.totalBurst,hits:this.hits,blockedAIHits:this.blockedAIHits,cooldownRemaining:this.cooldownRemaining,config:{...this.config},points:this.points.map(p=>({id:p.id,location:p.location,part:p.part,region:p.region,health:p.health,maxHealth:p.maxHealth,final:p.final,visible:p.root.visible,position:p.root.getWorldPosition(p.position).toArray()}))};}
}
