import {RunnerMotion,terrainHeight} from './runner-motion.js?v=ninja-82';
export const NINJA=Object.freeze({runSpeed:46,jumpSpeed:30,doubleJumpSpeed:27,gravity:25,dashRange:24,dashSpeed:92,dashCooldown:6,dashDamage:320,slowFallSeconds:2,slowFallGravity:.12,slowFallSpeed:3,shurikenDamage:55,throwInterval:.22,shurikenSpeed:85,maxProjectiles:36});
const normalize=v=>{const n=Math.hypot(v.x,v.y,v.z);return n>1e-6?{x:v.x/n,y:v.y/n,z:v.z/n}:null;};
// Uses the same swept walls, roofs, terrain and overlap recovery as Volt, without wall running.
export class NinjaMotion {
 constructor({sweep=()=>null,onHit=()=>({killed:false}),onDashEnd=()=>{}}={}){Object.assign(this,{sweep,onHit,onDashEnd});this.body=new RunnerMotion({runSpeed:NINJA.runSpeed,boostSpeed:NINJA.runSpeed,wallRun:false});this.reset();}
 get position(){return this.body.position;}get velocity(){return this.body.velocity;}get mode(){return this.body.mode;}get active(){return this.dash!==null;}
 reset(){this.body.reset({x:0,y:.08,z:27});this.jumps=0;this.jumpCount=0;this.doubleJumps=0;this.dash=null;this.cooldown=0;this.slowFall=0;this.dashes=0;this.resets=0;this.jumpRequested=false;this.lastResult=null;this.wallJumps=0;this.wallKick=0;this.wallJumpLock=0;this.wallNormal=null;}
 jump(){this.jumpRequested=true;}
 startDash(target){
  if(this.mode!=='air'||this.dash||this.cooldown>1e-8)return false;
  const p=this.position,direction=normalize({x:target.x-p.x,y:target.y-(p.y+1.2),z:target.z-p.z});if(!direction)return false;
  this.dash={direction,remaining:NINJA.dashRange,origin:{...p}};this.cooldown=NINJA.dashCooldown;this.slowFall=0;this.dashes++;this.body.support=null;this.body.mode='air';return true;
 }
 wallJump(sections){
  if(this.mode!=='air'||this.wallJumpLock>0)return false;
  this.body.near=sections.filter(c=>!c.hidden&&c.state==='intact'&&c.type==='wall'&&c.building);
  const p=this.position,from={x:p.x,y:p.y+1.2,z:p.z};let best=null;
  for(let i=0;i<8;i++){const a=i*Math.PI/4,hit=this.body.trace(from,{x:p.x+Math.sin(a)*1.55,y:from.y,z:p.z+Math.cos(a)*1.55},.12);if(hit&&Math.abs(hit.normal.y)<.25&&(!best||hit.t<best.t))best=hit;}
  if(!best)return false;
  this.wallNormal={...best.normal};this.body.mode='air';this.body.support=null;this.body.normal={x:0,y:1,z:0};this.body.velocity={x:best.normal.x*18,y:36,z:best.normal.z*18};this.jumps=1;this.jumpCount++;this.wallJumps++;this.wallKick=.22;this.wallJumpLock=.35;this.slowFall=0;return true;
 }
 finishDash(){if(!this.dash)return;this.dash=null;this.slowFall=NINJA.slowFallSeconds;this.body.velocity={x:0,y:1.5,z:0};this.onDashEnd({...this.position});}
 step(input,dt,sections=[]){
  if(!(dt>0))return;dt=Math.min(dt,.15);this.cooldown=Math.max(0,this.cooldown-dt);this.wallJumpLock=Math.max(0,this.wallJumpLock-dt);this.slowFall=Math.max(0,this.slowFall-dt);
  if(this.active){
   const d=this.dash.direction,p=this.position,length=Math.min(this.dash.remaining,NINJA.dashSpeed*dt),to={x:p.x+d.x*length,y:p.y+d.y*length,z:p.z+d.z*length},hit=this.sweep(p,to),t=hit?Math.max(0,hit.t-.025/Math.max(length,.001)):1;
   p.x+=(to.x-p.x)*t;p.y+=(to.y-p.y)*t;p.z+=(to.z-p.z)*t;const bounds=this.body.bounds;p.x=Math.max(bounds.minX,Math.min(bounds.maxX,p.x));p.z=Math.max(bounds.minZ,Math.min(bounds.maxZ,p.z));
   this.body.velocity={x:d.x*NINJA.dashSpeed,y:d.y*NINJA.dashSpeed,z:d.z*NINJA.dashSpeed};this.body.speed=length*t/dt;this.dash.remaining-=length;
   if(hit){this.lastResult=this.onHit(hit)||{};if(this.lastResult.killed){this.cooldown=0;this.resets++;}this.finishDash();}
   else if(this.dash.remaining<=1e-6||p.y<=terrainHeight(p.x,p.z))this.finishDash();
   if(p.y<terrainHeight(p.x,p.z)){p.y=terrainHeight(p.x,p.z);this.body.mode='ground';this.jumps=0;this.slowFall=0;}
   this.jumpRequested=false;return;
  }
  const wasGround=this.mode==='ground';if(wasGround)this.jumps=0;else if(this.jumps===0)this.jumps=1;
  if(this.jumpRequested&&this.wallJump(sections)){this.jumpRequested=false;}
  if(this.jumpRequested&&this.jumps<2){const second=this.jumps>0;this.body.velocity.y=second?NINJA.doubleJumpSpeed:NINJA.jumpSpeed;this.body.mode='air';this.body.normal={x:0,y:1,z:0};this.body.support=null;this.body.jumpBuffer=this.body.coyote=0;this.jumps++;this.jumpCount++;if(second)this.doubleJumps++;this.slowFall=0;}
  this.jumpRequested=false;
  if(this.wallKick>0){this.wallKick=Math.max(0,this.wallKick-dt);this.body.yaw=Math.atan2(this.wallNormal.x,this.wallNormal.z);input={forward:18/NINJA.runSpeed,strafe:0};}
  this.body.step({...input,player:true,jump:false,gravityScale:NINJA.gravity/25*(this.slowFall>0?NINJA.slowFallGravity:1),fallSpeed:this.slowFall>0?NINJA.slowFallSpeed:45},dt,sections);
  if(this.mode==='ground'){this.jumps=0;this.slowFall=0;}
 }
 diagnostics(){return{...this.body.diagnostics(),wallJumps:this.wallJumps,wallKick:this.wallKick,jumpsUsed:this.jumps,jumpsRemaining:2-this.jumps,jumpCount:this.jumpCount,doubleJumps:this.doubleJumps,dashing:this.active,dashCooldown:this.cooldown,slowFall:this.slowFall,dashes:this.dashes,killResets:this.resets,dash:this.dash?{direction:{...this.dash.direction},remaining:this.dash.remaining}:null,config:{...NINJA}};}
}
