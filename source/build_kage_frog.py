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
brow = material('Brow ridge','80b63e')
mask = material('Midnight face wrap','25283c')
eye = material('Warm ivory sclera','fff2d6',.28)
iris = material('Amber iris','f5a02f',.27)
pupil = material('Ink pupil','141527',.22)
glint = material('Eye glint','ffffff',.2)
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

# Wide, low cheek line and a forward muzzle join the raised eye sockets.
oval(leaf, (0, 1.727, .014), (.280, .167, .170))
oval(leaf, (0, 1.747, .111), (.197, .083, .097))
angles = np.arange(32) * 2*pi/32
rings = []
for y,w,d,lift in [(1.495,.007,.013,0), (1.52,.133,.115,0), (1.56,.216,.163,0),
                   (1.625,.272,.184,.012), (1.687,.288,.198,.056),
                   (1.696,.280,.196,.055), (1.690,.264,.181,.054)]:
    rings.append([(w*cos(a), y+lift*max(0,sin(a))**6, .014+d*sin(a)) for a in angles])
loft(mask, rings)

for side in (-1,1):
    x = side*.167
    oval(brow, (x,1.807,.044), (.110,.134,.115))
    oval(eye, (x,1.809,.117), (.093,.095,.066))
    oval(iris, (x-side*.006,1.812,.166), (.072,.077,.032))
    oval(pupil, (x-side*.008,1.819,.187), (.058,.064,.021))
    oval(glint, (x-.027,1.849,.204), (.015,.016,.006), segments=12, levels=8)
    oval(pupil, (side*.039,1.763,.206), (.006,.006,.004), segments=10, levels=6)

    # Sweep a tapered eyelid up from the inner corner and over the eye.
    # The outer end sits farther back so the eyes remain visible in profile.
    lid = []
    for t in np.linspace(0, pi, 15):
        span = sin(t)
        cx = side*(.167-.101*cos(t))
        cy = 1.802 + .104*span + .021*(-cos(t))
        cz = .135 + .014*span - .012*(-cos(t))
        normal = np.array([-side*cos(t),span,0])
        ring = [np.array([cx,cy,cz]) + normal*(.004+.018*span)*cos(a)
                + np.array([0,0,(.006+.025*span)*sin(a)]) for a in angles[::4]]
        lid.append(ring[::-1] if side==1 else ring)
    loft(brow,lid)

# A transverse crown follows the back of the skull, tapering into a shield
# between the eyes. The crest shares the crown's faceted cross section.
crown = [(1.790,.075,.197),(1.844,.103,.164),(1.910,.133,.107),
         (1.956,.107,.018),(1.944,.113,-.061),(1.889,.151,-.129),
         (1.802,.154,-.153),(1.738,.110,-.155)]
for mat, half, offset in [(helmet,1,0),(stripe,.26,.003)]:
    rows=[]
    for row,(y,w,z) in enumerate(crown):
        dy = crown[min(row+1,len(crown)-1)][0]-crown[max(row-1,0)][0]
        dz = crown[min(row+1,len(crown)-1)][2]-crown[max(row-1,0)][2]
        ny,nz = np.array([-dz,dy])/np.hypot(dy,dz)
        rows.append([(w*t, y+ny*(offset-.020*abs(t)), z+nz*(offset-.020*abs(t)))
                     for t in (-half,0,half)])
    for low,high in zip(rows,rows[1:]):
        for i in (0,1):
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
