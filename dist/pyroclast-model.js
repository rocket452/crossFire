import * as THREE from './vendor/three.module.js';
import {flame} from './pyroclast-fx.js?v=457';

// Original low-poly flame supervillain built from rigid parts on pivots (no skinning).
// Designed at 2.2 m and scaled up; hit shapes are read from part world matrices.

const NOISE=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}`;
// Cape cloth: dark red, burning hem that crawls upward.
function capeMaterial(length){
 return new THREE.ShaderMaterial({uniforms:{time:{value:0},length:{value:length},heat:{value:1}},side:THREE.DoubleSide,toneMapped:false,
  vertexShader:`varying vec2 vXY;varying float vShade;void main(){vXY=position.xy;vec3 n=normalize(normalMatrix*normal);vShade=.55+.45*abs(n.z);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:NOISE+`uniform float time;uniform float length;uniform float heat;varying vec2 vXY;varying float vShade;void main(){
   float t=clamp(-vXY.y/length,0.,1.);
   float n=fbm(vec2(vXY.x*4.,vXY.y*3.+time*1.4));
   vec3 base=mix(vec3(.2,.02,.035),vec3(.5,.05,.05),t)*vShade;
   float hem=smoothstep(.62,1.,t+(n-.5)*.35)*heat;
   vec3 fire=mix(vec3(1.,.25,.03),vec3(1.,.85,.25),smoothstep(.85,1.,t+(n-.5)*.2));
   gl_FragColor=vec4(mix(base,fire*1.3,hem),1.);}`});
}
function capeShape(top,bottom,length,teeth){
 const s=new THREE.Shape();s.moveTo(-top/2,0);s.lineTo(top/2,0);s.lineTo(bottom/2,-length*.82);
 for(let i=0;i<=teeth*2;i++){const f=i/(teeth*2),x=bottom/2-f*bottom,y=i%2?-length:-length*(.8+.06*Math.sin(i*2.3));s.lineTo(x,y);}
 s.closePath();return new THREE.ShapeGeometry(s);
}
function flameShape(){
 const s=new THREE.Shape();s.moveTo(0,-.1);s.quadraticCurveTo(.09,-.06,.075,.03);s.quadraticCurveTo(.06,.08,.025,.12);s.quadraticCurveTo(.03,.05,0,.02);
 s.quadraticCurveTo(-.03,.07,-.02,.14);s.quadraticCurveTo(-.08,.07,-.075,.02);s.quadraticCurveTo(-.085,-.06,0,-.1);return new THREE.ShapeGeometry(s);
}

