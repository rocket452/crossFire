import * as THREE from 'three';
// Shared Blender animation palettes drive instanced, rigid-skinned body segments.
// The crowd does not allocate one renderer or one skinned draw per soldier.
export class InfantryCrowd {
 constructor(scene,gltf,motion,{random=Math.random,onShot=()=>{}}={}){
  this.motion=motion;this.random=random;this.onShot=onShot;this.batches=[];this.soldiers=[];this.geometryCount=motion.parts.length;this.currentTime=0;this.shotCount=0;gltf.scene.updateMatrixWorld(true);
  this.base=new THREE.Matrix4();this.local=new THREE.Matrix4();this.world=new THREE.Matrix4();this.p=new THREE.Vector3();this.q=new THREE.Quaternion();this.p0=new THREE.Vector3();this.q0=new THREE.Quaternion();this.prevP=new THREE.Vector3();this.prevQ=new THREE.Quaternion();this.scale=new THREE.Vector3(1,1,1);this.yAxis=new THREE.Vector3(0,1,0);this.heading=new THREE.Quaternion();this.muzzle=new THREE.Vector3();
  for(let team=0;team<2;team++){
   const batch={};
   for(const name of motion.parts){const src=gltf.scene.getObjectByName(name);if(!src?.isMesh)throw Error('Missing soldier mesh '+name);const geometry=src.geometry.clone().applyMatrix4(src.matrixWorld),color=geometry.getAttribute('color');
    for(let i=0;i<(color?.count||0);i++){const r=color.getX(i),g=color.getY(i),b=color.getZ(i);if(Math.abs(r-.17)<.035&&Math.abs(g-.29)<.035&&Math.abs(b-.29)<.035){if(team===1)color.setXYZ(i,.44,.28,.17);}else if(Math.abs(r-.30)<.035&&Math.abs(g-.53)<.035&&Math.abs(b-.51)<.035){if(team===1)color.setXYZ(i,.76,.37,.17);}}
    const o=new THREE.InstancedMesh(geometry,src.material,18);o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;scene.add(o);batch[name]=o;
   }
   this.batches.push(batch);
   for(let i=0;i<18;i++)this.soldiers.push({team,i,scale:.97+random()*.06,offset:random()*11.8,phase:random()*2,weaponMatrix:new THREE.Matrix4(),seen:new Set()});
  }
  this.reset();
 }
 reset(){this.currentTime=0;this.shotCount=0;for(const s of this.soldiers){const row=Math.floor((s.i%9)/3),lane=s.i%3;s.x=(s.team===0?-1:1)*(19+row*3.5+lane*.55);s.z=(s.i<9?-1:1)*(2.0+lane*.9);s.stopDistance=10.6+row*1.5+lane*.18;s.y=.035;s.clip='Idle';s.clipTime=s.phase;s.previous=null;s.blend=1;s.fireTimer=.4+(s.i%4)*.33;s.burst=0;s.burstTimer=0;s.ammo=9+(s.i%3)*3;s.reloadTime=0;s.firingTime=0;s.seen.clear();s.seen.add('Idle');}this.update(0,0);}
 duration(name){return this.motion.clips[name].duration;}
 transition(s,name,restart=false){if(s.clip===name&&!restart)return;s.previous={name:s.clip,time:s.clipTime};s.clip=name;s.clipTime=(name==='Fire'||name==='CrouchFire'||name==='Reload')?0:s.phase;s.blend=0;s.seen.add(name);}
 sample(name,time,bone,outP,outQ){const clip=this.motion.clips[name],count=clip.frames.length;const t=clip.loop?((time%clip.duration)+clip.duration)%clip.duration:Math.min(clip.duration,Math.max(0,time));const f=t/clip.duration*(count-1),a=Math.floor(f),b=Math.min(count-1,a+1),k=f-a,offset=bone*7,A=clip.frames[a],B=clip.frames[b];outP.fromArray(A,offset);this.p0.fromArray(B,offset);outP.lerp(this.p0,k);outQ.fromArray(A,offset+3);this.q0.fromArray(B,offset+3);outQ.slerp(this.q0,k).normalize();}
 update(dt,time){this.currentTime=time;
  for(const s of this.soldiers){
   const side=s.team===0?1:-1,cycle=(time+s.offset)%12,canAdvance=Math.abs(s.x)>s.stopDistance+.001,moving=canAdvance&&cycle<5.2&&!s.reloadTime;const run=(s.i%3!==1),crouched=!moving&&s.i%3===0&&cycle>7.3;let desired=moving?(run?'Run':'Walk'):crouched?'CrouchAim':cycle>11.25&&s.i%4===1?'Idle':'Aim';
   s.firingTime=Math.max(0,s.firingTime-dt);
   if(s.reloadTime>0){s.reloadTime=Math.max(0,s.reloadTime-dt);desired='Reload';if(s.reloadTime===0)s.ammo=12;}
   else if(moving){const speed=(run?2.3:1.05)*s.scale;s.x+=side*Math.min(Math.abs(s.x)-s.stopDistance,speed*dt);s.burst=0;}
   else if(desired!=='Idle'){
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
   this.heading.setFromAxisAngle(this.yAxis,side*Math.PI/2);this.scale.setScalar(s.scale);this.base.compose(this.p.set(s.x,s.y,s.z),this.heading,this.scale);
   for(let bone=0;bone<this.motion.parts.length;bone++){
    const name=this.motion.parts[bone];this.sample(s.clip,s.clipTime,bone,this.p,this.q);
    if(s.previous){this.sample(s.previous.name,s.previous.time,bone,this.prevP,this.prevQ);this.p.lerpVectors(this.prevP,this.p,s.blend);this.prevQ.slerp(this.q,s.blend).normalize();this.q.copy(this.prevQ);}
    this.local.compose(this.p,this.q,this.scale.set(1,1,1));this.world.multiplyMatrices(this.base,this.local);this.batches[s.team][name].setMatrixAt(s.i,this.world);if(name==='weapon')s.weaponMatrix.copy(this.world);
   }
   if(s.pendingShot){s.pendingShot=false;this.muzzle.fromArray(this.motion.muzzle).applyMatrix4(s.weaponMatrix);const target=new THREE.Vector3(s.x+side*28,this.muzzle.y+(this.random()-.5)*.3,-s.z+(this.random()-.5)*.4);this.onShot(this.muzzle.clone(),target,s.team);this.shotCount++;}
  }
  for(const b of this.batches)for(const o of Object.values(b))o.instanceMatrix.needsUpdate=true;
 }
 position(index=0){const s=this.soldiers[index];return s?new THREE.Vector3(s.x,s.y,s.z):null;}
 diagnostics(){return{trianglesPerSoldier:this.motion.triangles,bones:this.motion.deformBones,clips:Object.keys(this.motion.clips),parts:this.motion.parts.length,materialCount:this.motion.materialCount,drawSections:this.motion.parts.length*2,shots:this.shotCount,states:this.soldiers.reduce((a,s)=>(a[s.clip]=(a[s.clip]||0)+1,a),{}),seen:[...new Set(this.soldiers.flatMap(s=>[...s.seen]))],first:this.soldiers.slice(0,3).map(s=>({position:[s.x,s.y,s.z],state:s.clip,time:s.clipTime,reloading:s.reloadTime>0,ammo:s.ammo}))};}
}
