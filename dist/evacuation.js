import * as THREE from './vendor/three.module.js';
export const CIVILIAN_WAVE_SIZE=12,MAX_CIVILIANS=72;
export class EvacuationScene {
 constructor(scene,damage,{visible,onEvent=()=>{},random=Math.random}){this.scene=scene;this.damage=damage;this.random=random;this.visible=visible;this.onEvent=onEvent;this.root=new THREE.Group();scene.add(this.root);this.box=new THREE.BoxGeometry(1,1,1);this.dummy=new THREE.Object3D();this.rotors=[];
 const part=(parent,color,p,s)=>{const m=new THREE.Mesh(this.box,new THREE.MeshStandardMaterial({color,roughness:.8}));m.position.set(...p);m.scale.set(...s);m.castShadow=true;parent.add(m);return m;};
 for(const [x,z]of[[-48,-48],[48,48]]){const g=new THREE.Group();g.position.set(x,0,z);this.root.add(g);part(g,'#202d35',[0,.07,0],[5,.15,7]);for(let i=0;i<5;i++)part(g,'#758b91',[0,.12+i*.12,-2+i*.8],[3.4,.18,.8]);for(const side of[-1,1]){part(g,'#384e59',[side*2,1.1,0],[.2,2.2,6]);part(g,'#4ee4ba',[side*2,2.3,0],[.25,.2,6]);}part(g,'#1c604e',[0,3,-2.8],[4.4,1.2,.3]);const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='#12533d';c.fillRect(0,0,256,64);c.fillStyle='white';c.font='bold 26px sans-serif';c.textAlign='center';c.fillText('SUBWAY',128,43);const sign=new THREE.Mesh(new THREE.PlaneGeometry(4,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),side:THREE.DoubleSide}));sign.position.set(0,3,-2.6);g.add(sign);}
 for(const z of[-48,48])part(this.root,'#49565a',[0,.025,z],[106,.05,9]);const pad=new THREE.Mesh(new THREE.RingGeometry(5.5,5.8,32),new THREE.MeshBasicMaterial({color:'#89ead4',side:THREE.DoubleSide}));pad.rotation.x=-Math.PI/2;pad.position.set(0,.09,48);this.root.add(pad);
 this.aircraft=new THREE.Group();this.root.add(this.aircraft);part(this.aircraft,'#546d58',[0,1,0],[3.2,2.8,9]);part(this.aircraft,'#8eaa8e',[0,1.2,4.7],[2.8,2.1,2]);part(this.aircraft,'#193948',[0,1.7,5.75],[2.4,.8,.12]);part(this.aircraft,'#242c2b',[0,.1,-4.8],[2.1,.16,3]);for(const z of[-3.6,3.4]){part(this.aircraft,'#60765e',[0,3,z],[1,1.7,1.4]);const r=new THREE.Group();r.position.set(0,4,z);this.aircraft.add(r);for(let i=0;i<3;i++){const blade=part(r,'#263638',[0,0,0],[.24,.08,11]);blade.rotation.y=i*Math.PI/3;}this.rotors.push(r);}for(const x of[-1.7,1.7])for(const z of[-3,3])part(this.aircraft,'#20272b',[x,-.1,z],[.45,.65,.8]);
 this.people=new THREE.InstancedMesh(this.box,new THREE.MeshStandardMaterial({color:'white',roughness:1}),MAX_CIVILIANS*6);this.people.frustumCulled=false;this.root.add(this.people);this.reset();
 }
 reset(){this.raider?.reset();this.damage.units=this.damage.units.filter(u=>!u.entity.evac);this.civilians=[];this.cohorts=[];this.time=0;this.nextSpawn=0;this.groups=0;this.saved=0;this.lost=0;this.passengers=0;this.phase='boarding';this.airThreatRoll=null;this.flightTime=0;this.boardTime=0;this.failed=false;this.turn=0;this.heroTargets=new Map();this.history=[];this.aircraft.visible=true;this.aircraft.position.set(0,.8,48);this.aircraft.rotation.set(0,0,0);this.heli=this.damage.add('evac-chinook','helicopter',{root:this.aircraft,evac:true},600);this.sync();this.render();}
 createCohort(center,route){const cohort={center:center.clone(),route,stage:0,heading:0,members:[]};this.cohorts.push(cohort);return cohort;}
 spawn(){
  if(this.civilians.filter(c=>c.unit.alive).length+CIVILIAN_WAVE_SIZE>MAX_CIVILIANS)return;
  const side=this.groups%2,sign=side?1:-1;this.groups++;this.history.push(side);this.history=this.history.slice(-20);
  const route=[[sign*24,sign*48],[sign*24,48],[0,48]],cohort=this.createCohort(new THREE.Vector3(sign*48,.08,sign*48),route);cohort.heading=-sign*Math.PI/2;
  for(let i=0;i<CIVILIAN_WAVE_SIZE;i++){
   const root=new THREE.Group(),c={root,evac:true,phase:i*.8,group:cohort,slot:{side:(i%3-1)*.85,row:(Math.floor(i/3)-1.5)*.9},unit:null};
   c.unit=this.damage.add('civilian-'+this.groups+'-'+i,'civilian',c,35);this.civilians.push(c);cohort.members.push(c);
  }
  this.placeCohort(cohort);if(this.groups===2)this.raider?.spawn();this.onEvent('Subway '+(side?'east':'west')+' · 12 civilians moving together to the Chinook.');
 }
 placeCohort(group){const forward=new THREE.Vector3(Math.sin(group.heading),0,Math.cos(group.heading)),right=new THREE.Vector3(forward.z,0,-forward.x);for(const c of group.members)if(c.unit.alive){c.root.position.copy(group.center).addScaledVector(right,c.slot.side).addScaledVector(forward,c.slot.row);c.root.rotation.y=group.heading;}}
 relocateCivilian(c,destination){
  // A portal rescue becomes its own travelling group rather than snapping back to the old formation.
  if(c.group)c.group.members=c.group.members.filter(member=>member!==c);
  const side=destination.x<0?-1:1,group=this.createCohort(new THREE.Vector3(destination.x,.08,destination.z),[[side*24,destination.z],[side*24,48],[0,48]]);
  c.group=group;c.slot={side:0,row:0};group.members.push(c);this.placeCohort(group);this.sync();
 }
 updateCohorts(dt){
  for(const group of this.cohorts){
   group.members=group.members.filter(c=>c.unit.alive);if(!group.members.length)continue;
   const p=group.route[group.stage],delta=new THREE.Vector3(p[0],.08,p[1]).sub(group.center),distance=delta.length();
   if(distance>.001){const heading=Math.atan2(delta.x,delta.z),angle=Math.atan2(Math.sin(heading-group.heading),Math.cos(heading-group.heading));group.heading+=angle*(1-Math.exp(-10*dt));group.center.addScaledVector(delta.normalize(),Math.min(distance,3.8*dt));}
   if(distance<=3.8*dt+.001){if(group.stage<group.route.length-1)group.stage++;else if(this.phase==='boarding'&&this.passengers+group.members.length<=16){for(const c of group.members){c.unit.alive=false;c.unit.shapes=[];}this.passengers+=group.members.length;this.boardTime=0;}}
   this.placeCohort(group);
  }
  this.cohorts=this.cohorts.filter(group=>group.members.some(c=>c.unit.alive));
 }
 disable(u){if(u===this.raider?.combatUnit){this.raider.destroy();return true;}if(!u.entity.evac)return false;if(u===this.heli){this.failed=true;this.lost+=this.passengers;this.passengers=0;this.phase='destroyed';this.aircraft.rotation.z=.6;this.onEvent('Evacuation Chinook lost. Rebuild the city to retry.');}else{this.lost++;u.entity.root.visible=false;}return true;}
 sync(){for(const c of this.civilians)c.unit.shapes=c.unit.alive?[{center:{x:c.root.position.x,y:1,z:c.root.position.z},half:{x:.35,y:.95,z:.35}}]:[];this.heli.shapes=this.heli.alive?[{center:{x:this.aircraft.position.x,y:this.aircraft.position.y+1,z:this.aircraft.position.z},half:{x:1.8,y:2,z:5.8}}]:[];}
 update(dt){this.time+=dt;if(!this.failed){while(this.time+1e-9>=this.nextSpawn){this.spawn();this.nextSpawn+=30;}
 this.updateCohorts(dt);
 if(this.phase==='boarding'){this.boardTime+=dt;if(this.passengers>=CIVILIAN_WAVE_SIZE||(this.passengers>0&&this.boardTime>=12)){this.phase='departing';this.airThreatRoll=null;this.flightTime=0;}}
 else if(this.phase==='departing'){this.flightTime+=dt;this.aircraft.position.y=.8+Math.min(20,this.flightTime*4);this.aircraft.position.z=48+Math.max(0,this.flightTime-2)*12;if(this.aircraft.position.y>=15&&this.airThreatRoll===null)this.airThreatRoll=this.random()<.25;if(this.flightTime>=8){this.saved+=this.passengers;this.passengers=0;this.phase='returning';this.flightTime=0;this.heli.alive=false;this.aircraft.visible=false;this.onEvent('Chinook reached safety. Evacuated: '+this.saved);}}
 else if(this.phase==='returning'){this.flightTime+=dt;if(this.flightTime>=10){this.phase='boarding';this.heli.alive=true;this.heli.health=this.heli.maxHealth;this.aircraft.visible=true;this.aircraft.position.set(0,.8,48);this.boardTime=0;}}
 }
 this.civilians=this.civilians.filter(c=>c.unit.alive);this.damage.units=this.damage.units.filter(u=>!u.entity.evac||u===this.heli||u.alive);for(let i=0;i<this.rotors.length;i++)this.rotors[i].rotation.y+=dt*(i?-32:32);this.sync();if(!this.failed)this.raider?.update(dt,this.time);this.render();}
 render(){let n=0;for(const c of this.civilians){if(!c.unit.alive)continue;const swing=Math.sin(this.time*12+c.phase)*.65;for(let i=0;i<6;i++){const offsets=[[0,1.65,0],[0,1.1,0],[-.22,.4,0],[.22,.4,0],[-.4,1.05,0],[.4,1.05,0]],sizes=[[.38,.4,.38],[.58,.7,.32],[.2,.8,.24],[.2,.8,.24],[.17,.65,.2],[.17,.65,.2]];this.dummy.position.set(...offsets[i]).applyAxisAngle(new THREE.Vector3(0,1,0),c.root.rotation.y).add(c.root.position);this.dummy.rotation.set(i>1?swing*(i%2?1:-1):0,c.root.rotation.y,0);this.dummy.scale.set(...sizes[i]);this.dummy.updateMatrix();this.people.setMatrixAt(n,this.dummy.matrix);this.people.setColorAt(n++,new THREE.Color(i===0?'#d4a078':i<2?['#cf8355','#668faa','#a799ba'][Math.floor(c.phase)%3]:'#354454'));}}this.people.count=n;this.people.instanceMatrix.needsUpdate=true;if(this.people.instanceColor)this.people.instanceColor.needsUpdate=true;}
 chinookTargetable(){return this.phase==='departing'&&this.aircraft.position.y>=15&&this.airThreatRoll===true;}
 targets(origin,heroes){for(let i=0;i<heroes.length;i++){const h=heroes[i];let target=this.heroTargets.get(i);if(!target){target={id:'hero-target-'+i,kind:'hero',alive:false,entity:h,shapes:[]};this.heroTargets.set(i,target);}target.alive=!!h?.enabled;target.shapes=target.alive?[{center:h.root.position.clone().add(new THREE.Vector3(0,1.4,0)),half:{x:.5,y:1,z:.5}}]:[];}return [...this.heroTargets.values(),...this.civilians.map(c=>c.unit),...(this.chinookTargetable()?[this.heli]:[])].filter(u=>u.alive&&u.shapes.length&&this.visible(origin,u.shapes[0].center));}
 pick(candidates){const groups=['hero','civilian','helicopter'];for(let i=0;i<3;i++){const kind=groups[this.turn++%3],found=candidates.filter(u=>u.kind===kind);if(found.length){const target=found[Math.floor(this.time)%found.length];return target;}}return null;}
 diagnostics(){return{waveSize:CIVILIAN_WAVE_SIZE,activeGroups:this.cohorts.length,raider:this.raider?.diagnostics()||null,chinookTargetable:this.chinookTargetable(),airThreatChance:.25,targetAltitude:15,groups:this.groups,entrances:[...this.history],nextSpawn:Math.max(0,this.nextSpawn-this.time),waiting:this.civilians.length,aboard:this.passengers,saved:this.saved,lost:this.lost,phase:this.phase,failed:this.failed,helicopterHealth:this.heli.health};}
}
