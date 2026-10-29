import * as THREE from './vendor/three.module.js';
const WIDTH=1.85,THICKNESS=.22;
// Shared cross-sections keep the history, turn and live slide joined edge-to-edge.
export class SolaraIcePath {
 constructor(material,edgeMaterial,maxHistory=192){
  this.capacity=maxHistory+3;this.rows=[];this.direction=new THREE.Vector3(0,0,1);this.ready=false;
  const geometry=new THREE.BufferGeometry(),edgeGeometry=new THREE.BufferGeometry(),vertices=(this.capacity+1)*4;
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices*3),3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(vertices*3),3));edgeGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices*3),3).setUsage(THREE.DynamicDrawUsage));
  const indices=[],edges=[];for(let i=0;i<this.capacity;i++){const a=i*4,b=a+4;indices.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);edges.push(a,b,a+1,a+1,b,b+1,a+2,b+2,a+3,a+3,b+2,b+3);}
  this.baseIndices=new Uint16Array(indices);indices.push(...Array(12).fill(0));geometry.setIndex(indices);edgeGeometry.setIndex(edges);this.mesh=new THREE.Mesh(geometry,material);this.edges=new THREE.Mesh(edgeGeometry,edgeMaterial);for(const m of[this.mesh,this.edges]){m.frustumCulled=false;m.count=0;m.geometry.setDrawRange(0,0);}this.mesh.name='Solara connected ice ribbon';this.edges.name='Solara continuous ice edges';this.reset();
 }
 reset(){this.ready=false;this.rows=[];this.mesh.count=this.edges.count=0;this.mesh.geometry.setDrawRange(0,0);this.edges.geometry.setDrawRange(0,0);this.length=0;}
 update(path,foot,velocity,yaw,dt){
  const points=[];for(const p of path){if(!points.length)points.push({position:p.a.clone(),fade:Math.min(1,p.life/.6)});points.push({position:p.b.clone(),fade:Math.min(1,p.life/.6)});}
  let desired=velocity.clone();const horizontal=Math.hypot(desired.x,desired.z);if(horizontal<.3){if(points.length>1)desired.copy(points.at(-1).position).sub(points.at(-2).position);else if(this.ready)desired.copy(this.direction);else desired.set(Math.sin(yaw),0,Math.cos(yaw));}
  const planar=Math.hypot(desired.x,desired.z)||1;desired.y=THREE.MathUtils.clamp(desired.y,-planar*.25,planar*.25);desired.normalize();if(!this.ready){this.direction.copy(desired);this.ready=true;}else if(dt>0)this.direction.lerp(desired,1-Math.exp(-12*dt)).normalize();if(this.direction.lengthSq()<.0001)this.direction.copy(desired);
  if(!points.length)points.push({position:foot.clone().addScaledVector(this.direction,-.8),fade:1});
  if(points.at(-1).position.distanceTo(foot)>.025)points.push({position:foot.clone(),fade:1});else{points.at(-1).position.copy(foot);points.at(-1).fade=1;}
  // Bend the front of the slide toward travel while preserving the incoming tangent.
  const incoming=points.length>1?foot.clone().sub(points.at(-2).position).normalize():this.direction.clone();if(incoming.lengthSq()<.001)incoming.copy(this.direction);
  points.push({position:foot.clone().addScaledVector(incoming,.65).addScaledVector(this.direction,.95),fade:1},{position:foot.clone().addScaledVector(this.direction,3.2),fade:1});
  if(points.length>this.capacity+1)points.splice(0,points.length-this.capacity-1);
  this.rows=[];this.length=0;const position=this.mesh.geometry.getAttribute('position'),normal=this.mesh.geometry.getAttribute('normal'),edge=this.edges.geometry.getAttribute('position');
  const side=d=>new THREE.Vector3(d.z,0,-d.x).normalize();
  for(let i=0;i<points.length;i++){
   const p=points[i],before=i?side(p.position.clone().sub(points[i-1].position)):side(points[1].position.clone().sub(p.position)),after=i<points.length-1?side(points[i+1].position.clone().sub(p.position)):before.clone(),miter=before.clone().add(after);if(miter.lengthSq()<.0001)miter.copy(after);miter.normalize();
   const half=Math.min(WIDTH*.9,WIDTH*.5/Math.max(.5,Math.abs(miter.dot(after)))),left=p.position.clone().addScaledVector(miter,-half),right=p.position.clone().addScaledVector(miter,half),height=THICKNESS*.5*p.fade;
   if(i)this.length+=p.position.distanceTo(points[i-1].position);this.rows.push({center:p.position.clone(),left:left.clone(),right:right.clone(),halfWidth:half});
   for(let j=0;j<4;j++){const point=(j%2?right:left).clone();point.y+=j<2?height:-height;position.setXYZ(i*4+j,point.x,point.y,point.z);normal.setXYZ(i*4+j,0,j<2?1:-1,0);}
   // Two thin, continuous top strips rather than overlapping edge boxes.
   for(let j=0;j<4;j++){const point=j<2?left.clone():right.clone();if(j===1)point.addScaledVector(miter,.035);if(j===2)point.addScaledVector(miter,-.035);point.y+=height+.006;edge.setXYZ(i*4+j,point.x,point.y,point.z);}
  }
  const count=points.length-1;this.mesh.count=count;this.edges.count=count*2;const index=this.mesh.geometry.index;index.array.set(this.baseIndices.subarray(0,count*24));const end=count*4;index.array.set([0,1,2,1,3,2,end,end+2,end+1,end+1,end+2,end+3],count*24);index.needsUpdate=true;this.mesh.geometry.setDrawRange(0,count*24+12);this.edges.geometry.setDrawRange(0,count*12);position.needsUpdate=normal.needsUpdate=edge.needsUpdate=true;
 }
 diagnostics(){return{segments:this.mesh.count,limit:this.capacity,length:this.length,direction:this.direction.toArray(),connected:true,drawCalls:2};}
}
