import {Vector3} from './vendor/three.module.js';
import {traceImpact} from './combat-collision.js';

export function platformAttachment(deck,position){
 if(!deck?.isPlatform)return null;
 const local=new Vector3().copy(position).sub(deck.body.position)
  .applyQuaternion(deck.body.quaternion.clone().invert());
 return {deck,local};
}

export function carryPlatform(attachment,position){
 if(!attachment?.deck.isActive())return false;
 const {deck,local}=attachment;
 const world=local.clone().applyQuaternion(deck.body.quaternion).add(deck.body.position);
 position.x=world.x;
 position.y=world.y;
 position.z=world.z;
 return true;
}

export function landOnPlatform(position,next,platforms){
 if(next.y>=position.y||!platforms.length)return null;
 const from=new Vector3().copy(position).add(new Vector3(0,.015,0));
 const hit=traceImpact(from,next,{sections:platforms,radius:0,ground:false});
 if(!hit)return null;
 const {body,size}=hit.section;
 const local=new Vector3().copy(hit.point).sub(body.position).applyQuaternion(body.quaternion.clone().invert());
 return Math.abs(local.y-size[1]/2)<.025?hit:null;
}
