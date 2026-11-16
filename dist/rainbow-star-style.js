import * as THREE from './vendor/three.module.js';
const spectrum=`vec3 rainbowStarSpectrum(float t){return clamp(abs(mod(t*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}`;
// Recolor Solara's complete fitted model; never modify her shared geometry/materials.
export function styleRainbowStar(base){
 const material=base.character.meshes[0].material;material.roughness=.46;material.metalness=.24;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute float _region;varying vec3 rainbowStarBind;varying float rainbowStarRegion;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n rainbowStarBind=position;rainbowStarRegion=_region;');
  shader.fragmentShader='varying vec3 rainbowStarBind;varying float rainbowStarRegion;\n'+spectrum+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float skin=1.-step(.3,abs(rainbowStarRegion-1.));
   float sash=1.-smoothstep(.055,.085,abs(rainbowStarBind.y-1.48+rainbowStarBind.x*.7));
   float waist=1.-smoothstep(.018,.035,abs(rainbowStarBind.y-1.23));
   vec3 rainbow=rainbowStarSpectrum(rainbowStarBind.x*.8+rainbowStarBind.y*.7);
   vec3 outfit=mix(vec3(.027,.018,.095),rainbow*.72,sash);
   outfit=mix(outfit,vec3(.75,.49,.12),waist);
   diffuseColor.rgb=mix(outfit,vec3(.79,.49,.30),skin);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=rainbow*sash*(1.-skin)*.08;');
 };material.customProgramCacheKey=()=> 'rainbow-star-solara-suit-290';
 for(const part of base.parts)part.mesh.traverse(mesh=>{if(!mesh.isMesh)return;const eye=part.mesh.name.endsWith('_eye');mesh.material=eye?new THREE.MeshBasicMaterial({color:part.mesh.name==='fire_eye'?'#ceacff':'#81ddff',toneMapped:false}):new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.58,metalness:.12});if(eye)return;mesh.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 rainbowStarHair;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n rainbowStarHair=position;');shader.fragmentShader='varying vec3 rainbowStarHair;\n'+spectrum+'\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float tips=smoothstep(.02,.5,rainbowStarHair.y);
   diffuseColor.rgb=mix(vec3(.035,.014,.065),rainbowStarSpectrum(rainbowStarHair.x*.9+rainbowStarHair.y*.8)*.7,.15+tips*.65);`);};mesh.material.customProgramCacheKey=()=> 'rainbow-star-solara-hair-290';});
}
