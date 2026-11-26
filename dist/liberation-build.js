import {EVOLUTIONS, ITEMS, RELICS} from './liberation-catalog.js';

export class LiberationBuild {
 constructor(hero,random=Math.random){
  Object.assign(this,{hero,random,hp:120,level:1,xp:0,credits:0,kills:0,time:0,safeUntil:0,
   shield:0,shieldUntil:0,blocks:0,blockAt:0,revision:0,refreshes:0});
  this.ranks=new Map();this.cards=[];this.rewards=[];this.rollShop();
 }
 value(id){const row=this.ranks.get(id);return row?(row.upgrade.value?.(row.rank)??1):0;}
 get maxHP(){return 120;}
 get threshold(){return 24+12*(this.level-1);}
 tick(dt){
  this.time+=dt;
  if(this.time>=this.shieldUntil)this.shield=0;
  if(this.blocks<this.value('Phase Buffer')&&this.time>=this.blockAt){this.blocks++;this.blockAt=this.time+18;}
 }
 hurt(power){
  if(this.hp<=0||this.time<this.safeUntil||power<=0)return false;
  this.safeUntil=this.time+.35;
  if(this.blocks){this.blocks--;this.blockAt=this.time+18;return 'ward';}
  const absorb=Math.min(power,this.shield);this.shield-=absorb;
  this.hp=Math.max(0,this.hp-power+absorb);return true;
 }
 reward(drone,elite=false){
  this.kills++;this.credits+=elite?20:drone?6:4;this.xp+=drone?10:7;
  while(this.xp>=this.threshold){this.xp-=this.threshold;this.level++;this.rewards.push('level');}
  const heal=this.value('Field Medic');
  if(heal){this.shield=Math.min(60,this.shield+Math.max(0,this.hp+heal-this.maxHP));this.shieldUntil=this.time+8;this.hp=Math.min(this.maxHP,this.hp+heal);}
 }
 bossReward(final=false){
  this.credits+=60;this.cards=[];this.refreshes=0;this.rollShop();
  if(final)this.rewards=[];else this.rewards.unshift('boss');
 }
 draw(pool,count,weighted=false){
  const picks=[],tags=new Set([...this.ranks.values()].flatMap(row=>row.upgrade.tags));
  while(pool.length&&picks.length<count){
   const weights=pool.map(card=>weighted&&card.tags.some(t=>tags.has(t))?1.7:1);
   let roll=this.random()*weights.reduce((a,b)=>a+b,0);
   let i=weights.findIndex(w=>(roll-=w)<0);if(i<0)i=pool.length-1;
   picks.push(...pool.splice(i,1));
  }
  return picks;
 }
 draft(){
  if(this.cards.length||!this.rewards.length)return this.cards;
  const suns=this.value('Second Sun')||this.value('Flashpoint');
  const pool=this.rewards[0]==='boss'?RELICS:EVOLUTIONS.filter(c=>c.hero===this.hero&&(!c.requires||suns));
  this.cards=this.draw(pool.filter(c=>!this.ranks.has(c.id)),3,true);
  if(!this.cards.length)this.rewards.shift();
  this.revision++;return this.cards;
 }
 grant(card){
  const rank=(this.ranks.get(card.id)?.rank||0)+1;this.ranks.set(card.id,{upgrade:card,rank});
  if(card.id==='Phase Buffer')this.blocks++;
  this.revision++;
 }
 choose(id){
  const card=this.cards.find(c=>c.id===id);if(!card)return false;
  this.grant(card);this.cards=[];this.rewards.shift();return true;
 }
 rollShop(){
  this.stock=this.draw(ITEMS.filter(c=>!(this.hero==='volt'&&c.id==='Phantom Engine')&&!(this.hero==='ninja'&&c.id==='Excess Charge')),5)
   .map(card=>({card,sold:false}));this.revision++;
 }
 get refreshPrice(){return 10+5*this.refreshes;}
 refresh(){if(this.credits<this.refreshPrice)return false;this.credits-=this.refreshPrice;this.refreshes++;this.rollShop();return true;}
 buy(id){
  const row=this.stock.find(r=>r.card.id===id);
  if(!row||row.sold||this.credits<row.card.price)return false;
  this.credits-=row.card.price;row.sold=true;this.grant(row.card);return true;
 }
}
