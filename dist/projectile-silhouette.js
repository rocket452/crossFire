import * as THREE from './vendor/three.module.js';
// Projectile cores are ordinary depth-tested objects. They reserve the actor
// stencil bit only where visible, blocking enemy x-ray overlays behind them.
const marked=new WeakMap();
export function markVisibleProjectile(material){if(!marked.has(material)){const copy=material.clone();copy.stencilWrite=true;copy.stencilRef=2;copy.stencilWriteMask=2;copy.stencilFuncMask=2;copy.stencilFunc=THREE.AlwaysStencilFunc;copy.stencilZPass=THREE.ReplaceStencilOp;copy.stencilFail=copy.stencilZFail=THREE.KeepStencilOp;marked.set(material,copy);}return marked.get(material);}
// Retained for callers with an instanced legacy overlay; it never draws.
export function silhouetteMaterial(color){return new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthTest:true,depthWrite:false,colorWrite:false,stencilWrite:false});}
export function projectileSilhouette(source){source.material=Array.isArray(source.material)?source.material.map(markVisibleProjectile):markVisibleProjectile(source.material);source.renderOrder=90;source.userData.enemyProjectile=true;return null;}
