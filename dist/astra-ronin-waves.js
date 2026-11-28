import * as THREE from './vendor/three.module.js';
// Astra Ronin's wave slash. Each sweep of the blade peels off a row of vertical plasma blades that run along
// the ground with gaps between them. Ground lanes telegraph a volley's paths, so the gaps read before release.
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),FORWARD=V(0,0,1),dummy=new THREE.Object3D();
export const RONIN_WAVE_FX=Object.freeze({pool:12,lanes:10,fadeIn:.08,fadeOut:.28,bow:1.7,trail:16});
const additive=(vertexShader,fragmentShader,uniforms)=>new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
const VERTEX=`attribute float aFade;attribute float aSeed;attribute float aLen;varying vec2 vUv;varying float vFade;varying float vSeed;varying float vLen;
void main(){vUv=uv;vFade=aFade;vSeed=aSeed;vLen=aLen;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`;
// Blade: a tall neon-outlined plasma edge with a pointed tip, holographic scanlines streaming up inside,
// a cyan inner rim and a white-hot ground contact.
const BLADE=`uniform float uTime;uniform vec3 uCore;uniform vec3 uGlow;uniform vec3 uRim;varying vec2 vUv;varying float vFade;varying float vSeed;
void main(){float x=vUv.x*2.-1.,ax=abs(x),top=1.-.42*ax*ax-.18*ax,v=vUv.y/top;if(v>1.)discard;
 float edge=min((1.-ax)*2.2,(1.-v)*5.);float outline=exp(-edge*9.),inner=exp(-max(0.,edge-.18)*14.)*(1.-outline);
 float scan=.55+.45*step(.5,fract(v*26.-uTime*7.+vSeed*3.)),stream=.5+.5*sin(x*17.+vSeed*9.+uTime*5.)*sin(v*7.-uTime*12.);
 float base=exp(-v*9.),body=(.16+.2*stream)*scan*(1.-v*.5);
 float a=(outline*1.6+inner*.55+base*1.1+body)*vFade;
 vec3 color=uGlow*(body+outline*1.2)+uRim*inner*.9+uCore*(base+pow(outline,3.)*.8);gl_FragColor=vec4(color*vFade,1.)*(a>0.?1.:0.);}`;
// Scorch trail behind each blade: bright at the blade, burning out along its wake.
const TRAIL=`uniform float uTime;uniform vec3 uCore;uniform vec3 uGlow;varying vec2 vUv;varying float vFade;varying float vSeed;
void main(){float t=1.-vUv.y,x=abs(vUv.x*2.-1.),line=pow(1.-x,4.),flick=.75+.25*sin(t*30.-uTime*22.+vSeed*7.);
 float a=vFade*pow(t,1.6)*(.18+.82*line)*flick;gl_FragColor=vec4(mix(uGlow,uCore,line*t)*a,1.);}`;
// Lane telegraph: bright borders, chevrons marching outward, fading toward the far end.
const LANE=`uniform float uTime;uniform vec3 uColor;varying vec2 vUv;varying float vFade;varying float vSeed;varying float vLen;
void main(){float along=1.-vUv.y,x=abs(vUv.x*2.-1.),border=smoothstep(.82,.97,x);
 float chevron=step(.62,fract(along*vLen/5.-uTime*1.8-x*.35));
 float a=vFade*(border*.85+chevron*.22*(1.-x)+.07)*(1.-along*.55)*smoothstep(0.,.04,along);
 gl_FragColor=vec4(uColor*(1.+vSeed*.6)*a,1.);}`;
