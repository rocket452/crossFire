import * as THREE from './vendor/three.module.js';
import {EvacRaider,RAIDER_COMBAT} from './evac-raider.js?v=419';
import {SpiderRobotModel} from './spider-robot-model.js?v=wreck-occlusion-273';
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const BRUISER_RANGE=Object.freeze({heroRange:RAIDER_COMBAT.heroRange*2.4,weaponRange:330,rocketRange:55});
// The next burst winds up during the last half-second of this firing gap.
const BURST_GAP_SECONDS=3;
export class SpiderBruiser extends EvacRaider {
 constructor(scene,damage,options){if(!options.spiderModel)throw Error('Bruiser SpiderBot asset missing');super(scene,damage,{heroRange:BRUISER_RANGE.heroRange,weaponRange:BRUISER_RANGE.weaponRange,projectileLifetime:10,maxHealth:350,...options,enhancedModel:false});this.isRooftopHero=options.isRooftopHero??(()=>false);this.root.clear();this.root.scale.setScalar(1);this.spider=new SpiderRobotModel(this.root,options.spiderModel);this.parts={body:this.spider.hip,head:this.spider.head};this.bodyHeight=this.parts.body.position.y;const helper=(name,parent)=>{const n=new THREE.Group();n.name='Bruiser '+name+' attachment';parent.add(n);this.parts[name]=n;return n;};helper('reactor',this.parts.body);helper('arm_l',this.parts.head);const arm=helper('arm_r',this.parts.head);this.barrel=helper('barrel',arm);this.root.updateWorldMatrix(true,true);const eye=new THREE.Box3().setFromObject(this.spider.eye).getCenter(new THREE.Vector3());this.barrel.position.copy(this.parts.head.worldToLocal(eye));this.barrel.position.z+=.08;this.tracks={root:this.spider.body,reset:()=>{},update:()=>{},diagnostics:()=>({type:'spider-legs',count:4})};this.root.add(this.warning);this.restMaterials=[];const seen=new Set();this.spider.body.traverse(o=>{if(o.isMesh)for(const m of[].concat(o.material))if(m.emissive&&!seen.has(m)){seen.add(m);this.restMaterials.push({m,color:m.color.clone(),emissive:m.emissive.clone(),intensity:m.emissiveIntensity});}});this.reset();}
 reset(){super.reset();this.spider?.reset();this.spider?.head.rotation.reorder('YXZ');this.recoil=0;this.headshotSeconds=0;}
 canAcquireHero(unit,distance){
  const engaged=this.target&&this.target.entity===unit.entity;
  const retaliating=this.isAlertedTo(unit.entity);
  if(distance>this.weaponRange)return false;
  if(this.isRooftopHero(unit))return engaged||retaliating;
  if(engaged)return true;
  return super.canAcquireHero(unit,distance);
 }
 aimPoint(){if(!this.spider)return super.aimPoint();return this.spider.bodyMesh.getWorldPosition(new THREE.Vector3());}
 sync(){if(!this.spider)return super.sync();this.root.updateWorldMatrix(true,true);if(this.combatUnit)this.combatUnit.shapes=this.combatUnit.alive?this.spider.shapes():[];}
 aimTorso(dt){const head=this.spider.head,rate=RAIDER_COMBAT.turnRate*dt;if(!this.target){head.rotation.y+=THREE.MathUtils.clamp(angle(0,head.rotation.y),-rate,rate);head.rotation.x+=THREE.MathUtils.clamp(-head.rotation.x,-rate,rate);this.aimError=null;return null;}this.prepareBurst();this.root.updateWorldMatrix(true,true);const point=this.shotPoint(this.barrel.getWorldPosition(new THREE.Vector3())).point,local=head.parent.worldToLocal(point.clone()).sub(head.position),yaw=Math.atan2(local.x,local.z),pitch=THREE.MathUtils.clamp(-Math.atan2(local.y,Math.hypot(local.x,local.z)),-Math.PI/2,75*Math.PI/180);head.rotation.y+=THREE.MathUtils.clamp(angle(yaw,head.rotation.y),-rate,rate);head.rotation.x+=THREE.MathUtils.clamp(pitch-head.rotation.x,-rate,rate);this.root.updateWorldMatrix(true,true);const from=this.barrel.getWorldPosition(new THREE.Vector3()),shot=this.shotPoint(from),direction=shot.point.clone().sub(from).normalize(),forward=new THREE.Vector3(0,0,1).transformDirection(this.barrel.matrixWorld);this.aimError=Math.acos(THREE.MathUtils.clamp(forward.dot(direction),-1,1));return{from,...shot,direction};}
 modifyDamage(power,point,part){if(this.dead)return 0;if(part==='head'&&power>0){this.headshots++;this.headshotSeconds=.35;this.energyEffects.impact(point||this.spider.eye.getWorldPosition(new THREE.Vector3()),new THREE.Vector3(0,1,0),.65);return power*RAIDER_COMBAT.headshotMultiplier;}return power;}
 updateWeapon(dt,aim,origin){
  const rocket=this.target?.id==='evacuation-rocket'&&this.target.shapes[0]?.center;
  if(rocket&&Math.hypot(origin.x-rocket.x,origin.z-rocket.z)>BRUISER_RANGE.rocketRange)aim=null;
  super.updateWeapon(dt,aim,origin);
 }
 fireBurstShot(aim){
  super.fireBurstShot(aim);
  if(this.burstRemaining===0)this.cooldown=BURST_GAP_SECONDS-RAIDER_COMBAT.windup;
 }
 fireBolt(aim){this.recoil=.12;return super.fireBolt(aim);}
 breakApart(){if(this.spider)return this.spider.wreck(this);super.breakApart();}
 update(dt,time){const before=this.root.position.clone();super.update(dt,time);if(!this.spider||!this.spawned||this.dead)return;this.recoil=Math.max(0,this.recoil-dt);this.headshotSeconds=Math.max(0,this.headshotSeconds-dt);this.spider.animate(dt,time,{moving:before.distanceToSquared(this.root.position)>1e-10,goal:null,aimed:true,stunned:this.stunRemaining>0});this.parts.body.rotation.z=this.stunRemaining>0?Math.sin(time*28)*.035:0;if(this.recoil>0)this.parts.head.rotateX(-.04*Math.sin(this.recoil/.12*Math.PI));if(this.headshotSeconds>0){this.parts.head.rotateX(-.12*Math.sin(this.headshotSeconds/.35*Math.PI));this.spider.eye.material.emissiveIntensity=this.spider.eyeRestIntensity+8*this.headshotSeconds/.35;}this.sync();}
 diagnostics(){return{...super.diagnostics(),modelScale:1,spider:this.spider?.diagnostics(),headshotRemaining:this.headshotSeconds};}
}
