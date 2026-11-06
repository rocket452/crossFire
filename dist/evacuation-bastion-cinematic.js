import * as THREE from './vendor/three.module.js';
import {RaiderEnergyEffects} from './raider-energy-effects.js?v=raider-energy-86';
const UP=new THREE.Vector3(0,1,0),FORWARD=new THREE.Vector3(0,0,1);
const smooth=(a,b,t)=>THREE.MathUtils.smoothstep(t,a,b);

// Presentation-only sequence. Gameplay simulation is suspended by battle.js while active.
export class EvacuationBastionCinematic {
 constructor({scene,camera,controls,viewport,transport,violet,rift,getPlayer,clearInput,isSelected,onComplete=()=>{}}){
  Object.assign(this,{scene,camera,controls,transport,violet,rift,getPlayer,clearInput,isSelected,onComplete});this.config=transport.config.cinematic;this.active=false;this.played=false;this.elapsed=0;this.guests=[];
  this.group=new THREE.Group();this.group.name='Bastion rescue cinematic';scene.add(this.group);
  this.shield=violet.shield.clone(true);this.shield.traverse(n=>{if(n.isMesh)n.material=n.material.clone();});this.shieldMaterial=this.shield.children[0].material;this.group.add(this.shield);
  this.effects=new RaiderEnergyEffects(this.group);this.geometry=new THREE.IcosahedronGeometry(1,1);this.material=new THREE.MeshBasicMaterial({color:'#caffed',toneMapped:false});this.bolts=[];
  this.portal=new THREE.Group();this.group.add(this.portal);const portalMat=new THREE.MeshBasicMaterial({color:'#9dffbf',transparent:true,opacity:.9,depthWrite:false,toneMapped:false});
  for(const radius of[1.8,2.1])this.portal.add(new THREE.Mesh(new THREE.TorusGeometry(radius,.08,5,64),portalMat));
  this.portalDisc=new THREE.Mesh(new THREE.CircleGeometry(1.8,48),new THREE.MeshBasicMaterial({color:'#165b56',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));this.portal.add(this.portalDisc);
  this.portalSparks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.055,0),portalMat,48);this.portalSparks.frustumCulled=false;this.portal.add(this.portalSparks);this.dummy=new THREE.Object3D();
  this.dialog=document.createElement('dialog');this.dialog.className='evac-cinematic';this.dialog.setAttribute('aria-label','Bastion arrival cinematic');this.dialog.innerHTML='<div class="cinematic-top"><span>BASTION // REINFORCEMENTS</span><button type="button" data-skip aria-label="Skip cinematic and resume playing">Skip ›</button></div><div class="cinematic-caption" role="status" aria-live="polite"><b></b><p></p></div>';viewport.append(this.dialog);this.speaker=this.dialog.querySelector('b');this.line=this.dialog.querySelector('p');this.dialog.querySelector('[data-skip]').onclick=()=>this.finish();this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.finish();});
  window.addEventListener('keydown',e=>{if(!this.active)return;e.preventDefault();e.stopImmediatePropagation();if(['Escape','Space','Enter'].includes(e.code))this.finish();},true);this.group.visible=false;
 }
 snapshot(h){return{h,enabled:h.enabled,position:h.root.position.clone(),rotation:h.root.quaternion.clone(),scale:h.root.scale.clone(),visible:h.root.visible,vfx:h.vfx?.visible,visualRotation:h.visual?.quaternion.clone()};}
 start(origin){
  if(this.active||this.played)return false;this.played=this.active=true;this.elapsed=0;this.shots=0;this.impacts=0;this.lastImpact=-Infinity;this.shotClock=0;this.clearInput();this.subject=this.getPlayer();this.subjectState=this.snapshot(this.subject);this.helpers=[this.snapshot(this.violet),this.snapshot(this.rift)];this.guests=this.helpers.filter(s=>s.enabled===false).map(s=>s.h);
  this.savedCamera={position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),up:this.camera.up.clone(),fov:this.camera.fov,near:this.camera.near,enabled:this.controls.enabled,target:this.controls.target.clone()};
  this.clearInput();this.controls.enabled=false;this.transport.combatPaused=true;this.origin=origin.clone();this.stage=origin.clone().add(new THREE.Vector3(0,0,this.config.stageDistance));
  if(this.subject.vfx)this.subject.vfx.visible=false;this.subject.root.visible=true;this.subject.root.position.copy(this.stage).add(new THREE.Vector3(2,0,2));this.subject.root.quaternion.identity();this.subject.visual?.quaternion.identity();
  for(const h of[this.violet,this.rift]){if(h.enabled===false)h.setEnabled(true);h.root.visible=false;if(h.vfx)h.vfx.visible=false;}
  this.group.visible=true;this.shield.visible=false;this.portal.visible=false;this.camera.up.copy(UP);this.camera.fov=54;this.camera.near=.1;this.camera.updateProjectionMatrix();
  this.savedScroll=window.scrollY;document.getElementById('viewport').scrollIntoView({block:'start'});this.dialog.showModal();document.querySelector('.viewer').classList.add('is-evac-cinematic');if(document.pointerLockElement)document.exitPointerLock();this.caption('','');this.update(0);return true;
 }
 caption(name,text){this.dialog.querySelector('.cinematic-caption').hidden=!text;if(this.line.textContent===text)return;this.speaker.textContent=name;this.line.textContent=text;this.dialog.querySelector('.cinematic-caption').hidden=!text;}
 tone(hz,end,duration=.12){if(this.getPlayer()?.preferences?.sound===false)return;const feedback=this.getPlayer()?.feedback||this.getPlayer()?.shurikenEffects,audio=feedback?.audio;if(audio?.state!=='running')return;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='triangle';oscillator.frequency.setValueAtTime(hz,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(end,audio.currentTime+duration);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}
 update(dt){
  if(!this.active)return;const previous=this.elapsed;this.elapsed+=dt;const t=this.elapsed,c=this.config,v=this.violet,r=this.rift,b=this.transport.adapter.boss;
  const subject=this.subject;subject.character?.update('Idle',dt);
  const shieldCenter=this.stage.clone().add(new THREE.Vector3(0,5,-7));const facing=UP.clone().set(0,0,-1);
  const arrival=smooth(c.violetArrivalStart,c.violetArrivalEnd,t);v.root.visible=t>=c.violetArrivalStart;v.root.position.copy(this.stage).add(new THREE.Vector3(24*(1-arrival),3.4+18*(1-arrival),-4));v.root.rotation.set(0,t<6.2?Math.PI:Math.atan2(2-v.root.position.x+this.stage.x,2-v.root.position.z+this.stage.z),0);
  const blocking=t>=c.violetArrivalEnd&&t<6.7;v.velocity.set(t<c.violetArrivalEnd?-24:0,t<c.violetArrivalEnd?-18:0,0);v.flightPose.step(dt,v.velocity,v.root.rotation.y,{raised:blocking,blocking});v.flightPose.applyVisual(v.root,v.visual);v.pose(t);if(v.character)v.flightPose.applyCharacter(v.character,v.nodes,dt,-.25);v.root.updateMatrixWorld(true);
  this.shield.visible=blocking;this.shield.position.copy(shieldCenter);this.shield.quaternion.setFromUnitVectors(FORWARD,facing);this.shield.scale.setScalar(1.35*smooth(c.violetArrivalEnd-.1,c.violetArrivalEnd+.15,t));this.shieldMaterial.uniforms.time.value=t;this.shieldMaterial.uniforms.risk.value=0;this.shieldMaterial.uniforms.hit.value=Math.max(0,1-(t-(this.lastImpact??-1))*5);
  if(this.lastImpact&&blocking){this.shield.position.x+=Math.sin(t*85)*.1*Math.max(0,1-(t-this.lastImpact)*4);this.shield.position.y+=Math.cos(t*71)*.06;}
  const fired=t>=c.fireStart&&t<c.fireEnd;
  const shotState={...b.state,phase:fired?'barrage':t<c.fireStart?'windup':'reset',patterns:['gatling'],elapsed:t,duration:c.fireStart};
  b.model.art.aimPoint=shieldCenter.clone();b.model.animate(dt,t,shieldCenter,false,shotState,false);b.sync();
  if(previous<1.1&&t>=1.1)this.tone(90,260,.8);
  if(fired){this.shotClock+=dt;while(this.shotClock>=c.shotInterval){this.shotClock-=c.shotInterval;for(const gun of b.model.art.guns){const from=b.model.art.muzzle(this.shots,gun.module),target=shieldCenter.clone().add(new THREE.Vector3(Math.sin(this.shots*2.4)*2,Math.cos(this.shots*3.1)*1.6,0)),dir=target.clone().sub(from).normalize(),mesh=new THREE.Mesh(this.geometry,this.material);mesh.position.copy(from);mesh.scale.setScalar(c.shotRadius);this.group.add(mesh);this.bolts.push({mesh,dir,radius:c.shotRadius,target});b.model.art.shot(this.shots++,gun.module);}this.tone(150,65,.07);}}
  for(let i=this.bolts.length-1;i>=0;i--){const p=this.bolts[i],distance=p.mesh.position.distanceTo(p.target);if(distance<=c.shotSpeed*dt){this.effects.impact(p.target,p.dir,1);this.lastImpact=t;this.impacts++;this.group.remove(p.mesh);this.bolts.splice(i,1);}else p.mesh.position.addScaledVector(p.dir,c.shotSpeed*dt);}
  this.effects.update(dt,this.bolts);
  const portalProgress=smooth(c.riftArrivalStart,c.riftArrivalStart+.45,t),portalClose=1-smooth(c.riftArrivalEnd+.6,c.riftArrivalEnd+1.2,t);this.portal.visible=t>=c.riftArrivalStart&&portalClose>0;this.portal.position.copy(this.stage).add(new THREE.Vector3(-c.stageHalfWidth,2,1));this.portal.scale.setScalar(Math.max(.001,portalProgress*portalClose));this.portal.children[0].rotation.z=t;this.portal.children[1].rotation.z=-t*.7;
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2+t*.6;this.dummy.position.set(Math.cos(a)*(1.9+.12*Math.sin(t*12+i)),Math.sin(a)*2,.06);this.dummy.scale.setScalar(.7+.5*Math.sin(t*7+i)**2);this.dummy.updateMatrix();this.portalSparks.setMatrixAt(i,this.dummy.matrix);}this.portalSparks.instanceMatrix.needsUpdate=true;
  const rift=smooth(c.riftArrivalStart+.4,c.riftArrivalEnd,t);r.root.visible=rift>0;r.root.position.copy(this.stage).add(new THREE.Vector3(-c.stageHalfWidth,0,1+rift*1.4));r.root.scale.setScalar(Math.max(.01,rift));r.root.rotation.y=Math.atan2(2+c.stageHalfWidth,2);r.character?.update(rift<1?'Walk':'Idle',dt);if(r.character&&t<c.riftArrivalEnd+.2&&rift>0)r.spell.pose(r.root,r.character,Math.min(1,rift));r.spell.update(dt,t,{root:r.root,nodes:r.nodes,character:r.character,active:rift>0&&t<c.riftArrivalEnd+.2,progress:rift});r.renderEffects(dt);
  if(previous<c.riftArrivalStart&&t>=c.riftArrivalStart)this.tone(220,700,.45);
  if(t>=c.riftLineAt)this.caption('RIFT WARDEN',"You're not fighting alone. We'll help you bring him down.");else if(t>=c.violetLineAt)this.caption('VIOLET SENTINEL',"I've got you. Stay behind my shield!");else this.caption('','');
  this.frameCamera();if(t>=c.duration)this.finish();
 }
 frameCamera(){if(!this.active)return;const t=this.elapsed,c=this.camera,o=this.origin,s=this.stage;let position,target;
  if(t<2.4){position=o.clone().add(new THREE.Vector3(42,28,65));target=o.clone().add(new THREE.Vector3(0,18,5));}
  else if(t<6.7){position=s.clone().add(new THREE.Vector3(10,6,13));target=s.clone().add(new THREE.Vector3(0,6,-7));}
  else{position=s.clone().add(new THREE.Vector3(1,4.5,13));target=s.clone().add(new THREE.Vector3(-.5,2.8,-1));}
  c.position.copy(position);c.up.copy(UP);c.lookAt(target);const rect=this.dialog.parentElement.getBoundingClientRect(),top=Math.max(0,rect.top);Object.assign(this.dialog.style,{left:rect.left+'px',top:top+'px',width:rect.width+'px',height:Math.min(rect.bottom-top,innerHeight-top)+'px'});
 }
 restoreSubject(){const s=this.subjectState;if(!s)return;s.h.root.position.copy(s.position);s.h.root.quaternion.copy(s.rotation);s.h.root.scale.copy(s.scale);s.h.root.visible=s.visible;if(s.visualRotation)s.h.visual.quaternion.copy(s.visualRotation);if(s.h.vfx)s.h.vfx.visible=s.vfx;this.subjectState=null;}
 finish(cancel=false){
  if(!this.active)return;this.active=false;this.restoreSubject();this.clearInput();this.controls.enabled=this.savedCamera.enabled;this.controls.target.copy(this.savedCamera.target);const c=this.camera,s=this.savedCamera;c.position.copy(s.position);c.quaternion.copy(s.quaternion);c.up.copy(s.up);c.fov=s.fov;c.near=s.near;c.updateProjectionMatrix();this.transport.combatPaused=false;
  for(const {h,vfx,position,rotation,scale,visible,enabled}of this.helpers){if(cancel){h.root.position.copy(position);h.root.quaternion.copy(rotation);h.root.scale.copy(scale);h.root.visible=visible;if(enabled===false)h.setEnabled(false);if(h.vfx)h.vfx.visible=vfx;}else{h.root.visible=true;h.root.scale.setScalar(1);h.root.position.copy(this.stage).add(h===this.violet?new THREE.Vector3(0,3.4,-4):new THREE.Vector3(-this.config.stageHalfWidth,0,2.4));h.velocity?.set(0,0,0);if(h.vfx)h.vfx.visible=true;}}
  if(!cancel){this.rift.travel=null;this.rift.castRemaining=0;}this.rift.spell.reset();this.clearEffects();if(this.dialog.open)this.dialog.close();document.querySelector('.viewer').classList.remove('is-evac-cinematic');window.scrollTo(0,this.savedScroll);if(!cancel)this.onComplete();
 }
 clearEffects(){for(const p of this.bolts)this.group.remove(p.mesh);this.bolts=[];this.effects.reset();this.group.visible=false;for(const gun of this.transport.adapter.boss.model.art.guns)gun.flash.visible=false;}
 reset(){this.finish(true);for(const h of this.guests)if(!this.isSelected(h))h.setEnabled(false);this.guests=[];this.played=false;this.elapsed=0;this.clearEffects();}
 diagnostics(){return{active:this.active,played:this.played,elapsed:this.elapsed,shots:this.shots||0,shieldImpacts:this.impacts||0,dialogue:this.line.textContent,subject:this.subject?.root.name,guests:this.guests.map(h=>h.root.name)};}
}
