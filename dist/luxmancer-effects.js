import * as T from './vendor/three.module.js';

const spark=new T.OctahedronGeometry(1,0);
const rim=new T.TorusGeometry(1,.024,5,40);
const streak=new T.CylinderGeometry(.3,1,1,4).rotateX(Math.PI/2);
const forward=new T.Vector3(0,0,1);
const white=new T.Color(0xfff4cc),amber=new T.Color(0xff9a23);
const styles={
 lance:{radius:2.2,time:.34,sparks:16,size:.12},
 spray:{radius:.46,time:.16,sparks:4,size:.065},
 comet:{radius:2.75,time:.44,sparks:20,size:.15}
};
function light(color,opacity=1){
 return new T.MeshBasicMaterial({color,opacity,transparent:true,depthWrite:false,
  blending:T.AdditiveBlending,toneMapped:false});
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
  this.sigil.add(new T.Mesh(rim,light(0xffdc71,.75)));
  for(let i=0;i<6;i++){
   const angle=i*Math.PI/3,ray=new T.Mesh(spark,light(0xffeea2,.85));
   ray.position.set(Math.cos(angle),Math.sin(angle),0);
   ray.scale.set(.22,.055,.075);ray.rotation.z=angle;
   this.sigil.add(ray);
  }
  this.lanceGather=new T.Group();
  this.lanceCore=new T.Mesh(spark,light(0xfff3b8,.96));
  this.lanceGather.add(this.lanceCore);
  const moteMaterial=light(0xffcc65,.9);
  this.lanceMotes=Array.from({length:9},()=>{
   const mote=new T.Mesh(spark,moteMaterial);
   this.lanceGather.add(mote);return mote;
  });
  this.sigil.add(this.lanceGather);scene.add(this.sigil);
  this.clock=0;this.reset();
 }
 reset(){
  for(const b of this.bursts)if(b.ring)this.recycleRing(b.ring);
  this.bursts.length=0;this.streaks.count=0;this.sparks.count=0;this.sigil.visible=false;this.lanceGather.visible=false;
 }
 recycleRing(ring){ring.visible=false;this.freeRings.push(ring);}
 cast(kind,hand,direction,power,charge=0){
  this.sigil.visible=!!kind;
  this.lanceGather.visible=kind==='lance'&&charge>0;
  if(!kind)return;
  this.sigil.position.copy(hand).addScaledVector(direction,.22);
  this.sigil.quaternion.setFromUnitVectors(forward,direction);
  this.sigil.rotateZ(this.clock*(kind==='comet'?2.4:kind==='spray'?12:4));
  const base=kind==='comet'?.30:kind==='spray'?.16:.19;
  this.sigil.scale.setScalar(base*(.8+.65*power+.45*charge+.08*Math.sin(this.clock*20)));
  if(!this.lanceGather.visible)return;
  this.lanceCore.scale.setScalar(.22+.70*charge);
  this.lanceCore.rotation.y=this.clock*7;
  for(const [i,mote] of this.lanceMotes.entries()){
   const phase=(i/this.lanceMotes.length+this.clock*(1+charge))%1;
   const angle=i*2.4+this.clock*(2+charge*3);
   const radius=(.40+phase*2.5)*(1-.45*charge);
   mote.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,(phase-.5)*1.4);
   mote.rotation.z=angle;
   mote.scale.set(.19,.08,.14).multiplyScalar(Math.sin(Math.PI*phase));
  }
 }
 burst(kind,point,normal,impact){
  const style=styles[kind];
  let ring=null;
  if(kind!=='spray'){
   ring=this.freeRings.pop();
   if(!ring){ring=new T.Mesh(rim,light(0xffdb78));this.scene.add(ring);}
   ring.visible=true;ring.position.copy(point);
   ring.quaternion.setFromUnitVectors(forward,normal.clone().normalize());
   ring.scale.setScalar(.12);ring.material.opacity=.95;
  }
  this.bursts.push({style,point:new T.Vector3().copy(point),ring,age:0,
   radius:style.radius*(impact?1:.51),
   rays:Array.from({length:style.sparks},()=>new T.Vector3().randomDirection())});
 }
 update(dt,shots){
  this.clock+=dt;
  const dummy=this.dummy;
  let count=0;
  for(const shot of shots){
   let head=shot.mesh.position;
   for(const [index,node] of shot.trail.entries()){
    this.direction.subVectors(head,node);
    const length=this.direction.length();
    if(length>.001&&count<this.streaks.instanceMatrix.count){
     const fade=1-index/shot.trail.length;
     const width=(shot.kind==='lance'?.18:shot.kind==='comet'?.26:.075)*fade;
     dummy.position.copy(head).lerp(node,.5);
     dummy.quaternion.setFromUnitVectors(forward,this.direction.divideScalar(length));
     dummy.scale.set(width,width,length);
     dummy.updateMatrix();this.streaks.setMatrixAt(count,dummy.matrix);
     this.streaks.setColorAt(count++,this.tint.copy(white).lerp(amber,1-fade).multiplyScalar(fade));
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
   if(b.ring){b.ring.scale.setScalar(.12+reach);b.ring.material.opacity=.85*(1-t);}
   for(const ray of b.rays){
    if(count>=this.sparks.instanceMatrix.count)break;
    dummy.position.copy(b.point).addScaledVector(ray,reach*(.7+.22*ray.y));
    dummy.quaternion.setFromUnitVectors(forward,ray);
    const size=b.style.size*(1-t);
    dummy.scale.set(size,size,size*3.6);
    dummy.updateMatrix();this.sparks.setMatrixAt(count,dummy.matrix);
    this.sparks.setColorAt(count++,this.tint.copy(white).lerp(amber,t).multiplyScalar(1-t));
   }
  }
  this.sparks.count=count;this.sparks.instanceMatrix.needsUpdate=true;
  if(this.sparks.instanceColor)this.sparks.instanceColor.needsUpdate=true;
 }
}
