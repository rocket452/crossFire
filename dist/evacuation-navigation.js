const LANES=[-48,-24,0,24,48];
// Tiny street graph: waypoints follow the existing street grid, never building interiors.
export class EvacuationNavigation {
 constructor({isClear=()=>true,landing={x:0,z:24}}={}){this.isClear=isClear;this.landing=landing;this.nodes=LANES.flatMap(x=>LANES.map(z=>({x,z})));}
 escape(from){for(const distance of[2,4,6])for(const [x,z]of[[distance,0],[-distance,0],[0,distance],[0,-distance]]){const to={x:from.x+x,z:from.z+z};if(Math.abs(to.x)>52||Math.abs(to.z)>52||!this.isClear(to,to))continue;const path=this.route(to);if(path)return{to,path};}return null;}
 route(from){
  const nodes=this.nodes,end=nodes.findIndex(p=>p.x===this.landing.x&&p.z===this.landing.z),near=[...nodes.keys()].sort((a,b)=>Math.hypot(nodes[a].x-from.x,nodes[a].z-from.z)-Math.hypot(nodes[b].x-from.x,nodes[b].z-from.z));
  const edges=new Map(),clearEdge=(i,j)=>{const key=Math.min(i,j)+':'+Math.max(i,j);if(!edges.has(key))edges.set(key,this.isClear(nodes[i],nodes[j]));return edges.get(key);};
  for(const start of near){if(!this.isClear(from,nodes[start]))continue;const queue=[start],prev=new Map([[start,null]]);for(let q=0;q<queue.length&&!prev.has(end);q++){const i=queue[q];for(let j=0;j<nodes.length;j++){if(prev.has(j)||Math.abs(nodes[i].x-nodes[j].x)+Math.abs(nodes[i].z-nodes[j].z)!==24||!clearEdge(i,j))continue;prev.set(j,i);queue.push(j);}}
   if(!prev.has(end))continue;const path=[];for(let i=end;i!==null;i=prev.get(i))path.unshift([nodes[i].x,nodes[i].z]);if(Math.hypot(path[0][0]-from.x,path[0][1]-from.z)<.1)path.shift();return path.length?path:[[this.landing.x,this.landing.z]];
  }return null;
 }
}
