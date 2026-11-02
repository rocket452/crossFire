import * as CANNON from './vendor/cannon-es.js';
import {CityBroadphase} from './physics-grid.js?v=ground-rubble-89';
export const BUILDING_DURABILITY_MULTIPLIER=1.3;
export const BUILDING_COLLISION_RELEASE_FRACTION=.75;
export const NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER=.1;
const sectionHealth=type=>({column:10,slab:6,wall:4}[type]??4)*BUILDING_DURABILITY_MULTIPLIER;
// Physics-only module: real rigid bodies, support bookkeeping, and bounded activation.
export class DestructionWorld {
 constructor({onDamage=()=>{},onDetach=()=>{},onCollapse=()=>{},onFreeze=()=>{},onMove=()=>{},maxDynamic=160,playerReserve=0}={}){
  this.world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.81,0),allowSleep:true});this.world.broadphase=new CityBroadphase();this.world.collisionMatrix=new CANNON.ObjectCollisionMatrix();this.world.collisionMatrixPrevious=new CANNON.ObjectCollisionMatrix();this.world.solver.iterations=8;this.world.defaultContactMaterial.friction=.62;this.world.defaultContactMaterial.restitution=.07;
  this.chunks=[];this.buildings=new Map();this.dynamic=[];this.falling=new Set();this.wrecks=[];this.queue=[];this.pending=new Set();this.groundContacts=new Set();this.terrainBodies=new Set();this.terrainSlopes=[];this.collisionlessFragments=0;this.clock=0;this.impacts=0;this.detached=0;this.collapses=0;this.maxDynamic=maxDynamic;this.playerReserve=Math.max(0,Math.min(maxDynamic-1,playerReserve));this.onDamage=onDamage;this.onDetach=onDetach;this.onCollapse=onCollapse;this.onFreeze=onFreeze;this.onMove=onMove;
  const ground=new CANNON.Body({mass:0,shape:new CANNON.Plane()});ground.quaternion.setFromEuler(-Math.PI/2,0,0);ground.position.y=.08;ground.aabbNeedsUpdate=true;this.world.addBody(ground);this.terrainBodies.add(ground);
 }
 addChunk(info){
  const half=new CANNON.Vec3(...info.size.map(v=>v/2)),body=new CANNON.Body({mass:0,shape:new CANNON.Box(half)});body.position.set(info.x,info.y,info.z);body.quaternion.setFromEuler(0,info.yaw||0,0);body.aabbNeedsUpdate=true;this.world.addBody(body);this.world.broadphase.markStaticsDirty();
  const c={...info,body,state:'intact',hasDetached:false,collisionDisabled:false,maxHp:sectionHealth(info.type),hp:sectionHealth(info.type),scorch:0};body.addEventListener('collide',event=>{if(c.hasDetached&&!c.collisionDisabled&&this.terrainBodies.has(event.body))this.groundContacts.add(c);});this.chunks.push(c);if(!this.buildings.has(info.building))this.buildings.set(info.building,{chunks:[],failed:new Set(),destroyed:new Set(),collisionDisabled:false});this.buildings.get(info.building).chunks.push(c);return c;
 }
 addTerrainPyramid({x,z,height,slopeX,slopeZ}){this.terrainSlopes.push({x,z,height,slopeX,slopeZ});const rx=height/slopeX,rz=height/slopeZ,shape=new CANNON.ConvexPolyhedron({vertices:[new CANNON.Vec3(-rx,0,0),new CANNON.Vec3(0,0,rz),new CANNON.Vec3(rx,0,0),new CANNON.Vec3(0,0,-rz),new CANNON.Vec3(0,height,0)],faces:[[0,1,4],[1,2,4],[2,3,4],[3,0,4],[3,2,1,0]]}),body=new CANNON.Body({mass:0,shape});body.position.set(x,.08,z);body.aabbNeedsUpdate=true;this.world.addBody(body);this.terrainBodies.add(body);this.world.broadphase.markStaticsDirty();return body;}
 addWreck({position,quaternion,size,mass=2400}){const body=new CANNON.Body({mass,shape:new CANNON.Box(new CANNON.Vec3(size[0]/2,size[1]/2,size[2]/2))});body.position.copy(position);body.quaternion.copy(quaternion);body.updateMassProperties();body.aabbNeedsUpdate=true;body.angularVelocity.set(.35,.1,-.20);body.velocity.set(0,-1.5,0);body.linearDamping=.12;body.angularDamping=.3;body.allowSleep=true;this.world.addBody(body);this.wrecks.push(body);return body;}
 removeWreck(body){const index=this.wrecks.indexOf(body);if(index<0)return;this.world.removeBody(body);this.wrecks.splice(index,1);this.world.broadphase.markStaticsDirty();}
 resizeCollider(c,factor){const shape=c.body.shapes[0];shape.halfExtents.set(c.size[0]*factor,c.size[1]*factor,c.size[2]*factor);shape.updateConvexPolyhedronRepresentation();shape.updateBoundingSphereRadius();c.body.updateBoundingRadius();c.body.aabbNeedsUpdate=true;}
 queueDetach(c,origin,strength=1,urgent=false){if(c.state!=='intact'||c.collisionDisabled)return;if(this.pending.has(c)){if(urgent){const i=this.queue.findIndex(t=>t.c===c);if(i>=0){const t=this.queue.splice(i,1)[0];t.urgent=urgent;t.origin={...origin};t.strength=strength;this.queue.unshift(t);}}return;}this.pending.add(c);const task={c,origin:{...origin},strength,urgent};if(urgent)this.queue.unshift(task);else this.queue.push(task);}
 detach(c,origin,strength,urgent=false){
  if(c.state!=='intact'||c.collisionDisabled)return;
  const limit=urgent==='beam'?this.maxDynamic-Math.ceil(this.playerReserve/2):urgent?this.maxDynamic:this.maxDynamic-this.playerReserve;
  if(this.dynamic.length>=limit){const resting=this.dynamic.find(d=>d.body.sleepState===CANNON.Body.SLEEPING||(this.clock-d.born>2&&d.body.velocity.length()<.3));if(resting)this.freeze(resting);else return false;}
  c.state='dynamic';c.born=this.clock;c.body.type=CANNON.Body.DYNAMIC;c.body.mass=c.size[0]*c.size[1]*c.size[2]*(c.type==='slab'?2200:1600);this.resizeCollider(c,.485);c.body.updateMassProperties();c.body.wakeUp();c.body.aabbNeedsUpdate=true;
  const delta=new CANNON.Vec3(c.body.position.x-origin.x,c.body.position.y-origin.y,c.body.position.z-origin.z);if(delta.length()<.01)delta.set(.5,.4,.3);delta.normalize();const speed=Math.min(7,strength*2.0);c.body.applyImpulse(new CANNON.Vec3(delta.x*speed*c.body.mass,(Math.max(-.1,delta.y)*speed+1.3)*c.body.mass,delta.z*speed*c.body.mass));c.body.angularVelocity.set(delta.z*.7,.23,-delta.x*.7);c.body.linearDamping=.12;c.body.angularDamping=.3;c.body.sleepSpeedLimit=.25;c.body.sleepTimeLimit=1.5;this.dynamic.push(c);if(!c.hasDetached){this.detached++;c.hasDetached=true;}this.world.broadphase.markStaticsDirty();this.onDetach(c);this.recordDestroyed(c);return true;
 }
 freeze(c){const i=this.dynamic.indexOf(c);if(i>=0)this.dynamic.splice(i,1);this.falling.delete(c);c.state='settled';c.body.type=CANNON.Body.STATIC;c.body.mass=0;c.body.velocity.setZero();c.body.angularVelocity.setZero();c.body.updateMassProperties();this.world.broadphase.markStaticsDirty();this.onFreeze(c);}
 // Process terrain contacts after Cannon finishes stepping; keep the landed mesh in place.
 disableGroundedCollision(c){if(c.collisionDisabled||!c.hasDetached)return;c.collisionDisabled=true;c.body.collisionFilterMask=0;c.body.collisionResponse=false;this.collisionlessFragments++;this.freeze(c);}
 // Count each original section once, including structural collapse detachments.
 recordDestroyed(c){const b=this.buildings.get(c.building);if(!b||b.collisionDisabled)return;b.destroyed.add(c);if(b.destroyed.size>=Math.ceil(b.chunks.length*BUILDING_COLLISION_RELEASE_FRACTION))this.disableBuildingCollision(b);}
 disableBuildingCollision(b){
  b.collisionDisabled=true;const members=new Set(b.chunks);this.queue=this.queue.filter(t=>!members.has(t.c));
  this.dynamic=this.dynamic.filter(c=>!members.has(c));
  // Collision release must not freeze a half-collapsed tower in mid-air. Finish
  // its collapse with cheap ballistic debris, outside the bounded rigid-body pool.
  for(const c of b.chunks){this.pending.delete(c);this.groundContacts.delete(c);if(c.collisionDisabled)continue;
   c.collisionDisabled=true;c.body.collisionFilterMask=0;c.body.collisionResponse=false;this.collisionlessFragments++;
   if(!c.hasDetached){c.hasDetached=true;this.detached++;this.onDetach(c);}
   if(c.state!=='dynamic'){const angle=c.body.id*2.399963;c.body.velocity.set(Math.sin(angle)*.65,-.3,Math.cos(angle)*.65);c.body.angularVelocity.set(Math.cos(angle)*.45,.12,Math.sin(angle)*.45);}
   c.state='falling';c.body.type=CANNON.Body.STATIC;c.body.mass=0;c.body.updateMassProperties();this.falling.add(c);
  }
  this.world.broadphase.markStaticsDirty();
 }
 terrainHeight(x,z){let y=.08;for(const t of this.terrainSlopes)y=Math.max(y,.08+t.height-Math.abs(x-t.x)*t.slopeX-Math.abs(z-t.z)*t.slopeZ);return y;}
 stepReleasedDebris(dt){
  // No fragment/actor contacts after 75% destruction. Terrain alone stops the
  // visual fall, using the rotated box's bottom so pieces cannot sink or hover.
  const steps=Math.max(1,Math.ceil(dt/(1/60))),h=dt/steps;
  for(const c of this.falling){const b=c.body;
   for(let i=0;i<steps;i++){
    b.velocity.y-=9.81*h;b.position.x+=b.velocity.x*h;b.position.y+=b.velocity.y*h;b.position.z+=b.velocity.z*h;
    b.quaternion.integrate(b.angularVelocity,h,b.angularFactor,b.quaternion);b.quaternion.normalize();
    const q=b.quaternion,size=c.size,bottom=Math.abs(2*(q.x*q.y+q.z*q.w))*size[0]/2+Math.abs(1-2*(q.x*q.x+q.z*q.z))*size[1]/2+Math.abs(2*(q.y*q.z-q.x*q.w))*size[2]/2,floor=this.terrainHeight(b.position.x,b.position.z)+bottom;
    if(b.position.y<=floor){b.position.y=floor;b.aabbNeedsUpdate=true;this.freeze(c);break;}
   }
   b.aabbNeedsUpdate=true;if(c.state==='falling')this.onMove(c);
  }
 }
 // Every weapon shares health and persistent scorch, including nonlethal hits.
 damageChunk(c,amount,{source=null}={}){
  amount*=(source==='siege-walker'||source==='bastion')?1:NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER;
  if(!(amount>0)||c.collisionDisabled)return;
  c.hp=Math.max(0,c.hp-amount);
  const scorch=Math.min(.72,.24+.48*(1-c.hp/c.maxHp));
  if(scorch>c.scorch){c.scorch=scorch;this.onDamage(c);}if(c.hp<=0)this.recordDestroyed(c);
 }
 impact(point,power=8,radius=3.5,direct=null,{player=false,beam=false,source=null}={}){
  if(direct?.collisionDisabled)direct=null;this.impacts++;const affected=new Set(),priority=player?true:beam?'beam':false;
  if(direct){
   this.damageChunk(direct,power,{source});affected.add(direct.building);
   if(direct.state==='settled')direct.state='intact';
   if(direct.state==='intact'&&direct.hp<=0){
    this.queueDetach(direct,point,power*.18,priority);
    if(priority&&this.detach(direct,point,power*.18,priority)!==false){const i=this.queue.findIndex(t=>t.c===direct);if(i>=0)this.queue.splice(i,1);this.pending.delete(direct);}
    else{const i=this.queue.findIndex(t=>t.c===direct);if(i>0)this.queue.unshift(...this.queue.splice(i,1));}
   }
  }
  // The directly hit section receives full damage once; neighbors receive falloff.
  for(const c of this.chunks){if(c===direct||c.collisionDisabled||c.state!=='intact')continue;const p=c.body.position,dx=p.x-point.x,dy=p.y-point.y,dz=p.z-point.z,d=Math.hypot(dx,dy,dz);const reach=radius+Math.min(1.6,Math.max(...c.size)*.25);if(d>reach)continue;this.damageChunk(c,power*Math.max(.20,1-d/(reach+.1)),{source});affected.add(c.building);if(c.hp<=0)this.queueDetach(c,point,power*.14);}
  // Nearby detached bodies retain their damage tint and respond to blast impulse.
  for(const c of this.dynamic){const d=c.body.position.vsub(new CANNON.Vec3(point.x,point.y,point.z));const length=d.length();if(c!==direct&&length<radius)this.damageChunk(c,power*Math.max(.20,1-length/(radius+.1)),{source});if(length<radius*2&&length>.05){d.normalize();d.scale((1-length/(radius*2))*power*.18*c.body.mass,d);c.body.wakeUp();c.body.applyImpulse(d);}}
  for(const id of affected)this.checkSupports(id);
 }
 checkSupports(id){const b=this.buildings.get(id);if(!b||b.collisionDisabled)return;const floors=[...new Set(b.chunks.map(c=>c.floor))].sort((a,b)=>a-b);for(const floor of floors){if(b.failed.has(floor))continue;const cols=b.chunks.filter(c=>c.floor===floor&&c.type==='column');if(cols.length&&cols.filter(c=>c.state==='intact'&&!this.pending.has(c)).length<=2){
   b.failed.add(floor);this.collapses++;const origin={x:cols[0].x,y:floor*3,z:cols[0].z};for(const c of b.chunks)if(c.floor>=floor)this.queueDetach(c,origin,.10);this.onCollapse(id,floor);break;
  }}
 }
 step(dt){
  this.clock+=dt;for(let n=0;n<4&&this.queue.length;n++){const task=this.queue[0];if(this.detach(task.c,task.origin,task.strength,task.urgent)===false)break;const index=this.queue.indexOf(task);if(index>=0)this.queue.splice(index,1);this.pending.delete(task.c);}
  if(this.dynamic.length||this.wrecks.some(b=>b.type===CANNON.Body.DYNAMIC))this.world.step(1/60,dt,4);
  for(const c of this.groundContacts)this.disableGroundedCollision(c);this.groundContacts.clear();
  this.stepReleasedDebris(dt);
  for(const b of this.wrecks)if(b.type===CANNON.Body.DYNAMIC&&b.sleepState===CANNON.Body.SLEEPING){b.type=CANNON.Body.STATIC;b.mass=0;b.updateMassProperties();this.world.broadphase.markStaticsDirty();}
  for(const c of [...this.dynamic])if(c.body.sleepState===CANNON.Body.SLEEPING||(this.clock-c.born>18&&c.body.velocity.length()<.3))this.freeze(c);
 }
 reset(){for(const b of this.wrecks)this.world.removeBody(b);this.wrecks=[];for(const c of this.chunks){c.state='intact';c.hasDetached=false;c.collisionDisabled=false;c.body.collisionFilterMask=-1;c.body.collisionResponse=true;c.hp=c.maxHp;c.scorch=0;c.body.type=CANNON.Body.STATIC;c.body.mass=0;c.body.position.set(c.x,c.y,c.z);c.body.quaternion.setFromEuler(0,c.yaw||0,0);c.body.velocity.setZero();c.body.angularVelocity.setZero();this.resizeCollider(c,.5);c.body.updateMassProperties();c.body.aabbNeedsUpdate=true;}this.dynamic=[];this.falling.clear();this.queue=[];this.pending.clear();this.groundContacts.clear();this.collisionlessFragments=0;this.clock=this.impacts=this.detached=this.collapses=0;for(const b of this.buildings.values()){b.failed.clear();b.destroyed.clear();b.collisionDisabled=false;}this.world.broadphase.markStaticsDirty();}
 stats(){return{fallingFragments:this.falling.size,collisionlessBuildings:[...this.buildings.values()].filter(b=>b.collisionDisabled).length,buildingCollisionReleaseFraction:BUILDING_COLLISION_RELEASE_FRACTION,collisionlessFragments:this.collisionlessFragments,nonRobotDamageMultiplier:NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER,robotDamageMultiplier:1,impacts:this.impacts,detached:this.detached,collapses:this.collapses,activeBodies:this.dynamic.length+this.wrecks.filter(b=>b.type===CANNON.Body.DYNAMIC).length,queued:this.queue.length,seconds:this.clock,playerReserve:this.playerReserve,totalChunks:this.chunks.length};}
}
