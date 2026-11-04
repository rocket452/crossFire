import * as THREE from './vendor/three.module.js';
import {traceImpact} from './combat-collision.js';
export class ArgusRepairDrones {
 constructor(boss,scene){this.boss=boss;this.scene=scene;this.config=boss.config.repairDrones;this.members=[];this.wrecks=[];this.sequence=0;this.entered=false;this.respawn=this.config.respawnSeconds;this.box=new THREE.BoxGeometry(1,1,1);}
 get alive(){return this.members.filter(d=>d.combatUnit.alive);}
 reset(){for(const d of [...this.members,...this.wrecks]){d.root.removeFromParent();d.beam?.removeFromParent();d.beam?.geometry.dispose();if(d.body)this.boss.model.walker.onRemoveDebris(d.body);for(const m of d.materials||[])m.dispose();}this.boss.damage.units=this.boss.damage.units.filter(u=>!u.id.startsWith('argus-drone-'));this.members=[];this.wrecks=[];this.entered=false;this.sequence=0;this.respawn=this.config.respawnSeconds;}
 spawn(){
  if(this.alive.length>=this.config.maximumAlive||this.boss.dead)return;
  const index=this.sequence++,root=new THREE.Group(),materials=[new THREE.MeshStandardMaterial({color:'#6a8272',roughness:.75}),new THREE.MeshStandardMaterial({color:'#6effd7',emissive:'#24c6a0',emissiveIntensity:2})];
  const block=(material,p,s)=>{const m=new THREE.Mesh(this.box,material);m.position.set(...p);m.scale.set(...s);root.add(m);return m;};block(materials[0],[0,0,0],this.config.bodySize);block(materials[1],[0,0,.82],[.7,.22,.1]);for(const x of[-1,1]){block(materials[0],[x,.12,0],[.8,.18,1]);block(materials[1],[x,.27,0],[.75,.06,.8]);}
  root.position.copy(this.boss.root.position).add(new THREE.Vector3((index%2?1:-1)*this.config.spawnRadius,this.config.spawnHeight,0));root.name='ARGUS repair drone';this.scene.add(root);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,5),new THREE.MeshBasicMaterial({color:'#7affd4',transparent:true,opacity:.8}));beam.visible=false;this.scene.add(beam);materials.push(beam.material);
  const d={root,beam,materials,evac:true,faction:'argus',type:'argus-repair',enabled:true,stunRemaining:0,channel:null,target:null,recordHit:()=>{},stun(seconds){this.stunRemaining=Math.max(this.stunRemaining,seconds);this.channel=null;this.beam.visible=false;}};this.boss.damage.add('argus-drone-'+index,'robot',d,this.config.health);this.members.push(d);this.sync(d);return d;
 }
 targetPoint(id){return id==='core'?this.boss.model.core.getWorldPosition(new THREE.Vector3()):this.boss.model.targetPosition(id);}
 targetHealth(id){if(id==='core')return{health:this.boss.coreArmor,max:this.boss.config.attacks.lance.armorHealth};const j=this.boss.joints.get(id);return j&&!j.destroyed&&j.health>0?{health:j.health,max:this.boss.config.joints.health}:null;}
 select(d){const assigned=new Set(this.alive.filter(other=>other!==d).map(other=>other.target));return [...this.boss.joints.values()].filter(j=>!j.destroyed&&j.health>0&&j.health<this.boss.config.joints.health&&!assigned.has(j.id)).sort((a,b)=>a.health-b.health)[0]?.id||'core';}
 sync(d){const p=d.root.position;d.combatUnit.shapes=d.combatUnit.alive?[{part:'repair-drone',center:{x:p.x,y:p.y,z:p.z},half:{x:1.35,y:.5,z:.85},rotation:{x:0,y:0,z:0,w:1}}]:[];}
 disable(unit){const d=this.members.find(d=>d.combatUnit===unit);if(!d)return false;if(d.dead)return true;d.dead=true;d.beam.visible=false;d.channel=null;unit.alive=false;unit.shapes=[];this.boss.model.walker.onDeath(d.root.position.clone(),{large:false});for(const m of d.materials)if(m.color){m.color.multiplyScalar(.3);if(m.emissive)m.emissiveIntensity=0;}d.body=this.boss.model.walker.onDebris({position:d.root.position,quaternion:d.root.quaternion,size:[2.5,1,1.8],mass:60});this.boss.model.walker.onWreck({body:d.body,size:[2.5,1,1.8]});d.age=0;this.wrecks.push(d);this.members=this.members.filter(other=>other!==d);this.boss.damage.units=this.boss.damage.units.filter(u=>u!==unit);return true;}
 update(dt){
  const c=this.config,b=this.boss;
  if(b.phase>=2&&!this.entered&&!b.dead&&!b.getConvoy()?.terminal&&c.enabled){this.entered=true;for(let i=0;i<Math.min(c.initialCount,c.maximumAlive);i++)this.spawn();}
  if(this.entered&&!b.dead&&!b.getConvoy()?.terminal&&this.alive.length<c.maximumAlive){this.respawn-=dt;if(this.respawn<=0){this.spawn();this.respawn=c.respawnSeconds;}}else this.respawn=c.respawnSeconds;
  for(const [i,d]of this.alive.entries()){
   d.stunRemaining=Math.max(0,d.stunRemaining-dt);d.beam.visible=false;if(b.dead||b.getConvoy()?.terminal||d.stunRemaining>0){d.channel=null;continue;}
   if(d.target==='core'){const preferred=this.select(d);if(preferred!=='core'){d.target=preferred;d.channel=null;}}
   if(!d.target||!this.targetHealth(d.target)||d.channel?.elapsed>=c.channelSeconds){d.target=this.select(d);d.channel=null;}
   const target=this.targetPoint(d.target),radial=target.clone().sub(b.root.position).setY(0);if(radial.lengthSq()<.01)radial.set(0,0,1);radial.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),(i%2?1:-1)*c.orbitSpreadRadians);const goal=target.clone().addScaledVector(radial,c.offsetX).add(new THREE.Vector3(0,c.offsetY,0));
   let desired=goal.clone();const blocked=traceImpact(d.root.position,goal,{sections:b.physics.chunks,ground:false,radius:c.collisionRadius});
   if(blocked){const section=blocked.section,roof=section.body.position.y+Math.max(...section.size)/2+c.roofClearance;desired.set(d.root.position.x,Math.max(d.root.position.y+1,roof),d.root.position.z);}
   const ownBlocked=traceImpact(d.root.position,goal,{targets:[b.combatUnit],ground:false,radius:c.collisionRadius});if(ownBlocked){const outward=goal.clone().sub(b.root.position).setY(0).normalize();let outside=null;for(const angle of c.avoidanceAngles){const candidate=b.root.position.clone().addScaledVector(outward.clone().applyAxisAngle(new THREE.Vector3(0,1,0),angle),c.avoidanceRadius).setY(goal.y);if(!traceImpact(candidate,candidate,{sections:b.physics.chunks,targets:[b.combatUnit],ground:false,radius:c.collisionRadius})){outside=candidate;break;}}outside??=goal.clone().addScaledVector(outward,c.avoidanceRadius);const height=Math.max(...b.model.hullBounds().map(box=>box.max.y))+c.roofClearance;if(!traceImpact(d.root.position,outside,{sections:b.physics.chunks,targets:[b.combatUnit],ground:false,radius:c.collisionRadius}))desired.copy(outside);else if(d.root.position.y<height-.1)desired.set(d.root.position.x,height,d.root.position.z);else desired.set(outside.x,height,outside.z);}
   const delta=desired.sub(d.root.position),step=Math.min(delta.length(),c.speed*dt),next=d.root.position.clone().addScaledVector(delta.normalize(),step);
   if(!traceImpact(d.root.position,next,{sections:b.physics.chunks,targets:[b.combatUnit],ground:false,radius:c.collisionRadius}))d.root.position.copy(next);
   if(d.root.position.distanceTo(goal)>c.channelRange||traceImpact(d.root.position,target,{sections:b.physics.chunks,ground:false})){d.channel=null;this.sync(d);continue;}
   const hp=this.targetHealth(d.target);if(!hp){d.channel=null;continue;}if(!d.channel)d.channel={elapsed:0,rate:Math.max(0,hp.max-hp.health)/c.channelSeconds};
   const repair=d.channel.rate*Math.min(dt,c.channelSeconds-d.channel.elapsed);d.channel.elapsed+=dt;
   if(d.target==='core')b.coreArmor=hp.max-(b.coreArmor+repair)<1e-6?hp.max:Math.min(hp.max,b.coreArmor+repair);else{const joint=b.joints.get(d.target);if(joint&&!joint.destroyed&&joint.health>0)joint.health=hp.max-(joint.health+repair)<1e-6?hp.max:Math.min(hp.max,joint.health+repair);}
   d.beam.visible=true;d.beam.position.copy(d.root.position).add(target).multiplyScalar(.5);d.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),target.clone().sub(d.root.position).normalize());d.beam.scale.set(1,d.root.position.distanceTo(target),1);this.sync(d);
  }
  for(const d of [...this.wrecks]){d.age+=dt;if(d.age>=c.wreckSeconds||this.wrecks.length>c.maximumWrecks){d.root.removeFromParent();d.beam.removeFromParent();d.beam.geometry.dispose();b.model.walker.onRemoveDebris(d.body);for(const m of d.materials)m.dispose();this.wrecks=this.wrecks.filter(w=>w!==d);}}
 }
 stop(){for(const d of this.alive)this.disable(d.combatUnit);}
 syncWrecks(){for(const d of this.wrecks){d.root.position.copy(d.body.position);d.root.quaternion.copy(d.body.quaternion);}}
 diagnostics(){return{alive:this.alive.length,respawn:this.respawn,members:this.alive.map(d=>({id:d.combatUnit.id,health:d.combatUnit.health,target:d.target,channel:d.channel?.elapsed||0,position:d.root.position.toArray()})),wrecks:this.wrecks.length};}
}
