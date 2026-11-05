import * as THREE from './vendor/three.module.js';
export const PLASMA_IMPACT_FX=Object.freeze({limit:8,lifetime:3.2,flashSeconds:.22,energySeconds:.8,sparks:28,mist:8,smoke:10});
// Visual-only pooled effects. Collision, blast radius and damage stay in the artillery callback.
export class PlasmaImpactEffects {
 constructor(scene){
  this.root=new THREE.Group();this.root.name='Siege Walker plasma detonations';scene.add(this.root);this.dummy=new THREE.Object3D();this.up=new THREE.Vector3(0,1,0);this.identity=new THREE.Quaternion();this.color=new THREE.Color();this.groundRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  const make=(name,geometry,count,billboard=false,smoke=false)=>{
   geometry.setAttribute('fxOpacity',new THREE.InstancedBufferAttribute(new Float32Array(count),1));
   const vertex=`attribute float fxOpacity;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;void main(){vUv=uv;vColor=instanceColor;vOpacity=fxOpacity;${billboard?'vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*center;':'gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);'}}`;
   const fragment=`varying vec2 vUv;varying vec3 vColor;varying float vOpacity;void main(){${billboard?'vec2 p=vUv*2.-1.;float r=dot(p,p);float curl=.82+.18*sin(p.x*8.+p.y*5.)*sin(p.y*11.-p.x*4.);float shape=pow(max(0.,1.-r),1.6)*curl;':'float shape=1.;'}gl_FragColor=vec4(vColor,vOpacity*shape);\n#include <colorspace_fragment>\n}`;
   const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:smoke?THREE.NormalBlending:THREE.AdditiveBlending});
   const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.setColorAt(0,new THREE.Color('white'));mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.name=name;mesh.count=0;mesh.renderOrder=smoke?1:2;this.root.add(mesh);return mesh;
  };
  const c=PLASMA_IMPACT_FX;this.core=make('White-hot plasma core',new THREE.IcosahedronGeometry(1,1),c.limit*2);this.rings=make('Double plasma ground shockwave',new THREE.RingGeometry(.94,1,64),c.limit*2);this.sparks=make('Plasma ejecta streaks',new THREE.BoxGeometry(1,1,1),c.limit*c.sparks);this.mist=make('Expanding emerald discharge',new THREE.PlaneGeometry(1,1),c.limit*c.mist,true);this.smoke=make('Rolling impact smoke',new THREE.PlaneGeometry(1,1),c.limit*c.smoke,true,true);this.pools=[this.core,this.rings,this.sparks,this.mist,this.smoke];this.reset();
 }
 reset(){this.bursts=[];this.total=0;for(const p of this.pools)p.count=0;this.root.visible=false;}
 burst(point,{radius=7,groundY=point.y}={}){if(this.bursts.length>=PLASMA_IMPACT_FX.limit)this.bursts.shift();this.bursts.push({position:new THREE.Vector3().copy(point),radius,groundY,age:0,seed:++this.total});this.render();}
 update(dt){for(const b of this.bursts)b.age+=Math.max(0,dt);this.bursts=this.bursts.filter(b=>b.age<PLASMA_IMPACT_FX.lifetime);this.render();}
 put(mesh,position,scale,color,opacity,rotation=null){if(mesh.count>=mesh.instanceMatrix.count)return;this.dummy.position.copy(position);this.dummy.quaternion.copy(rotation||this.identity);this.dummy.scale.copy(scale);this.dummy.updateMatrix();const i=mesh.count++;mesh.setMatrixAt(i,this.dummy.matrix);mesh.setColorAt(i,this.color.set(color));mesh.geometry.attributes.fxOpacity.setX(i,Math.max(0,opacity));}
 render(){
  for(const p of this.pools)p.count=0;const c=PLASMA_IMPACT_FX,v=new THREE.Vector3(),s=new THREE.Vector3(),q=new THREE.Quaternion();
  for(const b of this.bursts){const t=b.age,p=b.position,scale=b.radius/7;
   if(t<c.flashSeconds){const f=1-t/c.flashSeconds;this.put(this.core,v.copy(p).add(new THREE.Vector3(0,.6*scale,0)),s.setScalar((.65+t*13)*scale),'#ecfff7',f*.8);}
   if(t<c.energySeconds){const f=1-t/c.energySeconds;this.put(this.core,v.copy(p).add(new THREE.Vector3(0,(.3+t*1.3)*scale,0)),s.set((1+t*5.5)*scale,(.7+t*4.8)*scale,(1+t*5.5)*scale),'#14ffa6',f*f*.19);}
   if(b.groundY!==null)for(let i=0;i<2;i++){const a=t-i*.13,life=.8+i*.2;if(a<0||a>=life)continue;const u=a/life,r=(.35+(b.radius-.35)*(1-(1-u)**2));this.put(this.rings,v.set(p.x,b.groundY+.12+i*.025,p.z),s.setScalar(r),i?'#16e9a9':'#b4ffe5',(1-u)*(.8-i*.25),this.groundRotation);}
   for(let i=0;i<c.sparks;i++){const life=.55+(i%5)*.09;if(t>=life)continue;const a=i*2.39996+b.seed,direction=new THREE.Vector3(Math.cos(a),.25+(i%4)*.36,Math.sin(a)).normalize(),speed=(8+i%6)*scale;v.copy(p).addScaledVector(direction,t*speed);v.y+=.25*scale-5.5*t*t;if(b.groundY!==null)v.y=Math.max(b.groundY+.08,v.y);q.setFromUnitVectors(this.up,direction);this.put(this.sparks,v,s.set(.055*scale,(.42+.2*(i%3))*scale*(1-t/life),.055*scale),'#c2ffe9',(1-t/life)*.95,q);}
   for(let i=0;i<c.mist;i++){const life=.6+i%3*.12;if(t>=life)continue;const a=i*2.39996+b.seed;v.copy(p).add(new THREE.Vector3(Math.cos(a)*t*3*scale,(.2+t*(1.2+i%3))*scale,Math.sin(a)*t*3*scale));this.put(this.mist,v,s.setScalar((1.2+t*4.8)*scale),i%2?'#16ffa6':'#baffde',(1-t/life)*.26);}
   for(let i=0;i<c.smoke;i++){const delay=.05+(i%3)*.06,age=t-delay,life=c.lifetime-delay;if(age<0||age>=life)continue;const a=i*2.39996+b.seed,fade=Math.min(1,age/.22)*(1-age/life);v.copy(p).add(new THREE.Vector3(Math.cos(a)*(.3+age*.8)*scale,(.35+age*(1.15+i%3*.27))*scale,Math.sin(a)*(.3+age*.8)*scale));this.put(this.smoke,v,s.setScalar((1.2+age*1.65)*scale),i%2?'#43534f':'#253a36',fade*.4);}
  }
  for(const p of this.pools){p.instanceMatrix.needsUpdate=true;p.instanceColor.needsUpdate=true;p.geometry.attributes.fxOpacity.needsUpdate=true;}this.root.visible=this.bursts.length>0;
 }
 diagnostics(){return{active:this.bursts.length,total:this.total,limit:PLASMA_IMPACT_FX.limit,lifetime:PLASMA_IMPACT_FX.lifetime,drawCalls:this.pools.filter(p=>p.count>0).length,core:this.core.count,rings:this.rings.count,sparks:this.sparks.count,mist:this.mist.count,smoke:this.smoke.count};}
}
