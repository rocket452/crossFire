"""Original Kage kunai and shuriken, modelled from scratch (no supplied geometry).

Run with Blender or the bpy module:
  blender -b --factory-startup --python source/build_kage_weapons.py -- dist/city-assets
  python source/build_kage_weapons.py -- dist/city-assets      (with `pip install bpy`)

Outputs kage-kunai.glb/json and kage-shuriken.glb/json. They keep the runtime
contract of the earlier uploaded weapons: the kunai is 0.85m long, points along
glTF +Z and has its grip centred near z=-0.20; the shuriken is 1.2m across in the
glTF XY plane and spins about +Z. Blender -Y exports as glTF +Z.
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Matrix, Vector

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'dist/city-assets'
os.makedirs(out, exist_ok=True)


def reset():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes):
        bpy.data.meshes.remove(m)


def material(name, color, metallic, roughness):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return m


def obj_from_bmesh(name, bm, mat):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    return o


def loft(bm, rings):
    """Connect consecutive vertex rings (equal length lists of Vectors) into quads."""
    verts = [[bm.verts.new(p) for p in ring] for ring in rings]
    n = len(rings[0])
    for a, b in zip(verts, verts[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    return verts


def cap(bm, ring, reverse=False):
    bm.faces.new(list(reversed(ring)) if reverse else ring)


def tri_count(objects):
    total = 0
    for o in objects:
        o.data.calc_loop_triangles()
        total += len(o.data.loop_triangles)
    return total


def export(objects, name, extra_key, metadata):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj[extra_key] = json.dumps(metadata)
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, name + '.glb'), export_format='GLB', use_selection=True,
                              export_animations=False, export_yup=True, export_extras=True,
                              export_cameras=False, export_lights=False)
    with open(os.path.join(out, name + '.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
    print('CROSSFIRE_WEAPON', name, json.dumps(metadata))


def recenter(objects, length_axis, target):
    pts = [o.matrix_world @ v.co for o in objects for v in o.data.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    scale = target / max((hi - lo)[i] for i in length_axis)
    t = Matrix.Scale(scale, 4) @ Matrix.Translation(-(lo + hi) / 2)
    for o in objects:
        o.data.transform(t)
        o.data.update()


# ---------------------------------------------------------------- kunai
def build_kunai():
    reset()
    steel = material('Kunai steel', (.62, .68, .70), .85, .28)
    edge = material('Kunai edge', (.86, .90, .91), .9, .18)
    wrap = material('Kunai wrap', (.33, .05, .07), .0, .82)
    parts = []

    # Blade: diamond cross-section, leaf profile, tip toward Blender -Y.
    bm = bmesh.new()
    stations = [(.075, .040), (.04, .052), (-.02, .066), (-.10, .074), (-.18, .068), (-.26, .052), (-.33, .032), (-.385, .013)]
    rings = []
    for y, half in stations:
        thick = max(.005, half * .2)
        rings.append([Vector((half, y, 0)), Vector((0, y, thick)), Vector((-half, y, 0)), Vector((0, y, -thick))])
    verts = loft(bm, rings)
    cap(bm, verts[0], reverse=True)
    tip = bm.verts.new(Vector((0, -.425, 0)))
    last = verts[-1]
    for i in range(4):
        bm.faces.new((last[i], last[(i + 1) % 4], tip))
    parts.append(obj_from_bmesh('Kunai blade', bm, edge))

    # Central fuller ridge: a slim darker spine on both faces.
    bm = bmesh.new()
    for side in (1, -1):
        rings = []
        for y, half in stations[:-2]:
            z = max(.005, half * .2) * side
            rings.append([Vector((.006, y, z * .7)), Vector((0, y, z * 1.08)), Vector((-.006, y, z * .7))])
        vs = [[bm.verts.new(p) for p in ring] for ring in rings]
        for a, b in zip(vs, vs[1:]):
            f1 = (a[0], a[1], b[1], b[0]); f2 = (a[1], a[2], b[2], b[1])
            bm.faces.new(f1 if side > 0 else tuple(reversed(f1)))
            bm.faces.new(f2 if side > 0 else tuple(reversed(f2)))
    parts.append(obj_from_bmesh('Kunai fuller', bm, steel))

    # Collar between blade and grip.
    bm = bmesh.new()
    seg = 12
    ring = lambda y, r: [Vector((math.cos(a) * r, y, math.sin(a) * r)) for a in (i * 2 * math.pi / seg for i in range(seg))]
    vs = loft(bm, [ring(.072, .030), ring(.082, .036), ring(.096, .036), ring(.104, .029)])
    cap(bm, vs[0]); cap(bm, vs[-1], reverse=True)
    parts.append(obj_from_bmesh('Kunai collar', bm, steel))

    # Wrapped grip: alternating bulges read as cord bands.
    bm = bmesh.new()
    rings = []
    y = .104
    for band in range(9):
        rings.append(ring(y, .026)); rings.append(ring(y + .011, .031))
        y += .022
    rings.append(ring(.305, .026))
    vs = loft(bm, rings)
    cap(bm, vs[0]); cap(bm, vs[-1], reverse=True)
    parts.append(obj_from_bmesh('Kunai grip', bm, wrap))

    # Pommel ring in the blade plane (axis along X).
    bm = bmesh.new()
    major, minor, center = .047, .0115, Vector((0, .3655, 0))
    U, V = 20, 8
    grid = []
    for i in range(U):
        u = i * 2 * math.pi / U
        row = []
        for j in range(V):
            v = j * 2 * math.pi / V
            r = major + minor * math.cos(v)
            row.append(bm.verts.new(center + Vector((minor * math.sin(v), r * math.cos(u), r * math.sin(u)))))
        grid.append(row)
    for i in range(U):
        for j in range(V):
            a, b = grid[i][j], grid[(i + 1) % U][j]
            c, d = grid[(i + 1) % U][(j + 1) % V], grid[i][(j + 1) % V]
            bm.faces.new((a, b, c, d))
    parts.append(obj_from_bmesh('Kunai ring', bm, steel))

    recenter(parts, (1,), .85)
    triangles = tri_count(parts)
    names = [{'name': o.name, 'triangles': len(o.data.loop_triangles)} for o in parts]
    export(parts, 'kage-kunai', 'crossfire_kunai', {
        'source': 'original (source/build_kage_weapons.py)', 'triangles': triangles, 'parts': names,
        'materials': ['Kunai edge', 'Kunai steel', 'Kunai wrap'], 'length': .85, 'forward': '+Z', 'gripOffsetZ': -.20})


# ---------------------------------------------------------------- shuriken
def build_shuriken():
    reset()
    steel = material('Shuriken steel', (.70, .75, .77), .9, .25)
    bm = bmesh.new()
    # Star outline in Blender XZ (normal along Y); four hooked blades.
    outline = []
    for k in range(4):
        t = k * math.pi / 2
        for da, r in ((-45, .15), (-30, .22), (-14, .36), (2, .60), (10, .40), (24, .25)):
            a = t + math.radians(da)
            outline.append((math.cos(a) * r, math.sin(a) * r))
    hole = [(math.cos(a) * .07, math.sin(a) * .07) for a in (math.radians(-45) + i * 2 * math.pi / 16 for i in range(16))]
    half_hub, half_edge = .015, .003
    def ring_verts(pts, y):
        return [bm.verts.new(Vector((x, y, z))) for x, z in pts]
    out_f, out_b = ring_verts(outline, -half_edge), ring_verts(outline, half_edge)
    hole_f, hole_b = ring_verts(hole, -half_hub), ring_verts(hole, half_hub)
    # Bridge each face from hub hole to outer edge, then close the rim and the hole wall.
    def bridge(inner, outer, flip):
        ni, no = len(inner), len(outer)
        i = o = 0
        while i < ni or o < no:
            ai, ao = inner[i % ni], outer[o % no]
            if (i * no <= o * ni and i < ni) or o >= no:
                f = (ai, inner[(i + 1) % ni], ao); i += 1
            else:
                f = (ai, outer[(o + 1) % no], ao); o += 1
            bm.faces.new(tuple(reversed(f)) if flip else f)
    bridge(hole_f, out_f, False)
    bridge(hole_b, out_b, True)
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((out_f[i], out_f[j], out_b[j], out_b[i]))
    m = len(hole)
    for i in range(m):
        j = (i + 1) % m
        bm.faces.new((hole_f[j], hole_f[i], hole_b[i], hole_b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    star = obj_from_bmesh('Kage shuriken', bm, steel)

    # Raised hub ring on both faces.
    bm = bmesh.new()
    U, V = 20, 6
    for side in (1, -1):
        grid = []
        for i in range(U):
            u = i * 2 * math.pi / U
            row = []
            for j in range(V):
                v = j * 2 * math.pi / V
                r = .10 + .014 * math.cos(v)
                row.append(bm.verts.new(Vector((r * math.cos(u), side * .011 + .007 * math.sin(v), r * math.sin(u)))))
            grid.append(row)
        for i in range(U):
            for j in range(V):
                a, b = grid[i][j], grid[(i + 1) % U][j]
                c, d = grid[(i + 1) % U][(j + 1) % V], grid[i][(j + 1) % V]
                bm.faces.new((a, b, c, d))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    hub = obj_from_bmesh('Kage shuriken hub', bm, steel)

    parts = [star, hub]
    recenter(parts, (0, 2), 1.2)
    triangles = tri_count(parts)
    vertices = sum(len(o.data.vertices) for o in parts)
    export(parts, 'kage-shuriken', 'crossfire_shuriken', {
        'source': 'original (source/build_kage_weapons.py)', 'triangles': triangles, 'vertices': vertices,
        'diameter': 1.2, 'plane': 'XY', 'spinAxis': '+Z', 'blades': 4})


build_kunai()
build_shuriken()
