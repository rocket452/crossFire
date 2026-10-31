import * as THREE from './vendor/three.module.js';

// One shared, bounded visual pool for the entire squad. No lights, textures or damage.
export const RAIDER_ENERGY=Object.freeze({sparks:384,rings:96,halos:64,trailRate:30,trailLife:.34,impactLife:.48});
export class RaiderEnergyEffects {
 constructor(scene){
  this.scene=scene;this.particles=[];this.bursts=[];this.time=0;this.sequence=0;this.boltCount=0;this.dummy=new THREE.Object3D();this.forward=new THREE.Vector3(0,0,1);
  const material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  this.sparks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),material('#ffdba0',.85),RAIDER_ENERGY.sparks);
  this.rings=new THREE.InstancedMesh(new THREE.TorusGeometry(1,.045,4,32),material('#ff8e39',.85),RAIDER_ENERGY.rings);
  this.halos=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material('#ff431b',.14),RAIDER_ENERGY.halos);
  for(const [name,mesh]of[['sparks',this.sparks],['rings',this.rings],['halos',this.halos]]){mesh.name='Drone energy '+name;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);}
 }
 reset(){this.particles.length=this.bursts.length=0;this.time=this.sequence=this.boltCount=0;for(const mesh of[this.sparks,this.rings,this.halos])mesh.count=0;}
 noise(){return Math.sin(++this.sequence*127.1)*.5+.5;}
 particle(p,v,life,size){if(this.particles.length>=RAIDER_ENERGY.sparks)this.particles.shift();this.particles.push({p:p.clone(),v,life,max:life,size});}
 impact(point,direction,radius){
  if(this.bursts.length>=16)this.bursts.shift();this.bursts.push({p:new THREE.Vector3().copy(point),q:new THREE.Quaternion().setFromUnitVectors(this.forward,direction),life:RAIDER_ENERGY.impactLife,radius});
  for(let i=0;i<18;i++){const v=new THREE.Vector3(this.noise()*2-1,this.noise()*2-1,this.noise()*2-1).normalize().multiplyScalar(4+this.noise()*6);this.particle(new THREE.Vector3().copy(point),v,.25+this.noise()*.28,.08+this.noise()*.1);}
 }
 put(mesh,p,q,x,y=x,z=x){if(mesh.count>=mesh.instanceMatrix.count)return;this.dummy.position.copy(p);this.dummy.quaternion.copy(q);this.dummy.scale.set(x,y,z);this.dummy.updateMatrix();mesh.setMatrixAt(mesh.count++,this.dummy.matrix);}
 update(dt,bolts){
  this.time+=dt;this.boltCount=bolts.length;for(const mesh of[this.sparks,this.rings,this.halos])mesh.count=0;
  const q=new THREE.Quaternion(),turn=new THREE.Quaternion(),identity=new THREE.Quaternion();
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.p.addScaledVector(p.v,dt);const size=p.size*p.life/p.max;q.setFromUnitVectors(this.forward,p.v.clone().normalize());this.put(this.sparks,p.p,q,size,size,size*2.5);}
  for(const b of bolts){
   b.energyAge=(b.energyAge||0)+dt;b.energyTick=(b.energyTick||0)+dt;const r=b.radius,p=b.mesh.position,pulse=1+.045*Math.sin(b.energyAge*19);q.setFromUnitVectors(this.forward,b.dir);
   this.put(this.halos,p,identity,r*1.13*pulse);this.put(this.halos,p,identity,r*1.29*pulse);
   for(const sign of[-1,1]){turn.setFromEuler(new THREE.Euler(sign*.62,b.energyAge*sign*4,b.energyAge*sign*7));this.put(this.rings,p,q.clone().multiply(turn),r*1.13);}
   // Do not bridge gateway teleports: new sparks start at the current position.
   const count=Math.min(3,Math.floor(b.energyTick*RAIDER_ENERGY.trailRate));b.energyTick%=1/RAIDER_ENERGY.trailRate;
   for(let i=0;i<count;i++){const offset=new THREE.Vector3(this.noise()-.5,this.noise()-.5,this.noise()-.5).multiplyScalar(r*.8),p=b.mesh.position.clone().addScaledVector(b.dir,-r*.65).add(offset),v=b.dir.clone().multiplyScalar(-2).add(offset);this.particle(p,v,RAIDER_ENERGY.trailLife,.1+this.noise()*.08);}
  }
  for(let i=this.bursts.length-1;i>=0;i--){const b=this.bursts[i];b.life-=dt;if(b.life<=0){this.bursts.splice(i,1);continue;}const age=1-b.life/RAIDER_ENERGY.impactLife;this.put(this.rings,b.p,b.q,b.radius*(.6+age*2.5));this.put(this.halos,b.p,identity,b.radius*(.7+age)*Math.sqrt(1-age));}
  for(const mesh of[this.sparks,this.rings,this.halos])mesh.instanceMatrix.needsUpdate=true;
 }
 diagnostics(){return{bolts:this.boltCount,sparks:this.particles.length,bursts:this.bursts.length,rings:this.rings.count,drawPools:3,maxSparks:RAIDER_ENERGY.sparks};}
}
