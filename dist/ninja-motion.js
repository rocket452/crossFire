import {RunnerMotion,terrainHeight} from './runner-motion.js?v=robot-experiments-108';
// Jump height scales with launch speed squared: sqrt(0.7) lowers only the first jump by 30%.
export const NINJA=Object.freeze({runSpeed:32.2,airSpeed:32.2,airAcceleration:5,airDrag:.15,wallPushSpeed:12.6,wallJumpSpeed:40,jumpSpeed:34*Math.sqrt(.7),doubleJumpSpeed:30,gravity:32,fallGravity:44,terminalSpeed:52,coyoteSeconds:.1,jumpBufferSeconds:.15,dashRange:48,dashSpeed:128.8,dashCooldown:6,dashDamage:320,slowFallSeconds:2,slowFallGravity:.12,slowFallSpeed:3,shurikenDamage:55,throwInterval:.22,shurikenSpeed:59.5,shurikenScale:2,shurikenRadius:.24,shurikenRange:127.5,maxProjectiles:36});
const normalize=v=>{const n=Math.hypot(v.x,v.y,v.z);return n>1e-6?{x:v.x/n,y:v.y/n,z:v.z/n}:null;};
// Uses the same swept walls, roofs, terrain and overlap recovery as Volt, without wall running.
export class NinjaMotion {
 constructor({sweep=()=>null,onHit=()=>({killed:false}),onDashEnd=()=>{}}={}){Object.assign(this,{sweep,onHit,onDashEnd});this.body=new RunnerMotion({runSpeed:NINJA.runSpeed,boostSpeed:NINJA.runSpeed,wallRun:false});this.reset();}
 get position(){return this.body.position;}get velocity(){return this.body.velocity;}get mode(){return this.body.mode;}get active(){return this.dash!==null;}
 reset(){this.body.reset({x:0,y:.08,z:27});this.jumps=0;this.jumpCount=0;this.doubleJumps=0;this.dash=null;this.cooldown=0;this.slowFall=0;this.dashes=0;this.resets=0;this.jumpRequested=false;this.jumpBuffer=0;this.coyote=0;this.airAge=0;this.lastResult=null;this.wallJumps=0;this.wallKick=0;this.wallJumpLock=0;this.wallNormal=null;}
 jump(){this.jumpRequested=true;}
 startDash(target){
  if(this.dash||this.cooldown>1e-8)return false;
  const p=this.position,grounded=this.mode==='ground',direction=normalize({x:target.x-p.x,y:grounded?0:target.y-(p.y+1.2),z:target.z-p.z})||(grounded?{x:Math.sin(this.body.yaw),y:0,z:Math.cos(this.body.yaw)}:null);if(!direction)return false;
  this.dash={direction,grounded,remaining:NINJA.dashRange,origin:{...p},hitUnits:new Set()};this.cooldown=NINJA.dashCooldown;this.slowFall=0;this.jumpBuffer=this.coyote=0;this.dashes++;if(!grounded){this.body.support=null;this.body.mode='air';}return true;
 }
 wallJump(sections){
  if(this.mode!=='air'||this.wallJumpLock>0)return false;
  this.body.near=sections.filter(c=>!c.hidden&&c.state==='intact'&&c.type==='wall'&&c.building);
  const p=this.position,from={x:p.x,y:p.y+1.2,z:p.z};let best=null;
  for(let i=0;i<8;i++){const a=i*Math.PI/4,hit=this.body.trace(from,{x:p.x+Math.sin(a)*1.55,y:from.y,z:p.z+Math.cos(a)*1.55},.12);if(hit&&Math.abs(hit.normal.y)<.25&&(!best||hit.t<best.t))best=hit;}
  if(!best)return false;
  this.wallNormal={...best.normal};this.body.mode='air';this.body.support=null;this.body.normal={x:0,y:1,z:0};this.body.velocity={x:best.normal.x*NINJA.wallPushSpeed,y:NINJA.wallJumpSpeed,z:best.normal.z*NINJA.wallPushSpeed};this.jumps=1;this.jumpCount++;this.wallJumps++;this.wallKick=.22;this.wallJumpLock=.35;this.slowFall=0;this.airAge=0;return true;
 }
 finishDash(){if(!this.dash)return;const groundDash=this.dash.grounded;this.dash=null;this.slowFall=this.mode==='air'?NINJA.slowFallSeconds:0;this.body.velocity={x:0,y:groundDash?this.mode==='ground'?0:this.velocity.y:1.5,z:0};this.onDashEnd({...this.position});}
 applyDashHit(hit){const key=hit.unit||hit.missile;if(key&&this.dash?.hitUnits.has(key))return;if(key)this.dash?.hitUnits.add(key);this.lastResult=this.onHit(hit)||{};if(this.lastResult.killed){this.cooldown=0;this.resets++;}}
 applyDashContacts(sweep,fraction){for(const hit of sweep?.contacts||[])if(hit.t<=fraction+1e-8)this.applyDashHit(hit);}
 stepGroundDash(dt,sections){
  // Keep real floor/roof support, step handling and gravity. Short sweeps also catch
  // enemies at dash speed without treating the walkable floor as an attack hit.
  const steps=Math.ceil(dt/Math.min(.008,.5/NINJA.dashSpeed)),h=dt/steps;
  for(let i=0;i<steps&&this.active;i++){
   const d=this.dash.direction,from={...this.position},length=Math.min(this.dash.remaining,NINJA.dashSpeed*h),to={x:from.x+d.x*length,y:from.y,z:from.z+d.z*length},sweep=this.sweep(from,to,true),hit=sweep?.blocking===false?null:sweep,fraction=hit?Math.max(0,hit.t-.025/Math.max(length,.001)):1,travel=length*fraction;
   this.body.yaw=Math.atan2(d.x,d.z);this.body.runSpeed=this.body.boostSpeed=NINJA.dashSpeed;this.velocity.x=d.x*NINJA.dashSpeed;this.velocity.z=d.z*NINJA.dashSpeed;
   if(travel>0)this.body.step({forward:1,player:true,gravityScale:NINJA.gravity/25,fallGravityScale:NINJA.fallGravity/25,fallSpeed:NINJA.terminalSpeed},travel/NINJA.dashSpeed,sections);
   this.dash.remaining-=length;const moved=(this.position.x-from.x)*d.x+(this.position.z-from.z)*d.z;
   this.applyDashContacts(sweep,Math.min(1,Math.max(0,moved/Math.max(length,1e-8))));
   if(this.mode==='ground')this.jumps=0;else if(this.jumps===0)this.jumps=1;
   if(hit){this.applyDashHit(hit);this.finishDash();}
   else if(this.dash.remaining<=1e-6||moved<travel-1e-4)this.finishDash();
  }
 }
 step(input,dt,sections=[]){
  if(!(dt>0))return;dt=Math.min(dt,.15);this.cooldown=Math.max(0,this.cooldown-dt);this.wallJumpLock=Math.max(0,this.wallJumpLock-dt);this.slowFall=Math.max(0,this.slowFall-dt);
  if(this.active){
   if(this.dash.grounded){this.stepGroundDash(dt,sections);this.jumpRequested=false;return;}
   const d=this.dash.direction,p=this.position,start={...p},length=Math.min(this.dash.remaining,NINJA.dashSpeed*dt),to={x:p.x+d.x*length,y:p.y+d.y*length,z:p.z+d.z*length},sweep=this.sweep(p,to),hit=sweep?.blocking===false?null:sweep,t=hit?Math.max(0,hit.t-.025/Math.max(length,.001)):1;
   p.x+=(to.x-p.x)*t;p.y+=(to.y-p.y)*t;p.z+=(to.z-p.z)*t;const bounds=this.body.bounds;p.x=Math.max(bounds.minX,Math.min(bounds.maxX,p.x));p.z=Math.max(bounds.minZ,Math.min(bounds.maxZ,p.z));
   this.body.velocity={x:d.x*NINJA.dashSpeed,y:d.y*NINJA.dashSpeed,z:d.z*NINJA.dashSpeed};this.body.speed=length*t/dt;this.dash.remaining-=length;this.applyDashContacts(sweep,Math.min(1,Math.max(0,((p.x-start.x)*d.x+(p.y-start.y)*d.y+(p.z-start.z)*d.z)/Math.max(length,1e-8))));
   if(hit){this.applyDashHit(hit);this.finishDash();}
   else if(this.dash.remaining<=1e-6||p.y<=terrainHeight(p.x,p.z))this.finishDash();
   if(p.y<terrainHeight(p.x,p.z)){p.y=terrainHeight(p.x,p.z);this.body.mode='ground';this.jumps=0;this.slowFall=0;}
   this.jumpRequested=false;return;
  }
  // Keep a short ledge grace window and retain an early jump press through touchdown.
  const wasGround=this.mode==='ground';this.airAge=wasGround?0:this.airAge+dt;this.coyote=wasGround?NINJA.coyoteSeconds:Math.max(0,this.coyote-dt);if(wasGround)this.jumps=0;else if(this.jumps===0&&this.coyote<=0)this.jumps=1;
  if(this.jumpRequested)this.jumpBuffer=NINJA.jumpBufferSeconds;
  if(this.jumpBuffer>0&&this.wallJump(sections)){this.jumpBuffer=this.coyote=0;}
  if(this.jumpBuffer>0&&this.jumps<2){const second=this.jumps>0;this.body.velocity.y=second?NINJA.doubleJumpSpeed:NINJA.jumpSpeed;this.body.mode='air';this.body.normal={x:0,y:1,z:0};this.body.support=null;this.body.departedSupportY=null;this.body.jumpBuffer=this.body.coyote=this.jumpBuffer=this.coyote=0;this.jumps++;this.jumpCount++;if(second)this.doubleJumps++;this.slowFall=0;this.airAge=0;}
  this.jumpRequested=false;
  this.body.runSpeed=this.body.boostSpeed=this.mode==='air'?NINJA.airSpeed:NINJA.runSpeed;
  if(this.wallKick>0){this.wallKick=Math.max(0,this.wallKick-dt);this.body.yaw=Math.atan2(this.wallNormal.x,this.wallNormal.z);input={forward:NINJA.wallPushSpeed/NINJA.airSpeed,strafe:0};}
  this.body.step({...input,player:true,jump:false,airAcceleration:NINJA.airAcceleration,airDrag:NINJA.airDrag,gravityScale:this.slowFall>0?NINJA.slowFallGravity:NINJA.gravity/25,fallGravityScale:this.slowFall>0?NINJA.slowFallGravity:NINJA.fallGravity/25,fallSpeed:this.slowFall>0?NINJA.slowFallSpeed:NINJA.terminalSpeed},dt,sections);
  this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  if(this.mode==='ground'){this.jumps=0;this.slowFall=0;}
 }
 diagnostics(){return{...this.body.diagnostics(),jumpBuffer:this.jumpBuffer,coyote:this.coyote,airAge:this.airAge,wallJumps:this.wallJumps,wallKick:this.wallKick,jumpsUsed:this.jumps,jumpsRemaining:2-this.jumps,jumpCount:this.jumpCount,doubleJumps:this.doubleJumps,dashing:this.active,dashCooldown:this.cooldown,slowFall:this.slowFall,dashes:this.dashes,killResets:this.resets,dash:this.dash?{direction:{...this.dash.direction},grounded:this.dash.grounded,remaining:this.dash.remaining}:null,config:{...NINJA}};}
}
