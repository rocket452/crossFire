import bpy,os
from mathutils import Vector
HERE=os.path.dirname(os.path.abspath(__file__));OUT=os.path.dirname(HERE)+'/dist/city-assets' if os.path.basename(HERE)=='source' else HERE+'/cockpit-output';os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,c,emission=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.7
 if emission:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emission
 return m
frame=material('Cockpit charcoal',(.025,.045,.047));trim=material('Worn instrument frame',(.085,.12,.115));screen=material('Instrument glass',(.07,.29,.23),.5);led=material('Instrument markings',(.39,.72,.49),.7)
parts=[]
def box(loc,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);parts.append(o);return o
def bar(a,b,r,m):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);o.data.materials.append(m);parts.append(o)
# Pilot eye at the origin. Blender +Y exports to camera-forward -Z.
box((0,.66,-.50),(1.55,.48,.24),frame);box((0,.73,-.36),(1.38,.30,.055),trim)
for x in [-.35,.35]:
 box((x,.60,-.375),(.39,.22,.055),frame);box((x,.60,-.341),(.31,.16,.015),screen)
 for k in range(3):box((x,.55+k*.045,-.33),(.22 if k!=1 else .12,.008,.007),led)
for x in [-.71,.71]:
 bar((x,.48,-.48),(x*.82,.93,.62),.026,frame);bar((x*.82,.93,.62),(x*.63,1.18,.77),.028,frame)
bar((-.45,1.18,.77),(.45,1.18,.77),.032,frame)
box((0,.49,-.41),(.13,.11,.12),trim)
for x in [-.60,-.51,.51,.60]:box((x,.57,-.34),(.025,.03,.015),led)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.name='Pilot_Cockpit';bpy.ops.export_scene.gltf(filepath=OUT+'/cockpit.glb',export_format='GLB',use_selection=True,export_animations=False);bpy.ops.wm.save_as_mainfile(filepath=OUT+'/cockpit.blend');print('COCKPIT_TRIANGLES',sum(len(p.vertices)-2 for p in o.data.polygons))
