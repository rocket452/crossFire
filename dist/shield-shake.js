export const SHIELD_FORWARD_OFFSET=1.7*1.3;
export class ShieldShake {
 constructor(){this.reset();}
 reset(){this.strength=0;this.time=0;this.impacts=0;this.offset={x:0,y:0,pitch:0,yaw:0,roll:0};}
 kick(power){if(!(power>0))return;this.strength=Math.min(1,this.strength+.35+power/180);this.impacts++;}
 step(dt){this.time+=dt;this.strength*=Math.exp(-7*dt);const a=this.strength,t=this.time;this.offset={x:Math.sin(t*58)*.24*a,y:Math.sin(t*45+.7)*.18*a,pitch:Math.sin(t*37)*.045*a,yaw:Math.sin(t*49)*.035*a,roll:Math.sin(t*56)*.028*a};return this.offset;}
}
