"""Build Violet Defender's reference armor and cape on the shared animation rig."""
import math
import sys
from pathlib import Path

import build_volt_armor as armor


def torso():
    armor.loft([
        (.87,0,-.006,.10,.077),(.99,0,.005,.126,.091),(1.12,0,.006,.13,.09),
        (1.33,0,.012,.188,.116),(1.46,0,0,.178,.101),(1.54,0,-.006,.09,.077)
    ], ['rubber','navy','navy','rubber','shadow'],
        lambda v: armor.blend(v.y,.99,1.19,'B_Pelvis','B_Spine1') if v.y<1.19
        else armor.blend(v.y,1.19,1.37,'B_Spine1','B_Spine2'))
    armor.loft([
        (.85,0,0,.075,.065),(.93,0,0,.142,.094),(.996,0,.008,.141,.10),
        (1.026,0,.008,.13,.092)
    ], ['navy','rubber','silver'],armor.fixed('B_Pelvis'))
    armor.loft([(1.46,0,0,.077,.07),(1.57,0,0,.072,.066)],
               ['rubber'],armor.fixed('B_Neck'))
    armor.plate([
        (-.111,1.383,.119),(-.059,1.437,.114),(0,1.411,.14),(.059,1.437,.114),
        (.111,1.383,.119),(.085,1.30,.112),(0,1.238,.104),(-.085,1.30,.112)
    ], 'blue','shadow','B_Spine2',ridge=(0,1.345,.168))
    armor.plate([
        (-.084,1.387,.139),(-.027,1.363,.165),(0,1.338,.169),
        (.027,1.363,.165),(.084,1.387,.139),(.056,1.334,.150),
        (.022,1.311,.158),(0,1.278,.143),(-.022,1.311,.158),(-.056,1.334,.150)
    ], 'charged lens','light blue','B_Spine2',depth=.005)
    armor.plate([
        (-.064,1.012,.106),(.064,1.012,.106),(.052,.956,.103),
        (0,.929,.103),(-.052,.956,.103)
    ],'silver','silver edge','B_Pelvis',ridge=(0,.978,.128))
    for side in (-1,1):
        armor.plate([(.102,1.475,.076),(.152,1.505,.075),(.222,1.475,.043),
                     (.209,1.433,.092),(.131,1.437,.122)],
                    'silver','silver edge','B_Spine2',side=side,ridge=(.165,1.48,.137))
        armor.plate([(.098,1.46,.116),(.117,1.48,.102),(.148,1.466,.109),(.137,1.44,.126)],
                    'light blue','blue','B_Spine2',side=side,depth=.005)
        armor.plate([(.099,1.005,.092),(.139,1.004,.077),(.169,.877,.077),
                     (.177,.820,.060),(.118,.854,.092)],
                    'blue','silver edge','B_Pelvis',side=side,ridge=(.137,.904,.122))


