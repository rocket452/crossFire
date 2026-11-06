// Conservative broad phase for gameplay rays. Exact box intersection still decides every hit.
export class SectionQueryGrid {
 constructor(size=16){this.size=size;this.padding=4;this.cells=new Map();this.moved=new Set();this.nextOrder=0;this.queries=0;this.candidates=0;}
 add(section){section.queryOrder=this.nextOrder++;const r=Math.hypot(...section.size)/2,p=section.body.position,s=this.size;section.queryMinY=p.y-r;section.queryMaxY=p.y+r;for(let x=Math.floor((p.x-r-this.padding)/s);x<=Math.floor((p.x+r+this.padding)/s);x++)for(let z=Math.floor((p.z-r-this.padding)/s);z<=Math.floor((p.z+r+this.padding)/s);z++){const key=x+','+z;let cell=this.cells.get(key);if(!cell)this.cells.set(key,cell=[]);cell.push(section);}}
 release(section){this.moved.add(section);}
 reset(){this.moved.clear();}
 query(from,to,radius=0){const s=this.size,result=[],seen=new Set(),minY=Math.min(from.y,to.y)-radius,maxY=Math.max(from.y,to.y)+radius,add=(c,moved=false)=>{if(c.hidden||c.collisionDisabled||seen.has(c)||!moved&&(c.queryMaxY<minY||c.queryMinY>maxY))return;seen.add(c);result.push(c);};const visited=new Set(),visit=(x,z)=>{const key=x+','+z;if(visited.has(key))return;visited.add(key);for(const c of this.cells.get(key)||[])if(!this.moved.has(c))add(c);};
  let x=Math.floor(from.x/s),z=Math.floor(from.z/s);const endX=Math.floor(to.x/s),endZ=Math.floor(to.z/s),dx=to.x-from.x,dz=to.z-from.z,sx=Math.sign(dx),sz=Math.sign(dz),neighbors=Math.ceil(Math.max(0,radius-this.padding)/s),deltaX=dx?s/Math.abs(dx):Infinity,deltaZ=dz?s/Math.abs(dz):Infinity;let tx=dx?((sx>0?(x+1)*s:x*s)-from.x)/dx:Infinity,tz=dz?((sz>0?(z+1)*s:z*s)-from.z)/dz:Infinity;
  for(let steps=0;steps<=Math.abs(endX-Math.floor(from.x/s))+Math.abs(endZ-Math.floor(from.z/s))+2;steps++){for(let ox=-neighbors;ox<=neighbors;ox++)for(let oz=-neighbors;oz<=neighbors;oz++)visit(x+ox,z+oz);if(x===endX&&z===endZ)break;if(tx<tz){x+=sx;tx+=deltaX;}else if(tz<tx){z+=sz;tz+=deltaZ;}else{x+=sx;z+=sz;tx+=deltaX;tz+=deltaZ;}}

  // Detached pieces can travel outside their original cells, even after settling.
  for(const c of this.moved)add(c,true);this.queries++;this.candidates+=result.length;return result;
 }
}
