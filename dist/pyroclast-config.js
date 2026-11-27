// Pyroclast: flying flame supervillain for Combat Testing. Tuning only; no scene state.
export const PYROCLAST=Object.freeze({
 health:14000,
 height:5.4,
 spawn:{x:0,y:14,z:-18},
 flight:{maxSpeed:13,acceleration:9,minAltitude:8,maxAltitude:15,meteorAltitude:20,orbitMin:20,orbitMax:30,retargetSeconds:3.2,bob:.35},
 cycle:['fireballs','tornadoes','meteors'],
 pauseSeconds:2.2,
 openingDelay:2.5,
 fireballs:{windup:1.1,count:3,interval:.42,speed:60,radius:2,blastRadius:6.5,power:1,life:5,lead:.6,homing:1.4,fuse:1.5,dropGravity:32,recover:.8},
 tornadoes:{windup:1.1,count:3,speed:6.5,turn:1.6,radius:4.6,height:24,spawnRadius:17,life:7.5,hitInterval:.5,lift:9,recover:.6},
 meteors:{windup:1.3,count:16,spawnSeconds:3.4,telegraph:1.7,fall:.85,spread:15,radius:4,startHeight:70,recover:1,riftHeight:58,riftRadius:16,
  finale:{radius:7.5,telegraph:2.3,fall:1.1,scale:2.4,power:2}},
 stunScale:.5,
 deathSeconds:2.4
});
