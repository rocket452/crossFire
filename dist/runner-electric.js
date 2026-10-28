import * as THREE from './vendor/three.module.js';
export class RunnerElectric {
 constructor(scene){
  this.root=new THREE.Group();scene.add(this.root);this.trails=[];this.previous=null;this.timer=0;this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);this.direction=new THREE.Vector3();
  const geometry=new THREE.CylinderGeometry(1,1,1,5,1,true),material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  this.core=new THREE.InstancedMesh(geometry,material('#e9ffff',.95),500);this.glow=new THREE.InstancedMesh(geometry,material('#27cfff',.25),500);for(const m of [this.core,this.glow]){m.frustumCulled=false;this.root.add(m);m.count=0;}
  this.flash=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),material('#a6f8ff',.9));this.impact=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),material('#70dbff',.75));this.root.add(this.flash,this.impact);this.light=new THREE.PointLight('#63e2ff',0,10,2);this.root.add(this.light);this.clear();
 }
 clear(){this.segmentCount=0;this.trails=[];this.previous=null;this.core.count=this.glow.count=0;this.flash.visible=this.impact.visible=false;this.light.intensity=0;this.timer=0;this.firing=false;}
 addArc(a,b,time,life=.23,width=.025,amplitude=.16){
  let previous=a.clone();for(let i=1;i<=8;i++){const t=i/8,p=a.clone().lerp(b,t);if(i<8){p.x+=Math.sin(i*3.7+time*22)*amplitude;p.y+=Math.cos(i*6.1+time*19)*amplitude;p.z+=Math.sin(i*4.3-time*17)*amplitude;}if(this.trails.length>=350)this.trails.shift();this.trails.push({a:previous,b:p,life,max:life,width});previous=p;}
 }
 update(dt,time,{position,normal,speed,beam=null}){
  this.timer-=dt;const foot=position.clone().addScaledVector(normal,.18);
  if(this.previous&&speed>18&&this.timer<=0){
   this.addArc(this.previous,foot,time,.16,.019,.16);this.addArc(this.previous.clone().addScaledVector(normal,.9),foot.clone().addScaledVector(normal,.8),time+3,.13,.015,.22);this.timer=.035;
   const a=position.clone().addScaledVector(normal,.25),b=position.clone().addScaledVector(normal,2.05);this.addArc(a,b,time+.6,.09,.012,.25);
  }this.previous=foot;
  for(let i=this.trails.length-1;i>=0;i--){this.trails[i].life-=dt;if(this.trails[i].life<=0)this.trails.splice(i,1);}
  const segments=this.trails.map(s=>({...s,fade:s.life/s.max}));
  this.firing=!!beam;
  if(beam){
   for(let branch=0;branch<3;branch++){let previous=beam.from.clone();for(let i=1;i<=24;i++){const t=i/24,p=beam.from.clone().lerp(beam.end,t);if(i<24){const amplitude=branch===0?.12:.30;p.x+=Math.sin(i*4.3+time*47+branch)*amplitude;p.y+=Math.cos(i*3.7-time*39+branch)*amplitude;p.z+=Math.sin(i*6.1+time*31)*amplitude;}segments.push({a:previous,b:p,fade:1,width:branch===0?.045:.023});previous=p;}}
   this.flash.visible=this.impact.visible=true;this.flash.position.copy(beam.from);this.flash.scale.setScalar(.17);this.impact.position.copy(beam.end);this.impact.scale.setScalar(.23+.04*Math.sin(time*31));this.light.position.copy(beam.from);this.light.intensity=25;
  }else{this.flash.visible=this.impact.visible=false;this.light.position.copy(foot);this.light.intensity=speed>18?7:0;}
  let count=0;const color=new THREE.Color();for(const s of segments.slice(-500)){this.direction.copy(s.b).sub(s.a);const l=this.direction.length();if(l<.002)continue;this.dummy.position.copy(s.a).add(s.b).multiplyScalar(.5);this.dummy.quaternion.setFromUnitVectors(this.up,this.direction.divideScalar(l));this.dummy.scale.set(s.width,l,s.width);this.dummy.updateMatrix();this.core.setMatrixAt(count,this.dummy.matrix);this.dummy.scale.set(s.width*3.6,l,s.width*3.6);this.dummy.updateMatrix();this.glow.setMatrixAt(count,this.dummy.matrix);color.setRGB(s.fade,s.fade,s.fade);this.core.setColorAt(count,color);this.glow.setColorAt(count,color);count++;}
  for(const m of [this.core,this.glow]){m.count=count;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}this.segmentCount=count;
 }
 diagnostics(){return{segments:this.segmentCount||0,trailSegments:this.trails.length,firing:this.firing};}
}
