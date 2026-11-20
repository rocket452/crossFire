"""Build Volt Rush's reference armor on the existing licensed humanoid skin."""
import json
import math
import struct
import sys
from collections import defaultdict
from pathlib import Path

from mathutils import Vector
from mathutils.geometry import tessellate_polygon


MATERIALS = {
    'rubber': ('101c31', .62, 0),
    'navy': ('20385c', .48, 0),
    'blue': ('2176be', .39, 0),
    'light blue': ('44a7ec', .38, 0),
    'silver': ('d5e5f4', .44, 0),
    'silver edge': ('8099b5', .47, 0),
    'skin': ('cf9b8a', .70, 0),
    'shadow': ('101c34', .58, 0),
    'circuit cyan': ('33d3ff', .36, 1.35),
    'charged lens': ('b0f7ff', .28, 2.4),
}
geometry = defaultdict(list)


def blend(height, low, high, lower, upper):
    t = min(1, max(0, (height-low)/(high-low)))
    t = t*t*(3-2*t)
    return [(lower, 1-t), (upper, t)]


def surface(points, faces, weights):
    for indices, material in faces:
        polygon = [Vector(points[i]) for i in indices]
        for triangle in tessellate_polygon([polygon]):
            vertices = [polygon[i] for i in triangle]
            a, b, c = vertices
            normal = (b-a).cross(c-a)
            if normal.length < 1e-7:
                continue
            geometry[material].extend((tuple(v), tuple(normal.normalized()), weights(v)) for v in vertices)


def loft(rings, bands, weights, *, axis='y', side=1, facets=8):
    # Rings encode height (or arm reach), the center, and two radii.
    points, faces = [], []
    for distance, x, depth, width, radius in rings:
        for j in range(facets):
            angle = math.tau*(j+.5)/facets
            u = x+width*math.cos(angle)
            v = depth+radius*math.sin(angle)
            points.append((side*u, distance, v) if axis=='y' else (side*distance, v, u))
    faces.append((list(range(facets)), bands[0]))
    for ring, material in enumerate(bands):
        base = ring*facets
        for j in range(facets):
            k = (j+1)%facets
            faces.append(([base+j,base+j+facets,base+k+facets,base+k],material))
    faces.append((list(reversed(range(len(points)-facets,len(points)))),bands[-1]))
    if side<0:
        faces = [(list(reversed(f)), m) for f,m in faces]
    surface(points, faces, weights)


def fixed(bone):
    return lambda _: [(bone, 1)]


def plate(profile, front, edge, bone, *, side=1, depth=.012, ridge=None):
    points = [(side*x,y,z) for x,y,z in profile]
    n=len(points)
    points.extend((side*x,y,z-depth) for x,y,z in profile)
    # Ensure consistently outward front normals regardless of profile order.
    area=sum(profile[i][0]*profile[(i+1)%n][1]-profile[(i+1)%n][0]*profile[i][1] for i in range(n))
    face=list(range(n))
    if area*side<0:
        face.reverse()
    faces=[([i+n for i in reversed(face)],edge)]
    for i,j in zip(face,face[1:]+face[:1]):
        faces.append(([j,i,i+n,j+n],edge))
    if ridge:
        points.append((ridge[0]*side,*ridge[1:]))
        faces.extend(([i,j,2*n],front) for i,j in zip(face,face[1:]+face[:1]))
    else:
        faces.append((face,front))
    surface(points,faces,fixed(bone))


