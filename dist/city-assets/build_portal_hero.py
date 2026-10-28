"""Build the low-poly Rift Warden using Blender directly; export rigid articulation."""
import bpy, os, json, math
from mathutils import Vector
HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(os.path.dirname(HERE),'dist','city-assets') if os.path.basename(HERE)=='source' else os.path.join(HERE,'hero-output')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
armor=(.035,.16,.14,1); light=(.75,.78,.65,1); dark=(.018,.035,.035,1); trim=(1,.57,.13,1); glow=(.25,1,.62,1)
mat=bpy.data.materials.new('Warden vertex-color suit'); mat.use_nodes=True
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
# Original masked portal hero: ivory mantle, dark jade suit and gold portal gauntlets.
cube((0,0,1.17),(.59,.35,.34),dark,.05);cube((0,-.2,1.2),(.62,.10,.15),trim,.025);part('pelvis',None,(0,0,1.17))
cube((0,0,1.66),(.73,.40,.68),armor,.08);cube((0,-.23,1.78),(.63,.10,.27),light,.04)
for x in [-.26,.26]:cube((x,-.22,1.57),(.12,.08,.25),trim,.02)
part('chest','pelvis',(0,0,1.38))
bpy.ops.mesh.primitive_torus_add(major_segments=12,minor_segments=4,location=(0,-.31,1.78),major_radius=.12,minor_radius=.026,rotation=(math.pi/2,0,0));o=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);color(o,glow);part('sigil','chest',(0,-.31,1.78))
cube((0,.05,1.99),(.86,.49,.17),light,.04)
for x in [-.34,.34]:cube((x,-.10,2.04),(.14,.36,.20),trim,.025)
part('mantle','chest',(0,0,1.94))
cyl((0,0,2.08),.11,.17,dark)
cube((0,0,2.30),(.44,.39,.49),light,.08);cube((0,-.21,2.31),(.36,.06,.21),dark,.02);cube((0,-.245,2.22),(.23,.07,.10),trim,.02)
part('head','chest',(0,0,2.08))
for x in [-.085,.085]:cube((x,-.248,2.35),(.12,.02,.043),glow,.005)
part('eyes','head',(0,-.248,2.35))
for side,sign in [('l',-1),('r',1)]:
 x=sign*.42
 cube((x,0,1.89),(.30,.40,.24),light,.05);cube((x,0,1.68),(.22,.26,.36),armor,.04);part('upperarm_'+side,'chest',(x,0,1.93))
 cube((x,0,1.32),(.26,.29,.36),light,.04);cyl((x,0,1.48),.19,.10,trim);cube((x,-.17,1.29),(.17,.07,.20),glow,.02);cube((x,0,1.06),(.23,.26,.19),dark,.035);part('forearm_'+side,'upperarm_'+side,(x,0,1.50))
 x=sign*.18
 cube((x,0,.90),(.26,.31,.46),armor,.04);cube((x,-.17,.96),(.17,.07,.25),trim,.02);part('thigh_'+side,'pelvis',(x,0,1.14))
 cube((x,0,.43),(.25,.28,.44),light,.04);cube((x,-.12,.13),(.29,.48,.24),dark,.04);cube((x,-.36,.16),(.22,.045,.10),trim,.01);part('shin_'+side,'thigh_'+side,(x,0,.66))
 cube((sign*.30,.18,.83),(.20,.12,.65),armor,.025);cube((sign*.30,.245,.83),(.065,.025,.57),trim,.01);part('coat_'+side,'pelvis',(sign*.30,.18,1.16))
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/rift-warden.glb',export_format='GLB',use_selection=True,export_animations=False,export_materials='EXPORT')
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
json.dump({'height':2.55,'triangles':triangles,'parts':parts,'authoring':'Blender 4.3 / articulated low-poly portal hero'},open(OUT+'/rift-warden.json','w'),indent=2)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/rift-warden.blend');print('WARDEN_TRIANGLES',triangles,'PARTS',len(parts))
