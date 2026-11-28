#!/usr/bin/env python3
"""Second step of the FORGE mecha low-poly conversion (plain Python 3 + Pillow).

Builds the low-poly GLB from the ORIGINAL file: every node, the skin (joints and inverse bind matrices),
every animation, every material and the scene graph are copied from the original unchanged. Only the mesh
primitives' vertex data and indices are replaced with the decimated ones exported by decimate_mecha.py
(joint indices remapped by bone name), and embedded textures larger than --max-texture are downscaled.

  python3 source/forge-mecha/transplant_mesh.py original.glb decimated-mesh.glb out.glb [--max-texture 1024]
"""
import argparse, copy, io, json, os, struct, sys
from PIL import Image

COMPONENT = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
TYPE = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
FORMAT = {5121: 'B', 5123: 'H', 5125: 'I'}


def read_glb(path):
    data = open(path, 'rb').read()
    magic, version, length = struct.unpack_from('<III', data, 0)
    if magic != 0x46546C67:
        sys.exit(path + ' is not a binary glTF')
    offset, gltf, binary = 12, None, b''
    while offset < length:
        size, kind = struct.unpack_from('<II', data, offset)
        chunk = data[offset + 8:offset + 8 + size]
        if kind == 0x4E4F534A:
            gltf = json.loads(chunk)
        elif kind == 0x004E4942:
            binary = chunk
        offset += 8 + size
    return gltf, binary


def accessor_bytes(gltf, binary, index):
    """Tightly packed element data of an accessor (handles byte strides)."""
    acc = gltf['accessors'][index]
    if 'sparse' in acc:
        sys.exit('sparse accessors are not supported')
    view = gltf['bufferViews'][acc['bufferView']]
    element = COMPONENT[acc['componentType']] * TYPE[acc['type']]
    start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    stride = view.get('byteStride', element)
    if stride == element:
        return binary[start:start + element * acc['count']]
    return b''.join(binary[start + i * stride:start + i * stride + element] for i in range(acc['count']))


