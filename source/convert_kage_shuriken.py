"""Convert the supplied .blend with --factory-startup --disable-autoexec.
Only evaluated mesh data is exported; source scripts/actions are never executed.
"""
import bpy,json,sys,os
from mathutils import Matrix,Vector
out=sys.argv[sys.argv.index('--')+1];os.makedirs(out,exist_ok=True)
source=bpy.data.objects.get('Shuriken')
if source is None or source.type!='MESH':raise RuntimeError('Expected supplied Shuriken mesh')
evaluated=source.evaluated_get(bpy.context.evaluated_depsgraph_get())
mesh=bpy.data.meshes.new_from_object(evaluated)
mesh.transform(source.matrix_world);mesh.calc_loop_triangles();count=len(mesh.loop_triangles)
lo=Vector([min(v.co[i] for v in mesh.vertices) for i in range(3)]);hi=Vector([max(v.co[i] for v in mesh.vertices) for i in range(3)]);center=(lo+hi)/2;scale=1.2/max(hi.x-lo.x,hi.y-lo.y)
# Export Y-up glTF with the star in XY, normal +Z, matching the game's spin axis.
orientation=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
mesh.transform(orientation@Matrix.Scale(scale,4)@Matrix.Translation(-center));mesh.update()
obj=bpy.data.objects.new('Kage uploaded shuriken',mesh);bpy.context.collection.objects.link(obj)
for o in bpy.context.selected_objects:o.select_set(False)
obj.select_set(True);bpy.context.view_layer.objects.active=obj
metadata={'source':'Shuriken.blend','companion':'Shuriken.fbx','triangles':count,'vertices':len(mesh.vertices),'diameter':1.2,'plane':'XY','spinAxis':'+Z','sourceMaterials':[m.name for m in mesh.materials if m]}
obj['crossfire_shuriken']=json.dumps(metadata)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'kage-shuriken.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
with open(os.path.join(out,'kage-shuriken.json'),'w') as f:json.dump(metadata,f,indent=2)
print('CROSSFIRE_SHURIKEN',json.dumps(metadata))
