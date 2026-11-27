import assert from 'node:assert/strict';
import {Group,Scene,Vector3} from '../dist/vendor/three.module.js';
import {ThunderPunch,THUNDER_PUNCH as c} from '../dist/thunder-punch.js';
import {CircuitBreaker} from '../dist/circuit-breaker.js';
import {RunnerEnergy} from '../dist/runner-energy.js';

for(const fps of [30,60,120]){
 const scene=new Scene(),punch=new ThunderPunch(scene),energy=new RunnerEnergy();
 let swings=0;
 const strike=()=>{swings++;punch.release(new Vector3(),new Vector3(0,0,c.range),new Vector3(0,0,1));};
 energy.amount=24;assert(!punch.start(energy));assert(!punch.active);
 energy.amount=51;assert(punch.start(energy));assert.equal(energy.amount,26);assert(!punch.start(energy));
 while(punch.striking)punch.step(1/fps,strike);
 assert.equal(swings,1);assert(punch.wave.visible);assert(punch.active);
 for(let i=0;i<Math.round(c.recovery*fps);i++){
  assert(punch.active);punch.step(1/fps,strike);
 }
 assert(!punch.active);assert.equal(swings,1);
 assert(punch.start(energy));punch.cancel();punch.step(.5,strike);assert.equal(swings,1);
}

const scene=new Scene(),root=new Group();let detonations=0;
const circuit=new CircuitBreaker(scene,{hit:()=>true,detonate:()=>detonations++});
const hit={unit:{kind:'robot',entity:{root},alive:true,shapes:[{center:new Vector3(),half:new Vector3(1,1,1)}]},point:new Vector3()};
circuit.register(hit,new Vector3(1,0,0));
assert(!circuit.primed(hit.unit,new Vector3(1,0,1)));
assert(circuit.primed(hit.unit,new Vector3(0,0,1)));
circuit.consume(hit);circuit.consume(hit);
assert.equal(detonations,1);assert.equal(circuit.marks.size,0);
console.log('PASS punch charge, impact, full recovery, cancellation and Circuit mark consumption at 30/60/120 Hz.');
