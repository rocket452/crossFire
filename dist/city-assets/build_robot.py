"""Build the low-poly Siege Walker using Blender directly; export rigid articulation."""
import bpy, os, json, math
from mathutils import Vector
HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(os.path.dirname(HERE),'dist','city-assets') if os.path.basename(HERE)=='source' else os.path.join(HERE,'robot-output')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
armor=(.19,.24,.27,1); light=(.37,.43,.43,1); dark=(.055,.075,.09,1); trim=(.79,.39,.12,1); glow=(1,.25,.035,1)
mat=bpy.data.materials.new('Walker painted alloy'); mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF'); bs.inputs['Metallic'].default_value=.42; bs.inputs['Roughness'].default_value=.68
vc=mat.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name='Color'; mat.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
parts=[]; meshes=[]; current=[]
def cube(p,s,c=armor,bevel=.12):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p); o=bpy.context.object; o.scale=s; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Single facet armor edges','BEVEL'); m.width=bevel; m.segments=1; bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=m.name)
 color(o,c); return o
def cyl(p,r,d,c=dark,axis=(0,0,1),v=8):
 bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d,location=p); o=bpy.context.object; o.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler(); bpy.ops.object.transform_apply(location=False,rotation=True,scale=True); color(o,c); return o
def bar(a,b,r,c=dark,v=6):
 a,b=Vector(a),Vector(b); return cyl((a+b)/2,r,(b-a).length,c,b-a,v)
def color(o,c):
 ca=o.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
 for d in ca.data:d.color=c
 o.data.materials.append(mat);current.append(o)
