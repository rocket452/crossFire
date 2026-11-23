"""Fit the authored Kage FBX to the already licensed Crossfire animation rig."""
import bpy
import json
import math
import struct
import sys
from pathlib import Path
from mathutils import Matrix, Quaternion, Vector

args = sys.argv[sys.argv.index('--') + 1:]
source, rig, output = map(Path, args[:3])
# Frog Ninja derives its body from the original armored bind mesh.
frog_base = args[3:] == ['--frog-base']
reference = rig.read_bytes()
json_size = struct.unpack_from('<I', reference, 12)[0]
gltf = json.loads(reference[20:20 + json_size])
binary = bytearray(reference[28 + json_size:])
nodes = gltf['nodes']
skin = gltf['skins'][0]
names = {nodes[node]['name']: joint for joint, node in enumerate(skin['joints'])}


def accessor(values, kind, columns, type_name, target=None):
    """Append tightly packed data to the existing animation and bind buffers."""
    binary.extend(b'\0' * (-len(binary) % 4))
    start = len(binary)
    data = struct.pack('<' + kind * len(values), *values)
    binary.extend(data)
    view = {'buffer': 0, 'byteOffset': start, 'byteLength': len(data)}
    if target:
        view['target'] = target
    gltf['bufferViews'].append(view)
    desc = {
        'bufferView': len(gltf['bufferViews']) - 1,
        'componentType': {'f': 5126, 'H': 5123}[kind],
        'count': len(values) // columns, 'type': type_name,
    }
    if target == 34962 and type_name == 'VEC3':
        desc.update(min=[min(values[i::3]) for i in range(3)],
                    max=[max(values[i::3]) for i in range(3)])
    gltf['accessors'].append(desc)
    return len(gltf['accessors']) - 1


def world(index):
    node = nodes[index]
    matrix = Matrix.LocRotScale(Vector(node.get('translation', (0, 0, 0))),
        Quaternion((node['rotation'][3], *node['rotation'][:3])) if 'rotation' in node else Quaternion(),
        Vector((1, 1, 1)))
    parent = next((i for i, n in enumerate(nodes) if index in n.get('children', [])), None)
    return world(parent) @ matrix if parent is not None else matrix


# One extra cosmetic bone preserves Kage's gameplay-driven scarf motion.
spine_node = skin['joints'][names['B_Spine2']]
scarf_bind = Matrix.Translation(Vector((0, 1.49, -.100)))
local = world(spine_node).inverted() @ scarf_bind
loc, rot, _ = local.decompose()
nodes[spine_node]['children'].append(len(nodes))
names['B_KageScarf'] = len(skin['joints'])
skin['joints'].append(len(nodes))
nodes.append({'name':'B_KageScarf', 'translation':list(loc), 'rotation':[rot.x, rot.y, rot.z, rot.w]})
inverse = gltf['accessors'][skin['inverseBindMatrices']]
view = gltf['bufferViews'][inverse['bufferView']]
offset = view.get('byteOffset', 0) + inverse.get('byteOffset', 0)
matrices = list(struct.unpack_from('<' + 'f' * (inverse['count'] * 16), binary, offset))
m = scarf_bind.inverted()
matrices.extend(m[r][c] for c in range(4) for r in range(4))
skin['inverseBindMatrices'] = accessor(matrices, 'f', 16, 'MAT4')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(source))
obj, = [o for o in bpy.context.scene.objects if o.type == 'MESH']
mesh = obj.data
points = [obj.matrix_world @ v.co for v in mesh.vertices]
mesh.calc_loop_triangles()
assert len(mesh.loop_triangles) == 2624, 'Expected the authored Kage armor FBX'

# The source is one mesh made of closed armor shells. Mark complete mechanical
# plates as rigid pieces and reserve blended weights for the undersuit and joints.
adjacent = [[] for p in points]
for edge in mesh.edges:
    a, b = edge.vertices
    adjacent[a].append(b)
    adjacent[b].append(a)
