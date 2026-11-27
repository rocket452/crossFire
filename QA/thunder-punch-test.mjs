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

// Impact spectacle: charge arcs, flash, shock dome and rings, spears, crawling arcs, spark cone and ground scorch.
{
 const {ThunderPunchFX}=await import('../dist/thunder-punch-fx.js');
 const fx=new ThunderPunchFX(new Scene());
 const activeArcs=()=>[...fx.kit.arcs,...fx.kit.bigArcs].filter(a=>a.mesh?.visible??a.group?.visible??a.visible).length;
 const liveSparks=()=>{let n=0;for(let i=0;i<fx.kit.sparkCount;i++)if(fx.kit.sparkLife.getX(i)>0)n++;return n;};
 fx.charge(new Vector3(0,1.4,0));fx.update(1/60,{fist:new Vector3(0,1.4,0)});
 const chargeGlows=fx.kit.glows.filter(g=>g.mesh.visible).length;assert(chargeGlows>=1,'fist glows while charging');
 const unit={shapes:[{center:new Vector3(0,1.5,3),half:new Vector3(1,1.2,1)}]};
 fx.impact({x:0,y:1.5,z:3},{x:0,y:0,z:1},{connected:true,unit,groundY:0});
 assert(fx.dome.visible&&fx.scorch.visible,'shock dome and ground scorch');
 assert(fx.kit.glows.filter(g=>g.mesh.visible).length>=chargeGlows+3,'layered impact flash');
 const sparks=liveSparks();assert(sparks>=150,'directional spark cone: '+sparks);
 let ringsSeen=0,crawlArcs=0;
 for(let i=0;i<30;i++){fx.update(1/60,{});ringsSeen=Math.max(ringsSeen,fx.rings.filter(r=>r.mesh.visible).length);if(fx.crawl)crawlArcs++;}
 assert.equal(ringsSeen,3,'three shock rings');assert(crawlArcs>10,'arcs crawl over the struck enemy');
 assert(fx.dome.visible===false,'dome is brief');
 for(let i=0;i<120;i++)fx.update(1/60,{});assert(!fx.scorch.visible&&fx.age===Infinity,'everything settles');
 const missFx=new ThunderPunchFX(new Scene());missFx.impact(new Vector3(),new Vector3(0,0,1),{connected:false});
 const big=new ThunderPunchFX(new Scene());big.impact(new Vector3(),new Vector3(0,0,1),{connected:true,detonated:true});
 assert(missFx.power<1&&big.power>1,'whiff is smaller, Circuit detonation is bigger');assert(!missFx.scorch.visible,'no scorch without ground');
 fx.reset();assert(!fx.dome.visible&&!fx.scorch.visible&&fx.age===Infinity);
 console.log('PASS Thunder Punch FX: charge glow, layered flash, dome, 3 rings, crawl arcs, spark cone ('+sparks+'), scorch, whiff/detonation scaling, reset');
}
