// Shared turn-taking for robot weapons, including in-flight missiles.
export class RobotArsenal {
 constructor({plasma=false}={}){this.plasma=plasma;this.warningSeconds=2;this.reset();}
 reset(){this.phase=this.plasma?'plasma':'beam';this.elapsed=0;this.clock=0;this.completedBeams=0;this.turns=[];}
 beforeBeam(robot,pod,artillery){robot.beamAllowed=this.phase==='beam'&&!pod.pending&&!pod.missiles.some(m=>m.alive)&&!artillery?.busy;}
 update(dt,robot,pod,artillery){
  this.clock+=dt;
  if(robot.dead){this.phase='off';this.elapsed=0;return;}
  this.elapsed+=dt;
  if(this.phase==='plasma'){if(artillery?.beginVolley()){this.turns.push({weapon:'plasma',time:this.clock});this.phase='plasma-clear';this.elapsed=0;}else if(this.elapsed>1){this.phase='recovery';this.elapsed=0;}}
  else if(this.phase==='plasma-clear'&&!artillery?.busy){this.phase='recovery';this.elapsed=0;}
  else if(this.phase==='beam'&&robot.weapon.bursts>this.completedBeams&&robot.weapon.phase==='cooling'){
   this.completedBeams=robot.weapon.bursts;this.turns.push({weapon:'beam',time:this.clock});this.phase='warning';this.elapsed=0;
  }else if(this.phase==='warning'&&this.elapsed>=this.warningSeconds){
   if(pod.beginSalvo()){this.turns.push({weapon:'pod',time:this.clock});this.phase='salvo';this.elapsed=0;}
  }else if(this.phase==='salvo'&&!pod.pending){this.phase='clear';this.elapsed=0;}
  else if(this.phase==='clear'&&!pod.missiles.some(m=>m.alive)){this.phase=this.plasma?'plasma':'recovery';this.elapsed=0;}
  else if(this.phase==='recovery'&&this.elapsed>=1.2){this.phase='beam';this.elapsed=0;}
  this.turns=this.turns.slice(-12);
 }
 warning(){const active=this.phase==='warning',progress=active?Math.min(1,this.elapsed/this.warningSeconds):0;return{active,progress,pulse:active&&Math.floor(this.elapsed*(4+progress*2)*2)%2===0};}
 diagnostics(){return{phase:this.phase,seconds:this.elapsed,warningSeconds:this.warningSeconds,warning:this.warning(),turns:this.turns.map(t=>({...t}))};}
}
