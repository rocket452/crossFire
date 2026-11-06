export const ENEMY_SEPARATION=Object.freeze({gap:.15,slop:.03,stiffness:12,maxSpeed:3.2,iterations:3,verticalTolerance:2.5,radii:{mireguard:3.64,bruiser:2.1,aegis:2.2,scythe:2.35,breaker:1.8,walker:7}});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function pairAngle(a,b){let h=2166136261;for(const c of a+'|'+b)h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^(h>>>16),2246822507);return(h>>>0)/4294967296*Math.PI*2;}
// Horizontal soft contacts only. No rigid-body stack, vertical impulses or player collision.
export class EnemySeparation {
 constructor({canMove=(e,a,b)=>e.isPathClear?.(a,b)!==false}={}){this.canMove=canMove;this.reset();}
 reset(){this.totalCorrections=0;this.last={pairs:0,moved:0,blocked:0,maxPenetration:0};}
 radius(e){return ENEMY_SEPARATION.radii[e.type||'bruiser']||ENEMY_SEPARATION.radii.bruiser;}
 update(dt,enemies=[],{boss=null,bounds={minX:-56,maxX:56,minZ:-56,maxZ:56}}={}){
  this.last={pairs:0,moved:0,blocked:0,maxPenetration:0};if(!(dt>0))return;dt=Math.min(dt,.075);const c=ENEMY_SEPARATION,actors=enemies.filter(e=>e.spawned&&!e.dead&&e.combatUnit?.alive&&e.root.visible).map(e=>({e,id:e.id,p:e.root.position,r:this.radius(e),mass:1}));if(boss&&!boss.dead&&boss.combatUnit?.alive&&boss.root.visible)actors.push({e:boss,id:'siege-walker',p:boss.root.position,r:c.radii.walker,mass:0});actors.sort((a,b)=>a.id.localeCompare(b.id));const contacts=new Set(),moved=new Set(),alpha=1-Math.exp(-c.stiffness*dt/c.iterations),limit=c.maxSpeed*dt/c.iterations;
  for(let pass=0;pass<c.iterations;pass++){
   const shifts=actors.map(()=>({x:0,z:0}));
   for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){const a=actors[i],b=actors[j];if(Math.abs(a.p.y-b.p.y)>c.verticalTolerance)continue;let x=b.p.x-a.p.x,z=b.p.z-a.p.z,d=Math.hypot(x,z),penetration=a.r+b.r+c.gap-d;if(penetration<=c.slop)continue;contacts.add(i+':'+j);this.last.maxPenetration=Math.max(this.last.maxPenetration,penetration);if(d<1e-6){const angle=pairAngle(a.id,b.id);x=Math.cos(angle);z=Math.sin(angle);d=1;}x/=d;z/=d;const sum=a.mass+b.mass;if(!sum)continue;const push=(penetration-c.slop)*alpha;shifts[i].x-=x*push*a.mass/sum;shifts[i].z-=z*push*a.mass/sum;shifts[j].x+=x*push*b.mass/sum;shifts[j].z+=z*push*b.mass/sum;}
   for(let i=0;i<actors.length;i++){const a=actors[i],s=shifts[i],length=Math.hypot(s.x,s.z);if(!a.mass||length<1e-7)continue;const scale=Math.min(1,limit/length),x=s.x*scale,z=s.z*scale,from={x:a.p.x,y:a.p.y,z:a.p.z},candidate=(dx,dz)=>({x:clamp(from.x+dx,bounds.minX,bounds.maxX),y:from.y,z:clamp(from.z+dz,bounds.minZ,bounds.maxZ)});let to=candidate(x,z);
    if(!this.canMove(a.e,from,to,a.r)){const options=[candidate(x,0),candidate(0,z)].filter(p=>Math.hypot(p.x-from.x,p.z-from.z)>1e-7&&this.canMove(a.e,from,p,a.r)).sort((p,q)=>Math.hypot(q.x-from.x,q.z-from.z)-Math.hypot(p.x-from.x,p.z-from.z));to=options[0];if(!to){this.last.blocked++;continue;}}
    if(Math.hypot(to.x-from.x,to.z-from.z)<1e-7)continue;a.p.x=to.x;a.p.z=to.z;moved.add(a.e);this.totalCorrections++;
   }
  }
  for(const e of moved)e.sync?.();this.last.pairs=contacts.size;this.last.moved=moved.size;
 }
 diagnostics(){return{...this.last,totalCorrections:this.totalCorrections,maxSpeed:ENEMY_SEPARATION.maxSpeed,gap:ENEMY_SEPARATION.gap};}
}
