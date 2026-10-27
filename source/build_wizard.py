import bpy, math, os, json, random
from mathutils import Vector
from math import sin, cos, pi
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.dirname(HERE) if os.path.basename(HERE)=='source' else HERE
OUT=ROOT+'/dist/assets' if os.path.basename(HERE)=='source' else HERE+'/wizard-output'
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
def mat(name,col,metal=0,rough=.65,emit=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit: p.inputs['Emission Color'].default_value=(*col,1);p.inputs['Emission Strength'].default_value=emit
 return m
blue=mat('Robe | dusk blue',(.085,.18,.30));lightblue=mat('Robe | folded edges',(.15,.29,.41));darkblue=mat('Robe | deep lining',(.035,.075,.14));gold=mat('Antique brass',(.69,.46,.16),.65,.35);skin=mat('Warm skin',(.65,.39,.24),0,.8);ivory=mat('Ivory hair',(.79,.79,.66),0,.85);hairshadow=mat('Hair | shadow',(.55,.61,.57));leather=mat('Leather & wood',(.17,.085,.045));black=mat('Eyes & soles',(.018,.025,.026));mint=mat('Moonstone crystal',(.27,.86,.66),.2,.2,1.4)
parts=[]
def finish(o,name,m,bone,smooth=True):
 o.name=name;o.data.materials.append(m)
 if smooth:
  for p in o.data.polygons:p.use_smooth=True
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE');parts.append(o);return o
def ell(name,loc,scale,m,bone,seg=16,rings=10):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc);o=bpy.context.object;o.scale=scale;return finish(o,name,m,bone)
def cone(name,a,b,r1,r2,m,bone,n=16):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,name,m,bone)
def box(name,loc,scale,m,bone,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft handcrafted edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,m,bone)
def rings(name,sections,m,bone,n=24,fold=0):
 verts=[]
 for k,(x,y,z,rx,ry) in enumerate(sections):
  for i in range(n):
   a=2*pi*i/n;f=1+fold*cos(a*8);verts.append((x+rx*cos(a)*f,y+ry*sin(a)*f,z))
 faces=[]
 for k in range(len(sections)-1):
  for i in range(n):faces.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
 faces.extend([tuple(reversed(range(n))),tuple((len(sections)-1)*n+i for i in range(n))]);me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return finish(o,name,m,bone)
# Body: robe constructed as a fluted continuous surface.
robe=rings('Layered fluted robe',[(0,0,.22,.34,.26),(0,0,.30,.33,.255),(0,0,.55,.29,.23),(0,0,.85,.23,.19),(0,0,1.04,.205,.18),(0,0,1.20,.23,.19),(0,0,1.42,.28,.17),(0,0,1.50,.16,.14)],blue,'pelvis',48,.035)
# Gentle robe skin weighting toward the feet at the hem.
for v in robe.data.vertices:
 z=v.co.z
 if z<.85:
  side='l' if v.co.x>0 else 'r';weight=.18*(.85-z)/.63;vg=robe.vertex_groups.get('thigh_'+side) or robe.vertex_groups.new(name='thigh_'+side);vg.add([v.index],weight,'REPLACE');robe.vertex_groups['pelvis'].add([v.index],1-weight,'REPLACE')
rings('Gold hem',[(0,0,.23,.344,.264),(0,0,.26,.344,.264)],gold,'pelvis',48,.035)
rings('Hem facing',[(0,0,.27,.339,.259),(0,0,.31,.336,.258)],lightblue,'pelvis',48,.035)
rings('Leather belt',[(0,0,.96,.219,.194),(0,0,1.025,.219,.194)],leather,'pelvis',32)
box('Belt buckle',(0,-.202,.992),(.10,.025,.087),gold,'pelvis',.01);box('Buckle inset',(0,-.219,.992),(.061,.012,.05),leather,'pelvis',.005)
# Front stole strips with tiny brass stars.
for sign in [-1,1]:
 x=sign*.115
 cone('Stole piping',(x,-.182,1.41),(sign*.18,-.225,.40),.018,.018,gold,'pelvis',8)
 for j in range(4):ell('Robe embroidery',(sign*(.14+j*.009),-.237,.48+j*.12),(.014,.006,.014),gold,'pelvis',8,4)
