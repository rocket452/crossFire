import fs from 'node:fs';
import assert from 'node:assert/strict';
const argv=process.argv.slice(2),modulePath=argv.find(a=>a.startsWith('--module='))?.slice(9)||new URL('../dist/runner-motion.js',import.meta.url).href;
const {RunnerMotion}=await import(modulePath);
const box=(x,y,z,size,type='wall',yaw=0,state='intact')=>({x,y,z,size,type,state,hidden:false,body:{position:{x,y,z},quaternion:{x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}}});
const layout=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url)));export function city(){const sections=[];for(const b of layout.buildings)for(let f=0;f<b.floors;f++){for(let side=0;side<4;side++)for(let j=0;j<4;j++){const a=side*Math.PI/2,u=(j-1.5)*2.5;sections.push(box(b.x+5*Math.sin(a)+u*Math.cos(a),f*3+1.5,b.z+5*Math.cos(a)-u*Math.sin(a),[2.5,2.72,.32],'wall',a));}for(let x=0;x<3;x++)for(let z=0;z<3;z++)sections.push(box(b.x+(x-1)*10/3,(f+1)*3,b.z+(z-1)*10/3,[10/3,.28,10/3],'slab'));for(const x of [-4.78,4.78])for(const z of [-4.78,4.78])sections.push(box(b.x+x,f*3+1.5,b.z+z,[.48,2.72,.48],'column'));}return sections;}
const results=[];
for(const hz of [30,60,120]){
 const dt=1/hz,wall=[box(0,15,0,[30,30,.32])];
 let r=new RunnerMotion();r.reset({x:-5,y:.08,z:.7});r.yaw=Math.PI;let blocked=0;
 for(let i=0;i<hz*1.4;i++){r.yaw=Math.PI+Math.sin(i/hz*8)*.018;r.step({forward:.06,strafe:-.8,player:true},dt,wall);if(r.speed<.3)blocked+=dt;}results.push({name:'glancing-wall',hz,progress:r.position.x+5,blocked,unwantedClimbs:r.climbs});
 r=new RunnerMotion();r.reset({x:-5,y:.08,z:.8});r.yaw=Math.PI;for(let i=0;i<hz*.8;i++)r.step({forward:.25,strafe:-.85,player:true},dt,wall);results.push({name:'shallow-diagonal',hz,progress:r.position.x+5,height:r.position.y,unwantedClimbs:r.climbs});
 r=new RunnerMotion();r.reset({x:0,y:.08,z:1});r.yaw=Math.PI;for(let i=0;i<hz*.8;i++)r.step({forward:.8,player:true},dt,wall);const start={...r.position};let detach=null;for(let i=0;i<hz*.4;i++){r.step({forward:-.8,player:true},dt,wall);if(detach===null&&r.mode!=='wall')detach=(i+1)*dt;}results.push({name:'wall-backoff',hz,height:start.y,detach,escape:r.position.z-start.z,mode:r.mode});
 const rock=box(0,1,0,[.8,2,3],'slab',0,'settled');r=new RunnerMotion();r.reset({x:0,y:.08,z:0});r.yaw=0;for(let i=0;i<hz*.8;i++)r.step({forward:.05,strafe:-.9,player:true},dt,[rock]);results.push({name:'rubble-overlap-escape',hz,escape:Math.hypot(r.position.x,r.position.z),unwantedClimbs:r.climbs});
 // A real 0.28m panel/floor seam repeats every three metres in this city.
 const b=layout.buildings[0],sections=city();r=new RunnerMotion();r.reset({x:b.x,y:.08,z:b.z+6});r.yaw=Math.PI;let transitions=0,last=r.mode;
 for(let i=0;i<hz*2.8;i++){r.step({forward:.8,strafe:Math.sin(i/hz*5)*.025,boost:i>hz*.2,player:true},dt,sections);if(r.mode!==last){transitions++;last=r.mode;}}results.push({name:'segmented-city-climb',hz,roofs:r.roofs,transitions,climbs:r.climbs});
}
for(let seed=1;seed<=12;seed++){
 let state=seed;const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296),sections=city(),r=new RunnerMotion();r.reset({x:(seed%3-1)*24,y:.08,z:30});r.yaw=Math.PI;let elapsed=0,next=0,look=0,forward=.8,strafe=0,boost=false,stalled=0,longStalls=0,recovery=0,walked=0,maxStall=0;
 for(let frame=0;elapsed<35;frame++){const dt=[1/30,1/60,1/90,.045][frame%4];elapsed+=dt;if(elapsed>next){next=elapsed+.25+random()*.6;look=(random()-.5)*1.8;forward=.4+random()*.6;strafe=(random()-.5)*.9;boost=random()>.55;}
  if(Math.abs(r.position.x)>51||Math.abs(r.position.z)>51)r.yaw=Math.atan2(-r.position.x,-r.position.z);
  r.yaw-=look*dt;let input={forward,strafe,boost,player:true,jump:frame%137===0};if(recovery>0){recovery-=dt;input={forward:-.65,strafe:.55,player:true,jump:recovery<.1};r.yaw-=dt;}
  const before={...r.position};r.step(input,dt,sections);const moved=Math.hypot(r.position.x-before.x,r.position.y-before.y,r.position.z-before.z);walked+=moved;if(moved/dt<.3&&Math.hypot(input.forward||0,input.strafe||0)>.3){stalled+=dt;maxStall=Math.max(maxStall,stalled);if(stalled>.5&&recovery<=0)recovery=.65;if(stalled>1.5&&stalled-dt<=1.5)longStalls++;}else stalled=0;
  assert(Object.values(r.position).every(Number.isFinite));assert(Math.abs(r.position.x)<=56.01&&Math.abs(r.position.z)<=56.01);assert(r.position.y>=.079);
 }results.push({name:'seeded-human-city-tour',seed,seconds:elapsed,distance:walked,longStalls,maxStall,roofs:r.roofs});
}
const totals={cases:results.length,glanceBlocked:results.filter(r=>r.name==='glancing-wall').reduce((s,r)=>s+r.blocked,0),unwantedClimbs:results.filter(r=>['glancing-wall','shallow-diagonal'].includes(r.name)).reduce((s,r)=>s+r.unwantedClimbs,0),overlapEscapes:results.filter(r=>r.name==='rubble-overlap-escape'&&r.escape>2).length,quickWallExits:results.filter(r=>r.name==='wall-backoff'&&r.detach!==null&&r.detach<=.12&&r.escape>1).length,tourLongStalls:results.filter(r=>r.name==='seeded-human-city-tour').reduce((s,r)=>s+r.longStalls,0),tourMaxStall:Math.max(...results.filter(r=>r.name==='seeded-human-city-tour').map(r=>r.maxStall))};
console.log(JSON.stringify({totals,results},null,2));const save=argv.find(a=>a.startsWith('--save='));if(save)fs.writeFileSync(save.slice(7),JSON.stringify({totals,results},null,2));
if(argv.includes('--assert')){assert.equal(totals.unwantedClimbs,0);assert.equal(totals.overlapEscapes,3);assert.equal(totals.quickWallExits,3);assert(totals.glanceBlocked<.15);assert.equal(totals.tourLongStalls,0);assert(results.filter(r=>r.name==='segmented-city-climb').every(r=>r.roofs>=1));}
