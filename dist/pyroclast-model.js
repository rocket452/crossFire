import * as THREE from './vendor/three.module.js';
import {flame} from './pyroclast-fx.js?v=457';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Original flame supervillain built from rigid parts on pivots (no skinning). Designed at 2.2 m and
// scaled up; hit shapes and hand sockets are read from part world matrices.
// Look: charcoal under-suit split by glowing magma veins, lilac-grey layered plate armour lit by a
// firelight rim, a masked helm under a crown of fire, and a long tattered cape with a burning hem.

const NOISE3=`
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float f3(vec3 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n3(p);p=p*2.07+vec3(3.1,1.7,5.3);a*=.5;}return v;}`;

// Shared uniforms so one update drives every material.
function sharedUniforms(){return {time:{value:0},heat:{value:1},rim:{value:1},flow:{value:0},sway:{value:0}};}

// Charcoal suit with crawling magma veins (emissive), lit normally by the scene.
function suitMaterial(U){
 const m=new THREE.MeshStandardMaterial({color:'#231d29',roughness:.78,metalness:.08});
 m.onBeforeCompile=sh=>{sh.uniforms.time=U.time;sh.uniforms.heat=U.heat;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vObj;').replace('#include <begin_vertex>','#include <begin_vertex>\nvObj=position;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vObj;uniform float time;uniform float heat;'+NOISE3)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   {float n=f3(vObj*6.5+vec3(0.,-time*.35,time*.1));float vein=1.-smoothstep(.0,.028,abs(n-.5));
    float mask=smoothstep(.36,.56,n3(vObj*2.2+vec3(time*.05,0.,0.)));vein*=mask;
    float pulse=.55+.45*sin(time*2.6+vObj.y*14.+n*6.);vec3 hot=mix(vec3(1.,.24,.03),vec3(1.,.66,.18),pulse);
    totalEmissiveRadiance+=hot*vein*(.4+.7*pulse)*heat*1.25;}`);};
 m.customProgramCacheKey=()=>'pyroclast-suit';return m;
}
// Plate armour with a warm fresnel rim (firelight from his own flames).
function armorMaterial(U,color,{metal=.5,rough=.36,rim=1,side=THREE.FrontSide}={}){
 const m=new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,side,flatShading:true});
 m.onBeforeCompile=sh=>{sh.uniforms.rimK={value:rim};sh.uniforms.rimHeat=U.rim;
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float rimK;uniform float rimHeat;')
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   {float f=pow(1.-saturate(abs(dot(normal,normalize(vViewPosition)))),2.6);totalEmissiveRadiance+=vec3(1.,.36,.08)*f*rimK*rimHeat*.4;}`);};
 m.customProgramCacheKey=()=>'pyroclast-armor';return m;
}
// Cloth: displaced in the vertex shader (streams back with speed, ripples, tattered burning hem).
// Flat shading derives normals from the displaced surface, so ripples catch the scene light.
function clothMaterial(U,length,{wrap=1.6,flare=.35,stream=1,heatBand=.62}={}){
 const m=new THREE.MeshStandardMaterial({color:'#6a0d14',roughness:.82,metalness:0,side:THREE.DoubleSide,flatShading:true});
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{time:U.time,heat:U.heat,flow:U.flow,sway:U.sway,clothLen:{value:length},wrap:{value:wrap},flare:{value:flare},stream:{value:stream},band:{value:heatBand}});
  const pars='uniform float time;uniform float heat;uniform float flow;uniform float sway;uniform float clothLen;uniform float wrap;uniform float flare;uniform float stream;uniform float band;varying vec2 vCloth;';
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+pars).replace('#include <begin_vertex>',`#include <begin_vertex>
   {float t=clamp(-transformed.y/clothLen,0.,1.);vec3 p=transformed;vCloth=vec2(p.x,t);
    p.z+=p.x*p.x*wrap*(1.-smoothstep(0.,.3,t));
    p.x*=1.+flare*t;
    float w1=sin(p.y*4.6-time*5.2+p.x*3.7),w2=sin(p.y*9.1-time*8.4-p.x*6.3);
    float amp=(.035+.07*flow)*stream;
    p.z+=(w1*amp+w2*.018*stream)*t*1.5;
    p.z-=t*t*(.18+1.15*flow)*clothLen*.55*stream;
    p.y+=t*t*.5*flow*clothLen*.35*stream;
    p.x+=sway*t*t*.35*clothLen*stream+sin(time*1.7+p.y*2.)*.02*t;
    transformed=p;}`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+pars+`
   float ch(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float cn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(ch(i),ch(i+vec2(1,0)),f.x),mix(ch(i+vec2(0,1)),ch(i+vec2(1,1)),f.x),f.y);}`)
   .replace('#include <color_fragment>',`#include <color_fragment>
    float x=vCloth.x,t=vCloth.y;
    float tear=.88-.16*cn(vec2(x*14.,1.3))-.1*step(.72,cn(vec2(x*5.,7.)))-.04*cn(vec2(x*40.,time*.4));
    if(t>tear)discard;
    float edge=smoothstep(band*tear,tear,t);
    float fold=.78+.22*cos(x*38.+cn(vec2(x*6.,t*3.))*3.);
    diffuseColor.rgb*=fold*mix(1.,.55,edge);`)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    {float flick=cn(vec2(x*18.,t*9.-time*3.));float burn=smoothstep(.55,1.,edge+.35*flick-.2)*heat;
     vec3 fire=mix(vec3(.9,.18,.02),vec3(1.,.72,.2),smoothstep(.9,1.,t/tear+.1*flick));
     totalEmissiveRadiance+=fire*burn*1.8;}`);};
 m.customProgramCacheKey=()=>'pyroclast-cloth';return m;
}

// ---- geometry helpers (design metres, Y up, +Z forward) --------------------------------------
const lathe=(pts,seg=16)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);
// Extruded bevelled plate from an XY outline, bent around Y so it wraps a limb or chest (z drops by k·x²).
function plate(pts,{depth=.016,bevel=.008,k=0,curve=4}={}){
 const s=new THREE.Shape(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:curve});
 g.translate(0,0,-depth/2);
 if(k){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)-k*p.getX(i)**2);g.computeVertexNormals();}
 return g;
}
// Side-profile extrusion (profile in ZY, extruded across X) for boots and fins.
function profile(pts,width,bevel=.01){
 const s=new THREE.Shape(pts.map(([z,y])=>new THREE.Vector2(z,y)));
 const g=new THREE.ExtrudeGeometry(s,{depth:width,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:4});
 g.rotateY(-Math.PI/2);g.translate(width/2,0,0);return g;
}
// Glowing trim tube following an arc around Y (matches CylinderGeometry theta: from +Z toward +X).
function arcTube(r,y,theta0,len,tube=.008,seg=18){
 const pts=[];for(let i=0;i<=seg;i++){const a=theta0+len*i/seg;pts.push(new THREE.Vector3(r*Math.sin(a),y,r*Math.cos(a)));}
 return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),seg,tube,5,false);
}
function lineTube(points,tube=.007){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(4,points.length*4),tube,5,false);}
function flameShape(){
 const s=new THREE.Shape();s.moveTo(0,-.1);s.quadraticCurveTo(.09,-.06,.075,.03);s.quadraticCurveTo(.06,.08,.025,.12);s.quadraticCurveTo(.03,.05,0,.02);
 s.quadraticCurveTo(-.03,.07,-.02,.14);s.quadraticCurveTo(-.08,.07,-.075,.02);s.quadraticCurveTo(-.085,-.06,0,-.1);return s;
}
const flameGeometry=(depth=.012)=>{const g=new THREE.ExtrudeGeometry(flameShape(),{depth,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:1,curveSegments:6});g.translate(0,0,-depth/2);return g;};

// Collapse each pivot's static child meshes into one mesh per material (≈140 → ≈50 draw calls).
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
   for(const m of list){parent.remove(m);}for(const g of geoms)g.dispose();
  }
 }
}

export function buildPyroclast(height=4.4){
 const root=new THREE.Group();root.name='Pyroclast';
 const S=height/2.2,body=new THREE.Group();body.scale.setScalar(S);root.add(body);
 const U=sharedUniforms();
 const M={
  suit:suitMaterial(U),
  armor:armorMaterial(U,'#a9a6c4',{metal:.55,rough:.34}),
  armorShell:armorMaterial(U,'#a9a6c4',{metal:.55,rough:.34,side:THREE.DoubleSide}),
  plate2:armorMaterial(U,'#85809e',{metal:.5,rough:.42}),
  darkMetal:armorMaterial(U,'#2e2936',{metal:.6,rough:.32,rim:1.3}),
  darkShell:armorMaterial(U,'#2e2936',{metal:.6,rough:.32,rim:1.3,side:THREE.DoubleSide}),
  collar:new THREE.MeshStandardMaterial({color:'#5c0b12',roughness:.8,side:THREE.DoubleSide,flatShading:true}),
  trim:new THREE.MeshBasicMaterial({color:'#ff7a1a',toneMapped:false}),
  gold:new THREE.MeshBasicMaterial({color:'#ffcf3a',toneMapped:false}),
  eye:new THREE.MeshBasicMaterial({color:'#fff07a',toneMapped:false}),
  grille:new THREE.MeshBasicMaterial({color:'#ff9a2a',toneMapped:false})
 };
 const add=(parent,geometry,material,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1])=>{const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.rotation.set(...rot);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;};
 const pivot=(parent,pos,name)=>{const g=new THREE.Group();g.position.set(...pos);if(name)g.name=name;parent.add(g);return g;};
 const parts={};const flames=[];const capes=[];const glows=[];const trims=[];
 const trim=(parent,geometry,pos,rot,scale)=>{const m=add(parent,geometry,M.trim,pos,rot,scale);m.castShadow=false;trims.push(m);return m;};

 // ---- pelvis: hips, armoured belt with burning buckle, tassets, coat tails --------------------
 const pelvis=parts.pelvis=pivot(body,[0,1.05,0],'pelvis');
 add(pelvis,lathe([[0,.13],[.15,.12],[.185,.05],[.19,-.03],[.16,-.1],[.09,-.13],[0,-.135]]),M.suit,[0,0,0],[0,0,0],[1,1,.74]);
 add(pelvis,new THREE.CylinderGeometry(.205,.198,.075,20),M.darkMetal,[0,.085,0],[0,0,0],[1,1,.76]);
 trim(pelvis,arcTube(.207,.047,0,Math.PI*2,.006,40),[0,0,0],[0,0,0],[1,1,.76]);
 const buckle=add(pelvis,plate([[-.06,.045],[.06,.045],[.07,0],[.035,-.05],[-.035,-.05],[-.07,0]],{depth:.02,bevel:.007}),M.armor,[0,.085,.16]);
 const core=add(buckle,flameGeometry(),M.gold,[0,0,.018],[0,0,0],[.45,.45,1]);glows.push(core);
 // Front fauld.
 add(pelvis,plate([[-.07,0],[.07,0],[.055,-.1],[0,-.135],[-.055,-.1]],{k:1.4}),M.plate2,[0,.04,.15]);
 for(const [side,key] of [[1,'L'],[-1,'R']]){
  const t=parts['tasset'+key]=pivot(pelvis,[side*.12,.05,.1],'tasset'+key);
  const tp=pivot(t,[0,0,.01]);tp.rotation.set(.05,side*.35,side*.06);
  add(tp,plate([[-.075,0],[.075,0],[.08,-.17],[0,-.21],[-.07,-.16]],{k:2.2}),M.armor);
  trim(tp,lineTube([[-.068,-.158,.016-2.2*.0046],[0,-.198,.018],[.074,-.163,.016-2.2*.0055]],.005));
  const tail=parts['tail'+(side>0?1:-1)]=pivot(pelvis,[side*.11,.06,-.12],'tail'+side);tail.rotation.y=side*.25;
  const cloth=add(tail,new THREE.PlaneGeometry(.22,1,6,14).translate(0,-.5,0),clothMaterial(U,1,{wrap:.6,flare:.5,stream:.8,heatBand:.55}));cloth.castShadow=false;capes.push(cloth);
 }

 // ---- torso: V-tapered suit, chest plate, abs, back plate, gorget, collar --------------------
 const torso=parts.torso=pivot(pelvis,[0,.12,0],'torso');
 add(torso,lathe([[0,-.03],[.16,-.01],[.168,.1],[.205,.22],[.25,.34],[.255,.42],[.215,.5],[.14,.56],[0,.58]],20),M.suit,[0,0,0],[0,0,0],[1,1,.68]);
 // Chest: two bevelled pectoral plates over a sternum ridge, wrapped around the ribcage.
 for(const side of [-1,1]){
  add(torso,plate([[0,.0],[.2*side,.04],[.23*side,.15],[.16*side,.2],[.02*side,.17]].map(([x,y])=>[x,y]),{depth:.02,bevel:.01,k:1.6}),M.armor,[side*.012,.27,.178],[-.08,side*.12,0]);
 }
 add(torso,plate([[-.025,0],[.025,0],[.03,.2],[0,.23],[-.03,.2]],{depth:.025,bevel:.008}),M.plate2,[0,.25,.2],[-.08,0,0]);
 const emblem=add(torso,flameGeometry(.014),M.gold,[0,.37,.222],[-.08,0,0],[1.15,1.15,1]);glows.push(emblem);
 // Glowing seams under the pecs.
 trim(torso,lineTube([[-.21,.31,.15],[-.12,.275,.19],[0,.25,.205],[.12,.275,.19],[.21,.31,.15]],.006));
 // Segmented abdominal plates.
 for(let row=0;row<3;row++)for(const side of [-1,1]){
  const y=.04+row*.075,w=.07-row*.004;
  add(torso,plate([[-w/2,-.03],[w/2,-.03],[w/2+.005,.03],[-w/2-.005,.03]],{depth:.014,bevel:.007,k:2}),M.plate2,[side*.045,y,.128+row*.012],[-.12,side*.18,0]);
 }
 // Back plate and spine trim.
 add(torso,plate([[-.2,.0],[.2,.0],[.22,.18],[.12,.24],[-.12,.24],[-.22,.18]],{depth:.02,bevel:.01,k:1.4}),M.armor,[0,.26,-.16],[.06,Math.PI,0]);
 trim(torso,lineTube([[0,.05,-.125],[0,.2,-.155],[0,.46,-.175]],.006));
 add(torso,new THREE.CylinderGeometry(.115,.16,.075,14),M.darkMetal,[0,.545,-.005],[0,0,0],[1,1,.85]);
 // High flared collar behind the head (open in front).
 const collar=pivot(torso,[0,.6,-.03]);collar.rotation.x=-.32;collar.scale.set(1,1,.9);
 add(collar,new THREE.CylinderGeometry(.19,.13,.2,16,2,true,Math.PI-1.75,3.5),M.collar);
 trim(collar,arcTube(.19,.1,Math.PI-1.75,3.5,.006));

 // ---- pauldrons: three layered shells with glowing edges, spikes and shoulder fire ------------
 for(const [side,key] of [[-1,'R'],[1,'L']]){
  const pd=parts['pauldron'+key]=pivot(torso,[side*.3,.44,0],'pauldron'+key);
  const outer=side>0?Math.PI/2:-Math.PI/2;
  add(pd,new THREE.SphereGeometry(.15,16,8,0,Math.PI*2,0,Math.PI*.42),M.armorShell,[side*.02,.0,0],[0,0,side*-.38],[1.18,.78,1.08]);
  for(let i=0;i<3;i++){
   const r=.155+i*.012,y=-.045-i*.048;
   add(pd,new THREE.CylinderGeometry(r,r+.022,.06,16,1,true,outer-1.25,2.5),i===1?M.plate2:M.armorShell,[side*(.015+i*.012),y,0],[0,0,side*-.28],[1,1,1.05]);
   trim(pd,arcTube(r+.022,-.03,outer-1.25,2.5,.006),[side*(.015+i*.012),y,0],[0,0,side*-.28],[1,1,1.05]);
  }
  add(pd,new THREE.ConeGeometry(.032,.17,5),M.darkMetal,[side*.1,.1,-.03],[-.25,0,side*-.75]);
  add(pd,new THREE.ConeGeometry(.024,.11,5),M.darkMetal,[side*.03,.12,-.06],[-.4,0,side*-.35]);
  const sf=flame(.26,.38,{speed:3.6});sf.position.set(side*.04,.07,-.01);pd.add(sf);flames.push(sf);
 }

 // ---- arms: sculpted suit, elbow cops, flared vambraces with blade fins, articulated gauntlets --
 for(const [side,key] of [[-1,'R'],[1,'L']]){
  const shoulder=parts['shoulder'+key]=pivot(torso,[side*.31,.42,0],'shoulder'+key);
  add(shoulder,lathe([[0,.05],[.078,.03],[.09,-.05],[.086,-.15],[.072,-.25],[.06,-.31],[0,-.32]]),M.suit);
  const elbow=parts['elbow'+key]=pivot(shoulder,[0,-.3,0],'elbow'+key);
  add(elbow,new THREE.SphereGeometry(.07,12,8,0,Math.PI*2,0,Math.PI*.55),M.darkShell,[0,0,-.012],[-Math.PI/2-.3,0,0],[1,1,.9]);
  add(elbow,lathe([[0,.0],[.058,-.02],[.062,-.08],[.07,-.18],[.078,-.255],[.06,-.27],[0,-.272]]),M.darkMetal);
  add(elbow,plate([[0,0],[.05,-.04],[.085,-.2],[0,-.24]],{depth:.01,bevel:.005}),M.armor,[side*.06,-.02,0],[0,side>0?0:Math.PI,0]);
  trim(elbow,arcTube(.08,-.255,0,Math.PI*2,.009,24));
  trim(elbow,lineTube([[side*.075,-.06,0],[side*.11,-.19,0],[side*.075,-.24,0]],.004));
  const hand=parts['hand'+key]=pivot(elbow,[0,-.29,0],'hand'+key);
  add(hand,plate([[-.044,0],[.044,0],[.046,-.085],[-.046,-.085]],{depth:.04,bevel:.012}),M.darkMetal,[0,-.005,0]);
  add(hand,plate([[-.04,0],[.04,0],[.042,-.05],[-.042,-.05]],{depth:.01,bevel:.006,k:3}),M.armor,[0,-.03,.03]);
  // Fingers curl together: one knuckle row and one tip row (with glowing claws).
  const base=pivot(hand,[0,-.095,0]),mid=pivot(base,[0,-.05,0]);
  for(let i=0;i<4;i++){
   const x=-.033+i*.022,len=i===0||i===3?.034:.04;
   add(base,new THREE.CapsuleGeometry(.0105,len,3,6),M.darkMetal,[x,-len/2-.005,0]);
   add(mid,new THREE.CapsuleGeometry(.0095,len*.8,3,6),M.darkMetal,[x,-len*.4-.002+(.04-len),0]);
   add(mid,new THREE.ConeGeometry(.009,.03,5),M.trim,[x,-len*.8-.018+(.04-len),-.002],[Math.PI,0,0]).castShadow=false;
  }
  const fingers=[{base,mid}];
  const thumb=pivot(hand,[-side*.05,-.035,-.012]);thumb.rotation.z=-side*.6;
  add(thumb,new THREE.CapsuleGeometry(.011,.04,3,6),M.darkMetal,[0,-.03,0]);
  parts['fingers'+key]=fingers;parts['thumb'+key]=thumb;
 }

 // ---- head: smooth helm, wrapped faceplate, eye slits, mouth grille, brow crest, flame fins -----
 const head=parts.head=pivot(torso,[0,.64,0],'head');
 add(head,new THREE.CylinderGeometry(.06,.075,.1,10),M.suit,[0,-.02,0]);
 add(head,new THREE.SphereGeometry(.14,20,16),M.darkMetal,[0,.13,-.015],[0,0,0],[1,1.1,1.08]);
 add(head,plate([[-.12,.11],[.12,.11],[.13,.02],[.085,-.08],[0,-.125],[-.085,-.08],[-.13,.02]],{depth:.03,bevel:.01,k:4.2}),M.darkMetal,[0,.1,.135]);
 for(const side of [-1,1]){
  // Cheek guards and slanted eye slits.
  add(head,plate([[0,.06],[.05,.04],[.055,-.05],[0,-.1]],{depth:.014,bevel:.006}),M.armor,[side*.11,.07,.07],[0,side*.9,0],[side,1,1]);
  const eye=new THREE.Shape();eye.moveTo(0,0);eye.lineTo(.07,.026);eye.lineTo(.082,.004);eye.lineTo(.018,-.018);eye.closePath();
  const e=add(head,new THREE.ShapeGeometry(eye),M.eye,[side*.016,.142,.166],[0,side*.32,0],[side,1,1]);e.castShadow=false;glows.push(e);
  // Swept flame-shaped fins at the temples.
  const fin=add(head,flameGeometry(.012),M.armor,[side*.135,.17,-.04],[0,side*1.45,side*-1.05],[1.05,1.35,1]);
  trim(head,new THREE.TorusGeometry(.04,.008,6,16),[side*.142,.115,-.02],[0,Math.PI/2,0]);
 }
 // Brow crest (chevron) and glowing mouth grille.
 add(head,plate([[-.12,.03],[0,-.01],[.12,.03],[.12,-.005],[0,-.045],[-.12,-.005]],{depth:.02,bevel:.007,k:4}),M.armor,[0,.19,.165]);
 trim(head,lineTube([[-.11,.18,.15],[0,.148,.192],[.11,.18,.15]],.005));
 for(let i=0;i<3;i++){const g=add(head,new THREE.BoxGeometry(.06-i*.012,.007,.01),M.grille,[0,.05-i*.022,.166-i*.006]);g.castShadow=false;glows.push(g);}
 const crown=[[0,.25,-.03,.5,1,2.6],[-.1,.22,0,.32,.66,3.2],[.1,.22,0,.32,.64,3.4],[0,.2,-.13,.44,.76,2.9],[-.16,.12,-.05,.22,.44,3.8],[.16,.12,-.05,.22,.44,3.8],[-.07,.27,-.09,.24,.56,4.2],[.07,.27,-.09,.24,.58,4.4]];
 for(const [x,y,z,w,h,speed] of crown){const f=flame(w,h,{speed});f.position.set(x,y,z);head.add(f);flames.push(f);}

 // ---- legs: sculpted thighs with plates, fan knee cops, greaves with ridges, pointed sabatons --
 for(const [side,key] of [[-1,'R'],[1,'L']]){
  const hip=parts['hip'+key]=pivot(pelvis,[side*.115,-.04,0],'hip'+key);
  add(hip,lathe([[0,.04],[.1,.01],[.112,-.08],[.104,-.24],[.084,-.4],[.068,-.45],[0,-.46]]),M.suit);
  add(hip,plate([[-.07,0],[.07,0],[.06,-.2],[0,-.24],[-.06,-.2]],{depth:.014,bevel:.007,k:5}),M.armor,[side*.012,-.1,.1],[-.04,side*.18,0]);
  const knee=parts['knee'+key]=pivot(hip,[0,-.45,0],'knee'+key);
  add(knee,new THREE.SphereGeometry(.072,14,8,0,Math.PI*2,0,Math.PI*.55),M.armorShell,[0,.0,.045],[Math.PI/2+.15,0,0],[1,1,.7]);
  add(knee,plate([[0,.05],[.07,.02],[.06,-.05],[0,-.02]],{depth:.01,bevel:.005}),M.plate2,[side*.06,0,.01],[0,side>0?0:Math.PI,0]);
  trim(knee,arcTube(.075,-.02,-1.2,2.4,.006),[0,0,.012]);
  add(knee,lathe([[0,.0],[.078,-.03],[.088,-.1],[.08,-.24],[.064,-.36],[.066,-.39],[0,-.4]]),M.darkMetal,[0,0,0],[0,0,0],[1,1,.92]);
  add(knee,plate([[-.03,0],[.03,0],[.02,-.3],[0,-.33],[-.02,-.3]],{depth:.016,bevel:.006,k:6}),M.armor,[0,-.05,.08]);
  trim(knee,lineTube([[side*.07,-.08,.02],[side*.072,-.2,.02],[side*.06,-.33,.015]],.005));
  const ankle=parts['ankle'+key]=pivot(knee,[0,-.4,0],'ankle'+key);
  add(ankle,profile([[-.085,.03],[-.09,-.06],[-.06,-.11],[.17,-.12],[.215,-.105],[.17,-.07],[.06,-.03],[.03,.04]],.13,.012),M.armor,[0,0,0]);
  add(ankle,profile([[-.06,.0],[-.07,-.07],[.0,-.07],[.04,.02]],.15,.008),M.darkMetal,[0,.0,0]);
  trim(ankle,lineTube([[-.07,-.118,-.07],[-.07,-.122,.16],[0,-.125,.2],[.07,-.122,.16],[.07,-.118,-.07]],.006));
  add(ankle,new THREE.ConeGeometry(.02,.07,5),M.darkMetal,[side*.075,-.01,-.06],[-.6,0,side*-.4]);
  const jet=flame(.26,-.8,{speed:6});jet.position.set(0,-.12,0);ankle.add(jet);flames.push(jet);parts['jet'+key]=jet;
 }

 // ---- cape: one long tattered cloth, streaming with speed, burning hem; back emblem ------------
 const capeRoot=parts.cape=pivot(torso,[0,.5,-.17],'cape');
 const capeLen=1.72;
 const cape=add(capeRoot,new THREE.PlaneGeometry(.6,capeLen,16,34).translate(0,-capeLen/2,0),clothMaterial(U,capeLen,{wrap:1.7,flare:.4,stream:1,heatBand:.6}));
 cape.castShadow=false;capes.push(cape);
 const backEmblem=add(torso,flameGeometry(.012),M.gold,[0,.3,-.176],[.06,Math.PI,0],[1.25,1.25,1]);backEmblem.castShadow=false;glows.push(backEmblem);

 mergeStatic(root,new Set([...flames,...capes]));
 root.traverse(o=>{if(o.isMesh)o.frustumCulled=false;});
 // One call keeps every shader in step with the simulation.
 const update=(time,{heat=1,flow=0,sway=0,rim=1}={})=>{U.time.value=time;U.heat.value=heat;U.flow.value=flow;U.sway.value=sway;U.rim.value=rim;};
 return {root,body,parts,flames,capes,glows,trims,materials:M,uniforms:U,update,scale:S};
}
