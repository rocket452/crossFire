"""Import only the supplied FBX mesh/textures; run with --factory-startup --disable-autoexec."""
import bpy,json,sys,os
from mathutils import Matrix,Vector
root,out=sys.argv[sys.argv.index('--')+1:];os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=os.path.join(root,'kunai_simple','yamato kunai .fbx'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);center=(lo+hi)/2;scale=.85/(hi.z-lo.z)
orientation=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)));transform=orientation@Matrix.Scale(scale,4)@Matrix.Translation(-center)
triangles=0;parts=[];textures=[]
for o in meshes:
 o.data.transform(transform@o.matrix_world);o.matrix_world=Matrix.Identity(4);o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles);parts.append({'name':o.name,'triangles':len(o.data.loop_triangles)})
 for slot in o.material_slots:
  m=slot.material
  if not m or not m.use_nodes:continue
  for node in m.node_tree.nodes:
   if node.type=='BSDF_PRINCIPLED':
    node.inputs['Metallic'].default_value=.65 if o.name!='Plane' else .05;node.inputs['Roughness'].default_value=.32 if o.name!='Plane' else .8
    for link in list(node.inputs['Alpha'].links):m.node_tree.links.remove(link)
    node.inputs['Alpha'].default_value=1
   if node.type=='TEX_IMAGE' and node.image:
    image=node.image;name=os.path.basename(image.filepath.replace('\\','/'));image.filepath=os.path.join(root,'kunai_simple',name);image.reload()
    if image.size[0]>256:image.scale(256,256)
    image.pack();textures.append(name)
for o in bpy.context.selected_objects:o.select_set(False)
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();obj=bpy.context.object;obj.name='Kage uploaded kunai'
metadata={'source':'kunai.zip / yamato kunai .fbx','triangles':triangles,'parts':parts,'textures':sorted(set(textures)),'textureSize':256,'length':.85,'forward':'+Z','gripOffsetZ':-.20}
obj['crossfire_kunai']=json.dumps(metadata)
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'kage-kunai.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
with open(os.path.join(out,'kage-kunai.json'),'w') as f:json.dump(metadata,f,indent=2)
print('CROSSFIRE_KUNAI',json.dumps(metadata))
