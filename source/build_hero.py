"""Build the low-poly Violet Sentinel using Blender directly; export rigid articulation."""
import bpy, os, json, math
from mathutils import Vector
HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(os.path.dirname(HERE),'dist','city-assets') if os.path.basename(HERE)=='source' else os.path.join(HERE,'hero-output')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
armor=(.14,.045,.28,1); light=(.40,.19,.66,1); dark=(.025,.018,.07,1); trim=(.68,.57,.82,1); glow=(.73,.24,1,1)
mat=bpy.data.materials.new('Sentinel vertex-color suit'); mat.use_nodes=True
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
# Athletic original masked hero, front -Y, exported to +Z. All dimensions metres.
cube((0,0,1.18),(.58,.33,.34),dark,.05);cube((0,-.18,1.23),(.57,.10,.12),trim,.025);part('pelvis',None,(0,0,1.18))
cube((0,0,1.65),(.76,.40,.69),armor,.10);cube((0,-.23,1.77),(.68,.12,.27),light,.05)
for x in [-.22,.22]:
 cube((x,-.22,1.56),(.19,.10,.30),dark,.03);cube((x,0,1.98),(.30,.42,.15),trim,.04)
part('chest','pelvis',(0,0,1.38))
cube((0,-.315,1.79),(.16,.07,.20),glow,.04);part('sigil','chest',(0,-.315,1.79))
cyl((0,0,2.08),.12,.17,dark)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(0,-.015,2.31));o=bpy.context.object;o.scale=(.235,.205,.275);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);color(o,armor)
cube((0,-.195,2.32),(.38,.075,.15),dark,.03);cube((0,-.15,2.16),(.23,.12,.13),trim,.025);part('head','chest',(0,0,2.08))
for x in [-.095,.095]:cube((x,-.242,2.34),(.125,.018,.038),glow,.007)
part('eyes','head',(0,-.242,2.34))
for side,sign in [('l',-1),('r',1)]:
 x=sign*.42
 cyl((x,0,1.92),.17,.20,light,axis=(1,0,0));cube((x,0,1.72),(.23,.28,.40),armor,.05);part('upperarm_'+side,'chest',(x,0,1.93))
 cube((x,0,1.34),(.23,.27,.37),light,.04);cube((x,-.02,1.08),(.24,.25,.21),dark,.035);cube((x,-.16,1.30),(.16,.055,.17),glow,.02);part('forearm_'+side,'upperarm_'+side,(x,0,1.50))
 x=sign*.19
 cube((x,0,.91),(.27,.31,.47),armor,.05);cube((x,-.15,.96),(.17,.06,.28),light,.02);part('thigh_'+side,'pelvis',(x,0,1.14))
 cyl((x,0,.65),.145,.25,dark,axis=(1,0,0));cube((x,0,.42),(.26,.29,.43),light,.035);cube((x,-.10,.12),(.30,.49,.22),dark,.04);cube((x,-.355,.14),(.24,.04,.11),trim,.015);part('shin_'+side,'thigh_'+side,(x,0,.66))
# Three articulated cape panels create a readable silhouette in flight.
def cape_panel(z_top,z_bottom,width_top,width_bottom,y_top,y_bottom):
 verts=[(-width_top/2,y_top,z_top),(width_top/2,y_top,z_top),(-width_bottom/2,y_bottom,z_bottom),(width_bottom/2,y_bottom,z_bottom)]
 mesh=bpy.data.meshes.new('Cape facets');mesh.from_pydata(verts,[],[(0,2,3,1)]);mesh.update();o=bpy.data.objects.new('Cape',mesh);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
 solid=o.modifiers.new('Cape thickness','SOLIDIFY');solid.thickness=.025;bpy.ops.object.modifier_apply(modifier=solid.name);color(o,light)
cape_panel(2.0,1.40,.66,.91,.22,.34);part('cape_top','chest',(0,.22,2.0))
cape_panel(1.40,.79,.91,1.12,.34,.47);part('cape_mid','cape_top',(0,.34,1.40))
cape_panel(.79,.25,1.12,1.25,.47,.63);part('cape_tail','cape_mid',(0,.47,.79))
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/violet-sentinel.glb',export_format='GLB',use_selection=True,export_animations=False,export_materials='EXPORT')
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
json.dump({'height':2.59,'triangles':triangles,'parts':parts,'authoring':'Blender 4.3 / articulated low-poly hero'},open(OUT+'/violet-sentinel.json','w'),indent=2)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/violet-sentinel.blend');print('HERO_TRIANGLES',triangles,'PARTS',len(parts))
