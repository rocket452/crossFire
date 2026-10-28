import * as THREE from 'three';

// Blender-built rigid components share one health pool and explicit collision boxes.
export class SiegeWalker {
 constructor(scene,gltf,spec,{onFire,onDebris,onEffect}){
  Object.assign(this,{scene,spec,onFire,onDebris,onEffect});
  this.root=new THREE.Group();this.root.name='Siege Walker';scene.add(this.root);
  this.nodes={};this.meshes={};this.boxes={};this.wrecks=[];
  gltf.scene.updateMatrixWorld(true);
  for(const p of spec.parts){
   const source=gltf.scene.getObjectByName(p.name);
   if(!source?.isMesh)throw Error('Missing robot component '+p.name);
   const pivot=new THREE.Vector3(...p.pivot),geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);
   geometry.translate(-pivot.x,-pivot.y,-pivot.z);geometry.computeBoundingBox();
   const material=source.material.clone();
   if(p.name==='reactor'||p.name==='visor'){material.emissive=new THREE.Color('#ff6b17');material.emissiveIntensity=2;}
   const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;
   const node=new THREE.Group();node.name=p.name;node.add(mesh);
   const parent=p.parent?this.nodes[p.parent]:this.root;
   const parentPivot=p.parent?new THREE.Vector3(...spec.parts.find(q=>q.name===p.parent).pivot):new THREE.Vector3();
   node.position.copy(pivot).sub(parentPivot);parent.add(node);
   this.nodes[p.name]=node;this.meshes[p.name]=mesh;
   const b=geometry.boundingBox;this.boxes[p.name]={center:b.getCenter(new THREE.Vector3()),size:b.getSize(new THREE.Vector3())};
  }
  this.reset();
 }
 reset(){
  for(const w of this.wrecks){w.group.remove(w.mesh);this.nodes[w.name].add(w.mesh);w.mesh.position.set(0,0,0);w.mesh.quaternion.identity();this.scene.remove(w.group);}
  this.wrecks=[];this.dead=false;this.deathTime=0;this.broken=false;this.hits={shell:0,rocket:0,infantry:0};this.damageByTeam=[0,0];this.returnShots=0;this.target=null;this.aiming=false;this.lastSmoke=-1;this.cooldown=3.8;this.targetIndex=0;this.flash=0;
  this.root.position.set(0,0,0);this.root.rotation.set(0,0,0);
  for(const n of Object.values(this.nodes))n.rotation.set(0,0,0);
  for(const m of Object.values(this.meshes)){m.material.color.set('#ffffff');if(m.material.emissive)m.material.emissiveIntensity=m===this.meshes.reactor||m===this.meshes.visor?2:0;}
  this.root.updateMatrixWorld(true);
 }
 aimPoint(from,variant=0){
  const p=this.root.position;
  // Broad torso targets, never tiny lights; both factions have the same enemy.
  return new THREE.Vector3(p.x+(variant%3-1)*.65,from.y>20?15:12.8,p.z);
 }
 recordHit(kind,team,amount){if(amount<=0)return;this.hits[kind]=(this.hits[kind]||0)+1;this.damageByTeam[team]+=amount;this.flash=.14;}
 destroy(){this.dead=true;this.deathTime=0;this.onEffect(this.root.position.clone().add(new THREE.Vector3(0,14,0)),false);}
 update(dt,time,targets){
  this.flash=Math.max(0,this.flash-dt);
  if(this.dead){
   this.deathTime+=dt;
   if(!this.broken){
    const t=Math.min(1,this.deathTime/1.5);
    this.nodes.chest.rotation.x=t*.55;this.nodes.head.rotation.x=t*.35;this.nodes.thigh_l.rotation.x=-t*.45;this.nodes.shin_l.rotation.x=t*.9;
    this.root.position.y=-t*1.7;this.root.rotation.z=t*.16;
    this.meshes.reactor.material.emissiveIntensity=Math.max(0,2*(1-t));this.meshes.visor.material.emissiveIntensity=0;
    if(t===1)this.breakApart();
   }
   return;
  }
  const stride=Math.sin(time*.65);
  this.root.position.set(Math.sin(time*.15)*1.3,Math.abs(stride)*.08,Math.sin(time*.2)*4.5);
  this.nodes.thigh_l.rotation.x=stride*.13;this.nodes.thigh_r.rotation.x=-stride*.13;
  this.nodes.shin_l.rotation.x=Math.max(0,-stride)*.18;this.nodes.shin_r.rotation.x=Math.max(0,stride)*.18;
  this.nodes.foot_l.rotation.x=-this.nodes.thigh_l.rotation.x*.65;this.nodes.foot_r.rotation.x=-this.nodes.thigh_r.rotation.x*.65;
  this.nodes.waist.rotation.y=Math.sin(time*.3)*.08;this.nodes.chest.rotation.z=Math.sin(time*.65)*.025;
  this.nodes.upperarm_l.rotation.x=Math.sin(time*.65)*.13;this.nodes.forearm_l.rotation.x=-.22;
  const available=targets.filter(u=>u.alive&&u.kind!=='robot'&&u.id!==this.protectedUnit);
  this.cooldown-=dt;
  if(available.length){
   if(!this.target?.alive||(this.cooldown<=0&&!this.aiming)){this.target=available[(this.targetIndex++*7+3)%available.length];this.aiming=true;}
   const center=this.target.shapes[0]?.center;
   if(center){
    this.targetPoint=new THREE.Vector3(center.x,center.y,center.z);
    const yaw=Math.atan2(center.x-this.root.position.x,center.z-this.root.position.z);
    const delta=THREE.MathUtils.euclideanModulo(yaw-this.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;
    this.root.rotation.y+=delta*(1-Math.exp(-1.8*dt));
    this.nodes.head.rotation.y=Math.max(-.4,Math.min(.4,delta*.4));
    const range=Math.hypot(center.x-this.root.position.x,center.z-this.root.position.z);
    this.nodes.upperarm_r.rotation.x=-Math.PI/2-Math.atan2(center.y-15,range);
    this.nodes.forearm_r.rotation.x=0;
    if(this.cooldown<=0&&Math.abs(delta)<.25){
     this.root.updateMatrixWorld(true);
     const muzzle=this.nodes.forearm_r.localToWorld(new THREE.Vector3(0,-3.9,0));
     this.onFire(muzzle,this.targetPoint.clone());this.returnShots++;this.cooldown=2.6;this.aiming=false;
    }
   }
  }else{this.nodes.upperarm_r.rotation.x=-.25;this.cooldown=2.6;}
  const hp=this.combatUnit?this.combatUnit.health/this.combatUnit.maxHealth:1;
  for(const [name,m]of Object.entries(this.meshes)){
   m.material.color.set(this.flash>0?'#ffd5a4':'#ffffff');
   if(name==='reactor'||name==='visor')m.material.emissiveIntensity=(1.5+Math.sin(time*4)*.4)*(hp<.3?1.8:1);
  }
  if(hp<.4&&Math.floor(time*3)!==this.lastSmoke){this.lastSmoke=Math.floor(time*3);this.onEffect(this.root.localToWorld(new THREE.Vector3(1,15,1)),true);}
  this.root.updateMatrixWorld(true);
 }
 breakApart(){
  this.broken=true;this.root.updateMatrixWorld(true);
  this.onEffect(this.root.position.clone().add(new THREE.Vector3(0,11,0)),false);
  for(const p of this.spec.parts){
   const mesh=this.meshes[p.name],box=this.boxes[p.name],center=mesh.localToWorld(box.center.clone()),rotation=mesh.getWorldQuaternion(new THREE.Quaternion());
   const group=new THREE.Group();group.position.copy(center);group.quaternion.copy(rotation);this.scene.add(group);
   mesh.removeFromParent();mesh.position.copy(box.center).negate();group.add(mesh);
   const body=this.onDebris({position:center,quaternion:rotation,size:box.size.toArray().map(v=>Math.max(.18,v*.93)),mass:Math.max(40,box.size.x*box.size.y*box.size.z*110)});
   body.velocity.set((p.name.endsWith('l')?-1:1)*1.1,1.3,1.4);body.angularVelocity.set(.15,.1,.28);
   this.wrecks.push({name:p.name,mesh,group,body,half:{x:box.size.x/2,y:box.size.y/2,z:box.size.z/2}});
  }
 }
 syncWrecks(){for(const w of this.wrecks){w.group.position.copy(w.body.position);w.group.quaternion.copy(w.body.quaternion);}}
 shapes(){
  if(this.broken)return this.wrecks.map(w=>({center:{...w.body.position},half:w.half,rotation:{...w.body.quaternion}}));
  this.root.updateMatrixWorld(true);const result=[];
  for(const [name,mesh]of Object.entries(this.meshes)){
   if(name==='reactor'||name==='visor')continue;
   const b=this.boxes[name],c=mesh.localToWorld(b.center.clone()),q=mesh.getWorldQuaternion(new THREE.Quaternion());
   result.push({center:{x:c.x,y:c.y,z:c.z},half:{x:b.size.x/2,y:b.size.y/2,z:b.size.z/2},rotation:{x:q.x,y:q.y,z:q.z,w:q.w}});
  }return result;
 }
 diagnostics(){return{health:this.combatUnit?.health,maxHealth:this.combatUnit?.maxHealth,alive:!this.dead,position:this.root.position.toArray(),triangles:this.spec.triangles,parts:this.spec.parts.length,hits:{...this.hits},damageByTeam:[...this.damageByTeam],returnShots:this.returnShots,broken:this.broken,wreckBodies:this.wrecks.length,target:this.target?.id};}
}
