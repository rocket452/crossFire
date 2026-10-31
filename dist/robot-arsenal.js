// Start with a five-second grace period; each cleared attack also pauses five seconds.
export class RobotArsenal {
 constructor({plasma=false}={}){this.plasma=plasma;this.warningSeconds=2;this.delaySeconds=5;this.startupSeconds=5;this.reset();}
 reset(){this.phase='startup';this.nextPhase='beam';this.elapsed=0;this.clock=0;this.completedBeams=0;this.turns=[];this.transitions=[];}
 rest(nextPhase){this.phase='recovery';this.nextPhase=nextPhase;this.elapsed=0;this.transitions.push({event:'rest',time:this.clock,next:nextPhase});this.transitions=this.transitions.slice(-18);}
 preparing(robot,artillery){return robot.weapon.phase==='charging'||this.phase==='warning'||!!artillery?.shells.some(s=>s.state==='warning');}
 interrupt(robot,pod,artillery){
  const phase=this.phase;
  if(['charging','firing'].includes(robot.weapon.phase)){robot.weapon.phase='cooling';robot.weapon.elapsed=0;robot.weapon.remaining=robot.weapon.coolSeconds;robot.weapon.damageClock=0;robot.aiming=false;robot.target=null;robot.onBeam(null);}
  pod.pending=0;
  for(const shell of artillery?.shells||[])if(shell.state==='warning'){artillery.removeShell(shell);artillery.cancelled++;}
  if(artillery){artillery.shells=artillery.shells.filter(s=>s.state!=='warning');artillery.muzzleGlow.visible=false;}
  this.completedBeams=robot.weapon.bursts;
  if(['beam','warning','salvo','clear','plasma','plasma-clear'].includes(phase))this.rest(phase==='beam'?'warning':['warning','salvo','clear'].includes(phase)?(this.plasma?'plasma':'beam'):'beam');
 }
 // Pick the first intact mount at or after the requested turn. Test actors without
 // component durability retain the original complete arsenal.
 availablePhase(robot,requested){
  const order=this.plasma?['beam','warning','plasma']:['beam','warning'],slots={beam:'beam',warning:'missiles',plasma:'plasma'},start=Math.max(0,order.indexOf(requested));
  for(let i=0;i<order.length;i++){const phase=order[(start+i)%order.length];if(robot.isWeaponWorking?.(slots[phase])!==false)return phase;}return 'disarmed';
 }
 weaponDestroyed(id,robot,pod,artillery){
  if(id==='eyes')return;
  if(id==='missiles'&&pod){pod.pending=0;if(['warning','salvo'].includes(this.phase)){this.phase='clear';this.elapsed=0;}}
  if(id==='plasma'&&artillery){for(const shell of artillery.shells)if(shell.state==='warning'){artillery.removeShell(shell);artillery.cancelled++;}artillery.shells=artillery.shells.filter(s=>s.state!=='warning');artillery.muzzleGlow.visible=false;if(this.phase==='plasma'){this.phase='plasma-clear';this.elapsed=0;}}
  if(id==='beam'&&this.phase==='beam'){this.completedBeams=robot.weapon.bursts;this.rest(this.availablePhase(robot,'warning'));}
  if(['startup','recovery'].includes(this.phase))this.nextPhase=this.availablePhase(robot,this.nextPhase);
  robot.beamAllowed=false;
 }
 beforeBeam(robot,pod,artillery){robot.beamAllowed=robot.isWeaponWorking?.('beam')!==false&&!robot.stunRemaining&&this.phase==='beam'&&!pod.pending&&!pod.missiles.some(m=>m.alive)&&!artillery?.busy;}
 update(dt,robot,pod,artillery){
  if(robot.stunRemaining>0)return;this.clock+=dt;if(robot.dead){this.phase='off';this.nextPhase=null;this.elapsed=0;return;}this.elapsed+=dt;
  if(this.phase==='beam'&&robot.isWeaponWorking?.('beam')===false)this.weaponDestroyed('beam',robot,pod,artillery);
  if(['warning','salvo'].includes(this.phase)&&robot.isWeaponWorking?.('missiles')===false)this.weaponDestroyed('missiles',robot,pod,artillery);
  if(this.phase==='plasma'&&robot.isWeaponWorking?.('plasma')===false)this.weaponDestroyed('plasma',robot,pod,artillery);
  if(this.phase==='plasma'){if(artillery?.beginVolley()){this.turns.push({weapon:'plasma',time:this.clock});this.phase='plasma-clear';this.elapsed=0;}else if(this.elapsed>1)this.rest('beam');}
  else if(this.phase==='plasma-clear'&&!artillery?.busy)this.rest('beam');
  else if(this.phase==='beam'&&robot.weapon.bursts>this.completedBeams&&robot.weapon.phase==='cooling'){
   this.completedBeams=robot.weapon.bursts;this.turns.push({weapon:'beam',time:this.clock});this.rest('warning');
  }else if(this.phase==='warning'&&this.elapsed>=this.warningSeconds){
   if(pod.beginSalvo()){this.turns.push({weapon:'pod',time:this.clock});this.phase='salvo';this.elapsed=0;}
  }else if(this.phase==='salvo'&&!pod.pending){this.phase='clear';this.elapsed=0;}
  else if(this.phase==='clear'&&!pod.missiles.some(m=>m.alive))this.rest(this.plasma?'plasma':'beam');
  else if(['startup','recovery'].includes(this.phase)&&this.elapsed>=(this.phase==='startup'?this.startupSeconds:this.delaySeconds)-1e-9){this.phase=this.availablePhase(robot,this.nextPhase);this.nextPhase=null;this.transitions.push({event:'ready',time:this.clock,next:this.phase});this.transitions=this.transitions.slice(-18);this.elapsed=0;}
  this.turns=this.turns.slice(-12);
 }
 warning(){const active=this.phase==='warning',progress=active?Math.min(1,this.elapsed/this.warningSeconds):0;return{active,progress,pulse:active&&Math.floor(this.elapsed*(4+progress*2)*2)%2===0};}
 diagnostics(){return{phase:this.phase,seconds:this.elapsed,delaySeconds:this.delaySeconds,startupSeconds:this.startupSeconds,startupRemaining:this.phase==='startup'?Math.max(0,this.startupSeconds-this.elapsed):0,nextPhase:this.nextPhase,delayRemaining:this.phase==='recovery'?Math.max(0,this.delaySeconds-this.elapsed):0,warningSeconds:this.warningSeconds,warning:this.warning(),turns:this.turns.map(t=>({...t})),transitions:this.transitions.map(t=>({...t}))};}
}
