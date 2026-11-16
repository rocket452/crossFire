import * as THREE from './vendor/three.module.js';
import {Mireguard} from './mireguard.js?v=bruiser-range-281';
import {AstraRoninModel} from './astra-ronin-model.js?v=297';
import {COMBAT_ARENA} from './combat-arena-config.js?v=mireguard-pairs-260';
export const RONIN={height:15,health:2400,headHealth:999999,segmentHealth:999999,walkSpeed:8,preferredRange:9,range:220,turnRate:1.8,initialDelay:2,swordWindup:.95,swordSwing:.32,swordRecovery:1.1,swordCooldown:1.4,swordRange:12,swordDamage:35,overheadDamage:55,bodyRadius:3.5,collapseDuration:1.05,
 dashMinRange:14,dashRange:70,dashDistance:70,dashSpeed:100,dashStandOff:4,dashWindup:1.1,dashRecovery:1.2,dashCooldown:3.2,dashDamage:55,dashWarningWidth:3};
const V=()=>new THREE.Vector3();
export class AstraRonin extends Mireguard{
 constructor(scene,damage,options){super(scene,damage,{...options,config:{...RONIN,...options.config}});this.root.clear();this.model=new AstraRoninModel(this.root,this.config);this.parts=this.model.parts;this.type='ronin';this.root.name='Astra Ronin · sword duelist';this.reset();}
 reset(){super.reset();this.swordState=false;this.swordAge=0;this.swings=0;this.swordHit=false;this.dying=false;this.deathAge=0;this.dashAttack=false;this.dashStage=null;this.dashClock=0;this.dashElapsed=0;this.dashLength=0;this.dashes=0;this.struck=new Set();this.dashStart=this.dashEnd=this.dashDirection=null;}
 cancelBurst(){const active=this.swordState||this.dashAttack;super.cancelBurst();this.swordState=false;this.swordAge=0;this.dashAttack=false;this.dashStage=null;this.dashClock=0;if(active)this.model?.animation?.cancelDash();}
 modifyDamage(power,point,part){if(this.dead)return 0;this.flinch=Math.max(this.flinch,.12);return power*(part==='head'?1.5:1);}
 chooseTarget(dt){
  // A committed attack survives loss of sight through a building. Only wind-up tracks.
  if(this.swordState){const current=this.getTargets(this.root.position).find(u=>u===this.target||u.id&&u.id===this.target?.id);if(current)this.target=current;if(!this.target?.alive||this.target.entity?.enabled===false){this.cancelBurst();return super.chooseTarget(dt);}if(!this.dashAttack||this.dashStage==='windup'){const shape=this.target.shapes[0];if(shape)this.lastSeen=V().copy(shape.center);}this.targetVisible=true;return;}
  super.chooseTarget(dt);
 }
 beginAttack(){const distance=this.root.position.distanceTo(this.lastSeen);this.dashAttack=distance>=this.config.dashMinRange;this.swordState=true;this.swordAge=0;this.swordHit=false;this.struck.clear();this.overhead=!this.dashAttack&&this.swings%2===1;this.dashStage=this.dashAttack?'windup':null;this.dashClock=0;this.dashLength=Math.min(this.config.dashDistance,Math.max(0,distance-this.config.dashStandOff));}
 launchDash(){const c=this.config,b=COMBAT_ARENA.dashBounds;this.dashStart=this.root.position.clone();this.dashDirection=this.lastSeen.clone().sub(this.dashStart).setY(0);const distance=this.dashDirection.length();if(distance<.01)this.dashDirection.set(0,0,1).applyQuaternion(this.root.quaternion);else this.dashDirection.normalize();this.dashLength=Math.min(c.dashDistance,Math.max(0,distance-c.dashStandOff));this.dashEnd=this.dashStart.clone().addScaledVector(this.dashDirection,this.dashLength);this.dashEnd.x=THREE.MathUtils.clamp(this.dashEnd.x,b.minX,b.maxX);this.dashEnd.z=THREE.MathUtils.clamp(this.dashEnd.z,b.minZ,b.maxZ);this.dashDirection.copy(this.dashEnd).sub(this.dashStart);this.dashLength=this.dashDirection.length();if(this.dashLength>.001)this.dashDirection.normalize();this.dashStage='dash';this.dashClock=0;this.dashElapsed=0;this.dashes++;}
 strike({ignoreBuildings=false,damage,wide=false}){const origin=this.root.position,forward=V().set(0,0,1).applyQuaternion(this.root.quaternion);for(const u of this.getTargets(origin)){if(!u.alive||u.dashPhased||!u.shapes.length||this.struck.has(u))continue;const point=V().copy(u.shapes[0].center),delta=point.clone().sub(origin);if(delta.length()>this.config.swordRange||delta.clone().setY(0).normalize().dot(forward)<(wide?.05:this.overhead?.7:.05)||!ignoreBuildings&&!this.visible(this.aimPoint(),point))continue;this.struck.add(u);this.onHeroHit(u,point,damage);this.energyEffects.impact(point,delta.normalize(),1);this.heroHits++;}}
 finishAttack(){const dashed=this.dashAttack;this.swordState=false;this.dashAttack=false;this.dashStage=null;this.swings++;this.cooldown=dashed?this.config.dashCooldown:this.config.swordCooldown;this.model.animation.cancelDash();}
 updateDash(dt){const c=this.config;this.dashClock+=dt;
  if(this.dashStage==='windup'){this.mode='dash-windup';this.swordAge=this.dashClock;const distance=this.root.position.distanceTo(this.lastSeen);this.dashLength=Math.min(c.dashDistance,Math.max(0,distance-c.dashStandOff));if(this.dashClock>=c.dashWindup)this.launchDash();return;}
  // Heading locks at launch: no curved pursuit or building collision during the strike.
  this.root.rotation.y=Math.atan2(this.dashDirection.x,this.dashDirection.z);
  if(this.dashStage==='dash'){this.mode='sword-dash';this.dashElapsed+=dt;const distance=Math.min(this.dashLength,this.dashElapsed*c.dashSpeed);this.root.position.copy(this.dashStart).addScaledVector(this.dashDirection,distance);if(distance>=this.dashLength){this.dashStage='slash';this.dashClock=0;}return;}
  if(this.dashStage==='slash'){this.mode='dash-slash';if(this.dashClock>=c.swordSwing*.25&&this.dashClock<=c.swordSwing)this.strike({ignoreBuildings:true,damage:c.dashDamage,wide:true});if(this.dashClock>=c.swordSwing){this.dashStage='recovery';this.dashClock=0;}return;}
  this.mode='dash-recovery';if(this.dashClock>=c.dashRecovery)this.finishAttack();
 }
 updateWeapon(dt){const c=this.config;this.cooldown=Math.max(0,this.cooldown-dt);if(this.stunRemaining>0){this.cancelBurst();return;}if(!this.swordState){if(this.cooldown>0||!this.targetVisible||!this.lastSeen||this.root.position.distanceTo(this.lastSeen)>c.dashRange)return;this.beginAttack();}this.moving=false;if(this.dashAttack){this.updateDash(dt);return;}
  this.swordAge+=dt;this.mode=this.swordAge<c.swordWindup?'sword-windup':'sword-strike';if(!this.swordHit&&this.swordAge>=c.swordWindup+c.swordSwing*.5){this.swordHit=true;this.strike({ignoreBuildings:true,damage:this.overhead?c.overheadDamage:c.swordDamage});}if(this.swordAge>=c.swordWindup+c.swordSwing+c.swordRecovery)this.finishAttack();
 }
 moveToward(goal,speed,dt){if(this.swordState)return false;return super.moveToward(goal,speed,dt);}
 destroy(){if(this.dead)return;this.dead=true;this.dying=true;this.deathAge=0;this.cancelBurst();this.target=null;if(this.combatUnit){this.combatUnit.alive=false;this.combatUnit.shapes=[];}this.model.animation.beginDefeat();}
 update(dt,time){if(this.dying){this.deathAge+=dt;this.model.animation.defeat(this.deathAge/this.config.collapseDuration);if(this.deathAge>=this.config.collapseDuration){this.dying=false;this.dead=false;super.destroy();}return;}super.update(dt,time);}
 diagnostics(){return{...super.diagnostics(),name:'Astra Ronin',swings:this.swings,swordState:this.swordState,swordAge:this.swordAge,dashAttack:this.dashAttack,dashStage:this.dashStage,dashClock:this.dashClock,dashes:this.dashes,dashLength:this.dashLength,dashEnd:this.dashEnd?.toArray()||null};}
}
