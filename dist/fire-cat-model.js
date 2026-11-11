import * as THREE from './vendor/three.module.js';
// Original low-poly predator silhouette. Cosmetic deformation only; AI owns travel.
export class FireCatModel {
 constructor(parent){
  this.root=parent;this.legs=[];this.tailSegments=16;
  const surface=(color,glow=0)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:glow,roughness:.72,flatShading:true}),red=surface('#b6260c',.18),coal=surface('#1c171c'),gold=surface('#ed9214',.45),hot=new THREE.MeshBasicMaterial({color:'#fff4c5',toneMapped:false}),eyeRed=new THREE.MeshBasicMaterial({color:'#e64014',toneMapped:false});
  this.pattern=red.clone();this.pattern.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 felineBind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n felineBind=position;');shader.fragmentShader='varying vec3 felineBind;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 p=felineBind;float jag=.17*sin(p.z*13.+p.x*3.)+.11*sin(p.z*25.);float saddle=step(.50+jag,p.y);float flecks=step(1.05,sin(p.z*14.+p.y*7.)+cos(p.y*15.+p.x*8.))*step(-.50,p.y);float mask=max(saddle,flecks);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.018,.012,.017),mask);`);shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance*=1.-mask;');};this.pattern.customProgramCacheKey=()=> 'firecat-jagged-charcoal-v1';
  const ball=new THREE.IcosahedronGeometry(1,1),cone=new THREE.ConeGeometry(1,1,5),add=(p,g,m,at,size)=>{const o=new THREE.Mesh(g,m);o.position.set(...at);o.scale.set(...size);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
  const shard=(parent,points,material,depth=.04)=>{const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});g.computeVertexNormals();return add(parent,g,material,[0,0,0],[1,1,1]);};
  this.body=new THREE.Group();parent.add(this.body);add(this.body,ball,this.pattern,[0,1.02,-.06],[.34,.35,1.04]);add(this.body,ball,red,[0,1.03,.55],[.38,.44,.46]);add(this.body,ball,this.pattern,[0,1,-.77],[.32,.36,.39]);add(this.body,ball,gold,[0,.86,.67],[.23,.33,.3]);
  this.head=new THREE.Group();this.head.position.set(0,1.43,.9);this.head.rotation.x=.05;this.body.add(this.head);add(this.head,ball,red,[0,0,0],[.35,.3,.37]);
  // Swept, outward ears and cheek tufts instead of a round mascot face.
  for(const s of[-1,1]){
   const ear=shard(this.head,[[s*.12,.14],[s*.57,.58],[s*.45,.08],[s*.29,-.03]],coal,.12);ear.position.z=-.16;
   const inner=shard(this.head,[[s*.24,.17],[s*.49,.47],[s*.38,.14]],red,.025);inner.position.z=-.025;
   for(let i=0;i<3;i++){const tuft=shard(this.head,[[s*.20,-.02-i*.09],[s*(.52-i*.035),-.01-i*.12],[s*.29,-.22-i*.05]],i===2?gold:coal,.08);tuft.position.z=.02;}
   const socket=shard(this.head,[[s*.025,.025],[s*.34,.17],[s*.32,-.025],[s*.12,-.08]],coal,.035);socket.position.z=.285;
   const eye=shard(this.head,[[s*.075,.005],[s*.295,.115],[s*.265,.01],[s*.14,-.035]],hot,.016);eye.position.z=.329;
   const pupil=shard(this.head,[[s*.205,.065],[s*.22,.068],[s*.212,-.006]],eyeRed,.008);pupil.position.z=.35;
   const brow=shard(this.head,[[s*.015,.045],[s*.32,.215],[s*.38,.17],[s*.055,.015]],coal,.04);brow.position.z=.32;
   const muzzle=shard(this.head,[[0,-.09],[s*.26,-.08],[s*.24,-.20],[s*.11,-.27],[0,-.21]],gold,.13);muzzle.position.z=.27;
   const fang=add(this.head,cone,hot,[s*.16,-.205,.425],[.033,.13,.035]);fang.rotation.z=Math.PI;
  }
  const nose=shard(this.head,[[-.085,-.075],[.085,-.075],[0,-.15]],coal,.03);nose.position.z=.424;
  const mouth=shard(this.head,[[-.19,-.175],[0,-.22],[.19,-.175],[.12,-.245],[0,-.26],[-.12,-.245]],coal,.025);mouth.position.z=.413;
  const crest=shard(this.head,[[-.15,.21],[-.1,.37],[.02,.28],[.12,.38],[.18,.19],[.08,.08],[0,.15],[-.05,.08]],coal,.035);crest.position.z=.16;
  // Golden flame-shaped bib and angular shoulder tufts.
  const bib=shard(this.body,[[-.19,1.17],[.19,1.17],[.23,.97],[.12,.91],[.05,.63],[-.04,.79],[-.15,.73],[-.16,.96]],gold,.06);bib.position.z=.86;
  for(const s of[-1,1]){const ruff=shard(this.body,[[s*.2,1.27],[s*.52,1.34],[s*.4,1.09],[s*.5,1.01],[s*.28,.94]],coal,.14);ruff.position.z=.4;}
  // Longer articulated legs, compact paws and defined claws.
  for(const x of[-.30,.30])for(const z of[-.75,.65]){const front=z>0,leg=new THREE.Group();leg.position.set(x,1.01,z);this.body.add(leg);add(leg,ball,this.pattern,[0,-.23,front?0:-.1],[front?.14:.19,.35,.18]);const lower=new THREE.Group();lower.position.set(0,-.49,front?.02:-.16);leg.add(lower);add(lower,ball,red,[0,-.16,.06],[.105,.24,.12]);const paw=new THREE.Group();paw.position.set(0,-.39,.14);lower.add(paw);add(paw,ball,coal,[0,0,.05],[.15,.11,.22]);for(const t of[-1,0,1]){const claw=add(paw,cone,gold,[t*.085,-.015,.24],[.024,.13,.025]);claw.rotation.x=Math.PI/2;}this.legs.push(leg);leg.userData={lower,paw,front};}
  this.tail=new THREE.Group();this.body.add(this.tail);this.tailGeometry=new THREE.BufferGeometry();const count=17*8,positions=new Float32Array(count*3),colors=new Float32Array(count*3),indices=[],orange=new THREE.Color('#fa4c08'),yellow=new THREE.Color('#ffd043');for(let r=0;r<17;r++)for(let j=0;j<8;j++){const i=r*8+j,c=orange.clone().lerp(yellow,Math.max(0,Math.sin(j*Math.PI/4))*.9);c.toArray(colors,i*3);if(r<16){const n=r*8+(j+1)%8;indices.push(i,n,i+8,n,n+8,i+8);}}this.tailGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));this.tailGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));this.tailGeometry.setIndex(indices);this.tailMesh=new THREE.Mesh(this.tailGeometry,new THREE.MeshStandardMaterial({vertexColors:true,emissive:'#ff6b0a',emissiveIntensity:.55,roughness:.65,side:THREE.DoubleSide}));this.tailMesh.frustumCulled=false;this.tail.add(this.tailMesh);
  this.pose(0,new THREE.Vector3());
 }
 pose(time,velocity){const moving=velocity.length()>.5,phase=time*(moving?9:3),bound=Math.sin(phase),amount=moving?1:.12;this.body.position.y=bound*.07*amount;this.body.rotation.x=-.05+Math.cos(phase)*.06*amount;this.body.scale.z=1+bound*.045*amount;this.head.rotation.x=-.04-this.body.rotation.x*.4;
  for(let i=0;i<4;i++){const leg=this.legs[i],{lower,paw,front}=leg.userData,cycle=phase+(front?0:1.7)+(i>1?.22:0);leg.rotation.x=Math.sin(cycle)*.75*amount+(front?-.12:.15);lower.rotation.x=Math.max(0,Math.cos(cycle))*.9*amount+(front?.1:-.25);paw.rotation.x=-lower.rotation.x*.55;}
  const attr=this.tailGeometry.attributes.position;for(let r=0;r<17;r++){const t=r/16,z=-.90-t*2.35,x=Math.sin(time*4-t*4)*t*.23,y=1.04+Math.sin(t*Math.PI)*.42+t*.12+Math.sin(time*6-t*7)*t*.06,width=(.07+.24*Math.sin(t*Math.PI))*(1-t*.8),height=(.12+.38*Math.sin(t*Math.PI))*(1-t*.85);for(let j=0;j<8;j++){const a=j*Math.PI/4,jag=1+Math.sin(r*2.3+j*1.8+time*5)*.12*t;attr.setXYZ(r*8+j,x+Math.cos(a)*width*jag,y+Math.sin(a)*height*jag,z);} }
  attr.needsUpdate=true;this.tailGeometry.computeVertexNormals();
 }
}
