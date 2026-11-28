import * as THREE from './vendor/three.module.js';
// Cyber-ronin finish for the Astra Ronin: dual-tone neon rim light on the armour, a holographic shield face,
// a plasma sheath around the blade and a tattered techwear scarf. Shared clock in CYBER_TIME.
export const CYBER_TIME={value:0};
const RIM_A=new THREE.Color('#19e3ff'),RIM_B=new THREE.Color('#ff2ad4');

// City neon reflected along the silhouette: cyan from one side, magenta from the other.
export function neonRim(material,{strength=.8,power=2.6}={}){
 material.userData.rim={strength,power};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{uRimA:{value:RIM_A},uRimB:{value:RIM_B},uRimStrength:{value:strength},uRimPower:{value:power}});
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 uRimA;uniform vec3 uRimB;uniform float uRimStrength;uniform float uRimPower;')
   .replace('#include <opaque_fragment>',`float rimFacing=1.-max(dot(normal,normalize(vViewPosition)),0.);
vec3 rimWorld=inverseTransformDirection(normal,viewMatrix);
outgoingLight+=mix(uRimA,uRimB,smoothstep(-.55,.55,rimWorld.x*.8+rimWorld.z*.45))*pow(rimFacing,uRimPower)*uRimStrength;
#include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=>'astra-ronin-rim';
 return material;
}
export function cloneCyber(source){const material=source.clone();if(source.userData.rim)neonRim(material,source.userData.rim);return material;}

const additive=(vertexShader,fragmentShader,uniforms,extra={})=>new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,...extra});
const UV_VERTEX=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

// Hard-light shield face: hex lattice, scanlines rolling down, brighter rim, flicker; flashes on a block.
export function holoShieldMaterial(){
 return additive(UV_VERTEX,`uniform float uTime;uniform float uFlash;uniform vec3 uA;uniform vec3 uB;varying vec2 vUv;
float hex(vec2 p){p*=vec2(1.,1.1547);p.x+=mod(floor(p.y),2.)*.5;vec2 f=abs(fract(p)-.5);return max(f.x*1.5+f.y,f.y*2.);}
void main(){vec2 p=vUv;float lattice=smoothstep(.86,.97,hex(p*vec2(9.,13.)));
 float scan=.65+.35*sin(p.y*140.-uTime*9.),roll=smoothstep(.0,.08,fract(p.y*1.3-uTime*.35))*smoothstep(.16,.08,fract(p.y*1.3-uTime*.35));
 float flicker=.86+.14*sin(uTime*37.)*sin(uTime*13.+1.);vec3 color=mix(uA,uB,p.y);
 float a=(.16+lattice*.55+roll*.5)*scan*flicker;gl_FragColor=vec4(color*a*(1.+uFlash*3.)+vec3(.35,.55,1.)*uFlash*.8,1.);}`,
 {uTime:CYBER_TIME,uFlash:{value:0},uA:{value:new THREE.Color('#0aa9ff')},uB:{value:new THREE.Color('#13e8ff')}});
}

// Plasma sheath around the blade: hottest along the cutting edge, licking toward the tip.
export function plasmaSheathMaterial(){
 return additive(UV_VERTEX,`uniform float uTime;uniform float uPower;uniform vec3 uCore;uniform vec3 uGlow;varying vec2 vUv;
void main(){float edge=pow(1.-abs(vUv.x*2.-1.),.6),tip=smoothstep(1.,.86,vUv.y)*smoothstep(0.,.06,vUv.y);
 float lick=.7+.3*sin(vUv.y*40.-uTime*18.)*sin(vUv.y*13.+uTime*5.);
 float a=edge*tip*lick*uPower;gl_FragColor=vec4(mix(uGlow,uCore,pow(edge,4.))*a,1.);}`,
 {uTime:CYBER_TIME,uPower:{value:.45},uCore:{value:new THREE.Color('#ffe8fb')},uGlow:{value:new THREE.Color('#ff1fc8')}});
}

// Two tattered scarf tails tied behind the neck. They hang and drift at rest and stream out behind the
// body as it boosts. Bent in the vertex shader; uStream (0..1) and uSway come from the animation.
export function scarfMaterial(){
 const material=new THREE.MeshStandardMaterial({color:'#c8104f',roughness:.72,metalness:.05,side:THREE.DoubleSide,emissive:'#19e3ff',emissiveIntensity:0});
 const uniforms={uTime:CYBER_TIME,uStream:{value:0},uSway:{value:new THREE.Vector2()},uLength:{value:6.8}};
 material.userData.scarf=uniforms;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aTail;uniform float uTime;uniform float uStream;uniform vec2 uSway;uniform float uLength;varying vec2 vScarf;')
   .replace('#include <begin_vertex>',`float v=uv.y,side=aTail*2.-1.;vScarf=uv;
float L=uLength*v,flap=sin(uTime*(3.1+aTail*.7)-v*7.+aTail*2.)*v*(.22+.55*uStream),flap2=sin(uTime*2.2-v*5.+aTail)*v*(.18+.3*uStream);
vec3 hang=vec3(side*.35*v+uSway.x*v*v*1.2,-L*(.5+.2*v),-L*(.62+.08*v)+uSway.y*v*v);
vec3 stream=vec3(side*.35*v+uSway.x*v*v*2.,-L*.18-v*v*.8,-L);
float twist=v*(.9+.6*sin(uTime*1.3+aTail*2.))+flap*.8;vec3 across=vec3(position.x*cos(twist),position.x*sin(twist)*.35,position.x*sin(twist));
vec3 transformed=across+mix(hang,stream,uStream)+vec3(flap2*.6,flap*.5,flap);`)
   .replace('#include <beginnormal_vertex>','vec3 objectNormal=normalize(vec3(0.,.55,-.83));');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vScarf;')
   .replace('#include <clipping_planes_fragment>',`float tear=.88+.1*sin(vScarf.x*41.)*sin(vScarf.x*13.+2.);if(vScarf.y>tear)discard;
if(vScarf.y>.62&&fract(sin(dot(floor(vScarf*vec2(5.,18.)),vec2(12.9,78.2)))*43758.5)>.95)discard;
#include <clipping_planes_fragment>`)
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.1,.89,1.)*2.6*smoothstep(.86,.95,abs(vScarf.x*2.-1.))*step(vScarf.y,.8);');
 };
 material.customProgramCacheKey=()=>'astra-ronin-scarf';
 return material;
}
export function scarfGeometry(){
 const tails=[0,1].map(tail=>{const g=new THREE.PlaneGeometry(tail?1.05:1.35,1,1,22);g.setAttribute('aTail',new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(tail),1));
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));g.translate(tail?.3:-.3,0,tail?-.05:0);return g;});
 const merged=new THREE.BufferGeometry();const parts=tails.map(g=>g.toNonIndexed());
 for(const key of['position','normal','uv','aTail']){const arrays=parts.map(g=>g.attributes[key].array),size=parts[0].attributes[key].itemSize,data=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let o=0;for(const a of arrays){data.set(a,o);o+=a.length;}merged.setAttribute(key,new THREE.BufferAttribute(data,size));}
 return merged;
}
// A neon piping frame that wraps a plate's outline, sitting proud of both faces.
export function outlineRing(outline,{outer=1.03,inner=.9,depth=1.02}={}){
 const shape=new THREE.Shape(),hole=new THREE.Path();
 outline.forEach(([x,y],i)=>i?shape.lineTo(x*outer,y*outer):shape.moveTo(x*outer,y*outer));shape.closePath();
 [...outline].reverse().forEach(([x,y],i)=>i?hole.lineTo(x*inner,y*inner):hole.moveTo(x*inner,y*inner));hole.closePath();shape.holes.push(hole);
 const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});g.translate(0,0,-depth/2);return g;
}

// Yellow/black warning stripes as a tiny data texture (no canvas, so it also builds in Node tests).
export function hazardMaterial(){
 const size=32,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const stripe=((x+y)%16)<8,i=(y*size+x)*4;data.set(stripe?[255,206,26,255]:[18,18,22,255],i);}
 const map=new THREE.DataTexture(data,size,size);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2.5,2.5);map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.NearestFilter;map.needsUpdate=true;
 return neonRim(new THREE.MeshStandardMaterial({map,metalness:.25,roughness:.55}),{strength:.2,power:3.4});
}

// Street underglow: a soft magenta pool ringed in cyan on the ground beneath the feet.
export function underglowMaterial(){
 return additive(UV_VERTEX,`uniform float uTime;uniform float uPower;varying vec2 vUv;
void main(){float r=length(vUv*2.-1.);if(r>1.)discard;float pool=pow(1.-r,2.2)*.75,ring=exp(-pow((r-.82)*14.,2.))*(.7+.3*sin(uTime*2.4));
 gl_FragColor=vec4((vec3(1.,.12,.78)*pool+vec3(.1,.85,1.)*ring)*uPower*.55,1.);}`,{uTime:CYBER_TIME,uPower:{value:1}},{depthWrite:false});
}
