import * as THREE from './vendor/three.module.js';

// Shared low-poly undercarriage for the small raider. The upper body/combat anchor stays unchanged.
const RADIUS=.60,HALF_RUN=.93,HALF_WIDTH=.33,HALF_GAUGE=1.02,CENTRE_Y=.68,SHOES=24;
const LOOP=4*HALF_RUN+2*Math.PI*RADIUS;
function beltGeometry(){
 const vertices=[],indices=[],contour=[];
 for(let end=0;end<2;end++)for(let i=0;i<=8;i++){
  const a=i*Math.PI/8,sign=end?-1:1;contour.push({y:sign*Math.cos(a),z:sign*Math.sin(a),centre:sign*HALF_RUN});
 }
 for(const p of contour)for(const radius of[RADIUS,RADIUS-.17])for(const x of[-HALF_WIDTH,HALF_WIDTH])vertices.push(x,p.y*radius,p.centre+p.z*radius);
 for(let i=0;i<contour.length;i++){
  const a=i*4,b=((i+1)%contour.length)*4;
  for(const [u,v,w,x]of[[a,a+1,b+1,b],[a+3,a+2,b+2,b+3],[a+2,a,b,b+2],[a+1,a+3,b+3,b+1]])indices.push(u,w,v,u,x,w);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function onLoop(distance){
 let s=((distance%LOOP)+LOOP)%LOOP;
 if(s<2*HALF_RUN)return{y:RADIUS,z:-HALF_RUN+s,angle:0};s-=2*HALF_RUN;
 if(s<Math.PI*RADIUS){const a=s/RADIUS;return{y:RADIUS*Math.cos(a),z:HALF_RUN+RADIUS*Math.sin(a),angle:a};}s-=Math.PI*RADIUS;
 if(s<2*HALF_RUN)return{y:-RADIUS,z:HALF_RUN-s,angle:Math.PI};s-=2*HALF_RUN;
 const a=s/RADIUS;return{y:-RADIUS*Math.cos(a),z:-HALF_RUN-RADIUS*Math.sin(a),angle:Math.PI+a};
}
export class DroneTracks {
 constructor(parent,{armor,dark}){
  this.root=new THREE.Group();this.root.name='Tank tread undercarriage';parent.add(this.root);this.travel=[0,0];this.distance=0;
  const rubber=new THREE.MeshStandardMaterial({color:'#151c24',roughness:.96,metalness:.1,flatShading:true}),steel=new THREE.MeshStandardMaterial({color:'#515c68',metalness:.5,roughness:.7,flatShading:true});
  const make=(name,geometry,material,count)=>{const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;this.root.add(mesh);return mesh;};
  this.belts=make('Continuous rubber track belts',beltGeometry(),rubber,2);
  this.shoes=make('Moving armored tread plates',new THREE.BoxGeometry(1,1,1),steel,2*SHOES);
  const wheel=new THREE.CylinderGeometry(1,1,1,8,1);
  this.wheels=make('Eight road wheels',wheel,dark,8);this.hubs=make('Road wheel hubs',wheel,armor,8);
  const box=new THREE.BoxGeometry(1,1,1);
  for(const [name,p,s,mat]of[['Armored chassis',[0,1.15,0],[1.7,.6,2.05],armor],['Waist mount',[0,1.82,0],[1.1,.8,.95],dark],['Front bumper',[0,.97,1.05],[1.65,.26,.28],dark]]){
   const mesh=new THREE.Mesh(box,mat);mesh.name=name;mesh.position.set(...p);mesh.scale.set(...s);mesh.castShadow=mesh.receiveShadow=true;this.root.add(mesh);
  }
  this.dummy=new THREE.Object3D();this.wheelAxis=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);this.rollAxis=new THREE.Vector3(1,0,0);this.reset();
 }
 reset(){this.travel[0]=this.travel[1]=this.distance=0;this.moving=false;this.draw();}
 update(distance,turn){
  // Actual translation and differential turning drive the belts; idle/stun/death cannot treadmill.
  this.moving=Math.abs(distance)+Math.abs(turn)>.00001;this.distance+=Math.abs(distance);
  for(let side=0;side<2;side++)this.travel[side]=(this.travel[side]+distance+(side?-1:1)*turn*HALF_GAUGE)%LOOP;
  if(this.moving)this.draw();
 }
 draw(){
  const d=this.dummy;
  for(let side=0;side<2;side++){
   const sign=side?1:-1,x=sign*HALF_GAUGE,phase=this.travel[side];
   d.position.set(x,CENTRE_Y,0);d.rotation.set(0,0,0);d.scale.set(1,1,1);d.updateMatrix();this.belts.setMatrixAt(side,d.matrix);
   for(let shoe=0;shoe<SHOES;shoe++){
    const p=onLoop(shoe*LOOP/SHOES+phase);d.position.set(x,CENTRE_Y+p.y,p.z);d.rotation.set(p.angle,0,0);d.scale.set(.76,.10,LOOP/SHOES*.82);d.updateMatrix();this.shoes.setMatrixAt(side*SHOES+shoe,d.matrix);
   }
   for(let wheel=0;wheel<4;wheel++){
    d.position.set(x,CENTRE_Y,-HALF_RUN+wheel*(2*HALF_RUN/3));d.quaternion.setFromAxisAngle(this.rollAxis,phase/.42).multiply(this.wheelAxis);d.scale.set(.42,.59,.42);d.updateMatrix();this.wheels.setMatrixAt(side*4+wheel,d.matrix);
    d.position.x=x+sign*.32;d.scale.set(.18,.055,.18);d.updateMatrix();this.hubs.setMatrixAt(side*4+wheel,d.matrix);
   }
  }
  for(const mesh of[this.belts,this.shoes,this.wheels,this.hubs])mesh.instanceMatrix.needsUpdate=true;
 }
 diagnostics(){return{type:'tank-treads',tracks:2,shoes:2*SHOES,wheels:8,moving:this.moving,distance:this.distance,travel:[...this.travel]};}
}
