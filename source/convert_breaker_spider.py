"""Normalize the supplied rigid bone-parented robot without replacing its rig.
Run Blender with --factory-startup --disable-autoexec; input is a private .blend.
"""
import bpy,json,sys,os
from mathutils import Vector,Matrix
args=sys.argv[sys.argv.index('--')+1:];out=args[0];os.makedirs(out,exist_ok=True)
arm=bpy.data.objects['Armature'];meshes=[o for o in bpy.data.objects if o.type=='MESH']
# Evaluate mirror/smoothing modifiers, retaining all rigid bone parenting.
for obj in meshes:
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 for m in list(obj.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 obj.select_set(False)
bpy.context.view_layer.update()
points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
scale=5.4/(hi.x-lo.x);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
arm.matrix_world=Matrix.Scale(scale,4)@Matrix.Translation(-center)@arm.matrix_world
# Preserve the authored navy/lavender/red palette; cap the lamp-like eye emission.
for m in bpy.data.materials:
 if m.use_nodes:
  for n in m.node_tree.nodes:
   if n.type=='EMISSION':n.inputs['Strength'].default_value=3
bpy.context.view_layer.update()
for o in bpy.context.selected_objects:o.select_set(False)
arm.select_set(True)
for o in meshes:o.select_set(True)
triangles=0
for o in meshes:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
metadata={'source':'LowPoly_SpiderBot_Rzenn.blend','triangles':triangles,'bones':len(arm.data.bones),'rig':'rigid bone parenting','sourceActions':len(bpy.data.actions),'width':5.4,'height':(hi.z-lo.z)*scale,'scale':scale,'boneMeshes':{o.name:o.parent_bone for o in meshes},'legs':[['Bone.002','Bone.004','Bone.005'],['Bone.003','Bone.006','Bone.007'],['Bone.008','Bone.009','Bone.010'],['Bone.011','Bone.012','Bone.013']]}
arm['crossfire_spider']=json.dumps(metadata)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'breaker-spider.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
open(os.path.join(out,'breaker-spider.json'),'w').write(json.dumps(metadata,indent=2))
print('CROSSFIRE_SPIDER',json.dumps(metadata))
