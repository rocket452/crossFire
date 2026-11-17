import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {AstraRoninModel} from '../dist/astra-ronin-model.js';
const root=new THREE.Group(),model=new AstraRoninModel(root,{height:9.6});root.updateMatrixWorld(true);
fs.writeFileSync(process.argv[2],JSON.stringify(Object.fromEntries(Object.entries(model.parts).map(([id,node])=>[id,{position:node.getWorldPosition(new THREE.Vector3()).toArray(),matrix:node.matrixWorld.toArray()}])),null,2));
