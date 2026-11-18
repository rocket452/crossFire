import * as THREE from './vendor/three.module.js';

// A small bloom pyramid. The city, including its stencil-based actor silhouettes,
// is rendered once. Only bright pixels reach the low-resolution passes.
const screenVertex = `
varying vec2 screenUV;
void main() {
 screenUV = position.xy * .5 + .5;
 gl_Position = vec4(position.xy, 0., 1.);
}`;
const blurFragment = `
varying vec2 screenUV;
uniform sampler2D image;
uniform vec2 stepUV;
uniform bool extractLights;
vec3 sampleLight(vec2 p) {
 vec3 c = texture2D(image, p).rgb;
 if (extractLights) {
  float peak = max(c.r, max(c.g, c.b));
  c *= smoothstep(.76, 1.55, peak);
 }
 return min(c, vec3(8.));
}
void main() {
 vec2 d = stepUV;
 vec3 color = 4. * sampleLight(screenUV)
  + 2. * (sampleLight(screenUV + vec2(d.x,0.)) + sampleLight(screenUV - vec2(d.x,0.))
   + sampleLight(screenUV + vec2(0.,d.y)) + sampleLight(screenUV - vec2(0.,d.y)))
  + sampleLight(screenUV+d) + sampleLight(screenUV-d)
  + sampleLight(screenUV+vec2(d.x,-d.y)) + sampleLight(screenUV+vec2(-d.x,d.y));
 gl_FragColor = vec4(color / 16., 1.);
}`;
const composeFragment = `
varying vec2 screenUV;
uniform sampler2D sceneColor, tightGlow, softGlow, wideGlow;
void main() {
 vec3 light = texture2D(tightGlow, screenUV).rgb * .21
  + texture2D(softGlow, screenUV).rgb * .32 + texture2D(wideGlow, screenUV).rgb * .44;
 gl_FragColor = vec4(texture2D(sceneColor, screenUV).rgb + light, 1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

class NeonBloom {
 constructor(renderer) {
  this.renderer = renderer;
  this.world = new THREE.WebGLRenderTarget(1, 1, {
   type: THREE.HalfFloatType, stencilBuffer: true, depthBuffer: true
  });
  this.levels = [4, 8, 16].map(() => new THREE.WebGLRenderTarget(1, 1, {
   type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false
  }));
  this.blur = new THREE.ShaderMaterial({
   vertexShader: screenVertex, fragmentShader: blurFragment, toneMapped: false,
   depthTest: false, depthWrite: false,
   uniforms: {image:{value:null}, stepUV:{value:new THREE.Vector2()}, extractLights:{value:false}}
  });
  this.compose = new THREE.ShaderMaterial({
   vertexShader: screenVertex, fragmentShader: composeFragment,
   depthTest: false, depthWrite: false,
   uniforms: {sceneColor:{value:this.world.texture}, tightGlow:{value:this.levels[0].texture},
    softGlow:{value:this.levels[1].texture}, wideGlow:{value:this.levels[2].texture}}
  });
  this.pass = new THREE.Scene();
  this.camera = new THREE.Camera();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0, 3,-1,0, -1,3,0],3));
  this.screen = new THREE.Mesh(geometry,this.blur);
  this.screen.frustumCulled = false;
  this.pass.add(this.screen);
  this.size = new THREE.Vector2();
  renderer.info.autoReset = false;
 }
 render(scene,camera) {
  const r = this.renderer;
  r.getDrawingBufferSize(this.size);
  if (!this.size.x || !this.size.y) return;
  this.world.setSize(this.size.x,this.size.y);
  r.info.reset();
  r.setRenderTarget(this.world);
  r.render(scene,camera);
  let source = this.world;
  this.screen.material = this.blur;
  this.levels.forEach((target,i) => {
   const divisor = 4 << i;
   target.setSize(Math.max(1,Math.ceil(this.size.x/divisor)),Math.max(1,Math.ceil(this.size.y/divisor)));
   this.blur.uniforms.image.value = source.texture;
   this.blur.uniforms.extractLights.value = (i===0);
   const spread = i===0 ? 1.4 : 2.3;
   this.blur.uniforms.stepUV.value.set(spread/source.width,spread/source.height);
   r.setRenderTarget(target);
   r.render(this.pass,this.camera);
   source = target;
  });
  this.screen.material = this.compose;
  r.setRenderTarget(null);
  r.render(this.pass,this.camera);
 }
}

export class AssetCityLighting {
 constructor(scene,renderer,skyLight,sun) {
  const horizon = new THREE.Color('#738dbb');
  scene.background = horizon;
  scene.fog = new THREE.FogExp2(horizon,.0076);
  skyLight.color.set('#cddfff');
  skyLight.groundColor.set('#a994bc');
  skyLight.intensity = 2.65;
  sun.color.set('#ffdbca');
  sun.intensity = 1.9;
  sun.position.set(-95,112,-60);
  // A broad, cool light from across the street brings out the stepped facades
  // on the shaded side of the district. Only the existing sun casts shadows.
  const cityFill = new THREE.DirectionalLight('#79caff', 1.65);
  cityFill.position.set(65, 44, 85);
  scene.add(cityFill);
  // The skyline continues around the playable board. Match the far ground to
  // the haze so the board has no bright rectangular edge in the overview.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),
   new THREE.MeshStandardMaterial({color:'#292f4a',roughness:1}));
  floor.rotation.x = -Math.PI/2;
  floor.position.y = -1.025;
  scene.add(floor);
  this.sky = new THREE.Mesh(new THREE.SphereGeometry(1,32,16),new THREE.ShaderMaterial({
   side:THREE.BackSide, depthWrite:false, depthTest:false,
   uniforms:{horizon:{value:horizon},zenith:{value:new THREE.Color('#20254e')}},
   vertexShader:`varying vec3 ray; void main(){
    ray=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
   }`,
   fragmentShader:`varying vec3 ray; uniform vec3 horizon,zenith; void main(){
    vec3 d=normalize(ray); vec3 sky=mix(horizon,zenith,smoothstep(-.03,.70,d.y));
    float sunset=pow(max(0.,dot(d,normalize(vec3(-.8,.08,-.5)))),6.)*.34;
    gl_FragColor=vec4(mix(sky,vec3(.45,.19,.36),sunset),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
  }));
  this.sky.scale.setScalar(580);
  this.sky.renderOrder=-1000;
  this.sky.frustumCulled=false;
  scene.add(this.sky);
  this.bloom = renderer.extensions.has('EXT_color_buffer_float') ? new NeonBloom(renderer) : null;
  this.lights=Array.from({length:3},()=>{
   const light=new THREE.PointLight(0xffffff,0,21,2);
   scene.add(light);return light;
  });
  this.renderer=renderer;
  this.nextSelection=0;
 }
 render(scene,camera,time,signs) {
  this.sky.position.copy(camera.position);
  if(time>=this.nextSelection && signs){
   this.nextSelection=time+.22;
   const nearby=signs.filter(s=>!s.section.hasDetached).sort((a,b)=>
    camera.position.distanceToSquared(a.point)-camera.position.distanceToSquared(b.point));
   for(const [index,light] of this.lights.entries()){
    const s=nearby[index];
    if(!s){light.intensity=0;continue;}
    light.position.copy(s.point);
    light.color.set(s.color);
    light.intensity=210;
   }
  }
  if(this.bloom) this.bloom.render(scene,camera);
  else this.renderer.render(scene,camera);
 }
}
