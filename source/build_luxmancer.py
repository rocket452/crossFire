"""Luxmancer's solar vestments on the game's animated humanoid skeleton."""
import math
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_rift_armor as hooded
from build_rift_armor import armor

def sun(x, y, z, size, bone, side=None):
    points = []
    for i in range(16):
        angle = i * math.pi / 8
        radius = size * (1.3 if i % 4 == 0 else .68)
        u, v = math.cos(angle)*radius, math.sin(angle)*radius
        points.append((x+u,y+v,z) if side is None else (x,y+v,z+u))
    armor.surface(points, [(list(range(16)), 'rift core')], armor.fixed(bone))

def cloak():
    # Keep both tails behind the armor as the chest and hips rotate.
    rows = [
        ((0,1.452,-.129),(.052,1.455,-.138),(.100,1.458,-.152),(.120,1.465,-.164)),
        ((0,1.29,-.255),(.070,1.29,-.260),(.105,1.29,-.266),(.124,1.28,-.267)),
        ((.053,1.035,-.275),(.109,1.035,-.282),(.151,1.035,-.286),(.177,1.02,-.286)),
        ((.304,.830,-.506),(.331,.82,-.509),(.358,.802,-.495),(.380,.795,-.475)),
        ((.349,.65,-.715),(.376,.602,-.719),(.414,.552,-.705),(.453,.508,-.693)),
    ]
    weights = lambda v: armor.blend(v.y,1.015,1.37,'B_Pelvis','B_Spine2')
    for side in (-1,1):
        points = [(side*x,y,z) for row in rows for x,y,z in row]
        faces = []
        for row in range(len(rows)-1):
            for col in range(3):
                i = row*4+col
                face = [i,i+1,i+5,i+4]
                material = 'cloak trim' if col == 2 else 'cloak'
                faces.append((face if side < 0 else face[::-1],material))
        armor.surface(points,faces,weights)


armor.MATERIALS.update({
    'rubber':('24202c',.65,0),'navy':('302b38',.55,0),'shadow':('15131b',.7,0),
    'hood':('504958',.65,0),'cloak':('e9a017',.56,0),'cloak trim':('ffe27b',.38,.18),'blue':('48404f',.55,0),
    'silver':('f2e7de',.38,0),'silver edge':('948799',.45,0),
    'gold':('f6a519',.35,0),'gold edge':('ffe27b',.38,.18),
    'rift core':('fff5ba',.3,2.5),'rift light':('ffcf36',.38,1),
    'circuit cyan':('ffc030',.37,1)
})
hooded.loop_emblem=sun
hooded.torso()
armor.limbs()
hooded.hood()
cloak()
for bone,y,z,size in [('B_Head',1.87,.095,.055),('B_Pelvis',.978,.122,.04)]:
    armor.plate([(0,y+size*1.5,z),(size,y,z),(0,y-size,z),(-size,y,z)],
                'gold edge','gold',bone,ridge=(0,y,z+.035))
armor.plate([(-.074,.95,.111),(.074,.95,.111),(.098,.50,.145),(0,.42,.159),(-.098,.50,.145)],
            'gold','gold edge','B_Pelvis',ridge=(0,.67,.165))
armor.output(*map(Path,sys.argv[sys.argv.index('--')+1:]),name='Luxmancer',mesh_name='SolarVestments',
             double_sided=('cloak','cloak trim','gold edge','rift core','rift light'))
