"""Blender conversion of a user-supplied Explosive LLC pack for Crossfire.
Run: blender -b -t 2 --python source/convert_explosive.py -- --input /private/ExplosiveLLC --output /private/runtime --texture /private/texture.png
The source package and generated licensed geometry/animation belong in private storage.
"""
import bpy,sys,pathlib,argparse,json,struct,math,hashlib
from mathutils import Matrix,Vector
args=argparse.ArgumentParser();args.add_argument('--input',required=True);args.add_argument('--output',required=True);args.add_argument('--texture',required=True);opts=args.parse_args(sys.argv[sys.argv.index('--')+1:]);base=pathlib.Path(opts.input)
if (base/'RPG Character Mecanim Animation Pack FREE').exists():base/= 'RPG Character Mecanim Animation Pack FREE'
out=pathlib.Path(opts.output);out.mkdir(parents=True,exist_ok=True)
def load(rel):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.fbx(filepath=str(base/rel));bpy.context.view_layer.update()
def normalized(m):
 p,q,s=m.decompose();return Matrix.LocRotScale(p,q,Vector((1,1,1)))
def flat(m):return [m[row][col] for col in range(4) for row in range(4)]
load('Models/Characters/RPG-Character-Bones.FBX');arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH');mesh.data.calc_loop_triangles();original_world={b.name:(arm.matrix_world@b.matrix_local).copy() for b in arm.data.bones};old_names=list(original_world);parents=[old_names.index(b.parent.name) if b.parent else -1 for b in arm.data.bones]
world_vertices=[mesh.matrix_world@v.co for v in mesh.data.vertices];lowest=min(v.z for v in world_vertices);height=max(v.z for v in world_vertices)-lowest;scale=1.86/height
C=Matrix(((scale,0,0,0),(0,0,scale,-lowest*scale),(0,-scale,0,0),(0,0,0,1)))
rest=[normalized(C@original_world[n]) for n in old_names];local_rest=[rest[p].inverted()@m if p>=0 else m for m,p in zip(rest,parents)]
image=bpy.data.images.load(opts.texture);pixels=list(image.pixels);width,height_img=image.size
verts=[];normals=[];colors=[];regions=[];joints=[];weights=[];indices=[];vertex_lookup={};max_lost=0
for tri in mesh.data.loop_triangles:
 for li in tri.loops:
  loop=mesh.data.loops[li];v=mesh.data.vertices[loop.vertex_index];uv=mesh.data.uv_layers.active.data[li].uv;px=min(width-1,max(0,int(uv.x*width)));py=min(height_img-1,max(0,int(uv.y*height_img)));rgb=tuple(pixels[(py*width+px)*4+i] for i in range(3));p=C@(mesh.matrix_world@v.co);normal=(C.to_3x3()@mesh.matrix_world.to_3x3().inverted().transposed()@mesh.data.corner_normals[li].vector).normalized()
  influences=sorted([(g.weight,old_names.index(mesh.vertex_groups[g.group].name)) for g in v.groups if mesh.vertex_groups[g.group].name in old_names],reverse=True);selected=influences[:4];total=sum(w for w,j in selected);max_lost=max(max_lost,sum(w for w,j in influences[4:]));selected=[(w/total,j) for w,j in selected] if total else [(1,0)];selected+=( [(0,0)]*(4-len(selected)) )
  head=sum(w for w,j in selected if 'Head' in old_names[j]);hand=sum(w for w,j in selected if 'Finger' in old_names[j] or 'Hand' in old_names[j] or old_names[j]=='B_L_Forearm.001')
  region=1 if head>.5 or hand>.5 else 3 if p.y<.24 else 2 if p.y>1.1 else 0
  key=(loop.vertex_index,tuple(round(x,5) for x in normal),tuple(round(x,4) for x in rgb),region)
  if key not in vertex_lookup:
   vertex_lookup[key]=len(verts)//3;verts.extend(p);normals.extend(normal);colors.extend(rgb);regions.append(region);joints.extend(j for w,j in selected);weights.extend(w for w,j in selected)
  indices.append(vertex_lookup[key])
