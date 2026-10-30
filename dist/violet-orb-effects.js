import * as THREE from './vendor/three.module.js';
export const VIOLET_ORB_FX=Object.freeze({spacing:.55,particles:160,impacts:6,impactDuration:.55});
const FORWARD=new THREE.Vector3(0,0,1);
// Small distance-spaced motes and pooled expanding shock rings. Three fixed draw calls.
export class VioletOrbEffects {
 constructor(parent){this.root=new THREE.Group();this.root.name='Violet orb trails and impacts';parent.add(this.root);this.dummy=new THREE.Object3D();this.color=new THREE.Color();
  const material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});
  this.motes=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),material('#ffffff',.52),VIOLET_ORB_FX.particles);
  this.rings=new THREE.InstancedMesh(new THREE.TorusGeometry(1,.035,4,32),material('#ffffff',.7),VIOLET_ORB_FX.impacts*2);
  this.flashes=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material('#f6ddff',.85),VIOLET_ORB_FX.impacts);
  for(const mesh of[this.motes,this.rings,this.flashes]){mesh.count=0;mesh.frustumCulled=false;this.root.add(mesh);}this.reset();
 }
 reset(){this.particles=[];this.hits=[];this.emitted=this.bursts=0;for(const mesh of[this.motes,this.rings,this.flashes])mesh.count=0;}
 update(dt){for(const list of[this.particles,this.hits])for(let i=list.length-1;i>=0;i--){list[i].age+=dt;if(list[i].age>=list[i].life)list.splice(i,1);}}
 trail(shot,from,to,dt){const distance=from.distanceTo(to);if(distance<1e-6)return;const direction=to.clone().sub(from).normalize(),spacing=VIOLET_ORB_FX.spacing;let sample=spacing-(shot.trailDistance||0);
  for(;sample<=distance+1e-8;sample+=spacing){const t=Math.min(1,sample/distance),seed=++this.emitted,position=from.clone().lerp(to,t).add(new THREE.Vector3(Math.sin(seed*2.4),Math.cos(seed*3.1),Math.sin(seed*1.7)).multiplyScalar(.10));if(this.particles.length>=VIOLET_ORB_FX.particles)this.particles.shift();this.particles.push({position,direction,age:(1-t)*dt,life:.22+(seed%5)*.016,size:.07+(seed%3)*.025});}
  shot.trailDistance=((shot.trailDistance||0)+distance)%spacing;
 }
 impact(position,direction){if(this.hits.length>=VIOLET_ORB_FX.impacts)this.hits.shift();this.hits.push({position:position.clone(),rotation:new THREE.Quaternion().setFromUnitVectors(FORWARD,direction.clone().normalize()),age:0,life:VIOLET_ORB_FX.impactDuration});this.bursts++;}
 render(time){let n=0;for(const p of this.particles){const fade=Math.max(0,1-p.age/p.life);this.dummy.position.copy(p.position);this.dummy.quaternion.setFromUnitVectors(FORWARD,p.direction);const size=p.size*fade;this.dummy.scale.set(size,size,size*2);this.dummy.updateMatrix();this.motes.setMatrixAt(n,this.dummy.matrix);this.color.set('#cc81ff').multiplyScalar(fade);this.motes.setColorAt(n++,this.color);}this.motes.count=n;
  let rings=0,flashes=0;for(const p of this.hits){const t=p.age/p.life,fade=1-t;this.dummy.position.copy(p.position);this.dummy.quaternion.copy(p.rotation);for(let j=0;j<2;j++){const radius=(.35+t*(j?1.4:2.3))*(j?.8:1);this.dummy.scale.set(radius,radius,fade);this.dummy.rotateZ((j?1:-1)*time*2);this.dummy.updateMatrix();this.rings.setMatrixAt(rings,this.dummy.matrix);this.color.set(j?'#ab46ff':'#e5baff').multiplyScalar(fade*fade);this.rings.setColorAt(rings++,this.color);}this.dummy.quaternion.identity();this.dummy.scale.setScalar((.2+Math.sin(Math.PI*Math.min(1,t*2))*.6)*fade);this.dummy.updateMatrix();this.flashes.setMatrixAt(flashes,this.dummy.matrix);this.color.set('#f4dfff').multiplyScalar(Math.max(0,1-t*2));this.flashes.setColorAt(flashes++,this.color);}
  this.rings.count=rings;this.flashes.count=flashes;for(const mesh of[this.motes,this.rings,this.flashes]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }
 diagnostics(){return{particles:this.particles.length,impacts:this.hits.length,emitted:this.emitted,bursts:this.bursts,limits:{...VIOLET_ORB_FX},drawCalls:3};}
}
