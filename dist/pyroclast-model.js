import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Original flame supervillain, modelled after the Pyroclast character sheet: a near-black faceted
// body with glowing orange seams and a flame emblem, lilac-grey armour only on the shoulders,
// bracers, belt, knees and boots, a red V collar, red front coat flaps and a knee-length back cape
// whose edges burn with cel-shaded flames, and a black kite-shaped mask under a stylised flame head.
// Rigid parts on pivots (no skinning), designed at 2.2 m and scaled; the rig in pyroclast-rig.js
// poses the pivots and hit shapes are read from their world matrices.

export const PALETTE={black:'#25222b',dark:'#34313b',grey:'#58545f',lilac:'#c8c1d2',red:'#8f1d22',orange:'#ff8a1c',yellow:'#ffd63a'};

// ---- cel flame: camera-facing (cylindrical) billboard with concentric flame bands ---------------
const celFlameVertex=`varying vec2 vUv;varying float vNear;
void main(){vUv=vec2(position.x+.5,position.y);
 vec3 center=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;
 vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz)*sign(modelMatrix[1].y+1e-6));
 vec3 view=normalize(cameraPosition-center);vec3 up=vec3(0.,1.,0.);vec3 right=normalize(cross(up,view)+vec3(1e-5,0.,0.));
 vec3 world=center+right*position.x*sc.x+up*position.y*sc.y;vNear=smoothstep(1.2,3.5,distance(cameraPosition,world));
 gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`;
const celFlameFragment=`uniform float time;uniform float seed;uniform float intensity;uniform float speed;uniform float tongues;varying vec2 vUv;varying float vNear;
float tongue(float x,float c,float w,float h){return h*pow(max(0.,1.-abs(x-c)/w),1.9);}
float inside(vec2 p,float s){
 p=(p-vec2(0.,.26))/s+vec2(0.,.26);
 float t=time*speed;
 float x=p.x-(sin(t*1.9+seed+p.y*3.)*.05+sin(t*3.3+seed*2.)*.025)*p.y-.09*max(0.,p.y-.45)*max(0.,p.y-.45)*sign(p.x+.001)*-1.;
 float top=.4+tongue(x,0.,.3,.6*(.9+.1*sin(t*4.1+seed)));
 if(tongues>.5){top=max(top,.4+tongue(x,-.24,.2,.44*(.82+.18*sin(t*5.3+seed*1.3))));top=max(top,.4+tongue(x,.25,.19,.4*(.82+.18*sin(t*4.7+seed*.7))));
  top=max(top,.36+tongue(x,-.4,.12,.26*(.75+.25*sin(t*6.+seed))));top=max(top,.36+tongue(x,.41,.12,.24*(.75+.25*sin(t*5.6+seed*2.1))));}
 float bowl=length(vec2(x/.45,(p.y-.28)/.28));
 float upper=step(.28,p.y)*step(p.y,top)*step(abs(x),.45*(1.-smoothstep(.3,1.,p.y)*.35));
 return max(step(bowl,1.),upper);}
void main(){
 vec2 p=vec2(vUv.x-.5,vUv.y);
 float a=inside(p,1.);if(a<.5||vNear<.02)discard;
 vec3 c=vec3(.93,.27,.09);
 if(inside(p,.8)>.5)c=vec3(1.,.54,.11);
 if(inside(p,.6)>.5)c=vec3(1.,.8,.23);
 if(inside(p,.38)>.5)c=vec3(1.,.95,.65);
 gl_FragColor=vec4(c*(.75+.35*intensity),vNear);}`;
export function celFlameMaterial({seed=Math.random()*10,speed=1,intensity=1,tongues=1}={}){
 return new THREE.ShaderMaterial({uniforms:{time:{value:0},seed:{value:seed},intensity:{value:intensity},speed:{value:speed},tongues:{value:tongues}},
  vertexShader:celFlameVertex,fragmentShader:celFlameFragment,transparent:true,toneMapped:false,side:THREE.DoubleSide});
}
const flamePlane=new THREE.PlaneGeometry(1,1,1,1).translate(0,.5,0);
export function celFlame(width,height,options){const m=new THREE.Mesh(flamePlane,celFlameMaterial(options));m.scale.set(width,height,1);m.frustumCulled=false;m.renderOrder=6;return m;}

