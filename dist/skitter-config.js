// Skitter: fast four-legged melee hunter built on the user-supplied quadruped robot. It chases on foot,
// climbs building walls to reach heroes on rooftops (or to go over a building in its way), leaps off roof
// edges after them and attacks with its claws. Simulation seconds, metres and damage; tuning only.
export const SKITTER=Object.freeze({
 span:5.2,                 // leg span of the model, metres
 health:280,headMultiplier:1.5,
 heroRange:95,
 speed:9.5,roofSpeed:8.5,climbSpeed:7,lateralClimb:3,turnRate:7,
 bodyRadius:1.15,separation:3.4,
 climb:{reach:1.1,mantle:.38,edgeMargin:1.1,heroAbove:2.6,roofTolerance:2.2},
 leap:{speed:17,minTime:.45,maxTime:1.35,arc:.14,arcMin:2.2,edgeReach:1.4,maxDistance:30},
 strike:{range:3.3,hit:3.9,cone:.3,windup:.4,active:.14,recover:.5,cooldown:.75,damage:16,knock:6,lift:2.5,lunge:1.1},
 pounce:{min:6.5,max:13,windup:.55,height:3,speed:18,radius:2.3,damage:22,knock:9,lift:3.5,recover:.6,cooldown:3.4,lead:.55},
 firstStrike:.6,
 stunScale:1,flinch:.16,
 dying:1.1,fade:2.4
});
