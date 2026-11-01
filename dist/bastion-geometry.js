import * as THREE from './vendor/three.module.js';
export const vector=p=>new THREE.Vector3(p.x,p.y,p.z);
export function pointSegment(p,a,b){const ab=b.clone().sub(a),t=THREE.MathUtils.clamp(p.clone().sub(a).dot(ab)/Math.max(ab.lengthSq(),1e-9),0,1);return{distance:p.distanceTo(a.clone().addScaledVector(ab,t)),t};}
export function segmentDistance(a,b,c,d){const u=b.clone().sub(a),v=d.clone().sub(c),w=a.clone().sub(c),A=u.dot(u),B=u.dot(v),C=v.dot(v),D=u.dot(w),E=v.dot(w),den=A*C-B*B;let s=den>1e-9?THREE.MathUtils.clamp((B*E-C*D)/den,0,1):0,t=C>1e-9?THREE.MathUtils.clamp((B*s+E)/C,0,1):0;s=A>1e-9?THREE.MathUtils.clamp((B*t-D)/A,0,1):0;t=C>1e-9?THREE.MathUtils.clamp((B*s+E)/C,0,1):0;return a.clone().addScaledVector(u,s).distanceTo(c.clone().addScaledVector(v,t));}
export const angleDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
