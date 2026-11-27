import {Group,Mesh,MeshBasicMaterial,OctahedronGeometry,Vector3} from './vendor/three.module.js';

export const KUNAI_MARKS_REQUIRED=3;

export class KunaiMarks {
 constructor(hero){
  this.hero=hero;this.marks=new Map();this.clock=0;
  this.markerGeometry=new OctahedronGeometry(.15);
  this.partial=new MeshBasicMaterial({color:'#74c7cf',toneMapped:false});
  this.ready=new MeshBasicMaterial({color:'#c7fff2',toneMapped:false});
  this.aimed=new MeshBasicMaterial({color:'#ffd978',toneMapped:false});
 }
 valid(unit){return unit?.kind==='robot'&&unit.alive&&!unit.hidden&&!unit.dashPhased&&unit.shapes.length>0;}
 count(unit){return this.valid(unit)?this.marks.get(unit)?.count??0:0;}
 anchor(unit){
  const mark=this.marks.get(unit);
  return mark?.count===KUNAI_MARKS_REQUIRED&&this.valid(unit)?unit.entity.root.getWorldPosition(new Vector3()):null;
 }
 // Only one enemy carries kunai marks at a time: marking a new one clears the others.
 marked(){for(const unit of this.marks.keys())if(this.valid(unit))return unit;return null;}
 place(unit,count=1,seconds=Infinity){
  if(!this.valid(unit))return;
  for(const other of [...this.marks.keys()])if(other!==unit)this.remove(other);
  let mark=this.marks.get(unit);
  if(!mark){
   mark={count:0,group:new Group()};this.marks.set(unit,mark);
   for(let i=0;i<KUNAI_MARKS_REQUIRED;i++){
    const gem=new Mesh(this.markerGeometry,this.partial);
    gem.position.x=(i-1)*.38;mark.group.add(gem);
   }
   this.hero.scene.add(mark.group);
  }
  mark.count=Math.min(KUNAI_MARKS_REQUIRED,mark.count+count);
  mark.until=this.clock+seconds;
 }
 remove(unit){
  const mark=this.marks.get(unit);if(!mark)return;
  this.hero.scene.remove(mark.group);this.marks.delete(unit);
 }
 reset(){
  for(const unit of this.marks.keys())this.remove(unit);
  this.clock=0;this.target=null;this.blocked=false;
 }
 step(dt,target=this.marked()){
  this.clock+=dt;
  for(const [unit,mark] of this.marks){
   if(!this.valid(unit)||mark.until<=this.clock){this.remove(unit);continue;}
   const center=unit.entity.root.getWorldPosition(mark.group.position);
   let top=center.y;
   for(const shape of unit.shapes)top=Math.max(top,shape.center.y+shape.half.y);
   center.y=top+.5;
   mark.group.quaternion.copy(this.hero.camera.quaternion);
   const material=target===unit&&mark.count===KUNAI_MARKS_REQUIRED?this.aimed:
    mark.count===KUNAI_MARKS_REQUIRED?this.ready:this.partial;
   for(const [i,gem] of mark.group.children.entries()){
    gem.visible=i<mark.count;gem.material=material;
   }
  }
  if(this.target!==target)this.blocked=false;
  this.target=target;
 }
 // Q teleports behind the marked enemy; no aiming needed.
 teleport(){
  const unit=this.marked(),h=this.hero;
  if(this.count(unit)<KUNAI_MARKS_REQUIRED)return false;
  const shape=unit.shapes[0],center=shape?new Vector3().copy(shape.center):unit.entity.root.getWorldPosition(new Vector3());
  const landing=h.shurikenWorld.rearLanding(unit,center);
  if(!landing.valid){this.blocked=true;return false;}
  const {point}=landing;
  const from=h.arrive(point,{...h.shurikenConfig.arrival,preserveVelocity:false},true);
  this.remove(unit);this.blocked=false;
  h.shuriken.crosscutTarget=unit;
  h.shurikenEffects.event({type:'teleport',from,to:point});
  h.liberation?.teleport(from,point,{host:unit});
  return true;
 }
}
