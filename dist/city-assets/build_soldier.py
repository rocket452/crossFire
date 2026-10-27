import bpy,os,json,math
from math import sin,cos,pi,sqrt
from mathutils import Vector,Matrix,Euler,Quaternion
HERE=os.path.dirname(os.path.abspath(__file__));OUT=os.path.dirname(HERE)+'/dist/city-assets' if os.path.basename(HERE)=='source' else HERE+'/soldier-output';os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
mat=bpy.data.materials.new('Soldier | vertex-painted PBR');mat.use_nodes=True;nodes=mat.node_tree.nodes;p=nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.82;v=nodes.new('ShaderNodeVertexColor');v.layer_name='Color';mat.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color'])
C={'cloth':(.17,.29,.29,1),'vest':(.28,.33,.28,1),'strap':(.09,.12,.115,1),'pouch':(.37,.33,.24,1),'boot':(.075,.095,.09,1),'skin':(.56,.37,.23,1),'glass':(.08,.16,.18,1),'gun':(.085,.105,.11,1),'gunmetal':(.20,.24,.23,1),'patch':(.30,.53,.51,1)}
parts={};current='pelvis'
def finish(o,c):
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);o.data.materials.append(mat);a=o.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
 for d in a.data:d.color=C[c]
 parts.setdefault(current,[]).append(o);return o
def box(loc,size,c,bev=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bev:
  m=o.modifiers.new('One-edge chamfer','BEVEL');m.width=bev;m.segments=1;bpy.ops.object.modifier_apply(modifier=m.name)
 return finish(o,c)
def ico(loc,size,c):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc);o=bpy.context.object;o.scale=size;return finish(o,c)
def rod(a,b,r1,r2,c,n=8):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,c)
def rings(sections,c,n=8):
 verts=[]
 for x,y,z,rx,ry in sections:
  for i in range(n):a=2*pi*i/n;verts.append((x+rx*cos(a),y+ry*sin(a),z))
 faces=[]
 for k in range(len(sections)-1):
  for i in range(n):faces.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
 faces.extend([tuple(reversed(range(n))),tuple((len(sections)-1)*n+i for i in range(n))]);me=bpy.data.meshes.new('Faceted surface');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Faceted surface',me);bpy.context.collection.objects.link(o);return finish(o,c)
def ik(a,target,l1,l2,pole):
 d=target-a;length=max(.03,min(d.length,l1+l2-.001));d.normalize();target=a+d*length;x=(l1*l1-l2*l2+length*length)/(2*length);h=sqrt(max(0,l1*l1-x*x));bend=pole-a;side=bend-d*bend.dot(d)
 if side.length<.001:side=Vector((0,-1,0))
 side.normalize();return a+d*x+side*h,target
# Stable rest skeleton, front toward Blender -Y.
rest={};parents={}
def joint(name,a,b,parent=None):rest[name]=(Vector(a),Vector(b));parents[name]=parent
joint('root',(0,0,0),(0,0,.10));joint('pelvis',(0,0,.94),(0,0,1.02),'root');joint('chest',(0,0,1.02),(0,0,1.47),'pelvis');joint('head',(0,0,1.49),(0,0,1.77),'chest')
for side,sgn in [('l',1),('r',-1)]:
 hip=Vector((sgn*.115,0,.94));knee=Vector((sgn*.115,-.035,.53));ankle=Vector((sgn*.115,0,.12));joint('thigh_'+side,hip,knee,'pelvis');joint('shin_'+side,knee,ankle,'thigh_'+side);joint('foot_'+side,ankle,(sgn*.115,-.20,.10),'shin_'+side)
 shoulder=Vector((sgn*.255,0,1.43));wrist=Vector((.025,-.53,1.325) if side=='l' else(-.10,-.31,1.29));elbow,wrist=ik(shoulder,wrist,.32,.30,Vector((sgn*.65,.02,1.06)));joint('upperarm_'+side,shoulder,elbow,'chest');joint('forearm_'+side,elbow,wrist,'upperarm_'+side);joint('hand_'+side,wrist,wrist+Vector((0,-.07,0)),'forearm_'+side)