remaining = set(range(len(points)))
shells = []
while remaining:
    start = min(remaining)
    remaining.remove(start)
    shell = [start]
    for v in shell:
        for neighbor in adjacent[v]:
            if neighbor in remaining:
                remaining.remove(neighbor)
                shell.append(neighbor)
    shells.append(shell)
expected = [40,32,17,13] + [24,48,40,13,15,12]*2 + [32,24,24,40,24,24,18,18,18,18,24]*2
expected += [16,32,16,15,15,96] + [32,12,12,10,10,11,13,8]*2 + [17,15,6] + [8]*10
assert [len(shell) for shell in shells] == expected, 'Source shell ordering differs from Kage armor FBX'

BODY_Y = [(0,0),(.155,.1186),(.710,.5404),(.916,.9624),(1.04,1.088),
          (1.291,1.4209),(1.405,1.550),(1.80,1.86)]
ARM_X = [(.113,.118),(.232,.2323),(.377,.4863),(.574,.7399),
         (.684,.8636),(.791,.970)]


def interpolate(value, knots):
    for (a, start), (b, end) in zip(knots, knots[1:]):
        if value <= b or b == knots[-1][0]:
            return start + (end-start)*(value-a)/(b-a)


def blend(value, low, high, first, second):
    t = min(1, max(0, (value-low)/(high-low)))
    t = t*t*(3-2*t)
    return [(first, 1-t), (second, t)]


def fit(index, point):
    # +Y forward in the authoring FBX, +Z forward in the game.
    x, y, z = point
    side = 'L' if x < 0 else 'R'
    sign = 1 if x < 0 else -1
    bone = lambda name: 'B_' + side + '_' + name
    height = interpolate(z, BODY_Y)
    p = Vector((-x*.91, height, y*.90))
    weights = [('B_Spine2', 1)]
    if index == 0:
        weights = (blend(height, .99, 1.16, 'B_Pelvis', 'B_Spine1') if height < 1.16 else
                   blend(height, 1.18, 1.38, 'B_Spine1', 'B_Spine2'))
    elif index in (1, 3):
        weights = [('B_Pelvis', 1)]
    elif 4 <= index < 16:
        part = (index-4) % 6
        # Keep the ankle, knee and hip centered on the existing foot plant and gait joints.
        if part == 0:
            original = interpolate(z, [(.677,.150),(.797,.114),(.927,.085)])
            fitted = interpolate(height, [(.5404,.1083),(.9624,.0833)])
            width = .79
            p.z -= .014
            weights = [('B_'+side+'_Thigh', 1)]
        elif part in (2, 3):
            original, fitted, width = .232,.137,.59
            p.z -= .054
            weights = blend(y, .154,.226,bone('Foot'),bone('Toe0'))
        else:
            original = interpolate(z, [(.083,.232),(.315,.207),(.497,.175),(.625,.155),(.710,.145)])
            fitted = interpolate(height, [(.06,.137),(.1186,.1334),(.5404,.1083)])
            width = .63
            p.z -= interpolate(height,[(.06,.052),(.5404,.005)])
            weights = blend(height,.105,.19,bone('Foot'),bone('Calf')) if part==1 else [(bone('Calf'), 1)]
        p.x = sign*(fitted+(abs(x)-original)*width)
    elif 16 <= index < 38:
        part = (index-16)%11
        p = Vector((sign*interpolate(abs(x),ARM_X),1.4209+(z-1.291)*.91,y+.0126))
        if part == 0:
            weights = blend(abs(x),.134,.225,bone('Clavicle'),bone('UpperArm'))
        elif part == 1:
            weights = blend(abs(x),.335,.394,bone('UpperArm'),bone('Forearm'))
        elif part in (2,3):
            weights = [(bone('Forearm'),1)]
        elif part == 4:
            weights = blend(abs(x),.552,.610,bone('Forearm'),bone('Hand'))
        elif part == 5:
            weights = [(bone('Hand'),1)]
        elif part >= 6:
            digit = (part-5)%5
            if digit == 0:
                p.x = sign*interpolate(abs(x),[(.60,.805),(.64,.853),(.687,.918)])
                p.y += .040
            else:
                p.y += .020
            root, mid, tip = (bone('Finger'+str(digit)+k) for k in ('','1','2'))
            distance = abs(p.x)
            if distance < (.834 if digit==0 else .867):
                weights = blend(distance, .80 if digit==0 else .840, .834 if digit==0 else .867,bone('Hand'),root)
            elif distance < (.887 if digit==0 else .927):
                weights = blend(distance, .848 if digit==0 else .878, .887 if digit==0 else .927,root,mid)
            else:
                weights = blend(distance, .887 if digit==0 else .927, .916 if digit==0 else .960,mid,tip)
    elif index in (38, 39, 40):
        weights = blend(z,1.31,1.41,'B_Spine2','B_Neck')
    elif index in (41, 42):
        # Narrow the tails slightly for swing clearance against the animated elbows.
        p.x *= .86
        p.z -= .040
        weights = blend(z,1.21,1.35,'B_KageScarf','B_Spine2')
    elif 43 <= index < 63:
        weights = [('B_Head',1)]
        p.y = interpolate(z,[(1.386,1.537),(1.80,1.86)])
        p.x *= 1.04
        p.z -= .006
    elif index >= 63:
        weights = [('B_Spine2',1)]
        p.z -= .022
    if not frog_base:
        # Fit the outer shells to the reference silhouette in bind space.
        if index <= 3 or index >= 63:
            p.x = -x * 1.20
            p.z *= 1.13
        elif 4 <= index < 16:
            # Add width around each joint's center without shifting the knee off the rig.
            p.x = sign*(fitted+(abs(x)-original)*width*1.14)
            p.z *= 1.14
        elif 16 <= index < 38:
            if (index-16) % 11 in (2,3):
                p.y = 1.421 + (p.y-1.421)*1.34
                p.z = .0126 + (p.z-.0126)*1.22
        elif index <= 40:
            p.x = -x * 1.28
            p.z *= 1.12
        elif index <= 42:
            p.x = -x * 1.19
            p.y -= .075 * min(1,max(0,(1.35-z)/.55))
        else:
            # Keep the brow, mask, cheek vents and eyes fitted as one helmet.
            p.x = -x * 1.19
            p.y = 1.531 + (z-1.386)*1.12
            p.z *= 1.14
    weights = [(names[key], weight) for key, weight in weights if weight > 0]
    weights += [(0,0)]*(4-len(weights))
    return p, [joint for joint, weight in weights], [weight for joint, weight in weights]


