"""Build Rift Warden's hooded reference armor on the shared weighted rig."""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_volt_armor as armor


def loop_emblem(x, y, z, size, bone, side=None):
    points, faces = [], []
    for strand in range(2):
        base = len(points)
        for i in range(17):
            t = i / 16
            angle = strand * math.pi + t * math.pi * 1.72
            reach = size * (1 - .48 * t)
            width = size * (.18 - .15 * t)
            for radius in (reach - width, reach + width):
                u, v = math.cos(angle)*radius, math.sin(angle)*radius
                points.append((x+u,y+v,z) if side is None else (x,y+v,z+u))
            if i:
                a = base+2*i-2
                face = [a,a+1,a+3,a+2]
                faces.append((face if side != -1 else face[::-1],
                              'rift core' if strand==0 else 'rift light'))
    armor.surface(points, faces, armor.fixed(bone))


def hood():
    head = 'B_Head'
    opening = [
        (0,1.836,.125),(.092,1.805,.108),(.158,1.698,.104),
        (.202,1.60,.092),(.108,1.538,.128),(0,1.493,.142),
        (-.108,1.538,.128),(-.202,1.60,.092),(-.158,1.698,.104),(-.092,1.805,.108)
    ]
    points, faces = [], []
    for scale, depth, vertical in [
        (.85,.025,0),(1,.0,0),(1.04,-.047,.018),(.94,-.135,.022),
        (.74,-.222,.008),(.38,-.267,0)
    ]:
        for x,y,z in opening:
            points.append((x*scale,1.663+(y-1.663)*scale+vertical,z+depth))
    count=len(opening)
    for row in range(5):
        for i in range(count):
            j=(i+1)%count
            a,b=row*count,(row+1)*count
            material='gold edge' if row==0 else 'navy' if row in (1,3) else 'hood'
            faces.append(([a+i,a+j,b+j,b+i],material))
    faces.append((list(range(len(points)-count,len(points))),'hood'))
    armor.surface(points,faces,armor.fixed(head))
    armor.plate([(-.140,1.648,.106),(-.111,1.752,.092),(0,1.777,.107),
                 (.111,1.752,.092),(.140,1.648,.106),(.073,1.556,.146),(0,1.522,.154),
                 (-.073,1.556,.146)],'shadow','hood',head,ridge=(0,1.66,.16))
    armor.plate([(-.109,1.703,.124),(-.062,1.719,.133),(0,1.68,.168),
                 (.062,1.719,.133),(.109,1.703,.124),(.059,1.668,.152),(0,1.639,.175),
                 (-.059,1.668,.152)],'navy','shadow',head,ridge=(0,1.673,.175))
    armor.plate([(-.053,1.813,.13),(0,1.865,.082),(.053,1.813,.13),
                 (0,1.773,.151)],'gold edge','gold',head,ridge=(0,1.817,.155))
    for side in (-1,1):
        armor.plate([(.024,1.643,.174),(.110,1.688,.137),(.093,1.643,.148),
                     (.062,1.627,.168),(.035,1.628,.175)],
                    'rift core','rift light',head,side=side,depth=.005)
        armor.loft([(.153,-.046,1.67,.055,.057),(.179,-.046,1.67,.06,.063),
                    (.197,-.046,1.67,.047,.05)],['hood','navy'],armor.fixed(head),axis='x',side=side)
        loop_emblem(side*.201,1.67,-.046,.033,head,side)