def helmet():
    head='B_Head'
    armor.loft([
        (1.505,0,-.01,.062,.068),(1.535,0,-.006,.109,.088),(1.598,0,-.014,.147,.115),
        (1.675,0,-.025,.174,.137),(1.744,0,-.036,.176,.138),(1.811,0,-.038,.136,.113),
        (1.849,0,-.042,.082,.072)
    ],['shadow','navy','rubber','navy','navy','silver edge'],armor.fixed(head),facets=12)
    armor.plate([
        (-.128,1.632,.079),(-.061,1.604,.132),(0,1.622,.141),
        (.061,1.604,.132),(.128,1.632,.079),(.089,1.555,.088),(0,1.51,.111),(-.089,1.555,.088)
    ],'rubber','shadow',head,ridge=(0,1.578,.152))
    armor.plate([
        (-.055,1.858,-.055),(.055,1.858,-.055),(.044,1.849,.018),
        (.032,1.767,.103),(0,1.671,.154),(-.032,1.767,.103),(-.044,1.849,.018)
    ],'light blue','blue',head,ridge=(0,1.791,.098))
    for side in (-1,1):
        armor.plate([(.006,1.656,.153),(.071,1.699,.126),(.154,1.751,.041),
                     (.16,1.704,.046),(.126,1.667,.091),(.035,1.626,.148)],
                    'silver','silver edge',head,side=side,ridge=(.083,1.675,.141))
        armor.plate([(.025,1.624,.151),(.107,1.655,.120),(.092,1.623,.132),
                     (.062,1.607,.144),(.035,1.606,.152)],
                    'charged lens','circuit cyan',head,side=side,depth=.006)
        armor.loft([(.145,-.022,1.669,.068,.075),(.173,-.024,1.669,.074,.078),
                    (.192,-.024,1.669,.057,.06),(.195,-.024,1.669,.046,.047)],
                   ['silver edge','silver','blue'],armor.fixed(head),side=side,axis='x')
        pts=[]
        faces=[]
        for i in range(16):
            a=math.tau*i/16
            for radius in (.040,.05):
                pts.append((side*.196,1.669+math.cos(a)*radius,-.024+math.sin(a)*radius))
            j=i*2;k=(j+2)%32
            face=[j,j+1,k+1,k]
            faces.append((face if side>0 else face[::-1],'circuit cyan'))
        armor.surface(pts,faces,armor.fixed(head))


def cape():
    # Draped panels taper toward the shoulders with a beveled, scalloped hem.
    rows=[(1.481,.16,-.103),(1.32,.215,-.145),(1.03,.28,-.193),
          (.72,.368,-.252),(.427,.443,-.288)]
    columns=[-1,-.90,-.54,0,.54,.90,1]
    points=[]
    for row,(y,width,z) in enumerate(rows):
        for col in columns:
            hem=.07*math.cos(col*math.pi*2) if row==len(rows)-1 else 0
            points.append((col*width,y+hem,z+.055*abs(col)-.019*math.cos(col*math.pi*3)))
    faces=[]
    for r in range(len(rows)-1):
        for j in range(len(columns)-1):
            a=r*len(columns)+j;b=a+len(columns)
            mat='cape trim' if j in (0,len(columns)-2) else 'cape'
            faces.append(([a,a+1,b+1,b],mat))
    def weights(v):
        return armor.blend(v.y,.77,1.32,'B_Pelvis','B_Spine2')
    armor.surface(points,faces,weights)
    # Bound hem and embroidered rear crest conform to the skinned cape panels.
    trim=[]
    for j in range(len(columns)):
        p=armor.Vector(points[-len(columns)+j]);q=armor.Vector(points[-2*len(columns)+j])
        trim.extend([tuple(p+armor.Vector((0,0,-.004))),tuple(p.lerp(q,.10)+armor.Vector((0,0,-.005)))])
    armor.surface(trim,[([2*j,2*j+1,2*j+3,2*j+2],'cape trim') for j in range(len(columns)-1)],weights)
    crest=[(-.105,1.177,-.180),(-.035,1.126,-.191),(0,1.091,-.204),
           (.035,1.126,-.191),(.105,1.177,-.180),(.079,1.097,-.191),
           (.034,1.055,-.208),(0,.988,-.218),(-.034,1.055,-.208),(-.079,1.097,-.191)]
    armor.surface(crest,[(list(range(len(crest))),'cape trim')],weights)


if __name__=='__main__':
    source,destination=map(Path,sys.argv[sys.argv.index('--')+1:])
    armor.MATERIALS.update({
        'rubber':('262438',.62,0),'navy':('37334e',.5,0),'blue':('6631a0',.36,0),
        'light blue':('a85ee8',.36,0),'silver':('c8bbdc',.38,0),'silver edge':('837598',.48,0),
        'shadow':('171626',.63,0),'circuit cyan':('ca7cff',.36,1.5),
        'charged lens':('f8dcff',.3,2.3),'cape':('58258e',.75,0),'cape trim':('bd6ff0',.57,.35),
    })
    torso()
    armor.limbs()
    helmet()
    cape()
    armor.output(source,destination,name='Violet Defender',mesh_name='VioletDefenderArmor',
                 double_sided=('cape','cape trim'))
