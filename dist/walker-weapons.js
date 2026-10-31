// Independent armor modules. Ordinary body damage is unchanged; no bonus hull damage on break.
export const WALKER_WEAPONS=Object.freeze([
 Object.freeze({id:'beam',part:'forearm_r',label:'BEAM CANNON',short:'BEAM',health:1800}),
 Object.freeze({id:'missiles',part:'rocket_pod',label:'ROCKET POD',short:'ROCKETS',health:1600}),
 Object.freeze({id:'plasma',part:'plasma_cannon',label:'PLASMA CANNON',short:'PLASMA',health:1800}),
 Object.freeze({id:'eyes',part:'visor',label:'EYE EMITTERS',short:'EYES',health:700})
]);
export class WalkerWeapons {
 constructor({specs=WALKER_WEAPONS,onDestroyed=()=>{}}={}){this.specs=specs;this.onDestroyed=onDestroyed;this.reset();}
 reset(){this.modules=this.specs.map(s=>({...s,maxHealth:s.health,health:s.health,destroyed:false}));}
 working(id){return this.modules.some(m=>m.id===id&&!m.destroyed);}
 forPart(part){return this.modules.find(m=>m.part===part);}
 hurt(part,power){
  const m=this.forPart(part);if(!m||m.destroyed||!Number.isFinite(power)||power<=0)return 0;
  const damage=Math.min(power,m.health);m.health=Math.max(0,m.health-damage);
  if(m.health===0){m.destroyed=true;this.onDestroyed(m);}return damage;
 }
 diagnostics(){return this.modules.map(m=>({...m}));}
}
