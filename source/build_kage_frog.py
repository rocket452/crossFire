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
        # Each original digit is a separate closed shell. Keep thumb, index
        # and little finger with their authored bend weights and open the grip.
        tri_joints = data['JOINTS_0'][i:i+3]
        tri_weights = data['WEIGHTS_0'][i:i+3]
        influences = [bones[b] for b in tri_joints[tri_weights>0]]
        if any('Finger2' in name or 'Finger3' in name for name in influences):
            continue
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

frame = material('Visor graphite','24263d',.39)
lens = material('Ice white optics','edffff',.24)
cyan = material('Ion cyan','43dfff',.32)
doc['materials'][lens]['emissiveFactor'] = [.48,.88,1]
doc['materials'][cyan]['emissiveFactor'] = [.035,.60,.95]

# The lens and its bevel use the same curved surface as the dark headband.
# Each section describes the lower cheek line and the upturned outer corner.
# From the temples back, the band becomes a narrower strip of blue fabric.
stations = [
    # azimuth, top, bottom, lens top, lens bottom (portrait ordinates)
    (0,70,87,81,81),(9,70,88,82,82),(18,68,92,82,84),
    (33,60,96,76,88),(48,51,91,67,85),(61,44,81,58,74),
    (72,42,72,58,58),(86,47,71,60,60),(105,51,73,61,61),
    (135,53,74,62,62),(160,53,74,62,62),(180,52,75,62,62)]
band=[]
angles_deg=[s[0] for s in stations]
sectors=angles_deg + [360-a for a in reversed(angles_deg[1:-1])]
for angle in sectors:
    azimuth=min(angle,360-angle)
    _,top,bottom,upper,lower=stations[angles_deg.index(azimuth)]
    a=angle*pi/180
    base_x=76 if azimuth<90 else 75
    levels=[(bottom,-.005),(bottom-2,.005),(lower+.7,.009),
            (lower,.011),(upper,.011),(upper-.7,.009),(top+3,.012),(top,-.003)]
    section=[]
    for y,bevel in levels:
        section.append(((base_x*.00286+bevel)*sin(a),portrait(141,y,0)[1],
                        .009+(.179+bevel)*cos(a)))
    band.append(section)
for i,angle in enumerate(sectors):
    j=(i+1)%len(band)
    middle=min(angle,360-angle)
    middle=(middle+min(sectors[j],360-sectors[j]))/2
    for row in range(len(band[i])-1):
        mat=frame if middle<82 else 8
        if 9 < middle < 72 and row in (2,3,4):
            mat=lens if row==3 else cyan
        if row==6: mat=helmet if middle<82 else 9
        a,b=band[i][row:row+2]
        c,d=band[j][row:row+2]
        face(mat,'B_Head',a,c,b)
        face(mat,'B_Head',c,d,b)

# A shallow green ridge peeks above each swept lens. The layered circular
# earpiece sits on its strap at the temple and is visible in profile.
for side in (-1,1):
    oval(brow,portrait(141+side*45,49,.041),(.063,.068,.078),segments=12,levels=8)
    oval(pupil,portrait(141+side*10,88,.174),(.004,.003,.003),segments=8,levels=6)
    rings=[]
    for x,r in [(.208,0),(.211,.058),(.226,.066),(.241,.057),
                (.244,.045),(.246,.036),(.246,.027),(.247,0)]:
        ring=[(side*x,1.815+r*cos(a),-.012+r*sin(a)) for a in angles[::2]]
        rings.append(ring[::-1] if side==1 else ring)
    for i,mat in enumerate([8,8,helmet,8,cyan,2,frame]):
        loft(mat,rings[i:i+2])

