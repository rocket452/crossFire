import assert from 'node:assert/strict';
import {RunnerMotion} from '../dist/runner-motion.js';
const rotate=(p,a)=>({x:p.x*Math.cos(a)+p.z*Math.sin(a),z:-p.x*Math.sin(a)+p.z*Math.cos(a)});
const wall=(angle=0,y=15,height=30,state='intact',type='wall')=>({building:'tower',state,type,size:[30,height,.32],body:{position:{x:0,y,z:0},quaternion:{x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)}}});
function fixture({angle=0,oblique=0,strafe=false,vertical=-8,y=8,face=wall(angle)}={}){
 const r=new RunnerMotion(),p=rotate({x:0,z:.55},angle),d=rotate({x:Math.sin(oblique),z:-Math.cos(oblique)},angle);r.reset({x:p.x,y,z:p.z});r.mode='air';r.velocity={x:d.x*46,y:vertical,z:d.z*46};r.yaw=Math.atan2(d.x,d.z)-(strafe?Math.PI/2:0);return{r,face,input:strafe?{strafe:1,boost:true,player:true}:{forward:1,boost:true,player:true}};
}
for(const dt of[1/30,1/60,1/120,.075]){
 for(const angle of[0,Math.PI/2,Math.PI/4,-Math.PI/2])for(const strafe of[false,true])for(const vertical of[-8,5]){
  const{r,face,input}=fixture({angle,strafe,vertical});r.step(input,dt,[face]);assert.equal(r.mode,'wall','first boosted airborne impact attaches');assert.equal(r.airClimbs,1);assert(r.stickyWall);const height=r.position.y;for(let i=0;i<Math.ceil(.18/dt);i++)r.step(input,dt,[face]);assert(r.position.y>height+2,'keeps running upward after catch');assert.equal(r.airClimbs,1);assert(Object.values(r.position).every(Number.isFinite));
 }
 let f=fixture({oblique:75*Math.PI/180});f.r.step(f.input,dt,[f.face]);assert.equal(f.r.mode,'wall','75-degree airborne approach is caught');const low=f.r.position.y;for(let i=0;i<Math.ceil(.16/dt);i++)f.r.step(f.input,dt,[f.face]);assert(f.r.position.y>low+2,'oblique catch has a useful upward run');
 f=fixture({y:8.4,face:wall(0,19.5,21)});f.r.step(f.input,dt,[f.face]);assert.equal(f.r.mode,'wall');for(let i=0;i<Math.ceil(.1/dt);i++)f.r.step(f.input,dt,[f.face]);assert(f.r.mode==='wall'&&f.r.position.y>9.5,'real torso contact carries feet across a ledge/seam');
 f=fixture({strafe:true});f.r.step(f.input,dt,[f.face]);f.r.step({...f.input,jump:true},dt,[f.face]);assert.equal(f.r.mode,'air');assert(!f.r.stickyWall);const catches=f.r.airClimbs;for(let i=0;i<Math.floor(.12/dt);i++)f.r.step(f.input,dt,[f.face]);assert.equal(f.r.airClimbs,catches,'wall jump does not immediately reattach');assert(f.r.position.z>.75);
 f=fixture();f.r.step(f.input,dt,[f.face]);f.r.step({forward:-1,boost:true,player:true},dt,[f.face]);assert.equal(f.r.mode,'air');assert(!f.r.stickyWall,'steering away beats sticky grip');
 f=fixture();f.r.step(f.input,dt,[f.face]);for(let i=0;i<Math.ceil(.4/dt);i++)f.r.step({boost:true,player:true},dt,[f.face]);assert.equal(f.r.mode,'air','releasing movement still drops grip');
 f=fixture();f.r.step(f.input,dt,[f.face]);f.face.state='dynamic';for(let i=0;i<Math.ceil(.15/dt);i++)f.r.step(f.input,dt,[f.face]);assert.equal(f.r.mode,'air','destroyed/moving wall cannot support a sticky run');assert(!f.r.stickyWall);
 for(const state of['settled','dynamic']){f=fixture({strafe:true,face:wall(0,15,30,state)});f.r.step(f.input,dt,[f.face]);assert.equal(f.r.airClimbs,0,'no boosted magnetism onto loose debris');}
 f=fixture({strafe:true});f.r.step({...f.input,boost:false},dt,[f.face]);assert.equal(f.r.airClimbs,0,'unboosted air strafing retains ordinary behavior');
 f=fixture({oblique:85*Math.PI/180});f.r.step(f.input,dt,[f.face]);assert.equal(f.r.airClimbs,0,'near-parallel brushes do not force a climb');
 f=fixture();const roof={building:'tower',state:'intact',type:'slab',size:[30,.28,30],body:{position:{x:0,y:30,z:0}}};for(let i=0;i<Math.ceil(2/dt)&&!f.r.roofs;i++)f.r.step(f.input,dt,[f.face,roof]);assert(f.r.roofs===1&&f.r.mode==='ground'&&!f.r.stickyWall,'real roof crest ends the sticky wall state');
 f=fixture();f.r.step(f.input,dt,[f.face]);f.r.reset();assert(!f.r.stickyWall&&f.r.airClimbs===0);
 console.log('PASS',dt,'instant boosted air catches (cardinal/rotated/strafe/rising/falling), oblique ascent, torso seam grip, jump/away/idle release, support loss, debris/glance rejection, crest/reset');
}
