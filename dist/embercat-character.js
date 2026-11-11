import * as THREE from './vendor/three.module.js';
import {FireCatModel} from './fire-cat-model.js?v=firecat-predator-252';
import {HumanoidCharacter} from './humanoid-character.js?v=overall-performance-238';
// Two original silhouettes, with the existing weighted female rig for human casting.
export class EmbercatCharacter {
 constructor(root,model){
  this.root=root;this.cat=new THREE.Group();root.add(this.cat);this.human=new THREE.Group();root.add(this.human);this.character=new HumanoidCharacter(model,{variant:'prism',height:2.5});this.human.add(this.character.root);
  const mat=(color,glow=0)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:glow,roughness:.65}),red=mat('#d53716',.35),coal=mat('#241c23'),gold=mat('#ffb52c',.65),white=new THREE.MeshBasicMaterial({color:'#fff3ba',toneMapped:false});this.red=red;const ball=new THREE.IcosahedronGeometry(1,1),box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,5);
  const mesh=(parent,g,m,p,s)=>{const a=new THREE.Mesh(g,m);a.position.set(...p);a.scale.set(...s);a.castShadow=a.receiveShadow=true;parent.add(a);return a;};this.mesh=mesh;
  this.catArt=new FireCatModel(this.cat);for(const key of ['body','head','legs','tail'])this[key]=this.catArt[key];
  // Recolor a private copy only: no changes to Solara, Prismwing or shared geometry.
  for(const m of this.character.meshes){m.geometry=m.geometry.clone();m.material=m.material.clone();const p=m.geometry.attributes.position,col=m.geometry.attributes.color,c=new THREE.Color();for(let i=0;i<p.count;i++){const y=p.getY(i),x=Math.abs(p.getX(i));c.set(y<.43?'#211e27':y<.94?'#d6a17d':y<1.14?'#d53527':y<1.5?(x>.22?'#211e27':'#be291d'):'#d6a17d');col.setXYZ(i,c.r,c.g,c.b);}col.needsUpdate=true;
   m.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 cinderBind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n cinderBind=position;');shader.fragmentShader='varying vec3 cinderBind;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 skin=vec3(.66,.36,.21),coal=vec3(.018,.014,.022),red=vec3(.65,.035,.018);float y=cinderBind.y;float x=abs(cinderBind.x);
    diffuseColor.rgb=y<.43?coal:y<.94?skin:y<1.14?red:y<1.5?(x>.22?coal:red):skin;`);};m.material.customProgramCacheKey=()=> 'cinder-costume-v1';} 

  const attach=(bone,offset)=>{const c=this.character,g=new THREE.Group();g.position.copy(c.world(bone)).add(new THREE.Vector3(...offset));this.human.add(g);root.updateWorldMatrix(true,true);c.nodes[bone].attach(g);return g;};
  const head=attach('B_Head',[0,.08,0]);mesh(head,ball,coal,[0,.06,-.035],[.28,.31,.27]);for(let i=0;i<5;i++){const lock=mesh(head,ball,i%2?red:coal,[-.18+i*.07,.08-i*.04,.16],[.11,.3,.12]);lock.rotation.z=-.45;}mesh(head,ball,red,[.21,-.15,-.07],[.13,.44,.18]);mesh(head,box,coal,[0,-.04,.23],[.36,.075,.045]);for(const s of[-1,1])mesh(head,new THREE.TorusGeometry(.075,.013,4,10),gold,[s*.24,-.12,0],[1,1,1]);
  const jacket=attach('B_Spine2',[0,0,0]);for(const sign of[-1,1]){const panel=mesh(jacket,box,coal,[sign*.22,-.08,.16],[.16,.48,.12]);panel.rotation.z=-sign*.18;}mesh(jacket,cone,gold,[0,-.1,.25],[.045,.12,.03]);this.human.visible=false;this.reset();
 }
 reset(){this.character.reset();this.catArt.pose(0,new THREE.Vector3());this.cat.visible=true;this.human.visible=false;this.cat.scale.setScalar(1);this.human.scale.setScalar(1);}
 pose(dt,time,{cat=true,blend=0,velocity=new THREE.Vector3(),target=null,charge=0,release=0}={}){
  this.cat.visible=cat||blend>0;this.human.visible=!cat||blend>0;this.cat.scale.setScalar(blend>0?(cat?blend:1-blend):1);this.human.scale.setScalar(blend>0?(cat?1-blend:blend):1);
  this.catArt.pose(time,velocity);
  if(this.human.visible){const c=this.character;c.update('Idle',dt);for(let i=0;i<c.bones.length;i++){c.bones[i].position.copy(c.rest[i].p);c.bones[i].quaternion.copy(c.rest[i].q);}c.nodes.B_Spine.rotation.y+=charge*.2-release*.3;c.nodes.B_L_Thigh.rotation.x+=.08;c.nodes.B_R_Thigh.rotation.x-=.08;c.root.updateWorldMatrix(true,true);const gather=this.human.localToWorld(new THREE.Vector3(-.45,1.65,-.1)),relax=this.human.localToWorld(new THREE.Vector3(.5,1.25,.3));c.arm('R',target?gather.lerp(target,Math.min(1,release*2)):relax);c.arm('L',this.human.localToWorld(new THREE.Vector3(-.5,1.2,.3)));}
  this.root.updateWorldMatrix(true,true);
 }
 muzzle(){return this.character.hand('R');}
 diagnostics(){return{...this.character.diagnostics(),catVisible:this.cat.visible,humanVisible:this.human.visible,legs:this.legs.length,tailSegments:this.catArt.tailSegments,muzzle:this.muzzle().toArray()};}
}
