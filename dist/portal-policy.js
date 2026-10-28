const groundUnit=u=>u?.alive&&(u.kind==='tank'||u.kind==='infantry');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
// Predict real hostile impacts; a locked homing missile warrants an earlier evacuation.
export function findPortalRescue(threats,units,{canRescue=()=>true,trace=()=>null,impactHorizon=3.5}={}){
 let best=null;
 const offer=(unit,threat,eta)=>{if(groundUnit(unit)&&canRescue(unit)&&eta>=0&&(!best||eta<best.eta))best={unit,threat,eta};};
 for(const p of threats){
  if(p.alive===false)continue;
  if(p.impactPoint){if(p.timeToImpact<0||p.timeToImpact>impactHorizon)continue;for(const u of units){if(!groundUnit(u)||!u.shapes[0])continue;const s=u.shapes[0];if(Math.hypot(p.impactPoint.x-s.center.x,p.impactPoint.z-s.center.z)<p.blastRadius+Math.max(s.half.x,s.half.z))offer(u,p,p.timeToImpact);}continue;}
  if(p.homing&&!p.lockLost&&groundUnit(p.target)&&p.age>.10){const shape=p.target.shapes[0];if(shape){const eta=Math.max(0,distance(p.position,shape.center)-Math.max(shape.half.x,shape.half.z))/(p.speed||8.5);if(eta<5)offer(p.target,p,eta);}}
  const v=p.velocity;if(!v)continue;const horizon=1.25,end={x:p.position.x+v.x*horizon,y:p.position.y+v.y*horizon,z:p.position.z+v.z*horizon},hit=trace(p.position,end,p);
  if(!hit)continue;if(hit.unit)offer(hit.unit,p,hit.t*horizon);
  if(hit.kind==='ground'||hit.kind==='building')for(const u of units){if(!groundUnit(u)||!u.shapes[0])continue;const s=u.shapes[0],reach=(p.blastRadius||3.8)+Math.max(s.half.x,s.half.z);if(distance(hit.point,s.center)<reach)offer(u,p,hit.t*horizon);}
 }
 return best;
}
export function choosePortalExit(unit,origin,positions,{isClear=()=>true,threats=[]}={}){
 const side=unit.entity?.team===1?1:-1;let best=null,bestScore=-Infinity;
 for(const p of positions){if(p.x*side<9||Math.hypot(p.x-origin.x,p.z-origin.z)<16||!isClear(p,unit))continue;
  if(threats.some(t=>t.impactPoint&&t.timeToImpact>=0&&Math.hypot(p.x-t.impactPoint.x,p.z-t.impactPoint.z)<t.blastRadius+(unit.kind==='tank'?2.8:1)+1))continue;
  const danger=threats.length?Math.min(...threats.map(t=>distance(p,t.position))):40;
  const score=Math.min(60,danger)+Math.hypot(p.x-origin.x,p.z-origin.z)*.3;if(score>bestScore){best=p;bestScore=score;}
 }
 return best?{...best}:null;
}
export function roadPortalPositions(){const positions=[];for(const side of [-1,1])for(const x of [24,42])for(const z of [-24,0,24])positions.push({x:side*x,y:.08,z});for(const x of [-24,24])for(const z of [-12,12])positions.push({x,y:.08,z});return positions;}
