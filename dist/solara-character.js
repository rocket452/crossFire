import * as THREE from './vendor/three.module.js';
import {HumanoidCharacter} from './humanoid-character.js?v=solara-28';
const UP=new THREE.Vector3(0,1,0);
export class SolaraCharacter {
 constructor(root,humanoid,model,spec){
  this.root=root;this.character=new HumanoidCharacter(humanoid,{variant:'solara',height:2.59});root.add(this.character.root);this.parts=[];this.flameUniform={value:0};
  const c=this.character;for(let i=0;i<c.bones.length;i++){c.bones[i].position.copy(c.rest[i].p);c.bones[i].quaternion.copy(c.rest[i].q);}root.updateMatrixWorld(true);model.scene.updateMatrixWorld(true);
  for(const part of spec.parts){const source=model.scene.getObjectByName(part.name);if(!source)throw Error('Missing Solara accessory '+part.name);const group=new THREE.Group();group.name=part.name;root.add(group);
   source.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.translate(-part.pivot[0],-part.pivot[1],-part.pivot[2]);
    let material=o.material.clone();if(part.name.endsWith('_eye'))material=new THREE.MeshBasicMaterial({color:part.name==='fire_eye'?'#ff3026':'#80edff',toneMapped:false});if(part.name==='fire_hair'){material.onBeforeCompile=shader=>{shader.uniforms.solaraTime=this.flameUniform;shader.vertexShader='uniform float solaraTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float flameTip=clamp((position.y-.24)*.13,0.,.07);transformed.x=min(0.,transformed.x+sin(solaraTime*7.+position.y*18.+position.z*9.)*flameTip);transformed.z+=cos(solaraTime*6.+position.y*13.)*flameTip*.5;');};material.customProgramCacheKey=()=> 'solara-fire-hair-v1';}
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
   });const bone=c.nodes[part.bone];this.parts.push({mesh:group,bone,inverseBind:bone.getWorldQuaternion(new THREE.Quaternion()).invert()});
  }
  const material=c.meshes[0].material;material.roughness=.48;material.metalness=.28;material.onBeforeCompile=shader=>{
   shader.vertexShader='attribute float _region;varying vec3 solaraBind;varying float solaraRegion;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n solaraBind=position;solaraRegion=_region;');
   shader.fragmentShader='varying vec3 solaraBind;varying float solaraRegion;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float iceHalf=step(0.,solaraBind.x);float skin=1.-step(.3,abs(solaraRegion-1.));
    vec3 fireColor=mix(vec3(.34,.045,.008),vec3(1.,.22,.035),skin);
    vec3 iceColor=mix(vec3(.025,.28,.52),vec3(.15,.70,1.),skin);
    float vein=pow(max(0.,sin(solaraBind.y*48.+solaraBind.z*18.)),18.);
    diffuseColor.rgb=mix(fireColor,iceColor,iceHalf)*(1.+vein*.45);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=mix(vec3(1.,.11,.003),vec3(.015,.37,.85),step(0.,solaraBind.x))*(.12+vein*.3);');
  };material.customProgramCacheKey=()=> 'solara-perfect-half-v1';this.sync(0);
 }
 rotate(bone,axis,angle){const world=bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(world);bone.updateWorldMatrix(false,true);}
 leg(side,target){const c=this.character,upper=c.nodes['B_'+side+'_Thigh'],lower=c.nodes['B_'+side+'_Calf'],foot=c.nodes['B_'+side+'_Foot'];const a=c.world(upper.name),b=c.world(lower.name),end=c.world(foot.name),u=a.distanceTo(b),l=b.distanceTo(end),direction=target.clone().sub(a),distance=THREE.MathUtils.clamp(direction.length(),Math.abs(u-l)+.001,u+l-.001);direction.normalize();const pole=this.root.localToWorld(new THREE.Vector3(0,.7,1)).sub(a);pole.addScaledVector(direction,-pole.dot(direction)).normalize();const along=(u*u-l*l+distance*distance)/(2*distance),knee=a.clone().addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,u*u-along*along)));c.point(upper,lower,knee);c.point(lower,foot,target);const toe=c.nodes['B_'+side+'_Toe0'];c.point(foot,toe,foot.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,0,1).transformDirection(this.root.matrixWorld)));}
 pose(dt,time,{speed=0,fireTarget=null,iceTarget=null}={}){
  const c=this.character;c.update('Idle',dt);for(let i=0;i<c.bones.length;i++)if(!c.bones[i].name.includes('Finger')){c.bones[i].position.copy(c.rest[i].p);c.bones[i].quaternion.copy(c.rest[i].q);}c.root.updateWorldMatrix(true,true);
  const pelvis=c.nodes.B_Pelvis;pelvis.position.copy(pelvis.parent.worldToLocal(this.root.localToWorld(new THREE.Vector3(0,1.19+Math.sin(time*2)*.015,0))));pelvis.updateWorldMatrix(false,true);
  const rightAxis=new THREE.Vector3(1,0,0).transformDirection(this.root.matrixWorld);this.rotate(c.nodes.B_Spine2,rightAxis,.08+Math.min(.15,speed*.004));
  for(const[side,sign]of[['R',-1],['L',1]]){this.leg(side,this.root.localToWorld(new THREE.Vector3(sign*.24,.17,side==='R'?.28:-.30)));c.arm(side,(side==='R'?fireTarget:iceTarget)||this.root.localToWorld(new THREE.Vector3(sign*.56,1.35,.20)));}
  this.rotate(c.nodes.B_Head,rightAxis,-.1);this.sync(time);
 }
 sync(time){this.flameUniform.value=time;this.root.updateMatrixWorld(true);const inverse=this.root.getWorldQuaternion(new THREE.Quaternion()).invert();for(const p of this.parts){p.mesh.position.copy(this.root.worldToLocal(p.bone.getWorldPosition(new THREE.Vector3())));p.mesh.quaternion.copy(inverse).multiply(p.bone.getWorldQuaternion(new THREE.Quaternion())).multiply(p.inverseBind);}}
 hand(side){return this.character.hand(side);}
 reset(){this.character.reset();this.sync(0);}
 diagnostics(){return{...this.character.diagnostics(),accessoryParts:this.parts.length,elementSplit:'anatomical right fire / left ice',flameTime:this.flameUniform.value};}
}