# Torso mantle collar and layered shoulders.
rings('Shoulder mantle',[(0,0,1.25,.29,.20),(0,0,1.40,.34,.22),(0,0,1.50,.18,.16)],lightblue,'chest',32)
rings('Mantle gold edge',[(0,0,1.255,.294,.204),(0,0,1.275,.302,.210)],gold,'chest',32)
for sign,side in [(1,'l'),(-1,'r')]:
 upper=(sign*.25,0,1.40);elbow=(sign*.40,-.015,1.16);hand=(sign*.47,-.09,.99)
 cone('Upper sleeve '+side,elbow,upper,.12,.155,blue,'upperarm_'+side)
 ell('Elbow sleeve '+side,elbow,(.110,.110,.115),blue,'forearm_'+side)
 cone('Bell sleeve '+side,hand,elbow,.145,.12,blue,'forearm_'+side)
 cone('Sleeve brass cuff '+side,(sign*.47,-.09,.98),(sign*.462,-.086,1.01),.149,.145,gold,'forearm_'+side)
 ell('Hand '+side,(sign*.47,-.10,.955),(.068,.060,.09),skin,'hand_'+side)
 ell('Thumb '+side,(sign*.425,-.15,.97),(.03,.036,.048),skin,'hand_'+side,12,8)
 ell('Boot '+side,(sign*.15,-.08,.13),(.11,.19,.12),leather,'foot_'+side)
 box('Boot sole '+side,(sign*.15,-.09,.055),(.22,.36,.06),black,'foot_'+side,.025)
# Pouch, book, brass buttons.
box('Hip satchel',(.265,.01,.87),(.16,.14,.22),leather,'pelvis');box('Satchel flap',(.27,-.064,.90),(.17,.025,.10),leather,'pelvis');ell('Pouch stud',(.27,-.084,.90),(.016,.009,.016),gold,'pelvis',8,4)
book=box('Spellbook cover',(-.28,-.01,.76),(.14,.15,.23),darkblue,'pelvis',.012);box('Spellbook pages',(-.28,-.025,.76),(.115,.13,.19),ivory,'pelvis',.005)
# Face, ears, brows, nose and expressive beard clumps.
ell('Head',(0,-.012,1.62),(.16,.14,.19),skin,'head',24,16)
for sign in [-1,1]:
 ell('Ear',(sign*.16,-.015,1.62),(.04,.035,.06),skin,'head',12,8)
 ell('Eye white',(sign*.057,-.14,1.655),(.033,.017,.025),ivory,'head',16,10)
 ell('Eye pupil',(sign*.057,-.155,1.655),(.013,.006,.016),black,'head',12,8)
 ell('Eye glint',(sign*.053,-.161,1.662),(.004,.002,.005),ivory,'head',8,4)
 brow=ell('Heavy eyebrow',(sign*.06,-.15,1.697),(.064,.023,.023),ivory,'head');brow.rotation_euler[1]=sign*.12
ell('Long nose',(0,-.171,1.606),(.038,.056,.060),skin,'head',16,12)
ell('Beard base',(0,-.15,1.46),(.14,.075,.15),hairshadow,'head')
for i in range(7):
 x=(i-3)*.043;topz=1.55-.025*abs(i-3);bottomz=1.20+.04*abs(i-3)
 rings('Carved beard lock',[(x,-.16,topz,.042,.065),(x*.94,-.255,1.43,.044,.05),(x*.65,-.27,bottomz+.055,.025,.034),(x*.55,-.28,bottomz,.003,.004)],ivory,'head',10)
for sign in [-1,1]:
 o=ell('Moustache',(sign*.053,-.235,1.555),(.073,.033,.028),ivory,'head');o.rotation_euler[1]=sign*.25
