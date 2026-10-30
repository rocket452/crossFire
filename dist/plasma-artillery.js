import {projectileSilhouette} from './projectile-silhouette.js?v=silhouette-49';
import * as THREE from './vendor/three.module.js';
import {segmentBoxFraction} from './combat-collision.js?v=robot-1';
export const PLASMA={gravity:5,warningSeconds:2.4,shotSpacing:1.6,blastRadius:7,projectileRadius:.65,maxShells:2};
// Exact 45-degree ballistic solution, evaluated analytically so the ground aim never drifts.
export function plasmaTrajectory(from,target,gravity=PLASMA.gravity){
 const dx=target.x-from.x,dz=target.z-from.z,range=Math.hypot(dx,dz),denominator=2*(range+from.y-target.y);if(range<1||denominator<=0)return null;
 const horizontal=Math.sqrt(gravity*range*range/denominator),duration=range/horizontal;
 return{from:{x:from.x,y:from.y,z:from.z},target:{...target},velocity:{x:dx/range*horizontal,y:horizontal,z:dz/range*horizontal},gravity,duration,apex:from.y+horizontal*horizontal/(2*gravity)};
}
export function plasmaPosition(p,time){return new THREE.Vector3(p.from.x+p.velocity.x*time,p.from.y+p.velocity.y*time-p.gravity*time*time/2,p.from.z+p.velocity.z*time);}
export class PlasmaArtillery {
 constructor(scene,{redirect=()=>null,getMuzzle,getTargets,isRobotAlive,targetKinds=['tank','infantry'],getGroundHeight=()=>.08,previewTrace=()=>null,traceWorld=()=>null,getBarriers=()=>[],onImpact=()=>{},onLaunch=()=>{},onEvent=()=>{}}){
  Object.assign(this,{redirect,scene,getMuzzle,getTargets,isRobotAlive,targetKinds,getGroundHeight,previewTrace,traceWorld,getBarriers,onImpact,onLaunch,onEvent});
  const material=(color,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1,blending:opacity<1?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:false,side:THREE.DoubleSide});
  this.coreGeometry=new THREE.IcosahedronGeometry(PLASMA.projectileRadius,1);this.coreMaterial=material('#d8fff1');this.haloMaterial=material('#17f4a0',.2);this.ringGeometry=new THREE.TorusGeometry(.95,.035,4,24);this.ringMaterial=material('#6affc1',.8);
  this.targetGeometry=new THREE.RingGeometry(.955,1,64);this.fillGeometry=new THREE.CircleGeometry(1,48);this.targetMaterial=material('#ff764d',.8);this.fillMaterial=material('#ff462b',.095);this.targetMaterial.depthTest=this.fillMaterial.depthTest=false;
  this.trailPool=new THREE.InstancedMesh(this.coreGeometry,this.haloMaterial,100);this.trailPool.frustumCulled=false;scene.add(this.trailPool);this.dummy=new THREE.Object3D();
  this.muzzleGlow=new THREE.Mesh(this.coreGeometry,this.haloMaterial);scene.add(this.muzzleGlow);this.reset();
 }
 reset(){for(const s of this.shells||[])this.removeShell(s);for(const w of this.waves||[]){this.scene.remove(w.mesh);w.mesh.material.dispose();}this.shells=[];this.waves=[];this.trails=[];this.trailPool.count=0;this.muzzleGlow.visible=false;this.clock=0;this.sequence=0;this.volleys=0;this.launched=0;this.impacts=0;this.blocked=0;this.cancelled=0;this.history=[];}
 get busy(){return this.shells.length>0;}
 createMarker(s){
  const group=new THREE.Group();group.position.set(s.target.x,s.target.y+.14,s.target.z);this.scene.add(group);
  const ground=new THREE.Group();ground.rotation.x=-Math.PI/2;group.add(ground);const outer=new THREE.Mesh(this.targetGeometry,this.targetMaterial);outer.scale.setScalar(PLASMA.blastRadius);ground.add(outer);const fill=new THREE.Mesh(this.fillGeometry,this.fillMaterial);fill.scale.setScalar(PLASMA.blastRadius);ground.add(fill);const inner=new THREE.Mesh(this.targetGeometry,this.targetMaterial);ground.add(inner);
  const points=[];for(let i=0;i<8;i++){const a=i*Math.PI/4,r=PLASMA.blastRadius;points.push(Math.cos(a)*r*.78,Math.sin(a)*r*.78,.03,Math.cos(a)*r*1.12,Math.sin(a)*r*1.12,.03);}for(const [x,y]of [[-1,0],[1,0],[0,-1],[0,1]])points.push(x*.5,y*.5,.03,x*2,y*2,.03);
  const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),ticks=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#ffe3ac',transparent:true,opacity:.9,toneMapped:false,depthTest:false}));ground.add(ticks);
  let label=null,texture=null;if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;texture=new THREE.CanvasTexture(canvas);const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false,toneMapped:false});label=new THREE.Sprite(material);label.position.y=1.4;label.scale.set(8,1.3,1);group.add(label);s.labelCanvas=canvas;}
  group.traverse(o=>o.renderOrder=8);if(label)label.renderOrder=10;return{group,inner,fill,ticks,geometry,label,texture,lastLabel:null};
 }
 removeShell(s){this.scene.remove(s.mesh,s.marker.group);s.marker.geometry.dispose();s.marker.ticks.material.dispose();if(s.marker.label)s.marker.label.material.dispose();s.marker.texture?.dispose();}
 buildShot(target,delay){
  const muzzle=this.getMuzzle(target),trajectory=plasmaTrajectory(muzzle.position,{...target,y:target.y+PLASMA.projectileRadius+.02});if(!trajectory)return null;
  // Reject existing cover on the intended arc. Newly falling debris can still intercept a live shell.
  let previous=new THREE.Vector3().copy(muzzle.position);for(let t=.08;t<trajectory.duration;t+=.08){const p=plasmaPosition(trajectory,t);if(this.previewTrace(previous,p))return null;previous=p;}
  const mesh=new THREE.Group(),core=new THREE.Mesh(this.coreGeometry,this.coreMaterial),halo=new THREE.Mesh(this.coreGeometry,this.haloMaterial);halo.scale.setScalar(2.2);projectileSilhouette(core,'#71ffd0',1.35);mesh.add(core,halo);const rings=[];for(let i=0;i<2;i++){const ring=new THREE.Mesh(this.ringGeometry,this.ringMaterial);mesh.add(ring);rings.push(ring);}mesh.visible=false;this.scene.add(mesh);
  const s={id:'plasma-'+(++this.sequence),state:'warning',target:{...target},trajectory,launchAt:this.clock+delay,impactAt:this.clock+delay+trajectory.duration,createdAt:this.clock,age:0,mesh,core,halo,rings,position:new THREE.Vector3().copy(muzzle.position),trailClock:0};s.marker=this.createMarker(s);return s;
 }
 beginVolley(){
  if(this.busy||!this.isRobotAlive())return false;const targets=this.getTargets().filter(u=>u.alive&&this.targetKinds.includes(u.kind)&&u.shapes?.length);if(!targets.length)return false;
  const selected=[];for(let i=0;i<2;i++){const kind=i===0?'tank':'infantry',team=this.volleys%2,candidates=[...targets.filter(u=>u.kind===kind&&u.entity.team===team),...targets.filter(u=>u.kind===kind),...targets];for(const u of candidates){const center=u.shapes[0].center,target={x:center.x,y:this.getGroundHeight(center.x,center.z),z:center.z};if(selected.some(s=>Math.hypot(s.target.x-target.x,s.target.z-target.z)<PLASMA.blastRadius*2))continue;const s=this.buildShot(target,PLASMA.warningSeconds+i*PLASMA.shotSpacing);if(s){selected.push(s);break;}}}
  this.shells.push(...selected);if(!selected.length)return false;this.volleys++;this.onEvent('Plasma artillery locking ground targets. Clear the marked blast zones.');return true;
 }
 threats(){return this.shells.map(s=>({id:s.id,kind:'plasma',alive:true,position:s.position,velocity:s.state==='flying'?new THREE.Vector3(s.trajectory.velocity.x,s.trajectory.velocity.y-PLASMA.gravity*s.age,s.trajectory.velocity.z):new THREE.Vector3(),impactPoint:{...s.target},timeToImpact:Math.max(0,s.impactAt-this.clock),blastRadius:PLASMA.blastRadius,owner:'siege-walker'}));}
 traceSegment(from,to,radius){
  let hit=this.traceWorld(from,to,radius),nearest=hit?(hit.t??new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z).distanceTo(from)/Math.max(1e-8,from.distanceTo(to))):Infinity;
  for(const barrier of this.getBarriers()){if(!barrier.active||barrier.half.x<=0)continue;const t=barrier.trace?barrier.trace(from,to,radius):segmentBoxFraction(from,to,barrier.center,barrier.half,barrier.rotation,radius);if(t!==null&&t<nearest){nearest=t;hit={kind:'ice-barrier',barrier,t,point:{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t}};}}
  return hit;
 }
 update(dt,time){
  this.clock+=dt;this.muzzleGlow.visible=false;
  for(let i=this.shells.length-1;i>=0;i--){const s=this.shells[i];
   if(s.state==='warning'){
    if(!this.isRobotAlive()){this.removeShell(s);this.shells.splice(i,1);this.cancelled++;continue;}
    const muzzle=this.getMuzzle(s.target);s.position.copy(muzzle.position);this.muzzleGlow.visible=true;this.muzzleGlow.position.copy(muzzle.position);this.muzzleGlow.scale.setScalar(.5+Math.min(1,(this.clock-s.createdAt)/PLASMA.warningSeconds)*1.8);
    if(this.clock>=s.launchAt-1e-9&&muzzle.aligned===false){s.launchAt+=dt;s.impactAt+=dt;}
    if(this.clock>=s.launchAt-1e-9&&muzzle.aligned!==false){s.trajectory=plasmaTrajectory(muzzle.position,{...s.target,y:s.target.y+PLASMA.projectileRadius+.02});s.impactAt=this.clock+s.trajectory.duration;s.state='flying';s.age=0;s.justLaunched=true;s.position.copy(muzzle.position);s.mesh.visible=true;this.launched++;this.onLaunch(s.position);}
   }
   if(s.state==='flying'){
    let hit=null,remaining=s.justLaunched?0:dt;s.justLaunched=false;while(remaining>1e-9&&!hit&&s.age<s.trajectory.duration){const h=Math.min(remaining,1/90,s.trajectory.duration-s.age),end=plasmaPosition(s.trajectory,s.age+h);const transit=this.redirect(s,s.position,end);if(transit){const old=s.trajectory,v=new THREE.Vector3(old.velocity.x,old.velocity.y-old.gravity*s.age,old.velocity.z),velocity=transit.direction.clone().multiplyScalar(v.length()),from=transit.position,ground=this.getGroundHeight(from.x,from.z)+PLASMA.projectileRadius,duration=Math.max(.1,(velocity.y+Math.sqrt(velocity.y*velocity.y+2*old.gravity*Math.max(.1,from.y-ground)))/old.gravity);s.trajectory={from:{...from},velocity:{...velocity},gravity:old.gravity,duration,apex:from.y+Math.max(0,velocity.y)**2/(2*old.gravity)};const target=plasmaPosition(s.trajectory,duration);s.target={x:target.x,y:this.getGroundHeight(target.x,target.z),z:target.z};s.trajectory.target=s.target;s.position.copy(from);s.age=0;s.impactAt=this.clock+duration;s.marker.group.position.set(s.target.x,s.target.y+.14,s.target.z);remaining=0;break;}hit=this.traceSegment(s.position,end,PLASMA.projectileRadius);s.age+=h;remaining-=h;if(hit)s.position.set(hit.point.x,hit.point.y,hit.point.z);else s.position.copy(end);}
    s.mesh.position.copy(s.position);s.core.rotation.set(time*4,time*6,time*3);s.halo.scale.setScalar(2.2+Math.sin(time*17)*.2);s.rings.forEach((ring,j)=>ring.rotation.set(time*(5+j),time*(3-j),time*4+j));
    s.trailClock-=dt;if(s.trailClock<=0){this.trails.push({position:s.position.clone(),life:.6});this.trails=this.trails.slice(-100);s.trailClock=.045;}
    if(hit||s.age>=s.trajectory.duration-1e-8){if(hit?.kind==='ice-barrier'&&hit.barrier.onHit(s.position,s)!==false){this.blocked++;this.history.push({id:s.id,planned:{...s.target},actual:s.position.toArray(),early:true,blocked:true,barrier:hit.barrier.id});this.history=this.history.slice(-12);this.removeShell(s);this.shells.splice(i,1);continue;}if(!hit)s.position.copy(s.target);else if(hit.kind==='ground')s.position.y=this.getGroundHeight(s.position.x,s.position.z);this.onImpact(s.position,hit,PLASMA.blastRadius,s.id);this.impacts++;this.history.push({id:s.id,planned:{...s.target},actual:s.position.toArray(),early:!!hit&&s.age<s.trajectory.duration-.1});this.history=this.history.slice(-12);const mesh=new THREE.Mesh(this.targetGeometry,this.ringMaterial.clone());mesh.rotation.x=-Math.PI/2;mesh.position.copy(s.position).add(new THREE.Vector3(0,.16,0));this.scene.add(mesh);this.waves.push({mesh,age:0});this.removeShell(s);this.shells.splice(i,1);continue;}
   }
   const remaining=Math.max(0,s.impactAt-this.clock),duration=s.impactAt-s.createdAt;s.marker.inner.scale.setScalar(PLASMA.blastRadius*Math.max(.07,remaining/duration));s.marker.fill.scale.setScalar(PLASMA.blastRadius*(.96+.04*Math.sin(time*8)));const label=remaining.toFixed(1);if(s.marker.label&&s.marker.lastLabel!==label){const c=s.labelCanvas.getContext('2d');c.clearRect(0,0,512,80);c.fillStyle='rgba(55,17,18,.87)';c.fillRect(0,0,512,80);c.fillStyle='#ffe1b4';c.font='bold 38px sans-serif';c.textAlign='center';c.fillText('PLASMA  '+label+' s',256,54);s.marker.texture.needsUpdate=true;s.marker.lastLabel=label;}
  }
  let count=0;for(let i=this.trails.length-1;i>=0;i--){const p=this.trails[i];p.life-=dt;if(p.life<=0){this.trails.splice(i,1);continue;}this.dummy.position.copy(p.position);this.dummy.quaternion.identity();this.dummy.scale.setScalar(.55*p.life/.6);this.dummy.updateMatrix();this.trailPool.setMatrixAt(count++,this.dummy.matrix);}this.trailPool.count=count;this.trailPool.instanceMatrix.needsUpdate=true;
  for(let i=this.waves.length-1;i>=0;i--){const w=this.waves[i];w.age+=dt;w.mesh.scale.setScalar(.4+PLASMA.blastRadius*w.age/.8);w.mesh.material.opacity=.8*(1-w.age/.8);if(w.age>=.8){this.scene.remove(w.mesh);w.mesh.material.dispose();this.waves.splice(i,1);}}
 }
 diagnostics(){return{volleys:this.volleys,launched:this.launched,impacts:this.impacts,blocked:this.blocked,cancelled:this.cancelled,active:this.shells.length,busy:this.busy,blastRadius:PLASMA.blastRadius,history:this.history.map(s=>({...s})),shells:this.shells.map(s=>({id:s.id,state:s.state,position:s.position.toArray(),target:{...s.target},eta:Math.max(0,s.impactAt-this.clock),apex:s.trajectory.apex,launchDegrees:45,marker:s.marker.group.position.toArray()}))};}
}