fitted = {v: fit(i, points[v]) for i, shell in enumerate(shells) for v in shell}
primitives = []
used = []
for material_index, material in enumerate(mesh.materials):
    positions, normals, joints, weights = [], [], [], []
    for tri in mesh.loop_triangles:
        if tri.material_index != material_index:
            continue
        data = [fitted[v] for v in tri.vertices]
        a,b,c = (p for p,j,w in data)
        normal = (b-a).cross(c-a).normalized()
        for position,joint,weight in data:
            positions.extend(position)
            normals.extend(normal)
            joints.extend(joint)
            weights.extend(weight)
    if not positions:
        continue
    shader = material.node_tree.nodes.get('Principled BSDF')
    color = list(shader.inputs['Base Color'].default_value)
    rough = .75 if 'scarf' in material.name.lower() else .56
    metallic = .2 if rough < .7 else 0
    props = {'name':material.name,'pbrMetallicRoughness':{
        'baseColorFactor':color,'metallicFactor':metallic,'roughnessFactor':rough}}
    strength = shader.inputs['Emission Strength'].default_value
    if strength > 0:
        props['emissiveFactor'] = list(shader.inputs['Emission Color'].default_value[:3])
        props['extensions'] = {'KHR_materials_emissive_strength':{'emissiveStrength':strength}}
    if not frog_base:
        if material.name == 'Crest enamel':
            props['pbrMetallicRoughness']['baseColorFactor'] = [.95,.025,.055,1]
            props['emissiveFactor'] = [.8,.012,.025]
            props['extensions']['KHR_materials_emissive_strength']['emissiveStrength'] = .45
        if material.name == 'Red luminous trim':
            props['extensions']['KHR_materials_emissive_strength']['emissiveStrength'] = .85
    primitives.append({'material':len(used),'attributes':{
        'POSITION':accessor(positions,'f',3,'VEC3',34962),
        'NORMAL':accessor(normals,'f',3,'VEC3',34962),
        'JOINTS_0':accessor(joints,'H',4,'VEC4',34962),
        'WEIGHTS_0':accessor(weights,'f',4,'VEC4',34962)}})
    used.append(props)

