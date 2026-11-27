"""Cyber Ninja: an original low-poly Kage model built from the Zero Hour Heroes model sheet.

Replaces the weighted body of the licensed humanoid rig with new geometry (dark armor with
light-grey plates, red crest, scarf and glow strips, cyan eyes, oversized helmet and flared
boots) while keeping the rig's 53 joints and its 17 animation clips unchanged. One extra
cosmetic bone, B_KageScarf, is added because the game drives scarf motion through it.

Run with Blender's bundled Python or the `bpy` module (it supplies `mathutils`):
  python -c "import bpy,sys,runpy; sys.argv=['x','--','humanoid.glb','kage-cyber.glb']; \
             runpy.run_path('source/build_kage_cyber.py', run_name='__main__')"
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
    'armor dark': ('2a2c3c', .48, 0),
    'armor mid': ('5d5f75', .48, 0),
    'armor light': ('c5c4d8', .42, 0),
    'joint black': ('17181f', .6, 0),
    'scarf red': ('c8182f', .7, 0),
    'scarf shade': ('8e1022', .74, 0),
    'crest red': ('dd1f35', .4, 0),
    'glow red': ('ff3b4a', .3, 2.2),
    'eye cyan': ('3fe6ff', .25, 1.6),
})
CLOTH = ('scarf red', 'scarf shade')
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
    spine = lambda v: blend(v.y, .98, 1.18, 'B_Pelvis', 'B_Spine1') if v.y < 1.18 else blend(v.y, 1.19, 1.37, 'B_Spine1', 'B_Spine2')
    # Slim dark torso with a narrow waist (the sheet's compact chest and hips).
    loft([(.90, 0, 0, .105, .078), (1.02, 0, .01, .118, .088), (1.14, 0, .012, .102, .08),
          (1.26, 0, .014, .148, .1), (1.38, 0, .012, .172, .108), (1.47, 0, .004, .15, .094), (1.52, 0, -.004, .09, .072)],
         ['armor dark'] * 6, spine, facets=8)
    loft([(.84, 0, -.006, .06, .06), (.92, 0, 0, .128, .092), (1.0, 0, .01, .13, .095)],
         ['armor dark', 'armor dark'], fixed('B_Pelvis'), facets=8)
    loft([(1.48, 0, 0, .06, .06), (1.56, 0, 0, .065, .062)], ['joint black'], fixed('B_Neck'), facets=6)
    # Light-grey hexagonal chest plate and belt buckle.
    hexagon = lambda cx, cy, z, rx, ry: [(cx + rx * math.cos(a), cy + ry * math.sin(a), z) for a in
                                         (math.radians(d) for d in (0, 60, 120, 180, 240, 300))]
    plate(hexagon(0, 1.30, .122, .078, .085), 'armor light', 'armor mid', 'B_Spine2', depth=.02, ridge=(0, 1.30, .14))
    plate(hexagon(0, .985, .108, .06, .052), 'armor light', 'armor mid', 'B_Pelvis', depth=.02, ridge=(0, .985, .122))
    loft([(.95, 0, .004, .136, .1), (1.02, 0, .006, .14, .102)], ['armor mid'], fixed('B_Pelvis'), facets=8)
    plate(hexagon(0, 1.135, .1, .052, .048), 'armor light', 'armor mid', 'B_Spine1', depth=.02, ridge=(0, 1.135, .112))
    # Red glowing emblem on the back.
    block((0, 1.30, -.112), (.045, .08, .014), 'glow red', fixed('B_Spine2'))
    # Red scarf: thick collar with a V at the front.
    loft([(1.44, 0, 0, .14, .115), (1.50, 0, -.004, .16, .128), (1.56, 0, -.008, .13, .108)],
         ['scarf red', 'scarf shade'], lambda v: blend(v.y, 1.45, 1.53, 'B_Spine2', 'B_Neck'), facets=10)
    plate([(-.12, 1.47, .1), (0, 1.40, .14), (.12, 1.47, .1), (.1, 1.51, .11), (0, 1.47, .148), (-.1, 1.51, .11)],
          'scarf red', 'scarf shade', 'B_Spine2', depth=.02)
    # Two long scarf tails behind the shoulders, splaying outward (animated by B_KageScarf).
    for side in (-1, 1):
        # Tails hang from the collar down the sides, visible from front and back like the model sheet.
        path = [Vector((side * .13, 1.47, -.02)), Vector((side * .2, 1.33, -.05)), Vector((side * .25, 1.15, -.06)),
                Vector((side * .29, .97, -.05)), Vector((side * .31, .84, -.04))]
        ribbon(path, [.1, .13, .14, .12, .02], [(1, -.25 * side, .15 * side)] * 5, CLOTH, scarf_weights(1.48, 1.0, 'B_Spine2'))
    # Short katana on the back, hilt over the right shoulder.
    hilt, tip = Vector((-.2, 1.66, -.16)), Vector((.16, 1.0, -.16))
    tube(hilt, hilt + (tip - hilt) * .2, .022, .022, 'joint black', fixed('B_Spine2'), facets=6)
    block(hilt + (tip - hilt) * .2, (.06, .014, .05), 'armor mid', fixed('B_Spine2'), axis=tip - hilt)
    tube(hilt + (tip - hilt) * .21, tip, .028, .024, 'armor dark', fixed('B_Spine2'), facets=6)


def limbs():
    for side, prefix in ((1, 'B_L_'), (-1, 'B_R_')):
        joint = lambda s: fixed(prefix + s)
        # Thin dark thighs.
        loft([(.56, .106, -.006, .066, .064), (.72, .098, -.004, .075, .07), (.86, .09, -.004, .084, .078),
              (.975, .084, 0, .08, .07)], ['armor dark', 'armor dark', 'armor dark'], joint('Thigh'), side=side, facets=8)
        # Flared boots: light-grey cuff below the knee, dark lower boot, light toe cap.
        loft([(.08, .14, .015, .175, .19), (.20, .139, .008, .165, .178), (.32, .135, 0, .148, .156), (.36, .133, 0, .142, .148),
              (.48, .126, 0, .122, .124), (.58, .118, -.004, .1, .1), (.645, .11, -.006, .078, .078)],
             ['armor dark', 'armor dark', 'armor mid', 'armor light', 'armor light', 'armor light'], joint('Calf'),
             side=side, facets=8)
        side_plate([(-.055, .35), (-.02, .35), (.045, .13), (.01, .13)], .31, 'glow red', 'armor dark', prefix + 'Calf', side)
        # Foot: light-grey sloped toe cap and a dark sole.
        loft([(.0, .14, .075, .165, .21), (.06, .14, .09, .165, .205), (.12, .14, .06, .145, .16)],
             ['armor light', 'armor light'], lambda v: blend(v.z, .1, .22, prefix + 'Foot', prefix + 'Toe0'), side=side, facets=8)
        block((side * .14, .012, .07), (.28, .024, .36), 'armor dark', lambda v: blend(v.z, .1, .22, prefix + 'Foot', prefix + 'Toe0'))
        # Arms: dark round shoulder, thin upper arm, large light-grey forearm bracer, dark hand.
        tube((side * .165, 1.43, 0), (side * .25, 1.43, 0), .078, .078, 'armor dark', joint('UpperArm'), facets=10)
        loft([(.24, .01, 1.425, .045, .045), (.42, .01, 1.422, .045, .044), (.50, .01, 1.42, .042, .042)],
             ['armor dark', 'armor dark'], lambda v: blend(abs(v.x), .45, .50, prefix + 'UpperArm', prefix + 'Forearm'),
             axis='x', side=side, facets=6)
        loft([(.50, .012, 1.42, .058, .056), (.54, .012, 1.422, .084, .08), (.69, .012, 1.424, .088, .084),
              (.72, .012, 1.424, .064, .062)], ['armor light', 'armor light', 'armor mid'], joint('Forearm'), axis='x', side=side, facets=8)
        loft([(.70, .012, 1.424, .05, .045), (.76, .013, 1.426, .055, .042)], ['joint black'],
             lambda v: blend(abs(v.x), .705, .755, prefix + 'Forearm', prefix + 'Hand'), axis='x', side=side, facets=6)
        block((side * .80, 1.43, .012), (.075, .11, .095), 'armor dark', joint('Hand'), axis=(side, 0, 0))
        for digit, (start, end, depth) in enumerate([(.79, .875, .075), (.845, .945, .04), (.845, .955, .012), (.845, .945, -.016)]):
            name = prefix + 'Finger' + str(digit)
            y = 1.425 if digit == 0 else 1.435
            loft([(start, depth, y, .016, .02), (end, depth, y - .003, .013, .016)], ['armor dark'],
                 lambda v, s=start, e=end, n=name: blend(abs(v.x), s + .015, e - .016, n, n + '2'), axis='x', side=side, facets=6)


def helmet():
    scaled(head_parts, (0, 1.53, 0), 1.26)


def head_parts():
    head = 'B_Head'
    # Rounded dark helmet.
    loft([(1.52, 0, -.004, .07, .066), (1.55, 0, -.004, .11, .09), (1.60, 0, -.01, .145, .118), (1.66, 0, -.018, .16, .132),
          (1.72, 0, -.022, .158, .13), (1.78, 0, -.026, .14, .116), (1.83, 0, -.03, .1, .086), (1.858, 0, -.032, .045, .045)],
         ['armor dark'] * 7, fixed(head), facets=12)
    # Light-grey side/cheek guards.
    for side in (-1, 1):
        side_plate([(-.07, 1.76), (.06, 1.76), (.10, 1.70), (.08, 1.58), (-.02, 1.57), (-.09, 1.64)], .158, 'armor light',
                   'armor mid', head, side, depth=.03)
        # Red ear disc with a glowing ring.
        tube((side * .17, 1.66, -.02), (side * .19, 1.66, -.02), .048, .048, 'armor dark', fixed(head), facets=10)
        tube((side * .19, 1.66, -.02), (side * .196, 1.66, -.02), .036, .036, 'glow red', fixed(head), facets=10)
        tube((side * .195, 1.66, -.02), (side * .2, 1.66, -.02), .022, .022, 'armor dark', fixed(head), facets=10)
        # Slanted cyan eye.
        plate([(.016, 1.66, .136), (.1, 1.69, .112), (.106, 1.672, .108), (.07, 1.646, .124), (.02, 1.642, .14)],
              'eye cyan', 'joint black', head, side=side, depth=.01)
        # Red cheek slit on the mask.
        plate([(.07, 1.622, .142), (.088, 1.62, .136), (.084, 1.58, .13), (.066, 1.584, .136)], 'glow red', 'armor dark',
              head, side=side, depth=.008)
    # Faceplate: mask covering nose, mouth and chin, pointed at the bottom.
    plate([(-.11, 1.638, .112), (0, 1.63, .142), (.11, 1.638, .112), (.1, 1.585, .105), (0, 1.535, .12), (-.1, 1.585, .105)],
          'armor dark', 'joint black', head, depth=.02, ridge=(0, 1.59, .155))
    # Brow ridge above the eyes.
    plate([(-.13, 1.71, .1), (0, 1.69, .138), (.13, 1.71, .1), (.13, 1.722, .1), (0, 1.704, .14), (-.13, 1.722, .1)],
          'armor mid', 'joint black', head, depth=.014)
    # Red crest: stripe over the top narrowing to a point between the eyes.
    plate([(-.035, 1.862, -.02), (.035, 1.862, -.02), (.045, 1.83, .06), (.035, 1.77, .108), (0, 1.70, .14),
           (-.035, 1.77, .108), (-.045, 1.83, .06)], 'crest red', 'scarf shade', head, depth=.016, ridge=(0, 1.80, .125))
    loft([(1.75, 0, -.12, .04, .02), (1.83, 0, -.08, .04, .02)], ['crest red'], fixed(head), facets=4)


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
    V.output(temporary, destination, name='Kage Cyber Ninja', mesh_name='KageCyberNinja', double_sided=CLOTH)
    temporary.unlink()
