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
