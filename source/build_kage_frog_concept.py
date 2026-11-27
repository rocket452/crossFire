"""Original Frog Ninja Kage built from the supplied concept sheet.

Replaces the weighted body of the licensed humanoid rig with new geometry (black suit,
grey armor, green frog hands and webbed feet, blue headband/scarf/cape, katana) while
keeping the rig's 53 joints and its 17 animation clips byte-for-byte. One extra cosmetic
bone, B_KageScarf, is added because the game drives scarf motion through it.

Run with Blender's bundled Python or the `bpy` module (it supplies `mathutils`):
  python -c "import bpy,sys,runpy; sys.argv=['x','--','humanoid.glb','kage-frog.glb']; \
             runpy.run_path('source/build_kage_frog_concept.py', run_name='__main__')"
"""
import json
import math
import struct
import sys
from pathlib import Path

try:
    import bpy  # noqa: F401  (loads mathutils when run through the bpy module)
except ImportError:
    pass
from mathutils import Matrix, Quaternion, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_volt_armor as V  # reuse the skinning/glTF helpers and the rig-safe writer

V.MATERIALS.clear()
V.MATERIALS.update({
    'suit black': ('15171f', .62, 0),
    'suit grey': ('2b2f3b', .56, 0),
    'visor black': ('0d0f16', .32, 0),
    'armor grey': ('9b9db1', .50, 0),
    'armor light': ('c6c8d8', .44, 0),
    'armor edge': ('63667b', .52, 0),
    'frog green': ('88d82b', .60, 0),
    'frog dark': ('58a21e', .64, 0),
    'scarf blue': ('2f82e0', .72, 0),
    'scarf dark': ('1c4f96', .74, 0),
    'ion cyan': ('3ee9ff', .30, 1.5),
    'eye white': ('f5fcff', .25, 2.6),
})
CLOTH = ('scarf blue', 'scarf dark')
geometry, surface, loft, plate, fixed, blend = V.geometry, V.surface, V.loft, V.plate, V.fixed, V.blend


def basis(axis):
    axis = Vector(axis).normalized()
    helper = Vector((0, 1, 0)) if abs(axis.y) < .9 else Vector((1, 0, 0))
    u = axis.cross(helper).normalized()
    return u, axis.cross(u).normalized()


def outward(points, faces, center):
    """Flip any face of a convex solid whose normal points toward its center."""
    center, fixed_faces = Vector(center), []
    for indices, mat in faces:
        pts = [Vector(points[i]) for i in indices]
        normal = (pts[1] - pts[0]).cross(pts[2] - pts[0])
        centroid = sum(pts, Vector()) / len(pts)
        fixed_faces.append((list(reversed(indices)) if normal.dot(centroid - center) < 0 else indices, mat))
    return fixed_faces


def tube(a, b, r0, r1, mat, weights, *, facets=8, caps=(True, True), stretch=(1, 1), mats=None):
    """Tapered prism from a to b; stretch scales the two cross-section axes."""
    a, b = Vector(a), Vector(b)
    u, w = basis(b - a)
    points, faces = [], []
    for center, radius in ((a, r0), (b, r1)):
        for j in range(facets):
            t = math.tau * (j + .5) / facets
            points.append(tuple(center + u * math.cos(t) * radius * stretch[0] + w * math.sin(t) * radius * stretch[1]))
    for j in range(facets):
        k = (j + 1) % facets
        faces.append(([j, k, k + facets, j + facets], mats[j % len(mats)] if mats else mat))
    if caps[0]:
        faces.append((list(reversed(range(facets))), mat))
    if caps[1]:
        faces.append((list(range(facets, 2 * facets)), mat))
    surface(points, outward(points, faces, (a + b) / 2), weights)


