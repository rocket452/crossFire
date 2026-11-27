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


def side_plate(profile, x, mat, edge, bone, side, depth=.01):
    """Thin plate in the YZ plane on the outside of a limb; profile is (z, y) pairs."""
    n = len(profile)
    points = [(side * x, y, z) for z, y in profile] + [(side * (x - depth), y, z) for z, y in profile]
    faces = [(list(range(n)), mat), (list(range(n, 2 * n)), edge)]
    faces += [([i, (i + 1) % n, (i + 1) % n + n, i + n], edge) for i in range(n)]
    center = Vector((side * (x + .2), 0, 0))
    oriented = []
    for indices, m in faces[:1]:
        normal = (Vector(points[indices[1]]) - Vector(points[indices[0]])).cross(Vector(points[indices[2]]) - Vector(points[indices[0]]))
        oriented.append((indices if normal.x * side > 0 else list(reversed(indices)), m))
    first_flipped = oriented[0][0] != faces[0][0]
    back = faces[1][0] if first_flipped else list(reversed(faces[1][0]))
    oriented.append((back, edge))
    for indices, m in faces[2:]:
        oriented.append((list(reversed(indices)) if first_flipped else indices, m))
    surface(points, oriented, fixed(bone))


def scaled(build, pivot, factor):
    """Run `build`, then scale every vertex it added about `pivot` (normals are unchanged by uniform scale)."""
    before = {k: len(v) for k, v in geometry.items()}
    build()
    pivot = Vector(pivot)
    for key, items in geometry.items():
        for i in range(before.get(key, 0), len(items)):
            point, normal, skin = items[i]
            items[i] = (tuple(pivot + (Vector(point) - pivot) * factor), normal, skin)


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
    hilt, tip = Vector((-.27, 1.80, -.2)), Vector((.21, .90, -.2))
    tube(hilt, hilt + (tip - hilt) * .16, .024, .024, 'suit black', fixed('B_Spine2'), facets=6)
    block(hilt, (.04, .03, .04), 'armor grey', fixed('B_Spine2'), axis=tip - hilt)
    block(hilt + (tip - hilt) * .16, (.075, .016, .06), 'armor grey', fixed('B_Spine2'), axis=tip - hilt)
    tube(hilt + (tip - hilt) * .165, tip, .032, .026, 'suit grey', fixed('B_Spine2'), facets=6)
    for k in (.3, .4, .5, .6):
        pos = hilt + (tip - hilt) * k
        block(pos + Vector((0, 0, -.034)), (.026, .026, .012), 'ion cyan', fixed('B_Spine2'), axis=tip - hilt)
    # Diagonal strap over the chest/back.
    ribbon([Vector((-.12, 1.46, -.12)), Vector((-.08, 1.38, -.16)), Vector((.0, 1.2, -.18)), Vector((.09, 1.06, -.17))],
           [.052, .052, .052, .052], [(0, 0, 1)] * 4, ('suit black',), fixed('B_Spine2'))
    # Cape tails on the back: weighted to the gameplay-driven scarf bone for flutter.
    for side in (-1, 1):
        path = [Vector((side * .11, 1.47, -.12)), Vector((side * .16, 1.30, -.19)),
                Vector((side * .21, 1.08, -.22)), Vector((side * .25, .86, -.22)), Vector((side * .28, .66, -.2))]
        ribbon(path, [.10, .12, .13, .14, .10], [(1, 0, .35 * side)] * 5,
               ('scarf blue', 'scarf blue', 'scarf dark', 'scarf dark'), scarf_weights(1.47, .96, 'B_Spine2'))


def limbs():
    for side, prefix in ((1, 'B_L_'), (-1, 'B_R_')):
        joint = lambda s: fixed(prefix + s)
        # Legs: slim black thighs, then oversized armored boots like the concept sheet.
        loft([(.49, .108, -.008, .07, .066), (.64, .10, -.005, .085, .072), (.86, .088, -.005, .095, .086),
              (.975, .083, 0, .088, .074)], ['suit black', 'suit black', 'suit grey'], joint('Thigh'), side=side)
        loft([(.085, .136, -.01, .135, .15), (.17, .136, -.006, .142, .152), (.30, .132, 0, .136, .14),
              (.42, .124, 0, .118, .12), (.50, .115, -.004, .09, .092), (.585, .107, -.005, .066, .068)],
             ['suit grey', 'suit black', 'suit black', 'suit black', 'suit black'], joint('Calf'), side=side, facets=10)
        block((side * .13, .55, .065), (.175, .12, .13), 'armor light', joint('Calf'), axis=(0, 1, .25))
        block((side * .132, .335, .115), (.19, .2, .07), 'armor light', joint('Calf'), axis=(0, 1, .12))
        block((side * .132, .335, .085), (.23, .24, .05), 'armor grey', joint('Calf'), axis=(0, 1, .12))
        block((side * .24, .30, -.01), (.06, .22, .2), 'armor grey', joint('Calf'))
        block((side * .136, .12, .02), (.25, .06, .25), 'armor grey', joint('Calf'))
        side_plate([(-.06, .40), (.0, .31), (-.03, .30), (.04, .19), (-.06, .29), (-.025, .30)],
                   .275, 'ion cyan', 'armor edge', prefix + 'Calf', side)
        # Frog foot: green pad, then three long splayed toes with rounded tips.
        loft([(.0, .137, .04, .12, .15), (.045, .137, .05, .12, .15), (.085, .137, .055, .11, .12),
              (.14, .135, .03, .09, .09)], ['frog green', 'frog green', 'frog dark'],
             lambda v: blend(v.z, .105, .165, prefix + 'Foot', prefix + 'Toe0'), side=side)
        for dx, yaw in ((-.07, -.38), (0, 0.0), (.07, .38)):
            base = Vector((side * (.137 + dx * .6), .03, .12))
            tip = base + Vector((side * math.sin(yaw) * .2, -.01, math.cos(yaw) * .2))
            tube(base, tip, .036, .028, 'frog green', lambda v: blend(v.z, .13, .2, prefix + 'Foot', prefix + 'Toe0'),
                 facets=6, stretch=(1, .7))
            tube(tip, tip + (tip - base).normalized() * .045, .04, .03, 'frog green', fixed(prefix + 'Toe0'),
                 facets=6, stretch=(1, .7))
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
    scaled(head_parts, (0, 1.53, 0), 1.32)


