// Start with a five-second grace period; each cleared attack also pauses five seconds.
export class RobotArsenal {
 constructor({plasma=false}={}){this.plasma=plasma;this.warningSeconds=2;this.delaySeconds=5;this.startupSeconds=5;this.reset();}
 reset(){this.phase='startup';this.nextPhase='beam';this.elapsed=0;this.clock=0;this.completedBeams=0;this.turns=[];this.transitions=[];}
 rest(nextPhase){this.phase='recovery';this.nextPhase=nextPhase;this.elapsed=0;this.transitions.push({event:'rest',time:this.clock,next:nextPhase});this.transitions=this.transitions.slice(-18);}
 beforeBeam(robot,pod,artillery){robot.beamAllowed=this.phase==='beam'&&!pod.pending&&!pod.missiles.some(m=>m.alive)&&!artillery?.busy;}
 update(dt,robot,pod,artillery){
  this.clock+=dt;if(robot.dead){this.phase='off';this.nextPhase=null;this.elapsed=0;return;}this.elapsed+=dt;
  if(this.phase==='plasma'){if(artillery?.beginVolley()){this.turns.push({weapon:'plasma',time:this.clock});this.phase='plasma-clear';this.elapsed=0;}else if(this.elapsed>1)this.rest('beam');}
  else if(this.phase==='plasma-clear'&&!artillery?.busy)this.rest('beam');
  else if(this.phase==='beam'&&robot.weapon.bursts>this.completedBeams&&robot.weapon.phase==='cooling'){
   this.completedBeams=robot.weapon.bursts;this.turns.push({weapon:'beam',time:this.clock});this.rest('warning');
  }else if(this.phase==='warning'&&this.elapsed>=this.warningSeconds){
   if(pod.beginSalvo()){this.turns.push({weapon:'pod',time:this.clock});this.phase='salvo';this.elapsed=0;}
  }else if(this.phase==='salvo'&&!pod.pending){this.phase='clear';this.elapsed=0;}
  else if(this.phase==='clear'&&!pod.missiles.some(m=>m.alive))this.rest(this.plasma?'plasma':'beam');
  else if(['startup','recovery'].includes(this.phase)&&this.elapsed>=(this.phase==='startup'?this.startupSeconds:this.delaySeconds)-1e-9){this.phase=this.nextPhase;this.nextPhase=null;this.transitions.push({event:'ready',time:this.clock,next:this.phase});this.transitions=this.transitions.slice(-18);this.elapsed=0;}
  this.turns=this.turns.slice(-12);
 }
 warning(){const active=this.phase==='warning',progress=active?Math.min(1,this.elapsed/this.warningSeconds):0;return{active,progress,pulse:active&&Math.floor(this.elapsed*(4+progress*2)*2)%2===0};}
 diagnostics(){return{phase:this.phase,seconds:this.elapsed,delaySeconds:this.delaySeconds,startupSeconds:this.startupSeconds,startupRemaining:this.phase==='startup'?Math.max(0,this.startupSeconds-this.elapsed):0,nextPhase:this.nextPhase,delayRemaining:this.phase==='recovery'?Math.max(0,this.delaySeconds-this.elapsed):0,warningSeconds:this.warningSeconds,warning:this.warning(),turns:this.turns.map(t=>({...t})),transitions:this.transitions.map(t=>({...t}))};}
}
