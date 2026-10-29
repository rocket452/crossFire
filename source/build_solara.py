"""Original low-poly elemental armor/hair for the supplied runtime humanoid.
No licensed source geometry is imported or redistributed by this authoring file.
Blender axes: X across, front -Y, Z up. Runtime +Z forward / Y up.
"""
import bpy, math, json, os
from mathutils import Vector
OUT=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'dist','city-assets')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,glow=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=.38
 b.inputs['Emission Color'].default_value=(*color,1);b.inputs['Emission Strength'].default_value=glow;return m
molten=mat('Molten obsidian',(.25,.035,.008),.65);fire=mat('Living orange flame',(1,.16,.008),.2,1.4);core=mat('White hot gold',(1,.62,.035),.25,1.7)
ice=mat('Luminous blue frost',(.035,.43,.8),.18,.35);white=mat('Frost edges',(.45,.9,1),.15,.7);red=mat('Right red ember eye',(1,.005,.001),0,5);blue=mat('Left glacial blue eye',(.02,.65,1),0,5)
parts=[];objects=[];current=[]
def mesh(name,verts,faces,material):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(material);current.append(o);return o
def box(p,s,m,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Armor facets','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.materials.append(m);current.append(o);return o
def shard(points,radii,m,sides=5):
 verts=[]
 for p,r in zip(points,radii):
  for i in range(sides):
   a=i*math.tau/sides;verts.append((p[0]+math.cos(a)*r,p[1]+math.sin(a)*r,p[2]))
 faces=[tuple(range(sides-1,-1,-1))]
 for j in range(len(points)-1):
  for i in range(sides):faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
 faces.append(tuple((len(points)-1)*sides+i for i in range(sides)))
 return mesh('Elemental shard',verts,faces,m)
def part(name,bone,pivot):
 bpy.ops.object.select_all(action='DESELECT')
 for o in current:o.select_set(True)
 bpy.context.view_layer.objects.active=current[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.data.transform(o.matrix_world);o.matrix_world.identity();objects.append(o)
 if name in ['fire_hair','ice_hair']:
  for v in o.data.vertices:v.co.x=min(0,v.co.x) if name=='fire_hair' else max(0,v.co.x)
 parts.append({'name':name,'bone':bone,'pivot':[pivot[0],pivot[2],-pivot[1]]});current.clear()
# Source rig names use negative X for anatomical right (fire), positive X for left (ice).
for side,sign,material,edge in [('fire',-1,molten,core),('ice',1,ice,white)]:
 # Shaped half cuirass: a narrow waist, broad armored upper chest and a hard center seam.
 x0=0;x1=sign*.37
 verts=[(x0,-.225,1.5),(sign*.25,-.225,1.5),(x1,-.26,1.88),(sign*.29,-.225,2.02),(x0,-.225,2.02),
        (x0,-.14,1.5),(sign*.25,-.14,1.5),(x1,-.16,1.88),(sign*.29,-.14,2.02),(x0,-.14,2.02)]
 mesh(side+' cuirass',verts,[(0,1,2,3,4),(5,9,8,7,6),(0,5,6,1),(1,6,7,2),(2,7,8,3),(3,8,9,4),(4,9,5,0)],material)
 for i in range(3):
  o=box((sign*(.12+i*.055),-.27,1.63+i*.115),(.13,.018,.025),edge,.005);o.rotation_euler.y=sign*.4
 part('armor_'+side,'B_Spine2',(0,0,1.859))
 box((sign*.20,0,1.32),(.35,.42,.20),material);box((sign*.20,-.225,1.32),(.28,.035,.055),edge,.01);part('hip_'+side,'B_Pelvis',(0,0,1.34))
 box((sign*.36,0,1.98),(.32,.46,.19),material,.04)
 for i in range(2):shard([(sign*(.35+i*.09),0,2.02),(sign*(.43+i*.1),.02,2.22+i*.08)],[.07,0],edge)
 part('shoulder_'+side,'B_'+('R' if sign<0 else 'L')+'_UpperArm',(sign*.3234,-.01762,1.97858))
 # T-pose forearm cuff follows its bone rather than a detached pose proxy.
 box((sign*.84,0,1.98),(.29,.29,.28),material,.025);box((sign*.85,-.153,1.98),(.16,.025,.17),edge,.015)
 part('cuff_'+side,'B_'+('R' if sign<0 else 'L')+'_Forearm',(sign*.67714,-.01762,1.97858))
# Hair emerges from a sharp midline. Fire is curved, ice is angular and points down.
box((-.12,.015,2.575),(.24,.42,.11),fire,.025)
for i,(x,y,top) in enumerate([(-.06,-.10,3.05),(-.19,-.08,3.14),(-.29,.03,2.98),(-.10,.16,3.01),(-.24,.19,2.93)]):
 shard([(x,y,2.57),(x-.045,y+.015,2.77),(x+.045,y-.02,top)],[.105,.065,0],fire if i%2 else core)
part('fire_hair','B_Head',(0,0,2.30164))
box((.12,.015,2.575),(.24,.42,.11),ice,.025)
for i,(x,y,top) in enumerate([(.065,-.10,2.94),(.18,-.08,2.99),(.29,.03,2.87),(.10,.16,2.91),(.24,.19,2.86)]):
 shard([(x,y,2.56),(x+.015,y,top)],[.095,0],white if i%2 else ice)
for i in range(4):
 x=.22+i*.045;y=-.04+i*.075
 shard([(x,y,2.62),(x+.03,y+.02,2.34),(x+.02,y+.04,1.99+i*.07)],[.075,.065,0],ice if i%2 else white)
part('ice_hair','B_Head',(0,0,2.30164))
box((-.105,-.239,2.42),(.12,.025,.043),red,.006);part('fire_eye','B_Head',(0,0,2.30164))
box((.105,-.239,2.42),(.12,.025,.043),blue,.006);part('ice_eye','B_Head',(0,0,2.30164))
# Split central crest joins exactly at X=0 without covering the elemental boundary.
for x,m in [(-.045,fire),(.045,white)]:box((x,-.278,1.88),(.09,.04,.20),m,.012)
part('crest','B_Spine2',(0,0,1.859))
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/solara-frost.glb',export_format='GLB',use_selection=True,export_animations=False)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
json.dump({'name':'Solara Frost','height':2.59,'triangles':triangles,'parts':parts,'anatomicalRight':'negative X / fire','anatomicalLeft':'positive X / ice','authoring':'Blender 4.3 original elemental armor/hair; attaches to licensed runtime rig'},open(OUT+'/solara-frost.json','w'),indent=2)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/solara-frost.blend');print('SOLARA',triangles,'triangles',len(parts),'parts')
