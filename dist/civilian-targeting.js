// Read-only minimap policy: a warning belongs to the civilian's current cohort,
// including civilians moved by a rescue. Never choose or advance an enemy target here.
export function targetedCivilianGroups(civilians,{walker=null,missiles=[],plasma=[],raiders=[]}={}){
 const live=civilians.filter(c=>c.unit.alive&&!c.unit.dashPhased),byId=new Map(live.map(c=>[c.unit.id,c])),groups=new Set();
 const mark=target=>{const c=byId.get(typeof target==='string'?target:target?.id);if(c)groups.add(c.group||c);};
 const area=(point,radius)=>{if(!point)return;for(const c of live){const p=c.root.position;if(Math.hypot(p.x-point.x,p.y+.9-(point.y??0),p.z-point.z)<=radius+1)groups.add(c.group||c);}};
 if(walker&&!walker.dead&&!walker.stunRemaining&&walker.isWeaponWorking?.('beam')!==false&&['charging','firing'].includes(walker.weapon?.phase))mark(walker.target);
 for(const missile of missiles){if(!missile.alive)continue;if(!missile.lockLost&&!missile.riftPair)mark(missile.target);area(missile.targetPoint,3.8);}
 for(const shell of plasma)if(['warning','flying'].includes(shell.state))area(shell.target,7);
 for(const raider of raiders){
  if(!raider.dead&&!raider.stunRemaining&&raider.windup>0)mark(raider.target);
  for(const bolt of raider.bolts||[])if(bolt.life>0&&!bolt.riftPair){const c=byId.get(bolt.target),p=c?.root.position,from=bolt.mesh?.position;if(c&&p&&from&&(!bolt.dir||(p.x-from.x)*bolt.dir.x+(p.y+.9-from.y)*bolt.dir.y+(p.z-from.z)*bolt.dir.z>=-1))mark(bolt.target);}
 }
 return groups;
}
