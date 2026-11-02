// Sustained structural-damage smoke, rendered through the existing particle pool.
export const BUILDING_SMOKE={startFraction:.20,fullFraction:.65,interval:.25,minRate:4,maxRate:10,maxTotalRate:24,maxPlumes:3,severeFraction:.65,severeSections:4};
export class BuildingSmoke {
 constructor({getBuildings,emit,config={}}){this.getBuildings=getBuildings;this.emit=emit;this.config={...BUILDING_SMOKE,...config};this.reset();}
 reset(){this.elapsed=0;this.cursor=0;this.records=new Map();this.activeBuildings=0;this.emitted=0;}
 update(dt){
  const c=this.config;this.elapsed+=dt;if(this.elapsed<c.interval)return;const elapsed=Math.min(this.elapsed,c.interval*2);this.elapsed=0;
  const active=[];
  for(const [id,b] of this.getBuildings()){
   let severe=0,total=0,lost=0,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;const damaged=[];
   for(const section of b.chunks){minX=Math.min(minX,section.x??section.body.position.x);maxX=Math.max(maxX,section.x??section.body.position.x);minZ=Math.min(minZ,section.z??section.body.position.z);maxZ=Math.max(maxZ,section.z??section.body.position.z);const fraction=section.hasDetached?1:1-section.hp/section.maxHp;if(fraction>=c.severeFraction-1e-8)severe++;total+=section.maxHp;lost+=section.maxHp*fraction;if(fraction>=.35&&!section.hidden)damaged.push(section);}
   const fraction=total?lost/total:0;if((fraction<c.startFraction&&severe<c.severeSections)||!damaged.length){this.records.delete(id);continue;}
   const intensity=Math.min(1,Math.max(0,(fraction-c.startFraction)/(c.fullFraction-c.startFraction),severe>=c.severeSections?severe/12:0)),rate=c.minRate+(c.maxRate-c.minRate)*intensity;
   let record=this.records.get(id);if(!record){record={credit:0,next:0};this.records.set(id,record);}record.credit=Math.min(3,record.credit+rate*elapsed);
   // A few distinct sources follow real damaged sections, including falling rubble.
   const sources=[damaged[0]];
   while(sources.length<c.maxPlumes){let next=null,distance=16;for(const section of damaged){const p=section.body.position,d=Math.min(...sources.map(s=>{const q=s.body.position;return (q.x-p.x)**2+(q.y-p.y)**2+(q.z-p.z)**2;}));if(d>distance){distance=d;next=section;}}if(!next)break;sources.push(next);}
   active.push({record,sources,intensity,minX,maxX,minZ,maxZ});
  }
  this.activeBuildings=active.length;if(!active.length)return;
  let budget=Math.floor(c.maxTotalRate*c.interval);
  for(let n=0;n<active.length*3&&budget>0;n++){
   const a=active[this.cursor++%active.length];if(a.record.credit<1)continue;
   const section=a.sources[a.record.next++%a.sources.length],p=section.body.position;
   const point={x:p.x,y:p.y+Math.min(1,section.size[1]/2),z:p.z,outwardX:0,outwardZ:0};
   // Vent at the nearest facade, rather than hiding smoke inside solid walls.
   if(!section.hasDetached){const distances=[p.x-a.minX,a.maxX-p.x,p.z-a.minZ,a.maxZ-p.z],side=distances.indexOf(Math.min(...distances));if(side===0){point.x=a.minX-.65;point.outwardX=-1;}if(side===1){point.x=a.maxX+.65;point.outwardX=1;}if(side===2){point.z=a.minZ-.65;point.outwardZ=-1;}if(side===3){point.z=a.maxZ+.65;point.outwardZ=1;}}
   this.emit(point,a.intensity);a.record.credit--;budget--;this.emitted++;
  }
 }
}
