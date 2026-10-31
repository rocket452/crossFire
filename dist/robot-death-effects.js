import * as THREE from './vendor/three.module.js';
import {MissileExplosions} from './missile-explosions.js?v=robot-death-80';
export const ROBOT_DEATH=Object.freeze({maxEmitters:48,maxPuffs:240,smokeSeconds:24,puffSeconds:3.2,interval:.55,bossScale:3,droneScale:1.35});
// Reuse the explosion renderer in its own pool: robot deaths do not count as
// missile interceptions or apply additional blast damage to the evacuation.
export class RobotDeathEffects {
 constructor(scene){
  this.blasts=new MissileExplosions(scene);this.blasts.root.name='Robot reactor explosions';this.emitters=[];this.puffs=[];this.sequence=0;this.dummy=new THREE.Object3D();
  const geometry=new THREE.PlaneGeometry(1,1);geometry.setAttribute('smokeFade',new THREE.InstancedBufferAttribute(new Float32Array(ROBOT_DEATH.maxPuffs),1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,vertexShader:`attribute float smokeFade;varying vec2 vUv;varying float vFade;void main(){vUv=uv;vFade=smokeFade;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*center;}`,fragmentShader:`varying vec2 vUv;varying float vFade;void main(){vec2 p=vUv*2.-1.;float r=dot(p,p);float edge=pow(max(0.,1.-r),1.4);float noise=.88+.12*sin(p.x*13.+p.y*9.+vFade*5.);gl_FragColor=vec4(vec3(.10,.11,.12),edge*noise*vFade*.50);\n#include <colorspace_fragment>\n}`});
  this.smoke=new THREE.InstancedMesh(geometry,material,ROBOT_DEATH.maxPuffs);this.smoke.name='Smoking robot wreckage';this.smoke.frustumCulled=false;this.smoke.renderOrder=1;this.smoke.count=0;scene.add(this.smoke);this.reset();
 }
 reset(){this.blasts.reset();this.emitters.length=this.puffs.length=0;this.sequence=0;this.smoke.count=0;}
 explode(point,{large=false,secondary=false}={}){this.blasts.burst(point,{scale:large?(secondary?2.2:ROBOT_DEATH.bossScale):ROBOT_DEATH.droneScale});}
 part({body,size}){
  if(!body)return;if(this.emitters.length>=ROBOT_DEATH.maxEmitters)this.emitters.shift();
  const scale=THREE.MathUtils.clamp(Math.cbrt(size[0]*size[1]*size[2])*.5,.45,2.2);this.emitters.push({body,size:[...size],scale,age:0,next:0,id:++this.sequence});
 }
 removePart(body){this.emitters=this.emitters.filter(e=>e.body!==body);}
 update(dt){
  this.blasts.update(dt);
  for(let i=this.puffs.length-1;i>=0;i--){const p=this.puffs[i];p.age+=dt;if(p.age>=ROBOT_DEATH.puffSeconds){this.puffs.splice(i,1);continue;}p.position.addScaledVector(p.velocity,dt);}
  for(let i=this.emitters.length-1;i>=0;i--){const e=this.emitters[i];e.age+=dt;e.next-=dt;if(e.age>=ROBOT_DEATH.smokeSeconds){this.emitters.splice(i,1);continue;}if(e.next>0)continue;e.next=ROBOT_DEATH.interval+(e.id%3)*.05;
   const q=e.body.quaternion,[sx,sy,sz]=e.size,top=(Math.abs(2*(q.x*q.y+q.z*q.w))*sx+Math.abs(1-2*(q.x*q.x+q.z*q.z))*sy+Math.abs(2*(q.y*q.z-q.x*q.w))*sz)/2,position=new THREE.Vector3().copy(e.body.position);position.y+=top*.75+.1;
   if(this.puffs.length>=ROBOT_DEATH.maxPuffs)this.puffs.shift();const phase=e.id*2.399+e.age;this.puffs.push({position,velocity:new THREE.Vector3(.3+Math.sin(phase)*.18,.85+e.scale*.45,Math.cos(phase)*.2),age:0,scale:e.scale,density:Math.min(1,(ROBOT_DEATH.smokeSeconds-e.age)/4)});
  }
  let n=0;for(const p of this.puffs){const t=p.age/ROBOT_DEATH.puffSeconds,size=p.scale*(.9+p.age*1.25);this.dummy.position.copy(p.position);this.dummy.scale.set(size,size*1.15,size);this.dummy.updateMatrix();this.smoke.setMatrixAt(n,this.dummy.matrix);this.smoke.geometry.attributes.smokeFade.setX(n++,Math.sin(Math.PI*Math.min(1,t+.07))*p.density);}
  this.smoke.count=n;this.smoke.instanceMatrix.needsUpdate=true;this.smoke.geometry.attributes.smokeFade.needsUpdate=true;
 }
 diagnostics(){return{explosions:this.blasts.diagnostics(),emitters:this.emitters.length,puffs:this.smoke.count,totalParts:this.sequence,smokeSeconds:ROBOT_DEATH.smokeSeconds,limit:ROBOT_DEATH.maxPuffs,draws:(this.blasts.fire.count?1:0)+(this.blasts.smoke.count?1:0)+(this.smoke.count?1:0)};}
}
