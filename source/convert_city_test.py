"""Convert the five uploaded FBXs to a private, instanced destructible city kit.

blender --factory-startup --disable-autoexec -b --python source/convert_city_test.py -- INPUT OUTPUT
Source FBXs and generated GLB/manifest belong outside public GitHub.
"""
import bpy
import bmesh
import json
import sys
from pathlib import Path
from mathutils import Vector, Matrix

src, out = map(Path, sys.argv[sys.argv.index('--') + 1:])
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
mat = bpy.data.materials.new('Temporary city palette — original textures missing')
mat.use_nodes = True
shader = mat.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .78
color_node = mat.node_tree.nodes.new('ShaderNodeVertexColor')
color_node.layer_name = 'Color'
mat.node_tree.links.new(color_node.outputs['Color'], shader.inputs['Base Color'])
missing = set()
manifest = {'version': 1, 'materials': 'temporary vertex colors; original UVs retained', 'assets': {}, 'missingTextures': []}
exports = []

def load(name):
    bpy.ops.import_scene.fbx(filepath=str(src / (name + '.fbx')))
    objects = [o for o in bpy.context.selected_objects if o.type == 'MESH']
    assert len(objects) == 1, name
    o = objects[0]
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix.Identity(4)
    for m in o.data.materials:
        if m.use_nodes:
            for node in m.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image and not node.image.size[0]:
                    missing.add(Path(node.image.filepath).name)
    o.data.materials.clear()
    o.data.materials.append(mat)
    for poly in o.data.polygons:
        poly.material_index = 0
        poly.use_smooth = False
    o.data.update()
    colors = o.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    for poly in o.data.polygons:
        # Readable fallback only. Do not pretend to have the missing atlases.
        n, p = poly.normal, poly.center
        color = (.22, .29, .34, 1)
        if n.z > .65:
            color = (.38, .43, .45, 1)
        elif name.startswith('Building') and n.y < -.65 and p.y > (-1.88 if name == 'Building_3' else -2.24):
            color = (.045, .095, .13, 1)
        elif name.startswith('Advertising') and abs(n.y) > .8:
            color = (.055, .68, .59, 1) if name != 'Advertising_6' else (.94, .30, .07, 1)
        for li in poly.loop_indices:
            colors.data[li].color = color
    return o

def bounds(mesh):
    return [Vector(tuple(fn(v.co[i] for v in mesh.vertices) for i in range(3))) for fn in (min, max)]

def export_piece(base, name, low, high, kind, floor):
    bm = bmesh.new(); bm.from_mesh(base.data)
    for axis in range(3):
        for value, sign in ((low[axis], -1), (high[axis], 1)):
            p = Vector((0, 0, 0)); p[axis] = value
            n = Vector((0, 0, 0)); n[axis] = sign
            result = bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces), dist=.00001,
                plane_co=p, plane_no=n, clear_outer=True, clear_inner=False)
            edges = [e for e in result['geom_cut'] if isinstance(e, bmesh.types.BMEdge) and e.is_boundary]
            if edges:
                bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    if not bm.faces:
        bm.free(); return None
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    mesh = bpy.data.meshes.new(name); bm.to_mesh(mesh); bm.free()
    a, b = bounds(mesh); center = (a+b)/2; size = b-a
    if min(size) < .001:
        bpy.data.meshes.remove(mesh); return None
    mesh.transform(Matrix.Translation(-center))
    mesh.materials.clear(); mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(obj)
    # GLB is Y-up: Blender x,y,z -> x,z,-y.
    exports.append(obj)
    return {'node':name, 'center':[center.x, center.z, -center.y], 'size':[size.x, size.z, size.y], 'type':kind, 'floor':floor}

for name, label, scale, levels in [('Building_3', 'tower', 2.5, 6), ('BuildingBlock_1', 'shop', 10/6, 2)]:
    base = load(name)
    a,b = bounds(base.data)
    base.data.transform(Matrix.Translation(Vector((-(a.x+b.x)/2, -b.y, -a.z))))
    base.data.transform(Matrix.Scale(scale, 4))
    # Back-to-back source modules make a real four-sided block without stretching.
    bm = bmesh.new(); bm.from_mesh(base.data)
    copy = base.data.copy(); copy.transform(Matrix.Rotation(3.141592653589793, 4, 'Z'))
    bm.from_mesh(copy); bm.to_mesh(base.data); bm.free(); bpy.data.meshes.remove(copy)
    # A pair of stacked storefront modules makes a small building.
    if label == 'shop':
        a,b = bounds(base.data); copy = base.data.copy(); copy.transform(Matrix.Translation((0,0,b.z)))
        bm = bmesh.new(); bm.from_mesh(base.data); bm.from_mesh(copy); bm.to_mesh(base.data); bm.free(); bpy.data.meshes.remove(copy)
    a,b = bounds(base.data); height = b.z
    pieces=[]; roof_thickness=.26
    for floor in range(levels):
        lo=floor*(height-roof_thickness)/levels; hi=(floor+1)*(height-roof_thickness)/levels
        for ix in range(2):
            for iy in range(2):
                low=Vector((a.x if ix==0 else 0, a.y if iy==0 else 0, lo))
                high=Vector((0 if ix==0 else b.x, 0 if iy==0 else b.y, hi))
                piece=export_piece(base,f'{label}_{floor}_{ix}_{iy}',low,high,'column',lo/3)
                if piece: pieces.append(piece)
    piece=export_piece(base,f'{label}_roof',Vector((a.x,a.y,height-roof_thickness)),b,'slab',(height-roof_thickness)/3)
    if piece: pieces.append(piece)
    manifest['assets'][label]={'source':name+'.fbx','height':height,'footprint':[b.x-a.x,b.y-a.y],'pieces':pieces}
    bpy.data.objects.remove(base, do_unlink=True)

for name in ['Advertising_5','Advertising_6','Advertising_7']:
    obj=load(name); a,b=bounds(obj.data)
    obj.data.transform(Matrix.Translation(Vector((-(a.x+b.x)/2, -(a.y+b.y)/2, -a.z))))
    obj.name=name; exports.append(obj)
    manifest['assets'][name]={'source':name+'.fbx','node':name}

manifest['missingTextures']=sorted(missing)
bpy.ops.object.select_all(action='DESELECT')
for o in exports: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'city-test.glb'), export_format='GLB', use_selection=True,
    export_animations=False, export_extras=False, export_yup=True)
(out/'city-test.json').write_text(json.dumps(manifest,indent=2))
print('CITY_TEST_EXPORT',len(exports),'nodes;',len(missing),'missing original textures')
