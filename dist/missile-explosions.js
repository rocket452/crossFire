import * as THREE from './vendor/three.module.js';
export const MISSILE_EXPLOSIONS=Object.freeze({limit:12,lifetime:2.4,firePerBurst:25,smokePerBurst:10});
// Visuals only: warhead damage remains in the existing swept impact callbacks.
export class MissileExplosions{
 constructor(scene){
  this.root=new THREE.Group();this.root.name='Missile detonations';scene.add(this.root);this.dummy=new THREE.Object3D();
  const vertex=`attribute float blastAge;attribute float blastKind;varying vec2 vUv;varying float vAge;varying float vKind;void main(){vUv=uv;vAge=blastAge;vKind=blastKind;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*center;}`;
  const make=(count,smoke)=>{
   const geo=new THREE.PlaneGeometry(1,1);for(const name of['blastAge','blastKind'])geo.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(count),1));
   const fragment=smoke?`float shape=pow(max(0.,1.-dot(p,p)),1.3);float fade=sin(3.14159*min(1.,vAge));vec3 color=mix(vec3(.12,.13,.14),vec3(.32,.33,.33),vAge);gl_FragColor=vec4(color,shape*fade*.48);`:`float r=length(p);float shape=pow(max(0.,1.-r*r),1.5);vec3 color=mix(vec3(1.,.68,.22),vec3(.8,.06,.005),vAge);float alpha=shape*(1.-vAge);if(vKind<.5){color=mix(vec3(1.,.12,.005),vec3(.7,.018,.001),vAge);float hot=pow(max(0.,1.-r),5.)*(1.-smoothstep(0.,.2,vAge));color=mix(color,vec3(1.,.9,.5),hot);alpha*=.3;}else if(vKind<1.5){color=vec3(1.,.45,.08);alpha=pow(max(0.,1.-abs(p.x)-abs(p.y)),1.2)*(1.-vAge);}else{color=vec3(1.,.65,.28);alpha=exp(-pow((r-.82)*18.,2.))*(1.-vAge)*.5;}gl_FragColor=vec4(color,alpha);`;
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,blending:smoke?THREE.NormalBlending:THREE.AdditiveBlending,vertexShader:vertex,fragmentShader:`varying vec2 vUv;varying float vAge;varying float vKind;void main(){vec2 p=vUv*2.-1.;${fragment}\n#include <colorspace_fragment>\n}`});
   const mesh=new THREE.InstancedMesh(geo,material,count);mesh.frustumCulled=false;mesh.count=0;mesh.renderOrder=smoke?1:2;this.root.add(mesh);return mesh;
  };
  this.smoke=make(MISSILE_EXPLOSIONS.limit*MISSILE_EXPLOSIONS.smokePerBurst,true);this.fire=make(MISSILE_EXPLOSIONS.limit*MISSILE_EXPLOSIONS.firePerBurst,false);this.reset();
 }
 reset(){this.bursts=[];this.total=0;this.interceptions=0;this.impacts=0;this.fire.count=this.smoke.count=0;this.root.visible=false;}
 burst(position,{air=false}={}){if(this.bursts.length>=MISSILE_EXPLOSIONS.limit)this.bursts.shift();this.bursts.push({position:new THREE.Vector3().copy(position),age:0,scale:air?1:1.25,seed:++this.total});if(air)this.interceptions++;else this.impacts++;this.render();}
 update(dt){for(const b of this.bursts)b.age+=dt;this.bursts=this.bursts.filter(b=>b.age<MISSILE_EXPLOSIONS.lifetime);this.render();}
 render(){let fire=0,smoke=0;
  const put=(mesh,index,position,size,age,kind,stretch=1)=>{this.dummy.position.copy(position);this.dummy.scale.set(size,size*stretch,size);this.dummy.updateMatrix();mesh.setMatrixAt(index,this.dummy.matrix);mesh.geometry.attributes.blastAge.setX(index,age);mesh.geometry.attributes.blastKind.setX(index,kind);};
  for(const b of this.bursts){const t=b.age,s=b.scale;
   for(let i=0;i<8;i++){const life=.55+(i%3)*.08;if(t>=life)continue;const a=i*2.399+b.seed,d=new THREE.Vector3(Math.cos(a),Math.sin(a*1.7)*.65,Math.sin(a)),p=b.position.clone().addScaledVector(d,(.15+t*2.4)*s);p.y+=t*.6;put(this.fire,fire++,p,(1.2+Math.sin(Math.min(1,t/life)*Math.PI)*2.8)*s,t/life,0);}
   for(let i=0;i<16;i++){const life=.65+(i%5)*.1;if(t>=life)continue;const a=i*2.399+b.seed,d=new THREE.Vector3(Math.cos(a),.35+Math.sin(a*1.3)*.85,Math.sin(a)).normalize(),p=b.position.clone().addScaledVector(d,t*(4+i%4)*s);p.y-=2.5*t*t;put(this.fire,fire++,p,(.16+(i%3)*.04)*s,t/life,1,1.8);}
   if(t<.48)put(this.fire,fire++,b.position,(1+t*17)*s,t/.48,2);
   for(let i=0;i<10;i++){const life=1.8+(i%4)*.18;if(t>=life)continue;const a=i*2.399+b.seed,p=b.position.clone().add(new THREE.Vector3(Math.cos(a)*(.2+t*.85)*s,t*(1.2+i%3*.35)+Math.sin(a)*.4*s,Math.sin(a)*(.2+t*.85)*s));put(this.smoke,smoke++,p,(1.1+t*2.1)*s,t/life,0);}
  }
  for(const [mesh,count]of[[this.fire,fire],[this.smoke,smoke]]){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;mesh.geometry.attributes.blastAge.needsUpdate=mesh.geometry.attributes.blastKind.needsUpdate=true;}this.root.visible=!!this.bursts.length;
 }
 diagnostics(){return{active:this.bursts.length,total:this.total,interceptions:this.interceptions,impacts:this.impacts,fire:this.fire.count,smoke:this.smoke.count,limit:MISSILE_EXPLOSIONS.limit,lifetime:MISSILE_EXPLOSIONS.lifetime,drawCalls:2};}
}