load('Models/Characters/RPG-Character.FBX');source_rest={o.name:o.matrix_world.copy() for o in bpy.context.scene.objects if o.type=='EMPTY'};mapping=[]
for n in old_names:
 mapped=n if n in source_rest else min(source_rest,key=lambda k:(source_rest[k].translation-original_world[n].translation).length);mapping.append(mapped)
assert len(set(mapping))==len(mapping),'Ambiguous bone mapping'
print('BIND',len(old_names),'bones',len(indices)//3,'triangles',len(verts)//3,'split vertices','max discarded weight',max_lost,flush=True)
# Canonical names repair duplicate node labels in the supplied Bones FBX.
node_names=mapping
binary=bytearray();views=[];accessors=[]
def accessor(values,components,kind='FLOAT',typ=None,target=None):
 component={'FLOAT':(5126,'f'),'USHORT':(5123,'H'),'UBYTE':(5121,'B')}[kind];typ=typ or {1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4',16:'MAT4'}[components]
 while len(binary)%4:binary.append(0)
 start=len(binary);binary.extend(struct.pack('<'+component[1]*len(values),*values));view={'buffer':0,'byteOffset':start,'byteLength':len(binary)-start}
 if target:view['target']=target
 views.append(view);a={'bufferView':len(views)-1,'componentType':component[0],'count':len(values)//components,'type':typ}
 if kind=='FLOAT' and components in [1,3] and values:a.update(min=[min(values[i::components]) for i in range(components)],max=[max(values[i::components]) for i in range(components)])
 accessors.append(a);return len(accessors)-1
attributes={'POSITION':accessor(verts,3,target=34962),'NORMAL':accessor(normals,3,target=34962),'COLOR_0':accessor(colors,3,target=34962),'JOINTS_0':accessor(joints,4,'USHORT',target=34962),'WEIGHTS_0':accessor(weights,4,target=34962),'_REGION':accessor(regions,1,'UBYTE',target=34962)}
index_accessor=accessor(indices,1,'USHORT',target=34963);inverse_accessor=accessor([x for m in rest for x in flat(m.inverted())],16)
nodes=[]
for i,m in enumerate(local_rest):
 p,q,s=m.decompose();node={'name':node_names[i],'translation':list(p),'rotation':[q.x,q.y,q.z,q.w]};children=[j for j,parent in enumerate(parents) if parent==i]
 if children:node['children']=children
 nodes.append(node)
nodes.append({'name':'ExplosiveCharacter','mesh':0,'skin':0})
clips={
 'Idle':'Unarmed/Unarmed-Idle','Run':'Unarmed/Unarmed-Run-Forward','RunBack':'Unarmed/Unarmed-Run-Backward','RunLeft':'Unarmed/Unarmed-Run-Left','RunRight':'Unarmed/Unarmed-Run-Right',
 'Walk':'2Hand-Sword/2Hand-Sword-Walk','Strafe':'Unarmed/Unarmed-Strafe-Forward','Jump':'Unarmed/Unarmed-Jump','Fall':'Unarmed/Unarmed-Fall','Land':'2Hand-Sword/2Hand-Sword-Land',
 'Attack':'Unarmed/Unarmed-Attack-R1','AttackLeft':'Unarmed/Unarmed-Attack-L1','Hit':'Unarmed/Unarmed-GetHit-F1','Death':'Unarmed/Unarmed-Knockdown1','GetUp':'Unarmed/Unarmed-Getup1','Stunned':'Unarmed/Unarmed-Stunned','Roll':'Unarmed/Unarmed-DiveRoll-Forward1'}
animations=[];report=[]
for clip,rel in clips.items():
 group,name=rel.split('/');path=pathlib.Path('Animations')/group/('RPG-Character@'+name+'.FBX');load(path);objects={o.name:o for o in bpy.context.scene.objects if o.type=='EMPTY'}
 start=min(a.frame_range[0] for a in bpy.data.actions);end=max(a.frame_range[1] for a in bpy.data.actions);fps=bpy.context.scene.render.fps;frames=int(round(end-start))+1;times=[i/fps for i in range(frames)];positions=[[] for n in node_names];rotations=[[] for n in node_names];previous=[None]*len(node_names)
 for fi in range(frames):
  bpy.context.scene.frame_set(int(start)+fi);bpy.context.view_layer.update();world=[]
  for i,name in enumerate(node_names):
   delta=objects[name].matrix_world@source_rest[name].inverted();world.append(normalized(C@delta@original_world[old_names[i]]))
  root_delta=world[0].translation-rest[0].translation
  # Gameplay owns root displacement, gravity and collision. Keep authored pelvis bob.
  for m in world:m.translation-=root_delta
  if clip in ['Jump','Fall','Land']:
   pelvis=node_names.index('B_Pelvis');dy=world[pelvis].translation.y-rest[pelvis].translation.y
   for i,m in enumerate(world):
    if i:m.translation.y-=dy
  for i,m in enumerate(world):
   local=world[parents[i]].inverted()@m if parents[i]>=0 else m;p,q,s=local.decompose()
   if previous[i] and q.dot(previous[i])<0:q.negate()
   previous[i]=q.copy();positions[i].extend(p);rotations[i].extend([q.x,q.y,q.z,q.w])
 animation={'name':clip,'samplers':[],'channels':[]};time_accessor=accessor(times,1)
 for i in range(len(node_names)):
  for channel,values,components in [('translation',positions[i],3),('rotation',rotations[i],4)]:
   sample=len(animation['samplers']);animation['samplers'].append({'input':time_accessor,'output':accessor(values,components),'interpolation':'LINEAR'});animation['channels'].append({'sampler':sample,'target':{'node':i,'path':channel}})
 animations.append(animation);report.append({'name':clip,'source':str(path),'frames':frames,'duration':times[-1]});print('CLIP',clip,frames,times[-1],flush=True)
doc={'asset':{'version':'2.0','generator':'Crossfire Blender user-asset conversion','copyright':'Explosive LLC; licensed user-supplied character and animations'},'scene':0,'scenes':[{'nodes':[0,len(nodes)-1]}],'nodes':nodes,'meshes':[{'name':'RPGCharacter','primitives':[{'attributes':attributes,'indices':index_accessor,'material':0}]}],'skins':[{'joints':list(range(len(node_names))),'inverseBindMatrices':inverse_accessor,'skeleton':0}],'materials':[{'name':'RPG Character vertex palette','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'roughnessFactor':.84,'metallicFactor':0},'doubleSided':False}],'animations':animations,'buffers':[{'byteLength':len(binary)}],'bufferViews':views,'accessors':accessors}
j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);binary+=b'\0'*((-len(binary))%4);blob=struct.pack('<III',0x46546C67,2,12+8+len(j)+8+len(binary))+struct.pack('<II',len(j),0x4E4F534A)+j+struct.pack('<II',len(binary),0x004E4942)+binary;(out/'humanoid.glb').write_bytes(blob)
report={'source':'User-supplied Explosive LLC RPG Character Mecanim Animation Pack FREE','triangles':len(indices)//3,'vertices':len(verts)//3,'bones':len(node_names),'height':1.86,'maxDiscardedWeight':max_lost,'boneNames':node_names,'clips':report,'runtimeBytes':len(blob),'rawSourceIncluded':False};(out/'manifest.json').write_text(json.dumps(report,indent=2));print('DONE',json.dumps({k:v for k,v in report.items() if k not in ['clips','boneNames']}),flush=True)
