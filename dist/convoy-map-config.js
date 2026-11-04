// Map data comes from convoy-config.json. Negative distances place the trailing buses before the lead start.
export function routeLength(route){return route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0);}
export function routePoint(route,distance){
 let remaining=distance;
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(remaining<=length||i===route.length-1){const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;return{x:a[0]+dx*remaining,z:a[1]+dz*remaining,yaw:Math.atan2(dx,dz)};}
  remaining-=length;
 }
}
export function validateConvoyConfig(c){
 const positive=['capacity','busHealth','busSpeed','busSpacing','pickupDuration','civiliansPerPickup','civilianGroupSize','civilianHealth','civilianSpeed','civilianSpacing','civilianColumns','boardingInterval','boardingRadius','busWidth','busLength','busHeight','civilianPathRadius','wreckAvoidOffset','wreckAvoidInner','wreckAvoidOuter','smokeInterval'];
 for(const key of positive)if(!Number.isFinite(c[key])||c[key]<=0)throw Error('Invalid convoy setting: '+key);
 if(!Number.isInteger(c.busCount)||c.busCount<3||c.busCount>4)throw Error('Convoy needs three or four buses');
 if(!Number.isInteger(c.capacity)||!Number.isInteger(c.initialPassengers)||c.initialPassengers<0||c.initialPassengers>c.capacity)throw Error('Invalid initial bus capacity');
 if(!Number.isInteger(c.civiliansPerPickup)||!Number.isInteger(c.civilianGroupSize)||!Number.isInteger(c.civilianColumns)||c.startupDelay<0||!Number.isFinite(c.startupDelay))throw Error('Invalid civilian count or start delay');
 const route=c.map?.route;if(!Array.isArray(route)||route.length<2||route.some(p=>p.length!==2||p.some(v=>!Number.isFinite(v))))throw Error('Invalid convoy route');
 for(let i=1;i<route.length;i++)if(Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1])===0)throw Error('Empty route segment');
 if(c.map.pickups?.length!==2||c.map.pickups.some((p,i)=>!Number.isFinite(p.distance)||p.distance<=0||p.distance>=routeLength(route)||(i&&p.distance<=c.map.pickups[i-1].distance)||!p.sources?.length))throw Error('Invalid convoy pickups');
 return c;
}

// Project virtual endpoints onto the lane graph; replanning mid-edge never forces a return to its start.
export function interceptionPath(map,from,to){
 const {nodes,links}=map.interceptionLanes,points=nodes.map(([x,z])=>({x,z})),edges=points.map(()=>[]),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const connect=(a,b)=>{const d=distance(points[a],points[b]);edges[a].push([b,d]);edges[b].push([a,d]);};for(const [a,b]of links)connect(a,b);
 const attach=p=>{
  let best=null;for(const [edge,[a,b]]of links.entries()){const A=points[a],B=points[b],dx=B.x-A.x,dz=B.z-A.z,t=Math.max(0,Math.min(1,((p.x-A.x)*dx+(p.z-A.z)*dz)/(dx*dx+dz*dz))),q={x:A.x+dx*t,z:A.z+dz*t},d=distance(p,q);if(!best||d<best.distance)best={edge,a,b,q,distance:d};}
  const projection=points.length;points.push(best.q);edges.push([]);connect(projection,best.a);connect(projection,best.b);const endpoint=points.length;points.push({x:p.x,z:p.z});edges.push([]);connect(endpoint,projection);return{...best,projection,endpoint};
 };
 const start=attach(from),end=attach(to);if(start.edge===end.edge)connect(start.projection,end.projection);
 const costs=points.map(()=>Infinity),previous=new Map(),pending=new Set(points.map((_,i)=>i));costs[start.endpoint]=0;
 while(pending.size){let n=null;for(const i of pending)if(n===null||costs[i]<costs[n])n=i;if(!Number.isFinite(costs[n]))break;pending.delete(n);if(n===end.endpoint)break;for(const [j,d]of edges[n])if(costs[n]+d<costs[j]){costs[j]=costs[n]+d;previous.set(j,n);}}
 if(!Number.isFinite(costs[end.endpoint]))throw Error('Disconnected ARGUS interception lanes');
 const path=[];for(let n=end.endpoint;n!==undefined;n=previous.get(n))path.unshift({...points[n]});return{distance:costs[end.endpoint],points:path.filter((p,i)=>!i||distance(p,path[i-1])>.001).slice(1)};
}

// Read-only lead-bus forecast, including current startup/pickup remainder and all future pickup windows.
export function predictConvoyDistance(mission,seconds){
 let t=Math.max(0,seconds),d=mission.distance,index=mission.nextPickup;
 if(mission.phase==='starting'){t-=mission.remaining;if(t<=0)return d;}
 if(mission.phase==='pickup'){t-=mission.remaining;if(t<=0)return d;index++;}
 for(;index<mission.config.map.pickups.length;index++){
  const stop=mission.config.map.pickups[index],travel=Math.max(0,stop.distance-d)/mission.config.busSpeed;
  if(t<=travel)return d+t*mission.config.busSpeed;t-=travel;d=stop.distance;
  if(t<=mission.config.pickupDuration)return d;t-=mission.config.pickupDuration;
 }
 return d+t*mission.config.busSpeed;
}
