# Blender (headless) step of the FORGE mecha low-poly conversion: planar-decimates the skinned mesh of a
# FORGE mecha GLB and exports the decimated mesh with its skin weights only (no animation). The skeleton,
# inverse bind matrices, animations, materials and textures of the final file are taken from the original
# by transplant_mesh.py, so they stay identical.
#
#   blender -b -P source/forge-mecha/decimate_mecha.py -- original.glb decimated-mesh.glb [angle_degrees] [target_ratio]
#
# Pass 1 is a planar dissolve (default 5 degrees) so flat armour panels and hard edges survive. The FORGE meshes
# are curved retopology, so planar alone only removes a few percent; pass 2 is an edge-collapse decimate down to
# target_ratio (default 0.45) of the original triangle count. Each bone's part is a separate island, so
# neither pass can join faces of two bones.
#
# FORGE rigs are rigid: every vertex follows exactly one bone. Seam-split vertices are welded only within the
# part of a single bone, and the edges where two bones' parts touch are marked as seams, so planar dissolve
# never merges faces across a joint. UV islands, material borders and sharp edges are kept (delimit).
import bpy, bmesh, math, sys

argv = sys.argv[sys.argv.index('--') + 1:]
src, dst = argv[0], argv[1]
angle = float(argv[2]) if len(argv) > 2 else 5.0
target_ratio = float(argv[3]) if len(argv) > 3 else 0.45

bpy.ops.wm.read_factory_settings(use_empty=True)
# BLENDER bone heuristic: bone axes follow the glTF nodes, so the armature round-trips without re-orientation.
bpy.ops.import_scene.gltf(filepath=src, bone_heuristic='BLENDER', merge_vertices=False)
# The importer also creates a display-only bone shape mesh; the character is the mesh with an Armature modifier.
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
assert len(meshes) == 1, 'expected one skinned mesh, found %d' % len(meshes)
obj = meshes[0]
groups = {g.index: g.name for g in obj.vertex_groups}
before = sum(len(p.vertices) - 2 for p in obj.data.polygons)

def dominant_bone(v):
    best = max(v.groups, key=lambda g: g.weight, default=None)
    return best.group if best else -1

owner = [dominant_bone(v) for v in obj.data.vertices]
bpy.context.view_layer.objects.active = obj
bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
# Weld UV/normal seam splits within each bone's part only.
by_bone = {}
for v in bm.verts:
    by_bone.setdefault(owner[v.index], []).append(v)
for verts in by_bone.values():
    bmesh.ops.remove_doubles(bm, verts=verts, dist=1e-5)
bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table()
bm.to_mesh(obj.data); bm.free(); obj.data.update()
owner = [dominant_bone(v) for v in obj.data.vertices]
# A face spanning two bones would stretch; mark every edge joining two bones' vertices as a seam.
cross = 0
for e in obj.data.edges:
    a, b = e.vertices
    if owner[a] != owner[b]:
        e.use_seam = True; cross += 1

dec = obj.modifiers.new('Planar decimate', 'DECIMATE')
dec.decimate_type = 'DISSOLVE'
dec.angle_limit = math.radians(angle)
dec.delimit = {'MATERIAL', 'SEAM', 'SHARP', 'UV'}
# The decimate must run before the armature deformation.
while obj.modifiers[0] != dec:
    bpy.ops.object.modifier_move_up(modifier=dec.name)
bpy.ops.object.modifier_apply(modifier=dec.name)
planar = sum(len(p.vertices) - 2 for p in obj.data.polygons)
if planar > before * target_ratio:
    col = obj.modifiers.new('Collapse decimate', 'DECIMATE')
    col.decimate_type = 'COLLAPSE'
    col.ratio = before * target_ratio / planar
    col.use_collapse_triangulate = True
    while obj.modifiers[0] != col:
        bpy.ops.object.modifier_move_up(modifier=col.name)
    bpy.ops.object.modifier_apply(modifier=col.name)

# The faceted look comes from flatShading on the game's materials, so the file keeps shared vertices
# (smooth normals, split only at UV seams and sharp edges) instead of three unique vertices per triangle.
if obj.data.has_custom_normals:
    bpy.ops.mesh.customdata_custom_splitnormals_clear()
for p in obj.data.polygons:
    p.use_smooth = True
after = sum(len(p.vertices) - 2 for p in obj.data.polygons)
# glTF needs triangles (and tangent export needs tris/quads): triangulate the dissolved n-gons.
bm = bmesh.new(); bm.from_mesh(obj.data)
bmesh.ops.triangulate(bm, faces=bm.faces, quad_method='BEAUTY', ngon_method='BEAUTY')
bm.to_mesh(obj.data); bm.free(); obj.data.update()

for o in bpy.context.scene.objects:
    o.select_set(o == obj or o.type == 'ARMATURE')
options = dict(filepath=dst, export_format='GLB', use_selection=True, export_animations=False, export_skins=True,
               export_morph=False, export_apply=False, export_texcoords=True, export_normals=True,
               export_tangents=True, export_materials='EXPORT', export_yup=True)
try:
    bpy.ops.export_scene.gltf(export_image_format='NONE', **options)
except TypeError:
    bpy.ops.export_scene.gltf(**options)
print('DECIMATE_RESULT', {'angle': angle, 'target_ratio': target_ratio, 'triangles_before_blender': before, 'after_planar': planar, 'triangles_after_blender': after,
                          'ratio': round(after / before, 4), 'cross_bone_seams': cross, 'bones': len(groups)})