def torso():
    armor.loft([(.89,0,0,.099,.076),(1.04,0,.006,.12,.089),(1.16,0,.01,.13,.09),
                (1.34,0,.009,.188,.116),(1.47,0,0,.175,.109),(1.53,0,0,.088,.080)],
               ['navy','rubber','navy','navy','shadow'],
               lambda v: armor.blend(v.y,.98,1.19,'B_Pelvis','B_Spine1') if v.y<1.19
               else armor.blend(v.y,1.19,1.37,'B_Spine1','B_Spine2'))
    armor.loft([(.83,0,0,.070,.067),(.94,0,0,.137,.096),(1.014,0,0,.138,.102)],
               ['rubber','navy'],armor.fixed('B_Pelvis'))
    armor.loft([(1.465,0,0,.083,.074),(1.56,0,0,.086,.077)],
               ['shadow'],armor.fixed('B_Neck'))
    armor.plate([(-.102,1.405,.118),(0,1.435,.140),(.102,1.405,.118),
                 (.101,1.326,.12),(0,1.236,.122),(-.101,1.326,.12)],
                'rubber','shadow','B_Spine2',ridge=(0,1.34,.162))
    loop_emblem(0,1.34,.171,.054,'B_Spine2')
    for side,prefix in [(-1,'B_R_'),(1,'B_L_')]:
        armor.plate([(.102,1.487,.084),(.154,1.507,.072),(.235,1.479,.058),
                     (.209,1.434,.098),(.153,1.427,.118),(.112,1.451,.107)],
                    'silver','silver edge','B_Spine2',side=side,ridge=(.170,1.481,.136))
        armor.plate([(.059,1.009,.103),(.125,1.029,.085),(.148,.991,.085),
                     (.109,.948,.105),(.065,.965,.112)],'silver','silver edge','B_Pelvis',side=side)
        armor.plate([(.133,1.001,.105),(.184,.979,.086),(.197,.875,.073),
                     (.159,.866,.088),(.139,.89,.109)],'gold','gold edge','B_Pelvis',
                    side=side,ridge=(.167,.944,.121))
        loop_emblem(side*.783,1.454,.061,.033,prefix+'Hand')


def coat(*, fit=None, fabric="coat", edging="gold edge", lining="rift light", crest=None):
    # Each panel wraps from the back around the hip and points down toward the knee.
    bones=lambda v: armor.blend(v.y,.98,1.39,'B_Pelvis','B_Spine2')
    for side in (-1,1):
        rows=[
            ((0,1.477,-.106),(.104,1.48,-.10),(.172,1.451,-.06),(.193,1.423,.019)),
            ((0,1.02,-.154),(.130,1.015,-.148),(.164,1.015,-.05),(.145,1.02,.088)),
            ((.029,.738,-.223),(.181,.727,-.204),(.215,.72,-.073),(.187,.75,.096)),
            ((.064,.467,-.247),(.228,.562,-.249),(.272,.49,-.116),(.252,.394,.089))
        ]
        if fit is not None:
            rows = [[fit(x,y,z) for x,y,z in row] for row in rows]
        rows = [[armor.Vector((side*x,y,z)) for x,y,z in row] for row in rows]
        hem = [a.lerp(b,.85) for a,b in zip(rows[-2],rows[-1])]
        rows.insert(-1,hem)
        points = []
        for a,b,c,d in rows:
            points.extend((a,a.lerp(b,.13),b,c,d.lerp(c,.18),d))
        faces = []
        for row in range(len(rows)-1):
            for col in range(5):
                i=row*6+col
                face=[i,i+1,i+7,i+6]
                if row==len(rows)-2:
                    material=lining if col<2 else edging
                else:
                    material=edging if col==4 else lining if row>=2 and col==0 else fabric
                faces.append((face if side>0 else face[::-1],material))
        armor.surface(points,faces,bones)
    if crest is None:
        loop_emblem(0,1.323,-.144,.051,'B_Spine2')
    else:
        crest()


if __name__=='__main__':
    source,destination=map(Path,sys.argv[sys.argv.index('--')+1:])
    armor.MATERIALS.update({
        'rubber':('222031',.66,0),'navy':('312d40',.53,0),'blue':('3b354b',.51,0),
        'silver':('b7afc7',.41,0),'silver edge':('777085',.49,0),
        'shadow':('151420',.68,0),'hood':('2c293a',.73,0),'coat':('302d3e',.77,0),
        'gold':('d2a044',.42,0),'gold edge':('f0c063',.37,0),
        'rift light':('9fea24',.39,1.1),'rift core':('bcff52',.32,2.3),
        'circuit cyan':('859a44',.5,0)
    })
    torso()
    armor.limbs()
    hood()
    coat()
    armor.output(source,destination,name='Rift Warden',mesh_name='RiftWardenArmor',
                 double_sided=('coat','gold edge','rift light','rift core'))
