import * as THREE from './vendor/three.module.js';
// Presentation only: a curved electric front and bounded conversion/reform pulses.
export class RunnerWave {
 constructor(parent){this.root=new THREE.Group();parent.add(this.root);const mat=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});this.front=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),mat('#38cfff',.12));this.rings=new THREE.InstancedMesh(new THREE.TorusGeometry(1,.04,4,32),mat('#b7faff',.75),32);this.rings.frustumCulled=false;this.root.add(this.front,this.rings);this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.clear();}
 clear(){this.pulses=[];this.front.visible=false;this.rings.count=0;this.count=0;}
 update(dt,time,{position,normal,direction,active=false,carried=0,events=[]}){
  for(let i=this.pulses.length-1;i>=0;i--){this.pulses[i].age+=dt;if(this.pulses[i].age>=.3)this.pulses.splice(i,1);}for(const e of events){if(this.pulses.length>=32)this.pulses.shift();this.pulses.push({...e,position:new THREE.Vector3(e.position.x,e.position.y,e.position.z),age:0});}
  const segments=[],up=normal.clone().normalize(),forward=new THREE.Vector3(direction?.x||0,0,direction?.z??1).addScaledVector(up,-new THREE.Vector3(direction?.x||0,0,direction?.z??1).dot(up)).normalize(),right=new THREE.Vector3().crossVectors(up,forward).normalize();this.front.visible=active;
  if(active){const width=2.4+Math.min(.55,carried*.045),basis=new THREE.Matrix4().makeBasis(right,up,forward);this.front.position.copy(position).addScaledVector(up,1.15);this.front.quaternion.setFromRotationMatrix(basis);this.front.scale.set(width,1.1,.48);this.front.material.opacity=.10+.03*Math.sin(time*33)**2;
   for(let row=0;row<5;row++){let previous=null;for(let j=0;j<=14;j++){const angle=-Math.PI/2+j/14*Math.PI,p=position.clone().addScaledVector(right,Math.sin(angle)*width).addScaledVector(forward,Math.cos(angle)*.6).addScaledVector(up,.2+row*.45+Math.sin(j*3+time*43+row)*.10);if(previous)segments.push({a:previous,b:p,width:row===2?.065:.038,fade:1});previous=p;}}
   for(let j=-2;j<=2;j++){let previous=null;for(let k=0;k<=7;k++){const p=position.clone().addScaledVector(right,j*.8+Math.sin(k*3+time*39+j)*.11).addScaledVector(up,.1+k*.31).addScaledVector(forward,.35);if(previous)segments.push({a:previous,b:p,width:.026,fade:.8});previous=p;}}
  }
  let n=0;for(const p of this.pulses){const t=p.age/.3,fade=1-t;this.dummy.position.copy(p.position).y+=.12;this.dummy.rotation.set(-Math.PI/2,0,time*2);const r=p.size*(.35+t*1.1);this.dummy.scale.set(r,r,fade);this.dummy.updateMatrix();this.rings.setMatrixAt(n,this.dummy.matrix);this.color.setRGB(fade*fade,fade*fade,fade*fade);this.rings.setColorAt(n++,this.color);for(let j=0;j<4;j++){const angle=j*Math.PI/2+time*9,a=p.position.clone().add(new THREE.Vector3(Math.cos(angle)*r,.15,Math.sin(angle)*r)),b=p.position.clone().add(new THREE.Vector3(Math.cos(angle+1)*r*.4,1.9*fade,Math.sin(angle+1)*r*.4));segments.push({a,b,width:.035*fade,fade});}}
  this.rings.count=n;this.rings.instanceMatrix.needsUpdate=true;if(this.rings.instanceColor)this.rings.instanceColor.needsUpdate=true;this.count=segments.length;return segments;
 }
 diagnostics(){return{active:this.front.visible,pulses:this.pulses.length,segments:this.count,limit:32};}
}
