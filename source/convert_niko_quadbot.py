"""Convert the user-supplied low-poly quadruped robot (by niko) into the private runtime GLB.

Run with Blender 4.x, auto-execution disabled:
  blender --factory-startup --disable-autoexec -b /private/low_poly_robot_by_niko.blend \
    --python source/convert_niko_quadbot.py -- /private/runtime [--ratio 0.06]

The source has ten meshes skinned to a 54-bone armature (body root, four three-segment legs that each end
in a four-finger claw, leg pistons, an upright bone per foot and a top bone), no materials and no usable
animation (two empty Mixamo actions). The converter keeps the rig and weights, decimates each mesh with
weight-preserving edge collapse to a game budget, names each part for runtime materials, normalises the
leg span to 1 unit and exports a skinned GLB without animation, plus a small JSON manifest. The game
animates the actual bones procedurally. Output stays in private storage / the ignored licensed-robots folder.
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out_dir = args[0] if args else '.'
ratio = float(args[args.index('--ratio') + 1]) if '--ratio' in args else 0.06
os.makedirs(out_dir, exist_ok=True)

arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm]
for o in list(bpy.data.objects):
    if o not in meshes and o is not arm:
        bpy.data.objects.remove(o)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
arm.animation_data_clear()
arm.data.pose_position = 'REST'

# Part names by role (from inspection): the large shells, the core, the top fittings and the sensor cylinders.
ROLES = {'Cube.025': 'shell', 'Cube.026': 'frame', 'Cube.027': 'cap', 'Cube.029': 'core', 'Cube.030': 'joints',
         'Cube.033': 'cap', 'Cube.041': 'plates', 'Cylinder': 'sensor', 'Cylinder.012': 'sensor_housing',
         'Cylinder.013': 'lens', 'Sphere': 'limbs'}
source_tris = 0
for o in meshes:
    bpy.context.view_layer.objects.active = o
    source_tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
    # Apply shape modifiers (bevel) before decimating; keep the armature modifier.
    for m in list(o.modifiers):
        if m.type != 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=m.name)
    dec = o.modifiers.new('decimate', 'DECIMATE')
    dec.decimate_type = 'COLLAPSE'
    dec.ratio = ratio if len(o.data.polygons) > 600 else max(ratio * 2.5, .35)
    dec.use_collapse_triangulate = True
    bpy.ops.object.modifier_move_to_index(modifier='decimate', index=0)
    bpy.ops.object.modifier_apply(modifier='decimate')
    o.name = 'niko_' + ROLES.get(o.name, o.name.lower().replace('.', '_'))
    mat = bpy.data.materials.new(o.name)
    o.data.materials.clear()
    o.data.materials.append(mat)

# Normalise: leg span 1 unit, feet resting on the ground plane, body centred.
dg = bpy.context.evaluated_depsgraph_get()
lo = Vector((1e9,) * 3); hi = -lo
for o in meshes:
    e = o.evaluated_get(dg)
    for v in e.to_mesh().vertices:
        w = o.matrix_world @ v.co
        lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    e.to_mesh_clear()
span = max(hi.x - lo.x, hi.y - lo.y)
scale = 1 / span
arm.location = arm.location - Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
arm.scale = (scale,) * 3
arm.location = arm.location * scale
bpy.context.view_layer.update()

final_tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
glb = os.path.join(out_dir, 'niko-quadbot.glb')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=False, export_apply=False,
                          export_animations=False, export_skins=True, export_morph=False, export_yup=True,
                          export_materials='EXPORT', export_extras=False)
bones = {b.name: {'parent': b.parent.name if b.parent else None, 'length': b.length * scale} for b in arm.data.bones}
with open(os.path.join(out_dir, 'niko-quadbot.json'), 'w') as f:
    json.dump({'source': 'low_poly_robot_3d_model_by_niko.blend (user-supplied)', 'sourceTriangles': source_tris,
               'triangles': final_tris, 'ratio': ratio, 'bones': len(bones), 'span': 1, 'height': (hi.z - lo.z) * scale,
               'parts': [o.name for o in meshes], 'skeleton': bones}, f, indent=1)
print('NIKO_QUADBOT', json.dumps({'sourceTriangles': source_tris, 'triangles': final_tris, 'height': (hi.z - lo.z) * scale, 'bytes': os.path.getsize(glb)}))