# Hat brim and bent cone, with raised band.
rings('Wide hat brim',[(0,0,1.77,.34,.29),(0,0,1.795,.35,.30),(0,0,1.82,.29,.25)],blue,'head',48)
rings('Hat brim brass welt',[(0,0,1.775,.348,.298),(0,0,1.787,.352,.302)],gold,'head',48)
rings('Bent wizard hat',[(0,0,1.80,.22,.20),(0,.01,1.89,.20,.18),(.01,.025,2.03,.16,.145),(.035,.04,2.17,.115,.105),(.09,.04,2.30,.065,.060),(.18,.02,2.35,.034,.032),(.23,0,2.30,.005,.005)],blue,'head',32)
rings('Hat leather band',[(0,.005,1.825,.219,.198),(0,.012,1.885,.204,.184)],leather,'head',32)
box('Hat badge',(0,-.195,1.853),(.07,.025,.06),gold,'head',.01)
# Asymmetric staff held in right hand; branching cradle and glowing stone.
sx=-.49;sy=-.14
cone('Staff shaft',(sx,sy,.08),(sx,sy,1.93),.022,.035,leather,'hand_r',12)
for z in [.94,1.01,1.08,1.15]:cone('Grip binding',(sx,sy,z),(sx,sy,z+.016),.031,.031,gold,'hand_r',12)
for sign in [-1,1]:
 cone('Crystal cradle',(sx,sy,1.76),(sx+sign*.09,sy,1.97),.028,.018,gold,'hand_r',10)
 cone('Crystal cradle tip',(sx+sign*.09,sy,1.97),(sx+sign*.055,sy,2.08),.018,.010,gold,'hand_r',10)
rings('Moon crystal',[(sx,sy,1.91,.002,.002),(sx,sy,1.99,.065,.055),(sx,sy,2.09,.05,.045),(sx,sy,2.17,.002,.002)],mint,'hand_r',6)
# Armature with real skin bindings.
bpy.ops.object.select_all(action='DESELECT');bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0));rig=bpy.context.object;rig.name='WZ_Armature';eb=rig.data.edit_bones;eb.remove(eb[0])
def bone(name,head,tail,parent=None):
 b=eb.new(name);b.head=head;b.tail=tail
 if parent:b.parent=eb[parent]
 return b
bone('root',(0,0,0),(0,0,.15));bone('pelvis',(0,0,.90),(0,0,1.12),'root');bone('chest',(0,0,1.12),(0,0,1.48),'pelvis');bone('head',(0,0,1.48),(0,0,1.80),'chest')
for sign,side in [(1,'l'),(-1,'r')]:
 bone('upperarm_'+side,(sign*.25,0,1.40),(sign*.40,-.015,1.16),'chest');bone('forearm_'+side,(sign*.40,-.015,1.16),(sign*.47,-.09,.99),'upperarm_'+side);bone('hand_'+side,(sign*.47,-.09,.99),(sign*.47,-.10,.92),'forearm_'+side)
 bone('thigh_'+side,(sign*.15,0,.90),(sign*.15,0,.48),'pelvis');bone('shin_'+side,(sign*.15,0,.48),(sign*.15,0,.15),'thigh_'+side);bone('foot_'+side,(sign*.15,0,.15),(sign*.15,-.18,.10),'shin_'+side)
