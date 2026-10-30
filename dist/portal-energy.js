import * as THREE from './vendor/three.module.js';
const PARTICLES=48;
// Shared geometry; only the three attack portals allocate a core and particle draw.
export class PortalEnergy {
 constructor(){
  this.geometry=new THREE.CircleGeometry(.94,40);this.particleGeometry=new THREE.IcosahedronGeometry(1,0);this.dummy=new THREE.Object3D();
  this.particleMaterial=new THREE.MeshBasicMaterial({color:'#dcffad',transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  this.material=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{time:{value:0},pulse:{value:0}},vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 p;uniform float time;uniform float pulse;void main(){float r=length(p),a=atan(p.y,p.x);float spiral=pow(.5+.5*sin(a*5.0+r*20.0-time*6.0),5.0);float mist=(.55+.45*sin(a*3.0-r*13.0+time*3.0));float center=exp(-r*r*22.0);float stream=spiral*exp(-r*r*3.0);float ripple=pow(.5+.5*sin(r*35.0-time*14.0),7.0)*exp(-r*4.0)*pulse;float fade=1.0-smoothstep(.62,.94,r);vec3 color=vec3(.06,.70,.38)*(.16+stream*.8+mist*.12)+vec3(.88,1.0,.48)*center*(1.5+pulse*2.5)+vec3(1.0,.68,.18)*ripple;gl_FragColor=vec4(color,fade*(.35+center*.65+stream*.4));}`});
 }
 create(parent){const group=new THREE.Group();group.name='Dimensional energy source';group.position.z=.055;parent.add(group);const material=this.material.clone(),core=new THREE.Mesh(this.geometry,material),particles=new THREE.InstancedMesh(this.particleGeometry,this.particleMaterial,PARTICLES);particles.frustumCulled=false;group.add(core,particles);return{group,material,particles,pulse:0,bursts:0};}
 burst(effect){effect.pulse=1;effect.bursts++;}
 update(effect,dt,age){effect.pulse=Math.max(0,effect.pulse-dt*5);effect.material.uniforms.time.value=age;effect.material.uniforms.pulse.value=effect.pulse;
  for(let i=0;i<PARTICLES;i++){const t=(age*(.7+(i%5)*.06)+i/PARTICLES)%1,a=i*2.399+age*2.8+t*5,r=.78*(1-t)**1.4,z=.02+.11*t*t;this.dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z);this.dummy.rotation.set(age+i,age*2+i,0);this.dummy.scale.setScalar((.018+.035*t)*(.7+.3*Math.sin(age*17+i)**2)*(1+effect.pulse*.8));this.dummy.updateMatrix();effect.particles.setMatrixAt(i,this.dummy.matrix);}
  effect.particles.count=PARTICLES;effect.particles.instanceMatrix.needsUpdate=true;
 }
 remove(effect){effect.group.removeFromParent();effect.particles.dispose();effect.material.dispose();}
}
