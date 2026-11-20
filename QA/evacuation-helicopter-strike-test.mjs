import assert from 'node:assert/strict';import {RobotArsenal} from '../dist/robot-arsenal.js';import {EvacuationHelicopterStrike} from '../dist/evacuation-helicopter-strike.js';
function fixture(phase='beam'){let eligible=true;const working={beam:true,missiles:true,plasma:true},robot={weapon:{phase:'ready',bursts:0,coolSeconds:7.5},isWeaponWorking:id=>working[id],onBeam:()=>{},dead:false,stunRemaining:0},pod={pending:0,missiles:[],beginSalvo(){this.pending=6;return true;}},artillery={shells:[],muzzleGlow:{visible:true},removed:0,removeShell(){this.removed++;},cancelled:0,get busy(){return this.shells.length>0;},beginVolley:()=>false},arsenal=new RobotArsenal({plasma:true});arsenal.phase=phase;arsenal.nextPhase='plasma';const strike=new EvacuationHelicopterStrike({robot,pod,artillery,arsenal,isEligible:()=>eligible}),target={id:'chinook',kind:'helicopter'};return{robot,pod,artillery,arsenal,strike,target,working,invalidate:()=>eligible=false};}
for(const phase of['beam','plasma','recovery','warning']){const f=fixture(phase);assert(f.strike.request(f.target));assert.equal(f.arsenal.phase,'warning');assert.equal(f.arsenal.elapsed,0);assert.equal(f.strike.missileTarget,f.target);assert.equal(f.robot.beamAllowed,false);const resume=f.strike.resume;f.arsenal.update(1.99,f.robot,f.pod,f.artillery);assert.equal(f.pod.pending,0);f.arsenal.update(.01,f.robot,f.pod,f.artillery);assert.equal(f.pod.pending,6);assert.equal(f.arsenal.phase,'salvo');f.pod.pending=0;f.arsenal.update(.01,f.robot,f.pod,f.artillery);assert.equal(f.arsenal.phase,'clear');f.arsenal.update(.01,f.robot,f.pod,f.artillery);f.strike.update();assert.equal(f.arsenal.phase,'recovery');assert.equal(f.arsenal.nextPhase,resume);assert(!f.strike.busy);assert.equal(f.strike.overrides,1);}
for(const reason of['beam','missile','plasma','stun','startup']){const f=fixture(reason==='startup'?'startup':'plasma');if(reason==='beam')f.robot.weapon.phase='firing';if(reason==='missile')f.pod.missiles=[{alive:true}];if(reason==='plasma')f.artillery.shells=[{state:'flying'}];if(reason==='stun')f.robot.stunRemaining=1;f.strike.request(f.target);assert(!f.strike.active,reason+' must not overlap/skip startup');if(reason==='startup')f.arsenal.elapsed=5;f.robot.weapon.phase='ready';f.pod.missiles=[];f.artillery.shells=[];f.robot.stunRemaining=0;f.strike.update();assert(f.strike.active);}
{const f=fixture();f.robot.weapon.phase='charging';f.artillery.shells=[{state:'warning'}];f.strike.request(f.target);assert.equal(f.robot.weapon.phase,'cooling');assert.equal(f.artillery.shells.length,0);assert.equal(f.artillery.cancelled,1);}
{const f=fixture();f.working.missiles=false;assert(!f.strike.request(f.target));assert.equal(f.arsenal.phase,'beam');}
for(const reason of['eligibility','destroyed','death']){const f=fixture();f.strike.request(f.target);if(reason==='eligibility')f.invalidate();if(reason==='destroyed')f.working.missiles=false;if(reason==='death')f.robot.dead=true;f.strike.update();assert(!f.strike.busy);if(reason!=='death')assert.equal(f.arsenal.phase,'recovery');}
{const f=fixture();f.strike.request(f.target);f.arsenal.phase='salvo';f.pod.pending=4;f.pod.missiles=[{alive:true}];f.invalidate();f.strike.update();assert.equal(f.pod.pending,0);assert.equal(f.arsenal.phase,'clear');assert(f.pod.missiles[0].alive);f.strike.reset();assert(!f.strike.busy);assert.equal(f.strike.overrides,0);}
console.log('PASS out-of-rotation helicopter missile warning/salvo/resume, 2s warning, no beam/plasma/airborne overlap, startup/stun, charge cancellation, lost eligibility/destroyed pod/death, in-flight persistence and reset');

const {Group,Scene,Vector3}=await import('../dist/vendor/three.module.js');
const {RobotMissiles,WALKER_SALVO_SIZE}=await import('../dist/robot-missiles.js');
{
 const {robot,artillery,arsenal,strike,target}=fixture();
 Object.assign(target,{alive:true,shapes:[{center:new Vector3(0,20,65)}]});
 const pod=new RobotMissiles(new Scene(),{scene:new Group()},{
  autoFire:false,getMuzzles:()=>[{position:new Vector3(0,20,0),direction:new Vector3(0,.5,1)}],
  getTargets:()=>strike.missileTarget?[strike.missileTarget]:[],isRobotAlive:()=>true,
  traceWorld:()=>null,onImpact:()=>assert.fail('empty flight test')
 });
 strike.pod=pod;
 assert(strike.request(target));
 arsenal.update(2,robot,pod,artillery);
 assert.equal(pod.pending,WALKER_SALVO_SIZE);
 for(let i=0;i<60*6;i++)pod.update(1/60,i/60);
 assert.equal(pod.launched,12);
 assert(pod.missiles.every(m=>m.target===target));
 console.log('PASS Chinook override launches a full twelve-missile salvo at the helicopter');
}
