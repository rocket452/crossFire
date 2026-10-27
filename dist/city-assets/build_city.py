import bpy,math,os,json,random
from mathutils import Vector
from math import pi,sin,cos
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(HERE) if os.path.basename(HERE)=='source' else HERE;OUT=ROOT+'/dist/city-assets' if os.path.basename(HERE)=='source' else HERE+'/city-output';os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# One vertex-color PBR material; geometry and colors survive glTF export.
material=bpy.data.materials.new('Low-poly painted surfaces');material.use_nodes=True;n=material.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.78;v=n.new('ShaderNodeVertexColor');v.layer_name='Color';material.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color'])
COL={'concrete':(.43,.46,.43,1),'edge':(.63,.64,.58,1),'glass':(.085,.19,.23,1),'roof':(.19,.24,.25,1),'armor':(.17,.29,.29,1),'dark':(.055,.075,.08,1),'metal':(.27,.33,.33,1),'visor':(.13,.23,.27,1),'skin':(.55,.39,.25,1),'orange':(.70,.35,.20,1)}
parts=[];protos=[]
def finish(o,c):
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);att=o.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
 for d in att.data:d.color=COL.get(c,c)
 parts.append(o);return o
def box(loc,scale,c,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Chamfer','BEVEL');m.width=bevel;m.segments=1;bpy.ops.object.modifier_apply(modifier=m.name)
 return finish(o,c)
def cone(a,b,r1,r2,c,n=8):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,c)
def ico(loc,scale,c,sub=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc);o=bpy.context.object;o.scale=scale;return finish(o,c)
def end(name):
 global parts
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');protos.append(o);parts=[];return o
# Building modules authored in meters. Front is Blender -Y -> glTF +Z.
box((0,0,0),(2.5,.32,3.0),'concrete');box((0,-.177,.18),(1.96,.035,1.92),'glass');box((0,-.204,.18),(.075,.05,1.95),'edge');box((0,-.204,.18),(1.98,.05,.075),'edge');box((0,-.18,-1.25),(2.5,.07,.20),'edge');end('wall_module')
box((0,0,0),(2.5,2.5,.28),'edge');box((0,0,.15),(2.48,2.48,.045),'concrete');end('slab_module')
box((0,0,0),(.48,.48,3.0),'edge',.025);end('column_module')
box((0,0,0),(1,1,1),'concrete',.07);end('rubble_module')
# Tank hull and turret (facing -Y).
box((0,0,.82),(2.6,4.3,.8),'armor',.17);box((0,-1.42,1.15),(2.5,1.05,.35),'armor',.12);box((0,.75,1.30),(2.35,1.9,.35),'metal',.08)
for x in [-1.39,1.39]:
 box((x,0,.48),(.67,4.25,.78),'dark',.13)
 for y in [-1.55,-.8,0,.8,1.55]:cone((x-.36,y,.48),(x+.36,y,.48),.29,.29,'metal',10)
 box((x,0,.98),(.75,4.20,.17),'armor',.03)
for x in [-.8,.8]:box((x,-2.16,.9),(.24,.06,.14),'edge')
box((0,1.3,1.5),(1.0,.5,.18),'dark');end('tank_hull')
box((0,0,.05),(1.85,2.0,.65),'armor',.18);box((0,-.82,.08),(1.35,.5,.55),'armor',.09);cone((0,-.9,.13),(0,-3.4,.13),.105,.075,'metal',10);box((0,-3.40,.13),(.25,.30,.20),'dark',.025)
cone((.52,.45,.31),(.52,.45,.45),.29,.29,'metal',12);cone((-.65,.65,.3),(-.65,.65,1.35),.015,.008,'dark',6);box((0,-.3,.40),(.40,.22,.16),'visor');end('tank_turret')
# Compact attack/utility helicopter with skids, side pods, and angular canopy.
ico((0,0,0),(.95,2.2,.85),'armor',2);ico((0,-1.0,.22),(.77,1.23,.66),'visor',1);cone((0,1.0,.1),(0,5.1,.75),.43,.11,'armor',8)
box((0,4.7,.90),(.13,1.2,1.5),'armor');box((0,4.7,.75),(2.2,.6,.13),'armor');box((0,.1,.9),(1.1,1.3,.35),'metal',.07)
for x in [-1.02,1.02]:
 cone((x,-1.3,-.85),(x,1.15,-.85),.045,.045,'metal');cone((x,-.7,-.85),(x*.7,-.7,-.4),.035,.035,'metal');cone((x,.75,-.85),(x*.7,.75,-.4),.035,.035,'metal');box((x*1.16,.0,-.2),(.80,1.50,.35),'dark',.06)
