// Sword volumes use the city's existing panel health, supports and bounded debris pool.
// Called once at impact, never once per frame of the animation.
export function damageRoninBuildings(physics,{center,radius,height,damage,edgeMultiplier=.5,forward=null,minDot=-1}){
 if(!physics||!(radius>0)||!(damage>0))return{panels:0,destroyed:0,buildings:0};
 const from={x:center.x,y:center.y-height,z:center.z},to={x:center.x,y:center.y+height,z:center.z};
 const candidates=physics.chunks.querySegment?.(from,to,radius)||physics.chunks,affected=new Set();let panels=0,destroyed=0;
 for(const c of candidates){
  if(c.state!=='intact'||c.collisionDisabled||c.hp<=0)continue;
  const p=c.body.position;if(p.y+c.size[1]/2<from.y||p.y-c.size[1]/2>to.y)continue;
  // Closest point on the original yaw-rotated section box: long walls must not
  // miss the cleave just because their center is outside its radius.
  const dx=center.x-p.x,dz=center.z-p.z,cos=Math.cos(c.yaw||0),sin=Math.sin(c.yaw||0);
  const x=Math.max(-c.size[0]/2,Math.min(c.size[0]/2,cos*dx-sin*dz));
  const z=Math.max(-c.size[2]/2,Math.min(c.size[2]/2,sin*dx+cos*dz));
  const distance=Math.hypot(p.x+cos*x+sin*z-center.x,p.z-sin*x+cos*z-center.z);if(distance>radius)continue;
  if(forward){const vx=p.x-center.x,vz=p.z-center.z,d=Math.hypot(vx,vz),pad=Math.hypot(c.size[0],c.size[2])/2;
   if(d>pad){const angle=Math.acos(Math.max(-1,Math.min(1,(vx*forward.x+vz*forward.z)/d)));
    if(angle>Math.acos(minDot)+Math.asin(Math.min(1,pad/d)))continue;}
  }
  const power=damage*(1-(1-edgeMultiplier)*distance/radius);
  physics.damageChunk(c,power,{source:'astra-ronin'});panels++;affected.add(c.building);
  if(c.hp<=0){destroyed++;physics.queueDetach(c,center,power*.14);}
 }
 if(panels)physics.impacts++;
 for(const id of affected)physics.checkSupports(id);
 return{panels,destroyed,buildings:affected.size};
}
