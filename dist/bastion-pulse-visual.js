import * as THREE from './vendor/three.module.js';

// Cosmetic spherical shock front. Existing ground/body bands still own damage and the safe gap.
export class BastionPulseVisual {
 constructor(boss,parent){
  this.boss=boss;this.parent=parent;this.config=boss.config.pulse.visual;this.waves=new Map();
  const c=this.config,p=boss.config.pulse;this.sphere=new THREE.SphereGeometry(1,c.segments,c.rows);this.arcs=[];
  for(const latitude of[0,Math.PI/6,Math.PI/3]){const points=[];for(let i=0;i<=c.segments*2;i++){const angle=p.gapHalfAngle+i/(c.segments*2)*(Math.PI*2-p.gapHalfAngle*2);points.push(new THREE.Vector3(Math.sin(angle)*Math.cos(latitude),Math.sin(latitude),Math.cos(angle)*Math.cos(latitude)));}this.arcs.push(new THREE.BufferGeometry().setFromPoints(points));}
  this.edges=[-1,1].map(sign=>{const points=[];for(let i=0;i<=c.rows;i++){const latitude=i/c.rows*Math.PI/2;points.push(new THREE.Vector3(Math.sin(sign*p.gapHalfAngle)*Math.cos(latitude),Math.sin(latitude),Math.cos(sign*p.gapHalfAngle)*Math.cos(latitude)));}return new THREE.BufferGeometry().setFromPoints(points);});
 }
 create(w){const c=this.config,root=new THREE.Group(),material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:c.opacity},uGap:{value:this.boss.config.pulse.gapHalfAngle},uColor:{value:new THREE.Color(c.color)},uHot:{value:new THREE.Color(c.edgeColor)}},vertexShader:`varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
 void main(){vLocal=position;vec4 world=modelMatrix*vec4(position,1.0);vNormal=normalize(mat3(modelMatrix)*normal);vView=cameraPosition-world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
 fragmentShader:`uniform float uTime; uniform float uOpacity; uniform float uGap;uniform vec3 uColor;uniform vec3 uHot;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vView;
 void main(){if(vLocal.y<0.0)discard;float heading=atan(vLocal.x,vLocal.z);if(abs(heading)<uGap)discard;
 float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),2.5);
 float latitude=acos(clamp(vLocal.y,-1.0,1.0));float bands=pow(0.5+0.5*sin(latitude*42.0-uTime*4.0),22.0);
 float ribs=pow(0.5+0.5*sin(heading*12.0+uTime*2.0),28.0);
 float flicker=0.92+0.08*sin(uTime*27.0+vLocal.y*31.0);float energy=clamp(rim+bands*0.55+ribs*0.35,0.0,1.0);
 vec3 color=mix(uColor,uHot,energy);float alpha=(0.075+rim*0.52+bands*0.2+ribs*0.1)*uOpacity*flicker;
 gl_FragColor=vec4(color,alpha);}`,
 transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
  const skin=new THREE.Mesh(this.sphere,material);skin.frustumCulled=false;root.add(skin);
  const rimMaterial=new THREE.LineBasicMaterial({color:c.edgeColor,transparent:true,opacity:c.lineOpacity,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),gapMaterial=new THREE.LineBasicMaterial({color:c.gapColor,transparent:true,opacity:.9,depthWrite:false,toneMapped:false});
  for(const geometry of this.arcs)root.add(new THREE.Line(geometry,rimMaterial));for(const geometry of this.edges)root.add(new THREE.Line(geometry,gapMaterial));this.parent.add(root);const entry={root,skin,material,rimMaterial,gapMaterial,radius:0};this.waves.set(w.id,entry);return entry;
 }
 remove(id){const effect=this.waves.get(id);if(!effect)return;this.parent.remove(effect.root);effect.material.dispose();effect.rimMaterial.dispose();effect.gapMaterial.dispose();this.waves.delete(id);}
 reset(){for(const id of [...this.waves.keys()])this.remove(id);}
 update(time){const b=this.boss,p=b.config.pulse,c=this.config,active=new Set();for(const w of b.waves){active.add(w.id);const effect=this.waves.get(w.id)||this.create(w),duration=Math.max(p.maxRadius/p.groundSpeed,b.config.body.height/p.surfaceSpeed)+p.linger+p.groundWidth/p.groundSpeed,fade=THREE.MathUtils.clamp((duration-w.age)/c.fadeSeconds,0,1),radius=Math.min(p.maxRadius,Math.max(.05,w.age*p.surfaceSpeed));effect.radius=radius;effect.root.position.copy(b.root.position);effect.root.rotation.y=w.angle+b.root.rotation.y;effect.root.scale.setScalar(radius);effect.material.uniforms.uTime.value=time;effect.material.uniforms.uOpacity.value=c.opacity*fade;effect.rimMaterial.opacity=c.lineOpacity*fade;effect.gapMaterial.opacity=.9*fade;}
  for(const id of [...this.waves.keys()])if(!active.has(id))this.remove(id);
 }
 diagnostics(){return{active:this.waves.size,shells:[...this.waves.values()].map(w=>({radius:w.radius,opacity:w.material.uniforms.uOpacity.value,gap:this.boss.config.pulse.gapHalfAngle}))};}
}
