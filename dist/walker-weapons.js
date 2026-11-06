// Only the three heavy mounts are destructible; their combined durability is boss health.
// TEMPORARY testing override. Set back to 1 to restore normal weapon durability.
export const WALKER_WEAPON_HEALTH_SCALE=.1;
export const WALKER_WEAPONS=Object.freeze([
 Object.freeze({id:'beam',part:'forearm_r',label:'BEAM CANNON',short:'BEAM',health:1800*WALKER_WEAPON_HEALTH_SCALE}),
 Object.freeze({id:'missiles',part:'rocket_pod',label:'ROCKET POD',short:'ROCKETS',health:1600*WALKER_WEAPON_HEALTH_SCALE}),
 Object.freeze({id:'plasma',part:'plasma_cannon',label:'PLASMA CANNON',short:'PLASMA',health:1800*WALKER_WEAPON_HEALTH_SCALE})
]);
export class WalkerWeapons {
 constructor({specs=WALKER_WEAPONS,onDestroyed=()=>{}}={}){this.specs=specs;this.onDestroyed=onDestroyed;this.reset();}
 reset(){this.modules=this.specs.map(s=>({...s,maxHealth:s.health,health:s.health,destroyed:false}));}
 get health(){return this.modules.reduce((sum,m)=>sum+m.health,0);}
 get maxHealth(){return this.modules.reduce((sum,m)=>sum+m.maxHealth,0);}
 get remaining(){return this.modules.filter(m=>!m.destroyed).length;}
 working(id){return this.modules.some(m=>m.id===id&&!m.destroyed);}
 forPart(part){return this.modules.find(m=>m.part===part);}
 hurt(part,power){
  const m=this.forPart(part);if(!m||m.destroyed||!Number.isFinite(power)||power<=0)return 0;
  const damage=Math.min(power,m.health);m.health=Math.max(0,m.health-damage);
  if(m.health===0){m.destroyed=true;this.onDestroyed(m);}return damage;
 }
 diagnostics(){return this.modules.map(m=>({...m}));}
}
