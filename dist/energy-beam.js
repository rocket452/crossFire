import * as THREE from './vendor/three.module.js';
import {BeamTelegraph} from './beam-telegraph.js?v=runner-6';

// Layered geometry and soft additive halos create bloom without a full-screen post pass.
export class EnergyBeamEffect {
 constructor(scene){
  this.telegraph=new BeamTelegraph(scene);this.root=new THREE.Group();scene.add(this.root);this.root.visible=false;this.phase='off';this.time=0;
  this.up=new THREE.Vector3(0,1,0);this.dir=new THREE.Vector3();this.side=new THREE.Vector3();this.cross=new THREE.Vector3();this.point=new THREE.Vector3();this.dummy=new THREE.Object3D();
  const additive=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  this.white=additive('#eeffff');this.blue=additive('#37cfff',.65);this.violet=additive('#8968ff',.32);
  const tube=new THREE.CylinderGeometry(1,1,1,16,1,true);
  this.tubes=new THREE.Group();this.root.add(this.tubes);this.layers=[];
  for(const [radius,color,opacity]of [[3.3,'#5140ff',.12],[2.15,'#187eff',.26],[1.1,'#30cfff',.8],[.38,'#efffff',1]]){
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false,uniforms:{color:{value:new THREE.Color(color)},opacity:{value:opacity},time:{value:0}},vertexShader:`varying vec2 uvBeam;varying vec3 worldPos;varying vec3 worldNormal;void main(){uvBeam=uv;vec4 p=modelMatrix*vec4(position,1.0);worldPos=p.xyz;worldNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`uniform vec3 color;uniform float opacity;uniform float time;varying vec2 uvBeam;varying vec3 worldPos;varying vec3 worldNormal;void main(){float facing=pow(abs(dot(normalize(worldNormal),normalize(cameraPosition-worldPos))),.65);float flow=.78+.22*sin(uvBeam.y*180.0-time*28.0+sin(uvBeam.x*30.0)*2.0);float ends=smoothstep(0.0,.018,uvBeam.y)*(1.0-smoothstep(.98,1.0,uvBeam.y));gl_FragColor=vec4(color,opacity*facing*flow*ends);}`});
   const mesh=new THREE.Mesh(tube,material);mesh.frustumCulled=false;mesh.userData.radius=radius;this.tubes.add(mesh);this.layers.push(mesh);
  }
  const ico=new THREE.IcosahedronGeometry(1,2);
  this.orb=new THREE.Mesh(ico,this.blue);this.core=new THREE.Mesh(ico,this.white);this.impact=new THREE.Mesh(ico,this.blue);this.impactCore=new THREE.Mesh(ico,this.white);
  this.root.add(this.orb,this.core,this.impact,this.impactCore);
  const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const d=Math.hypot((x-size/2)/(size/2),(y-size/2)/(size/2)),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*Math.pow(Math.max(0,1-d),2.3));}
  const glow=new THREE.DataTexture(data,size,size);glow.needsUpdate=true;
  const sprite=color=>{const o=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));this.root.add(o);return o;};
  this.muzzleGlow=sprite('#3c9fff');this.hitGlow=sprite('#1ba7ff');
  this.rings=[];const ringGeo=new THREE.TorusGeometry(1,.045,5,40);
  for(let i=0;i<9;i++){const o=new THREE.Mesh(ringGeo,i%2?this.blue:this.violet);o.frustumCulled=false;this.root.add(o);this.rings.push(o);}
  this.motes=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),this.white,56);this.motes.frustumCulled=false;this.root.add(this.motes);
  this.arcArray=new Float32Array(600*3);const arcGeometry=new THREE.BufferGeometry();arcGeometry.setAttribute('position',new THREE.BufferAttribute(this.arcArray,3));this.arcs=new THREE.LineSegments(arcGeometry,new THREE.LineBasicMaterial({color:'#9deaff',transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));this.arcs.frustumCulled=false;this.root.add(this.arcs);
  this.muzzleLight=new THREE.PointLight('#4faaff',0,20,2);this.impactLight=new THREE.PointLight('#46baff',0,25,2);this.root.add(this.muzzleLight,this.impactLight);this.clear();
 }
 clear(){this.telegraph.clear();this.root.visible=false;this.phase='off';this.muzzleLight.intensity=this.impactLight.intensity=0;this.arcs.geometry.setDrawRange(0,0);}
 update(state,from,direction,end,time,plan=null){
  if(!state||!['charging','firing'].includes(state.phase)){this.clear();return;}
  if(state.phase==='charging')this.telegraph.update(plan,state.charge,time);else this.telegraph.clear();
  this.root.visible=true;this.phase=state.phase;this.time=time;this.dir.copy(direction).normalize();
  this.side.crossVectors(this.dir,Math.abs(this.dir.y)>.9?new THREE.Vector3(1,0,0):this.up).normalize();this.cross.crossVectors(this.side,this.dir).normalize();
  const firing=state.phase==='firing',charge=state.charge,pulse=1+.05*Math.sin(time*31);
  this.orb.position.copy(from);this.orb.scale.setScalar((firing?1.25:.2+1.25*charge)*pulse);this.orb.rotation.set(time*1.4,time*2,0);
  this.core.position.copy(from);this.core.scale.setScalar(firing?.55:.08+.52*charge);
  this.muzzleGlow.position.copy(from);this.muzzleGlow.scale.setScalar(firing?12:2+charge*9);
  this.muzzleLight.position.copy(from);this.muzzleLight.intensity=firing?95:charge*charge*60;
  this.motes.count=56;
  for(let i=0;i<56;i++){
   const p=(i/56+time*(firing?.7:.45))%1,a=i*2.399+time*2.5,r=(firing?.65:4.8*(1-charge*.3))*(1-p),along=(1-p)*(firing?2.2:4);
   this.point.copy(from).addScaledVector(this.side,Math.cos(a)*r).addScaledVector(this.cross,Math.sin(a)*r).addScaledVector(this.dir,along);
   this.dummy.position.copy(this.point);this.dummy.scale.setScalar(.035+.075*p*(firing?1:charge));this.dummy.updateMatrix();this.motes.setMatrixAt(i,this.dummy.matrix);
  }this.motes.instanceMatrix.needsUpdate=true;
  this.tubes.visible=this.impact.visible=this.impactCore.visible=this.hitGlow.visible=firing;
  const length=firing?from.distanceTo(end):0;
  if(firing){
   this.tubes.position.copy(from).addScaledVector(this.dir,length/2);this.tubes.quaternion.setFromUnitVectors(this.up,this.dir);
   for(const mesh of this.layers){const r=mesh.userData.radius*pulse;mesh.scale.set(r,length,r);mesh.material.uniforms.time.value=time;}
   this.impact.position.copy(end);this.impact.scale.setScalar(2.0*pulse);this.impact.rotation.set(time*2,0,time*3);
   this.impactCore.position.copy(end);this.impactCore.scale.setScalar(.95*pulse);
   this.hitGlow.position.copy(end);this.hitGlow.scale.setScalar(15*pulse);this.impactLight.position.copy(end);this.impactLight.intensity=140;
  }else this.impactLight.intensity=0;
  for(let i=0;i<this.rings.length;i++){
   const ring=this.rings[i];ring.visible=firing||i<3;
   if(firing){const t=(time*.4+i/9)%1;ring.position.copy(from).addScaledVector(this.dir,t*length);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),this.dir);ring.scale.setScalar(.9+Math.sin(t*Math.PI)*.5);}
   else{ring.position.copy(from).addScaledVector(this.dir,.2+i*.45);ring.rotation.set(Math.PI/2+Math.sin(time+i)*.35,time*(i%2?1:-1),time*.6+i);ring.scale.setScalar(1.3+(1-charge)*2+i*.25);}
  }
  let count=0;
  const write=(p)=>{p.toArray(this.arcArray,count*3);count++;};
  for(let branch=0;branch<(firing?3:5);branch++){
   const segments=firing?24:9;let previous=null;
   for(let j=0;j<=segments;j++){
    const u=j/segments,a=u*18+branch*2.1+time*8,r=firing?1.05+Math.sin(u*43+time*17)*.18:(1-u)*(2.8+Math.sin(time*3+branch)*.3);
    const p=this.point.copy(from).addScaledVector(this.dir,firing?u*length:(1-u)*1.4).addScaledVector(this.side,Math.cos(a)*r).addScaledVector(this.cross,Math.sin(a)*r);
    if(previous){write(previous);write(p);}previous=p.clone();
   }
  }
  this.arcs.geometry.attributes.position.needsUpdate=true;this.arcs.geometry.setDrawRange(0,count);
 }
 diagnostics(){return{phase:this.phase,visible:this.root.visible,beamVisible:this.tubes.visible&&this.root.visible,lights:this.muzzleLight.intensity>0?2:0,telegraph:this.telegraph.diagnostics()};}
}
