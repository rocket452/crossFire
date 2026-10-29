import {findPortalRescue} from './portal-policy.js?v=plasma-18';
const copy=p=>({x:p.x,y:p.y,z:p.z});
const foot=u=>u.kind==='tank'?u.entity.root.position:u.entity;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const shapes=u=>u.shapes.map(s=>({center:copy(s.center),radius:Math.max(s.half.x,s.half.y,s.half.z)}));
const inside=(point,radius,list,margin=0)=>list.some(s=>distance(point,s.center)-s.radius<radius+margin);
// Credit a rescue only when a real hostile impact misses a displaced, surviving ally
// whose original collision shapes would have been inside that same blast.
export class RunnerRescues {
 constructor({getThreats=()=>[],traceThreat=()=>null,onRescue=()=>{}}={}){Object.assign(this,{getThreats,traceThreat,onRescue});this.reset();}
 reset(){this.clock=0;this.pending=new Map();this.credited=new Set();this.saved=0;this.events=0;this.last=null;}
 track(actors,{cpu=false}={}){
  if(cpu)return;
  const threats=this.getThreats().filter(t=>t.owner==='siege-walker'&&t.alive!==false);
  for(const a of actors){const u=a.unit;if(!u?.alive||!u.shapes.length)continue;
   for(const threat of threats){const rescue=findPortalRescue([threat],[u],{trace:this.traceThreat,impactHorizon:3.5});if(!rescue||rescue.eta>(threat.impactPoint?3.5:1.5))continue;
    const key=threat.id+':'+u.id;if(this.credited.has(key)||this.pending.has(key))continue;
    this.pending.set(key,{key,id:threat.id,unit:u,origin:copy(foot(u)),shapes:shapes(u),eta:rescue.eta,carriedDistance:0,carriedDelta:{x:0,y:0,z:0},expires:this.clock+rescue.eta+2});
   }
  }
  while(this.pending.size>128)this.pending.delete(this.pending.keys().next().value);
 }
 moved(unit,from,to){for(const p of this.pending.values())if(p.unit===unit){p.carriedDistance+=distance(from,to);for(const axis of ['x','y','z'])p.carriedDelta[axis]+=to[axis]-from[axis];}}
 update(dt){this.clock+=dt;for(const[key,p]of this.pending)if(p.expires<this.clock||!p.unit.alive)this.pending.delete(key);}
 impact(id,point,radius){
  if(!id)return null;const saved=[];
  for(const[key,p]of this.pending){if(p.id!==id)continue;this.pending.delete(key);const u=p.unit;
   if(!u.alive||this.credited.has(key)||p.carriedDistance<2||distance(foot(u),p.origin)<2||!inside(point,radius,p.shapes)||inside(point,radius,shapes(u),.3)||inside(point,radius,p.shapes.map(s=>({radius:s.radius,center:{x:s.center.x+p.carriedDelta.x,y:s.center.y+p.carriedDelta.y,z:s.center.z+p.carriedDelta.z}})),.3))continue;
   this.credited.add(key);saved.push({id:u.id,position:copy(foot(u)),eta:p.eta});
  }
  while(this.credited.size>256)this.credited.delete(this.credited.values().next().value);
  if(!saved.length)return null;this.saved+=saved.length;this.events++;this.last={count:saved.length,units:saved.map(u=>u.id),closeCall:saved.some(u=>u.eta<=.65),threat:id,total:this.saved};this.onRescue({...this.last,positions:saved.map(u=>u.position)});return this.last;
 }
 diagnostics(){return{saved:this.saved,events:this.events,pending:this.pending.size,last:this.last};}
}
