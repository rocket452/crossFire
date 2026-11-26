// Each card declares its synergy tags and any required producer.
function cards(hero, rows) {
 return rows.map(([name,tags,detail,requires])=>({
  id:name,name,hero,tags:tags.split(' '),detail,requires,rarity:hero?'evolution':'relic'
 }));
}
export const EVOLUTIONS=[
 ...cards('volt',[
  ['Closed Circuit','boost field','Cross your boost trail to electrify enemies inside the loop.'],
  ['Terminal Velocity','boost blast','End a sustained boost to discharge momentum in front of you.'],
  ['Power Grid','beam orb','Beam hits supply nearby orbs with energy.'],
  ['Live Wire','beam chain','Sustained beam contact marks conductors. Nearby marked enemies arc to each other.'],
  ['Critical Temperature','weld blast','Fully heat a target, then release the welder to detonate it.'],
  ['Arc Furnace','weld orb','Weld an orb to ignite a short-range plasma field.'],
  ['Storm Network','strike orb','Every orb calls down a local lightning strike when Sky Strike lands.'],
  ['Thunder Debt','strike kill','Kills during the warning accumulate extra bolts at impact.'],
  ['Storm Seed','strike orb','Sky Strike leaves a charged orb at the impact site.'],
  ['Mitosis','orb energy','Refilling a depleted orb splits its charge between two orbs.'],
  ['Orbital Current','orb field','Nearby orbs form damaging electrical links.'],
  ['Supernova','orb blast','Expiring orbs explode with power proportional to energy supplied.']
 ]),
 ...cards('ninja',[
  ['Phantom Footing','star anchor aerial','Jump again beside a deployed star or anchor.'],
  ['Aftershadow','dash echo','A shadow retraces your dash one second later.'],
  ['Execution Line','dash kill','Targets struck by one dash share takedown damage.'],
  ['Killing Spree','dash kill','Dash kills briefly increase dash width and damage.'],
  ['Hidden Arsenal','kunai slash','Embed kunai. Slashing the host fires them at nearby targets.'],
  ['Shadow Barrage','dash kunai anchor','Dash or teleport to fire copies of stored kunai.'],
  ['Blade Foundry','star kunai','Throw kunai or ordinary shuriken through a grinding star to duplicate them.'],
  ['Grinding Singularity','star field','Grinding stars draw smaller enemies inward.'],
  ['Crosscut','star dash','Dash through a deployed star to release two opposing stars.'],
  ['Shadow Relay','anchor kill','Teleport to a lodged anchor to relay it to another nearby enemy.'],
  ['Dimensional Cut','anchor slash','Teleporting cuts enemies along the travel path.'],
  ['Severance','slash star anchor kunai','Slash triggers a spectral cut per distinct active Kage effect on the victim.'],
  ['Death From Above','aerial kunai','Falling Cut rebounds restore jumps and scatter kunai.']
 ]),
 ...cards('lux',[
  ['Second Sun','lance sun','Sunlance impacts leave a miniature sun that burns nearby targets.'],
  ['Solar Fusion','lance sun','Pass a lance through a miniature sun to consume it for size and damage.','sun'],
  ['Prismatic Lance','lance projectile','Lances pierce enemies and scatter light bolts from each hit.'],
  ['Judgment','lance blast kill','Excess Sunlance damage explodes around the victim.'],
  ['Refraction','spray sun projectile','Sunburst strikes on miniature suns release empowered bolts.','sun'],
  ['Ignition','spray blast','Sunburst stacks heat. Another spell consumes it for an explosion.'],
  ['Constellation','volley projectile','Acquire repeated locks on the same enemy.'],
  ['Comet Nursery','volley sun','Each miniature sun launches a comet with your volley.','sun'],
  ['Celestial Chain','volley kill','A killing comet transfers its remaining damage to the next target.'],
  ['Radiant Double','blink echo','Return from Solar Blink to leave a copy that repeats your next attack.'],
  ['Flashpoint','blink sun','Returning from Solar Blink creates suns at both endpoints.'],
  ['Solar Reservoir','energy communion','Continue Communion to bank up to 50 extra solar energy.'],
  ['Consecration','communion field','Communion creates a field that empowers spells cast inside it.'],
  ['Dawn Chorus','communion sun','Communion extends nearby suns and intensifies their damage.','sun']
 ])
];
export const RELICS=cards(null,[
 ['Perpetual Engine','kill echo','Three kills in a single offensive activation repeat its attack.'],
 ['Closed Loop','kill projectile','An item kill fires a free basic attack at a nearby survivor.'],
 ['Singularity','blast field','Area attacks deal 3% more damage per meter of radius.'],
 ['Quantum Doppelganger','echo','Every 15 seconds a spectral copy repeats your last offensive attack.'],
 ['Stolen Seconds','cooldown','Bank up to 10 unused seconds of cooldown reduction.']
]);
export const PRICES={common:25,rare:45,legendary:70};
export const ITEMS=[
 ['Arc Relay','rare','chain','ϟ',n=>15+10*(n-1),v=>v+'% chance to arc to two targets for 60% damage'],
 ['Volatile Core','common','kill blast','✷',n=>5+10*n,v=>v+'% of victim max HP as explosion damage'],
 ['Targeting Chip','common','crit','◎',n=>10*n,v=>v+'% critical chance'],
 ['Shatter Crystal','rare','crit projectile','❖',n=>1+2*n,v=>v+' fragments per critical hit'],
 ['Resonance Chamber','rare','blast','◉',n=>100+60*(n-1),v=>v+'% reference damage shockwave every ten effective hits'],
 ['Execution Engine','legendary','kill','✂',n=>Math.min(40,7+3*n),v=>'Execute normal targets below '+v+'% HP'],
 ['Quantum Prism','rare','projectile','◇',n=>5+15*n,v=>v+'% chance to split on impact'],
 ['Phase Ammunition','common','projectile','➳',n=>n,v=>'Pierce '+v+' extra enemies'],
 ['Gravity Well','rare','field projectile','◍',n=>8+3*n,v=>'Pull light targets within '+v+' m on heavy impact'],
 ['Companion Shot','common','projectile','✦',n=>n,v=>v+' homing shots every fifth projectile'],
 ['Echo Chamber','legendary','echo','◌',n=>10*n,v=>v+'% chance to echo an offensive cast'],
 ['Time Fragment','rare','kill cooldown','◷',n=>.5*n,v=>v+' s cooldown reduction per kill'],
 ['Overclock Chip','common','cooldown','»',n=>15*n,v=>v+'% faster attacks and charge'],
 ['Combination Lock','rare','cast','⚿',n=>20+40*n,v=>v+'% bonus on the third distinct attack within 5 s'],
 ['Feedback Circuit','rare','crit energy','⟳',n=>4*n,v=>'Critical hits restore '+v+' energy or '+v/8+' s of Kage cooldown'],
 ['Excess Charge','rare','energy','▣',n=>50*n,v=>'Bank up to '+v+' excess recovery as cast damage'],
 ['Unstable Capacitor','rare','energy blast','⊛',n=>100+60*(n-1),v=>v+' nova damage per 60 energy spent or 4 Kage casts'],
 ['Kinetic Capacitor','common','boost chain','ϟ',n=>n,v=>v+' bolts after traveling 40 m'],
 ['Phantom Engine','rare','blink dash blast','◈',n=>100+60*(n-1),v=>v+' delayed blast damage after a dash or teleport'],
 ['Siege Platform','common','field','▰',n=>25+25*n,v=>'Build up to '+v+'% damage while stationary'],
 ['Overflow Reactor','rare','kill blast','✸',n=>35*n,v=>v+'% of overkill becomes blast damage'],
 ['Critical Mass','rare','blast','✺',n=>5*n,v=>v+'% area damage per distinct enemy caught'],
 ['Secondary Amplifier','legendary','chain blast','⊕',n=>30*n,v=>v+'% passive damage'],
 ['Field Medic','common','kill heal','✚',n=>3*n,v=>'Heal '+v+' per kill. Excess healing shields for 8 s'],
 ['Phase Buffer','legendary','shield projectile','⬡',n=>n,v=>'Store '+v+' hit blocks. Recover one every 18 s']
].map(([name,rarity,tags,icon,value,describe])=>({id:name,name,rarity,tags:tags.split(' '),icon,value,describe,price:PRICES[rarity]}));
