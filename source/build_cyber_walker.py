"""Build the Asset City Siege Walker. Run blender -b -P source/build_cyber_walker.py."""
import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / "dist/city-assets"
spec = json.loads((OUT / "siege-walker.json").read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
# Game coordinates: X to the right, Y up, +Z towards the target.
def linear(v):
    v = int(v, 16) / 255
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

def rgb(value):
    return tuple(linear(value[i:i+2]) for i in (0, 2, 4)) + (1,)

ink, frame, steel, ceramic, pearl = '1a2036','303951','566582','7087a2','c9d9e2'
violet, cyan, pink, gold = '583755','33efed','ff318d','ffc471'
hull_material = bpy.data.materials.new('Ceramic and anodised alloy')
hull_material.use_nodes = True
bsdf = hull_material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value=.49
bsdf.inputs['Metallic'].default_value=.32
color_node=hull_material.node_tree.nodes.new('ShaderNodeVertexColor')
color_node.layer_name='Color'
hull_material.node_tree.links.new(color_node.outputs['Color'],bsdf.inputs['Base Color'])

class Batch:
    def __init__(self):
        self.vertices=[]; self.faces=[]; self.colors=[]

    def rings(self,rings,color):
        n=len(rings[0]); start=len(self.vertices)
        for ring in rings:
            for x,y,z in ring: self.vertices.append((x,-z,y))
        faces=[tuple(start+i for i in reversed(range(n)))]
        for j in range(len(rings)-1):
            a=start+j*n
            for i in range(n):
                k=(i+1)%n
                faces.append((a+i,a+k,a+n+k,a+n+i))
        faces.append(tuple(start+(len(rings)-1)*n+i for i in range(n)))
        self.faces.extend(faces); self.colors.extend([rgb(color)]*len(faces))

    def finish(self,name):
        if not self.vertices: return
        mesh=bpy.data.meshes.new(name)
        mesh.from_pydata(self.vertices,[],self.faces);mesh.update()
        layer=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        for polygon,color in zip(mesh.polygons,self.colors):
            for loop in polygon.loop_indices: layer.data[loop].color=color
        bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
        mesh.materials.append(hull_material)
        obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
        self.__init__()

body,lights=Batch(),Batch()
def part(name):
    body.finish(name);lights.finish(name+'_signal')

def shell(x,z,layers,color,cut=.18):
    # Chined armor shells with independently tapered and raked cross-sections.
    rings=[]
    for y,w,d,forward in layers:
        a=w/2; b=d/2;c=min(a,b)*cut
        rings.append([(x+u,y,z+forward+v) for u,v in
                      [(-a+c,-b),(a-c,-b),(a,-b+c),(a,b-c),(a-c,b),(-a+c,b),(-a,b-c),(-a,-b+c)]])
    body.rings(rings,color)

def plate(points,z,depth,color,lit=False):
    (lights if lit else body).rings([[(x,y,z+t) for x,y in points] for t in (0,depth)],color)

def pipe(a,b,r,color,r2=None,n=8,lit=False):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized()
    u=axis.orthogonal().normalized();v=axis.cross(u)
    ring=[u*math.cos(t*math.tau/n)+v*math.sin(t*math.tau/n) for t in range(n)]
    (lights if lit else body).rings([[p+dir*radius for dir in ring] for p,radius in ((a,r),(b,r if r2 is None else r2))],color)

def stripe(points,z,color,width=.105):
    for (x,y),(u,v) in zip(points,points[1:]):
        dx=u-x;dy=v-y;length=math.hypot(dx,dy)
        nx=-dy*width/(2*length);ny=dx*width/(2*length)
        plate([(x+nx,y+ny),(u+nx,v+ny),(u-nx,v-ny),(x-nx,y-ny)],z,.025,color,True)

def mirrored(points,side):
    return [(side*x,y) for x,y in points]

def stack(x,z,y,w,h,d,color):
    shell(x,z,[(y-h/2,w*.81,d*.86,0),(y-h*.31,w,d,0),(y+h*.38,w,d,0),(y+h/2,w*.78,d*.88,0)],color,.38)

# Belt and floating bridge between the two hip bearings.
stack(0,0,10,3.9,1.85,2.5,frame)
for s in [-1,1]:
    plate(mirrored([(.15,10.7),(1.84,10.85),(1.52,9.45),(.65,9.12)],s),1.06,.33,ceramic)
part('pelvis')
for y,r in [(10.95,1.27),(11.42,1.12),(11.93,1.36)]:
    pipe((0,y-.16,0),(0,y+.18,0),r,steel,n=10)
stack(0,1.06,11.55,1.3,1.1,.55,ink)
part('waist')

# Split breastplate, luminous chevrons and a rear bank of radiator blades.
shell(0,0,[(12.1,3.6,2.45,-.10),(13,5.05,3,0),(15.42,5.82,3.6,0),(16.27,4.05,2.94,-.23)],frame,.5)
for s in [-1,1]:
    shape=mirrored([(.15,15.79),(1.42,16.38),(2.94,15.76),(2.57,14.75),(1.10,14.4),(.14,15.0)],s)
    plate(shape,1.38,.54,pearl)
    plate(mirrored([(.28,15.11),(1.25,15.67),(2.78,15.64),(2.58,15.28),(1.38,15.14),(.73,14.82)],s),1.93,.06,ink)
    stripe(mirrored([(.71,14.99),(1.38,15.35),(2.52,15.44)],s),2.005,cyan,.11)
    for j in range(3):
        y=12.72+j*.50
        plate(mirrored([(.57,y+.28),(2.32,y+.57),(2.18,y+.14),(.8,y-.12)],s),1.36+.065*j,.22,steel)
    shell(s*1.68,-1.36,[(12.68,1.0,1.2,0),(15.4,1.26,1.5,-.26),(16.55,.86,1.17,-.49)],ink)
    for j in range(4):
        shell(s*1.68,-2.04,[(13.15+j*.65,1.30,.50,0),(13.43+j*.65,1.18,.42,-.16)],steel)
        pipe((s*1.68-.42,13.39+j*.65,-2.39),(s*1.68+.42,13.39+j*.65,-2.39),.052,cyan,n=5,lit=True)
pipe((0,14.04,1.32),(0,14.04,2.18),.87,ink,.72,10)
part('chest')
plate([(-.49,14.14),(0,14.54),(.49,14.14),(0,13.68)],2.19,.10,pearl)
part('reactor')

# Helmet with a dark recessed split visor and rear-swept blade antennae.
pipe((0,16.47,0),(0,17.65,0),.69,steel)
shell(0,0,[(17.3,1.44,1.63,.12),(17.95,2.22,2.12,.05),(18.84,2.56,2.43,.07),(19.61,1.77,2.09,-.24)],ink,.62)
for s in [-1,1]:
    plate(mirrored([(.12,19.22),(.97,19.60),(1.36,19.19),(1.37,18.95),(.08,18.69)],s),1.09,.22,ceramic)
    plate(mirrored([(.16,18.36),(1.08,18.67),(1.22,18.36),(.71,17.57),(.18,17.81)],s),.96,.29,steel)
    pipe((s*1.06,18.65,-.63),(s*1.49,20.54,-1.27),.24,ceramic,.055,4)
    pipe((s*1.48,20.43,-1.24),(s*1.53,20.75,-1.34),.065,pink,n=5,lit=True)
part('head')
for s in [-1,1]:
    plate(mirrored([(.05,18.70),(1.10,18.94),(1.02,18.66),(.14,18.44)],s),1.29,.07,pearl)
part('visor')

for label,s in [('l',-1),('r',1)]:
    x=s*1.75
    pipe((x-.72,9.65,0),(x+.72,9.65,0),.68,frame)
    shell(x,0,[(6.34,1.24,1.43,.08),(7.50,1.79,1.95,0),(9.15,1.98,2.06,-.18),(9.49,1.39,1.57,-.19)],steel)
    plate([(x-.76,8.85),(x+.57,9.13),(x+.88,8.65),(x+.4,7.22),(x-.37,6.83),(x-.64,7.45)],.91,.22,ceramic)
    pipe((x+s*.73,9.02,-.56),(x+s*.69,6.6,-.25),.19,ink)
    part('thigh_'+label)
    pipe((x-.88,6.11,.17),(x+.88,6.11,.17),.70,steel,n=10)
    shell(x,0,[(1.71,1.12,1.43,0),(3.55,1.51,1.63,-.2),(5.58,1.64,1.75,-.19),(5.96,1.33,1.22,.08)],frame)
    guard=[(x-.82,5.66),(x-.25,6.56),(x+.77,6.23),(x+.74,5.11),(x+.29,2.24),(x-.34,2.57)]
    plate(guard,.72,.45,ceramic)
    stripe([(x-.23,6.15),(x+.24,5.72),(x+.03,3.08)],1.185,cyan,.12)
    pipe((x+s*.72,5.40,-.61),(x+s*.46,2.50,-.65),.15,steel)
    part('shin_'+label)
    shell(x,.58,[(.18,2.32,3.52,0),(.57,2.4,3.80,.05),(1.01,2.28,3.50,0),(1.58,1.43,2.16,-.34)],frame,.43)
    for j in [-1,1]:
        shell(x+j*.55,1.45,[(.28,.98,2,0),(.76,.98,2.11,0),(1.1,.66,1.42,-.17)],steel)
    part('foot_'+label)

    x=s*3.6
    pipe((x-.71,15.48,0),(x+.71,15.48,0),.88,ink,n=12)
    shell(x,0,[(14.83,1.73,2.29,.08),(15.41,2.40,3.02,0),(16.39,2.5,2.83,-.11),(16.69,1.72,1.99,-.19)],steel,.55)
    shell(x,-.1,[(12.27,1.1,1.34,0),(13.84,1.42,1.75,0),(14.97,1.19,1.55,0)],frame)
    plate([(x-.83,16.1),(x+.81,16.2),(x+.59,15.39),(x-.70,15.46)],1.29,.20,ink)
    # 09 district stencil, on both shoulder plates.
    digits=['111101101101111','111101111001111']
    for digit,pattern in enumerate(digits):
        for j,lit in enumerate(pattern):
            if lit=='1':
                u=x-.48+digit*.53+(j%3)*.13; y=16.03-(j//3)*.12
                plate([(u,y),(u+.116,y),(u+.116,y-.105),(u,y-.105)],1.505,.012,pearl)
    part('upperarm_'+label)
    pipe((x-.70,12.03,0),(x+.70,12.03,0),.59,steel)
    if label=='r':
        # Linear accelerator around the live -Y arm muzzle.
        pipe((x,11.99,0),(x,8.56,0),.80,ink,.69,10)
        for y in [9.02,9.52,10.02,10.52]:
            pipe((x,y,0),(x,y+.20,0),.83,steel,n=10)
        for sign in [-1,1]:
            shell(x+sign*.75,0,[(8.28,.31,1.18,.05),(9.06,.63,1.94,0),(11.39,.65,1.98,0),(11.71,.43,1.53,-.07)],ceramic)
            stripe([(x+sign*.79,11.34),(x+sign*.79,9.33),(x+sign*.75,9.01)],1.01,cyan,.12)
        pipe((x,8.72,0),(x,8.28,0),.62,frame,n=10)
        pipe((x,8.28,0),(x,8.23,0),.37,cyan,n=10,lit=True)
    else:
        stack(x,0,10.68,1.91,2.6,1.91,steel)
        for j in [-1,0,1]:
            pipe((x+j*.48,9.7,.17),(x+j*.48,8.59,.39),.225,frame,.19,5)
            pipe((x+j*.48,8.59,.39),(x+j*.48,8.38,.76),.20,pearl,.09,5)
        pipe((x+s*.77,9.75,.16),(x+s*.82,9.02,.79),.27,ink,.17,5)
    part('forearm_'+label)

x=-3.6
stack(x,-.34,17.74,1.66,1.11,1.7,ink)
shell(x,0,[(17.45,2.61,2.90,-.12),(17.87,3.30,3.35,0),(19.68,3.24,3.29,.05),(20.12,2.53,2.57,-.10)],steel,.35)
plate([(x-1.57,17.91),(x+1.57,17.91),(x+1.48,19.74),(x+.99,20.03),(x-1.10,20.03),(x-1.49,19.65)],1.49,.23,ink)
for row in range(2):
    for col in range(3):
        u=x+(col-1)*.94;y=18.20+row*.94
        pipe((u,y,1.66),(u,y,1.97),.448,pearl,.43,8)
        pipe((u,y,1.97),(u,y,2.10),.355,ink,.33,8)
        pipe((u,y,2.10),(u,y,2.12),.14,pink,n=6,lit=True)
for s in [-1,1]:
    for j in range(3):
        pipe((x+s*1.62,18.0,-.94+j*.67),(x+s*1.62,19.45,-.64+j*.67),.09,cyan,n=4,lit=True)
part('rocket_pod')

x=3.6;y=18.8
stack(x,-.28,17.63,1.81,.9,1.75,ink)
pipe((x,y,-1.53),(x,y,2.80),1.0,frame,.91,10)
for z in [-1.23,-.51,.25,1.05,1.87,2.70]:
    pipe((x,y,z),(x,y,z+.24),1.26,steel,1.19,10)
for j in range(4):
    a=math.pi/4+j*math.pi/2;u=x+1.03*math.cos(a);v=y+1.03*math.sin(a)
    pipe((u,v,-.95),(u,v,2.85),.16,pearl,n=5)
    pipe((u+.07*math.cos(a),v+.07*math.sin(a),-.82),(u+.07*math.cos(a),v+.07*math.sin(a),2.71),.109,cyan,n=5,lit=True)
pipe((x,y,2.80),(x,y,3.16),1.12,ink,1.24,10)
pipe((x,y,3.16),(x,y,3.2),.75,cyan,n=10,lit=True)
pipe((x,y,3.20),(x,y,3.25),.56,ink,.54,10)
part('plasma_cannon')

spec['triangles']=sum(sum(len(f.vertices)-2 for f in o.data.polygons) for o in bpy.context.scene.objects)
spec['appearance']={'name':'Cyberpunk Siege Walker','idleGlow':'#ff348d','chargeGlow':'#57edff'}
bpy.ops.export_scene.gltf(filepath=str(OUT/'siege-walker-cyber.glb'),export_format='GLB',export_animations=False)
(OUT/'siege-walker-cyber.json').write_text(json.dumps(spec,indent=2)+'\n')
print('Cyberpunk Walker:',spec['triangles'],'triangles')