def body():
    loft([(.91,0,0,.10,.074),(1.05,0,.012,.12,.09),(1.17,0,.016,.128,.10),
          (1.34,0,.016,.192,.117),(1.45,0,.005,.187,.103),(1.51,0,-.004,.104,.08)],
         ['navy','rubber','navy','navy','blue'],
         lambda v: blend(v.y,.98,1.18,'B_Pelvis','B_Spine1') if v.y<1.18
         else blend(v.y,1.19,1.37,'B_Spine1','B_Spine2'))
    loft([(.85,0,-.006,.054,.058),(.93,0,0,.134,.095),(1.001,0,.01,.137,.10),
          (1.052,0,.01,.116,.086)],['rubber','navy','blue'],fixed('B_Pelvis'))
    loft([(1.46,0,0,.073,.07),(1.53,0,.001,.095,.08),(1.584,0,0,.079,.072)],
         ['navy','rubber'],fixed('B_Neck'))
    plate([(-.097,1.383,.121),(-.072,1.421,.120),(.072,1.421,.120),(.097,1.383,.121),
           (.074,1.255,.113),(0,1.222,.105),(-.074,1.255,.113)],
          'navy','shadow','B_Spine2',ridge=(0,1.32,.162))
    plate([(.026,1.398,.15),(-.055,1.329,.168),(-.009,1.332,.173),(-.035,1.264,.139),
           (.062,1.354,.159),(.016,1.35,.169)],'charged lens','circuit cyan','B_Spine2',depth=.012)
    for side in (-1,1):
        plate([(.02,1.427,.119),(.142,1.478,.105),(.195,1.449,.077),(.154,1.385,.114),
               (.074,1.362,.148)],'light blue','blue','B_Spine2',side=side,ridge=(.103,1.424,.150))
        plate([(.07,1.363,.145),(.086,1.372,.139),(.10,1.314,.134),(.079,1.252,.124)],
              'circuit cyan','blue','B_Spine2',side=side)
        plate([(.009,1.024,.107),(.108,1.04,.092),(.146,.986,.082),(.082,.978,.108),
               (.014,.919,.105)],'silver','silver edge','B_Pelvis',side=side,ridge=(.060,.988,.122))


def limbs():
    for side, prefix in ((1,'B_L_'),(-1,'B_R_')):
        joint = lambda s: fixed(prefix+s)
        loft([(.49,.108,-.008,.065,.062),(.64,.10,-.005,.082,.067),(.86,.086,-.005,.089,.080),
              (.975,.083,0,.078,.067)],['rubber','navy','navy'],joint('Thigh'),side=side)
        loft([(.112,.134,-.038,.109,.104),(.25,.131,-.015,.109,.096),(.41,.116,-.007,.088,.080),
              (.533,.108,-.007,.071,.068),(.585,.107,-.005,.061,.063)],
             ['blue','navy','blue','rubber'],joint('Calf'),side=side)
        loft([(0,.137,.026,.124,.173),(.04,.137,.03,.124,.174),(.094,.137,.029,.114,.156),
              (.158,.135,-.022,.097,.113),(.184,.135,-.046,.087,.091)],
             ['navy','blue','silver','navy'],lambda v:blend(v.z,.105,.164,prefix+'Foot',prefix+'Toe0'),side=side)
        plate([(.046,.53,.061),(.073,.602,.059),(.145,.594,.055),(.175,.506,.071),
               (.19,.423,.078),(.133,.391,.093),(.046,.426,.066)],
              'silver','silver edge',prefix+'Calf',side=side,ridge=(.113,.492,.112))
        plate([(.156,.392,.096),(.189,.388,.088),(.218,.316,.066),(.189,.331,.092),
               (.224,.222,.067),(.153,.314,.105),(.180,.305,.101)],
              'circuit cyan','blue',prefix+'Calf',side=side)
        loft([(.13,.012,1.423,.074,.055),(.196,.013,1.432,.079,.074),(.263,.012,1.43,.07,.06),
              (.288,.013,1.421,.058,.042)],['silver edge','blue','navy'],joint('UpperArm'),axis='x',side=side)
        loft([(.249,.013,1.42,.044,.042),(.40,.013,1.42,.047,.043),(.505,.012,1.42,.040,.040)],
             ['navy','rubber'],lambda v:blend(abs(v.x),.455,.505,prefix+'UpperArm',prefix+'Forearm'),axis='x',side=side)
        loft([(.485,.012,1.42,.051,.051),(.53,.013,1.423,.082,.070),(.654,.013,1.423,.094,.089),
              (.708,.013,1.423,.084,.084),(.728,.013,1.423,.073,.071)],
             ['silver edge','silver','blue','silver'],joint('Forearm'),axis='x',side=side)
        plate([(.533,1.457,.085),(.552,1.49,.076),(.688,1.485,.08),(.71,1.441,.093),
               (.697,1.375,.096),(.562,1.378,.083)],'blue','navy',prefix+'Forearm',
               side=side,ridge=(.632,1.436,.109))
        loft([(.684,.013,1.423,.058,.054),(.744,.013,1.425,.046,.044),(.803,.014,1.428,.058,.037),
              (.869,.014,1.432,.064,.028)],
             ['rubber','blue','navy'],lambda v:blend(abs(v.x),.705,.755,prefix+'Forearm',prefix+'Hand'),axis='x',side=side)
        # Thumb and four visible articulated fingers use the original clip joints.
        for digit,(start,end,depth) in enumerate([(.802,.907,.080),(.851,.960,.049),(.851,.975,.020),
                                                  (.851,.960,-.009),(.851,.943,-.036)]):
            name=prefix+'Finger'+str(digit)
            y=1.425 if digit==0 else 1.44
            loft([(start,depth,y,.014,.019),((start+end)/2,depth,y,.013,.017),(end,depth,y-.003,.010,.012)],
                 ['navy','blue'],lambda v:blend(abs(v.x),start+.015,end-.016,name,name+'2'),
                 axis='x',side=side,facets=6)


