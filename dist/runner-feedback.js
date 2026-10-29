import * as THREE from './vendor/three.module.js';
export class RunnerFeedback {
 constructor(scene){
  this.notice=document.getElementById('runner-rescue-feedback');this.counter=document.getElementById('runner-rescue-count');this.assist=document.getElementById('runner-aim-assist');
  const material=new THREE.MeshBasicMaterial({color:'#affaff',transparent:true,opacity:.8,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  this.rings=new THREE.InstancedMesh(new THREE.RingGeometry(.88,1,32),material,12);this.rings.frustumCulled=false;scene.add(this.rings);this.dummy=new THREE.Object3D();this.soundCount=0;this.reset();
 }
 reset(){this.remaining=0;this.positions=[];this.rings.count=0;if(this.notice)this.notice.hidden=true;if(this.counter)this.counter.textContent='0 SAVED';if(this.assist)this.assist.hidden=true;}
 unlock(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){this.audio??=new Audio();if(this.audio.state==='suspended')this.audio.resume().catch(()=>{});}}catch{}}
 chime(){const c=this.audio;if(!c||c.state!=='running')return;try{for(const[frequency,delay]of [[523.25,0],[659.25,.08],[783.99,.16]]){const o=c.createOscillator(),gain=c.createGain(),start=c.currentTime+delay;o.type='sine';o.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.075,start+.012);gain.gain.exponentialRampToValueAtTime(.001,start+.24);o.connect(gain);gain.connect(c.destination);o.onended=()=>{o.disconnect();gain.disconnect();};o.start(start);o.stop(start+.25);}this.soundCount++;}catch{}}
 ready(sound=true){const c=this.audio;if(!sound||!c||c.state!=='running')return;try{const o=c.createOscillator(),gain=c.createGain();o.type='sine';o.frequency.setValueAtTime(740,c.currentTime);o.frequency.exponentialRampToValueAtTime(1110,c.currentTime+.10);gain.gain.setValueAtTime(.04,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+.16);o.connect(gain);gain.connect(c.destination);o.onended=()=>{o.disconnect();gain.disconnect();};o.start();o.stop(c.currentTime+.18);}catch{}}
 rescue(event,{visible=true,sound=true}={}){
  this.counter.textContent=event.total+' SAVED';if(!visible)return;
  this.remaining=2.2;this.positions=event.positions.slice(0,6);this.notice.textContent=(event.closeCall?'CLOSE CALL · ':'')+event.count+(event.count===1?' ALLY RESCUED':' ALLIES RESCUED');this.notice.hidden=false;if(sound)this.chime();
 }
 update(dt,{active,camera,aim=null}={}){
  this.remaining=Math.max(0,this.remaining-dt);this.notice.hidden=!active||this.remaining<=0;this.rings.count=0;
  if(active&&this.remaining>0){let i=0;for(const p of this.positions)for(let j=0;j<2;j++){const age=2.2-this.remaining,scale=(j?1.5:1)+Math.min(1,age)*1.2;this.dummy.position.set(p.x,p.y+.18+j*.12,p.z);this.dummy.rotation.set(-Math.PI/2,0,0);this.dummy.scale.setScalar(scale);this.dummy.updateMatrix();this.rings.setMatrixAt(i++,this.dummy.matrix);}this.rings.count=i;this.rings.instanceMatrix.needsUpdate=true;this.rings.material.opacity=.7*Math.min(1,this.remaining/.5);}
  this.assist.hidden=!active||!aim;
  if(active&&aim){const point=aim.point.clone().project(camera);if(Math.abs(point.x)>1||Math.abs(point.y)>1||point.z>1||point.z< -1){this.assist.hidden=true;return;}this.assist.style.left=(point.x*.5+.5)*100+'%';this.assist.style.top=(-point.y*.5+.5)*100+'%';this.assist.dataset.kind=aim.kind;this.assist.setAttribute('aria-label',aim.kind==='missile'?'Missile aim assistance':'Robot aim assistance');}
 }
 clear(){this.remaining=0;this.positions=[];this.rings.count=0;this.notice.hidden=true;this.assist.hidden=true;}
 diagnostics(){return{noticeSeconds:this.remaining,rings:this.rings.count,soundCount:this.soundCount};}
}
