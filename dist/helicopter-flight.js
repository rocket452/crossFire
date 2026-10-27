// Assisted hover-flight model. The city keeps its separate rigid-body debris solver.
export class HelicopterFlight {
 constructor(position,yaw=0){this.position={...position};this.velocity={x:0,y:0,z:0};this.yaw=yaw;this.pitch=-.40;this.bank=0;this.tilt=0;this.cooldown=0;this.collision=false;this.collisionTimer=0;}
 step(input,dt,sections=[]){
  if(!(dt>0))return;dt=Math.min(dt,.15);this.cooldown=Math.max(0,this.cooldown-dt);this.yaw+=(input.turn||0)*1.05*dt;this.pitch=Math.max(-1.18,Math.min(.42,this.pitch+(input.look||0)*.75*dt));this.collision=false;this.collisionTimer=Math.max(0,this.collisionTimer-dt);
  let f=input.forward||0,s=input.strafe||0,up=Math.max(-1,Math.min(1,input.lift||0));const length=Math.hypot(f,s);if(length>1){f/=length;s/=length;}const boost=input.boost?1.45:1;
  const sy=Math.sin(this.yaw),cy=Math.cos(this.yaw),target={x:(sy*f*14-cy*s*10)*boost,y:up*7,z:(cy*f*14+sy*s*10)*boost};
  const substeps=Math.max(1,Math.ceil(dt/.02)),step=dt/substeps;
  for(let i=0;i<substeps;i++){
   const blend=1-Math.exp(-2.7*step);for(const axis of ['x','y','z'])this.velocity[axis]+=(target[axis]-this.velocity[axis])*blend;
   const p={x:this.position.x+this.velocity.x*step,y:this.position.y+this.velocity.y*step,z:this.position.z+this.velocity.z*step};
   for(const section of sections){const b=section.state==='intact'?section.bounds:section.body?.aabb;if(!b)continue;const lo=b.min||b.lowerBound,hi=b.max||b.upperBound;const pad=1.2;
    if(p.x>lo.x-pad&&p.x<hi.x+pad&&p.y>lo.y-pad&&p.y<hi.y+pad&&p.z>lo.z-pad&&p.z<hi.z+pad){
     const candidates=[['x',lo.x-pad,p.x-(lo.x-pad),-1],['x',hi.x+pad,hi.x+pad-p.x,1],['y',lo.y-pad,p.y-(lo.y-pad),-1],['y',hi.y+pad,hi.y+pad-p.y,1],['z',lo.z-pad,p.z-(lo.z-pad),-1],['z',hi.z+pad,hi.z+pad-p.z,1]].sort((a,b)=>a[2]-b[2]);const [axis,value,,normal]=candidates[0];p[axis]=value+normal*.015;this.velocity[axis]=0;this.collision=true;
    }
   }
   for(const axis of ['x','z']){if(Math.abs(p[axis])>55){p[axis]=Math.sign(p[axis])*55;this.velocity[axis]=0;this.collision=true;}}
   if(p.y<1.3||p.y>72){p.y=Math.max(1.3,Math.min(72,p.y));this.velocity.y=0;this.collision=true;}
   this.position=p;
  }
  if(this.collision)this.collisionTimer=.3;this.collision=this.collisionTimer>0;
  this.bank+=(s*.09-this.bank)*(1-Math.exp(-4*dt));this.tilt+=(f*.10-this.tilt)*(1-Math.exp(-4*dt));
 }
 aim(){const c=Math.cos(this.pitch);return{x:Math.sin(this.yaw)*c,y:Math.sin(this.pitch),z:Math.cos(this.yaw)*c};}
 ready(){return this.cooldown<=0;}
 launch(){if(!this.ready())return false;this.cooldown=.55;return true;}
}