// ---- materials -------------------------------------------------------------------------------
function sharedUniforms(){return {time:{value:0},heat:{value:1},rim:{value:1},flow:{value:0},sway:{value:0}};}
function solid(color,{rough=.62,metal=.15,rim=0,side=THREE.FrontSide},U){
 const m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,flatShading:true,side});
 if(rim){m.onBeforeCompile=sh=>{sh.uniforms.rimK={value:rim};sh.uniforms.rimHeat=U.rim;
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float rimK;uniform float rimHeat;')
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   {float f=pow(1.-saturate(abs(dot(normal,normalize(vViewPosition)))),2.4);totalEmissiveRadiance+=vec3(1.,.42,.1)*f*rimK*rimHeat;}`);};
  m.customProgramCacheKey=()=>'pyroclast-rim';}
 return m;
}
// Red cloth displaced in the vertex shader (streams back with speed, ripples). Edges burn with
// cel-shaded flame teeth along the hem and, for the front flaps, the inner edge. emblem=true draws a
// glowing flame layer that rides the same displacement (for the cape's back emblem).
function clothMaterial(U,{length,halfW,wrap=0,flare=.3,stream=1,teeth=7,teethDepth=.12,band=.15,side=0,emblem=null}){
 const m=new THREE.MeshStandardMaterial({color:emblem||PALETTE.red,roughness:.85,metalness:0,side:THREE.DoubleSide,flatShading:true});
 if(emblem){m.emissive=new THREE.Color(emblem);m.emissiveIntensity=1.1;m.toneMapped=false;}
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{time:U.time,heat:U.heat,flow:U.flow,sway:U.sway,clothLen:{value:length},halfW:{value:halfW},wrap:{value:wrap},flare:{value:flare},stream:{value:stream},
   teeth:{value:teeth},teethDepth:{value:teethDepth},band:{value:band},sideFlame:{value:side}});
  const pars='uniform float time;uniform float heat;uniform float flow;uniform float sway;uniform float clothLen;uniform float halfW;uniform float wrap;uniform float flare;uniform float stream;uniform float teeth;uniform float teethDepth;uniform float band;uniform float sideFlame;varying vec2 vCloth;';
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+pars).replace('#include <begin_vertex>',`#include <begin_vertex>
   {float t=clamp(-transformed.y/clothLen,0.,1.);vec3 p=transformed;vCloth=vec2(p.x,t);
    p.z+=p.x*p.x*wrap*(1.-smoothstep(0.,.3,t));
    p.x*=1.+flare*t;
    float w1=sin(p.y*4.6-time*5.2+p.x*3.7),w2=sin(p.y*9.1-time*8.4-p.x*6.3);
    p.z+=(w1*(.03+.06*flow)+w2*.015)*t*1.5*stream;
    p.z-=t*t*(.15+1.1*flow)*clothLen*.55*stream;
    p.y+=t*t*.45*flow*clothLen*.35*stream;
    p.x+=sway*t*t*.35*clothLen*stream+sin(time*1.7+p.y*2.)*.015*t;
    transformed=p;}`);
  if(emblem)return;
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+pars+`
   float tri(float v){return abs(fract(v)-.5)*2.;}
   float hsh(float n){return fract(sin(n*127.1)*43758.5453);}`)
   .replace('#include <color_fragment>',`#include <color_fragment>
    float xn=vCloth.x/halfW,t=vCloth.y,ph=xn*teeth*.5+.25;
    float idx=floor(ph+.5),size=.65+.35*hsh(idx+3.);
    float tw=sin(time*3.+idx*1.7)*.02;
    // Hem: jagged flame teeth. The teeth are solid fire and tongues lick up between them.
    float hem=1.-teethDepth*size*(1.-tri(ph+tw));
    float lick=tri(ph+.5+sin(time*2.2+idx)*.04);
    float fireTop=1.-teethDepth*size-band*(.35+.65*lick*lick)*(.85+.15*sin(time*6.5+xn*7.+idx));
    if(t>hem)discard;
    float u=(t-fireTop)/max(1e-3,hem-fireTop);
    float sideU=-1.;
    if(sideFlame!=0.){float sd=halfW-vCloth.x*sideFlame;float sb=mix(.0,.05,smoothstep(.25,.95,t))*(.75+.25*tri(t*8.+time*.4));
     float st=sb*.35*(1.-tri(t*8.+.25+sin(time*2.6+t*5.)*.05));if(sd<st)discard;if(sd<sb)sideU=1.-(sd-st)/max(1e-3,sb-st);}
    float fu=max(u,sideU);
    vec3 fire=vec3(0.);
    if(fu>0.){fire=fu>.66?vec3(1.,.86,.28):fu>.3?vec3(1.,.56,.12):vec3(.9,.27,.08);diffuseColor.rgb=vec3(0.);}
    else{float fold=.8+.2*cos(vCloth.x*40.+t*3.);diffuseColor.rgb*=fold*mix(1.,.62,t);}`)
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n    totalEmissiveRadiance+=fire*(.85+.3*heat);');};
 m.customProgramCacheKey=()=>emblem?'pyroclast-cloth-emblem':'pyroclast-cloth';return m;
}

// ---- geometry helpers (design metres, Y up, +Z forward) --------------------------------------
const lathe=(pts,seg=12)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);
function plate(pts,{depth=.016,bevel=.008,k=0,curve=4}={}){
 const s=new THREE.Shape(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:curve});
 g.translate(0,0,-depth/2);
 if(k){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)-k*p.getX(i)**2);g.computeVertexNormals();}
 return g;
}
function profile(pts,width,bevel=.01){
 const s=new THREE.Shape(pts.map(([z,y])=>new THREE.Vector2(z,y)));
 const g=new THREE.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:4});
 g.rotateY(-Math.PI/2);g.translate(width/2,0,0);return g;
}
function arcTube(r,y,theta0,len,tube=.008,seg=18){
 const pts=[];for(let i=0;i<=seg;i++){const a=theta0+len*i/seg;pts.push(new THREE.Vector3(r*Math.sin(a),y,r*Math.cos(a)));}
 return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),seg,tube,5,false);
}
function lineTube(points,tube=.007){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(4,points.length*4),tube,5,false);}
// Stylised three-tongued flame emblem outline.
function emblemShape(){
 const s=new THREE.Shape();s.moveTo(0,-.1);s.quadraticCurveTo(.1,-.08,.085,.02);s.lineTo(.06,.07);s.lineTo(.045,.02);s.quadraticCurveTo(.04,.07,0,.13);
 s.quadraticCurveTo(-.04,.07,-.045,.02);s.lineTo(-.06,.07);s.lineTo(-.085,.02);s.quadraticCurveTo(-.1,-.08,0,-.1);return s;
}
const emblemGeometry=(depth=.012)=>{const g=new THREE.ExtrudeGeometry(emblemShape(),{depth,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,curveSegments:6});g.translate(0,0,-depth/2);return g;};

// Collapse each pivot's static child meshes into one mesh per material.
function mergeStatic(root,keep){
 const parents=[];root.traverse(o=>{if(o.children.some(c=>c.isMesh))parents.push(o);});
 for(const parent of parents){
  const groups=new Map();
  for(const m of parent.children){if(!m.isMesh||keep.has(m)||m.children.length)continue;if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(m);}
  for(const [material,list] of groups){
   if(list.length<2)continue;
   const geoms=list.map(m=>{m.updateMatrix();const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone());g.applyMatrix4(m.matrix);
    for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);g.clearGroups();return g;});
   const merged=mergeGeometries(geoms,false);if(!merged)continue;
   const mesh=new THREE.Mesh(merged,material);mesh.castShadow=list.some(m=>m.castShadow);parent.add(mesh);
   for(const m of list)parent.remove(m);for(const g of geoms)g.dispose();
  }
 }
}

export function buildPyroclast(height=4.4){
 const root=new THREE.Group();root.name='Pyroclast';
 const S=height/2.2,body=new THREE.Group();body.scale.setScalar(S);root.add(body);
 const U=sharedUniforms();
 const M={
  black:solid(PALETTE.black,{rough:.7,metal:.12},U),
  dark:solid(PALETTE.dark,{rough:.5,metal:.3,rim:.18},U),
  grey:solid(PALETTE.grey,{rough:.55,metal:.25},U),
  lilac:solid(PALETTE.lilac,{rough:.48,metal:.18,rim:.22},U),
  mask:solid('#141217',{rough:.35,metal:.3,rim:.12},U),
  hood:solid('#2a2730',{rough:.75,metal:.05,side:THREE.DoubleSide},U),
  red:solid(PALETTE.red,{rough:.8,metal:0,side:THREE.DoubleSide},U),
  trim:new THREE.MeshBasicMaterial({color:PALETTE.orange,toneMapped:false}),
  yellow:new THREE.MeshBasicMaterial({color:PALETTE.yellow,toneMapped:false}),
  eye:new THREE.MeshBasicMaterial({color:'#ffe760',toneMapped:false,side:THREE.DoubleSide}),
  eyeRim:new THREE.MeshBasicMaterial({color:'#ff8f1e',toneMapped:false,side:THREE.DoubleSide})
 };
 const add=(parent,geometry,material,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;};
 const pivot=(parent,pos,name)=>{const g=new THREE.Group();g.position.set(...pos);if(name)g.name=name;parent.add(g);return g;};
 const parts={};const flames=[];const capes=[];const glows=[];const trims=[];const keep=new Set();
 const glow=(parent,geometry,material,pos,rot,scale)=>{const m=add(parent,geometry,material,pos,rot,scale);m.castShadow=false;(material===M.trim?trims:glows).push(m);return m;};

 // ---- pelvis: dark hips, lilac belt with an orange chevron, red front coat flaps with burning edges
 const pelvis=parts.pelvis=pivot(body,[0,1.05,0],'pelvis');
 add(pelvis,lathe([[0,.13],[.14,.12],[.17,.05],[.175,-.03],[.15,-.1],[.085,-.13],[0,-.135]]),M.black,[0,0,0],[0,0,0],[1,1,.74]);
 add(pelvis,new THREE.CylinderGeometry(.19,.182,.075,12),M.lilac,[0,.085,0],[0,0,0],[1,1,.78]);
 add(pelvis,new THREE.CylinderGeometry(.193,.19,.018,12),M.grey,[0,.045,0],[0,0,0],[1,1,.78]);
 const chevron=new THREE.Shape();chevron.moveTo(-.07,.03);chevron.lineTo(0,-.035);chevron.lineTo(.07,.03);chevron.lineTo(.045,.03);chevron.lineTo(0,-.005);chevron.lineTo(-.045,.03);chevron.closePath();
 glow(pelvis,new THREE.ExtrudeGeometry(chevron,{depth:.012,bevelEnabled:false}),M.trim,[0,.09,.142]);
 for(const side of [-1,1])glow(pelvis,new THREE.BoxGeometry(.025,.025,.012),M.trim,[side*.15,.085,.1],[0,side*.75,0]);
 for(const [side,key] of [[1,'L'],[-1,'R']]){
  const t=parts['tasset'+key]=pivot(pelvis,[side*.14,.055,.075],'tasset'+key);
  const inner=pivot(t,[side*.03,0,0]);inner.rotation.set(.05,side*.62,side*.1);
  const flap=add(inner,new THREE.PlaneGeometry(.24,.88,6,16).translate(0,-.44,0),clothMaterial(U,{length:.88,halfW:.12,flare:.5,stream:.7,teeth:3,teethDepth:.2,band:.34,side:-side}));
  flap.castShadow=false;capes.push(flap);keep.add(flap);
 }

 // ---- torso: slim dark faceted chest, orange V seams, two-tone flame emblem, red V collar -------
 const torso=parts.torso=pivot(pelvis,[0,.12,0],'torso');
 add(torso,lathe([[0,-.03],[.15,-.01],[.155,.1],[.19,.22],[.228,.34],[.232,.42],[.2,.5],[.13,.56],[0,.58]]),M.black,[0,0,0],[0,0,0],[1,1,.68]);
 for(const side of [-1,1]){
  add(torso,plate([[0,.0],[.17*side,.05],[.2*side,.15],[.14*side,.2],[.02*side,.17]],{depth:.02,bevel:.008,k:1.8}),M.dark,[side*.012,.28,.162],[-.08,side*.12,0]);
  glow(torso,lineTube([[side*.16,.52,.11],[side*.1,.43,.165],[side*.04,.3,.19],[0,.22,.19]],.0065),M.trim);
  glow(torso,lineTube([[side*.205,.36,.1],[side*.175,.24,.12],[side*.13,.12,.115]],.006),M.trim);
 }
 for(let row=0;row<2;row++)for(const side of [-1,1])add(torso,plate([[-.035,-.03],[.035,-.03],[.038,.03],[-.038,.03]],{depth:.012,bevel:.006,k:2}),M.dark,[side*.045,.07+row*.075,.118+row*.01],[-.12,side*.18,0]);
 glow(torso,emblemGeometry(.012),M.trim,[0,.37,.205],[-.08,0,0],[1.05,1.05,1]);
 glow(torso,emblemGeometry(.012),M.yellow,[0,.365,.214],[-.08,0,0],[.62,.62,1]);
 add(torso,plate([[-.19,0],[.19,0],[.2,.17],[.12,.23],[-.12,.23],[-.2,.17]],{depth:.02,bevel:.008,k:1.4}),M.dark,[0,.26,-.15],[.06,Math.PI,0]);
 add(torso,new THREE.CylinderGeometry(.1,.14,.07,10),M.black,[0,.55,-.005],[0,0,0],[1,1,.85]);
 const collar=pivot(torso,[0,.58,-.015]);collar.rotation.x=-.16;collar.scale.set(1,1,.92);
 add(collar,new THREE.CylinderGeometry(.175,.135,.13,12,1,true,Math.PI-2.45,4.9),M.red);
 glow(collar,arcTube(.175,.065,Math.PI-2.45,4.9,.007,24),M.trim);
 for(const side of [-1,1]){const a=Math.PI-side*2.45;glow(collar,lineTube([[.175*Math.sin(a),.065,.175*Math.cos(a)],[.135*Math.sin(a)*.9,-.065,.135*Math.cos(a)*1.05]],.006),M.trim);}

 // ---- shoulders: chunky angular lilac pads with grey lames and an orange stud --------------------
 for(const [side,key] of [[-1,'R'],[1,'L']]){
  const pd=parts['pauldron'+key]=pivot(torso,[side*.3,.45,0],'pauldron'+key);
  add(pd,plate([[-.075,.045],[.08,.038],[.11,-.04],[-.06,-.05]].map(([x,y])=>[x*side,y]),{depth:.17,bevel:.016}),M.lilac,[side*.015,.0,0],[0,0,side*-.28]);
  add(pd,plate([[-.05,.018],[.09,.012],[.105,-.028],[-.045,-.032]].map(([x,y])=>[x*side,y]),{depth:.15,bevel:.01}),M.grey,[side*.03,-.068,0],[0,0,side*-.36]);
  glow(pd,new THREE.BoxGeometry(.026,.026,.012),M.trim,[side*.05,-.004,.098],[0,0,side*-.28]);
 }

 // ---- arms: dark sleeves, lilac hexagonal bracers, thick orange wrist rings, chunky dark gloves ----
 for(const [side,key] of [[-1,'R'],[1,'L']]){
  const shoulder=parts['shoulder'+key]=pivot(torso,[side*.31,.42,0],'shoulder'+key);
  add(shoulder,lathe([[0,.05],[.066,.03],[.074,-.05],[.07,-.15],[.06,-.25],[.054,-.31],[0,-.32]]),M.black);
  const elbow=parts['elbow'+key]=pivot(shoulder,[0,-.3,0],'elbow'+key);
  add(elbow,lathe([[0,.02],[.056,0],[.06,-.08],[.056,-.2],[0,-.22]]),M.black);
  add(elbow,new THREE.CylinderGeometry(.071,.066,.13,6),M.lilac,[0,-.165,0]);
  add(elbow,new THREE.CylinderGeometry(.073,.073,.02,6),M.grey,[0,-.095,0]);
  glow(elbow,new THREE.TorusGeometry(.066,.019,8,20),M.trim,[0,-.245,0],[Math.PI/2,0,0]);
  const hand=parts['hand'+key]=pivot(elbow,[0,-.29,0],'hand'+key);
  add(hand,plate([[-.047,.01],[.047,.01],[.05,-.085],[-.05,-.085]],{depth:.045,bevel:.012}),M.dark,[0,-.005,0]);
  add(hand,plate([[-.042,0],[.042,0],[.044,-.035],[-.044,-.035]],{depth:.01,bevel:.006,k:3}),M.grey,[0,-.04,.032]);
  const base=pivot(hand,[0,-.095,0]),mid=pivot(base,[0,-.05,0]);
  for(let i=0;i<4;i++){
   const x=-.036+i*.024,len=i===0||i===3?.036:.042;
   add(base,new THREE.CapsuleGeometry(.0125,len,2,6),M.dark,[x,-len/2-.004,0]);
   add(mid,new THREE.CapsuleGeometry(.0118,len*.85,2,6),M.dark,[x,-len*.42+(.042-len),0]);
  }
  const thumb=pivot(hand,[-side*.054,-.035,-.012]);thumb.rotation.z=-side*.6;
  add(thumb,new THREE.CapsuleGeometry(.013,.045,2,6),M.dark,[0,-.032,0]);
  parts['fingers'+key]=[{base,mid}];parts['thumb'+key]=thumb;
 }

 // ---- head: dark hood, black kite mask with big slanted eyes, ear rings, stylised flame ---------
 const head=parts.head=pivot(torso,[0,.64,0],'head');
 add(head,new THREE.CylinderGeometry(.055,.07,.1,8),M.black,[0,-.02,0]);
 add(head,new THREE.IcosahedronGeometry(.13,1),M.black,[0,.13,-.015],[0,0,0],[1,1.1,1.05]);
 add(head,new THREE.SphereGeometry(.168,10,8,Math.PI,Math.PI,.35,1.9),M.hood,[0,.12,-.01],[0,0,0],[1,1.08,1.05]);
 add(head,plate([[0,.215],[.07,.15],[.135,.11],[.13,.03],[.075,-.055],[0,-.1],[-.075,-.055],[-.13,.03],[-.135,.11],[-.07,.15]],{depth:.04,bevel:.01,k:3.6}),M.mask,[0,.1,.118]);
 for(const side of [-1,1]){
  const eye=new THREE.Shape();eye.moveTo(.012,-.012);eye.lineTo(.088,.03);eye.quadraticCurveTo(.104,.012,.092,-.004);eye.quadraticCurveTo(.05,-.03,.012,-.012);
  glow(head,new THREE.ShapeGeometry(eye),M.eyeRim,[side*.008,.142,.15],[0,side*.3,0],[side*1.18,1.25,1]);
  glow(head,new THREE.ShapeGeometry(eye),M.eye,[side*.014,.143,.153],[0,side*.3,0],[side*1.02,1.02,1]);
  glow(head,new THREE.TorusGeometry(.04,.011,8,18),M.trim,[side*.138,.12,-.02],[0,Math.PI/2,0]);
 }
 // The flame head: a large cel-shaded flame rising behind the mask, a second layer swept back, and
 // small flecks drifting around it.
 const crown=celFlame(.66,.86,{seed:1.3,speed:1});crown.position.set(0,.09,-.06);head.add(crown);flames.push(crown);keep.add(crown);
 const crownBack=celFlame(.5,.72,{seed:4.7,speed:1.15});crownBack.position.set(0,.1,-.17);head.add(crownBack);flames.push(crownBack);keep.add(crownBack);
 const flecks=[];
 for(let i=0;i<5;i++){const f=celFlame(.07,.1,{seed:i*2.3,speed:1.6,tongues:0});head.add(f);flames.push(f);keep.add(f);flecks.push({mesh:f,phase:i*1.26,radius:.24+.05*(i%2),height:.16+.1*(i%3)});}

 // ---- legs: dark legs with orange seams, big lilac diamond knee guards, chunky armoured boots ----
 for(const [side,key] of [[-1,'R'],[1,'L']]){
  const hip=parts['hip'+key]=pivot(pelvis,[side*.112,-.04,0],'hip'+key);
  add(hip,lathe([[0,.04],[.09,.01],[.098,-.08],[.092,-.24],[.078,-.4],[.066,-.45],[0,-.46]]),M.black);
  glow(hip,lineTube([[side*.07,-.07,.055],[side*.082,-.22,.045],[side*.066,-.38,.04]],.0055),M.trim);
  const knee=parts['knee'+key]=pivot(hip,[0,-.45,0],'knee'+key);
  add(knee,plate([[0,.1],[.072,.025],[.055,-.075],[0,-.12],[-.055,-.075],[-.072,.025]],{depth:.035,bevel:.014,k:4}),M.lilac,[0,.0,.075],[-.08,0,0]);
  add(knee,plate([[0,.06],[.04,.015],[0,-.03],[-.04,.015]],{depth:.012,bevel:.005,k:4}),M.grey,[0,.0,.1],[-.08,0,0]);
  add(knee,lathe([[0,.0],[.07,-.03],[.077,-.1],[.07,-.24],[.058,-.36],[.06,-.39],[0,-.4]]),M.black,[0,0,0],[0,0,0],[1,1,.92]);
  glow(knee,lineTube([[side*.03,-.12,.065],[side*.035,-.22,.062],[side*.028,-.31,.054]],.0055),M.trim);
  const ankle=parts['ankle'+key]=pivot(knee,[0,-.4,0],'ankle'+key);
  add(ankle,profile([[-.09,.05],[-.095,-.07],[-.08,-.12],[.19,-.12],[.215,-.095],[.17,-.055],[.06,-.025],[.035,.05]],.14,.012),M.dark);
  add(ankle,profile([[.0,.09],[-.02,.03],[.06,-.02],[.11,-.03],[.07,.03],[.04,.09]],.15,.009),M.lilac,[0,0,.012]);
  add(ankle,profile([[.1,-.06],[.21,-.075],[.225,-.1],[.16,-.105],[.09,-.09]],.145,.008),M.lilac);
  glow(ankle,new THREE.OctahedronGeometry(.024,0),M.trim,[0,.0,.085],[0,0,0],[1,1.3,.6]);
  glow(ankle,lineTube([[-.072,-.125,-.08],[-.074,-.128,.17],[0,-.13,.215],[.074,-.128,.17],[.072,-.125,-.08]],.0075),M.trim);
  const jet=celFlame(.22,-.55,{seed:side*3.1,speed:2.2,tongues:0});jet.position.set(0,-.13,.02);ankle.add(jet);flames.push(jet);keep.add(jet);parts['jet'+key]=jet;
 }

 // ---- back cape: knee-length red cloth with a glowing flame emblem and a burning toothed hem -----
 const capeRoot=parts.cape=pivot(torso,[0,.52,-.16],'cape');
 const capeLen=1.32,capeW=.56;
 const cape=add(capeRoot,new THREE.PlaneGeometry(capeW,capeLen,14,28).translate(0,-capeLen/2,0),clothMaterial(U,{length:capeLen,halfW:capeW/2,wrap:1.8,flare:.5,stream:1,teeth:5,teethDepth:.17,band:.34}));
 cape.castShadow=false;capes.push(cape);keep.add(cape);
 // The emblem rides the cape's displacement: two flat layers just behind the cloth.
 for(const [scale,color,z] of [[1.35,PALETTE.orange,-.008],[.8,PALETTE.yellow,-.014]]){
  const g=new THREE.ShapeGeometry(emblemShape(),8);g.scale(scale,scale,1);g.translate(0,-.4,z);
  const m=add(capeRoot,g,clothMaterial(U,{length:capeLen,halfW:capeW/2,wrap:1.8,flare:.5,stream:1,emblem:color}));m.castShadow=false;keep.add(m);
 }

 mergeStatic(root,keep);
 root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
 // One call keeps every shader, glow pulse and flame fleck in step with the simulation.
 const yellow=new THREE.Color(PALETTE.yellow),orange=new THREE.Color(PALETTE.orange),eye=new THREE.Color('#ffe760'),tmp=new THREE.Color();
 const update=(time,{heat=1,flow=0,sway=0,rim=1}={})=>{
  U.time.value=time;U.heat.value=heat;U.flow.value=flow;U.sway.value=sway;U.rim.value=rim;
  const pulse=.82+.18*Math.sin(time*3.2);
  M.trim.color.copy(orange).multiplyScalar(.85+.3*pulse*heat);M.yellow.color.copy(yellow).multiplyScalar(.9+.2*pulse*heat);M.eye.color.copy(eye).multiplyScalar(.95+.15*Math.sin(time*5.1));
  for(const f of flecks){const a=time*(.9+f.phase*.1)+f.phase,r=f.radius,y=f.height+((time*.35+f.phase*.2)%1)*.3;
   f.mesh.position.set(Math.cos(a)*r,y,Math.sin(a)*r*.7-.05);const life=(time*.35+f.phase*.2)%1;f.mesh.scale.set(.07*(1-life*.6),.1*(1-life*.6),1);}
 };
 return {root,body,parts,flames,capes,glows,trims,materials:M,uniforms:U,update,scale:S};
}