def helmet():
    head='B_Head'
    loft([(1.511,0,-.005,.067,.063),(1.543,0,-.008,.115,.081),(1.61,0,-.016,.153,.102),
          (1.681,0,-.029,.166,.125),(1.748,0,-.026,.155,.115),(1.804,0,-.032,.107,.095),
          (1.846,0,-.033,.06,.065)],['navy','blue','navy','navy','blue','light blue'],fixed(head),facets=12)
    plate([(-.102,1.643,.087),(0,1.665,.134),(.102,1.643,.087),(.101,1.58,.091),
           (.052,1.548,.117),(0,1.544,.124),(-.052,1.548,.117),(-.101,1.58,.091)],
          'skin','shadow',head,ridge=(0,1.593,.143))
    plate([(-.074,1.566,.109),(-.033,1.551,.131),(0,1.56,.142),(.033,1.551,.131),
           (.074,1.566,.109),(.062,1.529,.092),(0,1.511,.103),(-.062,1.529,.092)],
          'navy','blue',head,ridge=(0,1.537,.153))
    plate([(-.038,1.86,.024),(.038,1.86,.024),(.054,1.83,.061),(.04,1.737,.112),
           (0,1.666,.146),(-.04,1.737,.112),(-.054,1.83,.061)],
          'light blue','blue',head,ridge=(0,1.766,.126))
    for side in (-1,1):
        def mirrored(profile,front,edge,**kwargs):
            plate(profile,front,edge,head,side=side,**kwargs)
        mirrored([(.014,1.647,.126),(.123,1.704,.077),(.143,1.672,.06),(.112,1.619,.105),
                  (.066,1.593,.127),(.02,1.602,.146)],'shadow','blue')
        mirrored([(.028,1.635,.150),(.105,1.667,.114),(.097,1.628,.124),(.057,1.61,.142),
                  (.031,1.612,.153)],'charged lens','circuit cyan')
        mirrored([(0,1.653,.15),(.083,1.681,.129),(.152,1.723,.053),(.154,1.696,.062),
                  (.100,1.654,.132),(.028,1.632,.16)],'blue','navy',ridge=(.077,1.657,.155))
        mirrored([(0,1.667,.15),(.089,1.709,.108),(.14,1.752,.062),(.148,1.735,.059),
                  (.113,1.699,.102),(.048,1.674,.141)],'silver','silver edge')
        loft([(1.588,.149,-.003,.024,.033),(1.623,.169,-.006,.023,.047),
              (1.693,.170,-.012,.022,.047),(1.725,.15,-.017,.023,.036)],
             ['blue','silver edge','silver'],fixed(head),side=side)
        mirrored([(.155,1.622,.031),(.182,1.655,.014),(.197,1.778,-.006),(.219,1.832,-.031),
                  (.184,1.779,-.019),(.169,1.714,.004)],'circuit cyan','blue',depth=.025,
                 ridge=(.182,1.735,.037))