def view_bytes(gltf, binary, index):
    view = gltf['bufferViews'][index]
    start = view.get('byteOffset', 0)
    return binary[start:start + view['byteLength']]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('original'); parser.add_argument('decimated'); parser.add_argument('output')
    parser.add_argument('--max-texture', type=int, default=1024)
    parser.add_argument('--jpeg-quality', type=int, default=90)
    args = parser.parse_args()
    if os.path.abspath(args.output) in (os.path.abspath(args.original), os.path.abspath(args.decimated)):
        sys.exit('refusing to overwrite an input file')

    src, src_bin = read_glb(args.original)
    dec, dec_bin = read_glb(args.decimated)
    out = copy.deepcopy(src)
    out['accessors'], out['bufferViews'] = [], []
    blob = bytearray()

    def add_view(data, target=None):
        while len(blob) % 4:
            blob.append(0)
        view = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)}
        if target:
            view['target'] = target
        blob.extend(data)
        out['bufferViews'].append(view)
        return len(out['bufferViews']) - 1

    def add_accessor(meta, data, target=None):
        acc = {k: meta[k] for k in ('componentType', 'normalized', 'count', 'type', 'min', 'max', 'name') if k in meta}
        acc['bufferView'] = add_view(data, target)
        out['accessors'].append(acc)
        return len(out['accessors']) - 1

    copied = {}

    def copy_accessor(index):
        if index not in copied:
            copied[index] = add_accessor(src['accessors'][index], accessor_bytes(src, src_bin, index))
        return copied[index]

    # Skeleton and animation data: byte-identical copies of the original accessors.
    for skin in out.get('skins', []):
        if 'inverseBindMatrices' in skin:
            skin['inverseBindMatrices'] = copy_accessor(skin['inverseBindMatrices'])
    for anim in out.get('animations', []):
        for sampler in anim['samplers']:
            sampler['input'] = copy_accessor(sampler['input'])
            sampler['output'] = copy_accessor(sampler['output'])

    # Joint order of the decimated export, mapped to the original skin by bone name.
    src_names = [src['nodes'][j]['name'] for j in src['skins'][0]['joints']]
    dec_names = [dec['nodes'][j]['name'] for j in dec['skins'][0]['joints']]
    missing = set(dec_names) - set(src_names)
    if missing:
        sys.exit('decimated skin has unknown bones: %s' % sorted(missing))
    joint_map = [src_names.index(n) for n in dec_names]

    dec_material = {i: m.get('name') for i, m in enumerate(dec.get('materials', []))}
    dec_prims = {}
    for mesh in dec['meshes']:
        for prim in mesh['primitives']:
            dec_prims.setdefault(dec_material.get(prim.get('material')), []).append(prim)
    report = []
    for mesh in out['meshes']:
        for prim in mesh['primitives']:
            name = src['materials'][prim['material']].get('name')
            matches = dec_prims.get(name, [])
            if len(matches) != 1:
                sys.exit('material %r: expected one decimated primitive, found %d' % (name, len(matches)))
            new = matches[0]
            attributes = {}
            for key, index in new['attributes'].items():
                if key not in prim['attributes']:
                    continue
                meta, data = dec['accessors'][index], accessor_bytes(dec, dec_bin, index)
                if key.startswith('JOINTS_'):
                    fmt = FORMAT[meta['componentType']]
                    values = struct.unpack('<%d%s' % (len(data) // struct.calcsize(fmt), fmt), data)
                    data = struct.pack('<%d%s' % (len(values), fmt), *(joint_map[v] for v in values))
                attributes[key] = add_accessor(meta, data, 34962)
            dropped = sorted(set(prim['attributes']) - set(attributes))
            prim['attributes'] = attributes
            index = new['indices']
            prim['indices'] = add_accessor(dec['accessors'][index], accessor_bytes(dec, dec_bin, index), 34963)
            report.append({'material': name, 'vertices': dec['accessors'][new['attributes']['POSITION']]['count'],
                           'triangles': dec['accessors'][index]['count'] // 3, 'dropped': dropped})

    # Embedded textures, downscaled to the maximum size (aspect kept). Smaller images are copied as-is.
    textures = []
    for image in out.get('images', []):
        data = view_bytes(src, src_bin, image['bufferView'])
        picture = Image.open(io.BytesIO(data))
        size = picture.size
        if max(size) > args.max_texture:
            scale = args.max_texture / max(size)
            picture = picture.resize((max(1, round(size[0] * scale)), max(1, round(size[1] * scale))), Image.LANCZOS)
            buffer = io.BytesIO()
            if image.get('mimeType') == 'image/jpeg':
                picture.convert('RGB').save(buffer, 'JPEG', quality=args.jpeg_quality, optimize=True)
            else:
                picture.save(buffer, 'PNG', optimize=True)
            data = buffer.getvalue()
        image['bufferView'] = add_view(data)
        textures.append({'name': image.get('name'), 'from': list(size), 'to': list(picture.size)})

    out['buffers'] = [{'byteLength': len(blob)}]
    out.setdefault('asset', {})['extras'] = {**out['asset'].get('extras', {}),
        'crossfire': 'Low-poly conversion of %s (skeleton, animations and materials unchanged)' % os.path.basename(args.original)}
    text = json.dumps(out, separators=(',', ':')).encode('utf8')
    text += b' ' * (-len(text) % 4)
    while len(blob) % 4:
        blob.append(0)
    length = 12 + 8 + len(text) + 8 + len(blob)
    with open(args.output, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, length))
        f.write(struct.pack('<II', len(text), 0x4E4F534A)); f.write(text)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    print(json.dumps({'output': args.output, 'bytes': length, 'primitives': report, 'textures': textures,
                      'jointMap': joint_map}, indent=1))


if __name__ == '__main__':
    main()
