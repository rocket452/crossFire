import * as THREE from './vendor/three.module.js';
export const RIFT_CAST_SECONDS=.65;
export class RiftSpell {
 constructor(scene){
  this.root=new THREE.Group();this.root.name='Rift hand spell';scene.add(this.root);this.dummy=new THREE.Object3D();this.particles=[];this.previous=[null,null];
  const material=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  this.sparkMaterial=material('#baffb2',.85);this.sparkGeometry=new THREE.IcosahedronGeometry(1,0);this.pool=new THREE.InstancedMesh(this.sparkGeometry,this.sparkMaterial,96);this.pool.frustumCulled=false;this.root.add(this.pool);
  const size=32,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,r=Math.hypot((x-15.5)/16,(y-15.5)/16);data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*Math.max(0,1-r)**2);}this.texture=new THREE.DataTexture(data,size,size);this.texture.needsUpdate=true;
  this.hands=[-1,1].map(side=>{const group=new THREE.Group(),core=new THREE.Mesh(this.sparkGeometry,material('#efffbb')),halo=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,color:'#61ffba',transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})),ring=new THREE.Mesh(new THREE.TorusGeometry(.18,.012,4,24),material('#ffdc7b',.8));core.scale.setScalar(.085);halo.scale.setScalar(.85);group.add(core,halo,ring);this.root.add(group);return{group,core,halo,ring,side};});this.reset();
 }
 reset(){this.particles.length=0;this.previous=[null,null];this.pool.count=0;this.root.visible=false;for(const h of this.hands)h.group.visible=false;this.active=false;this.progress=0;}
 pose(root,character,progress){
  const p=THREE.MathUtils.clamp(progress,0,1),t=THREE.MathUtils.clamp((p-.12)/.76,0,1),a=t*Math.PI*2,blend=THREE.MathUtils.smoothstep(p,0,.12)*(1-THREE.MathUtils.smoothstep(p,.88,1));
  root.updateMatrixWorld(true);const left=character.world('B_L_UpperArm'),right=character.world('B_R_UpperArm'),up=new THREE.Vector3(0,1,0).transformDirection(root.matrixWorld),across=left.clone().sub(right);across.addScaledVector(up,-across.dot(up)).normalize();const forward=new THREE.Vector3().crossVectors(across,up).normalize();if(forward.dot(root.getWorldDirection(new THREE.Vector3()))<0)forward.negate();const center=left.clone().add(right).multiplyScalar(.5).addScaledVector(up,-.08).addScaledVector(forward,.38);for(const [side,sign]of[['L',1],['R',-1]]){const target=center.clone().addScaledVector(across,sign*(.34+.24*Math.cos(a))).addScaledVector(up,.24*Math.sin(a)).addScaledVector(forward,.03*Math.sin(a*2));character.arm(side,character.hand(side).lerp(target,blend));}
 }
 update(dt,time,{root,nodes,character,active,progress}){
  this.active=active;this.progress=progress;const strength=active?THREE.MathUtils.smoothstep(progress,0,.1)*(1-THREE.MathUtils.smoothstep(progress,.88,1)):0;
  root.updateMatrixWorld(true);
  for(let i=0;i<2;i++){const h=this.hands[i],key=i?'R':'L',proxy=i?'r':'l',position=character?character.hand(key):nodes['forearm_'+proxy].localToWorld(new THREE.Vector3(0,-.47,.05));h.group.visible=active&&strength>.001;h.group.position.copy(position);h.core.scale.setScalar((.08+.025*Math.sin(time*28)**2)*strength);h.halo.scale.setScalar((.75+.18*Math.sin(time*20)**2)*strength);h.ring.quaternion.copy(root.quaternion);h.ring.rotateZ(time*9*h.side);h.ring.scale.setScalar(strength);
   if(active&&strength>.01){const previous=this.previous[i],distance=previous?previous.distanceTo(position):0,count=previous&&distance<3?Math.min(8,Math.max(1,Math.ceil(distance/.035))):1;for(let j=0;j<count;j++){if(this.particles.length>=96)this.particles.shift();this.particles.push({p:previous&&distance<3?previous.clone().lerp(position,(j+1)/count):position.clone(),v:new THREE.Vector3(Math.sin(j*2.4+i)*.12,.1,Math.cos(j*2.4+i)*.12),life:.22,max:.22,size:.025+.015*strength});}this.previous[i]=position.clone();}else this.previous[i]=null;
  }
  let n=0;for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.p.addScaledVector(p.v,dt);this.dummy.position.copy(p.p);this.dummy.quaternion.identity();this.dummy.scale.setScalar(p.size*p.life/p.max);this.dummy.updateMatrix();this.pool.setMatrixAt(n++,this.dummy.matrix);}this.pool.count=n;this.pool.instanceMatrix.needsUpdate=true;this.root.visible=active||n>0;
 }
 diagnostics(){return{active:this.active,progress:this.progress,particles:this.pool.count,hands:this.hands.map(h=>({visible:h.group.visible,position:h.group.position.toArray()}))};}
}
