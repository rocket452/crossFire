import * as THREE from './vendor/three.module.js';
import {segmentBoxFraction} from './combat-collision.js?v=robot-1';
const clamp=THREE.MathUtils.clamp;
// Distance to the formed elliptical arc, revolved about world Y. The arc ends at
// the growing rim, so the unbuilt crown is a real opening, including sphere/rim contact.
export function iceDomeDistance(dome,point){
 const scale=dome.scale??1,r=dome.radius*scale,h=dome.height*scale,progress=clamp(dome.progress??1,0,1);
 if(r<=0||h<=0||progress<=0)return Infinity;
 const rho=Math.hypot(point.x-dome.center.x,point.z-dome.center.z),y=point.y-dome.center.y,maxTheta=Math.asin(progress);
 const distance2=t=>{const x=r*Math.cos(t)-rho,z=h*Math.sin(t)-y;return x*x+z*z;};
 // The closest near-surface point lies on this convex arc or one of its ends.
 let a=0,b=maxTheta,c=b-(b-a)*.61803398875,d=a+(b-a)*.61803398875,fc=distance2(c),fd=distance2(d);
 for(let i=0;i<24;i++){if(fc<fd){b=d;d=c;fd=fc;c=b-(b-a)*.61803398875;fc=distance2(c);}else{a=c;c=d;fc=fd;d=a+(b-a)*.61803398875;fd=distance2(d);}}
 return Math.sqrt(Math.min(distance2(0),distance2(maxTheta),fc,fd));
}
export function traceIceDome(dome,from,to,radius=0){
 if(!dome.active||dome.progress<=.001||dome.scale<=.001)return null;
 const r=dome.radius*dome.scale,h=dome.height*dome.scale*dome.progress,skin=.10*dome.scale,center={x:dome.center.x,y:dome.center.y+h/2,z:dome.center.z};
 const begin=segmentBoxFraction(from,to,center,{x:r,y:h/2,z:r},undefined,radius+skin);
 if(begin===null)return null;
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,length=Math.hypot(dx,dy,dz),point={x:0,y:0,z:0};let t=begin;
 for(let i=0;i<40&&t<=1+1e-9;i++){
  point.x=from.x+dx*t;point.y=from.y+dy*t;point.z=from.z+dz*t;
  const clearance=iceDomeDistance(dome,point)-radius-skin;
  if(clearance<=.001)return Math.min(1,t);
  if(length<1e-10||clearance>(1-t)*length+.001)return null;
  t+=Math.max(.00001,clearance-.0005)/length;
 }
 return null;
}
export class IceDome {
 constructor({center,radius=8,height=6.4,geometry,edgesGeometry,ringGeometry,crystalGeometry,iceMaterial,edgeMaterial}){
  this.radius=radius;this.height=height;this.progress=0;this.scale=1;this.age=0;this.active=true;this.center=center.clone();this.base=center.clone();this.buildPoint=center.clone();this.half={x:radius,y:0,z:radius};
  this.group=new THREE.Group();this.group.name='Growing ice dome';this.group.position.copy(center);this.uniforms={height:{value:0},fade:{value:1}};
  this.material=iceMaterial.clone();this.material.opacity=.42;this.material.side=THREE.DoubleSide;this.material.forceSinglePass=true;
  this.material.onBeforeCompile=shader=>{
   shader.uniforms.domeHeight=this.uniforms.height;shader.uniforms.domeFade=this.uniforms.fade;
   shader.vertexShader='varying float domeY;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n domeY=position.y;');
   shader.fragmentShader='uniform float domeHeight;uniform float domeFade;varying float domeY;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n if(domeY>domeHeight)discard;float frostLip=1.-smoothstep(0.,.045,abs(domeY-domeHeight));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.65,.95,1.),frostLip*.7);diffuseColor.a=(.38+frostLip*.4)*domeFade;');
  };this.material.customProgramCacheKey=()=> 'growing-ice-dome-30';
  this.roof=new THREE.Mesh(geometry,this.material);this.roof.name='Faceted ice dome';this.roof.scale.set(radius,height,radius);this.group.add(this.roof);
  this.edgeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{domeHeight:this.uniforms.height,domeFade:this.uniforms.fade},vertexShader:'varying float domeY;void main(){domeY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float domeY;uniform float domeHeight;uniform float domeFade;void main(){if(domeY>domeHeight)discard;gl_FragColor=vec4(.58,.88,1.,.26*domeFade);}'});
  this.edges=new THREE.LineSegments(edgesGeometry,this.edgeMaterial);this.edges.scale.copy(this.roof.scale);this.group.add(this.edges);
  this.baseRing=new THREE.Mesh(ringGeometry,edgeMaterial);this.baseRing.rotation.x=-Math.PI/2;this.baseRing.position.y=.07;this.baseRing.scale.set(radius,radius,radius);this.group.add(this.baseRing);
  this.rim=new THREE.Mesh(ringGeometry,edgeMaterial);this.rim.rotation.x=-Math.PI/2;this.group.add(this.rim);
  this.crystals=new THREE.InstancedMesh(crystalGeometry,iceMaterial,8);const dummy=new THREE.Object3D();for(let i=0;i<8;i++){const a=i*Math.PI/4;dummy.position.set(Math.sin(a)*radius,.24,Math.cos(a)*radius);dummy.rotation.set(0,a,.08*Math.sin(i));dummy.scale.set(.7+(i%3)*.18,.7+(i%2)*.4,.8);dummy.updateMatrix();this.crystals.setMatrixAt(i,dummy.matrix);}this.group.add(this.crystals);
 }
 update(age,fade,time,flash,growthSeconds){
  this.age=age;this.progress=clamp(age/growthSeconds,0,1);this.scale=clamp(fade,0,1);this.uniforms.height.value=this.progress;this.uniforms.fade.value=this.scale;
  this.group.scale.setScalar(Math.max(.001,this.scale));this.group.position.set(this.base.x+Math.sin(time*75)*.09*flash,this.base.y,this.base.z+Math.cos(time*61)*.09*flash);this.center.copy(this.group.position);
  this.grownHeight=this.height*this.progress*this.scale;this.half.x=this.half.z=this.radius*this.scale;this.half.y=this.grownHeight;this.half.boundingRadius=Math.hypot(this.half.x,this.half.y,this.half.z);
  const ringRadius=this.radius*Math.sqrt(Math.max(0,1-this.progress*this.progress));this.rim.position.y=this.height*this.progress;this.rim.scale.set(Math.max(.02,ringRadius),Math.max(.02,ringRadius),Math.max(.02,ringRadius));this.rim.visible=this.progress<.999;
  this.crystals.scale.y=Math.min(1,this.progress*6);this.buildPoint.copy(this.center).add(new THREE.Vector3(0,this.grownHeight,0));
 }
 trace(from,to,radius){return traceIceDome(this,from,to,radius);}
 dispose(){this.active=false;this.group.removeFromParent();this.material.dispose();this.edgeMaterial.dispose();}
}
