import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Low-poly Assault Sentinel after the concept sheet: two independent tread assemblies, a forward-leaning
// armoured torso turret, a low helmeted head with a glowing hex eye, heavy pauldrons, short arms ending in
// twin cannons, chest armour doors that swing open over a front core, and a rear reactor housing.
// Built from primitives (no skinning); the entity animates the pivots. Designed ~2.35 m and scaled.
export const SENTINEL_COLORS=Object.freeze({armor:'#b5b2c2',dark:'#2b2a32',mid:'#4b4954',tread:'#1d1c22',trim:'#ff8424',eye:'#ff7a1a',core:'#ff4318'});
const DESIGN_HEIGHT=2.35;

// Tread loop: links run around a stadium (two straights joined by half circles) and scroll with motion.
class TreadLoop {
 constructor(parent,material,{radius=.4,span=1.2,centerY=.47,links=24,width=.58}={}){
  Object.assign(this,{radius,span,centerY,links});
  this.length=2*span+2*Math.PI*radius;this.offset=0;
  this.mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(width,.07,this.length/links*.8),material,links);
  this.mesh.castShadow=true;this.mesh.frustumCulled=false;parent.add(this.mesh);
  this.dummy=new THREE.Object3D();this.place();
 }
 // Point and tangent angle at distance s around the loop (z forward, y up).
 at(s){
  const {span,radius,centerY}=this,h=span/2,L=this.length;s=((s%L)+L)%L;
  if(s<span)return [centerY+radius,-h+s,0];
  s-=span;const arc=Math.PI*radius;
  if(s<arc){const a=s/radius;return [centerY+Math.cos(a)*radius,h+Math.sin(a)*radius,a];}
  s-=arc;if(s<span)return [centerY-radius,h-s,Math.PI];
  s-=span;const a=s/radius;return [centerY-Math.cos(a)*radius,-h-Math.sin(a)*radius,Math.PI+a];
 }
 place(){
  for(let i=0;i<this.links;i++){const [y,z,a]=this.at(this.offset+i*this.length/this.links);this.dummy.position.set(0,y,z);this.dummy.rotation.set(a,0,0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);}
  this.mesh.instanceMatrix.needsUpdate=true;
 }
 advance(distance){if(!distance)return;this.offset+=distance;this.place();}
}

// Collapse each pivot's static child meshes into one mesh per material (~75 → ~30 draw calls a robot).
function mergeStatic(root,keep){
 const parents=[];root.traverse(o=>{if(o.children.some(c=>c.isMesh))parents.push(o);});
 for(const parent of parents){
  const groups=new Map();
  for(const m of parent.children){if(!m.isMesh||m.isInstancedMesh||keep.has(m)||m.children.length)continue;if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(m);}
  for(const [material,list] of groups){
   if(list.length<2)continue;
   const geoms=list.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);g.clearGroups();return g;});
   const merged=mergeGeometries(geoms,false);if(!merged)continue;
   const mesh=new THREE.Mesh(merged,material);mesh.castShadow=list.some(m=>m.castShadow);mesh.receiveShadow=true;parent.add(mesh);
   for(const m of list)parent.remove(m);for(const g of geoms)g.dispose();
  }
 }
}