# Flexible undersuit keeps the independent armor shells visibly joined as they bend.
positions, normals, joints, weights = [], [], [], []
for side in ('L', 'R'):
    for upper, lower, width, depth, length in [
        ('B_Pelvis',f'B_{side}_Thigh',.066,.061,.085),
        (f'B_{side}_Thigh',f'B_{side}_Calf',.058,.059,.075),
        (f'B_{side}_Calf',f'B_{side}_Foot',.059,.069,.064)
    ]:
        center = world(skin['joints'][names[lower]]).translation
        axis = [(-1,.46),(-.48,.91),(0,1),(.48,.91),(1,.46)]
        rings = [[Vector((center.x+math.cos(a)*width*radius,center.y+height*length,
                          center.z+math.sin(a)*depth*radius))
                  for a in (j*math.tau/8 for j in range(8))] for height,radius in axis]
        for base in range(len(rings)-1):
            for j in range(8):
                k=(j+1)%8
                for face in [((base,j),(base+1,j),(base,k)),((base,k),(base+1,j),(base+1,k))]:
                    a,b,c=(rings[r][v] for r,v in face)
                    normal=(b-a).cross(c-a).normalized()
                    for (r,v),point in zip(face,(a,b,c)):
                        mix=max(0,min(1,(axis[r][0]+.75)/1.5))
                        positions.extend(point)
                        normals.extend(normal)
                        joints.extend([names[lower],names[upper],0,0])
                        weights.extend([1-mix,mix,0,0])
primitives.append({'material':len(used),'attributes':{
    'POSITION':accessor(positions,'f',3,'VEC3',34962),
    'NORMAL':accessor(normals,'f',3,'VEC3',34962),
    'JOINTS_0':accessor(joints,'H',4,'VEC4',34962),
    'WEIGHTS_0':accessor(weights,'f',4,'VEC4',34962)}})
used.append({'name':'Flexible joint seals','pbrMetallicRoughness':{
    'baseColorFactor':[.028,.032,.048,1],'roughnessFactor':.79,'metallicFactor':0}})

nodes[next(i for i,n in enumerate(nodes) if 'mesh' in n)]['name'] = 'KageArmor'
gltf['meshes'] = [{'name':'Kage armor','primitives':primitives}]
gltf['materials'] = used
gltf['extensionsUsed'] = ['KHR_materials_emissive_strength']
gltf['scenes'][0]['extras'] = {'character': {
    'source':'Kage armor / Explosive LLC animation rig', 'nominalHeight':1.86, 'preserveMaterials':True
}}
if not frog_base:
    # Keep hand sockets aligned as the T-pose span narrows.
    scene = gltf['scenes'][0]
    nodes.append({'name':'Armored silhouette','scale':[.70,1,1],
                  'children':scene['nodes']})
    scene['nodes'] = [len(nodes)-1]
binary.extend(b'\0'*(-len(binary)%4))
gltf['buffers'][0]['byteLength'] = len(binary)
data = json.dumps(gltf,separators=(',',':')).encode()
data += b' ' * (-len(data)%4)
output.parent.mkdir(parents=True,exist_ok=True)
output.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(data)+len(binary)) +
    struct.pack('<I4s',len(data),b'JSON')+data+struct.pack('<I4s',len(binary),b'BIN\0')+binary)
print('KAGE',len(mesh.loop_triangles),'triangles',len(names),'bones',len(gltf['animations']),'original clips',output.stat().st_size,'bytes')
