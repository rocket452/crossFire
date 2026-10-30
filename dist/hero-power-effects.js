import * as THREE from './vendor/three.module.js';
import {EnergyBeamEffect} from './energy-beam.js?v=runner-6';
export function violetBeamEffect(scene){
 const fx=new EnergyBeamEffect(scene);
 fx.blue.color.set('#b738ff');fx.violet.color.set('#6d20ed');fx.white.color.set('#ffe6ff');
 for(const [i,layer]of fx.layers.entries()){layer.userData.radius*=.7;layer.material.uniforms.color.value.set(['#641ae8','#a62cf6','#dd87ff','#fff0ff'][i]);}
 for(const sprite of[fx.muzzleGlow,fx.hitGlow])sprite.material.color.set('#b64aff');
 fx.arcs.material.color.set('#f0aaff');fx.muzzleLight.color.set('#b53cff');fx.impactLight.color.set('#b53cff');return fx;
}
// Fixed-size geometry pool: visible thick electric branches around the entire robot.
export class RobotStunEffect {
 constructor(scene){this.root=new THREE.Group();scene.add(this.root);this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);const geo=new THREE.CylinderGeometry(1,1,1,5,1,true);
 this.arcs=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:'#b9fbff',toneMapped:false}),144);
 this.glow=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({color:'#319eff',transparent:true,opacity:.34,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),144);
 for(const mesh of[this.arcs,this.glow]){mesh.frustumCulled=false;mesh.count=0;this.root.add(mesh);}this.light=new THREE.PointLight('#5eeaff',0,40,2);this.root.add(this.light);this.clear();}
 clear(){this.root.visible=false;this.arcs.count=this.glow.count=0;this.light.intensity=0;}
 update(robot,time){if(robot.dead||robot.stunRemaining<=0){this.clear();return;}this.root.visible=true;const center=robot.root.position;let index=0;
 for(let branch=0;branch<12;branch++){let previous=null;for(let j=0;j<=12;j++){const t=j/12,a=branch*Math.PI/6+t*2+Math.floor(time*24)*.33,r=4+Math.sin(j*4.7+branch+Math.floor(time*30))*1.4,p=new THREE.Vector3(center.x+Math.cos(a)*r,center.y+1+t*20,center.z+Math.sin(a)*r);if(previous){this.dummy.position.copy(previous).add(p).multiplyScalar(.5);this.dummy.quaternion.setFromUnitVectors(this.up,p.clone().sub(previous).normalize());for(const [mesh,radius]of[[this.arcs,.065],[this.glow,.22]]){this.dummy.scale.set(radius,previous.distanceTo(p),radius);this.dummy.updateMatrix();mesh.setMatrixAt(index,this.dummy.matrix);}index++;}previous=p;}}
 for(const mesh of[this.arcs,this.glow]){mesh.count=index;mesh.instanceMatrix.needsUpdate=true;}this.light.position.copy(center).y+=12;this.light.intensity=110+Math.sin(time*70)*40;}
}
