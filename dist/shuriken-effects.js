import * as THREE from './vendor/three.module.js';
// A tapered blade streak in the target-facing plane, revealed from high left to low right.
function bladeTrail(){
 const positions=[],indices=[];
 for(let i=0;i<=16;i++){
  const t=i/16,x=(.5-t)*2.5,y=(.5-t)*1.6,bow=Math.sin(t*Math.PI);
  positions.push(x,y+.22*bow,.16*bow,x,y+.02*bow,.16*bow);
  const j=i*2;if(i)indices.push(j-2,j-1,j,j,j-1,j+1);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);return g;
}
export class ShurikenEffects {
 constructor(hero,config){this.hero=hero;this.config=config;this.group=new THREE.Group();hero.scene.add(this.group);this.flash=0;this.strikeTime=0;this.traceAge=1;this.debug=false;this.note='HOLD SHURIKEN · RELEASE TO THROW';
  const material=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false}),line=()=>new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:config.preview.readyColor,transparent:true,opacity:.8,depthWrite:false}));
  this.line=line();this.line.frustumCulled=false;this.trace=line();this.trace.frustumCulled=false;this.group.add(this.line,this.trace);
  this.ghost=new THREE.Mesh(hero.starGeometry,material(config.preview.readyColor,.55));this.ghost.material.wireframe=hero.shurikenSource!=='Shuriken.blend';this.group.add(this.ghost);
  this.charge=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),material(config.preview.lineColor,.4));this.group.add(this.charge);
  const starMaterial=hero.silver.clone();starMaterial.emissiveIntensity=.3;this.thrown=new THREE.InstancedMesh(hero.starGeometry,starMaterial,config.collision.maxEarlyStars+1);this.thrown.frustumCulled=false;this.group.add(this.thrown);this.dummy=new THREE.Object3D();
  this.ring=new THREE.Mesh(new THREE.TorusGeometry(config.feedback.stationaryRingRadius,.055,4,32),material(config.preview.readyColor,.8));this.ring.rotation.x=Math.PI/2;this.group.add(this.ring);
  this.slash=new THREE.Mesh(bladeTrail(),material('#dcfffa',.95));this.slash.material.side=THREE.DoubleSide;this.group.add(this.slash);
  this.highlight=[];const box=new THREE.BoxGeometry(1,1,1);for(let i=0;i<config.preview.maxHighlights;i++){const m=new THREE.Mesh(box,material('#ffce67',.65));m.material.wireframe=true;this.group.add(m);this.highlight.push(m);}
  this.debugPoints=[];const small=new THREE.SphereGeometry(.09,6,4);for(let i=0;i<config.preview.maxDebugPoints;i++){const m=new THREE.Mesh(small,material('#ff465d'));m.material.depthTest=false;this.group.add(m);this.debugPoints.push(m);}this.capsule=new THREE.Mesh(box,material('#72ffbc',.55));this.capsule.material.wireframe=true;this.capsule.material.depthTest=false;this.group.add(this.capsule);
  const hud=document.querySelector('.mission-bindings');this.panel=document.createElement('div');this.panel.id='shuriken-meter';this.panel.hidden=true;this.panel.innerHTML='<b data-state>CHARGED SHURIKEN</b><div class="shuriken-progress"><i></i></div><span data-note></span><small data-ready></small><pre hidden></pre>';hud.append(this.panel);
  const style=document.createElement('link');style.rel='stylesheet';style.href='charged-shuriken.css?v=mission-hud-324';document.head.append(style);this.reset();
 }
 reset(){this.panel.hidden=true;this.traceAge=1;this.blockedPoint=null;this.strikeTime=this.flash=0;this.thrown.count=0;for(const m of[this.line,this.trace,this.ghost,this.charge,this.ring,this.slash,this.capsule,...this.highlight,...this.debugPoints])m.visible=false;this.note='HOLD SHURIKEN · RELEASE TO THROW';}
 unlock(){if(!this.config.feedback.sound)return;try{this.audio??=new(window.AudioContext||window.webkitAudioContext)();this.audio.resume();}catch{}}
 tone(hz,chime=false){const c=this.config.feedback,a=this.audio;if(!c.sound||a?.state!=='running')return;for(const multiplier of chime?[1,1.5]:[1]){const o=a.createOscillator(),g=a.createGain(),seconds=chime?c.chimeSeconds:c.toneSeconds;o.type='sine';o.frequency.setValueAtTime(hz*multiplier,a.currentTime);g.gain.setValueAtTime(c.volume/(chime?2:1),a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+seconds);o.connect(g);g.connect(a.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start();o.stop(a.currentTime+seconds);}}
 cutSound(backstab){
  const audio=this.audio,c=this.config.feedback;if(!c.sound||audio?.state!=='running')return;
  const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
  osc.type='triangle';osc.frequency.setValueAtTime(backstab?c.backstabHz*2:c.throwHz*2,now);
  osc.frequency.exponentialRampToValueAtTime(c.chargeHz,now+.09);
  gain.gain.setValueAtTime(c.volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.12);
  osc.connect(gain);gain.connect(audio.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+.12);
  if(backstab)this.tone(c.backstabHz,true);
 }
 event(e){const c=this.config.feedback,h=this.hero;switch(e.type){case'charge':this.note='CHARGING · YOU CAN MOVE AND JUMP';this.tone(c.chargeHz);break;case'full':this.note='FULL CHARGE · TELEPORT STAR READY';this.flash=c.flashSeconds;this.tone(c.fullHz,true);h.burst(h.character.hand('R'),12);break;case'throw':this.note=e.tier==='full'?'Q / TELEPORT · X / CANCEL':'QUICK THROW';h.throwPose=.18;this.tone(c.throwHz);break;case'lodged':this.note='MARKED · Q TO APPEAR BEHIND';this.tone(c.fullHz);break;
 case'behind':{
  this.note='DASH THROUGH FOR CROSSCUT';
  const d=e.target.clone().sub(h.root.position);h.yaw=Math.atan2(d.x,d.z);h.root.rotation.y=h.motion.body.yaw=h.yaw;
  h.updateCamera(1,true);const aim=e.target.clone().sub(h.camera.position);h.pitch=Math.atan2(aim.y,Math.hypot(aim.x,aim.z));h.updateCamera(1,true);break;
 }case'stationary':this.note='STAR ANCHORED · TELEPORT READY';this.tone(c.fullHz);break;case'failed':case'blocked':if(e.star)this.blockedPoint=e.star.position.clone();this.note='TELEPORT FAILED · '+(e.reason||'UNTELEPORTABLE SURFACE');this.tone(c.failHz);break;case'unavailable':this.note='CHARGE AND RELEASE A TELEPORT STAR FIRST';this.tone(c.failHz);break;case'teleport':this.note='TELEPORT · DASH REFRESHED';this.traceAge=0;this.traceFrom=new THREE.Vector3().copy(e.from).add(new THREE.Vector3(0,this.config.arrival.anchorHeight,0));this.traceTo=e.to.clone().add(new THREE.Vector3(0,this.config.arrival.anchorHeight,0));this.tone(c.teleportHz,true);h.burst(e.from,16);h.burst(e.to,20);break;case'strike':case'backstab':this.note=e.type==='backstab'?'CROSSCUT · BACKSTAB':'CROSSCUT';this.strikeTime=c.flashSeconds;this.slash.position.copy(e.point);if(!e.dash){h.yaw=Math.atan2(e.target.x-h.root.position.x,e.target.z-h.root.position.z);h.motion.body.yaw=h.yaw;h.root.rotation.y=h.yaw;h.updateCamera(1,true);}this.slash.rotation.set(0,h.yaw,0);const rear=e.type==='backstab';this.slash.scale.setScalar(rear?1.5:1);this.slash.material.color.set(rear?'#ffdb80':'#dcfffa');h.burst(e.point,rear?12:5);this.cutSound(rear);break;case'cancel':this.note='STAR DISMISSED';break;case'expired':this.note='STAR FADED';break;}}
 setLine(line,a,b){const attr=line.geometry.attributes.position;attr.setXYZ(0,a.x,a.y,a.z);attr.setXYZ(1,b.x,b.y,b.z);attr.needsUpdate=true;}
 update(dt,time){const h=this.hero,a=h.shuriken,c=this.config;this.group.visible=h.active;this.panel.hidden=!h.legacyShuriken||!h.active||!(a.charging||a.anchor||a.cooldown>0||a.failure>0||this.flash>0||this.debug);this.flash=Math.max(0,this.flash-dt);this.strikeTime=Math.max(0,this.strikeTime-dt);this.traceAge+=dt;
  this.charge.visible=a.charging;if(a.charging){this.charge.position.copy(h.character.hand('R'));this.charge.material.color.set(a.full?c.preview.readyColor:c.preview.lineColor);this.charge.scale.setScalar(c.feedback.chargeRadius*(.5+a.charge/c.charge.fullSeconds)*(1+this.flash/c.feedback.flashSeconds));}
  this.line.visible=this.ghost.visible=!!a.charging&&!!a.preview;if(this.line.visible){const p=a.preview,color=a.failure>0||p.forbidden||!p.landing.valid?c.preview.failedColor:a.full?c.preview.readyColor:c.preview.lineColor;this.line.material.color.set(color);this.ghost.material.color.set(color);this.setLine(this.line,h.character.hand('R'),p.end);this.ghost.position.copy(p.end);this.ghost.rotation.z=time*c.feedback.spinSpeed;this.ghost.scale.setScalar(c.full.scale);}
  if(!a.charging&&a.failure>0&&this.blockedPoint){this.ghost.visible=true;this.ghost.position.copy(this.blockedPoint);this.ghost.material.color.set(c.preview.failedColor);this.ghost.scale.setScalar(c.full.scale*a.failure/c.feedback.failSeconds);}
  for(const m of this.highlight)m.visible=false;if(a.charging&&a.preview)for(const[hit,i]of a.preview.hits.slice(0,c.preview.maxHighlights).map((v,i)=>[v,i])){const shape=[...hit.unit.shapes].sort((x,y)=>new THREE.Vector3().copy(x.center).distanceToSquared(hit.point)-new THREE.Vector3().copy(y.center).distanceToSquared(hit.point))[0],m=this.highlight[i];if(!shape)continue;m.visible=true;m.position.copy(shape.center);m.quaternion.copy(shape.rotation||new THREE.Quaternion());m.scale.set(shape.half.x*2+.05,shape.half.y*2+.05,shape.half.z*2+.05);}
  let count=0;for(const star of a.stars){this.dummy.position.copy(star.position);this.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),star.dir);this.dummy.rotateZ(star.age*c.feedback.spinSpeed);const fade=star.state==='stationary'?Math.min(1,(c.full.stickSeconds-star.stationaryAge)/c.feedback.fadeSeconds):1;this.dummy.scale.setScalar(c[star.tier].scale*Math.max(.05,fade));this.dummy.updateMatrix();this.thrown.setMatrixAt(count,this.dummy.matrix);this.thrown.setColorAt(count++,new THREE.Color(star.tier==='full'?c.preview.readyColor:'#efffff'));}this.thrown.count=count;this.thrown.instanceMatrix.needsUpdate=true;if(count)this.thrown.instanceColor.needsUpdate=true;
  this.ring.visible=!!a.anchor;if(a.anchor){this.ring.position.copy(a.anchor.position);this.ring.material.color.set(a.failure>0?c.preview.failedColor:a.anchor.host?'#f1faff':c.preview.readyColor);this.ring.scale.setScalar(1+Math.sin(time*8)*.08);this.ring.rotation.z=time;}
  this.trace.visible=this.traceAge<c.feedback.traceSeconds&&!!this.traceFrom;if(this.trace.visible)this.setLine(this.trace,this.traceFrom.clone().lerp(this.traceTo,this.traceAge/c.feedback.traceSeconds),this.traceTo);this.slash.visible=this.strikeTime>0;if(this.slash.visible){
   const progress=1-this.strikeTime/c.feedback.flashSeconds;
   this.slash.geometry.setDrawRange(0,6*Math.max(1,Math.ceil(16*Math.min(1,progress/.32))));
   this.slash.material.opacity=Math.min(1,(1-progress)*2);
  }
  const landing=a.resolution||a.preview?.landing;for(const m of this.debugPoints)m.visible=false;this.capsule.visible=this.debug&&!!landing;if(this.debug&&landing){for(const[s,i]of(landing.samples||[]).slice(0,c.preview.maxDebugPoints).map((s,i)=>[s,i])){const m=this.debugPoints[i];m.visible=true;m.position.copy(s.point);m.material.color.set(s.valid?c.preview.readyColor:c.preview.failedColor);}this.capsule.position.copy(landing.point).y+=c.resolver.height/2;this.capsule.scale.set(c.resolver.radius*2,c.resolver.height,c.resolver.radius*2);this.capsule.material.color.set(landing.valid?c.preview.readyColor:c.preview.failedColor);}
  this.panel.querySelector('[data-state]').textContent=a.state==='idle'?'SHURIKEN':a.state.toUpperCase().replace('-',' ');this.panel.querySelector('i').style.width=(a.charging?Math.min(100,a.charge/c.charge.fullSeconds*100):a.anchor?100:a.cooldown>0?(1-a.cooldown/c.cooldownSeconds)*100:0)+'%';this.panel.querySelector('[data-note]').textContent=this.note;this.panel.querySelector('[data-ready]').textContent=a.anchor?'Q / TELEPORT · '+(a.anchor.host?'ENEMY MARKED':a.anchor.state==='stationary'?'ANCHORED':'IN FLIGHT'):a.cooldown>0?'TELEPORT THROW COOLDOWN '+a.cooldown.toFixed(1)+'s':'HOLD E · RELEASE TO THROW';const debug=this.panel.querySelector('pre');debug.hidden=!this.debug;if(this.debug)debug.textContent=JSON.stringify({state:a.state,landing:landing?{valid:landing.valid,reason:landing.reason,point:landing.point.toArray(),checks:landing.samples?.length}:null,cooldown:a.cooldown},null,2);
  const chargeButton=document.getElementById('ninja-shuriken');
  const label=a.full&&a.charging?'RELEASE · FULL':a.charging?'CHARGING…':'SHURIKEN';
  if(chargeButton&&chargeButton.textContent!==label)chargeButton.textContent=label;
  const button=document.getElementById('ninja-teleport');if(button&&h.legacyShuriken){button.disabled=!a.anchor;button.textContent=a.failure>0?'BLOCKED · RETRY':'TELEPORT · Q';}
 }
}