joint('weapon',(-.06,-.40,1.35),(-.06,-.95,1.35),'chest')
# Human silhouette: tapered torso, plated vest, separate webbing and equipment.
current='pelvis';box((0,.015,.935),(.32,.25,.18),'cloth',.025);box((0,0,1.015),(.36,.285,.05),'strap');box((-.19,-.01,.93),(.08,.12,.15),'pouch',.012)
current='chest';rings([(0,0,1.03,.16,.12),(0,0,1.35,.225,.145),(0,0,1.45,.19,.125)],'cloth');box((0,-.145,1.25),(.37,.085,.34),'vest',.035);box((0,.145,1.25),(.34,.065,.35),'vest',.025)
for x in [-.12,0,.12]:box((x,-.215,1.15),(.095,.065,.145),'pouch',.008)
for x in [-.16,.16]:box((x,-.171,1.38),(.055,.025,.19),'strap')
box((0,.225,1.26),(.34,.19,.36),'pouch',.025);box((0,.329,1.25),(.25,.03,.18),'vest');rod((-.17,.225,1.48),(.17,.225,1.48),.065,.065,'strap',8);rod((-.12,.23,1.44),(-.12,.23,1.75),.008,.006,'gun',5)
rod((0,0,1.43),(0,0,1.54),.068,.068,'skin',8)
# Face, goggles, shaped helmet shell, chin strap, ear protection.
current='head';rings([(0,-.006,1.51,.068,.072),(0,-.008,1.57,.115,.105),(0,-.002,1.70,.12,.105),(0,0,1.75,.078,.07)],'skin',10)
box((0,-.104,1.63),(.19,.028,.075),'strap',.012);box((0,-.121,1.635),(.155,.017,.047),'glass',.007);ico((0,-.12,1.584),(.026,.021,.031),'skin');box((0,-.071,1.54),(.12,.065,.045),'strap',.008)
rings([(0,.005,1.68,.14,.127),(0,.01,1.76,.14,.125),(0,.015,1.815,.105,.10),(0,.015,1.84,.045,.045)],'cloth',10)
box((0,-.125,1.735),(.045,.025,.055),'strap',.004)
for s in [-1,1]:box((s*.133,.005,1.64),(.035,.085,.095),'strap',.012);rod((s*.105,-.01,1.63),(s*.07,-.057,1.53),.008,.008,'strap',5)
# Separate jointed limbs, visible protective pads and treaded boots.
for side,sgn in [('l',1),('r',-1)]:
 current='thigh_'+side;a,b=rest[current];rod(a,b,.10,.083,'cloth',8);box((sgn*.20,.0,.74),(.07,.11,.16),'pouch',.01)
 current='shin_'+side;a,b=rest[current];rod(a,b,.081,.058,'cloth',8);ico(a,(.082,.08,.085),'cloth');box((sgn*.115,-.093,.52),(.13,.045,.145),'vest',.02)
 current='foot_'+side;box((sgn*.115,-.065,.09),(.155,.29,.14),'boot',.022);box((sgn*.115,-.065,.028),(.16,.30,.025),'strap');box((sgn*.115,-.155,.115),(.145,.10,.065),'boot',.012)
 current='upperarm_'+side;a,b=rest[current];rod(a,b,.095,.072,'cloth',8);ico(a,(.103,.10,.105),'cloth');box((sgn*.305,-.015,1.39),(.09,.12,.115),'vest',.015);box((sgn*.355,-.017,1.39),(.008,.08,.055),'patch')
 current='forearm_'+side;a,b=rest[current];rod(a,b,.074,.052,'cloth',8);ico(a,(.072,.071,.074),'vest')
 current='hand_'+side;pos=rest[current][0];box(pos,(.076,.095,.065),'strap',.012);rod(pos+Vector((sgn*.04,-.01,.01)),pos+Vector((sgn*.04,-.055,-.015)),.018,.018,'strap',5)
# Rifle: shoulder stock, receiver, scope, detachable magazine, handguard and muzzle.
current='weapon';x=-.06;box((x,-.34,1.36),(.07,.28,.095),'gun',.006);box((x,-.18,1.365),(.095,.19,.09),'gunmetal',.008);box((x,-.58,1.36),(.075,.28,.085),'gunmetal',.007);rod((x,-.72,1.37),(x,-.95,1.37),.018,.014,'gun',6);rod((x,-.95,1.37),(x,-.985,1.37),.024,.024,'gunmetal',6)
mag=box((x,-.405,1.25),(.065,.075,.145),'gunmetal',.006);mag.rotation_euler.x=-.17;box((x,-.295,1.285),(.055,.055,.11),'gun',.005)
rod((x,-.30,1.455),(x,-.44,1.455),.031,.031,'gun',8);rod((x,-.437,1.455),(x,-.45,1.455),.023,.023,'glass',8)
for y in [-.51,-.57,-.63]:box((x,y,1.412),(.082,.018,.012),'gun')
# Merge geometry into one draw section per deforming bone; all origins at world zero.
objects=[]
for name,group in parts.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');o.name=name;objects.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.export_scene.gltf(filepath=OUT+'/soldier-parts.glb',export_format='GLB',use_selection=True,export_animations=False,export_materials='EXPORT')
# Build actual Blender armature and skin; export an engine-portable animated GLB too.
bpy.ops.object.select_all(action='DESELECT');bpy.ops.object.armature_add(enter_editmode=True);rig=bpy.context.object;rig.name='Soldier_Rig';eb=rig.data.edit_bones;eb.remove(eb[0])
for name,(a,b) in rest.items():
 bone=eb.new(name);bone.head=a;bone.tail=b
 if parents[name]:bone.parent=eb[parents[name]]
