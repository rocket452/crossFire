"""Build the frog ninja on Kage's existing bind pose. Usage: python ... armored.glb frog.glb"""
import sys
import struct
import json
from collections import defaultdict
from math import sin, cos, pi
from pathlib import Path
import numpy as np

source, target = map(Path, sys.argv[1:])
raw = source.read_bytes()
n = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20+n])
doc['scenes'][0]['extras']['character']['source'] = 'Kage Frog Ninja / Explosive LLC animation rig'
buf = bytearray(raw[28+n:])
skin = doc['skins'][0]
bones = [doc['nodes'][i]['name'] for i in skin['joints']]
streams = defaultdict(lambda: defaultdict(list))
formats = {'POSITION': ('<f4', 'VEC3', 5126), 'NORMAL': ('<f4', 'VEC3', 5126),
           'JOINTS_0': ('<u2', 'VEC4', 5123), 'WEIGHTS_0': ('<f4', 'VEC4', 5126)}

def material(name, rgb, rough=.55):
    color = [((int(rgb[i:i+2], 16)/255+.055)/1.055)**2.4 for i in (0,2,4)]
    doc['materials'].append({'name':name, 'pbrMetallicRoughness':{'baseColorFactor':color+[1],
                            'roughnessFactor':rough, 'metallicFactor':0}})
    return len(doc['materials'])-1

leaf = material('Leaf green skin','99ce44')
brow = material('Brow ridge','91c140')
mask = material('Midnight face wrap','25283c')
iris = material('Amber iris','f5a02f',.27)
pupil = material('Ink pupil','141527',.22)
helmet = material('Forehead guard','323d5e')
stripe = material('Cerulean crest','57baff')
for i,color in [(5,[.04,.62,1]),(6,[.018,.055,.16]),(8,[.035,.15,.48]),(9,[.04,.23,.64])]:
    m=doc['materials'][i]
    m['pbrMetallicRoughness']['baseColorFactor']=color+[1]
    if 'emissiveFactor' in m: m['emissiveFactor']=color

# Preserve original limb weighting, including finger chains and flowing scarf.
for prim in doc['meshes'][0]['primitives']:
    data={}
    for key,idx in prim['attributes'].items():
        a=doc['accessors'][idx];view=doc['bufferViews'][a['bufferView']]
        columns=int(formats[key][1][-1])
        data[key]=np.frombuffer(buf,dtype=formats[key][0],count=a['count']*columns,
                    offset=view.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,columns).copy()
    for i in range(0,len(data['POSITION']),3):
        joint=bones[data['JOINTS_0'][i,0]]
        if joint=='B_Head': continue
        mat=leaf if 'Finger' in joint or 'Hand' in joint else prim['material']
        for key,values in data.items(): streams[mat][key].extend(values[i:i+3])

def face(mat,bone,a,b,c):
    normal=np.cross(np.subtract(b,a),np.subtract(c,a))
    length=np.linalg.norm(normal)
    if length<1e-10: return
    s=streams[mat]
    s['POSITION'].extend([a,b,c]);s['NORMAL'].extend([normal/length]*3)
    s['JOINTS_0'].extend([[bones.index(bone),0,0,0]]*3);s['WEIGHTS_0'].extend([[1,0,0,0]]*3)

def loft(mat, rings, bone='B_Head'):
    for low,high in zip(rings,rings[1:]):
        for i in range(len(low)):
            j=(i+1)%len(low)
            face(mat,bone,low[i],high[i],low[j]);face(mat,bone,low[j],high[i],high[j])

def oval(mat,center,radii,bone='B_Head',segments=20,levels=12):
    x,y,z=center;w,h,d=radii
    rings=[]
    for i in range(levels+1):
        lat=(i/levels-.5)*pi
        rings.append([(x+w*cos(lat)*cos(a),y+h*sin(lat),z+d*cos(lat)*sin(a))
                      for a in np.arange(segments)*2*pi/segments])
    loft(mat,rings,bone)

