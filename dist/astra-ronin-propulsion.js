import * as THREE from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),Y=V(0,1,0);
export const RONIN_PROPULSION=Object.freeze({particles:64,emitPerSecond:28,particleLife:.32,backLength:5.8,footLength:4.4,backWidth:.44,footWidth:.32});
// Four actual rig mounts, three instanced flame layers and one bounded exhaust pool.
export class RoninPropulsion{
 constructor(model){this.model=model;this.root=new THREE.Group();this.root.name='Ronin rocket propulsion';model.root.add(this.root);this.dummy=new THREE.Object3D();this.engines=[];this.particles=[];this.sequence=0;
  const cone=new THREE.ConeGeometry(1,1,8,1,true);cone.translate(0,.5,0);
  this.layers=[['#2e9eff',.32],['#66eaff',.65],['#f0fcff',.95]].map(([color,opacity])=>{const mesh=new THREE.InstancedMesh(cone,new THREE.MeshBasicMaterial({color,opacity,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),4);mesh.name='Ronin rocket flame';mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(mesh);return mesh;});
  this.sparks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),RONIN_PROPULSION.particles);this.sparks.name='Ronin exhaust sparks';this.sparks.frustumCulled=false;this.sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(this.sparks);this.cyan=new THREE.Color('#72e7ff');this.hot=new THREE.Color('#edfaff');this.color=new THREE.Color();
  for(const side of['left','right']){this.engines.push({kind:'back',node:model.parts[side+'-thruster'],offset:V(0,-.7,-.7),clock:0});this.engines.push({kind:'foot',node:model.parts[side+'-foot'],offset:V(0,-.37,.22),clock:0});}
  this.clear();
 }
 clear(){this.particles.length=0;for(const mesh of[...this.layers,this.sparks]){mesh.count=0;mesh.visible=false;}for(const e of this.engines)e.clock=0;this.lastActive=0;}
 update(dt,time,actor){const flight=actor.flight,dash=actor.dashAttack&&actor.dashStage==='dash',active=!actor.dead&&(!!flight||dash),root=this.model.root,c=RONIN_PROPULSION,frame=root.getWorldQuaternion(new THREE.Quaternion());let count=0;
  if(actor.dead){this.clear();return;}root.updateWorldMatrix(true,true);
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.age+=dt;if(p.age>=c.particleLife){this.particles.splice(i,1);continue;}p.position.addScaledVector(p.velocity,dt);}
  for(const [i,e]of this.engines.entries()){
   if(!active||e.kind==='foot'&&!flight){e.clock=0;continue;}
   const cruising=flight?.phase==='cruise',boost=flight?.phase==='takeoff'?1.25:cruising?1.05+.25*Math.min(1,flight.speed/38):flight?.phase==='landing'?.72:.9;
   const hover=actor.stunRemaining>0?.65:1,flicker=1+Math.sin(time*43+i*2.4)*.09+Math.sin(time*71+i)*.035,power=boost*hover;
   const position=e.node.localToWorld(e.offset.clone()),direction=e.kind==='foot'?V(0,-1,cruising?-.2:0).normalize().applyQuaternion(e.node.getWorldQuaternion(new THREE.Quaternion())):V(0,cruising||dash?-.35:-1,cruising||dash?-1:-.2).normalize().applyQuaternion(frame);
   const length=(e.kind==='foot'?c.footLength:c.backLength)*power*flicker,width=(e.kind==='foot'?c.footWidth:c.backWidth)*(1+.12*Math.sin(time*31+i));
   const local=root.worldToLocal(position.clone()),localDirection=direction.clone().applyQuaternion(frame.clone().invert());
   for(const [j,mesh]of this.layers.entries()){const lengthScale=[1,.8,.45][j],widthScale=[1.65,1,.44][j];this.dummy.position.copy(local);this.dummy.quaternion.setFromUnitVectors(Y,localDirection);this.dummy.scale.set(width*widthScale/root.scale.x,length*lengthScale/root.scale.y,width*widthScale/root.scale.z);this.dummy.updateMatrix();mesh.setMatrixAt(count,this.dummy.matrix);}
   count++;e.position=position;e.direction=direction;e.length=length;
   e.clock+=Math.min(dt,.1)*c.emitPerSecond;while(e.clock>=1){e.clock--;if(this.particles.length>=c.particles){e.clock=Math.min(e.clock,.99);break;}const seed=++this.sequence,a=seed*2.399,r=.08+.12*(.5+.5*Math.sin(seed*7));const spread=V(Math.cos(a)*r,Math.sin(a)*r,Math.cos(a*.7)*r);this.particles.push({position:position.clone().addScaledVector(direction,length*(.45+.4*(.5+.5*Math.sin(seed*3)))).add(spread),velocity:direction.clone().multiplyScalar(8+power*6).addScaledVector(spread,5),age:0,size:.08+.1*(.5+.5*Math.cos(seed*5))});}
  }
  for(const mesh of this.layers){mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;}this.lastActive=count;
  for(const [i,p]of this.particles.entries()){const t=p.age/c.particleLife;this.dummy.position.copy(root.worldToLocal(p.position.clone()));this.dummy.quaternion.identity();this.dummy.scale.setScalar(p.size*(1-t)/root.scale.x);this.dummy.updateMatrix();this.sparks.setMatrixAt(i,this.dummy.matrix);this.color.copy(this.hot).lerp(this.cyan,t);this.sparks.setColorAt(i,this.color);}
  this.sparks.count=this.particles.length;this.sparks.visible=this.sparks.count>0;this.sparks.instanceMatrix.needsUpdate=true;if(this.sparks.instanceColor)this.sparks.instanceColor.needsUpdate=true;
 }
 diagnostics(){return{engines:this.lastActive,back:this.lastActive?2:0,feet:this.lastActive===4?2:0,particles:this.particles.length,particleCap:RONIN_PROPULSION.particles};}
}
