import * as THREE from './vendor/three.module.js';
// Three seeded, locked safe gaps. Moving collision is swept relative to the player.
export class BastionBeamWalls {
 constructor(boss){this.boss=boss;this.config=boss.config.beamWalls;this.group=new THREE.Group();boss.scene.add(this.group);this.field=new THREE.Group();this.group.add(this.field);this.inverse=new THREE.Matrix4();const c=this.config,b=this.arenaBounds,span=Math.max(c.max-c.min,b.maxX-b.minX+2*this.edgePadding,b.maxZ-b.minZ+2*this.edgePadding),n=Math.ceil(span*Math.SQRT2/c.spacing)+2;
  const cylinder=new THREE.CylinderGeometry(1,1,1,6),core=new THREE.MeshBasicMaterial({color:'#fff1dc',toneMapped:false}),glow=new THREE.MeshBasicMaterial({color:'#ff593b',transparent:true,opacity:.35,depthWrite:false,toneMapped:false});
  this.waves=Array.from({length:c.waves},()=>{const root=new THREE.Group(),beams=new THREE.InstancedMesh(cylinder,core,n),halo=new THREE.InstancedMesh(cylinder,glow,n),marker=new THREE.Mesh(new THREE.PlaneGeometry(c.gapWidth,c.max-c.min),new THREE.MeshBasicMaterial({color:'#65ffcf',transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false})),edges=[];marker.rotation.x=-Math.PI/2;marker.position.y=.12;for(const side of[-1,1]){const e=new THREE.Mesh(cylinder,new THREE.MeshBasicMaterial({color:'#64ffcc',toneMapped:false}));e.scale.set(.18,c.height,.18);e.position.set(side*c.gapWidth/2,c.height/2,0);root.add(e);edges.push(e);}root.add(beams,halo);this.field.add(root,marker);beams.frustumCulled=halo.frustumCulled=false;return{root,beams,halo,marker,edges,gap:0,hit:false,z:c.min,previousZ:c.min,active:false};});
  this.sky=new THREE.Mesh(cylinder,core);this.skyGlow=new THREE.Mesh(cylinder,glow);this.group.add(this.sky,this.skyGlow);this.dummy=new THREE.Object3D();this.reset();
 }
 get duration(){const c=this.config;return c.chargeSeconds+(c.waves-1)*c.waveInterval+((this.max??c.max)-(this.min??c.min))/c.speed+.3;}
 get arenaBounds(){const r=this.boss.config.arena.radius;return this.boss.arenaBounds||{minX:-r,maxX:r,minZ:-r,maxZ:r};}
 get edgePadding(){const c=this.config,r=this.boss.config.arena.radius;return Math.max(0,-c.min-r,c.max-r);}
 reset(){this.left=this.min=this.config.min;this.right=this.max=this.config.max;this.running=false;this.elapsed=0;this.completed=0;this.sky.visible=this.skyGlow.visible=false;for(const w of this.waves){w.root.visible=w.marker.visible=w.active=false;w.hit=false;w.z=w.previousZ=this.config.min;}}
 begin(){
  this.reset();if(this.boss.state.launchers[this.boss.config.rain.module].destroyed)return;
  const c=this.config,b=this.arenaBounds,target=this.boss.player.position,cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,dx=target.x-cx,dz=target.z-cz;
  // Lock to this map's center and far edge, independently of the boss's pose.
  this.yaw=Math.abs(dx)>Math.abs(dz)?(dx>=0?Math.PI/2:-Math.PI/2):(dz>=0?0:Math.PI);
  this.field.position.set(cx,0,cz);this.field.rotation.y=this.yaw;this.field.updateMatrixWorld(true);this.inverse.copy(this.field.matrixWorld).invert();
  const corners=[];for(const x of[b.minX,b.maxX])for(const z of[b.minZ,b.maxZ])corners.push(new THREE.Vector3(x,0,z).applyMatrix4(this.inverse));
  const minX=Math.min(...corners.map(p=>p.x)),maxX=Math.max(...corners.map(p=>p.x));
  this.left=minX-this.edgePadding;this.right=maxX+this.edgePadding;this.min=Math.min(...corners.map(p=>p.z))-this.edgePadding;this.max=Math.max(...corners.map(p=>p.z))+this.edgePadding;
  // The full opening plus character clearance must fit inside playable bounds;
  // render overscan is deliberately excluded from the gap-placement interval.
  const low=minX+c.gapWidth/2+c.playerRadius,high=maxX-c.gapWidth/2-c.playerRadius;if(high<low)return;
  const step=Math.min(c.gapShift,(high-low)/Math.max(1,this.waves.length-1)),span=step*(this.waves.length-1),player=new THREE.Vector3().copy(target).applyMatrix4(this.inverse);
  const choices=[player.x-c.firstGapOffset,player.x+c.firstGapOffset].filter(x=>x>=low&&x<=high&&(x-span>=low||x+span<=high));
  let gap=choices.length?choices[Math.floor(this.boss.state.random()*choices.length)]:(Math.abs(player.x-low)>Math.abs(player.x-high)?low:high),direction=this.boss.state.random()<.5?-1:1;
  const end=gap+direction*span;if(end<low||end>high)direction*=-1;gap=direction>0?Math.min(gap,high-span):Math.max(gap,low+span);
  for(const w of this.waves){w.gap=gap;gap+=direction*step;w.marker.position.set(w.gap,.12,(this.min+this.max)/2);w.marker.scale.y=(this.max-this.min)/(c.max-c.min);w.z=w.previousZ=this.min;}
  this.running=true;if(this.boss.state.patterns.includes('beam-wall'))this.boss.state.barrageDuration=this.duration*(this.boss.state.gapBonus?1+this.boss.config.timings.gapExtension:1);this.boss.onEvent('SKY BEAM · Three beam walls incoming. Pass through the green gaps!');
 }
 update(dt){if(!this.running)return;const c=this.config;if(this.boss.dead||this.boss.state.launchers[this.boss.config.rain.module].destroyed){this.reset();return;}this.elapsed+=dt;const sky=this.elapsed<c.chargeSeconds;this.sky.visible=this.skyGlow.visible=sky;if(sky){const p=this.boss.model.art.artilleryMuzzle();for(const [mesh,r]of[[this.sky,c.skyRadius],[this.skyGlow,c.skyRadius*2]]){mesh.position.copy(p).y+=c.height/2;mesh.scale.set(r,c.height,r);}}
  this.completed=0;for(const [i,w]of this.waves.entries()){const age=this.elapsed-c.chargeSeconds-i*c.waveInterval;w.previousZ=w.z;w.z=this.min+Math.max(0,age)*c.speed;w.active=age>=0&&w.z<=this.max;w.root.visible=w.active;w.marker.visible=age<0&&age>=-c.chargeSeconds;if(w.z>this.max)this.completed++;if(!w.active)continue;
   w.root.position.z=w.z;let n=0;for(let x=this.left;x<=this.right;x+=c.spacing){if(Math.abs(x-w.gap)<c.gapWidth/2)continue;this.dummy.position.set(x,c.height/2,0);this.dummy.scale.set(c.radius,c.height,c.radius);this.dummy.updateMatrix();w.beams.setMatrixAt(n,this.dummy.matrix);this.dummy.scale.set(c.spacing*.62,c.height,c.spacing*.62);this.dummy.updateMatrix();w.halo.setMatrixAt(n++,this.dummy.matrix);}w.beams.count=w.halo.count=n;w.beams.instanceMatrix.needsUpdate=w.halo.instanceMatrix.needsUpdate=true;for(const [j,e]of w.edges.entries())e.position.x=w.gap+(j?1:-1)*c.gapWidth/2;}
  if(this.elapsed>this.duration){this.running=false;for(const w of this.waves)w.root.visible=w.marker.visible=w.active=false;}
 }
 checkPlayer(player,previous){if(!this.running||player.phased)return;const c=this.config,worldPrevious=previous;previous=new THREE.Vector3().copy(previous).applyMatrix4(this.inverse);const p=new THREE.Vector3().copy(player.position).applyMatrix4(this.inverse);for(const w of this.waves){if(!w.active||w.hit)continue;const a=previous.z-w.previousZ,b=p.z-w.z,margin=c.thickness+c.playerRadius;if(Math.min(a,b)>margin||Math.max(a,b)<-margin)continue;const t=Math.abs(a-b)>1e-8?THREE.MathUtils.clamp(a/(a-b),0,1):1,x=previous.x+(p.x-previous.x)*t,y=previous.y+(p.y-previous.y)*t;if(x<this.left||x>this.right||y>c.height||Math.abs(x-w.gap)<=c.gapWidth/2-c.playerRadius)continue;w.hit=true;this.boss.playerHit(new THREE.Vector3().copy(worldPrevious).lerp(player.position,t),c.damage);}}
 diagnostics(){return{yaw:this.yaw??0,origin:this.field.position.toArray(),arenaBounds:{...this.arenaBounds},direction:[Math.sin(this.yaw??0),0,Math.cos(this.yaw??0)],running:this.running,elapsed:this.elapsed,completed:this.completed,waves:this.waves.map(w=>({gap:w.gap,z:w.z,active:w.active,hit:w.hit}))};}
}