export class RoninWaves{
 constructor(scene,config){
  this.scene=scene;this.config=config;this.waves=[];this.lanes=[];this.uniforms={uTime:{value:0}};
  this.group=new THREE.Group();this.group.name='Ronin wave slash';scene.add(this.group);
  const blade=new THREE.PlaneGeometry(1,1,10,6);blade.translate(0,.5,0);
  const p=blade.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,(1-(2*x)**2)*(1-.35*y));}
  const trail=new THREE.PlaneGeometry(1,1);trail.rotateX(-Math.PI/2);trail.translate(0,0,-.5);
  const lane=new THREE.PlaneGeometry(1,1);lane.rotateX(-Math.PI/2);lane.translate(0,0,.5);
  const u=this.uniforms;
  this.blades=this.instanced('Ronin plasma wave',blade,additive(VERTEX,BLADE,{uTime:u.uTime,uCore:{value:new THREE.Color('#fff2fd')},uGlow:{value:new THREE.Color('#ff2bd6')},uRim:{value:new THREE.Color('#38e8ff')}}),RONIN_WAVE_FX.pool);
  this.trails=this.instanced('Ronin wave scorch',trail,additive(VERTEX,TRAIL,{uTime:u.uTime,uCore:{value:new THREE.Color('#ffd9f6')},uGlow:{value:new THREE.Color('#c0109c')}}),RONIN_WAVE_FX.pool);
  this.laneMesh=this.instanced('Ronin wave lane telegraph',lane,additive(VERTEX,LANE,{uTime:u.uTime,uColor:{value:new THREE.Color('#ff3fcf')}}),RONIN_WAVE_FX.lanes);
  this.reset();
 }
 instanced(name,geometry,material,count){
  for(const key of['aFade','aSeed','aLen'])geometry.setAttribute(key,new THREE.InstancedBufferAttribute(new Float32Array(count),1).setUsage(THREE.DynamicDrawUsage));
  const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.visible=false;mesh.renderOrder=3;this.group.add(mesh);return mesh;
 }
 reset(){this.waves.length=0;this.lanes=[];for(const mesh of[this.blades,this.trails,this.laneMesh]){mesh.count=0;mesh.visible=false;}}
 get active(){return this.waves.filter(w=>w.dying<0).length;}
 // lane: {origin, dir, length, blocked, width, height}
 launch(lane){if(this.waves.length>=RONIN_WAVE_FX.pool)this.waves.shift();const wave={...lane,origin:lane.origin.clone(),dir:lane.dir.clone(),side:V(lane.dir.z,0,-lane.dir.x),s:0,age:0,dying:-1,hit:new Set(),seed:Math.random()};this.waves.push(wave);return wave;}
 dissipate(){for(const w of this.waves)if(w.dying<0)w.dying=0;}
 setLanes(lanes){this.lanes=lanes;}
 point(w,s=w.s){return w.origin.clone().addScaledVector(w.dir,s);}
 update(dt,time,ctx={}){const c=this.config,F=RONIN_WAVE_FX;this.uniforms.uTime.value=time;
  for(let i=this.waves.length-1;i>=0;i--){const w=this.waves[i];w.age+=dt;
   if(w.dying>=0){w.dying+=dt;w.s+=c.waveSpeed*.25*dt;if(w.dying>=F.fadeOut)this.waves.splice(i,1);continue;}
   const from=w.s;w.s=Math.min(w.length,w.s+c.waveSpeed*dt);this.strike(w,from,w.s,ctx);
   if(w.s>=w.length){w.dying=0;if(w.blocked)ctx.onBuilding?.(this.point(w),w);}
  }
  this.write(time);
 }
 // Swept test against each target: anything the blade's front crossed this frame inside its width and height.
 strike(w,from,to,ctx){const c=this.config;
  for(const unit of ctx.targets||[]){if(!unit?.alive||unit.dashPhased||!unit.shapes?.length||w.hit.has(unit))continue;
   const point=V().copy(unit.shapes[0].center),rel=point.clone().sub(w.origin),along=rel.dot(w.dir),lateral=Math.abs(rel.dot(w.side)),height=point.y-w.origin.y;
   if(along<from-1.2||along>to+1.2||lateral>c.waveWidth/2+.6||height<-2||height>c.waveHeight+1)continue;
   w.hit.add(unit);ctx.onHit?.(unit,point,w);}
 }
 write(){const F=RONIN_WAVE_FX,c=this.config;let n=0;
  for(const w of this.waves){const fade=Math.min(1,w.age/F.fadeIn)*(w.dying>=0?Math.max(0,1-w.dying/F.fadeOut):1),p=this.point(w);
   dummy.position.copy(p);dummy.quaternion.setFromUnitVectors(FORWARD,w.dir);dummy.scale.set(c.waveWidth,c.waveHeight*(w.dying>=0?1+w.dying*.6:1),F.bow);dummy.updateMatrix();this.blades.setMatrixAt(n,dummy.matrix);
   dummy.position.y+=.08;dummy.scale.set(c.waveWidth*.75,1,Math.max(.01,Math.min(w.s,F.trail)));dummy.updateMatrix();this.trails.setMatrixAt(n,dummy.matrix);
   for(const mesh of[this.blades,this.trails]){mesh.geometry.attributes.aFade.setX(n,fade);mesh.geometry.attributes.aSeed.setX(n,w.seed);}n++;}
  for(const mesh of[this.blades,this.trails]){mesh.count=n;mesh.visible=n>0;mesh.instanceMatrix.needsUpdate=true;for(const key of['aFade','aSeed'])mesh.geometry.attributes[key].needsUpdate=true;}
  let m=0;for(const lane of this.lanes.slice(0,F.lanes)){dummy.position.copy(lane.origin);dummy.position.y+=.06;dummy.quaternion.setFromUnitVectors(FORWARD,lane.dir);dummy.scale.set(c.waveWidth,1,lane.length);dummy.updateMatrix();this.laneMesh.setMatrixAt(m,dummy.matrix);
   const g=this.laneMesh.geometry.attributes;g.aFade.setX(m,lane.opacity??1);g.aSeed.setX(m,lane.locked?1:0);g.aLen.setX(m,lane.length);m++;}
  this.laneMesh.count=m;this.laneMesh.visible=m>0;this.laneMesh.instanceMatrix.needsUpdate=true;for(const key of['aFade','aSeed','aLen'])this.laneMesh.geometry.attributes[key].needsUpdate=true;
 }
 diagnostics(){return{waves:this.waves.length,active:this.active,lanes:this.lanes.length};}
}
