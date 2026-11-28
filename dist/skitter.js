import * as THREE from './vendor/three.module.js';
import {EvacRaider} from './evac-raider.js?v=421';
import {COMBAT_ARENA} from './combat-arena-config.js?v=mireguard-pairs-260';
import {SKITTER} from './skitter-config.js?v=479';
import {SkitterModel} from './skitter-model.js?v=479';
// Skitter: a four-legged melee hunter on the user-supplied quadruped robot. It always moves on a surface,
// either the street, a building wall or a roof. Heroes standing on a roof are reached by climbing the nearest
// wall face and mantling over the edge; a building in the way is climbed over; from a roof it leaps after a
// hero who has left it. Close up it strikes with its front claws; at mid range it pounces.
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),UP=new THREE.Vector3(0,1,0),clamp=THREE.MathUtils.clamp,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const basis=new THREE.Matrix4();
function frameQuat(up,forward,out=new THREE.Quaternion()){
 const y=up.clone().normalize(),z=forward.clone().addScaledVector(y,-forward.dot(y));if(z.lengthSq()<1e-6)z.set(0,0,1).addScaledVector(y,-y.z);z.normalize();
 const x=new THREE.Vector3().crossVectors(y,z).normalize();return out.setFromRotationMatrix(basis.makeBasis(x,y,z));
}
const additive=color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});