bpy.ops.object.mode_set(mode='OBJECT')
restM={b.name:b.matrix_local.copy() for b in rig.data.bones};restInv={n:m.inverted() for n,m in restM.items()}
for o in objects:
 vg=o.vertex_groups.new(name=o.name);vg.add(list(range(len(o.data.vertices))),1,'REPLACE');o.parent=rig;m=o.modifiers.new('Rigid segment skin','ARMATURE');m.object=rig
for pbone in rig.pose.bones:pbone.rotation_mode='QUATERNION'
scene=bpy.context.scene;scene.render.fps=30
clips=[('Idle',60,True),('Walk',30,True),('Run',21,True),('Aim',60,True),('Fire',12,False),('CrouchFire',12,False),('CrouchAim',60,True),('Reload',66,False)]
convert=Matrix.Rotation(-pi/2,4,'X');baked={};boneNames=list(parts)
def boneMatrix(name,head,tail):
 a,b=rest[name];delta=(b-a).rotation_difference(tail-head);return Matrix.Translation(head)@delta.to_matrix().to_4x4()@restM[name].to_3x3().to_4x4()
def footPath(t,run=False):
 stance=.40 if run else .55;duration=.7 if run else 1.;speed=2.3 if run else 1.05;travel=speed*stance*duration;half=travel/2
 if t<stance:return -half+t/stance*travel,.12,0
 s=(t-stance)/(1-stance);return half-travel*s,.12+sin(pi*s)*(.20 if run else .12),-sin(pi*s)*.20