def block(center, size, mat, weights, *, axis=(0, 1, 0), roll=0):
    """Chunky armor block (box) with a given facing axis."""
    center, (sx, sy, sz) = Vector(center), size
    up = Vector(axis).normalized()
    side = up.cross(Vector((0, 0, 1)) if abs(up.z) < .9 else Vector((1, 0, 0))).normalized()
    front = side.cross(up).normalized()
    if roll:
        side, front = (side * math.cos(roll) + front * math.sin(roll), front * math.cos(roll) - side * math.sin(roll))
    corners = [tuple(center + side * x * sx / 2 + up * y * sy / 2 + front * z * sz / 2)
               for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    index = lambda x, y, z: ((x > 0) << 2) | ((y > 0) << 1) | (z > 0)
    quads = [((-1, -1, -1), (-1, 1, -1), (-1, 1, 1), (-1, -1, 1)), ((1, -1, 1), (1, 1, 1), (1, 1, -1), (1, -1, -1)),
             ((-1, -1, -1), (-1, -1, 1), (1, -1, 1), (1, -1, -1)), ((-1, 1, 1), (-1, 1, -1), (1, 1, -1), (1, 1, 1)),
             ((-1, -1, 1), (-1, 1, 1), (1, 1, 1), (1, -1, 1)), ((1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, -1))]
    surface(corners, outward(corners, [([index(*c) for c in q], mat) for q in quads], center), weights)


def ribbon(path, widths, across, mats, weights):
    """Two-sided cloth strip along a polyline; `across` is the unit width direction per point."""
    points, faces = [], []
    for p, w, d in zip(path, widths, across):
        d = Vector(d).normalized()
        points.append(tuple(Vector(p) - d * w / 2))
        points.append(tuple(Vector(p) + d * w / 2))
    for i in range(len(path) - 1):
        a = 2 * i
        faces.append(([a, a + 1, a + 3, a + 2], mats[i % len(mats)]))
    surface(points, faces, weights)


def scarf_weights(top, bottom, parent):
    """Blend from `parent` at `top` down to the animated scarf bone at `bottom`."""
    return lambda v: blend(v.y, bottom, top, 'B_KageScarf', parent)


def body():
    # Slim black undersuit torso, same joint layout as the shared rig.
    loft([(.91, 0, 0, .10, .074), (1.05, 0, .012, .125, .092), (1.17, 0, .016, .13, .102),
          (1.34, 0, .016, .185, .115), (1.45, 0, .005, .18, .10), (1.51, 0, -.004, .10, .08)],
         ['suit black', 'suit black', 'suit grey', 'suit black', 'suit black'],
         lambda v: blend(v.y, .98, 1.18, 'B_Pelvis', 'B_Spine1') if v.y < 1.18
         else blend(v.y, 1.19, 1.37, 'B_Spine1', 'B_Spine2'))
    loft([(.85, 0, -.006, .054, .058), (.93, 0, 0, .134, .095), (1.001, 0, .01, .137, .10),
          (1.052, 0, .01, .116, .086)], ['suit black', 'suit grey', 'suit black'], fixed('B_Pelvis'))
    loft([(1.46, 0, 0, .075, .072), (1.53, 0, .001, .097, .082), (1.584, 0, 0, .081, .074)],
         ['suit black', 'suit black'], fixed('B_Neck'))
    # Grey V-shaped chest plate with a cyan edge line.
    plate([(-.115, 1.40, .128), (-.085, 1.44, .124), (.085, 1.44, .124), (.115, 1.40, .128),
           (.078, 1.27, .118), (0, 1.215, .112), (-.078, 1.27, .118)],
          'armor grey', 'armor edge', 'B_Spine2', ridge=(0, 1.33, .175))
    plate([(.0, 1.372, .157), (.07, 1.40, .146), (.062, 1.386, .148), (.0, 1.352, .163),
           (-.062, 1.386, .148), (-.07, 1.40, .146)], 'ion cyan', 'armor edge', 'B_Spine2', depth=.01)
    for side in (-1, 1):
        plate([(.012, 1.25, .118), (.09, 1.30, .122), (.11, 1.255, .112), (.045, 1.205, .108)],
              'ion cyan', 'armor edge', 'B_Spine2', side=side, depth=.008)
    # Belt: two grey hip plates, a center buckle and a rear pouch.
    for side in (-1, 1):
        block((side * .115, 1.0, .058), (.12, .09, .07), 'armor grey', fixed('B_Pelvis'))
        block((side * .1, .98, -.075), (.12, .1, .06), 'armor edge', fixed('B_Pelvis'))
    block((0, 1.02, .088), (.1, .075, .045), 'armor light', fixed('B_Pelvis'))
    loft([(.985, 0, 0, .162, .115), (1.02, 0, 0, .166, .118), (1.07, 0, 0, .156, .112)],
         ['suit grey', 'armor edge'], fixed('B_Pelvis'))
    # Blue neck scarf, thick and slightly raised at the back.
    loft([(1.43, 0, -.005, .13, .105), (1.49, 0, -.008, .165, .13), (1.55, 0, -.01, .15, .12),
          (1.585, 0, -.012, .125, .105)], ['scarf blue', 'scarf blue', 'scarf dark'],
         lambda v: [('B_Neck', 1)] if v.z > -.02 else blend(v.y, 1.46, 1.54, 'B_Spine2', 'B_Neck'), facets=10)
    # Katana across the back (hilt over the right shoulder, sheath down to the left hip).
    hilt, tip = Vector((-.15, 1.60, -.205)), Vector((.205, .86, -.205))
    tube(hilt, hilt + (tip - hilt) * .13, .026, .026, 'suit black', fixed('B_Spine2'), facets=6)
    block(hilt + (tip - hilt) * .02, (.07, .016, .05), 'armor grey', fixed('B_Spine2'), axis=tip - hilt)
    tube(hilt + (tip - hilt) * .13, tip, .036, .028, 'suit grey', fixed('B_Spine2'), facets=6)
    for k in (.25, .36, .47):
        pos = hilt + (tip - hilt) * k
        block(pos + Vector((0, 0, -.034)), (.026, .026, .012), 'ion cyan', fixed('B_Spine2'), axis=tip - hilt)
    # Diagonal strap over the chest/back.
    ribbon([Vector((-.12, 1.46, -.12)), Vector((-.08, 1.38, -.16)), Vector((.0, 1.2, -.18)), Vector((.09, 1.06, -.17))],
           [.052, .052, .052, .052], [(0, 0, 1)] * 4, ('suit black',), fixed('B_Spine2'))
    # Cape tails on the back: weighted to the gameplay-driven scarf bone for flutter.
    for side in (-1, 1):
        path = [Vector((side * .09, 1.47, -.13)), Vector((side * .12, 1.30, -.215)),
                Vector((side * .15, 1.10, -.25)), Vector((side * .17, .86, -.26)), Vector((side * .19, .72, -.25))]
        ribbon(path, [.09, .115, .14, .16, .14], [(1, 0, 0)] * 5,
               ('scarf blue', 'scarf blue', 'scarf dark', 'scarf dark'), scarf_weights(1.47, .96, 'B_Spine2'))


def limbs():
    for side, prefix in ((1, 'B_L_'), (-1, 'B_R_')):
        joint = lambda s: fixed(prefix + s)
        # Legs: black suit with oversized grey shin/knee armor and cyan lightning strips.
        loft([(.49, .108, -.008, .07, .066), (.64, .10, -.005, .088, .072), (.86, .088, -.005, .098, .088),
              (.975, .083, 0, .088, .074)], ['suit black', 'suit black', 'suit grey'], joint('Thigh'), side=side)
        loft([(.112, .134, -.038, .112, .108), (.25, .131, -.015, .118, .108), (.41, .116, -.007, .10, .092),
              (.533, .108, -.007, .078, .074), (.585, .107, -.005, .066, .068)],
             ['suit black', 'suit black', 'suit grey', 'suit black'], joint('Calf'), side=side)
        block((side * .125, .535, .05), (.19, .15, .17), 'armor grey', joint('Calf'), axis=(0, 1, .1))
        block((side * .125, .35, .068), (.17, .15, .11), 'armor light', joint('Calf'), axis=(0, 1, .16))
        block((side * .125, .165, .02), (.20, .105, .19), 'armor grey', joint('Calf'))
        # Cyan lightning bolt on the outer shin.
        plate([(.20, .46, .0), (.245, .40, .0), (.224, .365, .0), (.255, .285, .0), (.185, .345, .0), (.205, .38, .0)],
              'ion cyan', 'armor edge', prefix + 'Calf', side=side, depth=.008)
        # Frog foot: green ankle sock, then three splayed toes with a dark pad.
        loft([(.0, .137, .03, .115, .16), (.05, .137, .035, .118, .15), (.095, .137, .03, .105, .12),
              (.165, .135, -.02, .09, .10)], ['frog green', 'frog dark', 'frog green'],
             lambda v: blend(v.z, .105, .165, prefix + 'Foot', prefix + 'Toe0'), side=side)
        for dx, yaw in ((-.058, -.28), (0, 0.0), (.058, .28)):
            base = Vector((side * (.137 + dx), .032, .115))
            tip = base + Vector((side * math.sin(yaw) * .16, -.012, math.cos(yaw) * .17))
            tube(base, tip, .033, .026, 'frog green', lambda v: blend(v.z, .13, .19, prefix + 'Foot', prefix + 'Toe0'),
                 facets=6, stretch=(1, .75))
            tube(tip, tip + (tip - base).normalized() * .035, .026, .020, 'frog dark', fixed(prefix + 'Toe0'),
                 facets=6, stretch=(1, .75))
        # Arms: black sleeves, chunky grey shoulder and forearm armor.
        loft([(.13, .012, 1.423, .08, .062), (.196, .013, 1.432, .086, .08), (.263, .012, 1.43, .074, .066),
              (.288, .013, 1.421, .06, .046)], ['suit black', 'suit black', 'suit grey'], joint('UpperArm'), axis='x', side=side)
        block((side * .20, 1.50, .005), (.17, .10, .17), 'armor light', joint('UpperArm'), axis=(side * .4, 1, 0))
        block((side * .22, 1.54, .005), (.12, .05, .13), 'armor grey', joint('UpperArm'), axis=(side * .4, 1, 0))
        loft([(.249, .013, 1.42, .048, .046), (.40, .013, 1.42, .05, .047), (.505, .012, 1.42, .043, .043)],
             ['suit black', 'suit grey'], lambda v: blend(abs(v.x), .455, .505, prefix + 'UpperArm', prefix + 'Forearm'),
             axis='x', side=side)
        loft([(.50, .012, 1.42, .05, .05), (.54, .013, 1.423, .072, .068), (.62, .013, 1.423, .078, .074),
              (.665, .013, 1.423, .07, .068), (.69, .013, 1.423, .06, .058)],
             ['armor edge', 'armor grey', 'armor light', 'armor grey'], joint('Forearm'), axis='x', side=side)
        # Wrist, palm and four frog fingers (thumb + three long fingers) on the rig's finger chains.
        loft([(.684, .013, 1.423, .062, .058), (.744, .013, 1.425, .05, .048), (.803, .014, 1.428, .066, .042),
              (.869, .014, 1.432, .072, .034)],
             ['suit grey', 'frog green', 'frog dark'],
             lambda v: blend(abs(v.x), .705, .755, prefix + 'Forearm', prefix + 'Hand'), axis='x', side=side)
        block((side * .80, 1.43, .014), (.07, .12, .092), 'frog dark', joint('Hand'), axis=(side, 0, 0))
        for digit, (start, end, depth) in enumerate([(.80, .915, .085), (.851, .985, .052), (.851, 1.0, .02),
                                                       (.851, .985, -.012)]):
            name = prefix + 'Finger' + str(digit)
            y = 1.425 if digit == 0 else 1.44
            loft([(start, depth, y, .019, .024), ((start + end) / 2, depth, y, .017, .021), (end, depth, y - .003, .013, .016)],
                 ['frog green', 'frog dark'],
                 lambda v, s=start, e=end, n=name: blend(abs(v.x), s + .015, e - .016, n, n + '2'), axis='x', side=side, facets=6)


def helmet():
    head = 'B_Head'
    # Skull: black chin/mask below, green cap above, with a layered crest.
    loft([(1.511, 0, -.005, .067, .063), (1.543, 0, -.008, .118, .084), (1.61, 0, -.016, .156, .106),
          (1.681, 0, -.029, .17, .128), (1.748, 0, -.026, .16, .118), (1.804, 0, -.032, .11, .098),
          (1.846, 0, -.033, .062, .068)],
         ['suit black', 'visor black', 'visor black', 'frog green', 'frog green', 'frog dark'], fixed(head), facets=12)
    # Face: dark visor wrap with two slanted white glowing eyes and a masked lower face.
    plate([(-.108, 1.652, .092), (0, 1.672, .139), (.108, 1.652, .092), (.106, 1.585, .097),
           (.055, 1.55, .124), (0, 1.545, .13), (-.055, 1.55, .124), (-.106, 1.585, .097)],
          'visor black', 'armor edge', head, ridge=(0, 1.60, .15))
    for side in (-1, 1):
        plate([(.012, 1.628, .150), (.108, 1.664, .116), (.112, 1.648, .112), (.064, 1.606, .146), (.014, 1.604, .156)],
              'eye white', 'visor black', head, side=side, depth=.01)
    plate([(-.075, 1.567, .112), (-.034, 1.551, .134), (0, 1.56, .144), (.034, 1.551, .134),
           (.075, 1.567, .112), (.062, 1.528, .094), (0, 1.51, .105), (-.062, 1.528, .094)],
          'suit black', 'visor black', head, ridge=(0, 1.536, .156))
    # Crest: cyan center stripe flanked by grey ridges running front to back.
    plate([(-.026, 1.868, .02), (.026, 1.868, .02), (.036, 1.835, .06), (.028, 1.742, .118), (0, 1.69, .15),
           (-.028, 1.742, .118), (-.036, 1.835, .06)], 'ion cyan', 'armor edge', head, ridge=(0, 1.78, .13))
    for side in (-1, 1):
        plate([(.045, 1.855, .018), (.092, 1.845, .012), (.152, 1.77, .03), (.16, 1.70, .08), (.12, 1.69, .14),
               (.088, 1.742, .122), (.055, 1.82, .06)], 'armor grey', 'armor edge', head, side=side, depth=.016,
              ridge=(.11, 1.76, .12))
        plate([(.12, 1.84, -.04), (.17, 1.79, -.02), (.18, 1.70, .01), (.15, 1.66, .02), (.13, 1.74, -.01)],
              'frog dark', 'armor edge', head, side=side, depth=.012)
        # Cyan ear disc.
        tube((side * .165, 1.665, -.02), (side * .19, 1.665, -.02), .038, .038, 'armor edge', fixed(head), facets=10)
        tube((side * .19, 1.665, -.02), (side * .198, 1.665, -.02), .025, .025, 'ion cyan', fixed(head), facets=10)
    # Blue headband around the brow, knot at the rear left and two streaming tails.
    loft([(1.668, 0, -.02, .165, .136), (1.69, 0, -.022, .171, .139), (1.712, 0, -.022, .166, .134)],
         ['scarf blue', 'scarf dark'], fixed(head), facets=14)
    block((-.05, 1.70, -.19), (.09, .075, .07), 'scarf dark', fixed(head))
    tail_weights = lambda v: blend(v.y + (v.z * 0.5), 1.48, 1.72, 'B_KageScarf', head)
    for ends, width in (([(-.07, 1.68, -.26), (-.11, 1.60, -.36), (-.15, 1.50, -.43)], .105),
                        ([(-.03, 1.66, -.26), (-.02, 1.55, -.34), (.01, 1.43, -.39)], .11)):
        path = [Vector((-.05, 1.70, -.2)), *[Vector(e) for e in ends]]
        ribbon(path, [.06, width, width * 1.15, width * .7], [(1, 0, .2)] * 4, CLOTH, tail_weights)


def with_scarf_bone(rig):
    """Return rig bytes with the extra B_KageScarf joint appended to the skin."""
    reference = rig.read_bytes()
    size = struct.unpack_from('<I', reference, 12)[0]
    gltf = json.loads(reference[20:20 + size])
    binary = bytearray(reference[28 + size:])
    nodes, skin = gltf['nodes'], gltf['skins'][0]
    names = {nodes[n]['name']: i for i, n in enumerate(skin['joints'])}

    def world(index):
        node = nodes[index]
        matrix = Matrix.LocRotScale(Vector(node.get('translation', (0, 0, 0))),
                                    Quaternion((node['rotation'][3], *node['rotation'][:3])) if 'rotation' in node else Quaternion(),
                                    Vector((1, 1, 1)))
        parent = next((i for i, n in enumerate(nodes) if index in n.get('children', [])), None)
        return world(parent) @ matrix if parent is not None else matrix

    spine = skin['joints'][names['B_Spine2']]
    bind = Matrix.Translation(Vector((0, 1.49, -.100)))
    loc, rot, _ = (world(spine).inverted() @ bind).decompose()
    nodes[spine].setdefault('children', []).append(len(nodes))
    skin['joints'].append(len(nodes))
    nodes.append({'name': 'B_KageScarf', 'translation': list(loc), 'rotation': [rot.x, rot.y, rot.z, rot.w]})
    inverse = gltf['accessors'][skin['inverseBindMatrices']]
    view = gltf['bufferViews'][inverse['bufferView']]
    offset = view.get('byteOffset', 0) + inverse.get('byteOffset', 0)
    matrices = list(struct.unpack_from('<' + 'f' * (inverse['count'] * 16), binary, offset))
    inv = bind.inverted()
    matrices.extend(inv[r][c] for c in range(4) for r in range(4))
    binary.extend(b'\0' * (-len(binary) % 4))
    start = len(binary)
    binary.extend(struct.pack('<' + 'f' * len(matrices), *matrices))
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': start, 'byteLength': len(matrices) * 4})
    gltf['accessors'].append({'bufferView': len(gltf['bufferViews']) - 1, 'componentType': 5126,
                              'count': len(matrices) // 16, 'type': 'MAT4'})
    skin['inverseBindMatrices'] = len(gltf['accessors']) - 1
    binary.extend(b'\0' * (-len(binary) % 4))
    gltf['buffers'][0]['byteLength'] = len(binary)
    data = json.dumps(gltf, separators=(',', ':')).encode()
    data += b' ' * (-len(data) % 4)
    return (struct.pack('<4sII', b'glTF', 2, 28 + len(data) + len(binary)) + struct.pack('<I4s', len(data), b'JSON') +
            data + struct.pack('<I4s', len(binary), b'BIN\0') + binary)


if __name__ == '__main__':
    source, destination = map(Path, sys.argv[sys.argv.index('--') + 1:][:2])
    temporary = destination.with_suffix('.rig.tmp')
    temporary.write_bytes(with_scarf_bone(source))
    body()
    limbs()
    helmet()
    V.output(temporary, destination, name='Kage Frog Ninja', mesh_name='KageFrogNinja', double_sided=CLOTH)
    temporary.unlink()
