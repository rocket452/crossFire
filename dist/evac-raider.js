import * as THREE from './vendor/three.module.js';
import {projectileSilhouette} from './projectile-silhouette.js?v=silhouette-49';
export class EvacRaider {
 constructor(scene,damage,{getTargets,visible,trace,redirect=()=>null,onEvent=()=>{}}){
  Object.assign(this,{scene,damage,getTargets,visible,trace,redirect,onEvent});this.root=new THREE.Group();this.root.name='Evacuation Raider';scene.add(this.root);this.evac=true;this.geometry=new THREE.BoxGeometry(1,1,1);this.parts={};this.materials={};
  const armor=new THREE.MeshStandardMaterial({color:'#6c747b',metalness:.5,roughness:.65}),dark=new THREE.MeshStandardMaterial({color:'#232c35',roughness:.7}),red=new THREE.MeshStandardMaterial({color:'#ff5137',emissive:'#ff3010',emissiveIntensity:2});
  const part=(name,parent,p,size,mat)=>{const pivot=new THREE.Group();pivot.position.set(...p);const mesh=new THREE.Mesh(this.geometry,mat);mesh.scale.set(...size);mesh.castShadow=mesh.receiveShadow=true;pivot.add(mesh);parent.add(pivot);this.parts[name]=pivot;return pivot;};
  const body=part('body',this.root,[0,2.9,0],[1.8,1.5,1.05],armor);part('reactor',body,[0,0,.57],[.48,.55,.12],red);const head=part('head',body,[0,1.12,0],[1.05,.65,.85],armor);part('visor',head,[0,.04,.46],[.76,.15,.08],red);
  for(const [side,x]of[['l',-.62],['r',.62]]){const hip=new THREE.Group();hip.position.set(x,2.25,0);this.root.add(hip);this.parts['hip_'+side]=hip;part('leg_'+side,hip,[0,-.75,0],[.65,1.5,.65],dark);part('boot_'+side,hip,[0,-1.85,.18],[.82,.65,1.15],armor);}
  part('arm_l',body,[-1.2,-.1,0],[.55,1.9,.55],armor);const arm=part('arm_r',body,[1.18,-.05,.25],[.65,.8,.7],armor);this.barrel=part('barrel',arm,[0,-.15,.8],[.52,.52,1.5],dark);part('muzzle',this.barrel,[0,0,.8],[.55,.55,.1],red);
  this.warning=new THREE.Mesh(new THREE.RingGeometry(2.2,2.35,32),new THREE.MeshBasicMaterial({color:'#ff533a',transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));this.warning.rotation.x=-Math.PI/2;this.warning.position.y=.12;this.root.add(this.warning);
  this.boltGeometry=new THREE.IcosahedronGeometry(.22,0);this.boltMaterial=new THREE.MeshBasicMaterial({color:'#ff6044',toneMapped:false});this.reset();
 }
 reset(){for(const bolt of this.bolts||[])this.scene.remove(bolt.mesh);this.bolts=[];this.damage.units=this.damage.units.filter(u=>u.entity!==this);this.combatUnit=null;this.spawned=false;this.dead=false;this.age=0;this.shots=0;this.hits=0;this.received=0;this.cooldown=4;this.windup=0;this.target=null;this.stunRemaining=0;this.root.visible=false;this.root.position.set(17,.1,48);this.root.rotation.set(0,0,0);this.parts.hip_l.rotation.set(0,0,0);this.parts.hip_r.rotation.set(0,0,0);this.parts.body.rotation.set(0,0,0);}
 spawn(){if(this.spawned)return false;this.spawned=true;this.root.visible=true;this.combatUnit=this.damage.add('evac-raider','robot',this,1000);this.sync();this.onEvent('Raider robot approaching the Chinook! Protect the landing zone.');return true;}
 aimPoint(){return this.root.position.clone().add(new THREE.Vector3(0,2.9,0));}
 recordHit(kind,team,amount){this.received+=amount;}
 stun(seconds){this.stunRemaining=Math.max(this.stunRemaining,seconds);this.windup=0;this.cooldown=Math.max(this.cooldown,2);}
 destroy(){this.dead=true;this.deathAge=0;this.combatUnit.shapes=[];this.warning.visible=false;this.onEvent('Landing-zone raider destroyed.');}
 sync(){if(this.combatUnit)this.combatUnit.shapes=this.combatUnit.alive?[{center:this.aimPoint(),half:{x:1.5,y:2.5,z:1.2},rotation:this.root.quaternion.clone()}]:[];}
 update(dt,time){
  if(!this.spawned)return;this.age+=dt;
  if(this.dead){this.deathAge+=dt;this.parts.body.rotation.z=Math.min(1,this.deathAge)*1.1;this.root.position.y=.1-Math.min(1,this.deathAge)*.3;}
  else{this.stunRemaining=Math.max(0,this.stunRemaining-dt);this.warning.visible=this.age<4||this.windup>0;this.warning.material.opacity=.35+.35*Math.sin(time*10)**2;
   const origin=this.aimPoint(),targets=this.getTargets().filter(u=>u.alive&&u.shapes.length&&this.visible(origin,u.shapes[0].center));targets.sort((a,b)=>origin.distanceToSquared(new THREE.Vector3().copy(a.shapes[0].center))-origin.distanceToSquared(new THREE.Vector3().copy(b.shapes[0].center)));this.target=targets[0]||null;
   if(this.age>=3&&this.stunRemaining<=0){const goal=this.target?new THREE.Vector3().copy(this.target.shapes[0].center):new THREE.Vector3(12,0,48),delta=goal.clone().sub(this.root.position);delta.y=0;const distance=delta.length();this.root.rotation.y=Math.atan2(delta.x,delta.z);const moving=distance>(this.target?13:1);if(moving)this.root.position.addScaledVector(delta.normalize(),Math.min(distance-1,1.6*dt));this.parts.hip_l.rotation.x=moving?Math.sin(time*6)*.32:0;this.parts.hip_r.rotation.x=-this.parts.hip_l.rotation.x;this.parts.body.position.y=2.9+(moving?Math.sin(time*12)*.035:0);
    this.cooldown=Math.max(0,this.cooldown-dt);if(this.target&&distance<34&&this.cooldown<=0){this.windup+=dt;if(this.windup>=1){this.root.updateMatrixWorld(true);const from=this.barrel.localToWorld(new THREE.Vector3(0,0,.9)),target=new THREE.Vector3().copy(this.target.shapes[0].center),mesh=new THREE.Mesh(this.boltGeometry,this.boltMaterial);projectileSilhouette(mesh,'#ffad54',1.35);mesh.position.copy(from);this.scene.add(mesh);this.bolts.push({id:'raider-bolt-'+this.shots,mesh,dir:target.sub(from).normalize(),life:4});this.shots++;this.cooldown=2.5;this.windup=0;}}else this.windup=0;
   }this.sync();}
  for(let i=this.bolts.length-1;i>=0;i--){const bolt=this.bolts[i],end=bolt.mesh.position.clone().addScaledVector(bolt.dir,12*dt),transit=this.redirect(bolt,bolt.mesh.position,end);bolt.life-=dt;if(transit){bolt.mesh.position.copy(transit.position);bolt.dir.copy(transit.direction);}else{const hit=this.trace(bolt.mesh.position,end);if(hit){if(hit.barrier)hit.barrier.onHit(hit.point);if(hit.unit?.alive){this.damage.hurt(hit.unit,hit.unit.kind==='robot'?35:14,hit.point);this.hits++;}bolt.life=0;}else bolt.mesh.position.copy(end);}if(bolt.life<=0){this.scene.remove(bolt.mesh);this.bolts.splice(i,1);}}
 }
 diagnostics(){return{spawned:this.spawned,alive:!!this.combatUnit?.alive,health:this.combatUnit?.health||0,maxHealth:1000,position:this.root.position.toArray(),shots:this.shots,hits:this.hits,received:this.received,bolts:this.bolts.length,stunRemaining:this.stunRemaining};}
}
