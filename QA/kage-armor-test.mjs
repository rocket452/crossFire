import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(name, context, next){
 return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,context);
}});
const T=await import('../dist/vendor/three.module.js');
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
globalThis.window={document:{documentElement:{dataset:{}}},navigator:{},addEventListener(){},
 matchMedia:query=>({matches:query.includes('fine'),addEventListener(){}})};
const {NinjaHero}=await import('../dist/ninja-hero.js');
async function load(name){
 const file=fs.readFileSync(new URL('../dist/city-assets/licensed-characters/'+name,import.meta.url));
 return new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
}
const frog=process.argv.includes('--frog');
const [classic,armored]=await Promise.all([load('humanoid.glb'),load(frog?'kage-frog.glb':'kage-armored.glb')]);
assert.equal(armored.animations.length,17);
for(const [index,clip]of armored.animations.entries()){
 const original=classic.animations[index];
 assert.equal(clip.name,original.name);
 assert.equal(clip.duration,original.duration);
 assert.equal(clip.tracks.length,original.tracks.length);
 for(const [i,track]of clip.tracks.entries()){
  const old=original.tracks[i];
  assert.equal(track.name,old.name);
  assert.deepEqual(track.times,old.times);
  assert.deepEqual(track.values,old.values);
 }
}
const actor=Object.assign(Object.create(NinjaHero.prototype),{
 root:new T.Group(),somersaultPivot:new T.Group(),visual:new T.Group(),appearances:new Map(),
 starGeometry:new T.BoxGeometry(),red:new T.MeshStandardMaterial(),dark:new T.MeshStandardMaterial(),silver:new T.MeshStandardMaterial()
});
actor.somersaultPivot.position.y=1.1;
actor.root.add(actor.somersaultPivot);
actor.somersaultPivot.add(actor.visual);
actor.useAppearance(armored);
const ch=actor.character;
assert.deepEqual(ch.root.scale.toArray(),[1.30,1,1.30]);
assert.equal(ch.root.getWorldPosition(new T.Vector3()).y,0,'proportion changes keep the rig origin at the feet');
assert.equal(ch.bones.length,54);
assert.equal(ch.triangles,frog?5614:2624);
if(frog){
 for(const name of ['Leaf green skin','Ice white optics','Ion cyan','Visor graphite','Midnight face wrap','Cerulean crest','Palm webbing'])
  assert(ch.meshes.some(m=>m.material.name===name));
}
else assert(ch.meshes.some(m=>m.material.name==='Ice blue visor'&&m.material.emissiveIntensity>1));
for(const mesh of ch.meshes){
 const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
 for(let i=0;i<weights.count;i++){
  assert(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);
  for(let j=0;j<4;j++)assert(indices.getComponent(i,j)>=0&&indices.getComponent(i,j)<54);
 }
}
function deformed(mesh,i){
 return mesh.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i)).applyMatrix4(mesh.matrixWorld);
}
function handAttachment(side){
 const bone=ch.nodes['B_'+side+'_Hand'],position=bone.getWorldPosition(new T.Vector3());
 let min=Infinity,count=0;
 for(const mesh of ch.meshes){
  const handIndex=mesh.skeleton.bones.indexOf(bone),joints=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  for(let i=0;i<joints.count;i++){
   if(joints.getX(i)===handIndex&&weights.getX(i)>.55){
    min=Math.min(min,deformed(mesh,i).distanceTo(position));count++;
   }
  }
 }
 assert(count>0&&min<.095,`visible gauntlet follows the weapon bone (${side}, ${count}, ${min})`);
}
function checkPose(){
 ch.root.updateMatrixWorld(true);
 let box=new T.Box3();
 for(const mesh of ch.meshes){
  mesh.computeBoundingBox();box.union(mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
 }
 assert(!box.isEmpty()&&box.getSize(new T.Vector3()).length()<4.4);
 handAttachment('R');handAttachment('L');
}
for(const clip of ch.clips.values()){
 ch.reset();
 for(let i=0;i<=8;i++){
  ch.update(clip.name,.11,{time:clip.duration*i/8,loop:false});checkPose();
 }
}
ch.reset();
assert.equal(actor.scarf,ch.nodes.B_KageScarf);
assert.equal(actor.heldStar.parent,ch.nodes.B_R_Hand);
assert.equal(actor.blade.parent,ch.nodes.B_L_Hand);

Object.assign(actor,{yaw:0,airTuck:0,landing:0,somersault:0,wallPose:0,time:0,throwPose:0,
 motion:{body:{velocity:new T.Vector3(),mode:'ground'},active:false,slowFall:0,airAge:.25,dash:{direction:new T.Vector3(0,0,1)}},
 shuriken:{charging:false},shurikenEffects:{strikeTime:0},
 shurikenConfig:{slash:{effectSeconds:.32}},
 attacks:{slashTime:0,loading:false,slashDirection:new T.Vector3(0,0,1),slashPoint:p=>p.add(new T.Vector3(0,1.35,0))}});
const views={};
function pose(label,frames=7){
 for(let i=0;i<frames;i++){actor.time+=1/60;actor.pose(1/60,new T.Vector3(0,1.4,12));}
 checkPose();
 if(!process.env.KAGE_POSES)return;
 views[label]=ch.meshes.map(m=>({
  color:m.material.color.toArray(),emissive:m.material.emissive?.toArray(),strength:m.material.emissiveIntensity,
  vertices:Array.from({length:m.geometry.attributes.position.count},(_,i)=>deformed(m,i).toArray())
 }));
}
pose('Idle');
actor.motion.body.velocity.z=17;pose('Run',17);
assert.equal(ch.current,'Run');
actor.motion.body.mode='air';actor.motion.body.velocity.y=8;pose('Jump');
assert.equal(ch.current,'Jump');
actor.motion.active=true;pose('Dash');
assert(actor.blade.visible);
actor.motion.active=false;actor.motion.body.mode='ground';actor.motion.body.velocity.set(0,0,0);
actor.shuriken.charging=true;pose('Charge');
assert(actor.heldStar.visible);
actor.shuriken.charging=false;actor.attacks.slashTime=.14;pose('Slash');
assert(actor.blade.visible);
if(process.env.KAGE_POSES)fs.writeFileSync(process.env.KAGE_POSES,JSON.stringify(views));
const switching=Object.create(NinjaHero.prototype);
Object.assign(switching,{
 appearances:new Map(),visual:new T.Group(),starGeometry:new T.BoxGeometry(),
 red:actor.red,dark:actor.dark,silver:actor.silver,
 motion:{cooldown:4},shuriken:{anchor:{state:'stationary'}},
 attacks:{heldKunai:new T.Mesh(new T.BoxGeometry(),actor.silver),stored:3},
 pose(dt,target){assert.equal(dt,0);assert.equal(target,null);this.posed=(this.posed||0)+1;}
});
switching.useAppearance(armored);
const armorCharacter=switching.character;
const anchor=switching.shuriken.anchor;
switching.useAppearance(classic);
assert.equal(switching.character.triangles,1256);
assert.deepEqual(switching.character.root.scale.toArray(),[1,1,1]);
assert.equal(armorCharacter.root.parent,null);
assert.equal(switching.attacks.heldKunai.parent,switching.character.nodes.B_R_Hand);
assert.equal(switching.heldStar.parent,switching.character.nodes.B_R_Hand);
switching.useAppearance(armored);
assert.equal(switching.character,armorCharacter);
assert.equal(switching.visual.children.length,1);
assert.equal(switching.attacks.heldKunai.parent,armorCharacter.nodes.B_R_Hand);
assert.equal(switching.blade.parent,armorCharacter.nodes.B_L_Hand);
assert.equal(switching.motion.cooldown,4);
assert.equal(switching.shuriken.anchor,anchor);
assert.equal(switching.attacks.stored,3);
assert.equal(switching.posed,3);
console.log('PASS live Kage model switching, retained gameplay state and migrated held kunai');
console.log('PASS 17 identical source clips, 54 bones, model geometry, normalized weights, actual hand and weapon attachments, and Kage run/jump/dash/charge/slash layers');
