import * as THREE from './vendor/three.module.js';
export class EvacBus {
 constructor(scene,damage,index,config){
  Object.assign(this,{index,config,damage});this.evac=true;this.convoy=true;this.id='convoy-bus-'+index;this.root=new THREE.Group();this.root.name='Evacuation bus '+(index+1);scene.add(this.root);this.materials=[];this.wheels=[];
  const box=new THREE.BoxGeometry(1,1,1),material=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85});this.materials.push({m,color:m.color.clone()});return m;},body=material('#d9bd61'),glass=material('#254c57'),trim=material('#e4e6cf'),dark=material('#263436');
  const part=(m,p,s)=>{const o=new THREE.Mesh(box,m);o.position.set(...p);o.scale.set(...s);o.castShadow=o.receiveShadow=true;this.root.add(o);return o;};
  const w=config.busWidth,l=config.busLength,h=config.busHeight;
  part(body,[0,h*.5,0],[w,h*.82,l]);part(trim,[0,h*.95,0],[w*1.02,.18,l]);part(dark,[0,.35,0],[w,.35,l]);
  part(glass,[0,h*.65,l*.501],[w*.86,h*.28,.04]);part(trim,[0,h*.4,l*.51],[w*.8,.16,.08]);
  for(const side of[-1,1]){for(let z=-3.3;z<=3.5;z+=1.7)part(glass,[side*w*.502,h*.65,z],[.04,h*.28,1.35]);part(trim,[side*w*.51,1.1,0],[.05,.18,l*.96]);for(const z of[-l*.31,l*.31]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.56,.56,.3,8),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(side*w*.51,.57,z);this.root.add(wheel);this.wheels.push(wheel);}}
  this.door=part(trim,[w*.51,h*.42,config.doorOffset[2]],[.08,h*.65,1]);
  part(glass,[w*.53,h*.55,config.doorOffset[2]],[.04,h*.27,.65]);
  for(const x of[-w*.34,w*.34])part(material('#fff0b6'),[x,.8,l*.51],[.3,.25,.07]);
  part(material('#62d7be'),[0,h+ .13,0],[.65,.12,l*.65]);part(trim,[0,h+.2,(index-1.5)*.8],[w*.8,.08,.32]);
  this.unit=damage.add(this.id,'bus',this,config.busHealth);this.reset();
 }
 reset(){this.passengers=[];this.escaped=false;this.destroyed=false;this.smokeClock=0;this.root.visible=true;this.root.rotation.set(0,Math.PI/2,0);for(const {m,color}of this.materials)m.color.copy(color);this.unit.alive=true;this.unit.health=this.unit.maxHealth;this.unit.shapes=[];this.setBoarding(false);}
 setBoarding(open){this.boarding=!!open;this.door.material=this.materials[open?2:0].m;}
 doorPoint(){this.root.updateMatrixWorld(true);return this.root.localToWorld(new THREE.Vector3(...this.config.doorOffset));}
 place(point,ground,dt=0){const old=this.root.position.clone();this.root.position.set(point.x,ground,point.z);this.root.rotation.y=point.yaw;const moved=old.distanceTo(this.root.position);if(dt)for(const wheel of this.wheels)wheel.rotation.x+=moved/.56;this.sync();}
 sync(){const previous=this.unit.shapes[0]?.center;this.unit.shapes=this.unit.alive&&!this.escaped?[{center:{x:this.root.position.x,y:this.root.position.y+this.config.busHeight*.5,z:this.root.position.z},previousCenter:previous,half:{x:this.config.busWidth/2,y:this.config.busHeight/2,z:this.config.busLength/2},rotation:{x:this.root.quaternion.x,y:this.root.quaternion.y,z:this.root.quaternion.z,w:this.root.quaternion.w}}]:[];}
 destroy(){if(this.destroyed||this.escaped)return;this.destroyed=true;this.unit.alive=false;this.unit.health=0;this.unit.shapes=[];this.setBoarding(false);for(const {m}of this.materials)m.color.multiplyScalar(.27);this.root.rotation.z=.09;}
 escape(){this.escaped=true;this.unit.alive=false;this.unit.shapes=[];this.root.visible=false;this.setBoarding(false);}
}
