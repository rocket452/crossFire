import * as THREE from './vendor/three.module.js';
const UP=new THREE.Vector3(0,1,0);
// Four recent victims, fixed instance pools, ordinary depth testing: electricity
// follows damaged enemy hit shapes and cannot become a through-wall silhouette.
export class WeldElectrifyFX {
 constructor(scene){this.root=new THREE.Group();scene.add(this.root);this.targets=new Map();this.dummy=new THREE.Object3D();const geometry=new THREE.CylinderGeometry(1,1,1,5,1,true),mat=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});this.core=new THREE.InstancedMesh(geometry,mat('#dfffff',1),256);this.glow=new THREE.InstancedMesh(geometry,mat('#168fff',.32),256);for(const m of[this.core,this.glow]){m.frustumCulled=false;m.count=0;this.root.add(m);}}
 clear(){this.targets.clear();this.core.count=this.glow.count=0;}
 notify(unit,seconds){if(!unit?.alive)return;if(!this.targets.has(unit)&&this.targets.size>=4)this.targets.delete(this.targets.keys().next().value);this.targets.set(unit,{remaining:seconds,max:seconds});}
 update(dt,time){let n=0;const line=(a,b,width)=>{if(n>=256)return;const d=b.clone().sub(a),length=d.length();if(length<1e-6)return;this.dummy.position.copy(a).lerp(b,.5);this.dummy.quaternion.setFromUnitVectors(UP,d.multiplyScalar(1/length));for(const[m,r]of[[this.core,width],[this.glow,width*4]]){this.dummy.scale.set(r,length,r);this.dummy.updateMatrix();m.setMatrixAt(n,this.dummy.matrix);}n++;};
  for(const[u,s]of this.targets){s.remaining-=Math.max(0,dt);if(s.remaining<=0||!u.alive||!u.shapes?.length){this.targets.delete(u);continue;}const box=new THREE.Box3();for(const h of u.shapes){const q=new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().copy(h.rotation||{x:0,y:0,z:0,w:1})).elements,e=h.half,half=new THREE.Vector3(Math.abs(q[0])*e.x+Math.abs(q[4])*e.y+Math.abs(q[8])*e.z,Math.abs(q[1])*e.x+Math.abs(q[5])*e.y+Math.abs(q[9])*e.z,Math.abs(q[2])*e.x+Math.abs(q[6])*e.y+Math.abs(q[10])*e.z),c=new THREE.Vector3().copy(h.center);box.expandByPoint(c.clone().sub(half));box.expandByPoint(c.add(half));}const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).multiplyScalar(.5).addScalar(.12),fade=Math.min(1,s.remaining/.08),seed=Math.floor(time*24),width=.035*fade;
   for(let side=0;side<4;side++){let last=null;for(let i=0;i<=8;i++){const y=i/8,a=side*Math.PI/2+Math.sin(i*7+seed+side)*.2,p=center.clone().add(new THREE.Vector3(Math.cos(a)*size.x*(.9+.1*Math.sin(i*3+seed)),(y*2-1)*size.y,Math.sin(a)*size.z));if(last)line(last,p,width);last=p;}}
   for(let ring=0;ring<2;ring++){let last=null;const height=((time*1.8+ring*.5)%1*2-1)*size.y;for(let i=0;i<=14;i++){const a=i/14*Math.PI*2,p=center.clone().add(new THREE.Vector3(Math.cos(a)*size.x,height+Math.sin(i*9+seed)*size.y*.06,Math.sin(a)*size.z));if(last)line(last,p,width*.8);last=p;}}
  }this.core.count=this.glow.count=n;this.core.instanceMatrix.needsUpdate=this.glow.instanceMatrix.needsUpdate=true;
 }
 diagnostics(){return{targets:this.targets.size,segments:this.core.count,limit:256};}
}
