import {RunnerWave} from './runner-wave.js?v=wave-dash-62';
import * as THREE from './vendor/three.module.js';
export class RunnerElectric {
 constructor(scene){
  this.root=new THREE.Group();scene.add(this.root);this.trails=[];this.previous=null;this.timer=0;this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);this.direction=new THREE.Vector3();
  const geometry=new THREE.CylinderGeometry(1,1,1,5,1,true),material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  this.core=new THREE.InstancedMesh(geometry,material('#e9ffff',.95),500);this.glow=new THREE.InstancedMesh(geometry,material('#27cfff',.25),500);for(const m of [this.core,this.glow]){m.frustumCulled=false;this.root.add(m);m.count=0;}
  this.chargeBall=new THREE.Group();this.chargeCore=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),material('#e9ffff',.95));this.chargeHalo=new THREE.Mesh(this.chargeCore.geometry,material('#24cfff',.18));this.chargeHalo.scale.setScalar(1.9);this.chargeBall.add(this.chargeCore,this.chargeHalo);this.chargeRings=[];const ringGeo=new THREE.TorusGeometry(1,.045,4,24);for(let i=0;i<2;i++){const ring=new THREE.Mesh(ringGeo,material('#70edff',.8));this.chargeBall.add(ring);this.chargeRings.push(ring);}this.root.add(this.chargeBall);
  this.flash=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),material('#a6f8ff',.9));this.impact=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),material('#70dbff',.75));this.root.add(this.flash,this.impact);this.light=new THREE.PointLight('#63e2ff',0,10,2);this.root.add(this.light);this.wave=new RunnerWave(this.root);this.clear();
 }
 clear(){this.wave.clear();this.chargeBall.visible=false;this.charging=false;this.chargeProgress=0;this.trailExtent=0;this.segmentCount=0;this.trails=[];this.previous=null;this.core.count=this.glow.count=0;this.flash.visible=this.impact.visible=false;this.light.intensity=0;this.timer=0;this.energyTimer=0;this.firing=false;}
 addArc(a,b,time,life=.23,width=.025,amplitude=.16){
  let previous=a.clone();for(let i=1;i<=8;i++){const t=i/8,p=a.clone().lerp(b,t);if(i<8){p.x+=Math.sin(i*3.7+time*22)*amplitude;p.y+=Math.cos(i*6.1+time*19)*amplitude;p.z+=Math.sin(i*4.3-time*17)*amplitude;}if(this.trails.length>=350)this.trails.shift();this.trails.push({a:previous,b:p,life,max:life,width});previous=p;}
 }
 update(dt,time,{position,normal,speed,beam=null,charge=null,carryTrails=[],dashing=false,energy=0,wave=null,phaseEvents=[]}){
  for(const trail of carryTrails){const height=trail.kind==='tank'?1.6:1;this.addArc(new THREE.Vector3(trail.from.x,trail.from.y+height,trail.from.z),new THREE.Vector3(trail.to.x,trail.to.y+height,trail.to.z),time,.42,.035,.22);if(dashing)this.addArc(position.clone().addScaledVector(normal,1),new THREE.Vector3(trail.to.x,trail.to.y+height,trail.to.z),time+2,.12,.014,.13);}
  this.timer-=dt;const foot=position.clone().addScaledVector(normal,.18);
  if(this.previous&&speed>18&&this.timer<=0){
   this.addArc(this.previous,foot,time,.72,.025,.16);this.addArc(this.previous.clone().addScaledVector(normal,.9),foot.clone().addScaledVector(normal,.8),time+3,.62,.019,.22);this.timer=.035;
   const a=position.clone().addScaledVector(normal,.25),b=position.clone().addScaledVector(normal,2.05);this.addArc(a,b,time+.6,.18,.014,.25);
   this.previous=foot;
  }else if(!this.previous||speed<=18)this.previous=foot;
  for(let i=this.trails.length-1;i>=0;i--){this.trails[i].life-=dt;if(this.trails[i].life<=0)this.trails.splice(i,1);}
  this.energyTimer-=dt;if(energy>.05&&this.energyTimer<=0){const a=position.clone().addScaledVector(normal,.6),b=position.clone().addScaledVector(normal,1.95);this.addArc(a,b,time+5,.15,.006+.01*energy,.12+.12*energy);this.energyTimer=.18-.09*energy;}
  const segments=this.trails.map(s=>({...s,fade:Math.pow(s.life/s.max,.65)}));segments.push(...this.wave.update(dt,time,{position,normal,direction:wave?.direction,active:!!wave?.active,carried:wave?.carried||0,events:phaseEvents}));
  this.firing=!!beam;this.charging=!!charge;this.chargeProgress=charge?.progress||0;this.chargeBall.visible=!!charge;
  if(charge){
   const p=charge.progress;this.chargeBall.position.copy(charge.from);this.chargeBall.scale.setScalar(.08+.38*p*p);this.chargeCore.rotation.set(time*9,time*12,time*7);this.chargeRings.forEach((ring,i)=>{ring.rotation.set(time*(7+i*3),time*(5-i*2),time*9+i);ring.scale.setScalar(1.6+.3*Math.sin(time*22+i));});
   for(let branch=0;branch<4;branch++){let previous=charge.elbow.clone();for(let i=1;i<=8;i++){const t=i/8,point=charge.elbow.clone().lerp(charge.from,t),r=Math.sin(t*Math.PI)*(.23+.24*p),a=t*11-time*19+branch*Math.PI/2;point.x+=Math.cos(a)*r;point.z+=Math.sin(a)*r;point.y+=Math.sin(a*1.7)*r*.7;segments.push({a:previous,b:point,fade:.5+.5*p,width:.012+.018*p});previous=point;}}
   this.light.position.copy(charge.from);this.light.intensity=8+40*p*p;
  }
  if(beam){
   for(let branch=0;branch<3;branch++){let previous=beam.from.clone();for(let i=1;i<=24;i++){const t=i/24,p=beam.from.clone().lerp(beam.end,t);if(i<24){const amplitude=branch===0?.12:.30;p.x+=Math.sin(i*4.3+time*47+branch)*amplitude;p.y+=Math.cos(i*3.7-time*39+branch)*amplitude;p.z+=Math.sin(i*6.1+time*31)*amplitude;}segments.push({a:previous,b:p,fade:1,width:branch===0?.045:.023});previous=p;}}
   this.flash.visible=this.impact.visible=true;this.flash.position.copy(beam.from);this.flash.scale.setScalar(.17);this.impact.position.copy(beam.end);this.impact.scale.setScalar(.23+.04*Math.sin(time*31));this.light.position.copy(beam.from);this.light.intensity=25;
  }else{this.flash.visible=this.impact.visible=false;if(!charge){this.light.position.copy(foot);this.light.intensity=(speed>18?7:0)+energy*3;}}
  this.trailExtent=this.trails.reduce((max,s)=>Math.max(max,position.distanceTo(s.a)),0);let count=0;const color=new THREE.Color();for(const s of segments.slice(-500)){this.direction.copy(s.b).sub(s.a);const l=this.direction.length();if(l<.002)continue;this.dummy.position.copy(s.a).add(s.b).multiplyScalar(.5);this.dummy.quaternion.setFromUnitVectors(this.up,this.direction.divideScalar(l));this.dummy.scale.set(s.width,l,s.width);this.dummy.updateMatrix();this.core.setMatrixAt(count,this.dummy.matrix);this.dummy.scale.set(s.width*3.6,l,s.width*3.6);this.dummy.updateMatrix();this.glow.setMatrixAt(count,this.dummy.matrix);color.setRGB(s.fade,s.fade,s.fade);this.core.setColorAt(count,color);this.glow.setColorAt(count,color);count++;}
  for(const m of [this.core,this.glow]){m.count=count;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}this.segmentCount=count;
 }
 diagnostics(){return{wave:this.wave.diagnostics(),segments:this.segmentCount||0,trailSegments:this.trails.length,firing:this.firing,charging:this.charging,chargeProgress:this.chargeProgress,trailExtent:this.trailExtent,trailLifetime:.72};}
}
