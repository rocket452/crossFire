// Independent pointer ownership lets both thumbs and ability buttons work together.
export class TouchStick {
 constructor(element,thumb,{enabled=()=>true,deadzone=.12}={}){
  Object.assign(this,{element,thumb,enabled,deadzone});this.value={x:0,y:0};this.pointerId=null;
  element.addEventListener('pointerdown',e=>{if(!enabled()||this.pointerId!==null)return;e.preventDefault();e.stopPropagation();this.pointerId=e.pointerId;element.setPointerCapture(e.pointerId);this.move(e);});
  element.addEventListener('pointermove',e=>{if(e.pointerId!==this.pointerId)return;e.preventDefault();this.move(e);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,e=>{if(e.pointerId===this.pointerId)this.reset();});
 }
 move(e){const r=this.element.getBoundingClientRect(),radius=Math.max(1,(Math.min(r.width,r.height)-this.thumb.offsetWidth)/2-4),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.hypot(dx,dy),travel=Math.min(radius,length),scale=travel/(length||1),amount=Math.max(0,(travel/radius-this.deadzone)/(1-this.deadzone));this.value.x=dx/(length||1)*amount;this.value.y=-dy/(length||1)*amount;this.thumb.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;this.element.classList.toggle('active',amount>0);}
 reset(){const id=this.pointerId;this.pointerId=null;this.value.x=this.value.y=0;this.thumb.style.transform='';this.element.classList.remove('active');if(id!==null&&this.element.hasPointerCapture(id))this.element.releasePointerCapture(id);}
}