# A knot at the back of the visor feeds two short folded ribbons. Their
# attachment follows the head separately from the long animated neck scarf.
oval(8,(0,1.821,-.171),(.044,.052,.040),segments=12,levels=8)
for path in [
    [(0,1.83,-.175,.021),(.067,1.847,-.205,.027),
     (.240,1.85,-.245,.031),(.357,1.784,-.295,0)],
    [(.003,1.818,-.177,.020),(.054,1.787,-.210,.021),
     (.218,1.734,-.244,.032),(.307,1.644,-.270,0)]]:
    rings=[]
    for x,y,z,w in path:
        rings.append([(x,y+w,z),(x,y,z+w*.34),(x,y-w,z),(x,y,z-w*.28)])
    for low,high in zip(rings,rings[1:]):
        for i,mat in enumerate([9,8,6,8]):
            j=(i+1)%4
            face(mat,'B_Head',low[i],high[i],low[j])
            face(mat,'B_Head',low[j],high[i],high[j])

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
    oval(leaf,(x,.058,.093),(.113,.047,.112),foot,12,6)
    oval(leaf,(x,.045,.170),(.110,.036,.088),toe,16,8)
    # Splayed digits have a narrow shaft and a broad, flattened distal pad.
    for digit in (-1,0,1):
        start_x = x + digit*.052
        end_x = x + digit*.106 + side*.014
        end_z = .348 if digit==0 else .299
        sections=[]
        for t,width,height in [(0,.025,.026),(.28,.032,.032),(.64,.029,.026),
                               (.83,.037,.027),(.98,.037,.027),(1,.030,.020),(1.001,0,0)]:
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

# The armored source already carries a sheathed sword across the back.
# Set a cyan status light into its outward-facing surface.
def plate(mat,bone,points):
    for i in range(1,len(points)-1):
        face(mat,bone,points[0],points[i],points[i+1])

plate(cyan,'B_Spine2',[(.048,1.234,-.192),(.028,1.242,-.192),
                       (-.046,1.354,-.197),(-.026,1.347,-.197)])
# Lightning-shaped greave inlays are split at their elbow so each half
# follows the sloping side of the calf armor.
for side in (-1,1):
    calf='B_'+('L' if side==1 else 'R')+'_Calf'
    for section in [[(.368,.031),(.280,.078),(.276,.060),(.323,.025)],
                    [(.280,.078),(.212,.071),(.279,.045)]]:
        pts=[(side*(.220-(y-.212)*.20),y,z) for y,z in section]
        if np.cross(np.subtract(pts[1],pts[0]),np.subtract(pts[2],pts[0]))[0]*side<0:
            pts.reverse()
        plate(cyan,calf,pts)

# Bevel the armor into closed shells. The front ridge catches the light as a
# knee or shoulder turns in the existing animation.
def armor_panel(bone, outline, depth, thickness, mat, bevel):
    xy=np.array(outline)
    center=xy.mean(axis=0)
    rings=[]
    for scale,z in [(0,depth-thickness),(1,depth-thickness),
                    (1,depth-.010),(.79,depth+.004),(0,depth+.013)]:
        rings.append([(x,y,z) for x,y in center+(xy-center)*scale])
    if np.cross(np.subtract(rings[1][1],rings[1][0]),
                np.subtract(rings[1][2],rings[1][0]))[2]>0:
        rings=[ring[::-1] for ring in rings]
    for i,material_index in enumerate([frame,bevel,bevel,mat]):
        loft(material_index,rings[i:i+2],bone)

for side,label in [(-1,'R'),(1,'L')]:
    def outline(points):
        return [(side*x,y) for x,y in points]
    armor_panel('B_'+label+'_Clavicle',outline([(.092,1.452),(.143,1.494),
                (.245,1.484),(.218,1.424),(.134,1.410)]),.085,.125,2,cyan)
    armor_panel('B_'+label+'_Thigh',outline([(.111,1.004),(.168,1.004),
                (.213,.846),(.151,.862)]),.083,.067,3,4)
    armor_panel('B_'+label+'_Calf',outline([(.075,.548),(.163,.535),
                (.190,.388),(.135,.357),(.052,.410)]),.095,.096,3,4)
    armor_panel('B_Spine2',outline([(.031,1.366),(.112,1.393),(.141,1.364),
                (.095,1.304),(.049,1.287)]),.119,.050,2,cyan)

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
