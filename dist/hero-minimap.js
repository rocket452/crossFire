const NS='http://www.w3.org/2000/svg';
export const MINIMAP=Object.freeze({range:90,radius:82,refreshSeconds:.05,structureSeconds:.5});
export function projectMinimap(point,center,yaw,range=MINIMAP.range){
 const dx=point.x-center.x,dz=point.z-center.z,distance=Math.hypot(dx,dz),scale=MINIMAP.radius/Math.max(range,distance||1),c=Math.cos(yaw),s=Math.sin(yaw);
 return{x:(-dx*c+dz*s)*scale,y:(-dx*s-dz*c)*scale,distance,edge:distance>range};
}
export function civilianClusters(people,radius=4){
 const groups=[];for(const p of people){let group=groups.find(g=>Math.hypot(g.x-p.x,g.z-p.z)<=radius);if(!group){groups.push({id:p.id,x:p.x,z:p.z,count:1,targeted:!!p.targeted});continue;}group.x=(group.x*group.count+p.x)/(group.count+1);group.z=(group.z*group.count+p.z)/(group.count+1);group.count++;group.targeted||=!!p.targeted;}return groups;
}
function svg(name,attributes={},parent=null){const node=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attributes))node.setAttribute(k,v);parent?.append(node);return node;}
export class HeroMinimap {
 constructor(root,{getSnapshot,getStructureAlive=()=>true}){
  Object.assign(this,{root,getSnapshot,getStructureAlive});this.svg=root.querySelector('svg');this.nodes=new Map();this.structures=[];this.staticMarkers=[];this.timer=this.structureTimer=0;this.visible=false;this.heading=0;this.center={x:0,z:0};this.counts={civilians:0,enemies:0};
  const defs=svg('defs',{},this.svg),clip=svg('clipPath',{id:'hero-minimap-clip'},defs);svg('circle',{r:88},clip);
  svg('circle',{r:94,class:'minimap-back'},this.svg);const clipped=svg('g',{'clip-path':'url(#hero-minimap-clip)'},this.svg);
  this.world=svg('g',{},clipped);this.markers=svg('g',{},this.svg);
  svg('path',{d:'M0 0L-19 -31Q0 -39 19 -31Z',class:'minimap-cone'},clipped);
  svg('circle',{r:91,class:'minimap-ring'},this.svg);this.north=svg('text',{class:'minimap-north','text-anchor':'middle','dominant-baseline':'central'},this.svg);this.north.textContent='N';
  svg('path',{d:'M0 -6L4.8 4L0 2L-4.8 4Z',class:'minimap-player'},this.svg);
  this.civilianCount=root.querySelector('[data-minimap-civilians]');this.enemyCount=root.querySelector('[data-minimap-enemies]');
 }
 setWorld({bounds,buildings,subways=[],landing=null}){
  this.world.replaceChildren();this.structures=[];
  svg('rect',{x:bounds.minX,y:bounds.minZ,width:bounds.maxX-bounds.minX,height:bounds.maxZ-bounds.minZ,class:'minimap-ground'},this.world);
  for(const lane of[-48,-24,0,24,48]){
   svg('path',{d:`M${bounds.minX} ${lane}H${bounds.maxX}M${lane} ${bounds.minZ}V60`,class:'minimap-road'},this.world);
  }
  if(bounds.maxZ>60)svg('path',{d:`M0 54V${bounds.maxZ}`,class:'minimap-approach'},this.world);
  for(const b of buildings){const rect=svg('rect',{x:b.x-5,y:b.z-5,width:10,height:10,class:'minimap-building'},this.world);this.structures.push({id:b.id,node:rect});}
  this.staticMarkers=subways.map((p,i)=>({...p,id:'subway-'+i,kind:'subway',label:'Subway entrance'}));if(landing)this.staticMarkers.push({...landing,id:'evac-zone',kind:'landing',label:'Evacuation landing zone'});
  this.timer=this.structureTimer=0;
 }
 refresh(){
  const data=this.getSnapshot(),people=data.civilians||[],enemies=data.enemies||[];
  this.counts={civilians:people.length,enemies:enemies.length};this.civilianCount.textContent=people.length;this.enemyCount.textContent=enemies.length;
  const entries=[...this.staticMarkers,...civilianClusters(people).map(g=>({...g,id:'group-'+g.id,kind:'civilian',label:g.count+' civilians'+(g.targeted?' — targeted by enemy attack':'')})),...enemies.map(e=>({...e,kind:e.boss?'boss':'enemy',label:e.boss?'Siege Walker':'Robot drone'})),...(data.allies||[]).map(a=>({...a,kind:'ally',label:'Allied hero'}))];
  if(data.helicopter)entries.push({...data.helicopter,id:'evac-helicopter',kind:'helicopter',label:'Evacuation helicopter'});
  const live=new Set(entries.map(e=>e.id));for(const[id,m]of this.nodes)if(!live.has(id)){m.node.remove();this.nodes.delete(id);}
  for(const entry of entries){let marker=this.nodes.get(entry.id);if(!marker){marker=this.makeMarker(entry);this.nodes.set(entry.id,marker);}marker.entry=entry;marker.title.textContent=entry.label;marker.node.classList.toggle('targeted',entry.kind==='civilian'&&!!entry.targeted);marker.node.setAttribute('data-targeted',String(!!entry.targeted));}
  this.root.setAttribute('aria-label',`Rotating hero minimap. ${people.length} civilians on the ground; ${enemies.length} enemies. Small yellow circles show civilian groups; flashing red circles warn of targeted groups; red diamonds show enemies; green H marks evacuation. Up follows the camera. Distant groups stay at the rim; arrows mark other distant units.`);
 }
 makeMarker(entry){
  const node=svg('g',{'data-kind':entry.kind,'data-id':entry.id,class:'minimap-marker '+entry.kind},this.markers),title=svg('title',{},node);title.textContent=entry.label;
  const arrow=entry.kind==='civilian'?null:svg('path',{d:'M0 -13L4 -7H-4Z',class:'minimap-edge-arrow'},node);
  if(entry.kind==='civilian')svg('circle',{r:4,class:'minimap-symbol'},node);
  else if(entry.kind==='boss'){svg('circle',{r:8,class:'minimap-boss-ring'},node);svg('path',{d:'M0 -6L6 0L0 6L-6 0Z',class:'minimap-symbol'},node);}
  else if(entry.kind==='enemy'){svg('path',{d:'M0 -5.5L5.5 0L0 5.5L-5.5 0Z',class:'minimap-symbol'},node);svg('circle',{r:1.2,class:'minimap-enemy-core'},node);}
  else if(entry.kind==='ally')svg('circle',{r:2.6,class:'minimap-symbol'},node);
  else if(entry.kind==='helicopter')svg('path',{d:'M-5 0H5M0 -4V4M-6 -4H6',class:'minimap-helicopter'},node);
  else{svg('rect',{x:-5.5,y:-5.5,width:11,height:11,rx:2,class:'minimap-symbol'},node);const text=svg('text',{'text-anchor':'middle','dominant-baseline':'central',class:'minimap-map-label'},node);text.textContent=entry.kind==='landing'?'H':'S';}
  return{node,arrow,title,entry};
 }
 update(dt,pose){
  const active=!!pose;if(this.visible!==active)this.root.hidden=!active;if(!active){this.visible=false;this.timer=this.structureTimer=0;return;}
  this.visible=true;this.center={x:pose.position.x,z:pose.position.z};if(Number.isFinite(pose.yaw))this.heading=pose.yaw;
  this.timer-=Math.max(0,dt);this.structureTimer-=Math.max(0,dt);if(this.timer<=0){this.refresh();this.timer=MINIMAP.refreshSeconds;}
  if(this.structureTimer<=0){for(const b of this.structures)b.node.classList.toggle('rubble',!this.getStructureAlive(b.id));this.structureTimer=MINIMAP.structureSeconds;}
  const turn=(this.heading-Math.PI)*180/Math.PI,scale=MINIMAP.radius/MINIMAP.range;this.world.setAttribute('transform',`rotate(${turn}) scale(${scale}) translate(${-this.center.x} ${-this.center.z})`);
  this.north.setAttribute('x',-Math.sin(this.heading)*99);this.north.setAttribute('y',Math.cos(this.heading)*99);
  for(const marker of this.nodes.values()){
   const p=projectMinimap(marker.entry,this.center,this.heading);marker.projected=p;marker.node.setAttribute('transform',`translate(${p.x} ${p.y})`);marker.node.classList.toggle('at-edge',p.edge);
   marker.arrow?.setAttribute('transform',`rotate(${Math.atan2(p.y,p.x)*180/Math.PI+90})`);
  }
 }
 diagnostics(){return{visible:this.visible,heading:this.heading,center:{...this.center},range:MINIMAP.range,counts:{...this.counts},markers:[...this.nodes.values()].map(m=>({id:m.entry.id,kind:m.entry.kind,count:m.entry.count||1,targeted:!!m.entry.targeted,world:{x:m.entry.x,z:m.entry.z},...m.projected}))};}
}
