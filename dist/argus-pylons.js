import * as THREE from './vendor/three.module.js';
import {traceImpact} from './combat-collision.js';
import {routePoint,predictConvoyDistance} from './convoy-map-config.js';
const UP=new THREE.Vector3(0,1,0);
// Earliest contact with a moving annulus. Solve both edges, so fast crossings cannot tunnel.
export function quakeRingContact(from,to,center,r0,r1,padding){
 const x=from.x-center.x,z=from.z-center.z,vx=to.x-from.x,vz=to.z-from.z,dr=r1-r0,candidates=[];
 if(Math.abs(Math.hypot(x,z)-r0)<=padding)return 0;
 for(const offset of[-padding,padding]){const r=r0+offset,a=vx*vx+vz*vz-dr*dr,b=2*(x*vx+z*vz-r*dr),c=x*x+z*z-r*r;
  if(Math.abs(a)<1e-10){if(Math.abs(b)>1e-10)candidates.push(-c/b);}else{const d=b*b-4*a*c;if(d>=0){const q=Math.sqrt(d);candidates.push((-b-q)/(2*a),(-b+q)/(2*a));}}
 }
 return candidates.filter(t=>t>=0&&t<=1&&r0+dr*t>=0&&Math.abs(Math.hypot(x+vx*t,z+vz*t)-(r0+dr*t))<=padding+1e-6).sort((a,b)=>a-b)[0]??null;
}
// The bus uses its actual oriented footprint, not a large bounding sphere.
export function quakeBusContact(from,to,center,r0,r1,width,length,yaw,padding){
 const co=Math.cos(yaw),si=Math.sin(yaw),local=p=>({x:(center.x-p.x)*co-(center.z-p.z)*si,z:(center.x-p.x)*si+(center.z-p.z)*co}),a=local(from),b=local(to),cuts=[0,1];
 for(const [axis,half]of [['x',width*.5],['z',length*.5]])for(const edge of[-half,half]){const delta=b[axis]-a[axis];if(Math.abs(delta)>1e-9){const t=(edge-a[axis])/delta;if(t>0&&t<1)cuts.push(t);}}
 cuts.sort((a,b)=>a-b);const closest=t=>{const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,dx=x-THREE.MathUtils.clamp(x,-width*.5,width*.5),dz=z-THREE.MathUtils.clamp(z,-length*.5,length*.5);return{x:center.x-dx*co-dz*si,z:center.z+dx*si-dz*co};};
 for(let i=1;i<cuts.length;i++){const lo=cuts[i-1],hi=cuts[i],t=quakeRingContact(closest(lo),closest(hi),center,r0+(r1-r0)*lo,r0+(r1-r0)*hi,padding);if(t!==null)return lo+(hi-lo)*t;}
 return null;
}
export class ArgusPylons {
 constructor(attacks,{getPylonGround=null}={}){this.attacks=attacks;this.boss=attacks.boss;this.config=attacks.config.pylons;this.getGround=getPylonGround||((p)=>{const body=[...this.boss.physics.terrainBodies][0];return body&&this.boss.physics.world.bodies.includes(body)?{height:this.boss.physics.terrainHeight(p.x,p.z),body}:null;});this.root=new THREE.Group();this.root.name='ARGUS quake pylons';attacks.root.add(this.root);this.stakeGeometry=new THREE.CylinderGeometry(.35,.65,1,6);this.coreGeometry=new THREE.IcosahedronGeometry(1,1);this.ringGeometry=new THREE.RingGeometry(.94,1,80);this.waveGeometry=new THREE.PlaneGeometry(2,2);this.members=[];this.falling=[];this.previous=new Map();this.serial=0;this.resetStats();}
 resetStats(){this.stats={placed:0,pulses:0,heroHits:0,busHits:0,busDamage:0,destroyed:0,groundLost:0};}
 ground(point){const g=this.getGround(point);return g&&Number.isFinite(g.height)?g:null;}
 supportAlive(g){const s=g.section;return (!s||s.state==='intact'&&!s.hidden&&!s.collisionDisabled&&s.hp>0)&&(!g.body||g.body.collisionResponse!==false&&g.body.collisionFilterMask!==0&&this.boss.physics.world.bodies.includes(g.body));}
 valid(point,{spacing=true}={}){const c=this.config,m=this.boss.getConvoy()?.config.map,b=m?.bounds;if(!b||point.x<b.minX+c.radius||point.x>b.maxX-c.radius||point.z<b.minZ+c.radius||point.z>b.maxZ-c.radius)return null;
  const ground=this.ground(point);if(!ground||!this.supportAlive(ground))return null;
  if(this.attacks.getBuildings().some(b=>Math.abs(b.x-point.x)<5+c.radius&&Math.abs(b.z-point.z)<5+c.radius))return null;
  if(traceImpact({x:point.x,y:ground.height+.2,z:point.z},{x:point.x,y:ground.height+c.height,z:point.z},{sections:this.boss.physics.chunks,ground:false,radius:c.radius}))return null;
  if(spacing&&this.members.some(p=>p.point.distanceTo(new THREE.Vector3(point.x,ground.height,point.z))<c.minimumSpacing))return null;
  return ground;
 }
 choose(){const c=this.config,convoy=this.boss.getConvoy();if(!c?.enabled||this.members.length>=c.maximumActive||!convoy?.activeBuses.length)return null;
  const current=Math.max(0,Math.min(...convoy.activeBuses.map(bus=>convoy.distance-bus.index*convoy.config.busSpacing))),future=Math.min(convoy.length,predictConvoyDistance(convoy,c.predictionSeconds)),candidates=[];
  const add=(point,distance,route)=>{const range=Math.hypot(point.x-this.boss.root.position.x,point.z-this.boss.root.position.z);if(range<c.minimumBossDistance||range>c.maximumRange)return;const ground=this.valid(point);if(!ground)return;candidates.push({point:new THREE.Vector3(point.x,ground.height,point.z),ground,score:(route?0:10000)+Math.abs(distance-future)+range*.1});};
  const distances=new Set([current,convoy.length,...convoy.config.map.pickups.filter(p=>p.distance>=current).map(p=>p.distance)]);for(let d=current;d<convoy.length;d+=c.sampleSpacing)distances.add(d);
  for(const d of distances){const p=routePoint(convoy.config.map.route,d);for(const side of[1,-1])add({x:p.x+Math.cos(p.yaw)*c.routeOffset*side,z:p.z-Math.sin(p.yaw)*c.routeOffset*side},d,true);}
  if(!candidates.length){const lanes=convoy.config.map.interceptionLanes;for(const [i,j]of lanes.links){const a=lanes.nodes[i],b=lanes.nodes[j],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<=length;d+=c.sampleSpacing)add({x:a[0]+(b[0]-a[0])*d/length,z:a[1]+(b[1]-a[1])*d/length},future,false);}}
  return candidates.sort((a,b)=>a.score-b.score)[0]||null;
 }
 prepare(target){const c=this.config,material=new THREE.MeshStandardMaterial({color:'#46594b',roughness:.7,metalness:.6}),glow=new THREE.MeshStandardMaterial({color:'#ffc658',emissive:'#ff9a21',emissiveIntensity:2}),root=new THREE.Group();root.position.copy(target.point);const shaft=new THREE.Mesh(this.stakeGeometry,material);shaft.scale.y=c.height;shaft.position.y=c.height*.5;root.add(shaft);const core=new THREE.Mesh(this.coreGeometry,glow);core.scale.set(c.radius,c.radius*.7,c.radius);core.position.y=c.height*.72;root.add(core);root.visible=false;
  const warning=new THREE.Mesh(this.ringGeometry,new THREE.MeshBasicMaterial({color:'#ffbd59',transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}));warning.rotation.x=-Math.PI/2;warning.position.copy(target.point).y+=.04;warning.scale.setScalar(c.warningRadius);this.root.add(root,warning);
  const p={id:'argus-pylon-'+this.serial++,point:target.point.clone(),ground:target.ground,root,core,material,glow,warning,stage:'placing',rings:[],charge:null,nextPulse:0,lastScale:this.boss.cooldownScale,age:0};this.members.push(p);return p;
 }
 land(p){if(!this.members.includes(p))return;const ground=this.valid(p.point,{spacing:false});if(!ground||!this.supportAlive(p.ground)){this.remove(p,true);return;}p.stage='active';p.root.visible=true;p.root.position.copy(p.point);p.warning.visible=false;p.impact=0;this.stats.placed++;
  const entity={root:p.root,evac:true,faction:'argus',type:'quake-pylon',recordHit:()=>{},stun:()=>{}};p.unit=this.boss.damage.add(p.id,'robot',entity,this.config.health);p.unit.shapes=[{part:'quake-pylon',center:{x:p.point.x,y:p.point.y+this.config.height*.5,z:p.point.z},half:{x:this.config.radius,y:this.config.height*.5,z:this.config.radius}}];this.boss.onStomp(p.point.clone());
 }
 ring(p){const c=this.config,mesh=new THREE.Mesh(this.waveGeometry,new THREE.ShaderMaterial({uniforms:{radius:{value:.01},width:{value:c.ringWidth},color:{value:new THREE.Color('#ffc966')},opacity:{value:.9}},vertexShader:'varying vec2 vRing;void main(){vRing=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform float radius,width,opacity;uniform vec3 color;varying vec2 vRing;void main(){float d=length(vRing)*radius;if(d>radius||d<max(0.0,radius-width))discard;gl_FragColor=vec4(color,opacity);}',transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));mesh.rotation.x=-Math.PI/2;mesh.position.copy(p.point).y+=.06;mesh.scale.setScalar(.01);this.root.add(mesh);p.rings.push({mesh,age:0,previousRadius:0,radius:0,justBorn:true,hit:new Set()});this.stats.pulses++;this.boss.onSpark(p.point.clone());}
 removeRing(p,r){r.mesh.removeFromParent();r.mesh.material.dispose();p.rings=p.rings.filter(other=>other!==r);}
 remove(p,fall=false){if(!this.members.includes(p))return;for(const r of [...p.rings])this.removeRing(p,r);if(p.unit){p.unit.alive=false;p.unit.shapes=[];this.boss.damage.units=this.boss.damage.units.filter(u=>u!==p.unit);}p.warning.removeFromParent();p.warning.material.dispose();this.members=this.members.filter(other=>other!==p);p.charge=null;
  if(fall&&p.root.visible){p.fallAge=0;this.falling.push(p);}else this.dispose(p);
 }
 dispose(p){p.root.removeFromParent();p.material.dispose();p.glow.dispose();}
 disable(unit){const p=this.members.find(p=>p.unit===unit);if(!p)return false;this.stats.destroyed++;this.boss.onSpark(p.point.clone());this.remove(p,true);return true;}
 clear(){for(const p of [...this.members])this.remove(p);for(const p of this.falling)this.dispose(p);this.falling=[];this.previous.clear();this.serial=0;}
 update(dt,time){const c=this.config;for(const p of [...this.members]){const ground=this.ground(p.point);if(!ground||!this.supportAlive(p.ground)||!this.supportAlive(ground)||Math.abs(ground.height-p.point.y)>c.supportTolerance){this.stats.groundLost++;this.remove(p,true);continue;}
   if(p.stage!=='active')continue;
   if(p.lastScale!==this.boss.cooldownScale){p.nextPulse*=this.boss.cooldownScale/p.lastScale;p.lastScale=this.boss.cooldownScale;}
   p.nextPulse=Math.max(0,p.nextPulse-dt);if(p.nextPulse<1e-8)p.nextPulse=0;let startedCharge=false;if(!p.charge&&p.nextPulse===0){p.charge={age:0,duration:Math.max(.8,this.attacks.config.minimumTelegraph,c.charge)};startedCharge=true;this.attacks.charge('pylon-pulse',p.charge.duration);}
   if(p.charge){if(!startedCharge)p.charge.age+=dt;const f=Math.min(1,p.charge.age/p.charge.duration);p.glow.emissiveIntensity=2+5*f;p.warning.visible=true;p.warning.scale.setScalar(c.warningRadius*(.7+.3*f));p.warning.material.opacity=.2+.65*f;if(p.charge.age+1e-8>=p.charge.duration){const duration=p.charge.duration;p.charge=null;p.warning.visible=false;p.nextPulse=Math.max(0,c.pulseInterval*this.boss.cooldownScale-duration);this.ring(p);}}
   else p.glow.emissiveIntensity=1.5+Math.sin(time*6)*.5;
   for(const r of [...p.rings]){r.previousRadius=r.radius;if(r.justBorn)r.justBorn=false;else r.age+=dt;r.radius=Math.min(c.pulseRadius,r.age*c.pulseSpeed);r.mesh.scale.setScalar(Math.max(.01,r.radius));r.mesh.material.uniforms.radius.value=Math.max(.01,r.radius);r.mesh.material.uniforms.opacity.value=.9*Math.max(0,1-Math.max(0,r.age-c.pulseRadius/c.pulseSpeed)/c.fadeSeconds);if(r.age>=c.pulseRadius/c.pulseSpeed+c.fadeSeconds)this.removeRing(p,r);}
  }
  for(const p of [...this.falling]){p.fallAge+=dt;p.root.position.y-=c.fallGravity*p.fallAge*dt;p.root.rotation.z+=dt*2;if(p.fallAge>=c.fallSeconds){this.dispose(p);this.falling=this.falling.filter(other=>other!==p);}}
 }
 paintPlacement(p,progress){if(!this.members.includes(p))return;const c=this.config;p.warning.material.opacity=.25+.6*progress;p.warning.scale.setScalar(c.warningRadius*(.8+.2*progress));const drop=Math.max(0,(progress-(1-c.dropFraction))/c.dropFraction);p.root.visible=drop>0;p.root.position.y=p.point.y+c.dropHeight*(1-drop);}
 check(){const a=this.attacks,c=this.config,b=this.boss,heroes=a.heroes(),buses=b.getConvoy()?.activeBuses||[],entities=[...heroes,...buses];
  for(const p of this.members)for(const r of p.rings){if(r.previousRadius>=c.pulseRadius&&r.age>c.pulseRadius/c.pulseSpeed)continue;
   for(const e of entities){if(r.hit.has(e)||e.dash?.active)continue;const isBus=!!e.passengers,now=e.root.position,old=this.previous.get(e),serial=e.shuriken?.teleports??e.teleports??0,from=old&&old.serial===serial&&e.mode!=='teleporting'?old.position:now,t=isBus?quakeBusContact(from,now,p.point,r.previousRadius-c.ringWidth*.5,r.radius-c.ringWidth*.5,e.config.busWidth,e.config.busLength,e.root.rotation.y,c.ringWidth*.5):quakeRingContact(from,now,p.point,r.previousRadius-c.ringWidth*.5,r.radius-c.ringWidth*.5,c.ringWidth*.5+c.heroRadius);if(t===null)continue;
    const hit=new THREE.Vector3().copy(from).lerp(now,t),ground=this.ground(hit);if(!ground||(!isBus&&((e.motion?.body||e.motion)?.mode==='wall'||hit.y-ground.height>c.heroHeight)))continue;
    if(!a.clearSight(p.point.clone().addScaledVector(UP,.3),hit.clone().setY(ground.height+.3)))continue;r.hit.add(e);
    if(isBus){const damage=b.damage.hurt(e.unit,c.busDamage,hit);if(damage>0){this.stats.busHits++;this.stats.busDamage+=damage;}}
    else{a.hit(e,c.heroDamage,hit,'quake');a.impulse(e,hit.clone().sub(p.point),c.knockbackSpeed,c.knockbackUpward,{duration:c.impulseDuration,drag:c.impulseDrag});this.stats.heroHits++;}
   }
  }
  if(b.getConvoy()?.terminal){this.clear();return;}
  for(const e of entities)this.previous.set(e,{position:e.root.position.clone(),serial:e.shuriken?.teleports??e.teleports??0});for(const e of this.previous.keys())if(!entities.includes(e))this.previous.delete(e);
 }
 diagnostics(){return{stats:{...this.stats},stakes:this.members.map(p=>({id:p.id,stage:p.stage,health:p.unit?.health??null,position:p.point.toArray(),charge:p.charge?.age??null,nextPulse:p.nextPulse,rings:p.rings.map(r=>({radius:r.radius,age:r.age,hits:r.hit.size}))})),falling:this.falling.length};}
}