bpy.ops.object.mode_set(mode='OBJECT')
for p in parts:p.select_set(True)
rig.select_set(False);bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();mesh=bpy.context.object;mesh.name='WZ_Stylized_SkinnedMesh';mod=mesh.modifiers.new('Wizard skin','ARMATURE');mod.object=rig;mesh.parent=rig
# Remove duplicate material slots and collapse draw sections by material on export.
for p in rig.pose.bones:p.rotation_mode='XYZ'
clips=[('Idle',60),('Walk',30),('Run',24),('Jump',31),('Attack1',25),('Attack2',37),('HitReact',16),('Death',55),('EmoteWave',61),('EmoteCelebrate',73),('EmotePonder',91)]
scene=bpy.context.scene;scene.render.fps=30
for name,count in clips:
 action=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=action
 for f in range(count):
  t=f/(count if name in ['Idle','Walk','Run'] else count-1);phase=t*2*pi
  for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
  pelvis=rig.pose.bones['pelvis'];chest=rig.pose.bones['chest'];head=rig.pose.bones['head'];al=rig.pose.bones['upperarm_l'];ar=rig.pose.bones['upperarm_r'];fl=rig.pose.bones['forearm_l'];fr=rig.pose.bones['forearm_r']
  if name=='Idle':chest.rotation_euler.x=sin(phase)*.018;head.rotation_euler.z=sin(phase)*.025
  elif name in ['Walk','Run']:
   amp=.40 if name=='Walk' else .70;pelvis.location.z=abs(sin(phase))*(.02 if name=='Walk' else .045);chest.rotation_euler.x=.03 if name=='Walk' else .12
   for side,sg in [('l',1),('r',-1)]:
    rig.pose.bones['thigh_'+side].rotation_euler.x=sin(phase)*amp*sg;rig.pose.bones['shin_'+side].rotation_euler.x=max(0,-sin(phase)*sg)*amp*.9
   al.rotation_euler.x=-sin(phase)*amp*.5;ar.rotation_euler.x=sin(phase)*amp*.20
  elif name=='Jump':
   pelvis.location.z=sin(pi*t)*.32;chest.rotation_euler.x=-sin(pi*t)*.1
   for side in ['l','r']:rig.pose.bones['thigh_'+side].rotation_euler.x=-sin(pi*t)*.35;rig.pose.bones['shin_'+side].rotation_euler.x=sin(pi*t)*.65
   al.rotation_euler.y=sin(pi*t)*.4
  elif name=='Attack1':
   k=sin(pi*t)**2;ar.rotation_euler.x=-k*.90;fr.rotation_euler.x=-k*.35;chest.rotation_euler.z=k*.18;al.rotation_euler.y=-k*.5
  elif name=='Attack2':
   k=sin(pi*t)**2;ar.rotation_euler.y=k*.65;ar.rotation_euler.x=-k*.6;al.rotation_euler.y=-k*.8;al.rotation_euler.x=-k*.65;chest.rotation_euler.x=-k*.18
  elif name=='HitReact':
   k=sin(pi*t)*(1-t);chest.rotation_euler.x=-k*.6;head.rotation_euler.x=-k*.35;pelvis.location.y=k*.08
  elif name=='Death':
   k=min(1,t*1.5);rig.pose.bones['root'].rotation_euler.x=-k*1.35;rig.pose.bones['root'].location.z=-k*.06;chest.rotation_euler.x=k*.25
  elif name=='EmoteWave':
   k=min(1,t*5,(1-t)*5);al.rotation_euler.y=-k*1.9;fl.rotation_euler.x=sin(t*pi*8)*.25*k;head.rotation_euler.z=sin(pi*t)*.15
  elif name=='EmoteCelebrate':
   k=sin(pi*t);al.rotation_euler.y=-k*2.0;ar.rotation_euler.y=k*.70;ar.rotation_euler.x=-k*.5;pelvis.location.z=max(0,sin(t*pi*6))*.06*k
  elif name=='EmotePonder':
   k=min(1,t*5,(1-t)*5);al.rotation_euler.x=-k*.6;fl.rotation_euler.x=-k*1.1;head.rotation_euler.z=-k*.20;head.rotation_euler.x=k*.1
  for p in rig.pose.bones:p.keyframe_insert('rotation_euler',frame=f);p.keyframe_insert('location',frame=f)
 for fc in action.fcurves:
  for kp in fc.keyframe_points:kp.interpolation='LINEAR'
 rig.animation_data.action=None;tr=rig.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,action);tr.mute=True
# Rest pose and export only character.
for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
scene.frame_set(0);bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=OUT+'/wizard.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_materials='EXPORT')
# Neutral beauty-render studio, retained in the .blend source.
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1.1,depth=.12,location=(0,0,-.07));ped=bpy.context.object;ped.name='Preview plinth';ped.data.materials.append(mat('Plinth',(.05,.11,.10)))
world=scene.world or bpy.data.worlds.new('World');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.09,.095,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,power,size,col in [((3,-4,6),700,4,(1,.88,.72)),((-3,-1,3),450,3,(.58,.78,1)),((0,3,4),900,3,(.5,1,.78))]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(Vector((0,0,1.2))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(3.1,-5.6,2.9));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1.16))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.05;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=OUT+'/wizard-preview.png';scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/wizard.blend')
tri=sum(len(p.vertices)-2 for p in mesh.data.polygons);stats={'name':'Moonkeeper','triangles':tri,'vertices':len(mesh.data.vertices),'bones':len(rig.data.bones),'materials':len(set(mesh.data.materials)),'clips':[{'name':n,'frames':c,'fps':30} for n,c in clips],'pipeline':'Stylized PBR prototype','limitations':['Procedural mesh construction, not sculpted production topology','No facial blendshapes, IK control rig, texture atlas, or LODs yet','Animations are authored prototype cycles, not motion capture']}
with open(OUT+'/wizard-manifest.json','w') as f:json.dump(stats,f,indent=2)
print('WIZARD_STATS',json.dumps(stats));bpy.ops.render.render(write_still=True)
