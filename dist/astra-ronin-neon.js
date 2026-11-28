import * as THREE from './vendor/three.module.js';
// Neon circuit traces etched into a standard material: short horizontal/vertical runs and solder pads laid
// out on a grid in each mesh's own (node-local) space, pulsing slowly. No extra meshes or textures.
export const NEON_TIME={value:0};
const NEON_CHUNK=`
varying vec3 vNeonPos;varying vec3 vNeonNormal;
uniform float uNeonTime;uniform vec3 uNeonColor;uniform float uNeonStrength;uniform float uNeonScale;
float neonHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float neonTrace(vec3 p,vec3 n){
 vec3 a=abs(n);vec2 uv=a.x>a.y&&a.x>a.z?p.zy:a.y>a.z?p.xz:p.xy;uv*=uNeonScale;
 vec2 c=floor(uv),f=fract(uv);float h=neonHash(c),w=.05;
 float run=h<.2?step(abs(f.y-.5),w)*step(.18,f.x):h<.32?step(abs(f.x-.5),w)*step(f.y,.82):0.;
 float pad=step(.9,h)*step(length(f-.5),.11);
 float pulse=.45+.55*pow(.5+.5*sin(uNeonTime*2.2-c.x*.9-c.y*.6+h*6.),3.);
 return (run+pad)*pulse;
}`;
export function neonCircuit(material,{color,strength=1,scale=3}){
 material.userData.neon={color,strength,scale};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{uNeonTime:NEON_TIME,uNeonColor:{value:new THREE.Color(color)},uNeonStrength:{value:strength},uNeonScale:{value:scale}});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vNeonPos;varying vec3 vNeonNormal;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvNeonPos=position;vNeonNormal=normal;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+NEON_CHUNK)
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=uNeonColor*uNeonStrength*neonTrace(vNeonPos,vNeonNormal);');
 };
 material.customProgramCacheKey=()=>'astra-ronin-neon';
 return material;
}
// Clones lose onBeforeCompile; re-etch any material that carried traces.
export function cloneNeon(source){const material=source.clone();if(source.userData.neon)neonCircuit(material,source.userData.neon);return material;}
