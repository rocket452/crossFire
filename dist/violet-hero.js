import * as THREE from './vendor/three.module.js';
import {RescuePolicy,interceptPoint} from './hero-defense.js?v=hero-5';

export class VioletHero {
 constructor(scene,gltf,spec,{getRobot,traceOrb,onOrbHit,onEvent=()=>{},buildings=[]}){
  Object.assign(this,{scene,spec,getRobot,traceOrb,onOrbHit,onEvent,buildings});this.policy=new RescuePolicy();
  this.root=new THREE.Group();this.root.name='Violet Sentinel';scene.add(this.root);this.nodes={};this.meshes={};gltf.scene.updateMatrixWorld(true);
  for(const p of spec.parts){const source=gltf.scene.getObjectByName(p.name);if(!source?.isMesh)throw Error('Missing hero mesh '+p.name);const pivot=new THREE.Vector3(...p.pivot),geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);geometry.translate(-pivot.x,-pivot.y,-pivot.z);const material=source.material.clone();if(['sigil','eyes'].includes(p.name)){material.emissive=new THREE.Color('#b84bff');material.emissiveIntensity=3;}const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;const node=new THREE.Group();node.add(mesh);const parent=p.parent?this.nodes[p.parent]:this.root,parentPivot=p.parent?new THREE.Vector3(...spec.parts.find(q=>q.name===p.parent).pivot):new THREE.Vector3();node.position.copy(pivot).sub(parentPivot);parent.add(node);this.nodes[p.name]=node;this.meshes[p.name]=mesh;}
  this.orbs=[];this.particles=[];this.vfx=new THREE.Group();scene.add(this.vfx);this.dummy=new THREE.Object3D();this.temp=new THREE.Vector3();this.goal=new THREE.Vector3();this.velocity=new THREE.Vector3();this.forward=new THREE.Vector3();this.zAxis=new THREE.Vector3(0,0,1);
  this.coreMat=new THREE.MeshBasicMaterial({color:'#f5dcff',toneMapped:false});this.forceMat=new THREE.MeshBasicMaterial({color:'#ad40ff',transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});this.ico=new THREE.IcosahedronGeometry(1,1);
  const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x-32)/32,(y-32)/32),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*Math.pow(Math.max(0,1-r),2));}const texture=new THREE.DataTexture(data,size,size);texture.needsUpdate=true;this.glowMat=new THREE.SpriteMaterial({map:texture,color:'#ac35ff',transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  this.chargeOrb=this.makeOrb();this.vfx.add(this.chargeOrb);this.aura=new THREE.Sprite(this.glowMat.clone());this.aura.material.opacity=.22;this.aura.scale.setScalar(4.8);this.vfx.add(this.aura);
  this.sparkPool=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),this.forceMat,180);this.sparkPool.frustumCulled=false;this.sparkPool.count=0;this.vfx.add(this.sparkPool);
  this.shield=new THREE.Group();this.vfx.add(this.shield);this.shieldMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,uniforms:{time:{value:0},stress:{value:0},impact:{value:new THREE.Vector2()},hit:{value:0}},vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 p;uniform float time;uniform float stress;uniform vec2 impact;uniform float hit;void main(){float r=length(p)/5.8;vec2 s=vec2(1.732,1.0);vec2 a=mod(p*1.3,s)-s*.5;vec2 b=mod(p*1.3-s*.5,s)-s*.5;vec2 g=dot(a,a)<dot(b,b)?a:b;float edge=max(abs(g.x)*.866+abs(g.y)*.5,abs(g.y));float grid=smoothstep(.42,.49,edge);float rim=pow(smoothstep(.70,1.0,r),2.0);float d=length(p-impact);float ripple=pow(.5+.5*sin(d*9.0-time*13.0),8.0)*exp(-d*.4)*hit;vec3 color=mix(vec3(.30,.035,.70),vec3(.95,.45,1.0),clamp(grid*.65+rim+ripple+stress*.15,0.0,1.0));gl_FragColor=vec4(color,.15+grid*.22+rim*.50+ripple*.25+stress*.06);}`});this.shieldMesh=new THREE.Mesh(new THREE.CircleGeometry(5.8,64),this.shieldMaterial);this.shield.add(this.shieldMesh);
  for(const r of [5.3,5.8]){const rim=new THREE.Mesh(new THREE.TorusGeometry(r,.07,5,64),this.forceMat);rim.position.z=.015;this.shield.add(rim);}
  this.contact=new THREE.Sprite(this.glowMat);this.contact.scale.setScalar(6.5);this.vfx.add(this.contact);this.light=new THREE.PointLight('#ac4cff',0,18,2);this.vfx.add(this.light);
  this.reset();
 }
 makeOrb(){const group=new THREE.Group(),body=new THREE.Mesh(this.ico,this.forceMat),core=new THREE.Mesh(this.ico,this.coreMat),halo=new THREE.Sprite(this.glowMat);body.scale.setScalar(.70);core.scale.setScalar(.25);halo.scale.setScalar(4.8);group.add(body,core,halo);return group;}
 reset(){for(const o of this.orbs)this.vfx.remove(o.mesh);this.orbs=[];this.particles=[];this.root.position.set(-12,30,4);this.root.rotation.set(0,0,0);for(const n of Object.values(this.nodes))n.rotation.set(0,0,0);this.velocity.set(0,0,0);this.policy.reset();this.threat=null;this.mode='patrol';this.shieldEnergy=3000;this.shieldDeploy=0;this.shieldNormal=new THREE.Vector3(0,0,1);this.shield.visible=false;this.contact.visible=false;this.chargeOrb.visible=false;this.attackCooldown=.6;this.chargeTime=0;this.charging=false;this.shots=0;this.robotHits=0;this.buildingHits=0;this.damage=0;this.blockedDamage=0;this.blocks=0;this.shieldBreaks=0;this.hitGlow=0;this.trailTimer=0;this.lastAttackBlocked=null;this.rescues=0;this.sparkPool.count=0;this.light.intensity=0;this.aura.position.copy(this.root.position).add(new THREE.Vector3(0,1.5,0));this.root.updateMatrixWorld(true);}
 receiveThreat(payload){
  if(!payload||!['charging','firing'].includes(payload.state.phase)||payload.targetUnit?.kind!=='helicopter'||!payload.targetUnit.alive){this.threat=null;return;}
  if(!this.policy.decide(payload.attackId,'helicopter')){this.threat=null;return;}
  this.threat={from:payload.from.clone(),direction:payload.direction.clone(),target:{...payload.aimTarget},unit:payload.targetUnit,attackId:payload.attackId};
 }
 safeGoal(p){for(const b of this.buildings)if(Math.abs(p.x-b.x)<6.2&&Math.abs(p.z-b.z)<6.2)p.y=Math.max(p.y,b.floors*3+1.4);p.y=Math.max(7,p.y);return p;}
 update(dt,time){
  const robot=this.getRobot(),alive=!!robot?.combatUnit?.alive;this.hitGlow=Math.max(0,this.hitGlow-dt*2.3);
  const previous=this.root.position.clone();
  if(this.threat&&alive&&this.shieldEnergy>0){
   const goal=interceptPoint(this.threat.from,this.threat.direction,this.threat.target);this.goal.set(goal.x,goal.y,goal.z);this.safeGoal(this.goal);
   this.mode=this.root.position.distanceTo(this.goal)<2.2?'blocking':'intercepting';
   this.charging=false;this.chargeTime=0;this.attackCooldown=1.1;
  }else{
   if(this.mode==='blocking'||this.mode==='intercepting')this.mode='patrol';
   const a=time*.10+2.8;this.goal.set(Math.cos(a)*18,31+Math.sin(time*.55)*1.5,Math.sin(a)*18);this.safeGoal(this.goal);
   this.shieldEnergy=Math.min(3000,this.shieldEnergy+250*dt);
  }
  const destination=this.goal.clone();if(this.mode==='intercepting'&&this.root.position.distanceTo(this.goal)>10)destination.y=Math.max(destination.y,29);
  const distance=destination.distanceTo(this.root.position),speed=this.mode==='intercepting'?48:this.mode==='blocking'?22:12;
  if(distance>.0001)this.root.position.addScaledVector(destination.sub(this.root.position).divideScalar(distance),Math.min(distance,speed*dt));
  this.velocity.copy(this.root.position).sub(previous).divideScalar(dt||1);
  const facing=this.threat?this.threat.from:robot?robot.root.position.clone().add(new THREE.Vector3(0,14,0)):new THREE.Vector3();
  const yaw=Math.atan2(facing.x-this.root.position.x,facing.z-this.root.position.z);this.root.rotation.set(this.mode==='patrol'?.10:0,yaw,Math.max(-.12,Math.min(.12,-this.velocity.x*.004)),'YXZ');
  const deployTarget=this.mode==='blocking'?1:0;this.shieldDeploy=THREE.MathUtils.damp(this.shieldDeploy,deployTarget,deployTarget?10:14,dt);this.shield.visible=this.shieldDeploy>.015;
  this.pose(time);this.nodes.head.rotation.x=THREE.MathUtils.clamp(-Math.atan2(facing.y-this.root.position.y-2.3,Math.hypot(facing.x-this.root.position.x,facing.z-this.root.position.z)),-.6,.8);
  this.root.updateMatrixWorld(true);
  const center=this.root.position.clone().add(new THREE.Vector3(0,1.5,0));this.aura.position.copy(center);
  if(this.shield.visible&&this.threat){
   this.shieldNormal.copy(this.threat.from).sub(center).normalize();this.shield.position.copy(center).addScaledVector(this.shieldNormal,1.7);this.shield.quaternion.setFromUnitVectors(this.zAxis,this.shieldNormal);this.shield.scale.setScalar(this.shieldDeploy);this.shield.updateMatrixWorld(true);
  }
  this.shieldMaterial.uniforms.time.value=time;this.shieldMaterial.uniforms.stress.value=1-this.shieldEnergy/3000;this.shieldMaterial.uniforms.hit.value=this.hitGlow;this.contact.visible=this.hitGlow>0&&this.shield.visible;
  if(this.mode==='patrol'&&alive){
   this.attackCooldown-=dt;
   if(!this.charging&&this.attackCooldown<=0){this.charging=true;this.chargeTime=0;}
   if(this.charging){this.mode='charging';this.chargeTime+=dt;}
  }else if(this.mode==='charging'&&alive){this.chargeTime+=dt;}
  if(this.charging&&alive){
   const l=this.nodes.forearm_l.localToWorld(new THREE.Vector3(0,-.47,.05)),r=this.nodes.forearm_r.localToWorld(new THREE.Vector3(0,-.47,.05)),hand=l.add(r).multiplyScalar(.5);this.forward.set(Math.sin(yaw),0,Math.cos(yaw));hand.addScaledVector(this.forward,.30);
   this.chargeOrb.visible=true;this.chargeOrb.position.copy(hand);this.chargeOrb.scale.setScalar(.2+Math.min(1,this.chargeTime/1.6)*1.15);this.chargeOrb.rotation.set(time*2,time*3,0);
   if(this.chargeTime>=1.6){this.launch(hand,robot.aimPoint(hand));this.charging=false;this.chargeTime=0;this.mode='patrol';this.attackCooldown=3.2;}
  }else this.chargeOrb.visible=false;
  if(!alive){this.charging=false;this.mode='patrol';this.chargeOrb.visible=false;this.threat=null;}
  this.advanceOrbs(dt,time,alive);
  this.trailTimer-=dt;if(this.trailTimer<=0){this.emit(center,2,.5);this.trailTimer=.07;}
  this.renderParticles(dt);
  this.light.position.copy(this.shield.visible?this.shield.position: this.chargeOrb.visible?this.chargeOrb.position:center);this.light.intensity=this.shield.visible?25+this.hitGlow*65:this.charging?15+this.chargeTime*15:5;
 }
 pose(time){
  const raised=this.mode==='blocking'||this.charging;
  for(const [side,sign]of [['l',-1],['r',1]]){
   this.nodes['upperarm_'+side].rotation.set(raised?-1.35:-.22,0,raised?-sign*.32:-sign*.14);
   this.nodes['forearm_'+side].rotation.x=raised?-.15:-.32;
   this.nodes['thigh_'+side].rotation.x=.10+Math.sin(time*2+sign)*.06;
   this.nodes['shin_'+side].rotation.x=.24+Math.sin(time*2+sign)*.05;
  }
  this.nodes.chest.rotation.x=this.mode==='blocking'?-.06:.02;
  this.nodes.cape_top.rotation.x=.20+Math.sin(time*3.5)*.12;this.nodes.cape_mid.rotation.x=.18+Math.sin(time*3.5-.7)*.18;this.nodes.cape_tail.rotation.x=.10+Math.sin(time*3.5-1.4)*.23;
  this.nodes.cape_tail.rotation.z=Math.sin(time*2)*.10;
 }
 launch(from,target){const mesh=this.makeOrb();mesh.position.copy(from);this.vfx.add(mesh);this.orbs.push({mesh,direction:target.clone().sub(from).normalize(),life:5,trail:0});this.shots++;}
 advanceOrbs(dt,time,alive){
  for(let i=this.orbs.length-1;i>=0;i--){const o=this.orbs[i];o.life-=dt;if(!alive)o.life=0;
   const robot=this.getRobot();if(alive){const desired=robot.aimPoint(o.mesh.position).sub(o.mesh.position).normalize();o.direction.lerp(desired,1-Math.exp(-2*dt)).normalize();}
   const end=o.mesh.position.clone().addScaledVector(o.direction,42*dt),hit=alive?this.traceOrb(o.mesh.position,end):null;
   if(hit){const point=new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z);o.mesh.position.copy(point);const amount=this.onOrbHit(hit,point)||0;this.damage+=amount;if(hit.unit?.kind==='robot')this.robotHits++;if(hit.kind==='building')this.buildingHits++;this.emit(point,32,3.8);o.life=0;}
   else o.mesh.position.copy(end);
   o.mesh.rotation.set(time*4,time*3,0);o.trail-=dt;if(o.trail<=0){this.emit(o.mesh.position,3,.55);o.trail=.04;}
   if(o.life<=0){this.vfx.remove(o.mesh);this.orbs.splice(i,1);}
  }
 }
 emit(point,count,spread=1){for(let i=0;i<count;i++){if(this.particles.length>=180)this.particles.shift();const a=i*2.399+this.shots;this.particles.push({p:point.clone(),v:new THREE.Vector3(Math.cos(a)*spread,(Math.sin(a*1.7)*.7+.25)*spread,Math.sin(a)*spread),life:.3+(i%7)*.055,max:.65,size:.045+(i%4)*.035});}}
 renderParticles(dt){let count=0;for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}p.p.addScaledVector(p.v,dt);this.dummy.position.copy(p.p);this.dummy.scale.setScalar(p.size*p.life/p.max);this.dummy.updateMatrix();this.sparkPool.setMatrixAt(count++,this.dummy.matrix);}this.sparkPool.count=count;this.sparkPool.instanceMatrix.needsUpdate=true;}
 barriers(){if(this.mode!=='blocking'||!this.shield.visible||this.shieldEnergy<=0||this.shieldDeploy<.2)return[];return[{id:'violet-barrier',active:true,center:this.shield.position,normal:this.shieldNormal,radius:5.8*this.shieldDeploy,strength:this.shieldEnergy,onHit:(point,power)=>this.absorb(point,power)}];}
 absorb(point,power){this.shieldEnergy=Math.max(0,this.shieldEnergy-power);this.blockedDamage+=power;this.blocks++;this.hitGlow=1;const p=new THREE.Vector3(point.x,point.y,point.z);this.contact.position.copy(p).addScaledVector(this.shieldNormal,.04);const local=this.shield.worldToLocal(p.clone());this.shieldMaterial.uniforms.impact.value.set(local.x,local.y);this.emit(p,5,1.6);
  if(this.lastAttackBlocked!==this.threat?.attackId){this.lastAttackBlocked=this.threat?.attackId;this.rescues++;this.onEvent('Violet Sentinel intercepting the beam.');}
  if(this.shieldEnergy===0){this.shieldBreaks++;this.threat=null;this.mode='patrol';this.emit(p,45,6);this.onEvent('Violet barrier overloaded.');}
 }
 diagnostics(){return{name:'Violet Sentinel',mode:this.mode,position:this.root.position.toArray(),triangles:this.spec.triangles,parts:this.spec.parts.length,charging:this.charging,chargeSeconds:this.chargeTime,shots:this.shots,orbs:this.orbs.length,robotHits:this.robotHits,buildingHits:this.buildingHits,damage:this.damage,responses:this.policy.responses,opportunities:this.policy.opportunities,rescues:this.rescues,blocks:this.blocks,blockedDamage:this.blockedDamage,shieldBreaks:this.shieldBreaks,shieldVisible:this.shield.visible,shieldCenter:this.shield.position.toArray(),shieldNormal:this.shieldNormal.toArray(),shieldRadius:5.8*this.shieldDeploy,shieldEnergy:this.shieldEnergy,defending:this.threat?.unit?.id||null};}
}