cone((0,-1.70,-.42),(0,-2.5,-.42),.10,.07,'dark');end('helicopter_body')
cone((0,0,-.1),(0,0,.25),.13,.13,'metal');box((0,0,.17),(.23,10.5,.035),'dark');box((0,0,.17),(10.5,.23,.035),'dark');end('main_rotor')
box((0,0,0),(.10,1.7,.06),'dark');box((0,0,0),(1.7,.10,.06),'dark');end('tail_rotor')
# Infantry separate articulated components, all suitable for instancing.
box((0,0,1.13),(.49,.30,.57),'armor',.05);box((0,-.18,1.18),(.40,.12,.40),'metal',.02);box((0,.22,1.15),(.38,.22,.46),'dark',.025);ico((0,0,1.64),(.19,.17,.22),'skin');ico((0,.005,1.74),(.23,.21,.16),'armor');box((0,-.18,1.66),(.26,.02,.09),'visor');end('infantry_torso')
for side,x in [('l',.14),('r',-.14)]:
 box((x,0,-.21),(.20,.22,.44),'armor',.025);box((x,-.01,-.57),(.18,.20,.33),'armor',.025);box((x,-.08,-.77),(.22,.36,.14),'dark',.025);end('infantry_leg_'+side)
# Arms and rifle move as one aiming assembly, pivot at chest height.
for x in [-.30,.30]:
 cone((x,0,.02),(x,-.22,-.20),.10,.075,'armor');cone((x,-.22,-.20),(x*.3,-.45,-.08),.075,.06,'armor');ico((x*.3,-.45,-.08),(.065,.065,.065),'skin')
box((0,-.48,-.02),(.11,.58,.16),'dark');cone((0,-.65,.01),(0,-1.15,.01),.026,.02,'dark',6);box((0,-.44,-.17),(.09,.10,.20),'dark');end('infantry_arms')
# Urban props.
box((0,0,.65),(1.8,4.0,.75),'dark',.15);box((0,.25,1.15),(1.6,2.1,.55),'glass',.12)
for x in [-.87,.87]:
 for y in [-1.1,1.1]:cone((x-.09,y,.4),(x+.09,y,.4),.34,.34,'dark',10)
end('parked_car')
# Asset library export, retaining distinct reusable mesh names.
bpy.ops.object.select_all(action='DESELECT')
for o in protos:o.select_set(True)
bpy.context.view_layer.objects.active=protos[0]
bpy.ops.export_scene.gltf(filepath=OUT+'/city-kit.glb',export_format='GLB',use_selection=True,export_animations=False,export_materials='EXPORT',export_extras=True)
random.seed(21);buildings=[]
for zi,z in enumerate([-36,-12,12,36]):
 for xi,x in enumerate([-36,-12,12,36]):
  buildings.append({'id':f'B{zi*4+xi+1:02}','x':x,'z':z,'floors':random.choice([4,5,6,7,8]),'tint':random.choice(['#a4acaa','#bdbaa9','#8f9e9f','#a5a99b']),'name':random.choice(['Offices','Apartments','Commerce','Residences'])})
manifest={'buildings':buildings,'moduleWidth':2.5,'floorHeight':3.0,'footprint':10.0,'prototypes':[{'name':o.name,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)} for o in protos],'notes':'Blender-authored low-poly kit. Runtime rigid-body fracture uses separable modules, not engineering structural analysis.'}
with open(OUT+'/city-layout.json','w') as f:json.dump(manifest,f,indent=2)
# Retain a real city layout and vehicle lineup in Blender; the runtime uses the kit above.
for o in protos:o.hide_render=True;o.hide_viewport=True
for b in buildings:
 for floor in range(b['floors']):
  for side in range(4):
   for j in range(4):
    src=bpy.data.objects['wall_module'];o=src.copy();o.data=src.data;o.hide_render=False;o.hide_viewport=False;bpy.context.collection.objects.link(o);u=(j-1.5)*2.5;a=side*pi/2;o.location=(b['x']+u*cos(a)-5*sin(a),b['z']+u*sin(a)+5*cos(a),floor*3+1.5);o.rotation_euler.z=a
  for i in range(3):
   for j in range(3):
    src=bpy.data.objects['slab_module'];o=src.copy();o.data=src.data;o.hide_render=False;o.hide_viewport=False;bpy.context.collection.objects.link(o);o.location=(b['x']+(i-1)*10/3,b['z']+(j-1)*10/3,(floor+1)*3);o.scale=(4/3,4/3,.28/.325)
  for x in [-4.78,4.78]:
   for y in [-4.78,4.78]:
    src=bpy.data.objects['column_module'];o=src.copy();o.data=src.data;o.hide_render=False;o.hide_viewport=False;bpy.context.collection.objects.link(o);o.location=(b['x']+x,b['z']+y,floor*3+1.5);o.scale.z=2.72/3
# Ground preview.
bpy.ops.mesh.primitive_plane_add(size=115,location=(0,0,-.10));ground=bpy.context.object;ground.data.materials.append(material)
for i,o in enumerate(protos):o.location=(i*5-28,-56,2);o.hide_viewport=False;o.hide_render=False
bpy.ops.object.camera_add(location=(90,-110,90));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=145;bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='SUN',location=(0,-30,80));bpy.context.object.rotation_euler=(.4,-.5,-.5);bpy.context.object.data.energy=3
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/city.blend');print('CITY_KIT',json.dumps(manifest['prototypes']))
