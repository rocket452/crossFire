"""Original ARGUS Aster frame: Blender-authored rigid mechanical rig, no Walker geometry."""
import bpy, math, json, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'dist','city-assets');os.makedirs(OUT,exist_ok=True)
bpy.context.scene.unit_settings.system='METRIC'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(h):return tuple(lin(int(h[i:i+2],16)/255) for i in (1,3,5))+(1,)
PEARL=rgb('#c9d9e0');NAVY=rgb('#172b3e');DARK=rgb('#0b1725');METAL=rgb('#789baa');EDGE=rgb('#a9c3d1');TEAL=rgb('#12d4c6');WHITE=rgb('#e5f6ff')
base=bpy.data.materials.new('Aster ceramic and titanium');base.use_nodes=True
bs=base.node_tree.nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=.58;bs.inputs['Roughness'].default_value=.32
vc=base.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';base.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
ceramic=base.copy();ceramic.name='Aster pearl ceramic';ceramic.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.10;ceramic.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.34
glow=bpy.data.materials.new('Aster photonic inlays');glow.use_nodes=True
bs=glow.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=TEAL;bs.inputs['Emission Color'].default_value=TEAL;bs.inputs['Emission Strength'].default_value=1.4;bs.inputs['Metallic'].default_value=.25;bs.inputs['Roughness'].default_value=.28
current=[];parts=[];objects=[]
def V(p):return Vector((p[0],-p[2],p[1]))
def finish(o,c,light=False,bevel=0):
 bpy.context.view_layer.objects.active=o
 if bevel:
  m=o.modifiers.new('Machined edge radius','BEVEL');m.width=bevel;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name)
  m=o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL');m.keep_sharp=True;m.weight=40;bpy.ops.object.modifier_apply(modifier=m.name)
 attr=o.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
 for q in attr.data:q.color=c
 o.data.materials.append(glow if light else ceramic if c in (PEARL,WHITE) else base);current.append(o);return o

def box(p,s,c=PEARL,b=.07,light=False,rot=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=V(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);o.rotation_euler[1]=rot;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,c,light,b)
def cyl(p,r,length,c=METAL,axis=(0,1,0),n=12,light=False):
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=length,location=V(p));o=bpy.context.object;o.rotation_euler=V(axis).to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 for poly in o.data.polygons:poly.use_smooth=len(poly.vertices)==4
 return finish(o,c,light)
def rod(a,b,r,c=METAL,n=10):
 a,b=Vector(a),Vector(b);return cyl((a+b)*.5,r,(b-a).length,c,b-a,n)
def shell(sections,c=PEARL,b=.06):
 # Chamfered cross-sections loft into swept, tapering armor, rather than box stacks.
 verts=[]
 for y,x,z,w,d in sections:
  for u,v in [(-.72,-1),(.72,-1),(1,-.65),(1,.65),(.72,1),(-.72,1),(-1,.65),(-1,-.65)]:verts.append(V((x+u*w*.5,y,z+v*d*.5)))
 faces=[tuple(reversed(range(8)))];count=len(sections)
 for j in range(count-1):
  for i in range(8):faces.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
 faces.append(tuple(range((count-1)*8,count*8)));m=bpy.data.meshes.new('Swept armor');m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new('Armor loft',m);bpy.context.collection.objects.link(o);return finish(o,c,False,b)
def panel(points,depth=.12,c=PEARL):
 verts=[V((x,y,z)) for x,y,z in points]+[V((x,y,z-depth)) for x,y,z in points];n=len(points);faces=[tuple(range(n)),tuple(reversed(range(n,n*2)))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];m=bpy.data.meshes.new('Floating armor panel');m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new('Panel',m);bpy.context.collection.objects.link(o);return finish(o,c,False,.035)