export class Skitter extends EvacRaider{
 constructor(scene,damage,options={}){
  const c=options.config||SKITTER;
  if(!options.skitterModel)throw Error('Skitter asset missing');
  super(scene,damage,{heroRange:c.heroRange,weaponRange:c.heroRange,maxHealth:c.health,moveSpeed:c.speed,initialCooldown:c.firstStrike,...options,enhancedModel:false});
  Object.assign(this,{config:c,type:'skitter',getBuildingBoxes:options.getBuildingBoxes||(()=>[]),groundHeight:options.groundHeight||(()=>.1),
   bounds:options.bounds||COMBAT_ARENA.movementBounds,peers:options.peers||(()=>[])});
  this.root.clear();this.root.scale.setScalar(1);this.root.name='Skitter';
  this.model=new SkitterModel(options.skitterModel,c.span);this.root.add(this.model.root);
  // EvacRaider plumbing expects these handles; the Skitter animates its own rig.
  const stub=()=>new THREE.Group();this.parts={body:stub(),arm_r:stub(),arm_l:stub(),head:stub(),reactor:stub()};
  this.tracks={root:this.model.root,reset(){},update(){},diagnostics:()=>({type:'skitter-legs',count:4})};
  // Telegraphs: a ring that fills where a pounce will land, and a claw slash crescent.
  this.ring=new THREE.Mesh(new THREE.RingGeometry(.86,1,48),additive('#ff2f7a'));this.ringFill=new THREE.Mesh(new THREE.CircleGeometry(1,40),additive('#ff1f5a'));
  for(const m of[this.ring,this.ringFill]){m.rotation.x=-Math.PI/2;m.renderOrder=4;m.visible=false;scene.add(m);}
  const arc=new THREE.RingGeometry(1.2,2.2,24,1,-Math.PI*.42,Math.PI*.84);arc.rotateX(-Math.PI/2);arc.rotateY(Math.PI/2);
  this.slash=new THREE.Mesh(arc,additive('#ff5ad9'));this.slash.renderOrder=4;this.slash.visible=false;this.root.add(this.slash);
  this.restMaterials=[];const seen=new Set();this.model.root.traverse(o=>{for(const m of o.isMesh?[].concat(o.material):[])if(m.isMeshStandardMaterial&&!seen.has(m)){seen.add(m);this.restMaterials.push({m,color:m.color.clone(),emissive:m.emissive?.clone(),intensity:m.emissiveIntensity});}});
  this.reset();
 }
 // ---- lifecycle --------------------------------------------------------------------------------------
 reset(){
  super.reset();if(!this.model)return;
  this.warning.visible=false;this.model.reset();
  Object.assign(this,{surface:{kind:'ground'},mode:'chase',clock:0,heading:V(0,0,1),velocity:V(),feet:null,stepPair:0,stepClock:0,air:null,mantle:null,
   strikeHit:false,pounceCooldown:1.5,flinch:0,targetGrace:0,boxCache:null,boxAge:-1,deathAge:0,slashAge:Infinity,lookAt:null,bob:0,climbStart:null});
  this.stats={climbs:0,mantles:0,leaps:0,strikes:0,pounces:0,hits:0,falls:0};
  const y=this.groundHeight(this.root.position.x,this.root.position.z);this.root.position.y=y;this.root.quaternion.identity();
  this.ring.visible=this.ringFill.visible=this.slash.visible=false;
 }
 spawn(){const ok=super.spawn();if(ok){this.combatUnit.maxHealth=this.combatUnit.health=this.config.health;this.sync();this.onEvent('Skitter hunting.');}return ok;}
 get up(){return this.surface.kind==='wall'?this.surface.normal:UP;}
 aimPoint(){return this.model.point('body');}
 // A hunter: it tracks any hero in range, through walls, and keeps a target briefly through dash phasing.
 canAcquireHero(unit,distance){return distance<=this.heroRange;}
 selectTarget(origin){
  const units=this.getTargets(origin).filter(u=>u.alive&&u.kind==='hero'&&!u.dashPhased&&u.shapes?.length);
  const current=units.find(u=>u===this.target||u.entity&&u.entity===this.target?.entity);
  if(current){this.target=current;this.targetGrace=1;return current;}
  if(this.target&&this.targetGrace>0)return this.target;
  const d=u=>origin.distanceTo(V().copy(u.shapes[0].center));this.target=units.filter(u=>d(u)<=this.heroRange||this.isAlertedTo(u.entity)).sort((a,b)=>d(a)-d(b))[0]||null;return this.target;
 }
 // ---- world queries ------------------------------------------------------------------------------------
 boxes(){if(!this.boxCache||this.age-this.boxAge>.5){this.boxCache=this.getBuildingBoxes()||[];this.boxAge=this.age;}return this.boxCache;}
 boxById(id){return this.boxes().find(b=>b.id===id)||null;}
 inside(b,x,z,pad=0){return x>b.minX-pad&&x<b.maxX+pad&&z>b.minZ-pad&&z<b.maxZ+pad;}
 targetFeet(){const e=this.target?.entity;return e?.root?.position?V().copy(e.root.position):this.target?V().copy(this.target.shapes[0].center).add(V(0,-1.4,0)):null;}
 heroSurface(feet){const c=this.config.climb,ground=this.groundHeight(feet.x,feet.z);if(feet.y<ground+c.heroAbove)return{kind:'ground'};
  const box=this.boxes().find(b=>this.inside(b,feet.x,feet.z,.4)&&Math.abs(feet.y-b.top)<c.roofTolerance);return box?{kind:'roof',box}:{kind:'air'};}
 // Wall faces of a box: plane coordinate, outward normal, tangent extents.
 faces(b){return[{axis:'x',sign:-1,coord:b.minX,normal:V(-1,0,0),min:b.minZ,max:b.maxZ},{axis:'x',sign:1,coord:b.maxX,normal:V(1,0,0),min:b.minZ,max:b.maxZ},
  {axis:'z',sign:-1,coord:b.minZ,normal:V(0,0,-1),min:b.minX,max:b.maxX},{axis:'z',sign:1,coord:b.maxZ,normal:V(0,0,1),min:b.minX,max:b.maxX}];}
 faceGoal(b,from,toward){const m=this.config.climb.edgeMargin;let best=null;
  for(const f of this.faces(b)){const t=clamp(f.axis==='x'?(toward??from).z:(toward??from).x,f.min+m,f.max-m),p=f.axis==='x'?V(f.coord,0,t):V(t,0,f.coord);
   const outside=(f.axis==='x'?from.x-f.coord:from.z-f.coord)*f.sign>-.5,score=Math.hypot(p.x-from.x,p.z-from.z)+(outside?0:40);if(!best||score<best.score)best={face:f,point:p,score};}
  return best;}
 // First building the straight path enters (slab test in XZ, expanded by the body radius).
 blocking(from,to){const r=this.config.bodyRadius*.6,d=V(to.x-from.x,0,to.z-from.z),len=d.length();if(len<.01)return null;let best=null;
  for(const b of this.boxes()){if(b.top<from.y+2.5)continue;let t0=0,t1=len;const dir=d.clone().divideScalar(len);let ok=true;
   for(const [o,dd,lo,hi]of[[from.x,dir.x,b.minX-r,b.maxX+r],[from.z,dir.z,b.minZ-r,b.maxZ+r]]){if(Math.abs(dd)<1e-6){if(o<lo||o>hi){ok=false;break;}continue;}let a=(lo-o)/dd,c=(hi-o)/dd;if(a>c)[a,c]=[c,a];t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1){ok=false;break;}}
   if(ok&&t0<len&&(!best||t0<best.t))best={box:b,t:t0,point:from.clone().addScaledVector(dir,t0)};}
  return best;}
 // ---- update -------------------------------------------------------------------------------------------
 update(dt,time){
  if(!this.spawned)return;this.age+=dt;
  if(this.dead){this.updateDeath(dt,time);return;}
  dt=Math.min(dt,.1);const c=this.config;this.stunRemaining=Math.max(0,this.stunRemaining-dt);this.flinch=Math.max(0,this.flinch-dt);this.cooldown=Math.max(0,this.cooldown-dt);this.pounceCooldown=Math.max(0,this.pounceCooldown-dt);this.targetGrace=Math.max(0,this.targetGrace-dt);
  this.selectTarget(this.aimPoint());const feet=this.targetFeet();this.lookAt=this.target?V().copy(this.target.shapes[0].center):null;
  const before=this.root.position.clone();this.clock+=dt;
  if(this.air)this.updateAir(dt);
  else if(this.mantle)this.updateMantle(dt);
  else if(this.stunRemaining>0){this.mode='stunned';if(this.surface.kind!=='wall')this.settle();}
  else if(this.surface.kind==='wall')this.updateClimb(dt,feet);
  else if(this.mode==='strike')this.updateStrike(dt,feet);
  else if(this.mode==='pounce')this.updatePounce(dt,feet);
  else if(this.mode==='recover'){if(this.clock>=c.pounce.recover)this.setMode('chase');this.settle();}
  else this.updateChase(dt,feet);
  if(!this.air&&!this.mantle&&this.surface.kind!=='wall')this.separate();
  this.validateSurface();
  this.velocity.copy(this.root.position).sub(before).divideScalar(Math.max(dt,1e-4));
  this.orient(dt);this.animate(dt,time);this.updateFX(dt,time);this.sync();
 }
 setMode(mode){this.mode=mode;this.clock=0;}
 settle(){if(this.surface.kind==='ground')this.root.position.y=this.groundHeight(this.root.position.x,this.root.position.z);else if(this.surface.kind==='roof')this.root.position.y=this.surface.box.top;}
 turnToward(dir,dt){const flat=dir.clone().addScaledVector(this.up,-dir.dot(this.up));if(flat.lengthSq()<1e-6)return 1;flat.normalize();
  const angle=this.heading.angleTo(flat),step=Math.min(1,this.config.turnRate*dt/Math.max(angle,1e-4));if(angle>1e-4){const axis=V().crossVectors(this.heading,flat);if(axis.lengthSq()<1e-8)axis.copy(this.up);axis.normalize();this.heading.applyAxisAngle(axis,angle*step).normalize();}
  return this.heading.dot(flat);}
 walk(goal,dt,speed,stop=.3){const p=this.root.position,dir=V(goal.x-p.x,0,goal.z-p.z),dist=dir.length();if(dist<stop){this.turnToward(dir,dt);this.settle();return dist;}const facing=this.turnToward(dir,dt);
  const move=Math.min(dist-stop*.9,speed*dt*clamp((facing+.25)/1.1,.1,1));p.addScaledVector(V(this.heading.x,0,this.heading.z).normalize(),move);
  if(this.surface.kind==='roof'){const b=this.surface.box,m=.6;p.x=clamp(p.x,b.minX+m,b.maxX-m);p.z=clamp(p.z,b.minZ+m,b.maxZ-m);}
  else{p.x=clamp(p.x,this.bounds.minX,this.bounds.maxX);p.z=clamp(p.z,this.bounds.minZ,this.bounds.maxZ);}
  this.separate();this.settle();return dist;}
 separate(){const p=this.root.position,c=this.config;for(const o of this.peers()){if(o===this||!o.spawned||o.dead||o.surface?.kind!==this.surface.kind)continue;const d=V(p.x-o.root.position.x,0,p.z-o.root.position.z),len=d.length();if(len>1e-3&&len<c.separation&&Math.abs(p.y-o.root.position.y)<2){const push=d.normalize().multiplyScalar((c.separation-len)*.5);p.add(push);if(!o.air&&!o.mantle)o.root.position.sub(push);}}
  if(this.surface.kind==='roof'){const b=this.surface.box;p.x=clamp(p.x,b.minX+.6,b.maxX-.6);p.z=clamp(p.z,b.minZ+.6,b.maxZ-.6);}}
 updateChase(dt,feet){const c=this.config,p=this.root.position;this.mode='chase';
  if(!feet){this.settle();return;}
  const hs=this.heroSurface(feet),onRoof=this.surface.kind==='roof';
  // Same level as the hero: close in and attack.
  const sameRoof=onRoof&&hs.kind==='roof'&&hs.box.id===this.surface.box.id,sameGround=!onRoof&&hs.kind!=='roof';
  if(sameRoof||sameGround){
   const block=sameGround?this.blocking(p,feet):null;
   if(block&&block.t<c.climb.reach+c.bodyRadius){this.startClimb(block.box,this.faceGoal(block.box,p,feet));return;}
   const dist=Math.hypot(feet.x-p.x,feet.z-p.z);
   if(this.cooldown<=0&&dist<=c.strike.range&&Math.abs(feet.y-p.y)<2.4){this.startStrike();return;}
   if(this.pounceCooldown<=0&&dist>=c.pounce.min&&dist<=c.pounce.max&&!block&&Math.abs(feet.y-p.y)<1.5){this.startPounce(feet);return;}
   this.walk(block?block.point:feet,dt,onRoof?c.roofSpeed:c.speed,block?.3:c.strike.range*.6);return;}
  if(!onRoof){
   // Hero on a roof (or in the air above one): run at the nearest wall face and climb.
   const box=hs.kind==='roof'?hs.box:this.blocking(p,feet)?.box;if(!box){this.walk(feet,dt,c.speed);return;}
   const goal=this.faceGoal(box,p,feet),f=goal.face,gap=(f.axis==='x'?p.x-f.coord:p.z-f.coord)*f.sign;
   if(gap<=c.climb.reach+c.bodyRadius*.4&&gap>-1)this.startClimb(box,goal);else this.walk(goal.point.clone().addScaledVector(f.normal,c.bodyRadius*.3),dt,c.speed);return;}
  // On a roof without the hero: go to the edge nearest them and leap.
  const b=this.surface.box,m=.7,edge=V(clamp(feet.x,b.minX+m,b.maxX-m),b.top,clamp(feet.z,b.minZ+m,b.maxZ-m));
  if(this.inside(b,feet.x,feet.z,-m)){const d=[edge.x-b.minX,b.maxX-edge.x,edge.z-b.minZ,b.maxZ-edge.z],k=d.indexOf(Math.min(...d));if(k===0)edge.x=b.minX+m;else if(k===1)edge.x=b.maxX-m;else if(k===2)edge.z=b.minZ+m;else edge.z=b.maxZ-m;}
  if(this.walk(edge,dt,c.roofSpeed)<c.leap.edgeReach)this.leapToward(feet,hs);
 }
 // ---- climbing -----------------------------------------------------------------------------------------
 startClimb(box,goal){const f=goal.face,p=this.root.position;this.surface={kind:'wall',box,face:f,normal:f.normal.clone()};this.stats.climbs++;
  if(f.axis==='x')p.x=f.coord;else p.z=f.coord;p.y=Math.max(p.y,this.groundHeight(p.x,p.z)+.6);this.heading.copy(UP);this.setMode('climb');this.climbStart=p.y;}
 updateClimb(dt,feet){const c=this.config,s=this.surface,b=this.boxById(s.box.id),p=this.root.position;this.mode='climb';
  if(!b||b.top<p.y-1){this.fall();return;}s.box=b;
  p.y+=c.climbSpeed*dt;const f=s.face,m=c.climb.edgeMargin;
  if(feet){const along=f.axis==='x'?'z':'x',want=clamp(feet[along],f.min+m,f.max-m);p[along]+=clamp(want-p[along],-c.lateralClimb*dt,c.lateralClimb*dt);}
  this.heading.copy(UP);
  if(p.y>=b.top-.2){this.mantle={from:p.clone(),to:p.clone().addScaledVector(f.normal,-c.bodyRadius*1.3).setY(b.top),t:0,box:b};this.surface={kind:'roof',box:b};this.heading.copy(f.normal).negate();this.stats.mantles++;}
 }
 updateMantle(dt){const m=this.mantle;m.t+=dt/this.config.climb.mantle;const t=smooth(m.t);this.root.position.lerpVectors(m.from,m.to,t);this.root.position.y+=Math.sin(t*Math.PI)*.6;this.mode='mantle';if(m.t>=1){this.root.position.copy(m.to);this.mantle=null;this.setMode('chase');}}
 // ---- leaping, falling ---------------------------------------------------------------------------------
 leapToward(feet,hs){const c=this.config.leap,p=this.root.position,dir=V(feet.x-p.x,0,feet.z-p.z),dist=dir.length();dir.normalize();
  let to,surface;
  if(hs.kind==='roof'&&dist<=c.maxDistance){to=V(clamp(feet.x,hs.box.minX+.8,hs.box.maxX-.8),hs.box.top,clamp(feet.z,hs.box.minZ+.8,hs.box.maxZ-.8));surface={kind:'roof',box:hs.box};}
  else{const reach=Math.min(Math.max(dist-2,4),c.maxDistance);to=p.clone().addScaledVector(dir,reach);to.y=this.groundHeight(to.x,to.z);surface={kind:'ground'};
   const block=this.boxes().find(b=>this.inside(b,to.x,to.z,1)&&b.top>to.y+2);if(block){to=p.clone().addScaledVector(dir,this.config.bodyRadius*2.2);to.y=this.groundHeight(to.x,to.z);}}
  this.launch(to,surface,false);this.stats.leaps++;}
 launch(to,surface,pounce){const c=this.config.leap,p=this.root.position,dist=p.distanceTo(to),T=clamp(dist/(pounce?this.config.pounce.speed:c.speed),c.minTime,c.maxTime);
  this.air={from:p.clone(),to:to.clone(),t:0,T,arc:(pounce?this.config.pounce.height:Math.max(c.arcMin,dist*c.arc))+Math.max(0,to.y-p.y)*.25,surface,pounce};
  const flat=V(to.x-p.x,0,to.z-p.z);if(flat.lengthSq()>1e-4)this.heading.copy(flat.normalize());this.surface={kind:'air',landing:surface};this.setMode(pounce?'pounce-air':'air');}
 fall(){const p=this.root.position;this.stats.falls++;this.launch(V(p.x,this.groundHeight(p.x,p.z),p.z).addScaledVector(this.surface.normal||V(),1.5),{kind:'ground'},false);}
 updateAir(dt){const a=this.air;a.t+=dt/a.T;const t=Math.min(1,a.t);this.root.position.lerpVectors(a.from,a.to,t);this.root.position.y+=a.arc*4*t*(1-t);this.mode=a.pounce?'pounce-air':'air';
  if(t>=1){this.root.position.copy(a.to);this.surface=a.surface.kind==='roof'?{kind:'roof',box:a.surface.box}:{kind:'ground'};this.air=null;this.settle();this.energyEffects?.impact(this.root.position.clone().add(V(0,.3,0)),UP,a.pounce?1.2:.8);
   if(a.pounce){this.pounceImpact();this.setMode('recover');}else this.setMode('chase');}}
 validateSurface(){if(this.surface.kind!=='roof'||this.mantle||this.air)return;const b=this.boxById(this.surface.box.id);if(!b||Math.abs(b.top-this.surface.box.top)>1.5||!this.inside(b,this.root.position.x,this.root.position.z,.2)){this.surface={kind:'roof',box:this.surface.box,normal:UP};this.fall();}else this.surface.box=b;}
 // ---- attacks ------------------------------------------------------------------------------------------
 startStrike(){this.setMode('strike');this.strikeHit=false;this.stats.strikes++;}
 updateStrike(dt,feet){const c=this.config.strike,t=this.clock;
  if(feet&&t<c.windup)this.turnToward(V(feet.x-this.root.position.x,0,feet.z-this.root.position.z),dt*1.6);
  if(t>=c.windup&&t<c.windup+c.active){const p=this.root.position,step=V(this.heading.x,0,this.heading.z).normalize().multiplyScalar(c.lunge*dt/c.active);p.add(step);if(this.surface.kind==='roof'){const b=this.surface.box;p.x=clamp(p.x,b.minX+.6,b.maxX-.6);p.z=clamp(p.z,b.minZ+.6,b.maxZ-.6);}
   if(!this.strikeHit){this.strikeHit=true;this.slashAge=0;this.clawHit(this.clawPoint(),c.hit,c.damage,c.knock,c.lift,c.cone);}}
  this.settle();if(t>=c.windup+c.active+c.recover){this.cooldown=c.cooldown;this.setMode('chase');}}
 clawPoint(){return this.root.position.clone().addScaledVector(V(this.heading.x,0,this.heading.z).normalize(),this.config.span*.32).addScaledVector(this.up,1);}
 clawHit(center,radius,damage,knock,lift,cone=-1){let hit=false;
  for(const u of this.getTargets(center)){if(!u.alive||u.kind!=='hero'||u.dashPhased||!u.shapes?.length)continue;const h=V().copy(u.shapes[0].center),d=h.clone().sub(center);
   if(d.length()>radius+.6)continue;const flat=V(h.x-this.root.position.x,0,h.z-this.root.position.z);if(cone>-1&&flat.lengthSq()>.25&&flat.normalize().dot(V(this.heading.x,0,this.heading.z).normalize())<cone)continue;
   if(u.entity?.isDamageProtected?.())continue;hit=true;this.stats.hits++;this.heroHits++;this.onHeroHit(u,h.clone(),damage);this.energyEffects?.impact(h.clone(),d.normalize(),1);
   const away=V(h.x-this.root.position.x,0,h.z-this.root.position.z);if(away.lengthSq()<1e-4)away.copy(this.heading);away.normalize().multiplyScalar(knock);away.y=lift;
   const motion=u.entity?.motion?.body||u.entity?.motion||u.entity?.player?.motion;motion?.applyKnockback?.(away,{duration:.4,drag:1.6});}
  return hit;}
 startPounce(feet){this.setMode('pounce');this.pounceTarget=feet.clone();this.stats.pounces++;}
 updatePounce(dt,feet){const c=this.config.pounce,p=this.root.position;
  if(feet){const motion=this.target?.entity?.motion,vel=motion?.body?.velocity||motion?.velocity;const lead=vel&&Number.isFinite(vel.x)?V(vel.x,0,vel.z).multiplyScalar(c.lead*c.windup):V();this.pounceTarget.copy(feet).add(lead);
   const d=V(this.pounceTarget.x-p.x,0,this.pounceTarget.z-p.z);if(d.length()>c.max)this.pounceTarget.copy(p).addScaledVector(d.normalize(),c.max);this.turnToward(V(this.pounceTarget.x-p.x,0,this.pounceTarget.z-p.z),dt*1.4);}
  this.pounceTarget.y=this.surface.kind==='roof'?this.surface.box.top:this.groundHeight(this.pounceTarget.x,this.pounceTarget.z);
  if(this.surface.kind==='roof'){const b=this.surface.box;this.pounceTarget.x=clamp(this.pounceTarget.x,b.minX+.8,b.maxX-.8);this.pounceTarget.z=clamp(this.pounceTarget.z,b.minZ+.8,b.maxZ-.8);}
  this.settle();if(this.clock>=c.windup){this.pounceCooldown=c.cooldown;this.launch(this.pounceTarget,this.surface.kind==='roof'?{kind:'roof',box:this.surface.box}:{kind:'ground'},true);}}
 pounceImpact(){const c=this.config.pounce;this.clawHit(this.root.position.clone().add(V(0,1,0)),c.radius,c.damage,c.knock,c.lift);this.slashAge=0;}
 // ---- damage -------------------------------------------------------------------------------------------
 modifyDamage(power,point,part){if(this.dead)return 0;this.flinch=this.config.flinch;return power*(part==='head'?this.config.headMultiplier:1);}
 stun(seconds){if(this.dead)return;this.stunRemaining=Math.max(this.stunRemaining,seconds*this.config.stunScale);if(this.mode==='strike'||this.mode==='pounce')this.setMode('chase');this.ring.visible=this.ringFill.visible=false;}
 cancelBurst(){}
 sync(){this.root.updateMatrixWorld(true);if(!this.combatUnit)return;if(!this.combatUnit.alive){this.combatUnit.shapes=[];return;}
  const s=this.config.span,rot=this.root.getWorldQuaternion(new THREE.Quaternion()),up=this.up;
  this.combatUnit.shapes=[{part:'hull',center:this.model.point('body'),half:{x:s*.21,y:s*.09,z:s*.21},rotation:rot},
   {part:'head',center:this.model.point('head').addScaledVector(up,s*.05),half:{x:s*.08,y:s*.07,z:s*.1},rotation:rot}];}
 destroy(){if(this.dead)return;this.dead=true;this.deathAge=0;this.target=null;if(this.combatUnit){this.combatUnit.alive=false;this.combatUnit.shapes=[];}this.ring.visible=this.ringFill.visible=false;
  this.onDeath(this.model.point('body'),{large:false});this.onEvent('Skitter destroyed.');if(this.surface.kind==='wall'||this.surface.kind==='air')this.dropping={vy:0};}
 updateDeath(dt,time){const c=this.config;this.deathAge+=dt;const p=this.root.position,ground=this.groundHeight(p.x,p.z);
  if(this.dropping||p.y>ground+.05){this.dropping=this.dropping||{vy:0};this.dropping.vy-=24*dt;p.y=Math.max(ground,p.y+this.dropping.vy*dt);if(this.surface.kind==='wall')p.addScaledVector(this.surface.normal,dt*2);if(p.y<=ground){this.dropping=null;this.surface={kind:'ground'};this.energyEffects?.impact(p.clone().add(V(0,.4,0)),UP,1);}}
  if(this.surface.kind!=='ground'&&!this.dropping)this.surface={kind:'ground'};
  this.orient(dt);this.animate(dt,time,smooth(this.deathAge/c.dying));
  const fade=(this.deathAge-c.dying)/c.fade;if(fade>0){this.model.root.position.y=-fade*1.4;if(fade>=1){this.root.visible=false;}}
 }
 // ---- presentation -------------------------------------------------------------------------------------
 orient(dt){const up=this.surface.kind==='air'||this.dead&&!this.dropping?UP:this.up,want=frameQuat(up,this.heading);this.root.quaternion.slerp(want,1-Math.exp(-(this.mantle?14:11)*dt));}
 animate(dt,time,curl=0){const m=this.model,c=this.config,root=this.root,span=c.span,air=!!this.air;root.updateMatrixWorld(true);
  // A raised, arched stance: body lifted, feet drawn in, so the knees bow up spider-fashion.
  const speed=this.velocity.length(),moving=speed>.5&&!air,t=this.clock;let lift=.55,pitch=0,roll=0,yaw=0,frontLift=0,frontReach=0,claws=[.1,.1,.1,.1],spread=.93;
  // Gait timing (SKITTER.gait): stride grows with speed, the cycle period follows from it.
  const G=c.gait;this.gaitSpeed=THREE.MathUtils.damp(this.gaitSpeed||0,moving?speed:0,8,dt);const gs=this.gaitSpeed,stride=Math.min(G.strideMax,G.strideBase+G.stridePerSpeed*gs),period=clamp(stride/Math.max(gs,.01),G.periodMin,G.periodMax),duty=THREE.MathUtils.lerp(G.dutyWalk,G.dutyRun,clamp(gs/G.runSpeed,0,1)),sway=clamp(gs/G.runSpeed,0,1);
  lift+=moving?G.bob*sway*(.5-.5*Math.cos(4*Math.PI*(this.phase||0))):Math.sin(time*2.2)*.03;roll+=moving?G.roll*sway*Math.sin(2*Math.PI*(this.phase||0)):0;
  // Strike: rear up with the front claws raised and open, then slam them forward and snap them shut.
  if(this.mode==='strike'){const s=c.strike;if(t<s.windup){const k=smooth(t/s.windup);pitch=-.55*k;lift=.55+.35*k;frontLift=2.3*k;frontReach=.2*k;claws=[.9*k,.1,.1,.9*k];}
   else if(t<s.windup+s.active){const k=smooth((t-s.windup)/s.active);pitch=-.55+.95*k;lift=.9-.5*k;frontLift=2.3*(1-k);frontReach=.2+1.4*k;claws=[.9-1.3*k,.1,.1,.9-1.3*k];}
   else{const k=smooth((t-s.windup-s.active)/s.recover);pitch=.4*(1-k);lift=.4+.15*k;frontReach=1.6*(1-k);claws=[-.4*(1-k),.1,.1,-.4*(1-k)];}}
  else if(this.mode==='pounce'){const k=smooth(t/c.pounce.windup);lift=.55-.75*k+Math.sin(time*40)*.02*k;pitch=.12*k;spread=.93+.15*k;claws=claws.map(()=>.5*k);}
  else if(air){const k=this.air.t;pitch=this.air.pounce?-.3+.6*k:-.15;spread=.82;claws=claws.map(()=>this.air.pounce?.8:.3);}
  else if(this.mode==='recover'||this.mode==='mantle')lift=.2;
  if(this.flinch>0){pitch-=this.flinch*1.2;roll+=this.flinch*.8;}
  if(curl>0){lift=.55-curl*.95;roll=curl*.25;pitch=curl*.15;claws=claws.map(()=>-.4*curl);}
  if(this.stunRemaining>0){lift=.05;roll=Math.sin(time*18)*.05;}
  // Feet: planted in world space, re-stepping in diagonal pairs when they trail too far from their ideal.
  const ideal=m.legs.map(leg=>{const local=m.footLocal(leg,spread);if(leg.front){local.z+=frontReach;local.y=frontLift;}return root.localToWorld(local);});
  if(!this.feet||curl===0&&this.feetSurface!==this.surface.kind){this.feet=this.feet?this.feet.map((f,i)=>({...f,from:f.anchor.clone(),to:ideal[i].clone(),step:0,stepping:true})):ideal.map(p=>({anchor:p.clone(),from:p.clone(),to:p.clone(),step:1,stepping:false}));this.feetSurface=this.surface.kind;}
  // Phase-based diagonal trot: one diagonal pair stays planted for a share of the cycle, feet land ahead of
  // their rest spot by half the stance travel and are world-fixed while planted (also on walls and roofs).
  const threshold=G.settle*span,up=V(0,1,0).applyQuaternion(root.quaternion),special=i=>air||curl>0||this.mode==='strike'&&m.legs[i].front&&t<c.strike.windup+c.strike.active||this.mode==='mantle';
  const unsettled=this.feet.some((f,i)=>!special(i)&&(f.stepping||f.anchor.distanceTo(ideal[i])>threshold));
  if(moving||unsettled)this.phase=((this.phase||0)+dt/period)%1;
  const lead=moving?this.velocity.clone().multiplyScalar(duty*period*.5):V(),swingShare=1-duty,height=Math.min(G.liftMax,G.liftBase+G.liftPerSpeed*gs)*span;
  for(const [i,f]of this.feet.entries()){
   if(special(i)){f.anchor.copy(ideal[i]);f.stepping=false;continue;}
   const local=((this.phase||0)+(i%2?.5:0))%1,to=ideal[i].clone().add(lead);
   if(local<swingShare&&(moving||unsettled)){
    if(!f.stepping){f.stepping=true;f.step=0;f.from.copy(f.anchor);}
    const u=local/swingShare,k=smooth(u);f.step=u;f.to.copy(to);f.anchor.lerpVectors(f.from,to,k).addScaledVector(up,Math.sin(u*Math.PI)*height);
   }else if(f.stepping){f.stepping=false;f.anchor.copy(to);}
  }
  m.pose({feet:this.feet.map(f=>f.anchor),bodyOffset:[0,lift,0],bodyTilt:[pitch,yaw,roll],lookAt:this.lookAt,claws,curl});
  m.clawFlare.value=this.mode==='strike'||this.mode==='pounce'||this.mode==='pounce-air'?1.8:.25;m.glow.material.uniforms.uPower.value=this.dead?Math.max(0,1-this.deathAge):1;
 }
 updateFX(dt){const c=this.config.pounce,show=this.mode==='pounce'&&!this.dead;this.ring.visible=this.ringFill.visible=show;
  if(show){const k=clamp(this.clock/c.windup,0,1),p=this.pounceTarget;for(const m of[this.ring,this.ringFill])m.position.set(p.x,p.y+.1,p.z);this.ring.scale.setScalar(c.radius);this.ringFill.scale.setScalar(c.radius*k);this.ring.material.opacity=.9;this.ringFill.material.opacity=.22+.2*k;}
  this.slashAge+=dt;this.slash.visible=this.slashAge<.22;if(this.slash.visible){this.slash.material.opacity=.95*(1-this.slashAge/.22);this.slash.position.set(0,1.1,this.config.span*.3);this.slash.scale.setScalar(1+this.slashAge*2);}}
 diagnostics(){const p=this.root.position;return{name:'Skitter',type:'skitter',mode:this.mode,surface:this.surface.kind,box:this.surface.box?.id||null,position:p.toArray().map(v=>+v.toFixed(2)),health:this.combatUnit?.health??0,stunned:this.stunRemaining>0,...this.stats};}
}
