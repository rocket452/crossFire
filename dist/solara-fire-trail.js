import * as THREE from './vendor/three.module.js';
export const FIRE_TRAIL=Object.freeze({spacing:.24,flames:384,embers:128});
const UP=new THREE.Vector3(0,1,0),FORWARD=new THREE.Vector3(0,0,1);
export class SolaraFireTrail {
 constructor(parent){
  this.root=new THREE.Group();this.root.name='Solara fireball flame trails';parent.add(this.root);this.dummy=new THREE.Object3D();this.hot=new THREE.Color('#ffb52e');this.orange=new THREE.Color('#ff6410');this.red=new THREE.Color('#c91d02');this.color=new THREE.Color();
  const pool=(limit)=>{const geometry=new THREE.IcosahedronGeometry(1,0);geometry.setAttribute('flameFade',new THREE.InstancedBufferAttribute(new Float32Array(limit),1));const material=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.48,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});material.onBeforeCompile=shader=>{shader.vertexShader='attribute float flameFade;varying float vFlameFade;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vFlameFade=flameFade;');shader.fragmentShader='varying float vFlameFade;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.a*=vFlameFade;');};material.customProgramCacheKey=()=> 'solara-fire-trail-v1';const mesh=new THREE.InstancedMesh(geometry,material,limit);mesh.frustumCulled=false;mesh.count=0;this.root.add(mesh);return mesh;};
  this.flames=pool(FIRE_TRAIL.flames);this.embers=pool(FIRE_TRAIL.embers);this.reset();
 }
 reset(){this.puffs=[];this.sparks=[];this.sequence=0;this.emitted=0;this.flames.count=this.embers.count=0;}
 random(){const x=Math.sin(++this.sequence*12.9898)*43758.5453;return x-Math.floor(x);}
 advance(p,dt){p.age+=dt;p.position.addScaledVector(p.velocity,dt);p.velocity.y+=dt*(p.ember?-1.2:1.7);}
 update(dt){for(const list of[this.puffs,this.sparks])for(let i=list.length-1;i>=0;i--){this.advance(list[i],dt);if(list[i].age>=list[i].life)list.splice(i,1);}}
 emitSegment(shot,from,to,direction,dt){
  const delta=to.clone().sub(from),distance=delta.length();if(distance<1e-6)return;const axis=direction.clone().normalize(),side=new THREE.Vector3().crossVectors(axis,Math.abs(axis.y)>.95?new THREE.Vector3(1,0,0):UP).normalize(),up=new THREE.Vector3().crossVectors(side,axis).normalize();let sample=FIRE_TRAIL.spacing-(shot.flameDistance||0);
  for(;sample<=distance+1e-8;sample+=FIRE_TRAIL.spacing){const t=Math.min(1,sample/distance),position=from.clone().lerp(to,t),angle=this.random()*Math.PI*2,spread=.3+this.random()*.8,velocity=side.clone().multiplyScalar(Math.cos(angle)*spread).addScaledVector(up,Math.sin(angle)*spread).addScaledVector(axis,-.8-this.random()*1.2);velocity.y+=.9;
   const p={position,velocity,direction:axis.clone(),age:0,life:.36+this.random()*.20,size:.20+this.random()*.13,seed:this.random()*20};this.advance(p,(1-t)*dt);if(this.puffs.length>=FIRE_TRAIL.flames)this.puffs.shift();this.puffs.push(p);this.emitted++;
   if(this.emitted%3===0){const spark={position:position.clone(),velocity:velocity.clone().multiplyScalar(2.4).addScaledVector(axis,-1.8),direction:axis.clone(),age:0,life:.55+this.random()*.35,size:.025+this.random()*.035,seed:p.seed,ember:true};if(this.sparks.length>=FIRE_TRAIL.embers)this.sparks.shift();this.sparks.push(spark);}
  }
  shot.flameDistance=((shot.flameDistance||0)+distance)%FIRE_TRAIL.spacing;
 }
 render(time){
  for(const[list,mesh]of[[this.puffs,this.flames],[this.sparks,this.embers]]){let n=0;const fade=mesh.geometry.getAttribute('flameFade');for(const p of list){const age=Math.min(1,p.age/p.life),pulse=1+.12*Math.sin(time*39+p.seed),size=p.size*(p.ember?1-age:.55+.8*Math.sin(Math.PI*age))*(1-age*.75);this.dummy.position.copy(p.position);this.dummy.quaternion.setFromUnitVectors(FORWARD,p.direction);this.dummy.scale.set(size*pulse,size*pulse,size*(p.ember?1.9:2.9));this.dummy.updateMatrix();mesh.setMatrixAt(n,this.dummy.matrix);this.color.copy(this.hot).lerp(this.orange,Math.min(1,age*2.4));if(age>.4)this.color.lerp(this.red,(age-.4)/.6);mesh.setColorAt(n,this.color);fade.setX(n++,Math.pow(1-age,1.3));}mesh.count=n;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;fade.needsUpdate=true;}
 }
 diagnostics(){return{flames:this.puffs.length,embers:this.sparks.length,emitted:this.emitted,flameLimit:FIRE_TRAIL.flames,emberLimit:FIRE_TRAIL.embers,spacing:FIRE_TRAIL.spacing,drawCalls:2};}
}