# Front-view landmarks are in portrait pixels. Compensate for the game's
# wider armored proportions before binding the vertices to the head bone.
angles = np.arange(32) * 2*pi/32
def portrait(x, y, depth):
    return ((x-141)*.00286, 1.51+(149-y)*.00372, depth)

def contour(mat, profile):
    rings = []
    for width, y, depth, edge in profile:
        ring = []
        for a in angles:
            fraction = abs(cos(a))
            front = max(0,sin(a))
            offset = np.interp(fraction, [0,.35,.72,1],edge)*front
            ring.append(portrait(141+width*cos(a), y+offset, .009+depth*sin(a)))
        rings.append(ring)
    loft(mat, rings)

flat = [0,0,0,0]
contour(leaf, [(0,136,0,flat),(59,121,.128,flat),(83,98,.164,flat),
               (83,89,.168,flat),(69,65,.143,flat),(66,50,.118,flat),
               (44,39,.081,flat),(0,35,0,flat)])
# The mask climbs over the nose and dips beneath each eye before turning
# back up into the cheek corners. Keep the rim a narrow bevel.
edge = [-3,3,14,0]
contour(mask, [(0,149,0,flat),(41,143,.103,[-1,0,2,1]),(68,130,.148,[-4,-2,1,1]),
               (81,116,.170,flat),(89,97,.179,edge),(87,94,.182,edge),
               (83,92,.170,edge)])

ivory = material('Warm ivory eye','fff1cc',.30)
glint = material('Eye catchlight','fffffa',.22)
for side in (-1,1):
    def mirrored(x,y,z):
        return portrait(141+side*x,y,z)

    # Mold the socket into the cheek. Build one convex eye surface with
    # continuous colored rings so the iris stays flush in side view.
    oval(brow,mirrored(54,73,.075),(.073,.104,.088),segments=18,levels=10)
    eye_rings = [(24,25,54,74,.125), (21,22,54,74,.150),
                 (16.2,18,52,75,.169), (12.5,14.6,51,73,.180),
                 (6,7,50,72,.186), (0,0,50,72,.188)]
    eye_materials = [brow,ivory,iris,pupil,pupil]
    rings=[]
    for rx,ry,cx,cy,z in eye_rings:
        ring=[mirrored(cx+rx*cos(a),cy+ry*sin(a),z-.020*cos(a)*rx/24) for a in angles]
        rings.append(ring if side==1 else ring[::-1])
    for i,mat in enumerate(eye_materials):
        loft(mat,rings[i:i+2])
    oval(glint,mirrored(47,69,.188),(.011,.016,.004),segments=12,levels=8)

    # Closed, wedge-shaped brow. Its heavy inner end descends toward the
    # nose and its outer tip folds back into the side of the skull.
    brow_sections = [(25,75,72,.169,.136),(33,70,43,.181,.111),
                    (49,51,34,.170,.094),(59,49,32,.148,.081),
                    (69,52,39,.135,.066),(75,61,51,.114,.061),
                    (77,66,64,.101,.080)]
    brow_rings=[]
    for x,lower,upper,front,back in brow_sections:
        section=[mirrored(x,lower,front),mirrored(x,upper+4,front-.002),
                 mirrored(x,upper,back+.010),mirrored(x,upper+4,back-.027),
                 mirrored(x,lower+4,back-.017)]
        brow_rings.append(section if side==1 else section[::-1])
    loft(brow,brow_rings)
    for ring in (brow_rings[0],brow_rings[-1][::-1]):
        for i in range(1,len(ring)-1):
            face(brow,'B_Head',ring[0],ring[i],ring[i+1])
    oval(pupil,mirrored(12,82,.175),(.006,.007,.004),segments=10,levels=6)

