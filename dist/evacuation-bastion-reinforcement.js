import * as THREE from './vendor/three.module.js';

// One transport per Walker defeat. Cargo is visual only until safely on the ground.
export class EvacuationBastionReinforcement {
 constructor(scene,adapter,config,{getWalker,getGroundHeight,onEvent=()=>{},onLanding=()=>{}}){
  Object.assign(this,{adapter,config,getWalker,getGroundHeight,onEvent,onLanding});
  this.root=new THREE.Group();this.root.name='Bastion heavy dropship';scene.add(this.root);
  const box=new THREE.BoxGeometry(1,1,1),materials={hull:new THREE.MeshStandardMaterial({color:'#303d3f',roughness:.65,metalness:.55}),plate:new THREE.MeshStandardMaterial({color:'#738377',roughness:.6,metalness:.4}),dark:new THREE.MeshStandardMaterial({color:'#172226',roughness:.5,metalness:.7}),light:new THREE.MeshBasicMaterial({color:'#7df6ef',toneMapped:false}),engine:new THREE.MeshBasicMaterial({color:'#65dcff',transparent:true,opacity:.6,depthWrite:false,toneMapped:false})};
  const part=(size,p,mat)=>{const m=new THREE.Mesh(box,materials[mat]);m.scale.fromArray(size);m.position.fromArray(p);this.root.add(m);return m;};
  // Open belly between two armored carrier booms; forty-metre cargo clears the hull.
  part([30,7,58],[0,0,0],'hull');part([22,4,12],[0,-3,-30],'dark');part([20,3,9],[0,-3,-36],'plate');part([14,2,1],[0,-2,-41],'light');
  for(const side of[-1,1]){part([9,13,66],[side*23,-3,2],'hull');part([10,2,48],[side*23,4,1],'plate');part([21,3,27],[side*35,-1,5],'plate');part([6,8,19],[side*42,-3,13],'dark');part([5,1,19],[side*43,-7,13],'light');part([6,9,9],[side*23,-4,36],'dark');part([5,6,1],[side*23,-4,41],'light');part([2,11,12],[side*23,9,25],'plate');}
  this.clamps=[];this.engines=[];
  for(const side of[-1,1])for(const z of[-15,18]){this.clamps.push(part([3,14,4],[side*16,-11,z],'dark'));part([7,3,9],[side*33,-4,z],'dark');const flame=new THREE.Mesh(new THREE.ConeGeometry(3,17,8),materials.engine);flame.position.set(side*33,-14,z);flame.rotation.z=Math.PI;this.root.add(flame);this.engines.push(flame);}
  this.marker=new THREE.Mesh(new THREE.RingGeometry(17,18,64),new THREE.MeshBasicMaterial({color:'#ffbf66',transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));this.marker.rotation.x=-Math.PI/2;scene.add(this.marker);this.reset();
 }
 reset(){this.phase='waiting';this.elapsed=0;this.clock=0;this.adapter.reset(false);this.root.visible=false;this.marker.visible=false;this.destination=new THREE.Vector3();}
 transition(phase){this.phase=phase;this.elapsed=0;}
 update(dt){
  this.clock+=dt;const c=this.config,b=this.adapter.boss;
  if(this.phase==='waiting'){const walker=this.getWalker();if(!walker.dead)return;this.destination.copy(walker.root.position);this.destination.y=this.getGroundHeight(this.destination.x,this.destination.z);this.transition('wreck');this.onEvent('Heavy transport inbound · Bastion reinforcement detected.');}
  this.elapsed+=dt;const d=this.destination,t=this.elapsed;
  if(this.phase==='wreck'&&t>=c.wreckDelay){this.transition('approach');this.root.visible=true;b.root.visible=true;this.marker.visible=true;}
  if(this.phase==='approach'||this.phase==='hover'||this.phase==='drop'){
   const a=this.phase==='approach'?THREE.MathUtils.clamp(this.elapsed/c.approachSeconds,0,1):1;
   this.root.position.set(d.x,d.y+c.cruiseHeight+(c.approachHeight-c.cruiseHeight)*(1-a),d.z+c.approachDistance*(1-a)**2);this.root.rotation.set(0,0,Math.sin(this.clock*1.3)*.008);
   b.root.position.copy(d);b.root.position.z=this.root.position.z;b.root.position.y+=this.phase==='drop'?c.cargoHeight*(1-Math.min(1,this.elapsed/c.dropSeconds)**2):c.cargoHeight+(this.root.position.y-d.y-c.cruiseHeight);b.model.sync();
   this.marker.position.copy(d).y+=.15;this.marker.material.opacity=.25+.25*(.5+.5*Math.sin(this.clock*6));
   for(const [i,clamp]of this.clamps.entries())clamp.position.x=(i<2?-1:1)*(16+(this.phase==='drop'?Math.min(1,this.elapsed/.6)*7:0));
   if(this.phase==='approach'&&this.elapsed>=c.approachSeconds)this.transition('hover');
   else if(this.phase==='hover'&&this.elapsed>=c.hoverSeconds){this.transition('drop');this.onEvent('Bastion deploying · clear the landing zone.');}
   else if(this.phase==='drop'&&this.elapsed>=c.dropSeconds){this.adapter.reset(true);b.root.position.copy(d);b.model.sync();b.sync();this.marker.visible=false;this.transition('departure');this.onLanding(d.clone());this.onEvent('Bastion deployed · evacuation continues.');}
  }
  if(this.phase==='departure'){const a=Math.min(1,this.elapsed/c.departureSeconds);this.root.position.set(d.x,d.y+c.cruiseHeight+(c.departureHeight-c.cruiseHeight)*a,d.z-c.approachDistance*a*a);if(a===1){this.root.visible=false;this.transition('deployed');}}
  for(const e of this.engines)e.scale.setScalar(1+Math.sin(this.clock*24)*.08);
  this.adapter.update(dt);
 }
 afterHeroes(dt){this.adapter.afterHeroes(dt);}
 diagnostics(){return{phase:this.phase,elapsed:this.elapsed,destination:this.destination.toArray(),shipVisible:this.root.visible,active:this.adapter.enabled,bossAlive:this.adapter.boss.combatUnit.alive};}
}