def output(rig, path):
    reference=rig.read_bytes()
    json_size=struct.unpack_from('<I',reference,12)[0]
    gltf=json.loads(reference[20:20+json_size])
    binary=bytearray(reference[28+json_size:])
    joint_names={gltf['nodes'][n]['name']:i for i,n in enumerate(gltf['skins'][0]['joints'])}

    def accessor(data, code, columns, kind):
        binary.extend(b'\0'*(-len(binary)%4))
        origin=len(binary)
        binary.extend(struct.pack('<'+code*len(data),*data))
        index=len(gltf['bufferViews'])
        gltf['bufferViews'].append({'buffer':0,'byteOffset':origin,'byteLength':len(binary)-origin,'target':34962})
        acc={'bufferView':index,'componentType':{'f':5126,'H':5123}[code],'count':len(data)//columns,'type':kind}
        if kind=='VEC3':
            acc.update(min=[min(data[i::3]) for i in range(3)],max=[max(data[i::3]) for i in range(3)])
        gltf['accessors'].append(acc)
        return len(gltf['accessors'])-1

    def linear(value):
        value=int(value,16)/255
        return value/12.92 if value<.04045 else ((value+.055)/1.055)**2.4

    materials,primitives=[],[]
    for name,vertices in geometry.items():
        color,roughness,strength=MATERIALS[name]
        rgb=[linear(color[i:i+2]) for i in (0,2,4)]
        mat={'name':name,'pbrMetallicRoughness':{
            'baseColorFactor':[*rgb,1],'roughnessFactor':roughness,'metallicFactor':.16 if name!='skin' else 0}}
        if strength:
            mat.update(emissiveFactor=rgb,extensions={'KHR_materials_emissive_strength':{'emissiveStrength':strength}})
        positions,normals,joints,weights=[],[],[],[]
        for point,normal,skin in vertices:
            positions.extend(point)
            normals.extend(normal)
            joints.extend([joint_names[bone] for bone,_ in skin]+[0]*(4-len(skin)))
            weights.extend([w for _,w in skin]+[0]*(4-len(skin)))
        primitives.append({'material':len(materials),'attributes':{
            'POSITION':accessor(positions,'f',3,'VEC3'),'NORMAL':accessor(normals,'f',3,'VEC3'),
            'JOINTS_0':accessor(joints,'H',4,'VEC4'),'WEIGHTS_0':accessor(weights,'f',4,'VEC4')}})
        materials.append(mat)

    for node in gltf['nodes']:
        if 'mesh' in node:
            node['name']='VoltRushArmor'
    gltf['meshes']=[{'name':'Volt Rush armor','primitives':primitives}]
    gltf['materials']=materials
    gltf['extensionsUsed']=['KHR_materials_emissive_strength']
    gltf['scenes'][0]['extras']={'character':{
        'source':'Volt Rush armor / Explosive LLC animation rig','nominalHeight':1.86,'preserveMaterials':True}}
    binary.extend(b'\0'*(-len(binary)%4))
    gltf['buffers'][0]['byteLength']=len(binary)
    data=json.dumps(gltf,separators=(',',':')).encode()
    data+=b' '*(-len(data)%4)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(data)+len(binary))+
                     struct.pack('<I4s',len(data),b'JSON')+data+struct.pack('<I4s',len(binary),b'BIN\0')+binary)
    print(f'Volt Rush: {sum(len(v) for v in geometry.values())//3} triangles, {len(joint_names)} joints, {len(gltf["animations"])} original clips')


if __name__=='__main__':
    source,destination=map(Path,sys.argv[sys.argv.index('--')+1:])
    body()
    limbs()
    helmet()
    output(source,destination)
