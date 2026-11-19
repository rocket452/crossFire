import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

export function buildCyberMissileModel(){
 const root=new THREE.Group();
 root.name='Cyberpunk Siege Walker missile';
 const hull=new THREE.MeshStandardMaterial({color:'#19283c',metalness:.36,roughness:.48});
 const plates=new THREE.MeshStandardMaterial({color:'#acbfd4',metalness:.28,roughness:.42});
 const neon=new THREE.MeshBasicMaterial({vertexColors:true});
 const skin=[],armor=[],lights=[];
 const profile=(target,points)=>target.push(
  new THREE.LatheGeometry(points.map(([r,z])=>new THREE.Vector2(r,z)),8).rotateX(Math.PI/2)
 );
 const panel=(target,width,depth,length,radius,z,angle)=>{
  const geometry=new THREE.BoxGeometry(width,depth,length).translate(0,radius,z).rotateZ(angle);
  target.push(geometry);
  return geometry;
 };
 const tint=(geometry,value)=>{
  const color=new THREE.Color(value).multiplyScalar(2.4);
  const rgb=new Float32Array(geometry.attributes.position.count*3);
  for(let i=0;i<rgb.length;i+=3)color.toArray(rgb,i);
  geometry.setAttribute('color',new THREE.BufferAttribute(rgb,3));
 };
 profile(skin,[[0,-.86],[.19,-.86],[.28,-.58],[.27,.67],[.22,.96],[.08,1.24],[0,1.27]]);
 profile(armor,[[.268,.55],[.285,.58],[.285,.69],[.255,.75]]);
 profile(lights,[[.254,.78],[.27,.81],[.247,.89],[.239,.90]]);
 tint(lights[0],'#ff378e');
 profile(lights,[[.195,-.87],[.234,-.83],[.237,-.77],[.224,-.75]]);
 tint(lights[1],'#3decff');
 for(let i=0;i<4;i++){
  const angle=i*Math.PI/2;
  const fin=new THREE.ExtrudeGeometry(new THREE.Shape()
   .moveTo(0,.21).lineTo(.41,.21).lineTo(.32,.53).lineTo(.08,.53).lineTo(0,.21),
   {depth:.09,bevelEnabled:false});
  fin.translate(-.8,0,-.045).rotateY(-Math.PI/2).rotateZ(angle);
  // ExtrudeGeometry is non-indexed, while the rings and panels are indexed.
  skin.push(fin);
  panel(armor,.19,.04,.58,.264,.07,angle);
  tint(panel(lights,.07,.027,.37,.292,.07,angle),'#48deff');
 }
 for(const [parts,material]of [[skin,hull],[armor,plates],[lights,neon]]){
  const triangles=parts.map(g=>g.index?g.toNonIndexed():g);
  const mesh=new THREE.Mesh(mergeGeometries(triangles),material);
  root.add(mesh);
  for(const geometry of new Set([...parts,...triangles]))geometry.dispose();
 }
 return root;
}
