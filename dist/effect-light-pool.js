import * as THREE from './vendor/three.module.js';

// Effect point lights (hero powers, beams, explosions) sit at intensity 0 almost all of the time, but every
// lit material still loops over every visible light for every pixel. The pool hides those source lights and
// copies the brightest few active ones (by intensity and distance to the camera) onto a fixed number of always-
// visible proxy lights. Effect code keeps driving its own light object unchanged. The shader light count never
// changes, so nothing recompiles when an effect starts or stops.
export class EffectLightPool {
 constructor(scene,{slots=2,keep=[]}={}){
  this.scene=scene;this.keep=new Set(keep);this.sources=[];
  this.proxies=Array.from({length:slots},(_,i)=>{
   const light=new THREE.PointLight(0xffffff,0,1,2);light.name='Effect light proxy '+i;scene.add(light);return light;
  });
  this.point=new THREE.Vector3();this.ranked=[];
  this.adopt();
 }
 // Registers point lights added to the scene since the last call. Cheap enough to run about once a second.
 adopt(){
  this.scene.traverse(o=>{
   if(!o.isPointLight||this.keep.has(o)||this.proxies.includes(o)||this.sources.includes(o))return;
   this.sources.push(o);o.visible=false;
  });
 }
 active(light){
  if(!(light.intensity>0))return false;
  let top=light;
  for(let p=light.parent;p;p=p.parent){if(!p.visible)return false;top=p;}
  return top===this.scene;
 }
 sync(camera){
  const ranked=this.ranked;ranked.length=0;
  for(const light of this.sources){
   if(!this.active(light))continue;
   light.getWorldPosition(this.point);
   const reach=Math.max(light.distance||40,1),d=this.point.distanceTo(camera.position);
   ranked.push({light,score:light.intensity/(1+(d/(reach+30))**2),x:this.point.x,y:this.point.y,z:this.point.z});
  }
  ranked.sort((a,b)=>b.score-a.score);
  this.proxies.forEach((proxy,i)=>{
   const r=ranked[i];
   if(!r){proxy.intensity=0;return;}
   proxy.position.set(r.x,r.y,r.z);proxy.color.copy(r.light.color);
   proxy.intensity=r.light.intensity;proxy.distance=r.light.distance;proxy.decay=r.light.decay;
  });
  return Math.min(ranked.length,this.proxies.length);
 }
 diagnostics(){return{slots:this.proxies.length,sources:this.sources.length,active:this.ranked.length};}
}
