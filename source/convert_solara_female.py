"""Rig the user-supplied female.blend for Solara. Run with Blender --disable-autoexec.
The input and derived runtime geometry stay outside PUBLIC GitHub history.
blender --factory-startup --disable-autoexec -b INPUT.blend --python source/convert_solara_female.py -- --output /private/runtime
"""
import bpy,sys,argparse,pathlib,json,struct,math,hashlib
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True)
source=next(o for o in bpy.context.scene.objects if o.type=='MESH');source.animation_data_clear();bpy.context.view_layer.objects.active=source
for m in list(source.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
source.data.calc_loop_triangles();original_triangles=len(source.data.loop_triangles)
rig_data=bpy.data.armatures.new('Solara female deformation');rig=bpy.data.objects.new('SolaraFemaleRig',rig_data);bpy.context.collection.objects.link(rig);bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
spec=[('Motion',None,(0,0,.02),(0,0,1)),('B_Pelvis','Motion',(0,.05,4.05),(0,.05,4.45)),('B_Spine','B_Pelvis',(0,.05,4.45),(0,.08,4.95)),('B_Spine1','B_Spine',(0,.08,4.95),(0,.13,5.40)),('B_Spine2','B_Spine1',(0,.13,5.40),(0,.17,5.75)),('B_Neck','B_Spine2',(0,.17,5.75),(0,.16,6.05)),('B_Head','B_Neck',(0,.16,6.05),(0,.16,6.9))]
for side,sign in [('R',-1),('L',1)]:
 def q(x,y,z):return(sign*x,y,z)
 prefix='B_'+side+'_'
 spec += [(prefix+'Clavicle','B_Spine2',q(.08,.16,5.65),q(.52,.16,5.56)),(prefix+'UpperArm',prefix+'Clavicle',q(.52,.16,5.56),q(.97,.25,4.70)),(prefix+'Forearm',prefix+'UpperArm',q(.97,.25,4.70),q(1.447,.21,4.045)),(prefix+'Hand',prefix+'Forearm',q(1.447,.21,4.045),q(1.70,.20,3.65)),(prefix+'Thigh','B_Pelvis',q(.31,.05,4.05),q(.295,.055,2.28)),(prefix+'Calf',prefix+'Thigh',q(.295,.055,2.28),q(.23,.18,.53)),(prefix+'Foot',prefix+'Calf',q(.23,.18,.53),q(.23,-.31,.12)),(prefix+'Toe0',prefix+'Foot',q(.23,-.31,.12),q(.23,-.45,.10))]
for name,parent,head,tail in spec:
 b=rig_data.edit_bones.new(name);b.head=head;b.tail=tail;b.use_deform=name!='Motion'
 if parent:b.parent=rig_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');bpy.ops.object.select_all(action='DESELECT');source.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
try:bpy.ops.object.parent_set(type='ARMATURE_AUTO')
except RuntimeError as e:print('HEAT_FALLBACK',str(e))
# Repair only any vertices missed by Blender's heat weighting, with nearby bone envelopes.
bones=list(rig_data.bones);names=[b.name for b in bones];deform=[i for i,b in enumerate(bones) if b.use_deform];fallback=0
for v in source.data.vertices:
 if sum(g.weight for g in v.groups)>1e-6:continue
 point=source.matrix_world@v.co;scores=[]
 for i in deform:
  a=rig.matrix_world@bones[i].head_local;b=rig.matrix_world@bones[i].tail_local;d=b-a;t=max(0,min(1,(point-a).dot(d)/max(1e-9,d.length_squared)));distance=(point-(a+d*t)).length;scores.append((distance,i))
 for distance,i in sorted(scores)[:2]:
  group=source.vertex_groups.get(names[i]) or source.vertex_groups.new(name=names[i]);group.add([v.index],1/max(.02,distance)**4,'REPLACE')
 fallback+=1
world=[source.matrix_world@v.co for v in source.data.vertices];floor=min(v.z for v in world);height=max(v.z for v in world)-floor;scale=1.86/height
C=Matrix(((scale,0,0,0),(0,0,scale,-floor*scale),(0,-scale,0,0),(0,0,0,1)))
def normalized(m):
 p,q,s=m.decompose();return Matrix.LocRotScale(p,q,Vector((1,1,1)))
def flat(m):return[m[row][col] for col in range(4) for row in range(4)]
rest=[normalized(C@rig.matrix_world@b.matrix_local) for b in bones];parents=[names.index(b.parent.name) if b.parent else -1 for b in bones];local=[rest[parent].inverted()@matrix if parent>=0 else matrix for matrix,parent in zip(rest,parents)]
verts=[];normals=[];colors=[];regions=[];joints=[];weights=[];indices=[];lookup={};discarded=0
source.data.calc_loop_triangles()
for triangle in source.data.loop_triangles:
 for li in triangle.loops:
  loop=source.data.loops[li];v=source.data.vertices[loop.vertex_index];point=C@(source.matrix_world@v.co);normal=(C.to_3x3()@source.matrix_world.to_3x3().inverted().transposed()@source.data.corner_normals[li].vector).normalized()
  influence=sorted([(g.weight,names.index(source.vertex_groups[g.group].name)) for g in v.groups if source.vertex_groups[g.group].name in names],reverse=True);chosen=influence[:4];total=sum(w for w,j in chosen);assert total>0,'unweighted vertex';discarded=max(discarded,sum(w for w,j in influence[4:])/sum(w for w,j in influence));chosen=[(w/total,j) for w,j in chosen];chosen+=[(0,0)]*(4-len(chosen))
  skin=sum(w for w,j in chosen if 'Head' in names[j] or 'Hand' in names[j]);region=1 if skin>.5 else 3 if point.y<.22 else 2 if point.y>1.0 else 0
  key=(v.index,tuple(round(x,5) for x in normal),region)
  if key not in lookup:
   lookup[key]=len(verts)//3;verts.extend(point);normals.extend(normal);colors.extend((1,1,1));regions.append(region);joints.extend(j for w,j in chosen);weights.extend(w for w,j in chosen)
  indices.append(lookup[key])
binary=bytearray();views=[];accessors=[]
def accessor(values,components,kind='FLOAT',target=None):
 types={'FLOAT':(5126,'f'),'USHORT':(5123,'H'),'UBYTE':(5121,'B')};code,fmt=types[kind]
 while len(binary)%4:binary.append(0)
 start=len(binary);binary.extend(struct.pack('<'+fmt*len(values),*values));view={'buffer':0,'byteOffset':start,'byteLength':len(binary)-start}
 if target:view['target']=target
 views.append(view);a={'bufferView':len(views)-1,'componentType':code,'count':len(values)//components,'type':{1:'SCALAR',3:'VEC3',4:'VEC4',16:'MAT4'}[components]}
 if kind=='FLOAT' and components in[1,3]:a.update(min=[min(values[i::components]) for i in range(components)],max=[max(values[i::components]) for i in range(components)])
 accessors.append(a);return len(accessors)-1
attributes={'POSITION':accessor(verts,3,target=34962),'NORMAL':accessor(normals,3,target=34962),'COLOR_0':accessor(colors,3,target=34962),'JOINTS_0':accessor(joints,4,'USHORT',target=34962),'WEIGHTS_0':accessor(weights,4,target=34962),'_REGION':accessor(regions,1,'UBYTE',target=34962)}
index=accessor(indices,1,'USHORT',34963);inverse=accessor([x for m in rest for x in flat(m.inverted())],16);nodes=[]
for i,m in enumerate(local):
 pos,quat,s=m.decompose();node={'name':names[i],'translation':list(pos),'rotation':list(quat)};node['rotation']=[quat.x,quat.y,quat.z,quat.w];children=[j for j,parent in enumerate(parents) if parent==i]
 if children:node['children']=children
 nodes.append(node)
nodes.append({'name':'UserFemaleBody','mesh':0,'skin':0});times=accessor([0,2],1);samplers=[];channels=[]
# Static rest keys establish a valid action; Solara's surfing/casting uses live bone IK.
for i,m in enumerate(local):
 pos,quat,s=m.decompose();values=[quat.x,quat.y,quat.z,quat.w]*2;samplers.append({'input':times,'output':accessor(values,4),'interpolation':'LINEAR'});channels.append({'sampler':len(samplers)-1,'target':{'node':i,'path':'rotation'}})
metadata={'source':'female.blend','triangles':len(indices)//3,'bones':len(bones),'nominalHeight':1.86,'rig':'Solara female / anatomical deformation','pose':{'pelvisHeight':1.35},'headAccessories':{'hair':{'scale':[.72,1,.86],'offset':[0,.10,0]},'eyes':{'scale':[.72,1,.86],'offset':[0,.08,-.02]}}}
doc={'asset':{'version':'2.0','generator':'Crossfire Blender female model rig conversion'},'scene':0,'scenes':[{'nodes':[0,len(nodes)-1],'extras':{'character':metadata}}],'nodes':nodes,'meshes':[{'name':'UploadedFemale','primitives':[{'attributes':attributes,'indices':index,'material':0}]}],'skins':[{'joints':list(range(len(bones))),'inverseBindMatrices':inverse,'skeleton':0}],'materials':[{'name':'Elemental body surface','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'roughnessFactor':.65,'metallicFactor':0}}],'animations':[{'name':'Idle','samplers':samplers,'channels':channels}],'buffers':[{'byteLength':len(binary)}],'bufferViews':views,'accessors':accessors}
json_data=json.dumps(doc,separators=(',',':')).encode();json_data+=b' '*((-len(json_data))%4);binary+=b'\0'*((-len(binary))%4);glb=struct.pack('<III',0x46546c67,2,12+8+len(json_data)+8+len(binary))+struct.pack('<I4s',len(json_data),b'JSON')+json_data+struct.pack('<I4s',len(binary),b'BIN\0')+binary
(out/'solara-female.glb').write_bytes(glb);report={**metadata,'inputVertices':len(source.data.vertices),'inputTriangles':original_triangles,'renderVertices':len(verts)//3,'fallbackVertices':fallback,'maxDiscardedWeightFraction':discarded,'outputBytes':len(glb),'sha256':hashlib.sha256(glb).hexdigest()};(out/'solara-female.json').write_text(json.dumps(report,indent=2));print('FEMALE_EXPORT',json.dumps(report))
