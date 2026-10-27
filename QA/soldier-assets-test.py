"""Validate exported assets, loop continuity, and calibrated walk foot planting."""
from pathlib import Path
import json,math,struct
root=Path(__file__).resolve().parents[1]/'dist'/'city-assets'
m=json.loads((root/'soldier-motion.json').read_text())
assert m['triangles']<=2500 and m['materialCount']==1
assert m['deformBones']==17 and len(m['parts'])==16
assert set(m['clips'])=={'Idle','Walk','Run','Aim','Fire','CrouchFire','CrouchAim','Reload'}
for name,c in m['clips'].items():
 for frame in c['frames']:
  assert len(frame)==len(m['parts'])*7 and all(math.isfinite(v) for v in frame)
  for i in range(len(m['parts'])):assert abs(sum(v*v for v in frame[i*7+3:i*7+7])-1)<.0001
 if c['loop']:assert max(abs(a-b) for a,b in zip(c['frames'][0],c['frames'][-1]))<.0001
# World-space ankle contact after adding the locomotion controller's calibrated travel.
idx=m['parts'].index('foot_l');positions=[];bind=(.115,.12,0)
for index,frame in enumerate(m['clips']['Walk']['frames'][:17]):
 off=idx*7;t=frame[off:off+3];x,y,z,w=frame[off+3:off+7];px,py,pz=bind
 uv=(y*pz-z*py,z*px-x*pz,x*py-y*px);uuv=(y*uv[2]-z*uv[1],z*uv[0]-x*uv[2],x*uv[1]-y*uv[0])
 p=[bind[j]+2*(w*uv[j]+uuv[j])+t[j] for j in range(3)];p[2]+=1.05*index/30;positions.append(p)
assert max(p[2] for p in positions)-min(p[2] for p in positions)<.005
assert max(abs(p[1]-.12) for p in positions)<.005
b=(root/'soldier.glb').read_bytes();g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
assert len(g['animations'])==8 and len(g['materials'])==1 and len(g['skins'][0]['joints'])==17
for a in g['animations']:
 for c in a['channels']:assert c['target']['node']<len(g['nodes'])
for view in g['bufferViews']:assert view.get('byteOffset',0)+view['byteLength']<=g['buffers'][0]['byteLength']
print('PASS soldier budget, transforms, unit quaternions, loop seams, planted walk ankle, GLB animation references and buffer bounds')
