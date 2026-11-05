import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {DroneTracks} from './drone-tracks.js?v=tracked-drones-64';
export const BRUISER_ART=Object.freeze({headshotSeconds:.35,sparks:18,recoilSeconds:.12});
// Shared geometry per articulated part/material; detail does not add a draw per plate.
function plateGeometry(){const s=new THREE.Shape(),c=.13;s.moveTo(-.5+c,-.5);for(const p of[[.5-c,-.5],[.5,-.5+c],[.5,.5-c],[.5-c,.5],[-.5+c,.5],[-.5,.5-c],[-.5,-.5+c],[-.5+c,-.5]])s.lineTo(...p);return new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,steps:1,curveSegments:1}).translate(0,0,-.5);}
export class BruiserModel {
 constructor(root,scene){
  this.root=root;this.scene=scene;this.parts={};this.batches=[];
  const armor=new THREE.MeshStandardMaterial({color:'#65757d',metalness:.65,roughness:.57,flatShading:true}),trim=new THREE.MeshStandardMaterial({color:'#acb9b8',metalness:.65,roughness:.48,flatShading:true}),dark=new THREE.MeshStandardMaterial({color:'#202b32',metalness:.45,roughness:.8}),signal=new THREE.MeshStandardMaterial({color:'#ff6644',emissive:'#ff3715',emissiveIntensity:1.7});
  const box=new THREE.BoxGeometry(1,1,1),plate=plateGeometry(),cylinder=new THREE.CylinderGeometry(.5,.5,1,8),cylinderZ=cylinder.clone().rotateX(Math.PI/2),matrix=new THREE.Object3D(),pending=new Map();
  const joint=(name,parent,p)=>{const n=new THREE.Group();n.name='Bruiser '+name;n.position.set(...p);parent.add(n);this.parts[name]=n;return n;};
  const add=(parent,p,size,mat=armor,g=plate,rotation=[0,0,0])=>{let groups=pending.get(parent);if(!groups)pending.set(parent,groups=new Map());if(!groups.has(mat))groups.set(mat,[]);matrix.position.set(...p);matrix.scale.set(...size);matrix.rotation.set(...rotation);matrix.updateMatrix();const geometry=g.clone().applyMatrix4(matrix.matrix);groups.get(mat).push(geometry.index?geometry.toNonIndexed():geometry);};
  const body=joint('body',root,[0,2.9,0]);add(body,[0,0,0],[1.85,1.5,1.08]);add(body,[0,.22,.61],[1.5,.67,.18],trim);add(body,[0,-.49,.6],[1.4,.3,.16]);add(body,[0,0,-.7],[1.4,1.08,.4],dark);add(body,[0,-.9,0],[.84,.3,.75],dark,cylinder);
  for(const sign of[-1,1]){add(body,[sign*.85,.45,.2],[.3,.7,1],trim);for(let i=0;i<3;i++){add(body,[sign*.46,-.19-i*.13,.635],[.47,.055,.07],dark,box);add(body,[sign*.4,.2-i*.2,-.94],[.48,.07,.08],trim,box);}add(body,[sign*.72,.2,-.73],[.16,.87,.2],armor,cylinder);}
  const reactor=joint('reactor',body,[0,.22,.73]);add(reactor,[0,0,0],[.35,.35,.12],signal,cylinderZ);
  const head=joint('head',body,[0,1.12,0]);add(head,[0,0,0],[1.05,.65,.86]);add(head,[0,.28,.12],[1.18,.18,.95],trim);add(head,[0,-.27,.24],[.72,.2,.56],dark);add(head,[0,.04,.455],[.82,.23,.09],dark);const visor=joint('visor',head,[0,.04,.51]);add(visor,[0,0,0],[.69,.12,.055],signal,box);for(const sign of[-1,1]){add(head,[sign*.55,-.02,0],[.12,.4,.56],trim);add(head,[sign*.33,.12,-.37],[.12,.46,.12],dark,box);}
  const left=joint('arm_l',body,[-1.2,-.1,0]),right=joint('arm_r',body,[1.18,-.05,.25]);
  for(const [arm,sign]of[[left,-1],[right,1]]){add(arm,[sign*.04,.27,0],[.72,.68,.9],trim);add(arm,[0,-.36,0],[.38,.75,.38],dark);add(arm,[0,-.6,.13],[.6,.45,.6]);add(arm,[sign*.26,-.34,0],[.1,.52,.12],trim,cylinder);}
  add(left,[0,-1.04,.07],[.6,.58,.58]);add(left,[0,-1.43,.14],[.54,.25,.5],dark);for(const x of[-.17,0,.17])add(left,[x,-1.56,.22],[.12,.22,.19],trim,box);
  const barrel=joint('barrel',right,[0,-.15,.8]);this.barrel=barrel;add(barrel,[0,0,-.35],[.77,.82,1.12]);add(barrel,[0,0,.4],[.55,.55,1.15],dark,cylinderZ);for(const sign of[-1,1]){add(barrel,[sign*.35,0,.03],[.16,.44,.76],trim);for(let i=0;i<3;i++)add(barrel,[sign*.34,0,-.15+i*.2],[.19,.28,.075],signal,box);}
  const slide=joint('cannon_slide',barrel,[0,0,0]);this.slide=slide;add(slide,[0,0,.77],[.68,.68,.16],trim,cylinderZ);add(slide,[0,0,.865],[.39,.39,.045],dark,cylinderZ);add(slide,[0,0,.895],[.23,.23,.04],signal,cylinderZ);
  for(const [parent,groups]of pending)for(const [material,geometries]of groups){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.name=parent.name+' armor';mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);this.batches.push(mesh);for(const g of geometries)g.dispose();}box.dispose();plate.dispose();cylinder.dispose();cylinderZ.dispose();
  this.tracks=new DroneTracks(root,{armor,dark});
  const light=new THREE.MeshBasicMaterial({color:'#fff3c2',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  this.visorFlash=new THREE.Mesh(new THREE.BoxGeometry(.76,.16,.07),light);visor.add(this.visorFlash);this.visorFlash.visible=false;
  this.effect=new THREE.Group();this.effect.name='Bruiser headshot burst';scene.add(this.effect);this.ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.035,4,24),light.clone());this.effect.add(this.ring);this.sparks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07,0),light.clone(),BRUISER_ART.sparks);this.effect.add(this.sparks);this.dummy=new THREE.Object3D();this.reset();
 }
 reset(){this.hitLife=this.recoil=0;this.effect.visible=this.visorFlash.visible=false;this.parts.head.rotation.set(0,0,0);this.slide.position.z=0;}
 fire(){this.recoil=BRUISER_ART.recoilSeconds;}
 headshot(point){this.hitLife=BRUISER_ART.headshotSeconds;this.effect.position.copy(point||this.parts.head.getWorldPosition(new THREE.Vector3()));this.effect.visible=true;this.visorFlash.visible=true;}
 update(dt,time){this.recoil=Math.max(0,this.recoil-dt);this.slide.position.z=-.15*this.recoil/BRUISER_ART.recoilSeconds;this.hitLife=Math.max(0,this.hitLife-dt);const fade=this.hitLife/BRUISER_ART.headshotSeconds,age=1-fade;if(this.parts.head.parent===this.parts.body)this.parts.head.rotation.x=fade?-Math.sin(age*Math.PI)*fade*.28:0;this.effect.visible=this.visorFlash.visible=fade>0;if(!fade)return;this.visorFlash.material.opacity=fade;this.ring.material.opacity=fade;this.ring.scale.setScalar(.55+age*2.6);this.ring.rotation.set(time*.3,age*Math.PI,0);this.sparks.material.opacity=fade;for(let i=0;i<BRUISER_ART.sparks;i++){const a=i*2.39996,y=1-2*(i+.5)/BRUISER_ART.sparks,r=Math.sqrt(1-y*y),distance=.15+age*(1.4+i%3*.2);this.dummy.position.set(Math.cos(a)*r*distance,y*distance,Math.sin(a)*r*distance);this.dummy.scale.setScalar(.4+fade);this.dummy.updateMatrix();this.sparks.setMatrixAt(i,this.dummy.matrix);}this.sparks.instanceMatrix.needsUpdate=true;}
 diagnostics(){let triangles=0,meshes=0;this.root.traverse(m=>{if(m.isMesh){meshes++;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1);}});return{triangles,meshes,headshotEffect:this.effect.visible,headshotRemaining:this.hitLife,recoil:this.recoil};}
}