for name,last,loop in clips:
 action=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=action;frames=[]
 for frame in range(last+1):
  t=frame/last;phase=t*2*pi;moving=name in ['Walk','Run'];run=name=='Run';crouch=name in ['CrouchAim','CrouchFire'];reload=name=='Reload';firing=name in ['Fire','CrouchFire']
  pelvis=Vector((sin(phase)*(.010 if moving else .003),0,.94));pelvis.z=(.84 if run else .885 if moving else .57 if crouch else .94)+(abs(sin(phase))*(.035 if run else .016) if moving else sin(phase)*.004)
  lean=.12 if run else .045 if moving else .07 if crouch else .0;yaw=sin(phase)*(.035 if moving else .016);bodyQ=Euler((lean,0,yaw),'XYZ').to_quaternion();rootRest=Vector((0,0,.94))
  def bodyPoint(v):return pelvis+bodyQ@(Vector(v)-rootRest)
  pose={};pose['root']=restM['root'].copy();pose['pelvis']=Matrix.Translation(pelvis)@bodyQ.to_matrix().to_4x4()@restM['pelvis'].to_3x3().to_4x4();pose['chest']=Matrix.Translation(bodyPoint(rest['chest'][0]))@bodyQ.to_matrix().to_4x4()@restM['chest'].to_3x3().to_4x4()
  hq=bodyQ@Euler((.025*sin(phase),0,.05*sin(phase) if name=='Idle' else .018*sin(phase)),'XYZ').to_quaternion();pose['head']=Matrix.Translation(bodyPoint(rest['head'][0]))@hq.to_matrix().to_4x4()@restM['head'].to_3x3().to_4x4()
  for side,sgn in [('l',1),('r',-1)]:
   hip=pelvis+Vector((sgn*.115,0,0));toeAngle=0
   if moving:fy,fz,toeAngle=footPath((t+(.5 if side=='r' else 0))%1,run)
   else:fy,fz=(.09 if crouch and side=='r' else -.10 if crouch else 0),.12
   ankle=Vector((sgn*(.15 if crouch else .115),fy,fz));knee,ankle=ik(hip,ankle,(rest['thigh_'+side][1]-rest['thigh_'+side][0]).length,(rest['shin_'+side][1]-rest['shin_'+side][0]).length,hip+Vector((0,-1,0)))
   pose['thigh_'+side]=boneMatrix('thigh_'+side,hip,knee);pose['shin_'+side]=boneMatrix('shin_'+side,knee,ankle);fq=Euler((toeAngle,0,0),'XYZ').to_quaternion();pose['foot_'+side]=Matrix.Translation(ankle)@fq.to_matrix().to_4x4()@restM['foot_'+side].to_3x3().to_4x4()
  recoil=(sin(min(1,t/.18)*pi/2)*math.exp(-max(0,t-.18)*7)) if firing else 0
  lower=.42 if name=='Idle' else .19 if name=='Walk' else .38 if run else .13 if reload else 0
  reloadK=sin(pi*t)**2 if reload else 0;weaponQ=bodyQ@Euler((lower-recoil*.065,0,reloadK*.18),'XYZ').to_quaternion();weaponHead=bodyPoint(rest['weapon'][0])+bodyQ@Vector((0,recoil*.025,0));pose['weapon']=Matrix.Translation(weaponHead)@weaponQ.to_matrix().to_4x4()@restM['weapon'].to_3x3().to_4x4()
  for side,sgn in [('l',1),('r',-1)]:
   shoulder=bodyPoint(rest['upperarm_'+side][0]);anchor=rest['hand_'+side][0];wrist=weaponHead+weaponQ@(anchor-rest['weapon'][0])
   if reload and side=='l':wrist=wrist.lerp(weaponHead+weaponQ@Vector((.015,.025,-.19)),reloadK)
   elbow,wrist=ik(shoulder,wrist,.32,.30,shoulder+bodyQ@Vector((sgn*.45,.08,-.38)))
   pose['upperarm_'+side]=boneMatrix('upperarm_'+side,shoulder,elbow);pose['forearm_'+side]=boneMatrix('forearm_'+side,elbow,wrist);pose['hand_'+side]=Matrix.Translation(wrist)@weaponQ.to_matrix().to_4x4()@restM['hand_'+side].to_3x3().to_4x4()
  for bn in rest:
   parent=parents[bn];basis=restInv[bn]@(restM[parent]@pose[parent].inverted() if parent else Matrix.Identity(4))@pose[bn];pb=rig.pose.bones[bn];pb.matrix_basis=basis;pb.keyframe_insert('location',frame=frame);pb.keyframe_insert('rotation_quaternion',frame=frame)
  samples=[]
  for bn in boneNames:
   delta=convert@pose[bn]@restInv[bn]@convert.inverted();loc,quat,scale=delta.decompose();samples.extend(round(v,6) for v in [*loc,quat.x,quat.y,quat.z,quat.w])
  frames.append(samples)
 for fc in action.fcurves:
  for kp in fc.keyframe_points:kp.interpolation='LINEAR'
 rig.animation_data.action=None;tr=rig.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,action);tr.mute=True;baked[name]={'duration':last/30,'loop':loop,'frames':frames}
# glTF armature export: single mesh with one vertex-color material.
for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
scene.frame_set(0);bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();skin=bpy.context.object;skin.name='Soldier_Mesh';rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=OUT+'/soldier.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_materials='EXPORT')
tri=sum(len(p.vertices)-2 for p in skin.data.polygons);manifest={'version':2,'triangles':tri,'vertices':len(skin.data.vertices),'deformBones':len(rest),'parts':boneNames,'fps':30,'clips':baked,'muzzle':[-.06,1.37,.985],'materialCount':1,'notes':'Blender-authored rigid segment skin, baked animation palettes for GPU-instanced crowd. Not a facial rig or production Humanoid avatar.'}
with open(OUT+'/soldier-motion.json','w') as f:json.dump(manifest,f,separators=(',',':'))
# Save a usable Blender preview rig with all seven actions.
rig.animation_data.action=bpy.data.actions['Aim'];scene.frame_set(0)
world=scene.world or bpy.data.worlds.new('Soldier studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.12,.12,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6
for loc,energy,color in [((3,-4,5),500,(1,.89,.73)),((-3,-1,3),350,(.65,.84,1)),((1,3,4),500,(.8,1,.9))]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.size=3;o.data.color=color;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.7,-4.2,2.2));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-.12,.93))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.35;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False;scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.filepath=OUT+'/soldier-preview.png';scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/soldier.blend');print('SOLDIER',json.dumps({'triangles':tri,'bones':len(rest),'parts':len(boneNames),'clips':list(baked)}));bpy.ops.render.render(write_still=True)