def part(name,parent,pivot):
 bpy.ops.object.select_all(action='DESELECT')
 for o in current:o.select_set(True)
 bpy.context.view_layer.objects.active=current[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.data.transform(o.matrix_world);o.matrix_world.identity()
 meshes.append(o); parts.append({'name':name,'parent':parent,'pivot':[pivot[0],pivot[2],-pivot[1]]});current.clear()
# Blender Z is up; forward is -Y. The glTF export becomes Y up / +Z forward.
cube((0,0,10),(3.8,2.5,2.1),dark);cube((0,-1.1,10),(3.2,.65,1.3),armor);cyl((0,-1.5,10),.65,.2,trim,axis=(0,1,0));part('pelvis',None,(0,0,10))
cyl((0,0,11.6),1.35,1.8,dark);cube((0,-1.02,11.8),(2.5,.6,1.5),light);cube((0,-1.4,11.7),(1.8,.16,.3),trim);part('waist','pelvis',(0,0,10.8))
cube((0,0,14.3),(5.8,3.2,4.1),armor,.35);cube((0,-1.6,15.5),(5.5,.7,1.1),light,.18)
for s in [-1,1]:
 cube((s*2.1,-1.77,14.2),(1,.5,2.1),light);cube((s*2.2,1.8,14.8),(1.1,1.0,2.9),dark)
 for z in [13.8,14.3,14.8]:cube((s*2.2,2.35,z),(.85,.1,.12),trim,.02)
cyl((0,-1.85,14.1),1.02,.5,dark,axis=(0,1,0),v=12);cyl((0,-2.13,14.1),.72,.15,trim,axis=(0,1,0),v=12)
part('chest','waist',(0,0,12.3))
cyl((0,-2.23,14.1),.49,.12,glow,axis=(0,1,0),v=10);part('reactor','chest',(0,-2.23,14.1))
cyl((0,0,17),.72,1.1,dark);cube((0,-.1,18.4),(2.4,2.2,2.2),armor,.22);cube((0,-.3,19.55),(2.65,2.3,.45),light);cube((0,-1.2,17.75),(1.45,.3,.55),dark)
bar((1.04,.65,19.3),(1.1,.65,21),.08,dark);cube((0,.96,18.4),(1.8,.4,1.2),dark);part('head','chest',(0,0,16.6))
cube((0,-1.235,18.65),(1.95,.1,.26),glow,.02);part('visor','head',(0,-1.235,18.65))
for side,s in [('l',-1),('r',1)]:
 x=s*1.75
 cyl((x,0,9.6),.85,1.15,dark,axis=(1,0,0));cube((x,0,7.9),(1.85,2.2,3.3),armor,.2);cube((x,-1.12,8.1),(1.45,.35,2.3),light);cube((x,-1.33,7.8),(1.05,.15,.35),trim,.02)
 bar((x+s*.75,.8,9.3),(x+s*.75,.8,7),.18,light);part('thigh_'+side,'pelvis',(x,0,9.8))
 cyl((x,-.1,6.1),.78,1.8,dark,axis=(1,0,0));cube((x,-1.04,6.1),(1.7,.55,1.2),trim);cube((x,0,3.7),(1.65,1.85,4.2),armor,.18);cube((x,-1.02,3.8),(1.2,.35,3),light)
 bar((x+s*.8,.65,5.4),(x+s*.8,.65,2),.16,light);part('shin_'+side,'thigh_'+side,(x,0,6.1))
 cube((x,-.65,.85),(2.3,3.8,1.5),armor,.18);cube((x,-2.08,.62),(2.4,1,1.0),dark);cube((x,-2.55,.78),(2,.15,.35),trim,.02);part('foot_'+side,'shin_'+side,(x,0,1.6))
 x=s*3.6
 cyl((x,0,15.5),.95,1.25,dark,axis=(1,0,0));cube((x,0,15.8),(2.5,3.3,1.9),armor,.22);cube((x,-1.7,15.9),(1.95,.25,1.0),trim);cube((x,0,13.8),(1.4,1.7,2.8),light,.16)
 bar((x+s*.65,.7,15.1),(x+s*.65,.7,12.8),.2,dark);part('upperarm_'+side,'chest',(x,0,15.5))
 cyl((x,0,12.1),.65,1.6,dark,axis=(1,0,0));cube((x,0,10.7),(1.8,2.1,2.5),armor,.18)
 if side=='r':
  cyl((x,0,9.3),.72,1.5,dark);cyl((x,0,8.5),.82,.3,trim)
  for a in range(6):
   t=a*math.tau/6;cyl((x+.48*math.cos(t),.48*math.sin(t),8.85),.13,1.2,light)
  cyl((x,0,8.32),.38,.15,glow)
 else:
  cube((x,0,9.2),(1.6,1.4,.9),dark)
  for j in [-1,0,1]:cube((x+j*.52,-.25,8.65),(.37,1.2,1.2),light,.05)
 part('forearm_'+side,'upperarm_'+side,(x,0,12.1))
# Six-cell launcher, rigidly mounted above the left shoulder; +Z forward in glTF.
cube((-3.6,.15,18.7),(3.45,3.4,2.85),armor,.20)
cube((-3.6,.65,17.25),(1.6,1.7,.7),dark,.1)
cube((-3.6,-1.62,18.7),(3.25,.20,2.6),trim,.06)
for row in range(2):
 for col in range(3):
  x=-3.6+(col-1)*.94;z=18.2+row*.94
  cyl((x,-1.8,z),.43,.26,dark,axis=(0,-1,0),v=8)
  cyl((x,-1.96,z),.29,.12,light,axis=(0,-1,0),v=8)
  cyl((x,-2.04,z),.11,.04,glow,axis=(0,-1,0),v=6)
for x in [-5.25,-1.95]:cube((x,.1,18.7),(.14,2.8,1.9),light,.03)
part('rocket_pod','chest',(-3.6,0,17.4))
# Save source and rigid parts, no texture downloads or runtime skeleton required.
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/siege-walker.glb',export_format='GLB',use_selection=True,export_animations=False,export_materials='EXPORT')
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
json.dump({'height':21,'triangles':triangles,'parts':parts,'authoring':'Blender 4.3 / rigid low-poly articulation'},open(OUT+'/siege-walker.json','w'),indent=2)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/siege-walker.blend');print('ROBOT_TRIANGLES',triangles,'PARTS',len(parts))
# One reusable low-poly missile, origin at center, forward -Y -> glTF +Z.
cyl((0,0,0),.24,1.5,light,axis=(0,1,0),v=8)
cyl((0,.76,0),.25,.15,trim,axis=(0,1,0),v=8)
bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=.24,radius2=0,depth=.52,location=(0,-1.01,0))
o=bpy.context.object;o.rotation_euler[0]=math.pi/2;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);color(o,trim)
for x,z in [(1,0),(-1,0),(0,1),(0,-1)]:
 cube((x*.27,.48,z*.27),(.58 if x else .06,.65,.58 if z else .06),dark,.01)
part('robot_missile',None,(0,0,0))
bpy.ops.object.select_all(action='DESELECT');meshes[-1].select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/robot-missile.glb',export_format='GLB',use_selection=True,export_animations=False,export_materials='EXPORT')
