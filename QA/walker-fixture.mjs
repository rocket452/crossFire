import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {SiegeWalker} from '../dist/siege-walker.js';
const bytes=fs.readFileSync(new URL('../dist/city-assets/siege-walker.glb',import.meta.url));
const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
const binary=bytes.subarray(28+jsonLength),scene=new THREE.Scene(),model=new THREE.Group();
for(const node of gltf.nodes){if(node.mesh===undefined)continue;const primitive=gltf.meshes[node.mesh].primitives[0],accessor=gltf.accessors[primitive.attributes.POSITION],view=gltf.bufferViews[accessor.bufferView],start=(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12,positions=new Float32Array(accessor.count*3);for(let i=0;i<accessor.count;i++)for(let axis=0;axis<3;axis++)positions[i*3+axis]=binary.readFloatLE(start+i*stride+axis*4);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());mesh.name=node.name;model.add(mesh);}
export const spec=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/siege-walker.json',import.meta.url)));

export const gltfModel={scene:model};
