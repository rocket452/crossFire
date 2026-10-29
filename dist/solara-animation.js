const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
export const SOLARA_ANIMATION=Object.freeze({releaseSeconds:.36,blendResponse:12,turnLimit:1.8});
// Cosmetic motion only: simulation owns travel, attack cadence and dome growth.
export class SolaraAnimation {
 constructor(){this.reset();}
 reset(){this.phase=0;this.speed=0;this.carve=0;this.drive=0;this.fire=0;this.ice=0;this.previousSpeed=0;this.pose=null;}
 sample(dt,{speed=0,turnRate=0,charge=0,release=-1,ice=0,fireActive=false,iceActive=false}={}){
  // The orbit is often only 2–3 m/s; keep that glide expressive too.
  const h=Math.max(0,dt),blend=1-Math.exp(-SOLARA_ANIMATION.blendResponse*h),ratio=clamp(Math.sqrt(Math.max(0,speed)/20)),acceleration=h?clamp((speed-this.previousSpeed)/h/35,-1,1):0;this.previousSpeed=speed;
  this.speed=mix(this.speed,ratio,blend);this.carve=mix(this.carve,clamp(turnRate/SOLARA_ANIMATION.turnLimit,-1,1),blend);this.drive=mix(this.drive,acceleration,1-Math.exp(-6*h));this.fire=mix(this.fire,fireActive?1:0,blend);this.ice=mix(this.ice,iceActive?1:0,blend);this.phase+=h*(1.15+this.speed*.65);
  const s=this.speed,turn=this.carve,cycle=Math.sin(this.phase),sway=Math.sin(this.phase*.5),breath=Math.sin(this.phase*.65),q=clamp(charge),r=release>=0?clamp(release):0;
  // Gather by the shoulder, accelerate through release, then relax the elbow.
  const wind=fireActive?(release>=0?1-r:Math.sin(Math.PI*q*.88)):0,extend=release>=0?1-.28*r:clamp((q-.70)/.30)**2,iceLift=iceActive?Math.sin(clamp(ice)*Math.PI*.8):0;
  // Side-on surf stance, front foot leading, with small balance corrections.
  this.pose={
   mode:iceActive?'ice-summon':release>=0?'fire-release':fireActive?'fire-windup':Math.abs(turn)>.25?'carve':s>.65?'fast-glide':s>.10?'glide':'idle',phase:this.phase,speedBlend:s,carve:turn,fireBlend:this.fire,iceBlend:this.ice,
   pelvis:{x:.025*sway+.04*turn,y:-.24-.16*s+.012*breath-.02*wind*this.fire,z:.018*cycle-.025*s,pitch:.035+.035*s,yaw:.88+.025*sway-.09*turn,roll:-.07*turn},
   spine:{pitch:.06+.10*s+.035*this.drive-.04*wind*this.fire,yaw:-.20-.13*turn+.025*cycle+this.fire*(.24*wind-.20*extend)-this.ice*.17*iceLift,roll:-.17*turn+.012*sway},
   head:{pitch:-.045-.06*s,yaw:.05*sway},
   feet:{R:{x:-.16-.015*s,z:.50+.035*s,y:.17,yaw:.85-.08*turn},L:{x:.16+.015*s,z:-.47-.03*s,y:.17,yaw:1.10-.08*turn}},
   hands:{R:{x:-.43-.015*s-.05*turn,y:1.25+.025*breath-.04*s,z:.43+.06*s+.018*cycle},L:{x:.45+.015*s-.05*turn,y:1.25-.025*breath-.02*s,z:-.40-.06*s-.018*cycle}},
   fire:{wind,extend,release:r},ice:{lift:iceLift,progress:clamp(ice)},shoulderSwing:.020*cycle,
  };return this.pose;
 }
 diagnostics(){return this.pose?{mode:this.pose.mode,phase:this.phase,speedBlend:this.speed,carve:this.carve,fireBlend:this.fire,iceBlend:this.ice,pelvis:{...this.pose.pelvis},spine:{...this.pose.spine}}:{mode:'idle',phase:0,speedBlend:0,carve:0,fireBlend:0,iceBlend:0};}
}
