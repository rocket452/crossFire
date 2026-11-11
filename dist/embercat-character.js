import * as THREE from './vendor/three.module.js';
import {HumanoidCharacter} from './humanoid-character.js?v=overall-performance-238';
// Two original silhouettes, with the existing weighted female rig for human casting.
export class EmbercatCharacter {
 constructor(root,model){
  this.root=root;this.cat=new THREE.Group();root.add(this.cat);this.human=new THREE.Group();root.add(this.human);this.character=new HumanoidCharacter(model,{variant:'prism',height:2.5});this.human.add(this.character.root);
  const mat=(color,glow=0)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:glow,roughness:.65}),red=mat('#d53716',.35),coal=mat('#241c23'),gold=mat('#ffb52c',.65),white=new THREE.MeshBasicMaterial({color:'#fff3ba',toneMapped:false});this.red=red;const ball=new THREE.IcosahedronGeometry(1,1),box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,5);
  const mesh=(parent,g,m,p,s)=>{const a=new THREE.Mesh(g,m);a.position.set(...p);a.scale.set(...s);a.castShadow=a.receiveShadow=true;parent.add(a);return a;};this.mesh=mesh;
  this.body=new THREE.Group();this.cat.add(this.body);mesh(this.body,ball,red,[0,.72,0],[.45,.45,.86]);mesh(this.body,ball,coal,[0,1,-.1],[.37,.18,.67]);mesh(this.body,ball,gold,[0,.53,.35],[.32,.22,.47]);
  this.head=new THREE.Group();this.head.position.set(0,1,.9);this.body.add(this.head);mesh(this.head,ball,red,[0,0,0],[.51,.43,.47]);mesh(this.head,ball,gold,[0,-.18,.29],[.35,.2,.23]);mesh(this.head,ball,coal,[0,-.03,.47],[.1,.07,.055]);
  for(const sign of[-1,1]){const ear=mesh(this.head,cone,coal,[sign*.35,.42,-.06],[.24,.6,.19]);ear.rotation.z=-sign*.35;mesh(this.head,cone,red,[sign*.35,.43,.02],[.13,.35,.07]);mesh(this.head,ball,coal,[sign*.23,.06,.36],[.2,.15,.09]);const eye=mesh(this.head,ball,white,[sign*.23,.08,.42],[.135,.065,.035]);eye.rotation.z=-sign*.2;for(let i=0;i<2;i++)mesh(this.body,ball,coal,[sign*.39,.75-i*.25,-.4+i*.55],[.085,.2,.2]);}
  this.legs=[];for(const x of[-.36,.36])for(const z of[-.58,.55]){const leg=new THREE.Group();leg.position.set(x,.65,z);this.body.add(leg);mesh(leg,ball,red,[0,-.2,.07],[.18,.32,.19]);mesh(leg,ball,coal,[0,-.42,.13],[.16,.17,.15]);mesh(leg,ball,red,[0,-.55,.24],[.2,.12,.28]);for(const t of[-1,0,1])mesh(leg,cone,gold,[t*.1,-.55,.45],[.025,.11,.025]).rotation.x=Math.PI/2;this.legs.push(leg);}
  this.tail=new THREE.Group();this.tail.position.set(0,.8,-.7);this.body.add(this.tail);this.tailParts=[];let previous=this.tail;for(let i=0;i<5;i++){const node=new THREE.Group();node.position.set(0,i? .06:0,i?-.38:0);previous.add(node);mesh(node,ball,i%2?gold:red,[0,0,-.23],[.16+i*.025,.21+i*.035,.42]);this.tailParts.push(node);previous=node;}
  // Recolor a private copy only: no changes to Solara, Prismwing or shared geometry.
  for(const m of this.character.meshes){m.geometry=m.geometry.clone();m.material=m.material.clone();const p=m.geometry.attributes.position,col=m.geometry.attributes.color,c=new THREE.Color();for(let i=0;i<p.count;i++){const y=p.getY(i),x=Math.abs(p.getX(i));c.set(y<.43?'#211e27':y<.94?'#d6a17d':y<1.14?'#d53527':y<1.5?(x>.22?'#211e27':'#be291d'):'#d6a17d');col.setXYZ(i,c.r,c.g,c.b);}col.needsUpdate=true;
   m.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 cinderBind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n cinderBind=position;');shader.fragmentShader='varying vec3 cinderBind;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 skin=vec3(.66,.36,.21),coal=vec3(.018,.014,.022),red=vec3(.65,.035,.018);float y=cinderBind.y;float x=abs(cinderBind.x);
    diffuseColor.rgb=y<.43?coal:y<.94?skin:y<1.14?red:y<1.5?(x>.22?coal:red):skin;`);};m.material.customProgramCacheKey=()=> 'cinder-costume-v1';} 

  const attach=(bone,offset)=>{const c=this.character,g=new THREE.Group();g.position.copy(c.world(bone)).add(new THREE.Vector3(...offset));this.human.add(g);root.updateWorldMatrix(true,true);c.nodes[bone].attach(g);return g;};
  const head=attach('B_Head',[0,.08,0]);mesh(head,ball,coal,[0,.06,-.035],[.28,.31,.27]);for(let i=0;i<5;i++){const lock=mesh(head,ball,i%2?red:coal,[-.18+i*.07,.08-i*.04,.16],[.11,.3,.12]);lock.rotation.z=-.45;}mesh(head,ball,red,[.21,-.15,-.07],[.13,.44,.18]);mesh(head,box,coal,[0,-.04,.23],[.36,.075,.045]);for(const s of[-1,1])mesh(head,new THREE.TorusGeometry(.075,.013,4,10),gold,[s*.24,-.12,0],[1,1,1]);
  const jacket=attach('B_Spine2',[0,0,0]);for(const sign of[-1,1]){const panel=mesh(jacket,box,coal,[sign*.22,-.08,.16],[.16,.48,.12]);panel.rotation.z=-sign*.18;}mesh(jacket,cone,gold,[0,-.1,.25],[.045,.12,.03]);this.human.visible=false;this.reset();
 }
 reset(){this.character.reset();this.cat.visible=true;this.human.visible=false;this.cat.scale.setScalar(1);this.human.scale.setScalar(1);}
 pose(dt,time,{cat=true,blend=0,velocity=new THREE.Vector3(),target=null,charge=0,release=0}={}){
  this.cat.visible=cat||blend>0;this.human.visible=!cat||blend>0;this.cat.scale.setScalar(blend>0?(cat?blend:1-blend):1);this.human.scale.setScalar(blend>0?(cat?1-blend:blend):1);
  const rate=time*11;for(let i=0;i<4;i++)this.legs[i].rotation.x=Math.sin(rate+(i===0||i===3?0:Math.PI))*.8;this.body.position.y=Math.sin(rate*2)*.07;this.body.rotation.x=-.06;this.tail.rotation.y=Math.sin(time*4)*.25;for(let i=0;i<5;i++)this.tailParts[i].rotation.x=.12+Math.sin(time*6-i*.6)*.14;
  if(this.human.visible){const c=this.character;c.update('Idle',dt);for(let i=0;i<c.bones.length;i++){c.bones[i].position.copy(c.rest[i].p);c.bones[i].quaternion.copy(c.rest[i].q);}c.nodes.B_Spine.rotation.y+=charge*.2-release*.3;c.nodes.B_L_Thigh.rotation.x+=.08;c.nodes.B_R_Thigh.rotation.x-=.08;c.root.updateWorldMatrix(true,true);const gather=this.human.localToWorld(new THREE.Vector3(-.45,1.65,-.1)),relax=this.human.localToWorld(new THREE.Vector3(.5,1.25,.3));c.arm('R',target?gather.lerp(target,Math.min(1,release*2)):relax);c.arm('L',this.human.localToWorld(new THREE.Vector3(-.5,1.2,.3)));}
  this.root.updateWorldMatrix(true,true);
 }
 muzzle(){return this.character.hand('R');}
 diagnostics(){return{...this.character.diagnostics(),catVisible:this.cat.visible,humanVisible:this.human.visible,legs:this.legs.length,tailSegments:this.tailParts.length,muzzle:this.muzzle().toArray()};}
}