export function buildSentinelModel(height=2.7){
 const root=new THREE.Group();root.name='Assault Sentinel model';
 const S=height/DESIGN_HEIGHT;root.scale.setScalar(S);
 const std=(color,rough=.55,metal=.3)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,flatShading:true});
 const M={armor:std(SENTINEL_COLORS.armor,.45,.35),dark:std(SENTINEL_COLORS.dark,.6,.4),mid:std(SENTINEL_COLORS.mid,.55,.35),tread:std(SENTINEL_COLORS.tread,.8,.25),
  trim:new THREE.MeshStandardMaterial({color:'#ff9a3c',emissive:SENTINEL_COLORS.trim,emissiveIntensity:1.6,roughness:.5}),
  eye:new THREE.MeshStandardMaterial({color:'#ffb56a',emissive:SENTINEL_COLORS.eye,emissiveIntensity:2.6}),
  core:new THREE.MeshStandardMaterial({color:'#ff7a4a',emissive:SENTINEL_COLORS.core,emissiveIntensity:2.2}),
  frontCore:new THREE.MeshStandardMaterial({color:'#ff7a4a',emissive:SENTINEL_COLORS.core,emissiveIntensity:.4}),
  muzzle:new THREE.MeshStandardMaterial({color:'#ff9a5a',emissive:'#ff3a14',emissiveIntensity:.8})};
 const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
 const add=(parent,geometry,material,pos=[0,0,0],rot=[0,0,0])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const pivot=(parent,pos,name)=>{const g=new THREE.Group();g.position.set(...pos);g.name=name;parent.add(g);return g;};
 const hex=(r,d,material,parent,pos,rot)=>add(parent,new THREE.CylinderGeometry(r,r,d,6),material,pos,rot);
 // Angular plate from an outline in the XY plane, extruded along Z.
 const plate=(pts,depth,bevel=.03)=>{const s=new THREE.Shape(pts.map(([x,y])=>new THREE.Vector2(x,y)));const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1});g.translate(0,0,-depth/2);return g;};
 const parts={},treads={};

 // ---- tread assemblies ------------------------------------------------------------------------
 const chassis=pivot(root,[0,0,0],'Sentinel chassis');parts.chassis=chassis;
 for(const [side,key] of [[-1,'L'],[1,'R']]){
  const t=pivot(chassis,[side*.74,0,0],'Sentinel tread '+key);
  add(t,box(.5,.62,1.2),M.dark,[0,.47,0]);
  for(const z of [-.6,.6])add(t,new THREE.CylinderGeometry(.36,.36,.5,10),M.dark,[0,.47,z],[0,0,Math.PI/2]);
  const loop=new TreadLoop(t,M.tread);
  // Outer side panel, road wheels with glowing hubs and the curved orange trim from the sheet.
  add(t,box(.06,.5,1.3),M.mid,[side*.29,.5,0]);
  for(const z of [-.62,0,.62]){add(t,new THREE.CylinderGeometry(.19,.19,.08,10),M.dark,[side*.33,.47,z],[0,0,Math.PI/2]);add(t,new THREE.CylinderGeometry(.06,.06,.1,6),M.trim,[side*.35,.47,z],[0,0,Math.PI/2]);}
  const arc=add(t,new THREE.TorusGeometry(.4,.028,5,18,2.3),M.trim,[side*.34,.48,-.42],[0,Math.PI/2,1.9]);arc.castShadow=false;
  // Armoured fender block on top of the front of each tread.
  add(t,plate([[-.3,0],[.3,0],[.26,.22],[-.2,.26]],.46),M.armor,[0,.98,.25],[0,Math.PI/2,0]);
  treads[key]=loop;
 }
 // Hip and axle between the treads, with the light pelvis plate.
 add(chassis,box(1.0,.32,.62),M.dark,[0,.78,-.02]);
 add(chassis,plate([[-.42,-.12],[.42,-.12],[.34,.18],[-.34,.18]],.18),M.armor,[0,.86,.3],[-.25,0,0]);

 // ---- torso turret ------------------------------------------------------------------------------
 const body=parts.body=pivot(root,[0,1.05,-.05],'Sentinel torso');
 const chest=parts.chest=pivot(body,[0,0,.05],'Sentinel chest');chest.rotation.x=.3;
 add(chest,box(1.28,1.0,.94),M.dark,[0,.55,0]);
 add(chest,plate([[-.62,0],[.62,0],[.56,.34],[-.56,.34]],.86),M.armor,[0,1.03,-.08],[-.12,0,0]);
 add(chest,box(1.1,.2,.7),M.mid,[0,.12,0]);
 // Front core behind two armour doors hinged at their outer edges.
 const frontCore=parts.frontCore=pivot(chest,[0,.44,.47],'Sentinel front core');
 hex(.3,.08,M.frontCore,frontCore,[0,0,0],[Math.PI/2,0,0]);
 for(const a of [0,2.094,4.189])add(frontCore,box(.05,.27,.03),M.dark,[Math.sin(a)*.12,Math.cos(a)*.12,.05],[0,0,-a]);
 for(const [side,key] of [[-1,'L'],[1,'R']]){
  const door=parts['door'+key]=pivot(chest,[side*.62,.5,.5],'Sentinel chest door '+key);
  add(door,plate([[0,-.4],[-side*.6,-.34],[-side*.62,.3],[0,.4]].map(([x,y])=>[x,y]),.1,.025),M.armor,[0,0,0]);
  add(door,box(.04,.5,.04),M.trim,[-side*.5,0,.07]).castShadow=false;
 }
 // Head: low in front between the shoulders, helmet plate, brow V and glowing hex eye.
 const head=parts.head=pivot(chest,[0,1.1,.4],'Sentinel head');head.scale.setScalar(1.4);
 add(head,box(.5,.38,.44),M.dark,[0,0,0]);
 add(head,plate([[-.3,0],[.3,0],[.26,.18],[0,.24],[-.26,.18]],.54,.025),M.armor,[0,.15,-.02]);
 for(const side of [-1,1]){add(head,box(.26,.07,.07),M.armor,[side*.13,.1,.235],[0,0,side*.36]);add(head,box(.07,.24,.36),M.armor,[side*.27,-.02,.02]);}
 add(head,box(.2,.12,.06),M.dark,[0,-.13,.22]);
 const eye=hex(.11,.05,M.eye,head,[0,-.01,.235],[Math.PI/2,0,0]);eye.castShadow=false;parts.eye=eye;
 // Pauldrons and arms with integrated twin cannons.
 for(const [side,key] of [[-1,'R'],[1,'L']]){
  add(chest,plate([[-.36,-.22],[.36,-.22],[.32,.22],[-.28,.26]],.84),M.armor,[side*.9,1.0,0],[0,0,side*-.14]);
  add(chest,box(.5,.28,.7),M.dark,[side*.86,.74,0]);
  add(chest,box(.05,.22,.05),M.trim,[side*1.16,1.0,.42]).castShadow=false;
  const arm=parts['arm_'+(key==='L'?'l':'r')]=pivot(chest,[side*.95,.66,.05],'Sentinel arm '+key);
  add(arm,box(.32,.52,.36),M.dark,[0,-.24,0]);
  const gun=pivot(arm,[0,-.5,.08],'Sentinel cannon '+key);parts['gun'+key]=gun;
  add(gun,box(.46,.44,.9),M.dark,[0,0,.25]);
  add(gun,plate([[-.25,0],[.25,0],[.2,.12],[-.2,.12]],.8,.02),M.armor,[0,.2,.22]);
  for(const x of [-.11,.11])add(gun,new THREE.CylinderGeometry(.075,.085,.36,8),M.mid,[x,-.03,.84],[Math.PI/2,0,0]);
  add(gun,box(.06,.06,.5),M.trim,[side*.24,-.05,.2]).castShadow=false;
  const muzzle=pivot(gun,[0,-.03,1.04],'Sentinel muzzle '+key);parts['muzzle'+key]=muzzle;
  for(const x of [-.11,.11])add(muzzle,new THREE.CylinderGeometry(.06,.06,.04,8),M.muzzle,[x,0,0],[Math.PI/2,0,0]).castShadow=false;
 }
 // Rear reactor: dark housing, red hex core split by a Y divider, orange rim.
 const reactor=parts.reactor=pivot(chest,[0,.62,-.5],'Sentinel reactor');
 add(reactor,box(.96,.86,.28),M.dark,[0,0,-.05]);
 const core=hex(.33,.1,M.core,reactor,[0,0,-.2],[Math.PI/2,0,0]);core.castShadow=false;parts.core=core;
 for(const a of [0,2.094,4.189])add(reactor,box(.07,.33,.04),M.dark,[Math.sin(a)*.15,Math.cos(a)*.15,-.27],[0,0,-a]);
 add(reactor,new THREE.TorusGeometry(.38,.025,4,6),M.trim,[0,0,-.21],[0,0,Math.PI/6]).castShadow=false;
 mergeStatic(root,new Set([parts.eye,parts.core]));
 root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
 return {root,parts,treads,materials:M,scale:S};
}
