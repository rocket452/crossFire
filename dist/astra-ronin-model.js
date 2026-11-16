import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {RoninAnimation} from './astra-ronin-animation.js?v=297';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
// Original hard-surface design. Armor is batched per material per articulated joint.
export class AstraRoninModel {
 constructor(root,config){
  Object.assign(this,{root,config,parts:{},hitParts:[],repairs:[]});
  this.armor=new THREE.MeshStandardMaterial({color:'#dce9ef',metalness:.48,roughness:.38});
  this.edge=new THREE.MeshStandardMaterial({color:'#284e79',metalness:.65,roughness:.4});
  this.dark=new THREE.MeshStandardMaterial({color:'#111e2b',metalness:.65,roughness:.55});
  this.metal=new THREE.MeshStandardMaterial({color:'#8eacb6',metalness:.8,roughness:.3});
  this.gold=new THREE.MeshStandardMaterial({color:'#e4ab50',metalness:.6,roughness:.35});
  this.energy=new THREE.MeshStandardMaterial({color:'#a5faff',emissive:'#20c7ef',emissiveIntensity:1.7,roughness:.3});
  const unit=new THREE.Shape();unit.moveTo(-.43,-.43);unit.lineTo(.43,-.43);unit.lineTo(.43,.43);unit.lineTo(-.43,.43);unit.closePath();
  this.box=new THREE.ExtrudeGeometry(unit,{depth:.86,bevelEnabled:true,bevelThickness:.07,bevelSize:.07,bevelSegments:1,steps:1});this.box.translate(0,0,-.43);
  this.axle=new THREE.CylinderGeometry(.5,.5,1,10);this.axle.rotateZ(Math.PI/2);
  const n=(id,p,pos)=>this.node(id,p,pos),b=(p,pos,size,m=this.armor)=>this.block(p,pos,size,m),plate=(p,pos,size,outline,m=this.armor)=>this.plate(p,pos,size,outline,m),hit=(id,node,center,size)=>this.hitParts.push({id,node,center,size});
  const tapered=[[-.5,.5],[.5,.5],[.4,-.28],[.2,-.5],[-.2,-.5],[-.4,-.28]],wing=[[-.5,-.4],[-.5,.3],[.25,.5],[.65,.05],[.4,-.35]],shieldOutline=[[-.4,.5],[.4,.5],[.5,.25],[.25,-.35],[0,-.6],[-.25,-.35],[-.5,.25]];
  this.frame=n('frame',root,[0,4.45,0]);
  const hips=n('hips',this.frame,[0,-.05,0]);b(hips,[0,0,0],[1.65,.7,1.15],this.dark);plate(hips,[0,-.18,.7],[.7,.9,.3],tapered,this.edge);
  const torso=n('torso',this.frame,[0,1.5,0]);b(torso,[0,0,0],[2.45,1.7,1.45],this.dark);
  // Narrow articulated abdomen supports the broad swept chest.
  for(let i=0;i<3;i++)b(torso,[0,-1.05+i*.23,.12],[1.45+i*.14,.18,1.12],i===0?this.metal:this.edge);
  plate(torso,[0,.25,.87],[.8,1.3,.35],tapered,this.edge);plate(torso,[0,.3,1.09],[.32,.55,.08],tapered,this.energy);
  for(const s of[-1,1]){
   const chest=plate(torso,[s*.88,.3,.7],[1.5,1.4,.8],tapered);chest.rotation.z=-s*.17;chest.rotation.y=s*.15;
   b(torso,[s*.85,.22,1.13],[.68,.55,.12],this.dark);for(let i=0;i<3;i++)b(torso,[s*.85,.06+i*.16,1.22],[.57,.07,.1],this.gold);
   b(torso,[s*.85,.82,.55],[1.1,.14,.5],this.edge);
   const side=plate(torso,[s*1.36,-.55,.05],[.46,.7,1.2],tapered,this.edge);side.rotation.z=s*.15;
   const skirt=n((s<0?'left':'right')+'-skirt',hips,[s*.7,-.25,.65]);plate(skirt,[0,-.55,.1],[1,1.2,.35],tapered);b(skirt,[0,-.45,.31],[.65,.1,.06],this.edge);
   const sideSkirt=plate(hips,[s*1.15,-.55,0],[.45,1.1,1.15],tapered,this.edge);sideSkirt.rotation.z=s*.3;
  }
  hit('torso',torso,[0,-.2,.1],[3,2.7,2.1]);
  const neck=n('neck',torso,[0,1.12,0]);b(neck,[0,0,0],[.65,.45,.65],this.metal);
  const head=n('head',neck,[0,.67,.02]);plate(head,[0,0,0],[1.2,1.2,1.1],[[-.5,-.28],[-.5,.15],[-.3,.5],[.3,.5],[.5,.15],[.5,-.28],[.25,-.5],[-.25,-.5]]);
  plate(head,[0,-.08,.63],[1,.53,.12],[[-.5,.4],[.5,.4],[.35,-.5],[-.35,-.5]],this.dark);
  for(const s of[-1,1]){
   const eye=plate(head,[s*.24,.02,.73],[.38,.13,.06],[[-.5,.5],[.5,.3],[.35,-.5],[-.5,-.2]],this.energy);eye.rotation.z=s*.16;
   const cheek=plate(head,[s*.48,-.35,.48],[.3,.7,.5],tapered);cheek.rotation.z=-s*.13;
   const crown=plate(head,[s*.53,.76,.18],[.32,1.45,.14],[[-.5,-.5],[.5,-.5],[.1,.5],[-.2,.25]],this.gold);crown.rotation.z=-s*.65;
   b(head,[s*.64,-.04,-.02],[.24,.64,.65],this.edge);b(head,[s*.77,.12,.05],[.06,.23,.22],this.energy);
  }
  plate(head,[0,-.34,.74],[.45,.62,.35],tapered);plate(head,[0,-.59,.68],[.27,.25,.2],tapered,this.edge);b(head,[0,.58,.03],[.24,.25,.65],this.edge);b(head,[0,.58,.39],[.17,.13,.05],this.energy);
  hit('head',head,[0,0,.1],[1.5,1.4,1.4]);
  const pack=n('backpack',torso,[0,.12,-1.05]);b(pack,[0,0,0],[1.8,1.7,.8],this.edge);this.jets=[];
  for(const s of[-1,1]){
   const pod=n((s<0?'left':'right')+'-thruster',pack,[s*.9,-.1,-.35]);b(pod,[0,0,0],[.65,1.8,.9],this.dark);plate(pod,[0,.35,-.35],[.7,1.35,.45],tapered);b(pod,[0,-.7,-.5],[.55,.55,.2],this.metal);b(pod,[0,-.7,-.64],[.34,.34,.08],this.energy);
   const fin=plate(pack,[s*1.2,.85,-.25],[.7,2.6,.18],tapered,this.edge);fin.rotation.z=-s*.38;fin.rotation.x=-.25;
   const jet=new THREE.Mesh(new THREE.ConeGeometry(.2,1.1,6),new THREE.MeshBasicMaterial({color:'#62eaff',transparent:true,opacity:.5,depthWrite:false}));jet.rotation.x=-Math.PI/2;jet.position.set(0,-.7,-1.1);pod.add(jet);this.jets.push(jet);
  }
  for(const [side,s] of[['left',-1],['right',1]]){
   const arm=n(side+'-upper-arm',torso,[s*1.93,.55,0]);this.block(arm,[0,0,0],[.85,.8,.85],this.metal,this.axle);b(arm,[0,-.68,0],[.6,1.3,.6],this.dark);plate(arm,[0,-.65,.18],[.85,1.3,.65],tapered,this.edge);
   const shoulder=n(side+'-shoulder',arm,[s*.04,.2,0]);shoulder.scale.set(.72,.8,.8);const cap=plate(shoulder,[s*.25,.2,0],[1.85,.95,1.65],wing.map(([x,y])=>[x*s,y]));cap.rotation.z=s*.12;plate(shoulder,[s*.52,-.27,.05],[1.5,.55,1.5],wing.map(([x,y])=>[x*s,y]),this.edge);const fin=plate(shoulder,[s*.85,.65,-.25],[.5,1.05,.5],tapered);fin.rotation.z=-s*.9;b(shoulder,[0,.32,.87],[.63,.13,.08],this.energy);
   const fore=n(side+'-lower-arm',arm,[0,-1.45,0]);this.block(fore,[0,0,0],[.65,.6,.65],this.metal,this.axle);plate(fore,[0,-.73,.1],[1.03,1.4,1.05],tapered);plate(fore,[0,-.7,.65],[.65,.9,.16],tapered,this.edge);b(fore,[0,-1.32,0],[.7,.18,.7],this.dark);
   const hand=n(side+'-hand',fore,[0,-1.55,0]);b(hand,[0,-.05,0],[.65,.55,.65],this.dark);for(let k=0;k<4;k++)b(hand,[(k-1.5)*.15,-.1,.35],[.12,.33,.17],this.metal);b(hand,[-s*.36,-.02,.13],[.2,.37,.27],this.edge);
   const leg=n(side+'-upper-leg',this.frame,[s*.82,-.05,0]);this.block(leg,[0,0,0],[.8,.75,.8],this.metal,this.axle);plate(leg,[0,-.95,.06],[1.05,1.8,1.15],tapered);b(leg,[0,-.9,.66],[.48,.9,.12],this.edge);b(leg,[s*.48,-.9,-.08],[.12,1.25,.3],this.metal);
   const shin=n(side+'-lower-leg',leg,[0,-2.05,0]);this.block(shin,[0,0,0],[.8,.65,.8],this.metal,this.axle);plate(shin,[0,-.05,.6],[1.15,.9,.65],tapered,this.edge);plate(shin,[0,-1,.15],[1.05,1.75,1.15],tapered);plate(shin,[0,-1,.76],[.45,1.1,.13],tapered,this.edge);b(shin,[0,-.9,-.65],[.6,1.4,.55],this.dark);for(const x of[-.45,.45])b(shin,[x,-1,-.15],[.12,1.4,.14],this.metal);b(shin,[0,-1.55,.75],[.32,.1,.06],this.energy);
   const foot=n(side+'-foot',shin,[0,-2.1,0]);plate(foot,[0,-.03,.35],[1.05,.65,1.8],tapered,this.edge);b(foot,[0,.14,.75],[.85,.34,1]);b(foot,[0,-.28,.35],[1.1,.16,1.9],this.dark);const toe=n(side+'-toe',foot,[0,-.02,1.08]);b(toe,[0,0,.2],[.95,.35,.55]);
   hit(side+'-upper-arm',arm,[s*.12,-.4,0],[1.4,2,1.45]);hit(side+'-lower-arm',fore,[0,-.7,.1],[1.1,1.9,1.3]);hit(side+'-upper-leg',leg,[0,-1,0],[1.2,2.2,1.4]);hit(side+'-lower-leg',shin,[0,-1,.3],[1.3,2.9,2.3]);
  }
  const shield=n('shield',this.parts['left-lower-arm'],[-.9,-.65,.25]);shield.scale.set(1.5,1.35,1);shield.rotation.y=-1.15;plate(shield,[0,0,0],[1.75,3,.4],shieldOutline,this.edge);plate(shield,[0,.05,.24],[1.4,2.6,.16],shieldOutline);plate(shield,[0,.1,.35],[.38,2.1,.1],shieldOutline,this.edge);b(shield,[0,.35,.43],[.12,.7,.06],this.energy);b(shield,[0,.8,.42],[.75,.1,.07],this.gold);
  this.sword=n('sword',this.parts['right-hand'],[0,-.05,.05]);b(this.sword,[0,0,.18],[.25,.25,1.05],this.dark);for(let i=0;i<4;i++)b(this.sword,[0,0,-.15+i*.18],[.29,.29,.06],this.gold);plate(this.sword,[0,0,.75],[1.25,.32,.3],wing,this.edge);
  // Broad faceted blade, angled tip, bright continuous cutting edge.
  const blade=this.plate(this.sword,[0,0,3.45],[.75,5.4,.16],[[-.45,-.5],[.4,-.5],[.45,.28],[0,.5],[-.4,.32]],this.metal);blade.rotation.x=Math.PI/2;
  const edge=this.plate(this.sword,[.26,0,3.45],[.12,5.25,.19],[[-.5,-.5],[.5,-.5],[.5,.32],[-.5,.5]],this.energy);edge.rotation.x=Math.PI/2;
  this.tip=n('tip',this.sword,[0,0,6.15]);this.bladeBase=n('blade-base',this.sword,[0,0,1]);this.rifle=this.sword;this.muzzle=this.tip;
  this.flash=new THREE.Mesh(new THREE.IcosahedronGeometry(.12,0),this.energy);this.tip.add(this.flash);this.flash.visible=false;
  this.batch();this.bind=new Map();for(const p of Object.values(this.parts))this.bind.set(p,{p:p.position.clone(),q:p.quaternion.clone()});root.scale.setScalar(config.height/9.6);
  this.animation=new RoninAnimation(this);this.reset();
 }
 node(id,parent,position){const g=new THREE.Group();g.name=id;g.position.set(...position);parent.add(g);this.parts[id]=g;return g;}
 block(parent,position,size,material=this.armor,geometry=this.box){const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.scale.set(...size);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 plate(parent,position,size,outline,material=this.armor){const shape=new THREE.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.86,bevelEnabled:true,bevelThickness:.04,bevelSize:.035,bevelSegments:1,steps:1});g.translate(0,0,-.43);return this.block(parent,position,size,material,g);}
 batch(){const dynamic=new Set([...this.jets,this.flash]);for(const node of Object.values(this.parts)){const groups=new Map();for(const m of node.children){if(!m.isMesh||dynamic.has(m))continue;if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(m);}for(const [material,meshes]of groups){if(meshes.length<2)continue;const inputs=meshes.map(m=>{m.updateMatrix();return(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);});const geometry=mergeGeometries(inputs);inputs.forEach(g=>g.dispose());meshes.forEach(m=>node.remove(m));const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;node.add(mesh);}}}
 reset(){for(const [p,b]of this.bind){p.position.copy(b.p);p.quaternion.copy(b.q);p.visible=true;}this.flash.visible=false;this.animation?.reset();}
 visible(node){while(node&&node!==this.root){if(!node.visible)return false;node=node.parent;}return true;}
 shapes(limbs){this.root.updateWorldMatrix(true,true);return this.hitParts.filter(p=>this.visible(p.node)&&(!limbs[p.id]||limbs[p.id].health>0)).map(p=>({part:p.id,center:p.node.localToWorld(V(...p.center)),half:{x:p.size[0]*this.root.scale.x/2,y:p.size[1]*this.root.scale.x/2,z:p.size[2]*this.root.scale.x/2},rotation:p.node.getWorldQuaternion(new THREE.Quaternion())}));}
 point(id='torso'){return this.parts[id].getWorldPosition(V());}
 animate(dt,time,actor){this.animation.update(dt,time,actor);}
 stats(){let triangles=0,meshes=0;this.root.traverse(o=>{if(o.isMesh&&!o.userData.actorSilhouette){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return{triangles,meshes,height:this.config.height};}
}
