import * as THREE from 'three';
import {HumanoidCharacter} from './humanoid-character.js?v=characters-24';
// Shared Blender animation palettes drive instanced, rigid-skinned body segments.
// The crowd does not allocate one renderer or one skinned draw per soldier.
export class InfantryCrowd {
 constructor(scene,gltf,motion,{random=Math.random,onShot=()=>{},getTarget=()=>null,characterModel=null}={}){
  this.characterModel=characterModel;this.characters=characterModel?[]:null;this.getTarget=getTarget;this.motion=motion;this.random=random;this.onShot=onShot;this.batches=[];this.soldiers=[];this.geometryCount=motion.parts.length;this.currentTime=0;this.shotCount=0;gltf.scene.updateMatrixWorld(true);
  this.base=new THREE.Matrix4();this.local=new THREE.Matrix4();this.world=new THREE.Matrix4();this.p=new THREE.Vector3();this.q=new THREE.Quaternion();this.p0=new THREE.Vector3();this.q0=new THREE.Quaternion();this.prevP=new THREE.Vector3();this.prevQ=new THREE.Quaternion();this.scale=new THREE.Vector3(1,1,1);this.yAxis=new THREE.Vector3(0,1,0);this.heading=new THREE.Quaternion();this.aimMatrix=new THREE.Matrix4();this.aimTranslate=new THREE.Matrix4().makeTranslation(0,-1.15,0);this.muzzle=new THREE.Vector3();
  for(let team=0;team<2;team++){
   const batch={};
   for(const name of motion.parts){if(characterModel&&name!=='weapon')continue;const src=gltf.scene.getObjectByName(name);if(!src?.isMesh)throw Error('Missing soldier mesh '+name);const geometry=src.geometry.clone().applyMatrix4(src.matrixWorld),color=geometry.getAttribute('color');
    for(let i=0;i<(color?.count||0);i++){const r=color.getX(i),g=color.getY(i),b=color.getZ(i);if(Math.abs(r-.17)<.035&&Math.abs(g-.29)<.035&&Math.abs(b-.29)<.035){if(team===1)color.setXYZ(i,.44,.28,.17);}else if(Math.abs(r-.30)<.035&&Math.abs(g-.53)<.035&&Math.abs(b-.51)<.035){if(team===1)color.setXYZ(i,.76,.37,.17);}}
    const o=new THREE.InstancedMesh(geometry,src.material,18);o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;if(characterModel&&name!=='weapon')o.visible=false;scene.add(o);batch[name]=o;
   }
   this.batches.push(batch);
   for(let i=0;i<18;i++)this.soldiers.push({team,i,scale:.97+random()*.06,offset:random()*11.8,phase:random()*2,weaponMatrix:new THREE.Matrix4(),seen:new Set()});
  }
  if(characterModel)for(const s of this.soldiers){const actor=new HumanoidCharacter(characterModel,{variant:s.team===0?'north':'south',phase:s.phase});scene.add(actor.root);this.characters.push(actor);s.character=actor;s.characterTime=0;}
  this.reset();
 }
 reset(){this.currentTime=0;this.shotCount=0;for(const s of this.soldiers){const row=Math.floor((s.i%9)/3),lane=s.i%3;s.x=(s.team===0?-1:1)*(19+row*3.5+lane*.55);s.z=(s.i<9?-1:1)*(2.0+lane*.9);s.stopDistance=10.6+row*1.5+lane*.18;s.y=.035;s.disabled=false;s.aimTarget=null;s.pendingShot=false;s.fallTime=0;s.clip='Idle';s.clipTime=s.phase;s.previous=null;s.blend=1;s.fireTimer=.4+(s.i%4)*.33;s.burst=0;s.burstTimer=0;s.ammo=9+(s.i%3)*3;s.reloadTime=0;s.firingTime=0;s.seen.clear();s.seen.add('Idle');s.character?.reset();s.characterTime=0;}this.update(0,0);}
 duration(name){return this.motion.clips[name].duration;}
 transition(s,name,restart=false){if(s.clip===name&&!restart)return;s.previous={name:s.clip,time:s.clipTime};s.clip=name;s.clipTime=(name==='Fire'||name==='CrouchFire'||name==='Reload')?0:s.phase;s.blend=0;s.seen.add(name);}
 sample(name,time,bone,outP,outQ){const clip=this.motion.clips[name],count=clip.frames.length;const t=clip.loop?((time%clip.duration)+clip.duration)%clip.duration:Math.min(clip.duration,Math.max(0,time));const f=t/clip.duration*(count-1),a=Math.floor(f),b=Math.min(count-1,a+1),k=f-a,offset=bone*7,A=clip.frames[a],B=clip.frames[b];outP.fromArray(A,offset);this.p0.fromArray(B,offset);outP.lerp(this.p0,k);outQ.fromArray(A,offset+3);this.q0.fromArray(B,offset+3);outQ.slerp(this.q0,k).normalize();}
 update(dt,time){this.currentTime=time;
  for(const s of this.soldiers){
   if(s.combatUnit?.dashPhased){this.renderSoldier(s);continue;}
   if(s.disabled){s.fallTime=Math.min(1,s.fallTime+dt/.7);this.renderSoldier(s,s.fallTime);continue;}
   const side=s.team===0?1:-1,cycle=(time+s.offset)%12,canAdvance=Math.abs(s.x)>s.stopDistance+.001,moving=!s.combatUnit?.dashSweep&&canAdvance&&cycle<5.2&&!s.reloadTime;const run=(s.i%3!==1),crouched=!moving&&s.i%3===0&&cycle>7.3;let desired=moving?(run?'Run':'Walk'):crouched?'CrouchAim':cycle>11.25&&s.i%4===1?'Idle':'Aim';
   s.firingTime=Math.max(0,s.firingTime-dt);
   if(s.reloadTime>0){s.reloadTime=Math.max(0,s.reloadTime-dt);desired='Reload';if(s.reloadTime===0)s.ammo=12;}
   else if(moving){const speed=(run?2.3:1.05)*s.scale;s.x+=side*Math.min(Math.abs(s.x)-s.stopDistance,speed*dt);s.burst=0;}
   else if(desired!=='Idle'&&this.combatEnabled!==false){
    s.fireTimer-=dt;s.burstTimer-=dt;
    if(s.ammo===0){s.reloadTime=this.duration('Reload');desired='Reload';this.transition(s,'Reload');}
    else{
     if(s.fireTimer<=0&&s.burst===0){s.burst=3;s.burstTimer=0;s.fireTimer=1.7+this.random()*1.5;}
     if(s.burst>0&&s.burstTimer<=0){s.burst--;s.ammo--;s.burstTimer=.14;s.firingTime=this.duration('Fire');desired=crouched?'CrouchFire':'Fire';this.transition(s,desired,true);s.pendingShot=true;}
     if(s.firingTime>0)desired=crouched?'CrouchFire':'Fire';
    }
   }
   this.transition(s,desired);s.clipTime+=dt;if(s.previous)s.previous.time+=dt;s.blend=Math.min(1,s.blend+dt/.16);
   if(s.blend===1)s.previous=null;
   s.aimTarget=this.getTarget(s);this.renderSoldier(s);
   if(s.pendingShot){s.pendingShot=false;this.muzzle.fromArray(this.motion.muzzle).applyMatrix4(s.weaponMatrix);const target=s.aimTarget?s.aimTarget.clone().add(new THREE.Vector3((this.random()-.5)*1.2,(this.random()-.5)*1.2,(this.random()-.5)*1.2)):new THREE.Vector3(s.x+side*28,this.muzzle.y+(this.random()-.5)*.3,-s.z+(this.random()-.5)*.4);this.onShot(this.muzzle.clone(),target,s.team,s);this.shotCount++;}
  }
  for(const b of this.batches)for(const o of Object.values(b))o.instanceMatrix.needsUpdate=true;
 }
 disable(s){s.disabled=true;s.fallTime=0;s.pendingShot=false;s.burst=0;s.previous=null;}
 renderSoldier(s,fall=0){
   if(s.combatUnit?.dashPhased){if(s.character)s.character.root.visible=false;this.world.makeScale(0,0,0);for(const mesh of Object.values(this.batches[s.team])){mesh.setMatrixAt(s.i,this.world);mesh.instanceMatrix.needsUpdate=true;}return;}if(s.character)s.character.root.visible=true;
   this.heading.setFromAxisAngle(this.yAxis,s.aimTarget?Math.atan2(s.aimTarget.x-s.x,s.aimTarget.z-s.z):(s.team===0?1:-1)*Math.PI/2);this.scale.setScalar(s.scale);if(fall){const angle=fall*Math.PI/2;this.heading.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle));}this.base.compose(this.p.set(s.x,s.y+Math.sin(fall*Math.PI/2)*.32,s.z),this.heading,this.scale);
   if(s.aimTarget&&!fall){const pitch=-Math.min(.85,Math.max(-.3,Math.atan2(s.aimTarget.y-1.3,Math.hypot(s.aimTarget.x-s.x,s.aimTarget.z-s.z))));this.aimMatrix.makeRotationX(pitch).multiply(this.aimTranslate);this.aimMatrix.elements[13]+=1.15;}
   for(let bone=0;bone<this.motion.parts.length;bone++){
    const name=this.motion.parts[bone];if(s.character&&name!=='weapon')continue;this.sample(s.clip,s.clipTime,bone,this.p,this.q);
    if(s.previous){this.sample(s.previous.name,s.previous.time,bone,this.prevP,this.prevQ);this.p.lerpVectors(this.prevP,this.p,s.blend);this.prevQ.slerp(this.q,s.blend).normalize();this.q.copy(this.prevQ);}
    this.local.compose(this.p,this.q,this.scale.set(1,1,1));if(s.aimTarget&&!fall&&!['pelvis','thigh_l','shin_l','foot_l','thigh_r','shin_r','foot_r'].includes(name)){this.local.premultiply(this.aimMatrix);}this.world.multiplyMatrices(this.base,this.local);this.batches[s.team][name].setMatrixAt(s.i,this.world);if(name==='weapon')s.weaponMatrix.copy(this.world);
   }
   if(s.character){const actor=s.character,dt=Math.max(0,this.currentTime-s.characterTime);s.characterTime=this.currentTime;actor.root.position.set(s.x,s.y,s.z);actor.root.rotation.set(0,s.aimTarget?Math.atan2(s.aimTarget.x-s.x,s.aimTarget.z-s.z):(s.team===0?1:-1)*Math.PI/2,0);actor.root.scale.setScalar(s.scale);const clip=fall?'Death':s.clip==='Run'?'Run':s.clip==='Walk'?'Walk':s.clip==='Reload'?'Idle':s.clip==='Fire'||s.clip==='CrouchFire'?'Idle':'Idle';actor.update(clip,dt,{rate:clip==='Run'?1.1:1,time:fall?fall*actor.clips.get('Death').duration:null,loop:!fall});if(!fall){actor.rifle(s.weaponMatrix,{crouch:s.clip.includes('Crouch'),reload:s.clip==='Reload',recoil:s.firingTime>0?1:0});this.batches[s.team].weapon.setMatrixAt(s.i,s.weaponMatrix);}actor.root.updateWorldMatrix(true,true);}
 }
 position(index=0){const s=this.soldiers[index];return s?new THREE.Vector3(s.x,s.y,s.z):null;}
 diagnostics(){return{trianglesPerSoldier:this.characters?1256+(this.batches[0].weapon.geometry.index?.count||this.batches[0].weapon.geometry.getAttribute('position').count)/3:this.motion.triangles,bones:this.characters?53:this.motion.deformBones,clips:Object.keys(this.motion.clips),parts:this.characters?2:this.motion.parts.length,materialCount:this.characters?2:this.motion.materialCount,drawSections:this.characters?this.characters.length+2:this.motion.parts.length*2,characterSource:this.characters?'Explosive LLC':null,characters:this.characters?.slice(0,3).map(c=>c.diagnostics()),shots:this.shotCount,disabled:this.soldiers.filter(s=>s.disabled).length,states:this.soldiers.reduce((a,s)=>(a[s.clip]=(a[s.clip]||0)+1,a),{}),seen:[...new Set(this.soldiers.flatMap(s=>[...s.seen]))],first:this.soldiers.slice(0,3).map(s=>({position:[s.x,s.y,s.z],state:s.clip,time:s.clipTime,reloading:s.reloadTime>0,ammo:s.ammo}))};}
}