def head_parts():
    head = 'B_Head'
    # Layers from the sheet, bottom to top: black chin mask, green cheek band, black visor,
    # thin blue headband, then a green dome with grey ridges and a cyan center crest.
    loft([(1.511, 0, -.005, .067, .063), (1.535, 0, -.002, .10, .086), (1.572, 0, -.006, .138, .112),
          (1.606, 0, -.012, .158, .125), (1.652, 0, -.02, .168, .132), (1.70, 0, -.025, .172, .134),
          (1.75, 0, -.027, .166, .127), (1.80, 0, -.03, .142, .112), (1.845, 0, -.032, .095, .08),
          (1.868, 0, -.033, .04, .04)],
         ['suit black', 'suit black', 'frog green', 'visor black', 'visor black', 'frog green', 'frog green',
          'suit grey', 'suit grey'], fixed(head), facets=16)
    # Pointed ninja mask over the lower face.
    plate([(-.07, 1.592, .118), (0, 1.60, .135), (.07, 1.592, .118), (.05, 1.56, .112), (0, 1.522, .11),
           (-.05, 1.56, .112)], 'suit black', 'visor black', head, ridge=(0, 1.565, .155))
    for side in (-1, 1):
        plate([(.07, 1.60, .118), (.15, 1.615, .075), (.15, 1.578, .07), (.1, 1.565, .1), (.05, 1.57, .114)],
              'frog green', 'frog dark', head, side=side, depth=.01)
    # Large slanted glowing eyes on the visor band.
    for side in (-1, 1):
        plate([(.018, 1.648, .138), (.118, 1.688, .106), (.128, 1.668, .102), (.085, 1.632, .128), (.022, 1.628, .142)],
              'eye white', 'visor black', head, side=side, depth=.01)
    # Brow guard above the eyes.
    plate([(-.15, 1.705, .085), (0, 1.69, .135), (.15, 1.705, .085), (.15, 1.716, .084), (0, 1.704, .136),
           (-.15, 1.716, .084)], 'suit grey', 'visor black', head, depth=.012)
    # Crest: cyan center stripe between dark grey ridges, converging toward the brow.
    plate([(-.022, 1.872, .0), (.022, 1.872, .0), (.03, 1.84, .05), (.022, 1.778, .10), (0, 1.74, .118),
           (-.022, 1.778, .10), (-.03, 1.84, .05)], 'ion cyan', 'armor edge', head, ridge=(0, 1.80, .118))
    for side in (-1, 1):
        plate([(.034, 1.868, .0), (.07, 1.858, -.004), (.118, 1.80, .04), (.135, 1.735, .085), (.09, 1.73, .115),
               (.06, 1.78, .10), (.04, 1.84, .05)], 'suit grey', 'visor black', head, side=side, depth=.016,
              ridge=(.085, 1.79, .102))
        plate([(.12, 1.84, -.06), (.158, 1.80, -.045), (.172, 1.745, -.02), (.15, 1.74, -.005), (.13, 1.79, -.03)],
              'suit grey', 'visor black', head, side=side, depth=.012)
        # Cyan ear disc.
        tube((side * .165, 1.66, -.02), (side * .19, 1.66, -.02), .042, .042, 'suit grey', fixed(head), facets=12)
        tube((side * .19, 1.66, -.02), (side * .197, 1.66, -.02), .03, .03, 'ion cyan', fixed(head), facets=12)
        tube((side * .195, 1.66, -.02), (side * .2, 1.66, -.02), .018, .018, 'suit grey', fixed(head), facets=12)
    # Thin blue headband at the brow, knot at the back left and two tails streaming to his left.
    loft([(1.70, 0, -.025, .177, .139), (1.722, 0, -.026, .176, .138)], ['scarf blue'], fixed(head), facets=16)
    block((.06, 1.712, -.165), (.08, .06, .06), 'scarf dark', fixed(head))
    tail_weights = lambda v: blend(v.y + v.z * .5 - v.x * .3, 1.38, 1.62, 'B_KageScarf', head)
    for ends, width in (([(.12, 1.72, -.2), (.22, 1.70, -.25), (.32, 1.66, -.3)], .07),
                        ([(.11, 1.69, -.2), (.19, 1.61, -.25), (.27, 1.55, -.29)], .075)):
        path = [Vector((.06, 1.712, -.17)), *[Vector(e) for e in ends]]
        ribbon(path, [.05, width, width * 1.2, width * .5], [(0, 1, .3)] * 4, CLOTH, tail_weights)


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
