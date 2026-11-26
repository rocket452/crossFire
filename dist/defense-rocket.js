import * as THREE from './vendor/three.module.js';

export const EVAC_ROCKET=Object.freeze({height:39,health:3200,ignition:4.2,launchSeconds:12.6});

// Vertically launched rescue shuttle with a static launch pad and independently animated ship.
export class DefenseRocket {
 constructor(scene,site){
  this.root=new THREE.Group();
  this.root.name='Evacuation rocket';
  this.root.position.set(site.x,0,site.z);
  const pad=new THREE.Group();
  pad.name='Evacuation launch pad';
  pad.position.copy(this.root.position);
  scene.add(pad,this.root);
  const shell=new THREE.MeshStandardMaterial({color:'#c5dbec',metalness:.48,roughness:.3,emissive:'#000000'});
  const dark=new THREE.MeshStandardMaterial({color:'#192437',metalness:.65,roughness:.45});
  const stripe=new THREE.MeshStandardMaterial({color:'#30244d',metalness:.55,roughness:.35});
  const titanium=new THREE.MeshStandardMaterial({color:'#7e9cb8',metalness:.65,roughness:.32});
  this.shell=shell;this.flashColor=new THREE.Color('#ff2424');
  this.neon=new THREE.MeshBasicMaterial({color:new THREE.Color('#ff54aa').multiplyScalar(2),toneMapped:false});
  const glass=new THREE.MeshBasicMaterial({color:new THREE.Color('#80e6ff').multiplyScalar(1.8),toneMapped:false});
  const add=(parent,geometry,material,y)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.y=y;parent.add(mesh);return mesh;};
  const tube=(top,bottom,height,material,y,parent=this.root)=>add(parent,new THREE.CylinderGeometry(top,bottom,height,12),material,y);
  tube(10,11,.6,dark,.3,pad);
  tube(7.5,8,.45,stripe,.75,pad);
  const ring=add(pad,new THREE.TorusGeometry(10.6,.13,6,40),this.neon,.45);
  ring.rotation.x=-Math.PI/2;
  const hull=tube(4,4.6,25,shell,16);
  hull.castShadow=true;
  tube(0,4,10,shell,33.5).castShadow=true;
  tube(4.55,4.6,1.25,stripe,5.3);
  tube(4.27,4.37,1.6,stripe,16);
  tube(4.17,4.22,.22,this.neon,26.3);
  tube(3.9,4.3,1.45,titanium,28.2);
  tube(.8,1.62,2.2,dark,35.6);
  tube(.34,.63,1.6,glass,37.7);
  tube(2.65,3.75,4.2,dark,2.6);
  for(const side of [-1,1]){
   const window=add(this.root,new THREE.BoxGeometry(1.9,3.1,.5),glass,27);
   window.position.z=side*3.65;
   const badge=add(this.root,new THREE.BoxGeometry(.32,9,.16),this.neon,15.6);
   badge.position.z=side*4.37;
  }
  for(let i=0;i<4;i++){
   const a=i*Math.PI/2,fin=new THREE.Group();
   fin.rotation.y=a;this.root.add(fin);
   const finShape=new THREE.Shape().moveTo(3.5,3).lineTo(8.1,2.1).lineTo(7.4,5.4)
    .lineTo(5.25,8.4).lineTo(3.85,15.8).closePath();
   const wing=add(fin,new THREE.ExtrudeGeometry(finShape,{depth:.74,bevelEnabled:true,bevelThickness:.14,bevelSize:.14,bevelSegments:1}),titanium,0);
   wing.position.z=-.37;
   wing.castShadow=true;
   const spine=add(fin,new THREE.BoxGeometry(.23,11,.2),glass,9.6);
   spine.position.set(4.5,9.6,.54);spine.rotation.z=.19;
   const booster=new THREE.Group();
   booster.position.x=5.3;fin.add(booster);
   tube(0,1.1,4,titanium,10.4,booster);
   tube(1.1,1.35,6.4,stripe,5.2,booster);
   tube(.96,1.04,1,dark,1.5,booster);
   tube(1.27,1.31,.24,this.neon,3.1,booster);
   tube(.86,.86,.16,glass,1.03,booster);
   const runway=add(pad,new THREE.BoxGeometry(.24,.05,2.6),glass,.66);
   runway.position.set(Math.sin(a)*9.9,.66,Math.cos(a)*9.9);runway.rotation.y=a;
  }
  this.padExhaust=new THREE.Group();
  this.padExhaust.name='Evacuation rocket ignition wash';
  pad.add(this.padExhaust);
  const washMaterial=color=>new THREE.MeshBasicMaterial({
   color,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false
  });
  this.pressureRings=Array.from({length:3},(_,index)=>{
   const ring=add(this.padExhaust,new THREE.RingGeometry(.96,1,48),washMaterial(index===0?'#fff1af':'#fb75c4'),1.04+index*.025);
   ring.rotation.x=-Math.PI/2;return ring;
  });
  this.engineLight=new THREE.PointLight('#ff8fab',0,30,1.5);
  this.engineLight.position.y=2;
  this.padExhaust.add(this.engineLight);
  const dustMaterial=new THREE.MeshBasicMaterial({
   color:'#c48ba6',transparent:true,depthWrite:false,opacity:.42
  });
  this.exhaustDust=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),dustMaterial,64);
  this.exhaustDust.frustumCulled=false;
  this.padExhaust.add(this.exhaustDust);
  this.exhaustParticle=new THREE.Object3D();
  this.plume=new THREE.Group();
  this.root.add(this.plume);
  const exhaust=new THREE.MeshBasicMaterial({color:'#ff4faa',blending:THREE.AdditiveBlending,transparent:true,opacity:.58,depthWrite:false,toneMapped:false});
  add(this.plume,new THREE.ConeGeometry(3.3,15,12),exhaust,-7.5).rotation.z=Math.PI;
  const hotCore=washMaterial('#aeefff');
  hotCore.opacity=.92;
  add(this.plume,new THREE.ConeGeometry(1.95,10,10),hotCore,-5).rotation.z=Math.PI;
  for(let i=0;i<4;i++){
   const a=i*Math.PI/2,flare=add(this.plume,new THREE.ConeGeometry(.82,7.5,8),exhaust,-2.8);
   flare.position.x=Math.cos(a)*5.3;
   flare.position.z=Math.sin(a)*5.3;
   flare.rotation.z=Math.PI;
  }
  this.exhaustMaterial=exhaust;
  this.shapes=[[5,5,4.6],[19,9,4.25],[31,5,3.2]].map(([y,h,r])=>({
   center:new THREE.Vector3(site.x,y,site.z),localY:y,half:{x:r,y:h,z:r}
  }));
  this.reset();
 }
 reset(){this.root.visible=true;this.root.position.y=0;this.plume.visible=false;this.padExhaust.visible=false;this.exhaustDust.count=0;this.engineLight.intensity=0;
  for(const shape of this.shapes)shape.center.y=shape.localY;
  this.pose(0);}
 pose(flash){
  this.neon.color.set('#ff54aa').lerp(this.flashColor,flash).multiplyScalar(2+flash);
  this.shell.emissive.set('#ff2424');this.shell.emissiveIntensity=1.7*flash;
 }
 climb(elapsed){
  const {ignition,launchSeconds}=EVAC_ROCKET;
  const flight=THREE.MathUtils.clamp((elapsed-ignition)/(launchSeconds-ignition),0,1);
  const power=THREE.MathUtils.smoothstep(elapsed,0,ignition*.82);
  const wash=power*(1-THREE.MathUtils.smoothstep(flight,.18,.56));
  this.root.position.y=flight**2.25*170;
  this.plume.visible=true;
  this.plume.position.y=.58;
  const exhaustWidth=.5+.5*power;
  this.plume.scale.set(exhaustWidth*(1+Math.sin(elapsed*39)*.10),
   Math.min(.025+power*.67+flight*1.4,(this.root.position.y+.57)/15),
   exhaustWidth*(1+Math.cos(elapsed*36)*.09));
  this.exhaustMaterial.opacity=.3+.5*power;
  this.padExhaust.visible=wash>0;
  this.engineLight.intensity=wash*(105+Math.sin(elapsed*37)*24);
  for(const [i,ring] of this.pressureRings.entries()){
   const age=(elapsed*.72+i/this.pressureRings.length)%1;
   ring.scale.setScalar(2+age*25);
   ring.material.opacity=wash*(1-age)**1.4*(i===0?.82:.56);
  }
  const dust=this.exhaustParticle;
  this.exhaustDust.count=this.padExhaust.visible?this.exhaustDust.instanceMatrix.count:0;
  this.exhaustDust.material.opacity=wash*.44;
  for(let i=0;i<this.exhaustDust.count;i++){
   const age=(elapsed*(.4+(i%5)*.03)+i*.61803399)%1,angle=i*2.399963;
   const distance=3+age*(16+i%7)*(.55+power*.45);
   dust.position.set(Math.cos(angle)*distance,.96+Math.sin(Math.PI*age)*(1.1+i%4*.35),Math.sin(angle)*distance);
   const size=(.3+age*2.4)*(1-age**4);
   dust.scale.set(size*1.45,size*.60,size*1.45);
   dust.rotation.y=angle+age;
   dust.updateMatrix();
   this.exhaustDust.setMatrixAt(i,dust.matrix);
  }
  this.exhaustDust.instanceMatrix.needsUpdate=true;
  for(const shape of this.shapes)shape.center.y=this.root.position.y+shape.localY;
 }
}