# Faceted indigo helmet with splayed side panels and a trapezoidal blue
# center plate. Continue the crest over the crown for the third-person view.
rows=[]
for y,w,depth in [(73,25,.179),(63,29,.170),(40,42,.141),(31,38,.099),
                  (24,23,.029),(24,19,-.035),(38,37,-.106),
                  (58,59,-.144),(87,64,-.154),(99,53,-.147)]:
    rows.append([portrait(141+w*t,y+abs(t)*2,depth-np.sign(depth)*.030*abs(t))
                 for t in (-1,-.52,-.24,.24,.52,1)])
# Turn the side edges of the guard into the skull, including its rear lip.
for row in rows:
    for edge_index in (0,-1):
        x,y,z=row[edge_index]
        inset=(x*.77,y-.032,z*.79)
        if edge_index==0:
            row.insert(0,inset)
        else:
            row.append(inset)
for low,high in zip(rows,rows[1:]):
    for i in range(len(low)-1):
        mat=stripe if i==3 else helmet
        face(mat,'B_Head',low[i],low[i+1],high[i])
        face(mat,'B_Head',low[i+1],high[i+1],high[i])

# A low instep emerges below the greave. Rigid toe pads and scalloped webs
# roll with Toe0, with a Foot-weighted heel underneath the ankle.
web = material('Palm webbing','77b83e')
for side in (-1,1):
    side_name = 'L' if side==1 else 'R'
    foot = f'B_{side_name}_Foot'
    toe = f'B_{side_name}_Toe0'
    x = side*.143
    oval(leaf,(x,.058,.093),(.113,.047,.112),foot,16,8)
    oval(leaf,(x,.045,.170),(.110,.036,.088),toe,16,8)
    # Splayed digits have a narrow shaft and a broad, flattened distal pad.
    for digit in (-1,0,1):
        start_x = x + digit*.052
        end_x = x + digit*.106 + side*.014
        end_z = .348 if digit==0 else .299
        sections=[]
        for t,width,height in [(0,.025,.020),(.28,.032,.024),(.64,.025,.020),
                               (.80,.037,.023),(.93,.037,.021),(1,.012,.009),(1.01,0,0)]:
            cx = start_x+(end_x-start_x)*t
            cz = .142+(end_z-.142)*t
            cy = .055-.027*t
            sections.append([(cx+width*cos(a),cy-height*sin(a),cz) for a in angles[::4]])
        loft(leaf,sections,toe)
    for gap in (-1,1):
        # A scalloped leading edge leaves daylight between distal toe pads.
        outline=[(0,.168),(gap*.061,.159),(gap*.084,.255),
                 (gap*.061,.239),(gap*.038,.234),(gap*.016,.254),(0,.279)]
        center=(x+gap*.040,.045,.206)
        underside=(center[0],.024,center[2])
        rim=[(x+u+side*.006,.030,v) for u,v in outline]
        if gap==1: rim.reverse()
        for a,b in zip(rim,rim[1:]+rim[:1]):
            face(web,toe,center,a,b)
            face(web,toe,underside,b,a)

prims=[]
for mat,data in sorted(streams.items()):
    attrs={}
    for key,values in data.items():
        dtype,type_name,component=formats[key];arr=np.asarray(values,dtype=dtype)
        buf.extend(b'\0'*(-len(buf)%4));start=len(buf);buf.extend(arr.tobytes())
        doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':arr.nbytes,'target':34962})
        a={'bufferView':len(doc['bufferViews'])-1,'componentType':component,'type':type_name,'count':len(arr)}
        if key=='POSITION':a.update(min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist())
        attrs[key]=len(doc['accessors']);doc['accessors'].append(a)
    prims.append({'material':mat,'attributes':attrs})
doc['meshes'][0].update(name='Kage frog ninja',primitives=prims)
buf.extend(b'\0'*(-len(buf)%4));doc['buffers'][0]['byteLength']=len(buf)
data=json.dumps(doc,separators=(',',':')).encode();data+=b' '*(-len(data)%4)
target.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(data)+len(buf))+struct.pack('<I4s',len(data),b'JSON')+data+struct.pack('<I4s',len(buf),b'BIN\0')+buf)
