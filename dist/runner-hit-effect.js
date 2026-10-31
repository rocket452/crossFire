import * as THREE from './vendor/three.module.js';
export const LIGHTNING_HIT=Object.freeze({targets:4,sparks:72,segments:96,lifetime:.26,burstInterval:.10});
// Damage-confirmed contact feedback. Armor flashing is owned by the shared
// enemy damage layer, so cleanup here cannot erase flashes from other weapons.
export class RunnerHitEffect {
 constructor(parent){
  this.root=new THREE.Group();this.root.name='Volt confirmed lightning impacts';parent.add(this.root);this.targets=new Map();this.sparks=[];this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);this.axis=new THREE.Vector3();this.color=new THREE.Color();this.identity=new THREE.Quaternion();this.bursts=0;
  const material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const pool=(geometry,color,opacity,count)=>{const m=new THREE.InstancedMesh(geometry,material(color,opacity),count);m.count=0;m.frustumCulled=false;this.root.add(m);return m;},line=new THREE.CylinderGeometry(1,1,1,5,1,true),ball=new THREE.IcosahedronGeometry(1,0);
  this.core=pool(line,'#edffff',.95,LIGHTNING_HIT.segments);this.glow=pool(line,'#31cfff',.35,LIGHTNING_HIT.segments);this.particles=pool(ball,'#bcfaff',.95,LIGHTNING_HIT.sparks);this.flash=pool(ball,'#eaffff',.9,LIGHTNING_HIT.targets);this.halo=pool(ball,'#23bfff',.18,LIGHTNING_HIT.targets);this.rings=pool(new THREE.TorusGeometry(1,.035,3,28),'#78efff',.65,LIGHTNING_HIT.targets);this.pools=[this.core,this.glow,this.particles,this.flash,this.halo,this.rings];
 }
 clear(){this.targets.clear();this.sparks.length=0;for(const m of this.pools)m.count=0;this.bursts=0;}
 anchor(unit,point){
  let closest=unit.entity.root,best=Infinity;unit.entity.root.updateWorldMatrix(true,true);unit.entity.root.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry)return;if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const p=mesh.worldToLocal(point.clone()),near=mesh.geometry.boundingBox.clampPoint(p,new THREE.Vector3());mesh.localToWorld(near);const d=near.distanceToSquared(point);if(d<best){best=d;closest=mesh;}});return closest;
 }
 notify(hit,from){
  if(!(hit.damage>0)||hit.unit?.kind!=='robot'||!hit.unit.entity.root)return;
  let s=this.targets.get(hit.unit.id);if(!s){
   if(this.targets.size>=LIGHTNING_HIT.targets){const oldest=this.targets.keys().next().value;this.targets.delete(oldest);}
   s={unit:hit.unit,local:new THREE.Vector3(),point:new THREE.Vector3(),normal:new THREE.Vector3(),cooldown:0,age:0,damage:0};this.targets.set(hit.unit.id,s);
  }
  const point=new THREE.Vector3().copy(hit.point);s.anchor=hit.anchor||this.anchor(hit.unit,point);s.local.copy(s.anchor.worldToLocal(point.clone()));s.point.copy(point);s.normal.copy(from).sub(point).normalize();s.radius=hit.weakPoint ? .8 : hit.unit.maxHealth>5000 ? 1.4 : .8;s.life=LIGHTNING_HIT.lifetime;s.damage+=hit.damage;
  if(s.cooldown<=1e-8){s.cooldown=LIGHTNING_HIT.burstInterval;this.bursts++;for(let i=0;i<6;i++){if(this.sparks.length>=LIGHTNING_HIT.sparks)this.sparks.shift();const angle=i*Math.PI/3+this.bursts*1.7,v=new THREE.Vector3(Math.sin(angle)*2,1.5+Math.cos(angle*2),Math.cos(angle)*2).addScaledVector(s.normal,2.5);this.sparks.push({p:point.clone().addScaledVector(s.normal,.12),v,life:.24,max:.24});}}
 }
 instance(mesh,index,p,scale,fade=1,q=this.identity){this.dummy.position.copy(p);this.dummy.quaternion.copy(q);this.dummy.scale.copy(scale);this.dummy.updateMatrix();mesh.setMatrixAt(index,this.dummy.matrix);this.color.setRGB(fade,fade,fade);mesh.setColorAt(index,this.color);}
 update(dt,time,hits=[],from=null){
  for(const s of this.targets.values()){s.life-=dt;s.age+=dt;s.cooldown=Math.max(0,s.cooldown-dt);}
  for(const hit of hits)if(from)this.notify(hit,from);
  let index=0,segment=0;
  for(const[id,s]of this.targets){
   if(s.life<=0){this.targets.delete(id);continue;}
   s.anchor.updateWorldMatrix(true,false);s.point.copy(s.local);s.anchor.localToWorld(s.point);const fade=Math.min(1,s.life/.12),pulse=.65+.35*Math.sin(time*38)**2;
   const p=s.point.clone().addScaledVector(s.normal,.12),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),s.normal),r=s.radius;
   this.instance(this.flash,index,p,new THREE.Vector3().setScalar(r*(.20+.07*pulse)),fade);this.instance(this.halo,index,p,new THREE.Vector3().setScalar(r*(.6+.15*pulse)),fade*.8);this.instance(this.rings,index,p,new THREE.Vector3().setScalar(r*(.35+(s.age*7%1)*.65)),fade,q);index++;
   for(let branch=0;branch<6;branch++){let previous=p.clone();for(let step=1;step<=3;step++){const a=branch*Math.PI/3+Math.sin(time*24+step)*.22,t=step/3,local=new THREE.Vector3(Math.cos(a)*r*t,Math.sin(a)*r*t,.12+Math.sin(step*8+time*42+branch)*.12).applyQuaternion(q),next=p.clone().add(local);this.axis.copy(next).sub(previous);const length=this.axis.length(),rotation=new THREE.Quaternion().setFromUnitVectors(this.up,this.axis.normalize()),middle=previous.clone().add(next).multiplyScalar(.5);if(segment<LIGHTNING_HIT.segments){this.instance(this.core,segment,middle,new THREE.Vector3(.024,length,.024),fade*pulse,rotation);this.instance(this.glow,segment,middle,new THREE.Vector3(.10,length,.10),fade*pulse,rotation);segment++;}previous=next;}}
  }
  this.flash.count=this.halo.count=this.rings.count=index;this.core.count=this.glow.count=segment;
  let spark=0;for(let i=this.sparks.length-1;i>=0;i--){const s=this.sparks[i];s.life-=dt;if(s.life<=0){this.sparks.splice(i,1);continue;}s.v.y-=5*dt;s.p.addScaledVector(s.v,dt);this.instance(this.particles,spark++,s.p,new THREE.Vector3().setScalar(.045+.035*s.life/s.max),s.life/s.max);}this.particles.count=spark;
  for(const mesh of this.pools){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }
 diagnostics(){return{targets:this.targets.size,sparks:this.particles.count,segments:this.core.count,bursts:this.bursts,draws:this.pools.filter(m=>m.count>0).length,contacts:[...this.targets.values()].map(s=>({id:s.unit.id,damage:s.damage,point:s.point.toArray(),life:s.life}))};}
}
