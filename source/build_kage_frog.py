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

# Sculpt one continuous shell around the head. The amber aperture sits between
# two projecting lids, with the pupil cut into its surface on both sides.
angles = np.arange(32) * 2*pi/32
meridians = [0, 8, 17, 26, 36, 46, 56, 66, 76, 90, 112, 136, 160, 180]
eye_opening = {17:0, 26:.011, 36:.017, 46:.019, 56:.017, 66:.009, 76:0}
head_rings = []
sectors = meridians + [360-a for a in reversed(meridians[1:-1])]
for angle in sectors:
    azimuth = min(angle, 360-angle)
    a = angle*pi/180
    cheek = max(0,cos(a))
    eye_level = 1.746 + .050*sin(min(azimuth,90)*pi/180)**2
    opening = eye_opening.get(azimuth,0)
    # The center of the mask climbs onto the nose and its sides taper up
    # toward the ears. A folded lower edge makes the jaw readable in profile.
    mask_edge = 1.695 + .033*cheek**10 + .018*(1-cheek)
    temple = max(0, 1-abs(azimuth-60)/40)
    ridge = .035*temple
    profile = [
        (0,0,1.502), (.118,.118,1.529), (.203,.164,1.562+.017*sin(a)**2),
        (.247,.178,mask_edge-.035), (.257,.190,mask_edge-.008),
        (.255,.189,mask_edge), (.247,.176,mask_edge+.006),
        (.245,.181,eye_level-opening-.010), (.237,.172,eye_level-opening),
        (.236,.171,eye_level-opening*.30), (.236,.171,eye_level+opening*.16),
        (.237,.172,eye_level+opening), (.255,.187,eye_level+opening+.008),
        (.252+.009*temple,.176,eye_level+opening+.022), (.215+.026*temple,.156,1.837+ridge),
        (.154,.127,1.867+.5*ridge), (.078,.080,1.886), (0,0,1.899)]
    head_rings.append([(width*sin(a), height, depth*cos(a)+.012)
                       for width,depth,height in profile])

for i, angle in enumerate(sectors):
    j = (i+1) % len(sectors)
    midpoint = (angle + (sectors[j] if j else 360))/2
    azimuth = min(midpoint,360-midpoint)
    for row in range(len(head_rings[i])-1):
        if row < 6:
            mat = helmet if row == 4 or (row == 2 and 76 < azimuth < 136) else mask
        elif row in (8,9,10) and 17 < azimuth < 76:
            mat = pupil if row == 9 and 26 < azimuth < 66 else iris
        elif row in (7,8,9,10,11) and 8 < azimuth < 90:
            mat = mask
        elif row >= 12 and (azimuth < 17 or azimuth >= 76 or row >= 15):
            mat = stripe if (azimuth < 8 or azimuth > 160) and row >= 13 else helmet
        elif row >= 12 or azimuth > 105:
            mat = brow
        else:
            mat = leaf
        a,b = head_rings[i][row:row+2]
        c,d = head_rings[j][row:row+2]
        face(mat,'B_Head',a,c,b)
        face(mat,'B_Head',c,d,b)

for side in (-1,1):
    oval(pupil, (side*.045,1.736,.189),(.007,.003,.004),segments=10,levels=6)

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
