import * as THREE from './vendor/three.module.js';
import {traceImpact} from './combat-collision.js?v=robot-experiments-108';
import {prepareKunaiModel} from './kage-kunai-model.js?v=original-kunai-441';
import {LightningKit} from './lightning-kit.js?v=451';
// Slash crescent shader: the sweep head is white-hot, the body cyan and the tail fades to violet.
const slashVertex=`attribute vec2 arcUv;varying vec2 vUv;void main(){vUv=arcUv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const slashFragment=`uniform vec3 color;uniform float sweep;uniform float fade;uniform float tail;uniform float rim;varying vec2 vUv;void main(){
 float behind=sweep-vUv.x;if(behind<0.)discard;
 float trail=exp(-behind*tail);
 float head=exp(-behind*28.);
 float edge=mix(pow(vUv.y,2.2),pow(vUv.y,9.),rim);
 vec3 c=mix(vec3(.42,.32,1.),color,trail);c=mix(c,vec3(1.),head*.8+edge*rim*.6);
 float a=edge*(trail*.85+head*.9)*fade;
 gl_FragColor=vec4(c*a,a);}`;
export function kageHitPower(hit,power,kind){
 const unit=hit.unit;
 if(unit?.entity?.type==='mireguard'&&['ninja-slash','ninja-dash'].includes(kind))return unit.maxHealth*unit.entity.config.kageMeleeFraction;
 // Modes can mark regular enemies with a dash fraction (City Liberation: half). The dash then takes that share
 // of max health, so it only finishes wounded targets and its yellow "can finish" flash stays meaningful.
 if(kind==='ninja-dash'&&unit?.kageDashFraction>0)return unit.maxHealth*unit.kageDashFraction;
 return power;
}
const forward=new THREE.Vector3(0,0,1);
const SLASH_VISUAL_SCALE=1.2;
// Player primary / melee; movement and the teleport shuriken remain independent.
export class KageAttacks {
 constructor(hero,config){
  this.hero=hero;this.config=config;this.group=new THREE.Group();hero.scene.add(this.group);this.dummy=new THREE.Object3D();
  const asset=prepareKunaiModel(hero.kunaiModel),blade=asset.geometry;this.kunaiSource=asset.source;this.kunaiTriangles=(blade.index?.count||blade.attributes.position.count)/3;const flightMaterials=asset.materials?.map(material=>{const m=material.clone();m.emissive.set('#5bd9c3');m.emissiveIntensity=.14;return m;});
  this.heldKunai=new THREE.Mesh(blade,asset.materials||new THREE.MeshStandardMaterial({color:'#b9dfdf',metalness:.65,roughness:.3}));this.heldKunai.position.set(0,.035,.2);hero.character.nodes.B_R_Hand.add(this.heldKunai);
  this.kunai=new THREE.InstancedMesh(blade,flightMaterials||new THREE.MeshBasicMaterial({color:'#d8fff6',toneMapped:false}),config.kunai.maxProjectiles);this.kunai.frustumCulled=false;this.group.add(this.kunai);
  this.outlines=new THREE.InstancedMesh(blade,new THREE.MeshBasicMaterial({color:'#142334',side:THREE.BackSide,toneMapped:false}),config.kunai.maxProjectiles);this.outlines.frustumCulled=false;this.group.add(this.outlines);
  this.trails=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#a6ffe9',transparent:true,opacity:.85,depthWrite:false,toneMapped:false}),config.kunai.maxProjectiles);this.trails.frustumCulled=false;this.group.add(this.trails);
  this.arcRoot=new THREE.Group();
  this.arcRoot.name='Kage slash trail';
  this.group.add(this.arcRoot);
  this.slashSegments=32;
  const radius=config.slash.range*.82;
  // Close blade swoosh plus a fainter far wave that shows the cut's full reach.
  const swoosh=3.0;this.swooshRadius=swoosh;
  this.arcHalo=this.makeSlashRibbon('#7b5cff',3.0,swoosh+.5,.15,true,2.6,0);
  this.arc=this.makeSlashRibbon('#46d6ff',2.2,swoosh,0,true,3.6,0);
  this.arcEdge=this.makeSlashRibbon('#f2ffff',.3,swoosh+.05,-.01,false,5,1);
  this.arcInner=this.makeSlashRibbon('#b06cff',1.1,swoosh-1.15,.35,true,4,0);
  this.arcEcho=this.makeSlashRibbon('#7fe2ff',.8,radius,.2,true,6,0);this.arcEcho.material.uniforms.tail.value=6;
  this.cutKit=new LightningKit(this.group,{arcs:10,glows:28,sparks:320});this.tipLocal=new THREE.Vector3();this.cuts=[];
  this.slashSparks=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),
   new THREE.MeshBasicMaterial({color:'#b1f4ff',transparent:true,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}),24);
  this.slashSparks.frustumCulled=false;
  this.arcRoot.add(this.slashSparks);
  this.shadowRoot=new THREE.Group();this.shadowRoot.name='Stored shadow kunai';this.group.add(this.shadowRoot);this.shadowKunai=[];const silhouette=new THREE.Shape();silhouette.moveTo(0,.42);for(const[x,y]of[[-.15,.05],[-.055,-.12],[-.055,-.28],[.055,-.28],[.055,-.12],[.15,.05]])silhouette.lineTo(x,y);silhouette.closePath();const shadowGeometry=new THREE.ShapeGeometry(silhouette),shadowMat=new THREE.MeshBasicMaterial({color:'#21132f',transparent:true,opacity:.94,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),edgeMat=new THREE.LineBasicMaterial({color:'#b89aff',transparent:true,opacity:.9,depthWrite:false,toneMapped:false}),edgeGeometry=new THREE.BufferGeometry().setFromPoints(silhouette.getPoints().map(p=>new THREE.Vector3(p.x,p.y,.015))),ringGeometry=new THREE.TorusGeometry(.085,.022,4,12),ringMat=new THREE.MeshBasicMaterial({color:'#9f7cea',transparent:true,opacity:.85,depthWrite:false,toneMapped:false});
  for(let i=0;i<config.kunai.maxStored;i++){const marker=new THREE.Group();marker.name='Shadow kunai '+(i+1);marker.add(new THREE.Mesh(shadowGeometry,shadowMat),new THREE.LineLoop(edgeGeometry,edgeMat));const ring=new THREE.Mesh(ringGeometry,ringMat);ring.position.y=-.38;marker.add(ring);this.shadowRoot.add(marker);this.shadowKunai.push(marker);}
  this.panel=document.createElement('div');this.panel.id='kage-weapons-meter';this.panel.innerHTML='<b data-kunai>KUNAI READY</b><span data-kunai-teleport></span><span data-slash>SLASH READY · R</span>';document.getElementById('ninja-hud').append(this.panel);this.reset();
 }
 makeSlashRibbon(color,width,radius,lift,soft=false,tail=5,rim=0){
  const positions=[],indices=[],colors=[],uvs=[];
  for(let i=0;i<=this.slashSegments;i++){
   const t=i/this.slashSegments,angle=THREE.MathUtils.lerp(-1,1,t);
   const taper=Math.sin(t*Math.PI)*(.45+.55*t);
   for(const [edge,r] of [radius-width*taper,radius].entries()){
    positions.push(Math.sin(angle)*r,.32*Math.sin(angle)*r+lift*taper,Math.cos(angle)*r);
    colors.push(1,1,1,soft&&edge===0?0:1);uvs.push(t,edge);
   }
   if(i>0){const j=i*2;indices.push(j-2,j-1,j,j-1,j+1,j);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));geometry.setAttribute('arcUv',new THREE.Float32BufferAttribute(uvs,2));
  const mesh=new THREE.Mesh(geometry,new THREE.ShaderMaterial({
   uniforms:{color:{value:new THREE.Color(color)},sweep:{value:0},fade:{value:1},tail:{value:tail},rim:{value:rim}},vertexShader:slashVertex,fragmentShader:slashFragment,
   transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false
  }));mesh.renderOrder=6;
  this.arcRoot.add(mesh);
  return mesh;
 }
 poseSlash(){
  const h=this.hero;
  if(h.character?.root)h.character.root.position.z=0;
  if(this.slashTime<=0)return;
  const t=1-this.slashTime/this.config.slash.effectSeconds;
  // Coil, then a fast committed cut with overshoot, a small lunge and a held follow-through.
  const windUp=THREE.MathUtils.smoothstep(t,0,.16);
  const raw=THREE.MathUtils.clamp((t-.16)/.26,0,1),swing=1-Math.pow(1-raw,3);
  const overshoot=Math.sin(Math.min(1,Math.max(0,(t-.3)/.3))*Math.PI)*.18;
  const recovery=1-THREE.MathUtils.smoothstep(t,.62,1);
  const twist=(windUp*.95-swing*1.55-overshoot)*recovery;
  const spine=h.character.nodes.B_Spine1;
  spine?.rotateY(twist);
  spine?.rotateX((-Math.asin(this.slashDirection.y)*.5+.18*windUp*(1-swing)+.22*swing)*recovery);
  spine?.rotateZ(-twist*.3);
  if(!this.fallingSwing&&h.character?.root)h.character.root.position.z=(.48*swing-.08*windUp*(1-swing))*recovery;
  const edge=h.blade?.userData.edge;if(edge){const flare=Math.sin(Math.min(1,raw*1.15)*Math.PI);edge.material.opacity=.3+.7*flare*recovery;edge.scale.set(1+1.4*flare,1+.25*flare,1);}
  h.character.root.updateWorldMatrix(true,true);
  const origin=h.root.position.clone();
  origin.y+=this.config.slash.height;
  const arm=(side,local)=>{
   const target=local.applyQuaternion(this.slashRotation).add(origin);
   h.character.arm(side,h.character.hand(side).lerp(target,recovery));
  };
  const blade=this.fallingSwing
   ?new THREE.Vector3(-.42,.95-.98*swing,.24+.88*swing)
   :new THREE.Vector3(-.98+1.78*swing+.12*overshoot,.62*windUp*(1-swing)+.1-.66*swing,.18+.7*Math.sin(swing*Math.PI));
  arm('L',blade);
  arm('R',new THREE.Vector3(.5-.2*swing,.18+.3*windUp*(1-swing),-.36+.5*swing));
 }
 reset(){this.cooldown=this.slashCooldown=this.slashTime=this.loadTime=0;this.held=this.loading=false;this.stored=0;this.queue=[];this.bolts=[];this.volleyClock=0;this.throws=this.volleys=this.slashes=0;this.lastVolley=0;this.slashHits=0;this.lastSlashHits=0;this.slashRotation=new THREE.Quaternion();this.slashDirection=new THREE.Vector3(0,0,1);this.slashOrigin=new THREE.Vector3();this.kunai.count=this.trails.count=0;if(this.outlines)this.outlines.count=0;this.arcRoot.visible=false;this.clearStoredVisual();}
 clearStoredVisual(){if(this.shadowRoot)this.shadowRoot.visible=false;for(const m of this.shadowKunai||[])m.visible=false;}
 cancelInput(){this.held=this.loading=false;this.stored=this.loadTime=0;this.queue=[];this.clearStoredVisual();}
 release(target){if(!this.loading)return false;const c=this.config.kunai,origin=this.hero.character.hand('R').clone(),dir=target.clone().sub(origin).normalize(),count=this.stored;this.queue=Array.from({length:count},()=>({origin:origin.clone(),dir:dir.clone()}));this.volleyClock=0;this.kunaiCast=this.hero.liberation?.cast('kunai',c.damage,origin);this.loading=false;this.stored=0;this.clearStoredVisual();this.cooldown=c.cooldown;this.volleys++;this.lastVolley=count;this.hero.shurikenEffects.tone(this.config.feedback.throwHz);return true;}
 quickThrow(target){if(this.cooldown>0||this.queue.length)return false;this.loading=true;this.stored=1;return this.release(target);}
 input(held,dt,wallJump){
  const c=this.config.kunai;
  if(held&&!this.loading&&this.cooldown<=0&&!this.queue.length){
   this.loading=true;this.loadTime=0;this.stored=1;
  }
  if(held&&this.loading){
   this.loadTime+=dt*(1+(this.hero.liberation?.v('Overclock Chip')||0)/100);
   if(wallJump)this.loadTime+=c.storeSeconds;
   this.stored=Math.min(c.maxStored,1+Math.floor((this.loadTime+1e-8)/c.storeSeconds));
  }
  if(!held&&this.held&&this.loading)this.release(this.hero.aim());
  this.held=held;
 }
 // The cone and feedback share a frozen frame centered on the existing cursor aim point.
 captureSlashAim(center){const direction=this.hero.aim().clone().sub(center);if(direction.lengthSq()<1e-8)direction.set(Math.sin(this.hero.yaw),0,Math.cos(this.hero.yaw));direction.normalize();const right=new THREE.Vector3(direction.z,0,-direction.x);if(right.lengthSq()<1e-8)right.set(Math.cos(this.hero.yaw),0,-Math.sin(this.hero.yaw));right.normalize();const up=new THREE.Vector3().crossVectors(direction,right).normalize();this.slashDirection.copy(direction);this.slashRotation.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,direction));}
 inCone(point,center){const c=this.config.slash,d=point.clone().sub(center),along=d.dot(this.slashDirection),radius=Math.max(0,along)*Math.tan(c.coneDegrees*Math.PI/360);return along>=-1e-6&&along<=c.range+1e-6&&Math.max(0,d.lengthSq()-along*along)<=radius*radius+1e-6;}
 coneHit(unit,center){const h=this.hero,c=this.config.slash,nearest=h.shurikenWorld.nearest(unit,center),radius=c.range*Math.tan(c.coneDegrees*Math.PI/360);if(!nearest||nearest.point.distanceToSquared(center)>c.range*c.range+radius*radius+1e-6)return null;
  const end=center.clone().addScaledVector(this.slashDirection,c.range),direct=traceImpact(center,end,{targets:[unit],ground:false,radius:0});if(direct&&this.clearLine(center,new THREE.Vector3().copy(direct.point)))return{point:new THREE.Vector3().copy(direct.point),part:direct.part};
  let best=null;const accept=hit=>{if(hit&&this.inCone(hit.point,center)&&this.clearLine(center,hit.point)&&(!best||hit.point.distanceToSquared(center)<best.point.distanceToSquared(center)))best=hit;};accept(nearest);
  for(const shape of unit.shapes){const along=THREE.MathUtils.clamp(new THREE.Vector3().copy(shape.center).sub(center).dot(this.slashDirection),0,c.range),axisPoint=center.clone().addScaledVector(this.slashDirection,along);for(const point of[axisPoint,end])accept(h.shurikenWorld.nearest({shapes:[shape]},point));}return best;
 }
 clearLine(center,point){const hit=this.hero.shurikenWorld.flightSolid(center,point,0,true);return !hit||hit.t>=.97;}
 slash(){if(this.slashCooldown>0)return false;const h=this.hero,c=this.config.slash,center=h.root.position.clone().add(new THREE.Vector3(0,c.height,0));this.slashCooldown=c.cooldown;this.slashTime=c.effectSeconds;this.slashes++;h.liberation?.cast('ninja-slash',c.damage,center);this.lastSlashHits=0;this.captureSlashAim(center);this.slashOrigin.copy(center);this.fallingSwing=false;
  const cut=c.fallingCut;
  if(h.motion?.mode==='air'&&!h.motion.active&&this.slashDirection.y<=-Math.sin(cut.minDownAngle*Math.PI/180)){
   this.fallingSwing=true;h.motion.startFallingCut(this.slashDirection,cut,(from,to)=>this.fallingStrike(from,to));
   h.shurikenEffects.tone(this.config.feedback.backstabHz);
   return true;
  }
  for(const unit of h.getDashEnemies()){if(!unit.alive||unit.dashPhased)continue;const nearest=this.coneHit(unit,center);if(!nearest)continue;h.hit({kind:'unit',unit,part:nearest.part,point:nearest.point},c.damage,'ninja-slash');this.queueCut(nearest.point);this.lastSlashHits++;}
  for(const missile of h.getAttackThreats()){if(!missile.alive)continue;const point=new THREE.Vector3().copy(missile.position);if(this.inCone(point,center)&&this.clearLine(center,point)){h.hit({kind:'missile',missile,point},c.damage,'ninja-slash');this.lastSlashHits++;}}
  // Environment hits use the same direct-hit callback; no damage through a wall.
  const enemySections=new Set(h.getDashEnemies().flatMap(u=>u.entity?.sections||[]));for(const section of h.getSections()){if(section.hidden||section.collisionDisabled||enemySections.has(section))continue;const shape={center:section.body?.position||section,rotation:section.body?.quaternion,half:{x:section.size[0]/2,y:section.size[1]/2,z:section.size[2]/2}},near=this.coneHit({shapes:[shape]},center);if(near)h.hit({kind:'building',section,point:near.point},c.damage,'ninja-slash');}
  this.slashHits+=this.lastSlashHits;h.burst(center,12);this.launchFlash(center);h.shurikenEffects.tone(this.config.feedback.backstabHz);return true;
 }
 launchFlash(center){
  if(!this.cutKit)return;
  const ahead=center.clone().addScaledVector(this.slashDirection,1.2);
  this.cutKit.glow(ahead,{size:2.4,life:.16,grow:1.4,color:new THREE.Color('#ffffff'),peak:.8});
  this.cutKit.glow(ahead,{size:5,life:.32,grow:.6,color:new THREE.Color('#8a6cff'),peak:.6});
  const feet=this.hero.root.position.clone();feet.y+=.1;
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,p=feet.clone().add(new THREE.Vector3(Math.cos(a)*1.8,0,Math.sin(a)*1.8));this.cutKit.arc(feet,p,{life:.18,width:.55,jag:.25,maxJag:.3,flicker:.04});}
  this.cutKit.spark(feet,30,7,1,{life:.35,size:.07,sizeSpread:.08,gravity:4,spread:.6});
 }
 queueCut(point){
  // Flash a cut on each struck enemy when the visible sweep reaches it.
  const local=new THREE.Vector3().copy(point).sub(this.slashOrigin).applyQuaternion(this.slashRotation.clone().invert());
  const u=THREE.MathUtils.clamp((Math.atan2(local.x,local.z)+1)/2,0,1);
  (this.cuts||=[]).push({point:new THREE.Vector3().copy(point),at:.14+.3*u,done:false});
 }
 cutFlash(point){
  if(!this.cutKit)return;
  const across=new THREE.Vector3(.85,-.32,0).applyQuaternion(this.slashRotation);
  this.cutKit.arc(point.clone().sub(across),point.clone().add(across),{life:.11,width:1.3,jag:.01,maxJag:.05,flicker:1,coreWidth:1.8});
  this.cutKit.glow(point,{size:1.6,life:.16,grow:1.2,color:new THREE.Color('#ffffff')});
  this.cutKit.glow(point,{size:3,life:.3,grow:.6,peak:.7});
  this.cutKit.spark(point,26,10,2,{life:.3,size:.07,sizeSpread:.09});
 }
 fallingStrike(from,to){
  const h=this.hero,c=this.config.slash;
  const start=new THREE.Vector3().copy(from),end=new THREE.Vector3().copy(to);
  this.slashOrigin.copy(end);this.slashOrigin.y+=c.height;
  start.y+=c.height;end.y+=c.height;end.addScaledVector(this.slashDirection,c.height);
  const hit=h.shurikenWorld.enemies(start,end,c.fallingCut.bladeRadius)[0];
  if(!hit||!this.clearLine(start,new THREE.Vector3().copy(hit.point)))return false;
  h.hit(hit,c.damage,'ninja-slash');
  this.slashHits++;this.lastSlashHits++;
  return true;
 }
 update(dt,{held=false,slash=false,enabled=false,wallJump=false}={}){const h=this.hero,c=this.config.kunai;this.cooldown=Math.max(0,this.cooldown-dt);this.slashCooldown=Math.max(0,this.slashCooldown-dt);this.slashTime=Math.max(0,this.slashTime-dt);if(enabled){this.input(held,dt,wallJump);if(slash)this.slash();}else if(this.loading||this.held)this.cancelInput();
  this.volleyClock-=dt;while(this.queue.length&&this.volleyClock<=0){const p=this.queue.shift();if(this.bolts.length>=c.maxProjectiles)this.bolts.shift();h.liberation?.projectile('kunai',p.origin,c.damage,this.kunaiCast);this.bolts.push({cast:p.cast||this.kunaiCast,pierced:new Set(),position:p.origin.clone(),dir:p.dir.clone(),age:0,travelled:0,owner:'kage'});this.volleyClock+=c.burstInterval;this.throws++;h.shots++;h.throwPose=.18;h.burst(p.origin,2);}
  for(const bolt of [...this.bolts]){const distance=Math.min(c.speed*dt,c.range-bolt.travelled),to=bolt.position.clone().addScaledVector(bolt.dir,distance),transit=h.redirect(bolt,bolt.position,to);let remove=false;if(transit){bolt.position.copy(transit.position);bolt.dir.copy(transit.direction);}else{const hit=h.traceWorld(bolt.position,to,{allied:true,radius:c.radius,moving:true,skipUnits:bolt.pierced});h.liberation?.foundry(bolt,bolt.position,hit?.point||to,c.damage);if(hit){hit.cast=bolt.cast;bolt.position.copy(hit.point);h.hit(hit,c.damage,'kunai');if(h.active)h.kunaiMarks?.place(hit.unit);remove=!hit.unit||bolt.pierced.size>=(h.liberation?.v('Phase Ammunition')||0);if(!remove)bolt.pierced.add(hit.unit);}else bolt.position.copy(to);}bolt.travelled+=distance;bolt.age+=dt;if(remove||bolt.travelled>=c.range||bolt.age>c.range/c.speed+1)this.bolts.splice(this.bolts.indexOf(bolt),1);}
  this.render(dt);
 }
 render(dt=0){const h=this.hero,c=this.config;let i=0;for(const b of this.bolts){this.dummy.position.copy(b.position);this.dummy.quaternion.setFromUnitVectors(forward,b.dir);this.dummy.scale.setScalar(c.kunai.visualScale);this.dummy.updateMatrix();this.kunai.setMatrixAt(i,this.dummy.matrix);this.dummy.scale.multiplyScalar(c.kunai.outlineScale);this.dummy.updateMatrix();this.outlines.setMatrixAt(i,this.dummy.matrix);this.dummy.position.addScaledVector(b.dir,-c.kunai.trailLength/2);this.dummy.scale.set(c.kunai.trailWidth,c.kunai.trailWidth,c.kunai.trailLength);this.dummy.updateMatrix();this.trails.setMatrixAt(i++,this.dummy.matrix);}this.kunai.count=this.outlines.count=this.trails.count=i;this.kunai.instanceMatrix.needsUpdate=this.outlines.instanceMatrix.needsUpdate=this.trails.instanceMatrix.needsUpdate=true;
  this.renderSlash(dt);
  const count=h.active&&h.enabled&&this.loading?this.stored:0;this.shadowRoot.visible=count>0;if(count){const head=h.character.nodes.B_Head.getWorldPosition(new THREE.Vector3());this.shadowRoot.position.set(head.x,Math.max(head.y+c.kunai.shadowHeight,h.root.position.y+2.9),head.z);this.shadowRoot.quaternion.copy(h.camera.quaternion);}for(let j=0;j<this.shadowKunai.length;j++){const marker=this.shadowKunai[j],wasVisible=marker.visible;marker.visible=j<count;if(!marker.visible)continue;marker.userData.age=wasVisible?(marker.userData.age||0)+dt:0;const offset=j-(count-1)/2;marker.position.set(offset*c.kunai.shadowSpacing,-Math.abs(offset)*.1+Math.sin(h.time*3+j*.8)*.035,0);marker.rotation.z=-offset*.12;marker.scale.setScalar(c.kunai.shadowScale*(.75+.25*Math.min(1,marker.userData.age/.12)));}
  this.heldKunai.visible=!!h.enabled&&!h.shuriken.charging&&h.throwPose<=0;this.panel.hidden=!h.active;this.panel.querySelector('[data-kunai]').textContent=this.loading?'KUNAI '+this.stored+' / '+c.kunai.maxStored+' STORED':this.cooldown>0?'KUNAI · '+this.cooldown.toFixed(1)+'s':'KUNAI READY · LMB / F';this.panel.querySelector('[data-slash]').textContent=this.slashCooldown>0?'SLASH · '+this.slashCooldown.toFixed(1)+'s':'SLASH READY · R';const button=document.getElementById('ninja-slash');if(button)button.disabled=this.slashCooldown>0;
 }
 renderSlash(dt=0){
  const c=this.config.slash,progress=1-this.slashTime/c.effectSeconds;
  this.cutKit?.step(dt);
  for(const cut of this.cuts||[])if(!cut.done&&progress>=cut.at){cut.done=true;this.cutFlash(cut.point);}
  if(this.slashTime<=0&&this.cuts)this.cuts.length=0;
  this.arcRoot.visible=this.slashTime>0&&progress>.12;
  if(!this.arcRoot.visible)return;
  const sweep=THREE.MathUtils.smoothstep(progress,.12,.53);
  const fade=1-THREE.MathUtils.smoothstep(progress,.5,1);
  // Ride along with Kage: anchor at his current chest height, keep the captured aim.
  this.arcRoot.position.copy(this.hero.root.position);this.arcRoot.position.y+=c.height;
  this.arcRoot.quaternion.copy(this.slashRotation);
  if(this.fallingSwing)this.arcRoot.scale.set(.24,.38,.39).multiplyScalar(SLASH_VISUAL_SCALE);
  else this.arcRoot.scale.setScalar(SLASH_VISUAL_SCALE);
  const head=1-Math.pow(1-sweep,2)+.02;
  const echo=THREE.MathUtils.smoothstep(progress,.18,.48);
  const set=(layer,s,f)=>{layer.material.uniforms.sweep.value=s;layer.material.uniforms.fade.value=f;};
  set(this.arcHalo,head,fade*.85);set(this.arc,head,fade*1.5);set(this.arcEdge,head,fade*1.8);if(this.arcInner)set(this.arcInner,Math.max(0,head-.08),fade*.9);set(this.arcEcho,echo*1.02,.42*(1-THREE.MathUtils.smoothstep(progress,.42,.7)));

  const radius=this.swooshRadius||c.range*.82;
  if(this.cutKit&&sweep<1&&!this.fallingSwing){
   // Blazing blade tip racing along the crescent, shedding sparks and afterglow.
   const a=THREE.MathUtils.lerp(-1,1,Math.min(1,head));
   this.tipLocal.set(Math.sin(a)*radius,.32*Math.sin(a)*radius,Math.cos(a)*radius);
   this.arcRoot.updateMatrixWorld();const tip=this.arcRoot.localToWorld(this.tipLocal.clone());
   this.cutKit.glow(tip,{size:.8,life:.045,color:new THREE.Color('#ffffff'),peak:.75});
   this.cutKit.glow(tip,{size:1.5,life:.08,peak:.22});
   this.cutKit.spark(tip,5,8,1.5,{life:.32,size:.08,sizeSpread:.1,gravity:6});
  }
  let count=0;
  for(let i=0;i<24;i++){
   const fraction=(i+.5)/24;
   if(fraction>sweep)break;
   const age=Math.max(0,progress-.12-fraction*.39);
   const angle=THREE.MathUtils.lerp(-1,1,fraction)+age*.14;
   const travel=radius+age*(.5+i%4*.4);
   const x=Math.sin(angle)*travel;
   const size=(.03+(.06+i%3*.025)*(1-age));
   this.dummy.position.set(x,.32*x+Math.sin(i*2.4)*age*2.6,Math.cos(angle)*travel);
   this.dummy.rotation.set(angle*.24,angle,0);
   this.dummy.scale.set(size*.3,size*.3,size*(2.4+i%3*.6));
   this.dummy.updateMatrix();
   this.slashSparks.setMatrixAt(count++,this.dummy.matrix);
  }
  this.slashSparks.count=count;
  this.slashSparks.material.opacity=fade;
  this.slashSparks.instanceMatrix.needsUpdate=true;
 }
 diagnostics(){return{kunaiModel:this.kunaiSource,kunaiTriangles:this.kunaiTriangles,shadowCount:(this.shadowKunai||[]).filter(m=>m.visible).length,stored:this.stored,loading:this.loading,cooldown:this.cooldown,active:this.bolts.length,queued:this.queue.length,throws:this.throws,volleys:this.volleys,lastVolley:this.lastVolley,slashCooldown:this.slashCooldown,slashes:this.slashes,lastSlashHits:this.lastSlashHits,slashHits:this.slashHits,slashHitbox:'cone',slashConeDegrees:this.config.slash.coneDegrees,slashDirection:this.slashDirection.toArray()};}
}

// Check what a single dash contact can finish without mutating health or armour.
export function kageDashCanFinish(unit,power,crosscut=false,from=null){
 if(!unit.alive||unit.kind!=='robot'||unit.dashPhased||unit.hidden||unit.health<=0)return false;
 const enemy=unit.entity;
 const damage=crosscut?power:kageHitPower({unit},power,'ninja-dash');
 // Assault Sentinel: what the dash meets depends on Kage's approach (plates, flank or the rear core).
 if(enemy.type==='sentinel')return damage*enemy.finishMultiplier(from)>=unit.health;
 return unit.shapes.some(({part})=>{
  if(enemy.weapons){
   const weapon=enemy.weapons.forPart(part);
   return !!weapon&&!weapon.destroyed&&enemy.weapons.remaining===1&&weapon.health<=damage;
  }
  if(enemy.joints&&enemy.config.armor){
   if(part==='argus-core-open')return enemy.coreOpen&&damage*enemy.config.attacks.lance.coreMultiplier>=unit.health;
   if(part==='argus-core-closed'){
    const scale=enemy.coreOpen?enemy.config.attacks.lance.coreMultiplier:enemy.config.armor.coreDamageScale;
    return damage*scale>=unit.health;
   }
   const joint=enemy.joints.get(part);
   return (joint?Math.min(joint.health,damage)*enemy.config.joints.hullDamageScale:damage*enemy.config.armor.bodyDamageScale)>=unit.health;
  }
  if(enemy.armsHealth&&enemy.config.weakPoints){
   if(part==='chest')return damage*enemy.config.weakPoints.chestDamageMultiplier>=unit.health;
   if(part==='arm-left'||part==='arm-right'){
    const arm=enemy.armsHealth[part==='arm-left'?0:1];
    return Math.min(damage,arm)*enemy.config.weakPoints.armBossDamageScale>=unit.health;
   }
   const launcher=enemy.state.launchers.find(module=>module.id===part&&!module.destroyed);
   const weapon=[enemy.config.rain,enemy.config.beamWalls].find(config=>'launcher-'+config.module===part);
   return !!launcher&&!!weapon&&Math.min(damage,launcher.health)*weapon.weaponBossDamageScale>=unit.health;
  }
  if(enemy.engines&&part!=='hull')return false;
  if(part==='ronin-shield'&&enemy.guardBlocking)return false;
  if(enemy.type==='aegis'&&(part==='shield'||!part))return damage*(1-enemy.config.shieldReduction)>=unit.health;
  if(enemy.type==='mireguard'&&part==='head'){
   const head=enemy.limbs.head;
   return head?.health>0&&damage*enemy.config.headMultiplier>=head.health||damage>=unit.health;
  }
  return damage>=unit.health;
 });
}
