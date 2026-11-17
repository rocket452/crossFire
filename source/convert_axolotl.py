"""Articulate the uploaded mechanical axolotl without adding replacement geometry.
Run Blender --factory-startup --disable-autoexec -b --python this.py -- input.glb output.glb
"""
import bpy,sys,os,json
from mathutils import Vector
src,dst=sys.argv[sys.argv.index('--')+1:]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=src)
objects=list(bpy.context.scene.objects)
def point(p):return Vector((p[0]*.48,-(p[2]+2.6)*.48,(p[1]+1.37616682)*.48))
def joint(name,p,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=point(p)-(parent.matrix_world.translation if parent else Vector());o.parent=parent;bpy.context.view_layer.update();return o
body=joint('axo_body',(0,-1.37616682,-2.6))
head=joint('axo_head',(0,0,-1.4),body)
jaw=joint('axo_jaw',(0,-.45,-.6),head)
mouth=joint('axo_mouth',(0,-.3,.8),head)
legs={}
for side in [-1,1]:
 for front in [False,True]:legs[side,front]=joint('axo_leg_'+('L' if side<0 else 'R')+('_front' if front else '_rear'),(side*.6,-.45,-1.95 if front else -3.35),body)
gills={}
for side in [-1,1]:
 for i,z in enumerate([-.75,-1.13,-1.45]):gills[side,i]=joint('axo_gill_'+('L' if side<0 else 'R')+'_'+str(i),(side*.5,.4,z),head)
tails=[]
for i,z in enumerate([-3.85,-4.7,-5.83]):tails.append(joint('axo_tail_'+str(i),(0,0,z),tails[-1] if tails else body))
def attach(obj,parent):
 world=obj.matrix_world.copy()
 for v in obj.data.vertices:
  co=world@v.co;v.co=point((co.x,co.z,-co.y))
 obj.matrix_world.identity();obj.parent=parent;obj.location=-parent.matrix_world.translation
 obj.rotation_euler=(0,0,0);obj.scale=(1,1,1)
for obj in objects:
 if obj.type!='MESH':continue
 name=obj.name
 if name.startswith(('Front ','Rear ','Long ','Medium ','Small ')):
  # The source stores both mirrored sides in each mesh. Split by face center
  # to give the four legs and six gills independent rigid animation pivots.
  for side in [-1,1]:
   faces=[p for p in obj.data.polygons if (sum(obj.data.vertices[i].co.x for i in p.vertices)/len(p.vertices)<0)==(side<0)]
   indices=sorted({i for p in faces for i in p.vertices});remap={v:i for i,v in enumerate(indices)}
   mesh=bpy.data.meshes.new(name+str(side));mesh.from_pydata([obj.data.vertices[i].co for i in indices],[],[[remap[i] for i in p.vertices] for p in faces]);mesh.update()
   for m in obj.data.materials:mesh.materials.append(m)
   for a,b in zip(mesh.polygons,faces):a.material_index=b.material_index;a.use_smooth=b.use_smooth
   part=bpy.data.objects.new(name+str(side),mesh);bpy.context.collection.objects.link(part);part.matrix_world=obj.matrix_world
   if name.startswith(('Front ','Rear ')):parent=legs[side,name.startswith('Front ')]
   else:
    number=int(name[-1])-1;parent=gills[side,2-number]
   attach(part,parent)
  bpy.data.objects.remove(obj,do_unlink=True)
 else:
  parent=body
  if name=='Mouth':parent=jaw
  elif name.startswith(('Head','Eye')):parent=head
  elif name.startswith('Tail ') and name[-1].isdigit():parent=tails[int(name[-1])-1]
  attach(obj,parent)
bpy.context.view_layer.update()
os.makedirs(os.path.dirname(dst),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=dst,export_format='GLB',export_yup=True,export_animations=False)
with open(dst+'.json','w') as f:json.dump({'source':'A8-Lo-T.glb','triangles':sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'),'scale':.48,'rig':'rigid articulated parts; four legs, six gills, three tail links, head and jaw'},f,indent=2)
