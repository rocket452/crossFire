import * as THREE from './vendor/three.module.js';
import {EvacBus} from './evac-bus.js';
import {routeLength,routePoint,validateConvoyConfig} from './convoy-map-config.js?v=argus-194';
// Step 1 only: autonomous convoy and civilian accounting. No ARGUS or Chinook logic.
export class ConvoyMission {
 constructor(scene,damage,config,{onEvent=()=>{},isBusPathClear=()=>true,isCivilianPathClear=()=>true,clearDebris=()=>{},groundHeight=()=>.08,onBusDestroyed=()=>{},onSmoke=()=>{}}={}){
  validateConvoyConfig(config);Object.assign(this,{scene,damage,config,onEvent,isBusPathClear,isCivilianPathClear,clearDebris,groundHeight,onBusDestroyed,onSmoke});this.length=routeLength(config.map.route);this.buses=Array.from({length:config.busCount},(_,i)=>new EvacBus(scene,damage,i,config));
  this.root=new THREE.Group();this.root.name='Convoy route and pickups';scene.add(this.root);this.markers=[];this.buildMarkers();
  this.people=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'white',roughness:1}),config.civiliansPerPickup*config.map.pickups.length*6);this.people.count=0;this.people.frustumCulled=false;scene.add(this.people);this.dummy=new THREE.Object3D();this.reset();
 }
 buildMarkers(){
  const c=this.config,line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.map.route.map(([x,z])=>new THREE.Vector3(x,.09,z))),new THREE.LineDashedMaterial({color:'#81ddc2',dashSize:2,gapSize:2,transparent:true,opacity:.55}));line.computeLineDistances();this.root.add(line);
  for(const [i,pickup]of c.map.pickups.entries()){
   const p=routePoint(c.map.route,pickup.distance),ring=new THREE.Mesh(new THREE.RingGeometry(3.3,3.6,32),new THREE.MeshBasicMaterial({color:'#eccd6e',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.1,p.z);this.root.add(ring);this.markers.push(ring);
   if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#203e38';ctx.fillRect(0,0,256,64);ctx.fillStyle='#f5dd91';ctx.textAlign='center';ctx.font='bold 27px sans-serif';ctx.fillText('PICKUP '+(i+1),128,43);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthWrite:false}));sprite.position.set(p.x,6,p.z);sprite.scale.set(7,1.75,1);this.root.add(sprite);}
  }
  const exit=routePoint(c.map.route,this.length),arch=new THREE.Mesh(new THREE.BoxGeometry(.25,7,12),new THREE.MeshBasicMaterial({color:'#65dab9',wireframe:true}));arch.position.set(exit.x,3.5,exit.z);this.root.add(arch);
 }
 reset(){
  this.damage.units=this.damage.units.filter(u=>!u.entity.convoy||u.kind==='bus');this.records=[];this.cohorts=[];this.time=0;this.distance=0;this.nextPickup=0;this.completedPickups=0;this.phase='starting';this.remaining=this.config.startupDelay;this.clearClock=0;this.events=[];this.blocked=false;this.terminal=false;
  for(const bus of this.buses){bus.reset();for(let i=0;i<this.config.initialPassengers;i++){const record={id:bus.id+'-initial-'+i,status:'onboard',busId:bus.id};this.records.push(record);bus.passengers.push(record);}const p=routePoint(this.config.map.route,-bus.index*this.config.busSpacing);bus.place(p,this.groundHeight(p.x,p.z));}
  for(const m of this.markers)m.material.color.set('#eccd6e');this.sync();this.render();this.notify('Convoy ready · two civilian pickups ahead.');
 }
 notify(text){this.events.push({time:this.time,text});this.events=this.events.slice(-12);this.onEvent(text);}
 get civilians(){return this.records.filter(c=>c.unit?.alive);}
 get failed(){return this.phase==='failed';}
 get activeBuses(){return this.buses.filter(b=>!b.destroyed&&!b.escaped);}
 beginPickup(){
  const stop=this.config.map.pickups[this.nextPickup];this.phase='pickup';this.remaining=this.config.pickupDuration;for(const bus of this.activeBuses)bus.setBoarding(true);
  let count=0,index=0;
  while(count<this.config.civiliansPerPickup){const size=Math.min(this.config.civilianGroupSize,this.config.civiliansPerPickup-count),source=stop.sources[index%stop.sources.length];this.spawnGroup(source,size,index++);count+=size;}
  this.notify('Pickup '+(this.nextPickup+1)+' · '+stop.name+' · boarding for '+this.config.pickupDuration+'s.');
 }
 spawnGroup(source,count,index){
  const g={id:'convoy-group-'+this.nextPickup+'-'+index,center:new THREE.Vector3(source[0],this.groundHeight(...source),source[1]),members:[],heading:0,pickup:this.nextPickup,route:[],stage:0,bus:null,boardClock:0};
  this.cohorts.push(g);
  for(let i=0;i<count;i++){const root=new THREE.Group(),c={root,convoy:true,evac:true,id:g.id+'-'+i,status:'waiting',phase:i*.8,slot:i,group:g};c.unit=this.damage.add(c.id,'civilian',c,this.config.civilianHealth);this.records.push(c);g.members.push(c);}
  this.assignBus(g);this.placeGroup(g);
 }
 assignBus(g){
  const members=g.members.filter(c=>c.unit.alive&&c.status==='waiting');
  const available=b=>this.config.capacity-b.passengers.length-this.cohorts.filter(other=>other!==g&&other.bus===b).reduce((sum,other)=>sum+Math.min(this.config.capacity-b.passengers.length,other.members.filter(c=>c.unit.alive&&c.status==='waiting').length),0);
  const candidates=this.activeBuses.filter(b=>available(b)>0).sort((a,b)=>(available(b)>=members.length?1:0)-(available(a)>=members.length?1:0)||a.root.position.distanceToSquared(g.center)-b.root.position.distanceToSquared(g.center));
  g.bus=candidates[0]||null;g.stage=0;
  if(g.bus){const door=g.bus.doorPoint();g.route=[new THREE.Vector3(door.x,this.groundHeight(door.x,this.config.map.pickupSidewalkZ),this.config.map.pickupSidewalkZ),door.setY(this.groundHeight(door.x,door.z))];}else g.route=[];
 }
 placeGroup(g){
  // Compact footprint stays outside intact facades, including while turning at a bus door.
  const columns=Math.min(this.config.civilianColumns,g.members.length),rows=Math.ceil(g.members.length/columns),spacing=this.config.civilianSpacing;
  for(const c of g.members){if(!c.unit.alive||c.unit.dashCarried)continue;const before=c.root.position.clone();c.root.position.set(g.center.x+(c.slot%columns-(columns-1)/2)*spacing,g.center.y,g.center.z+(Math.floor(c.slot/columns)-(rows-1)/2)*spacing);c.root.position.y=this.groundHeight(c.root.position.x,c.root.position.z);c.root.rotation.y=g.heading;c.moving=c.status==='waiting'&&before.distanceToSquared(c.root.position)>.00001;}
 }
 updateGroups(dt){
  for(const g of this.cohorts){
   const members=g.members.filter(c=>c.unit.alive);if(!members.length||members.some(c=>c.unit.dashCarried))continue;
   if(members.every(c=>c.status==='left-behind')||this.phase!=='pickup'){for(const c of members)c.moving=false;continue;}
   if(!g.bus||g.bus.destroyed||g.bus.passengers.length>=this.config.capacity){this.assignBus(g);if(!g.bus)continue;}
   const goal=g.route[g.stage],delta=goal.clone().sub(g.center).setY(0),distance=delta.length(),step=Math.min(distance,this.config.civilianSpeed*dt),next=g.center.clone().addScaledVector(delta.normalize(),step);
   if(!this.isCivilianPathClear(g.center,next,this.config.civilianPathRadius)){for(const c of members)c.moving=false;continue;}
   if(distance>.01)g.heading=Math.atan2(delta.x,delta.z);g.center.copy(next);g.center.y=this.groundHeight(next.x,next.z);this.placeGroup(g);
   if(distance<=step+.01&&g.stage<g.route.length-1){g.stage++;continue;}
   if(g.stage===g.route.length-1&&g.center.distanceTo(goal)<=this.config.boardingRadius){
    g.boardClock-=dt;
    while(g.boardClock<=0&&g.bus.passengers.length<this.config.capacity){const c=g.members.find(c=>c.unit.alive&&c.status==='waiting'&&!c.unit.dashCarried);if(!c)break;c.status='onboard';c.busId=g.bus.id;c.unit.alive=false;c.unit.shapes=[];c.root.visible=false;g.bus.passengers.push(c);g.boardClock+=this.config.boardingInterval;}
   }
  }
 }
 depart(){
  for(const c of this.civilians)if(c.status==='waiting')c.status='left-behind';
  for(const b of this.buses)b.setBoarding(false);this.markers[this.nextPickup].material.color.set('#577e70');this.nextPickup++;this.completedPickups++;this.phase='travelling';this.notify('Convoy departing · '+this.diagnostics().onboard+' onboard.');
 }
 resolve(){
  if(this.activeBuses.length)return;
  for(const c of this.civilians){c.status='left-behind';c.moving=false;}
  this.terminal=true;this.phase=this.buses.some(b=>b.escaped)?'success':'failed';this.notify(this.phase==='success'?'Evacuation complete · '+this.diagnostics().saved+' civilians saved.':'Mission failed · all evacuation buses destroyed.');
 }
 disable(unit){
  if(!unit?.entity?.convoy)return false;
  if(unit.kind==='bus'){
   const bus=unit.entity;if(bus.destroyed||bus.escaped)return true;bus.destroy();for(const c of bus.passengers)c.status='lost';bus.passengers=[];this.onBusDestroyed(bus.root.position.clone());this.notify('Bus '+(bus.index+1)+' destroyed · its passengers lost.');if(!this.terminal)this.resolve();
  }else if(unit.kind==='civilian'){unit.entity.status='lost';unit.entity.root.visible=false;unit.shapes=[];}
  this.render();return true;
 }
 update(dt){
  if(!(dt>0))return;this.time+=dt;this.clearClock-=dt;
  if(this.clearClock<=0){this.clearDebris();this.clearClock=this.config.map.debrisClearInterval;}
  if(!this.terminal){
   if(this.phase==='starting'){this.remaining=Math.max(0,this.remaining-dt);if(this.remaining===0){this.phase='travelling';this.notify('Convoy moving · protect the evacuation buses.');}}
   else if(this.phase==='pickup'){const slice=Math.min(dt,this.remaining);this.updateGroups(slice);this.remaining=Math.max(0,this.remaining-dt);if(this.remaining===0)this.depart();}
   else{
    const stop=this.config.map.pickups[this.nextPickup],advance=this.config.busSpeed*dt,newDistance=stop?Math.min(stop.distance,this.distance+advance):this.distance+advance;
    const placements=this.activeBuses.map(bus=>{
     const p=routePoint(this.config.map.route,newDistance-bus.index*this.config.busSpacing);
     let avoidance=0;for(const wreck of this.buses.filter(b=>b.destroyed)){const d=Math.hypot(p.x-wreck.root.position.x,p.z-wreck.root.position.z),weight=1-THREE.MathUtils.smoothstep(d,this.config.wreckAvoidInner,this.config.wreckAvoidOuter);avoidance=Math.max(avoidance,weight);}p.z+=avoidance*this.config.wreckAvoidOffset;
     return{bus,p};
    });
    this.blocked=placements.some(({bus,p})=>!this.isBusPathClear(bus.root.position,p,this.config.busWidth/2));
    if(!this.blocked){this.distance=newDistance;for(const {bus,p}of placements){bus.place(p,this.groundHeight(p.x,p.z),dt);if(newDistance-bus.index*this.config.busSpacing>=this.length){for(const c of bus.passengers)c.status='saved';const count=bus.passengers.length;bus.passengers=[];bus.escape();this.notify('Bus '+(bus.index+1)+' escaped · '+count+' civilians saved.');}}}
    if(stop&&this.distance>=stop.distance)this.beginPickup();this.resolve();
   }
  }
  for(const b of this.buses)if(b.destroyed){b.smokeClock-=dt;if(b.smokeClock<=0){this.onSmoke(b.root.position.clone().add(new THREE.Vector3(0,2,0)));b.smokeClock=this.config.smokeInterval;}}
  this.sync();this.render();
 }
 // Existing rescue hooks remain scene-local; carrying civilians never transfers bus passengers.
 relocateCivilian(c,destination){
  if(!c.unit.alive)return false;const old=c.group;old.members=old.members.filter(member=>member!==c);const g={...old,id:c.id+'-relocated',center:new THREE.Vector3(destination.x,destination.y??.08,destination.z),members:[c],route:[],stage:0,bus:null,boardClock:0};c.group=g;c.slot=0;this.cohorts.push(g);if(this.phase==='pickup'){c.status='waiting';this.assignBus(g);}else c.status='left-behind';this.placeGroup(g);this.sync();return true;
 }
 moveCarriedCivilian(c,p){if(!c.carried){this.relocateCivilian(c,p);c.carried=true;}c.group.center.copy(p);c.root.position.copy(p);this.sync();}
 sync(){for(const b of this.buses)b.sync();for(const c of this.civilians)c.unit.shapes=c.unit.dashPhased?[]:[{center:{x:c.root.position.x,y:c.root.position.y+.92,z:c.root.position.z},half:{x:.35,y:.95,z:.35}}];}
 render(){let n=0;for(const c of this.civilians){if(c.unit.dashPhased)continue;const swing=c.moving?Math.sin(this.time*12+c.phase)*.65:Math.sin(this.time*2+c.phase)*.04;const offsets=[[0,1.65,0],[0,1.1,0],[-.22,.4,0],[.22,.4,0],[-.4,1.05,0],[.4,1.05,0]],sizes=[[.38,.4,.38],[.58,.7,.32],[.2,.8,.24],[.2,.8,.24],[.17,.65,.2],[.17,.65,.2]];for(let i=0;i<6;i++){this.dummy.position.set(...offsets[i]).applyAxisAngle(new THREE.Vector3(0,1,0),c.root.rotation.y).add(c.root.position);this.dummy.rotation.set(i>1?swing*(i%2?1:-1):0,c.root.rotation.y,0);this.dummy.scale.set(...sizes[i]);this.dummy.updateMatrix();this.people.setMatrixAt(n,this.dummy.matrix);this.people.setColorAt(n++,new THREE.Color(i===0?'#d4a078':i===1?['#e1bd63','#719aa9','#bba0b5'][c.slot%3]:'#354454'));}}this.people.count=n;this.people.instanceMatrix.needsUpdate=true;if(this.people.instanceColor)this.people.instanceColor.needsUpdate=true;}
 diagnostics(){const count=status=>this.records.filter(c=>c.status===status).length;return{phase:this.phase,failed:this.failed,terminal:this.terminal,time:this.time,distance:this.distance,routeLength:this.length,pickup:this.nextPickup+1,completedPickups:this.completedPickups,remaining:this.remaining,blocked:this.blocked,saved:count('saved'),lost:count('lost'),unsaved:count('left-behind'),waiting:count('waiting'),onboard:count('onboard'),total:this.records.length,buses:this.buses.map(b=>({id:b.id,health:b.unit.health,maxHealth:b.unit.maxHealth,onboard:b.passengers.length,capacity:this.config.capacity,destroyed:b.destroyed,escaped:b.escaped,position:b.root.position.toArray()}))};}
}
