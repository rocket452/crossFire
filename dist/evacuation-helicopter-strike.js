// Scene-specific scheduling around the existing arsenal: helicopter intent always uses missiles.
export class EvacuationHelicopterStrike {
 constructor({robot,pod,artillery,arsenal,isEligible}){Object.assign(this,{robot,pod,artillery,arsenal,isEligible});this.reset();}
 reset(){this.target=null;this.resume=null;this.active=false;this.overrides=0;}
 get busy(){return !!this.target;}
 get missileTarget(){return this.target&&this.isEligible(this.target)&&this.robot.isWeaponWorking('missiles')?this.target:null;}
 resumePhase(){const a=this.arsenal;if(['startup','recovery'].includes(a.phase))return a.nextPhase||'beam';if(['warning','salvo','clear'].includes(a.phase))return a.plasma?'plasma':'beam';return a.phase.startsWith('plasma')?'plasma':'beam';}
 request(target){if(this.robot.dead||!this.robot.isWeaponWorking('missiles')||!this.isEligible(target))return false;if(!this.target){this.target=target;this.resume=this.resumePhase();}this.robot.beamAllowed=false;this.update();return true;}
 clear(){this.target=null;this.resume=null;this.active=false;}
 update(){
  if(!this.target)return;const {robot:r,pod:p,artillery:t,arsenal:a}=this;
  if(r.dead){this.clear();return;}
  const eligible=!!this.missileTarget;
  if(this.active){
   // The original arsenal owns salvo flight clearance, stun recovery and five-second rest.
   if(a.phase==='recovery'){a.nextPhase=a.availablePhase(r,this.resume);this.clear();return;}
   if(!eligible&&a.phase==='warning'){a.rest(a.availablePhase(r,this.resume));this.clear();return;}
   if(!eligible&&a.phase==='salvo'){p.pending=0;a.phase='clear';a.elapsed=0;}
   return;
  }
  if(!eligible){this.clear();return;}
  if(r.stunRemaining>0||a.phase==='startup'&&a.elapsed<a.startupSeconds)return;
  if(r.weapon.phase==='firing'||p.pending||p.missiles.some(m=>m.alive)||t.shells.some(s=>s.state==='flying'))return;
  if(r.weapon.phase==='charging'){
   r.weapon.phase='cooling';r.weapon.elapsed=0;r.weapon.remaining=r.weapon.coolSeconds;r.weapon.damageClock=0;r.onBeam(null);
  }
  for(const shell of t.shells)if(shell.state==='warning'){t.removeShell(shell);t.cancelled++;}
  t.shells=t.shells.filter(s=>s.state!=='warning');t.muzzleGlow.visible=false;
  r.target=null;r.aiming=false;r.beamAllowed=false;a.completedBeams=r.weapon.bursts;
  a.phase='warning';a.nextPhase=null;a.elapsed=0;
  a.transitions.push({event:'helicopter-missiles',time:a.clock,target:this.target.id,resume:this.resume});a.transitions=a.transitions.slice(-18);
  this.active=true;this.overrides++;
 }
 diagnostics(){return{target:this.target?.id||null,active:this.active,resume:this.resume,overrides:this.overrides};}
}