export function buildPyroclast(height=4.4){
 const root=new THREE.Group();root.name='Pyroclast';
 const S=height/2.2,body=new THREE.Group();body.scale.setScalar(S);root.add(body);
 const std=(color,rough=.6,metal=.15)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,flatShading:true});
 const M={dark:std('#26222d',.7),mid:std('#4a4658',.6),armor:std('#b3aec2',.45,.25),trim:new THREE.MeshBasicMaterial({color:'#ff7a1a',toneMapped:false}),
  gold:new THREE.MeshBasicMaterial({color:'#ffcf3a',toneMapped:false}),eye:new THREE.MeshBasicMaterial({color:'#ffe35a',toneMapped:false})};
 const add=(parent,geometry,material,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;};
 const pivot=(parent,pos)=>{const g=new THREE.Group();g.position.set(...pos);parent.add(g);return g;};
 const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
 const prism=(rt,rb,h,n=6)=>new THREE.CylinderGeometry(rt,rb,h,n);
 const parts={};const flames=[];const capes=[];const glows=[];

 // Pelvis, belt and burning coat tails.
 const pelvis=parts.pelvis=pivot(body,[0,1.05,0]);
 add(pelvis,prism(.2,.15,.22,6),M.dark,[0,0,0],[0,Math.PI/6,0],[1,1,.75]);
 add(pelvis,box(.44,.08,.3),M.armor,[0,.09,0]);
 const vShape=new THREE.Shape();vShape.moveTo(-.09,.04);vShape.lineTo(0,-.05);vShape.lineTo(.09,.04);vShape.lineTo(.06,.04);vShape.lineTo(0,-.015);vShape.lineTo(-.06,.04);vShape.closePath();
 add(pelvis,new THREE.ShapeGeometry(vShape),M.trim,[0,.09,.152]);
 for(const side of [-1,1]){
  const tail=pivot(pelvis,[side*.2,.08,.06]);tail.rotation.set(.12,0,side*.12);
  const m=add(tail,capeShape(.16,.24,.95,2),capeMaterial(.95),[0,0,0],[0,side*.35,0]);capes.push(m);parts['tail'+side]=tail;
 }
 // Torso.
 const torso=parts.torso=pivot(pelvis,[0,.12,0]);
 add(torso,prism(.27,.17,.46,6),M.dark,[0,.24,0],[0,Math.PI/6,0],[1,1,.68]);
 add(torso,prism(.18,.15,.14,6),M.mid,[0,.04,0],[0,Math.PI/6,0],[1,1,.7]);
 const emblem=add(torso,flameShape(),M.gold,[0,.29,.165],[0,0,0],[1.3,1.3,1]);glows.push(emblem);
 for(const side of [-1,1]){
  // Orange chest trims and armored shoulder pads with spikes.
  add(torso,box(.02,.24,.02),M.trim,[side*.13,.22,.135],[0,0,side*-.35]);
  const pad=add(torso,new THREE.DodecahedronGeometry(.13,0),M.armor,[side*.3,.45,0],[0,0,side*.4],[1.25,.75,1.1]);
  add(pad,box(.04,.12,.04),M.trim,[side*.06,.08,.07],[0,0,side*.5]);
  add(pad,new THREE.ConeGeometry(.04,.12,4),M.armor,[side*.08,.12,-.02],[0,0,side*-.6]);
 }
 // Tall red collar framing the head.
 const collar=add(torso,new THREE.CylinderGeometry(.2,.15,.22,6,1,true),capeMaterial(.22),[0,.56,-.02],[-.15,Math.PI/6,0],[1,1,.85]);
 collar.material.uniforms.heat.value=.2;capes.push(collar);
 // Head: pointed dark mask, glowing slanted eyes, ear rings, crown of fire.
 const head=parts.head=pivot(torso,[0,.66,.0]);
 add(head,prism(.17,.03,.36,6),M.dark,[0,.04,0],[0,Math.PI/6,0],[1,1,.9]);
 add(head,new THREE.IcosahedronGeometry(.16,0),M.dark,[0,.13,-.04],[0,0,0],[1,1,1.05]);
 add(head,prism(.18,.12,.08,6),M.mid,[0,.2,.0],[0,Math.PI/6,0],[1,1,.95]);
 for(const side of [-1,1]){
  const eye=new THREE.Shape();eye.moveTo(0,0);eye.lineTo(.075,.03);eye.lineTo(.085,.005);eye.lineTo(.02,-.02);eye.closePath();
  const e=add(head,new THREE.ShapeGeometry(eye),M.eye,[side*.018,.085,.146],[0,side*.25,0],[side,1,1]);glows.push(e);
  add(head,new THREE.TorusGeometry(.045,.012,6,14),M.trim,[side*.155,.08,-.02],[0,Math.PI/2,0]);
 }
 const crown=[[0,.17,-.02,.5,.95,2.6],[-.1,.14,.02,.3,.62,3.2],[.1,.14,.02,.3,.6,3.4],[0,.13,-.12,.42,.72,2.9],[-.17,.06,-.04,.2,.4,3.8],[.17,.06,-.04,.2,.4,3.8],[-.07,.2,-.08,.22,.5,4.2],[.07,.2,-.08,.22,.52,4.4]];
 for(const [x,y,z,w,h,speed] of crown){const f=flame(w,h,{speed});f.position.set(x,y,z);head.add(f);flames.push(f);}
 // Arms.
 for(const [side,key] of [[-1,'R'],[1,'L']]){
  const shoulder=parts['shoulder'+key]=pivot(torso,[side*.3,.4,0]);
  add(shoulder,box(.11,.3,.11),M.dark,[0,-.15,0]);
  const elbow=parts['elbow'+key]=pivot(shoulder,[0,-.3,0]);
  add(elbow,box(.1,.28,.1),M.dark,[0,-.14,0]);
  add(elbow,prism(.075,.065,.12,6),M.armor,[0,-.2,0]);
  add(elbow,new THREE.TorusGeometry(.068,.016,6,16),M.trim,[0,-.27,0],[Math.PI/2,0,0]);
  const hand=parts['hand'+key]=pivot(elbow,[0,-.3,0]);
  add(hand,box(.1,.1,.08),M.dark,[0,-.04,0]);
  for(let i=0;i<4;i++)add(hand,box(.018,.07,.025),M.dark,[-.033+i*.022,-.12,.015]);
  add(hand,box(.02,.05,.025),M.dark,[side*-.055,-.06,.03],[0,0,side*.5]);
  const sf=flame(.24,.34,{speed:3.6});sf.position.set(side*.3,.52,-.02);torso.add(sf);flames.push(sf);
 }
 // Legs and boots with downward flight jets.
 for(const [side,key] of [[-1,'R'],[1,'L']]){
  const hip=parts['hip'+key]=pivot(pelvis,[side*.12,-.04,0]);
  add(hip,prism(.085,.07,.44,6),M.dark,[0,-.22,0]);
  const knee=parts['knee'+key]=pivot(hip,[0,-.45,0]);
  add(knee,new THREE.OctahedronGeometry(.085,0),M.armor,[0,0,.05],[0,0,0],[1,1.3,.8]);
  add(knee,prism(.07,.06,.38,6),M.dark,[0,-.2,0]);
  add(knee,box(.016,.22,.02),M.trim,[side*.05,-.2,.055]);
  const ankle=parts['ankle'+key]=pivot(knee,[0,-.4,0]);
  add(ankle,box(.17,.15,.22),M.armor,[0,-.04,.02]);
  add(ankle,new THREE.CylinderGeometry(.06,.1,.12,4),M.armor,[0,-.06,.14],[Math.PI/2,Math.PI/4,0],[1,1,.6]);
  add(ankle,box(.18,.03,.25),M.trim,[0,-.115,.03]);
  add(ankle,new THREE.OctahedronGeometry(.04,0),M.trim,[side*.09,-.02,.06]);
  const jet=flame(.24,-.75,{speed:6});jet.position.set(0,-.12,0);ankle.add(jet);flames.push(jet);parts['jet'+key]=jet;
 }
 // Back cape: three hinged panels with a burning tattered hem.
 const capeRoot=parts.cape=pivot(torso,[0,.5,-.13]);
 [[-.13,.2,.3,1.55,-.22],[0,.26,.38,1.75,0],[.13,.2,.3,1.55,.22]].forEach(([x,top,bottom,len,yaw],i)=>{
  const hinge=pivot(capeRoot,[x,0,0]);hinge.rotation.y=yaw;
  const m=add(hinge,capeShape(top,bottom,len,2),capeMaterial(len),[0,0,0]);capes.push(m);parts['capePanel'+i]=hinge;
 });
 const backEmblem=add(capeRoot,flameShape(),M.gold,[0,-.5,-.012],[0,Math.PI,0],[1.6,1.6,1]);glows.push(backEmblem);
 root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
 return {root,body,parts,flames,capes,glows,materials:M,scale:S};
}
