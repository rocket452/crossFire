import assert from 'node:assert/strict';
import {DestructionWorld,ROBOT_WRECK_SECONDS} from '../dist/destruction.js';
import {Vec3,Quaternion} from '../dist/vendor/cannon-es.js';

const dt=1/60,world=new DestructionWorld(),body=world.addWreck({
 position:new Vec3(0,16,0),quaternion:new Quaternion(),mass:40,size:[1,1,1]
});
let removed=0;
world.trackRobotWreck(body,()=>removed++);
assert.equal(world.robotWrecks.get(body).groundAt,null);
for(let i=0;i<60;i++)world.step(dt);
assert.equal(world.robotWrecks.get(body).groundAt,null,'air time does not start the cleanup clock');
for(let i=0;i<180&&world.robotWrecks.get(body).groundAt===null;i++)world.step(dt);
const landed=world.robotWrecks.get(body).groundAt;
assert(landed>1,'the floor contact starts the timer');
while(world.clock+dt<landed+ROBOT_WRECK_SECONDS-1e-6)world.step(dt);
assert(world.world.bodies.includes(body)&&removed===0);
world.step(dt);
assert(!world.world.bodies.includes(body)&&!world.wrecks.includes(body)&&body.robotWreckExpired);
assert.equal(removed,1);
const another=world.addWreck({position:new Vec3(0,1,0),quaternion:new Quaternion(),size:[1,1,1]});
world.trackRobotWreck(another,()=>removed++);
world.reset();
assert.equal(world.robotWrecks.size,0);
assert.equal(removed,1,'scenario reset cancels the expiration callback');
console.log('PASS physical ground contact starts 30-second robot wreck expiration, body removal and reset cleanup');
