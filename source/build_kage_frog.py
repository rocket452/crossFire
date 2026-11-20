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

oval(leaf,(0,1.733,.016),(.245,.196,.162))
# Broad cloth jaw with a raised bridge over the snout.
rings=[]
for y,w,d,lift in [(1.495,.003,.004,0),(1.53,.15,.105,0),(1.59,.215,.15,.011),
                     (1.655,.245,.177,.015),(1.69,.244,.176,.043),(1.686,.234,.167,.043)]:
    rings.append([(w*cos(a),y+lift*max(0,sin(a))**5,.013+d*sin(a)) for a in np.arange(32)*2*pi/32])
loft(mask,rings)
for side in [-1,1]:
    x=side*.142
    oval(brow,(x,1.804,.045),(.099,.118,.103))
    oval(eye,(x,1.808,.116),(.084,.091,.068))
    oval(iris,(x+side*.003,1.81,.169),(.056,.066,.028))
    oval(pupil,(x+side*.003,1.818,.187),(.045,.052,.016))
    oval(glint,(x-.014,1.842,.201),(.014,.015,.005),segments=12,levels=8)
    oval(pupil,(side*.026,1.755,.173),(.005,.005,.004),segments=8,levels=6)
    foot='B_'+('L' if side==1 else 'R')+'_Toe0'
    for j in [-1,0,1]:
        oval(leaf,(side*.141+j*.047,.045,.148+(.028 if j==0 else 0)),(.031,.031,.085),foot,12,8)
# Faceted central guard narrows between the raised eye sockets.
for mat,width,offset in [(helmet,1,0),(stripe,.23,.006)]:
    rows=[]
    for y,w,z in [(1.785,.063,.158),(1.842,.082,.141),(1.902,.101,.078),(1.935,.079,-.006),(1.907,.071,-.087)]:
        rows.append([(-w*width,y,z+offset),(0,y+.004,z+.012+offset),(w*width,y,z+offset)])
    for low,high in zip(rows,rows[1:]):
        for i in (0,1):
            face(mat,'B_Head',low[i],low[i+1],high[i]);face(mat,'B_Head',low[i+1],high[i+1],high[i])

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
