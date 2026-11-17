"""Retarget supplied weighted Shogun geometry to Ronin's existing bind hierarchy.
Blender --disable-autoexec -b SHOGUN_Lowpoly.blend --python this.py -- bind.json output.glb
Source topology/materials survive; mapped source influences are combined, never rigidified.
"""
import bpy,json,sys,os
from mathutils import Vector,Matrix
bind_path,out=sys.argv[sys.argv.index('--')+1:]
targets=json.load(open(bind_path));rig=bpy.data.objects['SHOGUN_Rig'];rig.data.pose_position='REST'
def game(v):return Vector((-v.x,v.z,-v.y)) # source faces -Y, source Right is -X
def blender(v):return Vector((v.x,-v.z,v.y))
heads={b.name:game(rig.matrix_world@b.head_local) for b in rig.data.bones}
mapping={'Hips':'hips','Spine':'torso','Spine1':'torso','Spine2':'torso','Neck':'neck','Head':'head'}
for side in ['Left','Right']:
 for src,dst in [('Shoulder','upper-arm'),('Arm','upper-arm'),('ForeArm','lower-arm'),('Hand','hand'),('UpLeg','upper-leg'),('Leg','lower-leg'),('Foot','foot'),('ToeBase','toe')]:mapping[side+src]=side.lower()+'-'+dst
def mapped(name):
 n=name.replace('mixamorig:','')
 if 'Hand' in n:return ('left' if n.startswith('Left') else 'right')+'-hand'
 if n.startswith('Tissue'):return 'hips'
 if n=='UI_Ring':return 'head'
 if n=='Shoulder_plate':return 'left-shoulder'
 return mapping.get(n,'torso')
source_for={'hips':'Hips','torso':'Spine1','neck':'Neck','head':'Head','left-shoulder':'LeftArm'}
for side in ['Left','Right']:
 for name,dst in [('Arm','upper-arm'),('ForeArm','lower-arm'),('Hand','hand'),('UpLeg','upper-leg'),('Leg','lower-leg'),('Foot','foot'),('ToeBase','toe')]:source_for[side.lower()+'-'+dst]=side+name
links={'upper-arm':('Arm','ForeArm'),'lower-arm':('ForeArm','Hand'),'upper-leg':('UpLeg','Leg'),'lower-leg':('Leg','Foot')}
transforms={};scale=5.6
for dst,src in source_for.items():
 origin=heads['mixamorig:'+src];target=Vector(targets[dst]['position']);rot=Matrix.Identity(3);stretch=scale
 for suffix,(a,b) in links.items():
  if dst.endswith(suffix):
   side='Left' if dst.startswith('left') else 'Right';axis=heads['mixamorig:'+side+b]-heads['mixamorig:'+side+a];rot=axis.normalized().rotation_difference(Vector((0,-1,0))).to_matrix()
   length=2.4 if 'leg' in suffix else (1.45 if suffix=='upper-arm' else 1.55)
   # Stretch along the limb, retaining the asset's armor thickness.
   stretch=length/axis.length
   rot=Matrix.Diagonal((scale,stretch,scale))@rot
   break
 else:rot*=scale
 if dst.endswith(('-foot','-toe')):target.y=origin.y*scale+.01
 transforms[dst]=(origin,target,rot)
body=bpy.data.objects['SHOGUN_Geo'];weights=[]
for v in body.data.vertices:
 original=game(body.matrix_world@v.co);combined={}
 for w in v.groups:
  if w.weight>1e-6:
   dst=mapped(body.vertex_groups[w.group].name);combined[dst]=combined.get(dst,0)+w.weight
 combined=sorted(combined.items(),key=lambda x:-x[1])[:4];total=sum(w for _,w in combined);combined=[(n,w/total) for n,w in combined] if total else [('hips',1)]
 result=Vector()
 for dst,w in combined:
  o,t,m=transforms[dst];result+=(t+m@(original-o))*w
 v.co=blender(result);weights.append(combined)
body.modifiers.clear();body.parent=None;body.matrix_world=Matrix.Identity(4);body.vertex_groups.clear()
for dst in source_for:body.vertex_groups.new(name=dst)
for i,ws in enumerate(weights):
 for n,w in ws:body.vertex_groups[n].add([i],w,'REPLACE')
# Katana becomes a hand-mounted blade, with the supplied scabbard at the hip.
for name,dst in [('Katana_Geo','sword'),('Scabbard_Geo','hips')]:
 obj=bpy.data.objects[name];obj.modifiers.clear();obj.parent=None
 for v in obj.data.vertices:
  p=obj.matrix_world@v.co
  if dst=='sword':g=Vector((p.x*5,p.y*5,.95-p.z*5))+Vector(targets['sword']['position'])
  else:g=Vector((-.95+p.x*4,-.1+p.z*4,-.55+p.y*4))+Vector(targets['hips']['position'])
  v.co=blender(g)
 obj.matrix_world=Matrix.Identity(4);obj.vertex_groups.clear();obj.vertex_groups.new(name=dst).add(list(range(len(obj.data.vertices))),1,'REPLACE')
# Neutral export bones; runtime binds these influences to Ronin's actual animated nodes.
bpy.data.objects.remove(rig,do_unlink=True)
arm=bpy.data.armatures.new('Ronin_Shogun_Bind');rig=bpy.data.objects.new('Ronin_Shogun_Bind',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name in list(source_for)+['sword']:
 b=arm.edit_bones.new(name);b.head=blender(Vector(targets[name]['position']));b.tail=b.head+Vector((0,0,.1))
bpy.ops.object.mode_set(mode='OBJECT')
for obj in [body,bpy.data.objects['Katana_Geo'],bpy.data.objects['Scabbard_Geo']]:
 mod=obj.modifiers.new('Shogun weights','ARMATURE');mod.object=rig;obj.parent=rig
# Convert emission-only source material to portable glTF PBR.
m=bpy.data.materials.get('glow')
if m:
 m.use_nodes=True;m.node_tree.nodes.clear();p=m.node_tree.nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Base Color'].default_value=(.8,.03,.03,1);p.inputs['Emission Color'].default_value=(1,.02,.02,1);p.inputs['Emission Strength'].default_value=2;o=m.node_tree.nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(p.outputs['BSDF'],o.inputs['Surface'])
bpy.context.view_layer.update();os.makedirs(os.path.dirname(out),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_animations=False,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.splitext(out)[0]+'.blend')