def part(name,parent,pivot):
 bpy.ops.object.select_all(action='DESELECT')
 for o in current:o.select_set(True)
 bpy.context.view_layer.objects.active=current[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.data.transform(o.matrix_world);o.matrix_world.identity();current.clear();objects.append(o);parts.append({'name':name,'parent':parent,'pivot':list(pivot)})
# Compact rotating pelvis, exposed central bearing and swept hip guards.
shell([(9.1,0,0,3.0,2),(9.65,0,.05,4.1,2.5),(10.5,0,-.15,3.5,2.1)],NAVY)
for s in [-1,1]:panel([(s*.35,10.35,1.2),(s*2.05,10.1,.9),(s*1.75,9.25,1.1),(s*.55,9.35,1.3)],.18,PEARL)
cyl((0,10.5,0),1.12,.3,METAL);box((0,9.6,1.34),(1.3,.12,.06),TEAL,.015,True);part('pelvis',None,(0,10,0))
cyl((0,11.05,0),1.05,1.0,DARK);cyl((0,11.45,0),1.25,.18,METAL)
for s in [-1,1]:rod((s*.9,10.6,.6),(s*1.05,12.1,.8),.13,EDGE)
shell([(11.1,0,.15,2,1.6),(12.05,0,.1,3.5,2.2)],NAVY);part('waist','pelvis',(0,10.8,0))
# Monocoque chest: broad collar, narrow waist and an open recessed reactor surround.
shell([(12.15,0,-.2,3.45,2.2),(13.15,0,-.1,4.8,2.8),(15.7,0,-.3,6.1,3.1),(16.2,0,-.55,4.6,2.7)],NAVY,.10)
for s in [-1,1]:
 panel([(s*.25,15.85,1.35),(s*2.85,15.55,1.08),(s*2.4,14.3,1.55),(s*1.08,14.7,1.7)],.18,PEARL)
 panel([(s*1.25,13.75,1.75),(s*2.4,14.15,1.4),(s*2.05,12.9,1.25),(s*.75,12.45,1.25)],.16,PEARL)
 panel([(s*2.7,15.15,.1),(s*3.0,15.0,-1.0),(s*2.05,12.8,-1.2),(s*2.15,14.0,.1)],.12,METAL)
 for y in [13.25,13.6,13.95]:box((s*1.6,y,-1.62),(1.1,.12,.12),DARK,.025)
 box((s*2.15,15.0,1.63),(.65,.1,.07),TEAL,.02,True)
 rod((s*1.8,12.6,-1.1),(s*2.1,15.6,-1.55),.11,EDGE)
box((0,15.95,-1.1),(2,.24,1.15),METAL,.06)
for y in [12.7,13.4,14.1,14.8,15.5]:box((0,y,-1.8),(.5,.28,.18),TEAL,.02,True)
part('chest','waist',(0,12.3,0))
# Recessed circular iris mount; sliding shutter and energized aperture are animated in-engine.
cyl((0,14.05,1.68),1.23,.33,DARK,(0,0,1),24);cyl((0,14.05,1.88),1.12,.13,METAL,(0,0,1),24);cyl((0,14.05,1.99),.94,.10,DARK,(0,0,1),20)
for i in range(8):
 a=i*math.tau/8;box((math.sin(a)*1.05,14.05+math.cos(a)*1.05,2.04),(.10,.12,.05),TEAL,.015,True)
part('reactor','chest',(0,14.05,1.9))
# Low sensor crown / twin swept optic cheek blades. No humanoid helmet.
cyl((0,16.85,-.25),.58,.75,DARK)
shell([(17.05,0,.2,1.9,1.6),(17.8,0,.45,3.0,2.0),(18.35,0,.1,2.05,2.1)],PEARL,.08)
panel([(-1.5,17.75,1.2),(0,17.35,1.6),(1.5,17.75,1.2),(1.0,17.1,1.3),(-1.0,17.1,1.3)],.16,NAVY)
for s in [-1,1]:rod((s*.8,17.5,-.8),(s*1.05,18.75,-1.1),.07,METAL)
part('head','chest',(0,16.6,0))
box((0,17.75,1.48),(1.7,.12,.12),TEAL,.025,True)
for s in [-1,1]:cyl((s*.94,17.62,1.38),.13,.10,TEAL,(0,0,1),12,True)
part('visor','head',(0,17.75,1.48))
for side,s in [('l',-1),('r',1)]:
 x=s*1.75
 # Slender powertrain with floating ceramic quadriceps and open lateral actuator channels.
 cyl((x,9.65,0),.72,1.45,DARK,(1,0,0),16);cyl((x+s*.74,9.65,0),.46,.16,METAL,(1,0,0),16)
 shell([(6.55,x,-.05,1.05,1.5),(8.3,x,-.08,1.6,1.75),(9.25,x,0,1.55,1.65)],NAVY,.06)
 panel([(x-.57,9.1,.87),(x+.57,9.1,.87),(x+.7,7.55,.97),(x+.3,6.8,.78),(x-.45,7.0,.82)],.15,PEARL)
 box((x,8.6,1.06),(.55,.10,.06),TEAL,.015,True);rod((x+s*.67,9.2,-.4),(x+s*.58,6.7,-.35),.12,EDGE)
 part('thigh_'+side,'pelvis',(x,9.8,0))
 cyl((x,6.1,0),.67,1.55,DARK,(1,0,0),16);cyl((x+s*.82,6.1,0),.48,.12,METAL,(1,0,0),16)
 shell([(1.9,x,-.25,.95,1.2),(3.0,x,-.1,1.35,1.6),(5.7,x,0,1.15,1.45)],NAVY,.07)
 panel([(x-.52,5.5,.78),(x+.52,5.5,.78),(x+.72,3.5,.9),(x+.38,2.1,.62),(x-.35,2.0,.62),(x-.55,3.1,.85)],.14,PEARL)
 for y in [3.2,3.5,3.8]:box((x+s*.65,y,.15),(.09,.14,.65),METAL,.02)
 rod((x-s*.55,5.6,-.45),(x-s*.5,2.0,-.55),.10,EDGE)
 part('shin_'+side,'thigh_'+side,(x,6.1,0))
 # Forked, low-profile landing shoes and sculpted ankle shrouds.
 shell([(.08,x,.2,1.75,3.25),(.58,x,.18,2.05,3.5),(1.14,x,-.35,1.25,2.05)],NAVY,.06)
 for offset in [-.52,.52]:panel([(x+offset-.35,.63,1.65),(x+offset+.35,.63,1.65),(x+offset+.24,.92,.35),(x+offset-.25,.92,.15)],.14,PEARL)
 cyl((x,1.55,-.15),.40,1.22,METAL,(1,0,0),16);box((x,.45,1.85),(1.2,.08,.06),TEAL,.015,True)
 part('foot_'+side,'shin_'+side,(x,1.62,0))
 # Three clearly separated arm masses and an exposed circular shoulder bearing.
 x=s*3.6
 cyl((x,15.35,0),.78,1.1,DARK,(1,0,0),16);cyl((x+s*.6,15.35,0),.51,.16,EDGE,(1,0,0),16)
 shell([(12.45,x,-.05,.94,1.25),(14.2,x,-.05,1.3,1.6),(15.65,x,-.05,1.65,2.1)],NAVY,.07)
 panel([(x-s*.7,15.65,1.0),(x+s*.7,15.55,.85),(x+s*.85,14.75,.9),(x-s*.55,14.6,1.05)],.14,PEARL)
 rod((x+s*.5,14.8,-.55),(x+s*.48,12.6,-.5),.13,EDGE)
 part('upperarm_'+side,'chest',(x,15.5,0))
 cyl((x,12.1,0),.53,1.35,DARK,(1,0,0),16)
 if side=='r':
  shell([(8.15,x,0,.8,1.0),(9.1,x,0,1.4,1.65),(11.6,x,0,1.25,1.7)],NAVY,.065)
  for o in [-.55,.55]:panel([(x+o-.15,11.3,.88),(x+o+.15,11.3,.88),(x+o+.22,8.4,.35),(x+o-.2,8.4,.35)],.12,PEARL)
  cyl((x,8.25,0),.58,.16,METAL,(0,1,0),18);cyl((x,8.14,0),.42,.09,DARK,(0,1,0),18);cyl((x,8.08,0),.26,.07,TEAL,(0,1,0),16,True)
  for o in [-.44,.44]:box((x+o,9.7,.82),(.09,2.1,.08),TEAL,.018,True)
 else:
  shell([(8.6,x,0,1.1,1.4),(9.3,x,0,1.6,1.9),(11.5,x,0,1.25,1.65)],NAVY,.07)
  panel([(x-.6,11.3,.92),(x+.6,11.3,.92),(x+.75,9.4,1.0),(x+.25,8.7,.7),(x-.5,9.0,.8)],.12,PEARL)
  for o in [-.43,.43]:cyl((x+o,8.65,0),.21,.6,METAL,(0,1,0),10)
  cyl((x,8.36,0),.30,.08,TEAL,(0,1,0),12,True)
 part('forearm_'+side,'upperarm_'+side,(x,12.1,0))
# Integrated swept flak cells and seismic induction vanes instead of box launchers.
for name,s in [('rocket_pod',-1),('plasma_cannon',1)]:
 x=s*3.6
 shell([(16.9,x,-.25,1.9,2.1),(18.4,x,-.65,2.55,2.9),(20.8,x,-1.15,1.25,2.1)],NAVY,.08)
 panel([(x-s*.9,19.3,.6),(x+s*.75,20.55,.45),(x+s*1.15,18.0,1.2),(x-s*.9,17.5,1.35)],.18,PEARL)
 if name=='rocket_pod':
  for row in range(2):
   for col in range(3):
    px=x+(col-1)*.48;py=17.65+row*.48;cyl((px,py,1.35),.21,.18,DARK,(0,0,1),10);cyl((px,py,1.46),.11,.06,TEAL,(0,0,1),10,True)
 else:
  for k in range(4):
   y=17.5+k*.43;box((x,y,1.2),(1.15,.12,.26),METAL,.025);box((x,y,1.36),(.84,.06,.05),TEAL,.015,True)
 for k in range(3):box((x,18.1+k*.35,-1.95),(1.2,.10,.18),EDGE,.02)
 part(name,'chest',(x,17.4,0))
# Export flat component geometry and an explicit runtime articulation manifest.
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT+'/argus-aster.glb',export_format='GLB',use_selection=True,export_animations=False,export_materials='EXPORT',export_normals=True)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)
spec={'name':'ARGUS / ASTER FRAME','height':20.8,'triangles':triangles,'parts':parts,'authoring':'Original Blender 4.3 rigid mechanical rig; tapered ceramic shells; face-weighted bevel normals','palette':{'shell':'#c9d9e0','frame':'#172b3e','inlays':'#12d4c6'},'animation':{'kneeBend':-1,'headDamping':6,'headTurnSpeed':1.8,'footPitch':.16,'counterTwist':.11,'armSwing':.16,'breath':.018,'stunLean':.13,'recoil':.10}}
json.dump(spec,open(OUT+'/argus-aster.json','w'),indent=2)
# Source scene contains the same independent rigid pivot hierarchy, editable in Blender.
rigs={}
for entry,o in zip(parts,objects):
 r=bpy.data.objects.new('Rig_'+entry['name'],None);bpy.context.collection.objects.link(r);r.empty_display_type='SPHERE';r.empty_display_size=.15;r.location=V(entry['pivot']);rigs[entry['name']]=r
for entry,o in zip(parts,objects):
 r=rigs[entry['name']]
 if entry['parent']:
  r.parent=rigs[entry['parent']];parent=next(p for p in parts if p['name']==entry['parent']);r.location=V(entry['pivot'])-V(parent['pivot'])
 o.parent=r;o.location=-V(entry['pivot'])
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/argus-aster.blend')
print('ARGUS_ASTER_TRIANGLES',triangles,'PARTS',len(parts))
