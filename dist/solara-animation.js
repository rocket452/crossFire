const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
export const SOLARA_ANIMATION=Object.freeze({releaseSeconds:.36,blendResponse:12,turnLimit:1.8});
// Cosmetic motion only: simulation owns travel, attack cadence and dome growth.
export class SolaraAnimation {
 constructor(){this.reset();}
 reset(){this.phase=0;this.speed=0;this.carve=0;this.drive=0;this.fire=0;this.ice=0;this.previousSpeed=0;this.pose=null;}
 sample(dt,{speed=0,turnRate=0,charge=0,release=-1,ice=0,fireActive=false,iceActive=false}={}){
  // The orbit is often only 2–3 m/s; keep that glide expressive too.
  const h=Math.max(0,dt),blend=1-Math.exp(-SOLARA_ANIMATION.blendResponse*h),ratio=clamp(Math.sqrt(Math.max(0,speed)/20)),acceleration=h?clamp((speed-this.previousSpeed)/h/35,-1,1):0;this.previousSpeed=speed;
  this.speed=mix(this.speed,ratio,blend);this.carve=mix(this.carve,clamp(turnRate/SOLARA_ANIMATION.turnLimit,-1,1),blend);this.drive=mix(this.drive,acceleration,1-Math.exp(-6*h));this.fire=mix(this.fire,fireActive?1:0,blend);this.ice=mix(this.ice,iceActive?1:0,blend);this.phase+=h*(1.6+this.speed*4.2);
  const s=this.speed,turn=this.carve,cycle=Math.sin(this.phase),sway=Math.sin(this.phase*.5),breath=Math.sin(this.phase*.65),q=clamp(charge),r=release>=0?clamp(release):0;
  // Gather by the shoulder, accelerate through release, then relax the elbow.
  const wind=fireActive?(release>=0?1-r:Math.sin(Math.PI*q*.88)):0,extend=release>=0?1-.28*r:clamp((q-.70)/.30)**2,iceLift=iceActive?Math.sin(clamp(ice)*Math.PI*.8):0;
  this.pose={
   mode:iceActive?'ice-summon':release>=0?'fire-release':fireActive?'fire-windup':Math.abs(turn)>.25?'carve':s>.65?'fast-glide':s>.10?'glide':'idle',phase:this.phase,speedBlend:s,carve:turn,fireBlend:this.fire,iceBlend:this.ice,
   pelvis:{x:.035*sway+.045*turn,y:-.05-.16*s+.018*breath-.035*wind*this.fire,z:-.04*s,pitch:.025+.055*s,yaw:.055*cycle*s-.10*turn,roll:-.08*turn},
   spine:{pitch:.035+.14*s+.045*this.drive-.055*wind*this.fire,yaw:-.18*turn+.07*cycle*s+this.fire*(.28*wind-.20*extend)-this.ice*.17*iceLift,roll:-.20*turn+.018*sway},
   head:{pitch:-.045-.06*s,yaw:.05*sway},
   feet:{R:{x:-.25-.025*s,z:.32+.09*s+.025*cycle*s,y:.17,yaw:-.12-.08*turn},L:{x:.25+.025*s,z:-.32-.09*s+.02*cycle*s,y:.17,yaw:.10-.08*turn}},
   hands:{R:{x:-.57-.10*s-.10*turn,y:1.27+.08*breath-.10*s,z:.16-.32*s+.07*cycle*s},L:{x:.57+.17*s-.08*turn,y:1.30-.07*breath+.10*s,z:.12-.25*s-.08*cycle*s}},
   fire:{wind,extend,release:r},ice:{lift:iceLift,progress:clamp(ice)},shoulderSwing:.045*cycle*s,
  };return this.pose;
 }
 diagnostics(){return this.pose?{mode:this.pose.mode,phase:this.phase,speedBlend:this.speed,carve:this.carve,fireBlend:this.fire,iceBlend:this.ice,pelvis:{...this.pose.pelvis},spine:{...this.pose.spine}}:{mode:'idle',phase:0,speedBlend:0,carve:0,fireBlend:0,iceBlend:0};}
}
