import * as CANNON from './vendor/cannon-es.js';
import {CityBroadphase} from './physics-grid.js';
export const BUILDING_DURABILITY_MULTIPLIER=1.3;
export const NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER=.1;
const sectionHealth=type=>({column:10,slab:6,wall:4}[type]??4)*BUILDING_DURABILITY_MULTIPLIER;
// Physics-only module: real rigid bodies, support bookkeeping, and bounded activation.
export class DestructionWorld {
 constructor({onDamage=()=>{},onDetach=()=>{},onCollapse=()=>{},onFreeze=()=>{},maxDynamic=160,playerReserve=0}={}){
  this.world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.81,0),allowSleep:true});this.world.broadphase=new CityBroadphase();this.world.collisionMatrix=new CANNON.ObjectCollisionMatrix();this.world.collisionMatrixPrevious=new CANNON.ObjectCollisionMatrix();this.world.solver.iterations=8;this.world.defaultContactMaterial.friction=.62;this.world.defaultContactMaterial.restitution=.07;
  this.chunks=[];this.buildings=new Map();this.dynamic=[];this.wrecks=[];this.queue=[];this.pending=new Set();this.clock=0;this.impacts=0;this.detached=0;this.collapses=0;this.maxDynamic=maxDynamic;this.playerReserve=Math.max(0,Math.min(maxDynamic-1,playerReserve));this.onDamage=onDamage;this.onDetach=onDetach;this.onCollapse=onCollapse;this.onFreeze=onFreeze;
  const ground=new CANNON.Body({mass:0,shape:new CANNON.Plane()});ground.quaternion.setFromEuler(-Math.PI/2,0,0);ground.position.y=.08;ground.aabbNeedsUpdate=true;this.world.addBody(ground);
 }
 addChunk(info){
  const half=new CANNON.Vec3(...info.size.map(v=>v/2)),body=new CANNON.Body({mass:0,shape:new CANNON.Box(half)});body.position.set(info.x,info.y,info.z);body.quaternion.setFromEuler(0,info.yaw||0,0);body.aabbNeedsUpdate=true;this.world.addBody(body);this.world.broadphase.markStaticsDirty();
  const c={...info,body,state:'intact',hasDetached:false,maxHp:sectionHealth(info.type),hp:sectionHealth(info.type),scorch:0};this.chunks.push(c);if(!this.buildings.has(info.building))this.buildings.set(info.building,{chunks:[],failed:new Set()});this.buildings.get(info.building).chunks.push(c);return c;
 }
 addTerrainPyramid({x,z,height,slopeX,slopeZ}){const rx=height/slopeX,rz=height/slopeZ,shape=new CANNON.ConvexPolyhedron({vertices:[new CANNON.Vec3(-rx,0,0),new CANNON.Vec3(0,0,rz),new CANNON.Vec3(rx,0,0),new CANNON.Vec3(0,0,-rz),new CANNON.Vec3(0,height,0)],faces:[[0,1,4],[1,2,4],[2,3,4],[3,0,4],[3,2,1,0]]}),body=new CANNON.Body({mass:0,shape});body.position.set(x,.08,z);body.aabbNeedsUpdate=true;this.world.addBody(body);this.world.broadphase.markStaticsDirty();return body;}
 addWreck({position,quaternion,size,mass=2400}){const body=new CANNON.Body({mass,shape:new CANNON.Box(new CANNON.Vec3(size[0]/2,size[1]/2,size[2]/2))});body.position.copy(position);body.quaternion.copy(quaternion);body.updateMassProperties();body.aabbNeedsUpdate=true;body.angularVelocity.set(.35,.1,-.20);body.velocity.set(0,-1.5,0);body.linearDamping=.12;body.angularDamping=.3;body.allowSleep=true;this.world.addBody(body);this.wrecks.push(body);return body;}
 removeWreck(body){const index=this.wrecks.indexOf(body);if(index<0)return;this.world.removeBody(body);this.wrecks.splice(index,1);this.world.broadphase.markStaticsDirty();}
 resizeCollider(c,factor){const shape=c.body.shapes[0];shape.halfExtents.set(c.size[0]*factor,c.size[1]*factor,c.size[2]*factor);shape.updateConvexPolyhedronRepresentation();shape.updateBoundingSphereRadius();c.body.updateBoundingRadius();c.body.aabbNeedsUpdate=true;}
 queueDetach(c,origin,strength=1,urgent=false){if(c.state!=='intact')return;if(this.pending.has(c)){if(urgent){const i=this.queue.findIndex(t=>t.c===c);if(i>=0){const t=this.queue.splice(i,1)[0];t.urgent=urgent;t.origin={...origin};t.strength=strength;this.queue.unshift(t);}}return;}this.pending.add(c);const task={c,origin:{...origin},strength,urgent};if(urgent)this.queue.unshift(task);else this.queue.push(task);}
 detach(c,origin,strength,urgent=false){
  if(c.state!=='intact')return;
  const limit=urgent==='beam'?this.maxDynamic-Math.ceil(this.playerReserve/2):urgent?this.maxDynamic:this.maxDynamic-this.playerReserve;
  if(this.dynamic.length>=limit){const resting=this.dynamic.find(d=>d.body.sleepState===CANNON.Body.SLEEPING||(this.clock-d.born>2&&d.body.velocity.length()<.3));if(resting)this.freeze(resting);else return false;}
  c.state='dynamic';c.born=this.clock;c.body.type=CANNON.Body.DYNAMIC;c.body.mass=c.size[0]*c.size[1]*c.size[2]*(c.type==='slab'?2200:1600);this.resizeCollider(c,.485);c.body.updateMassProperties();c.body.wakeUp();c.body.aabbNeedsUpdate=true;
  const delta=new CANNON.Vec3(c.body.position.x-origin.x,c.body.position.y-origin.y,c.body.position.z-origin.z);if(delta.length()<.01)delta.set(.5,.4,.3);delta.normalize();const speed=Math.min(7,strength*2.0);c.body.applyImpulse(new CANNON.Vec3(delta.x*speed*c.body.mass,(Math.max(-.1,delta.y)*speed+1.3)*c.body.mass,delta.z*speed*c.body.mass));c.body.angularVelocity.set(delta.z*.7,.23,-delta.x*.7);c.body.linearDamping=.12;c.body.angularDamping=.3;c.body.sleepSpeedLimit=.25;c.body.sleepTimeLimit=1.5;this.dynamic.push(c);if(!c.hasDetached){this.detached++;c.hasDetached=true;}this.world.broadphase.markStaticsDirty();this.onDetach(c);return true;
 }
 freeze(c){const i=this.dynamic.indexOf(c);if(i>=0)this.dynamic.splice(i,1);c.state='settled';c.body.type=CANNON.Body.STATIC;c.body.mass=0;c.body.velocity.setZero();c.body.angularVelocity.setZero();c.body.updateMassProperties();this.world.broadphase.markStaticsDirty();this.onFreeze(c);}
 // Every weapon shares health and persistent scorch, including nonlethal hits.
 damageChunk(c,amount,{source=null}={}){
  amount*=source==='siege-walker'?1:NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER;
  if(!(amount>0))return;
  c.hp=Math.max(0,c.hp-amount);
  const scorch=Math.min(.72,.24+.48*(1-c.hp/c.maxHp));
  if(scorch>c.scorch){c.scorch=scorch;this.onDamage(c);}
 }
 impact(point,power=8,radius=3.5,direct=null,{player=false,beam=false,source=null}={}){
  this.impacts++;const affected=new Set(),priority=player?true:beam?'beam':false;
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
  for(const c of this.chunks){if(c===direct||c.state!=='intact')continue;const p=c.body.position,dx=p.x-point.x,dy=p.y-point.y,dz=p.z-point.z,d=Math.hypot(dx,dy,dz);const reach=radius+Math.min(1.6,Math.max(...c.size)*.25);if(d>reach)continue;this.damageChunk(c,power*Math.max(.20,1-d/(reach+.1)),{source});affected.add(c.building);if(c.hp<=0)this.queueDetach(c,point,power*.14);}
  // Nearby detached bodies retain their damage tint and respond to blast impulse.
  for(const c of this.dynamic){const d=c.body.position.vsub(new CANNON.Vec3(point.x,point.y,point.z));const length=d.length();if(c!==direct&&length<radius)this.damageChunk(c,power*Math.max(.20,1-length/(radius+.1)),{source});if(length<radius*2&&length>.05){d.normalize();d.scale((1-length/(radius*2))*power*.18*c.body.mass,d);c.body.wakeUp();c.body.applyImpulse(d);}}
  for(const id of affected)this.checkSupports(id);
 }
 checkSupports(id){const b=this.buildings.get(id);const floors=[...new Set(b.chunks.map(c=>c.floor))].sort((a,b)=>a-b);for(const floor of floors){if(b.failed.has(floor))continue;const cols=b.chunks.filter(c=>c.floor===floor&&c.type==='column');if(cols.length&&cols.filter(c=>c.state==='intact'&&!this.pending.has(c)).length<=2){
   b.failed.add(floor);this.collapses++;const origin={x:cols[0].x,y:floor*3,z:cols[0].z};for(const c of b.chunks)if(c.floor>=floor)this.queueDetach(c,origin,.10);this.onCollapse(id,floor);break;
  }}
 }
 step(dt){
  this.clock+=dt;for(let n=0;n<4&&this.queue.length;n++){const task=this.queue[0];if(this.detach(task.c,task.origin,task.strength,task.urgent)===false)break;this.queue.shift();this.pending.delete(task.c);}
  if(this.dynamic.length||this.wrecks.some(b=>b.type===CANNON.Body.DYNAMIC))this.world.step(1/60,dt,4);
  for(const b of this.wrecks)if(b.type===CANNON.Body.DYNAMIC&&b.sleepState===CANNON.Body.SLEEPING){b.type=CANNON.Body.STATIC;b.mass=0;b.updateMassProperties();this.world.broadphase.markStaticsDirty();}
  for(const c of [...this.dynamic])if(c.body.sleepState===CANNON.Body.SLEEPING||(this.clock-c.born>18&&c.body.velocity.length()<.3))this.freeze(c);
 }
 reset(){for(const b of this.wrecks)this.world.removeBody(b);this.wrecks=[];for(const c of this.chunks){c.state='intact';c.hasDetached=false;c.hp=c.maxHp;c.scorch=0;c.body.type=CANNON.Body.STATIC;c.body.mass=0;c.body.position.set(c.x,c.y,c.z);c.body.quaternion.setFromEuler(0,c.yaw||0,0);c.body.velocity.setZero();c.body.angularVelocity.setZero();this.resizeCollider(c,.5);c.body.updateMassProperties();c.body.aabbNeedsUpdate=true;}this.dynamic=[];this.queue=[];this.pending.clear();this.clock=this.impacts=this.detached=this.collapses=0;for(const b of this.buildings.values())b.failed.clear();this.world.broadphase.markStaticsDirty();}
 stats(){return{nonRobotDamageMultiplier:NON_ROBOT_BUILDING_DAMAGE_MULTIPLIER,robotDamageMultiplier:1,impacts:this.impacts,detached:this.detached,collapses:this.collapses,activeBodies:this.dynamic.length+this.wrecks.filter(b=>b.type===CANNON.Body.DYNAMIC).length,queued:this.queue.length,seconds:this.clock,playerReserve:this.playerReserve,totalChunks:this.chunks.length};}
}
