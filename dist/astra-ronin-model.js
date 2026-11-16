import * as THREE from './vendor/three.module.js';
import {MireguardModel} from './mireguard-model.js?v=mireguard-art-243';
// Original rigid-jointed duelist. Static armor batches retain independent pivots.
export class AstraRoninModel extends MireguardModel {
 constructor(root,config){
  // Reuse mesh batching, world hit-shapes and bind-pose helpers, not the infantry mesh.
  super(root,config);root.clear();const outline=new THREE.Shape();outline.moveTo(-.42,-.42);outline.lineTo(.42,-.42);outline.lineTo(.42,.42);outline.lineTo(-.42,.42);outline.closePath();this.box=new THREE.ExtrudeGeometry(outline,{depth:.84,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:1,steps:1});this.box.translate(0,0,-.42);this.parts={};this.hitParts=[];this.repairs=[];
  this.armor.color.set('#d9e4e7');this.edge.color.set('#466a92');this.dark.color.set('#131f32');this.energy.color.set('#8cffff');this.energy.emissive.set('#24cfff');
  const n=(id,p,pos)=>this.node(id,p,pos),b=(p,pos,size,m=this.armor)=>this.block(p,pos,size,m),hit=(id,node,center,size)=>this.hitParts.push({id,node,center,size});
  this.frame=n('frame',root,[0,5.3,0]);const torso=n('torso',this.frame,[0,1.25,0]);
  b(torso,[0,0,0],[2.8,2.1,1.45],this.dark);for(const s of[-1,1]){const p=b(torso,[s*.76,.25,.6],[1.45,1.35,.65]);p.rotation.z=s*.2;b(torso,[s*.85,.05,1],[.8,.13,.08],this.energy);b(torso,[s*.85,.1,-1],[.65,2.1,.8],this.edge);b(torso,[s*.85,-.8,-1.4],[.4,.6,.4],this.energy);const skirt=b(torso,[s*.95,-1.65,.35],[1,.95,.8],this.edge);skirt.rotation.z=s*.18;}
  b(torso,[0,-.9,0],[1.7,.55,1.25],this.edge);b(torso,[0,.25,.97],[.5,.65,.15],this.energy);hit('torso',torso,[0,0,0],[3,2.5,2]);
  const head=n('head',torso,[0,1.8,0]);b(head,[0,0,0],[1.35,1.25,1.1]);b(head,[0,.05,.61],[1.1,.24,.15],this.dark);b(head,[0,.06,.71],[.86,.09,.04],this.energy);b(head,[0,-.4,.58],[.5,.5,.45],this.edge);for(const s of[-1,1]){const fin=b(head,[s*.65,.65,-.15],[.16,1.25,.5],this.edge);fin.rotation.z=-s*.3;}hit('head',head,[0,0,0],[1.4,1.4,1.3]);
  for(const [side,s] of[['left',-1],['right',1]]){
   const arm=n(side+'-upper-arm',torso,[s*2,.65,0]);b(arm,[0,-.3,0],[.7,1.3,.8],this.dark);const cap=b(arm,[s*.1,.2,0],[1.65,.8,1.65]);cap.rotation.z=s*.18;b(arm,[s*.75,.15,0],[.1,.45,1.1],this.energy);
   const fore=n(side+'-lower-arm',arm,[0,-1.45,0]);b(fore,[0,0,0],[.75,.6,.75],this.edge);b(fore,[0,-.7,0],[1,1.3,1.1]);b(fore,[0,-.65,.58],[.4,.75,.08],this.edge);const hand=n(side+'-hand',fore,[0,-1.5,0]);b(hand,[0,0,0],[.65,.6,.65],this.dark);for(let k=0;k<3;k++)b(hand,[(k-1)*.2,-.1,.36],[.14,.35,.15]);
   const leg=n(side+'-upper-leg',this.frame,[s*.85,-.25,0]);b(leg,[0,-.85,0],[1,1.8,1.15]);b(leg,[0,-.8,.62],[.55,1,.15],this.edge);const shin=n(side+'-lower-leg',leg,[0,-1.9,0]);b(shin,[0,-.1,.45],[1.15,.8,.75],this.edge);b(shin,[0,-1,0],[.75,1.9,.85],this.dark);b(shin,[0,-1,.45],[1.1,1.8,.5]);for(const x of[-.45,.45])b(shin,[x,-1,-.2],[.12,1.5,.12],this.edge);const foot=n(side+'-foot',shin,[0,-2.35,.45]);b(foot,[0,0,0],[1.2,.65,2],this.edge);b(foot,[0,.1,.6],[1,.4,.9]);
   hit(side+'-upper-arm',arm,[0,-.5,0],[1.5,1.9,1.5]);hit(side+'-lower-arm',fore,[0,-.7,0],[1.1,1.9,1.2]);hit(side+'-upper-leg',leg,[0,-.8,0],[1.1,1.9,1.3]);hit(side+'-lower-leg',shin,[0,-1,.2],[1.3,2.9,1.8]);
  }
  const shield=n('shield',this.parts['left-lower-arm'],[-.55,-.6,.3]);b(shield,[0,0,0],[.5,2.5,1.7],this.edge);b(shield,[-.3,0,0],[.15,1.8,1.2]);b(shield,[-.4,0,0],[.05,1.3,.13],this.energy);
  this.sword=n('sword',this.parts['right-hand'],[0,0,.1]);b(this.sword,[0,0,.3],[.25,.25,1.2],this.dark);b(this.sword,[0,0,.9],[1.2,.25,.22],this.edge);
  const blade=new THREE.Mesh(new THREE.CylinderGeometry(0,.48,5.2,4),this.armor);blade.rotation.x=Math.PI/2;blade.position.z=3.6;blade.scale.z=.25;this.sword.add(blade);b(this.sword,[.3,0,3.1],[.08,.1,4.1],this.energy);this.tip=n('tip',this.sword,[0,0,6.2]);
  this.rifle=this.sword;this.muzzle=this.tip;this.flash=new THREE.Mesh(new THREE.IcosahedronGeometry(.2),this.energy);this.tip.add(this.flash);this.flash.visible=false;
  this.batch();this.bind=new Map();for(const p of Object.values(this.parts))this.bind.set(p,{p:p.position.clone(),q:p.quaternion.clone()});root.scale.setScalar(config.height/9.6);this.reset();
 }
 animate(dt,time,e){for(const [p,b] of this.bind){p.position.copy(b.p);p.quaternion.copy(b.q);}const p=this.parts,w=e.moving?1:0,s=Math.sin(e.walkPhase*.38),c=Math.cos(e.walkPhase*.38);this.frame.position.y+=Math.abs(c)*.12*w;for(const [side,sign]of[['left',1],['right',-1]]){p[side+'-upper-leg'].rotation.x=s*.42*w*sign;p[side+'-lower-leg'].rotation.x=Math.max(0,-s*sign)*.65*w;p[side+'-foot'].rotation.x=-s*.13*w*sign;p[side+'-upper-arm'].rotation.x=-s*.16*w*sign;}
  p['right-lower-arm'].rotation.x=-.55;p['left-lower-arm'].rotation.x=-.8;p.torso.rotation.y=Math.sin(time*.8)*.025;p.head.rotation.y=-p.torso.rotation.y;
  if(e.swordState){const a=e.swordAge,wind=e.config.swordWindup,swing=e.config.swordSwing,t=a<wind?a/wind:a<wind+swing?1-(a-wind)/swing:0;const strike=THREE.MathUtils.smoothstep(t,0,1);if(e.overhead){p['right-upper-arm'].rotation.x=-2.4*strike;p['right-lower-arm'].rotation.x=-.7*strike;p.torso.rotation.x=-.15*strike;}else{p.torso.rotation.y=-.65*strike;p['right-upper-arm'].rotation.z=-.9*strike;p['right-upper-arm'].rotation.y=-1.7*strike;p['right-lower-arm'].rotation.x=-.4;}if(a>=wind){const follow=Math.sin(Math.min(1,(a-wind)/(swing+e.config.swordRecovery))*Math.PI);p.torso.rotation.y+=.5*follow;p['right-upper-arm'].rotation.x+=.6*follow;p['right-upper-arm'].rotation.y+=.9*follow;p['left-upper-leg'].rotation.x-=.15*follow;}this.energy.emissiveIntensity=a<wind?2+Math.sin(a*28)*1.3:3;}else this.energy.emissiveIntensity=1.8;
  if(e.flinch>0||e.stunRemaining>0){p.torso.rotation.x=.18;p.head.rotation.x=.2;p['left-lower-leg'].rotation.x=.25;}
 }
}
