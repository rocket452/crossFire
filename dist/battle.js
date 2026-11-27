import {alertEnemiesToAttacker,inFrontOfEnemy} from './enemy-alert.js?v=421';
import {Luxmancer,LuxPlayer} from './luxmancer.js?v=455';
import {RiftPlayer} from './rift-player.js?v=435';
import {VioletPlayer} from './violet-player.js?v=428';
import {DefenseTitle} from './defense-title.js?v=462';
import {kageDashCanFinish} from './kage-attacks.js?v=463';
import {NINJA} from './ninja-motion.js?v=424';
import {AssetCityLighting} from './asset-city-lighting.js?v=315';
import {ASSET_CITY} from './asset-city-config.js?v=311';
import {AssetCity} from './asset-city.js?v=347';
import {setupRoninModelChoice} from './ronin-model-choice.js?v=310';
import {RUNNER_BEAM} from './runner-beam.js?v=lightning-range-298';
import {WELDING_BEAM,weldStun} from './runner-welder.js?v=451';
import {VOLT_STORM} from './runner-storm.js?v=424';
import {massContacts,CRITICAL_MASS} from './critical-mass.js?v=mass-charge-369';
import {WALKER_WEAPON_HEALTH_SCALE} from './walker-weapons.js?v=415';
import {EmbercatHero,EMBERCAT} from './embercat-hero.js?v=firecat-flight-254';
import {AxolotlHero,AXO} from './axolotl-hero.js?v=uploaded-309';
import {MIREGUARD} from './mireguard-config.js?v=mireguard-direct-275';
import {viewportPixelRatio} from './render-budget.js?v=overall-performance-238';
import {SpatialChunkBatch} from './spatial-chunk-batch.js?v=overall-performance-238';
import {EvacuationBastionCinematic} from './evacuation-bastion-cinematic.js?v=385';
import {EvacuationBastionReinforcement} from './evacuation-bastion-reinforcement.js?v=385';
import {BastionTesting} from './bastion-testing.js?v=432';
import {EvacuationHelicopterStrike} from './evacuation-helicopter-strike.js?v=heli-missiles-222';
import {evacuationCityBuildings,mission1CityBuildings,EVAC_CITY_ROADS,MISSION1_CITY_ROADS,MISSION1_HERO_START,addEvacuationDistrictRoads} from './evac-city-map.js?v=mission-spawn-326';
import {guardHeroInSmoke} from './kage-smoke.js?v=390';
import {EVACUATION_CONFIG,EVACUATION_ENTRANCES,EVACUATION_LANDING} from './evacuation-config.js?v=compact-evac-237';
import {ConvoyResults} from './convoy-results.js?v=argus-sustained-205';
import {routePoint,routeLength} from './convoy-map-config.js?v=argus-sustained-205';
import {Argus} from './argus.js?v=392';
import {ConvoyMission} from './convoy-mission.js?v=argus-sustained-205';
import {ConvoyHUD} from './convoy-hud.js?v=argus-sustained-205';
import {PrismwingHero,PRISMWING} from './prismwing-hero.js?v=rainbow-full-solara-290';
import {BuildingSmoke} from './building-smoke.js?v=building-smoke-155';
import {COMBAT_ARENA} from './combat-arena-config.js?v=argus-sustained-205';
import {EnemySeparation} from './enemy-separation.js?v=spider-bruiser-272';
import {CombatTesting} from './combat-testing.js?v=461';
import {ActorSilhouettes} from './actor-silhouettes.js?v=426';
import {RAIDER_COMBAT} from './evac-raider.js?v=421';
import {targetedCivilianGroups} from './civilian-targeting.js?v=415';
import {NinjaHero} from './ninja-hero.js?v=463';
import {RobotDeathEffects} from './robot-death-effects.js?v=enemy-low-health-smoke-291';
import {shieldBeamIntersection,frontBarrierHit,absorbDirectionalBarrier} from './hero-defense.js?v=390';
import {EnemyDamageFlash} from './enemy-damage-flash.js?v=393';
import {HeroMinimap} from './hero-minimap.js?v=427';
import {inputMode} from './input-mode.js?v=device-controls-59';
import {projectileSilhouette} from './projectile-silhouette.js?v=charged-shuriken-130';
import {EVAC_ROCKET} from './defense-rocket.js?v=427';
import {WaveDefense,DEFENSE_UPGRADES,RELAY,RELAY_INTRO,WAVE_DEFENSE_HERO_START,WAVE_DEFENSE_BOUNDS,WAVE_DEFENSE_HIGHWAYS,waveDefenseBuildings,waveDefenseRoads} from './wave-defense.js?v=451';
import {MissionEnemyWaves} from './mission-enemy-waves.js?v=421';
import {EvacRaiderWaves} from './evac-raider-waves.js?v=421';
import {ESCORT_APPROACH,escortMovementBounds,addEscortApproach} from './evac-approach.js?v=393';
import {MochiHero,MOCHI} from './mochi-hero.js?v=overall-performance-238';
import {VOLT_STUN,VIOLET_BEAM,VIOLET_ORB} from './hero-powers.js?v=428';
import {RobotStunEffect} from './hero-power-effects.js?v=mochi-56';
import {EvacuationScene,districtHeroUnits} from './evacuation.js?v=415';
import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {damageRoninBuildings} from './ronin-building-damage.js?v=307';
import {DestructionWorld} from './destruction.js?v=393';
import {InfantryCrowd} from './infantry.js?v=overall-performance-238';
import {HelicopterPilot} from './helicopter-pilot.js?v=device-controls-59';
import {traceImpact,UnitDamage} from './combat-collision.js?v=evac-performance-233';
import {SiegeWalker} from './siege-walker.js?v=430';
import {WalkerBeamImpact} from './walker-beam-impact.js?v=392';
import {EnergyBeamEffect} from './energy-beam.js?v=runner-6';
import {BeamCombat} from './beam-combat.js?v=393';
import {VioletHero} from './violet-hero.js?v=428';
import {Speedster} from './speedster.js?v=464';
import {RobotMissiles,WALKER_SALVO_SIZE,WALKER_MISSILE_BLAST_RADIUS,WALKER_MISSILE_UNIT_BLAST_RADIUS} from './robot-missiles.js?v=424';
import {MissileExplosions} from './missile-explosions.js?v=neon-missiles-318';
import {PortalHero} from './portal-hero.js?v=397';
import {SolaraHero} from './solara-hero.js?v=rainbow-full-solara-290';
import {HeroRoster} from './hero-roster.js?v=441';
import {EvacuationBriefing,evacuationTeam} from './evacuation-briefing.js?v=460';
import {segmentBoxFraction} from './combat-collision.js?v=evac-performance-233';
import {WalkerSniper,WALKER_SNIPER} from './walker-sniper.js?v=415';
import {RobotEyeBeams} from './robot-eye-beams.js?v=charged-shuriken-130';
import {RobotArsenal} from './robot-arsenal.js?v=relay-targeting-385';
import {setTerrainMoundsEnabled,terrainHeight,traceTerrain} from './runner-motion.js?v=424';
const assetCityMode=(new URLSearchParams(location.search).get('scene')||'city-liberation')==='city-test';
const testingMode=assetCityMode||(new URLSearchParams(location.search).get('scene')||'city-liberation')==='testing';let testingArena=null,assetCity=null;
function activeRaiders(){return testingArena||evacuation?.raider||missionRaiders;}
const evacuationMode=(new URLSearchParams(location.search).get('scene')||'city-liberation')==='evacuation';let evacuation=null,evacuationHelicopterStrike=null,evacuationReinforcement=null,evacuationCinematic=null;
const convoyMode=(new URLSearchParams(location.search).get('scene')||'city-liberation')==='convoy';let convoy=null,convoyHUD=null,argus=null,convoyResults=null,resultsPause=false;
const convoyConfig=convoyMode?await fetch('convoy-config.json?v=argus-sustained-205').then(r=>{if(!r.ok)throw Error('Convoy config unavailable');return r.json();}):null;
const liberationMode=(new URLSearchParams(location.search).get('scene')||'city-liberation')==='city-liberation';
const {CityLiberation}=liberationMode?await import('./city-liberation.js?v=463'):{};
const {LiberationUI}=liberationMode?await import('./liberation-ui.js?v=435'):{};
const defenseMode=(new URLSearchParams(location.search).get('scene')||'city-liberation')==='wave-defense';
const mission1Mode=liberationMode||defenseMode||(new URLSearchParams(location.search).get('scene')||'city-liberation')==='mission-1';
const districtMode=evacuationMode||mission1Mode;
setTerrainMoundsEnabled(!defenseMode);
const districtHeroStart=defenseMode?WAVE_DEFENSE_HERO_START:MISSION1_HERO_START;
const districtBounds=defenseMode?WAVE_DEFENSE_BOUNDS:ESCORT_APPROACH;
function districtMovementBounds(inset=4){
 if(!defenseMode)return escortMovementBounds(inset);
 const {minX,maxX,minZ,maxZ}=districtBounds;
 return {minX:minX+inset,maxX:maxX-inset,minZ:minZ+inset,maxZ:maxZ-inset};
}
const districtRoads=defenseMode?waveDefenseRoads(MISSION1_CITY_ROADS):mission1Mode?MISSION1_CITY_ROADS:EVAC_CITY_ROADS;
const cyberpunkCity=assetCityMode||districtMode;
const missionHeroTargets=new Map();
let missionRaiders=null;
function civilianScene(){return convoy||evacuation;}
const $=id=>document.getElementById(id),viewport=$('viewport');
const minimap=new HeroMinimap($('hero-minimap'),{getSnapshot:minimapSnapshot,getStructureAlive:id=>physics?.buildings.get(id)?.chunks.some(c=>c.state==='intact'&&c.hp>0)??true});
let renderer;
try{renderer=new THREE.WebGLRenderer({stencil:true,antialias:true,powerPreference:'high-performance'});}catch(e){$('loading').innerHTML='<b>WebGL is unavailable.</b><span>Open this scene in a current Safari or Chrome browser.</span>';throw e;}
let renderPixelRatio=Math.min(devicePixelRatio,1.35);renderer.setPixelRatio(renderPixelRatio);renderer.setClearColor('#a5b2b0');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;viewport.prepend(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','City battle observer. Drag to orbit, pinch or scroll to zoom, two fingers or right drag to pan.');
const scene=new THREE.Scene();scene.background=new THREE.Color('#a5b2b0');scene.fog=new THREE.Fog('#a5b2b0',testingMode?200:districtMode?160:100,testingMode?450:districtMode?520:240);const camera=new THREE.PerspectiveCamera(47,1,.2,testingMode||districtMode?700:450);camera.position.set(77,68,85);
const robotDeathEffects=new RobotDeathEffects(scene);const enemyDamageFlash=new EnemyDamageFlash();const enemySeparation=new EnemySeparation({canMove:(e,a,b,r)=>{if(e.type==='mireguard')return e.isPathClear(a,b);const radius=Math.min(r,1.45*RAIDER_COMBAT.modelScale);return !traceImpact(new THREE.Vector3(a.x,a.y+radius+.15,a.z),new THREE.Vector3(b.x,b.y+radius+.15,b.z),{sections:physics.chunks,ground:false,radius});}});const missileExplosions=new MissileExplosions(scene,{cyberpunk:cyberpunkCity});const robotStunEffect=new RobotStunEffect(scene);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,6,0);controls.enableDamping=true;controls.dampingFactor=.09;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=4;controls.maxDistance=testingMode?390:districtMode?430:190;controls.screenSpacePanning=true;controls.zoomSpeed=.8;controls.panSpeed=.9;
const skyLight=new THREE.HemisphereLight('#e4e9de','#6b736c',2.1);scene.add(skyLight);const sun=new THREE.DirectionalLight('#ffe2b8',2.8);sun.position.set(testingMode?-90:-45,testingMode?180:90,testingMode?70:35);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:testingMode?-135:districtMode?-95:-65,right:testingMode?135:districtMode?95:65,top:testingMode?135:districtMode?95:65,bottom:testingMode?-135:districtMode?-95:-65,near:1,far:testingMode?400:200});sun.shadow.normalBias=.08;sun.shadow.bias=-.0003;if(districtMode){const middle=(districtBounds.minZ+districtBounds.maxZ)/2;const centerX=(districtBounds.minX+districtBounds.maxX)/2;sun.position.set(centerX-90,180,middle+70);sun.target.position.set(centerX,0,middle);Object.assign(sun.shadow.camera,{left:-202,right:202,top:202,bottom:-202,far:500});scene.add(sun.target);}scene.add(sun);
const cityLighting=cyberpunkCity?new AssetCityLighting(scene,renderer,skyLight,sun,districtMode?{fogDensity:.0048}:undefined):null;
const simple=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:1,...options});const asphalt=simple('#49565a'),groundMat=simple('#7c887e'),pavement=simple('#a3aaa0'),roadPaint=simple('#c0bba2'),dark=simple('#394947'),orange=simple('#d4854e'),teal=simple('#619fa0');
if(cyberpunkCity){
 asphalt.color.set('#343951'); groundMat.color.set('#393d54');
 pavement.color.set('#5d6180'); roadPaint.color.set('#9192a5');
}
const dummy=new THREE.Object3D(),unitBox=new THREE.BoxGeometry(1,1,1),v3=new THREE.Vector3(),q=new THREE.Quaternion();
function mesh(g,m,x,y,z,sx=1,sy=1,sz=1){let o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}
function instanced(g,m,items){const o=new THREE.InstancedMesh(g,m,items.length);items.forEach((p,i)=>{dummy.position.set(...p.p);dummy.rotation.set(0,p.yaw||0,0);dummy.scale.set(...(p.s||[1,1,1]));dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix)});o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}
mesh(unitBox,groundMat,convoyMode?(convoyConfig.map.bounds.minX+convoyConfig.map.bounds.maxX)/2:districtMode?(districtBounds.minX+districtBounds.maxX)/2:0,-.5,districtMode?(districtBounds.minZ+districtBounds.maxZ)/2:0,testingMode?COMBAT_ARENA.size:convoyMode?convoyConfig.map.bounds.maxX-convoyConfig.map.bounds.minX:districtMode?districtBounds.maxX-districtBounds.minX:120,1,testingMode?COMBAT_ARENA.size:districtMode?districtBounds.maxZ-districtBounds.minZ:120).name='City ground';if(districtMode){
 const approach={x:EVACUATION_LANDING.x,bounds:districtBounds,surfaces:{road:asphalt,pavement,paint:roadPaint}};
 if(defenseMode){
  for(const highway of WAVE_DEFENSE_HIGHWAYS)addEscortApproach(scene,{...approach,...highway,roadY:.029});
 }else addEscortApproach(scene,approach);
 addEvacuationDistrictRoads(scene,asphalt,districtRoads.filter(road=>!road.highway));
}if(convoyMode){const b=convoyConfig.map.bounds;mesh(unitBox,asphalt,(b.minX+b.maxX)/2,.025,0,b.maxX-b.minX+24,.04,convoyConfig.map.roadHalfWidth*2);}
const roadLanes=testingMode?COMBAT_ARENA.roadLanes:[-24,0,24],roadLength=testingMode?COMBAT_ARENA.roadLength:110;const roads=[];for(const a of roadLanes){roads.push({p:[a,.015,0],s:[11,.035,roadLength]},{p:[0,.02,a],s:[roadLength,.035,11]});}instanced(unitBox,asphalt,roads);
const paint=[];for(const a of roadLanes)for(let t=testingMode?-111:-51;t<(testingMode?112:52);t+=5){if(roadLanes.some(c=>Math.abs(c-t)<7))continue;paint.push({p:[a,.055,t],s:[.13,.025,2.3]},{p:[t,.055,a],s:[2.3,.025,.13]});}for(const x of roadLanes)for(const z of roadLanes)for(let j=-3;j<=3;j++){paint.push({p:[x+j*.8,.06,z+7],s:[.35,.025,2.1]},{p:[x+j*.8,.06,z-7],s:[.35,.025,2.1]},{p:[x+7,.065,z+j*.8],s:[2.1,.025,.35]},{p:[x-7,.065,z+j*.8],s:[2.1,.025,.35]});}instanced(unitBox,roadPaint,paint);
let seed=57;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
let droneImpactShake=0,hitStop=0;
let loaded=false,paused=false,speed=1,simTime=0,frameClock=0,view='overview',slowSeconds=0;let kit={},layout,physics,soldierCrowd,soldierParts,soldierMotion,humanoidModel,pilot,unitDamage,robot,beamEffect,beamCombat,hero,runner,robotMissiles,arsenal,portalHero,walkerSniper,solara,eyeBeams,mochi,ninja,prism,axo,ember,lux;let projectileSequence=0;let playerMissiles=0,playerHits=0,playerBuildingHits=0,playerUnitHits=0;let lastPlayerDamage=null;const buildingRecords=new Map(),chunkBatches={},tanks=[],helicopters=[],troops=[],projectiles=[],particles=[],tracers=[];let impactLog=[],shotsFired=0;const weaponImpacts={shell:0,rocket:0,pulse:0,beam:0,electric:0,plasma:0};
let rosterPause=false;
const soloRoster=testingMode||mission1Mode;
const roster=new HeroRoster({luxAvailable:defenseMode||liberationMode,maxHeroes:soloRoster?1:3,...(soloRoster?{storage:null}:{}),onOpen:()=>{hero?.player?.exit();portalHero?.player?.exit();lux?.player.exit();ninja?.exit();runner?.exit();pilot?.exit();rosterPause=paused;paused=true;keys.clear();heightInput=0;},onClose:()=>{paused=rosterPause;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');},onApply:()=>{if(!loaded)return;if(testingMode)$('test-hero').value=roster.active[0];configureHeroes();$('reset').click();setView(roster.has('ember')?'ember':roster.has('axo')?'axo':roster.has('prism')?'prism':roster.has('mochi')?'mochi':roster.has('rift')?'portal':roster.has('solara')?'solara':roster.has('violet')?'hero':'overview');updateStats();}});roster.bind();
const viewer=document.querySelector('.viewer');
let desktopPlayStarted=false,fullscreenWanted=false,wasGamePointerLocked=false;
function expandGameViewport(expanded){
 viewer.classList.toggle('game-viewport-expanded',expanded);
 document.body.classList.toggle('game-viewport-lock',expanded);
}
function gameIsFullscreen(){
 return document.fullscreenElement===viewer||viewer.classList.contains('game-viewport-expanded');
}
function setGameFullscreen(enabled){
 fullscreenWanted=enabled;
 if(!enabled){
  expandGameViewport(false);
  if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();
  if(document.fullscreenElement===viewer)document.exitFullscreen?.()?.catch(()=>{});
  return;
 }
 if(!inputMode.desktop)expandGameViewport(true);
 if(!document.fullscreenElement){
  if(viewer.requestFullscreen)viewer.requestFullscreen().catch(()=>{if(fullscreenWanted)expandGameViewport(true);});
  else expandGameViewport(true);
 }
}
function startDesktopPlay(){
 if(!inputMode.desktop||desktopPlayStarted||!navigator.userActivation?.isActive)return;
 desktopPlayStarted=true;
 if(!gameIsFullscreen())setGameFullscreen(true);
}
window.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||!gameIsFullscreen()||document.querySelector('dialog[open]')||runner?.settingsOpen)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 if(!event.repeat)setGameFullscreen(false);
},true);
// Browsers may reserve the first Escape for pointer lock and omit the page's key event.
document.addEventListener('pointerlockchange',()=>{
 const locked=document.pointerLockElement===renderer.domElement;
 if(wasGamePointerLocked&&!locked&&inputMode.desktop&&gameIsFullscreen()&&document.hasFocus()
  &&controlledHero()&&!runner?.settingsOpen&&!document.querySelector('dialog[open]'))setGameFullscreen(false);
 wasGamePointerLocked=locked;
});
const evacuationBriefing=districtMode?new EvacuationBriefing({
 inputMode,defenseMode,liberationMode,combatOnly:mission1Mode,
 onStart:id=>{
  roster.apply(mission1Mode?[id]:evacuationTeam(id,roster.active),{persist:false});
  setView('overview');
  const mobileDefense=(defenseMode||liberationMode)&&!inputMode.desktop;
  if(!mobileDefense&&!gameIsFullscreen())viewport.scrollIntoView({block:'center'});
  const player=id==='lux'?lux.player:id==='violet'?hero.player:id==='rift'?portalHero.player:id==='ninja'?ninja:runner;
  player.enter(defenseMode?RELAY_INTRO:id==='lux'?{yaw:Math.PI}:undefined);
  if(liberationMode)missionRaiders.start(id,id==='lux'?lux:player);
  if(mobileDefense)setGameFullscreen(true);
  else startDesktopPlay();
 }
}):null;
const TITLE_WALK_SECONDS=4;
// Opening cinematic (title card over a CPU battle with the Walker) shared by Wave Defense and City
// Liberation. The CPU heroes patrol the district centre, so both stage the Walker there; Liberation hides
// its central supply depot until the mission starts.
const TITLE_STAGE={walker:{x:0,z:0},violet:[-17,31,6],ground:{x:12,y:.1,z:17},groundYaw:Math.PI,rift:[12,.1,-15]};
const setDepotVisible=on=>{const depot=liberationMode?missionRaiders?.options?.ui?.depot:null;if(depot)depot.visible=on;};
const openingTitle=defenseMode||liberationMode?new DefenseTitle({
 openingDelay:TITLE_WALK_SECONDS,subtitle:liberationMode?'City Liberation':'Wave Defense',
 actors:()=>({walker:robot,heroes:[runner,hero,portalHero]}),
 obstruction:(a,b)=>traceImpact(a,b,{sections:physics.chunks,ground:false,radius:.25}),
 rebuild:()=>resetDistrict(),
 leave:()=>{
  const url=new URL(location.href);
  url.searchParams.set('scene','battle');
  location.assign(url);
 },
 startRound:()=>{
  setDepotVisible(false);
  for(const actor of [runner,hero,portalHero])actor.setEnabled(true);
  ninja.setEnabled(false);
  const stage=TITLE_STAGE,violetStart=new THREE.Vector3(...stage.violet);
  robot.spawnOrigin={...stage.walker};robot.reset({yaw:Math.atan2(violetStart.x-stage.walker.x,violetStart.z-stage.walker.z)});
  robot.root.visible=true;robot.dead=false;robot.combatUnit.alive=true;
  robot.combatUnit.health=robot.combatUnit.maxHealth;
  positionGroundHeroes(stage.ground,stage.groundYaw);
  // Stage Violet in the opening shot and let the Walker patrol before it aims.
  hero.root.position.copy(violetStart);portalHero.root.position.set(...stage.rift);
  robot.weapon.reset({startupSeconds:TITLE_WALK_SECONDS});
  arsenal.reset({openingBeam:true});refreshUnitShapes();
 },
 enter:()=>{setDepotVisible(true);configureHeroes();setView('overview');evacuationBriefing.open();}
}):null;
function configureHeroes(){
 if($('play-lux'))$('play-lux').hidden=!roster.has('lux');
 if($('play-rift'))$('play-rift').hidden=!roster.has('rift');
 if($('play-violet'))$('play-violet').hidden=!roster.has('violet');
 lux?.setEnabled(roster.has('lux'));
 ninja.setEnabled(roster.has('ninja'));runner.setEnabled(roster.has('volt'));hero.setEnabled(roster.has('violet'));portalHero.setEnabled(roster.has('rift'));solara.setEnabled(roster.has('solara'));mochi.setEnabled(roster.has('mochi'));prism.setEnabled(roster.has('prism'));axo.setEnabled(roster.has('axo'));ember.setEnabled(roster.has('ember'));if(testingMode)positionTestingHeroes();
 else if(mission1Mode&&!loaded)positionDistrictHeroes();
 for(const b of document.querySelectorAll('[data-view]')){const id={hero:'violet',runner:'volt',portal:'rift',solara:'solara',mochi:'mochi',ninja:'ninja',prism:'prism',axo:'axo',ember:'ember'}[b.dataset.view];b.disabled=!!id&&!roster.has(id);}
 $('play-ninja').disabled=!roster.has('ninja');$('play-ninja').hidden=!roster.has('ninja');for(const b of document.querySelectorAll('[data-play-ninja]'))b.disabled=!roster.has('ninja');document.querySelector('.viewer').classList.toggle('has-rift',roster.has('rift'));$('play-runner').disabled=!roster.has('volt');for(const b of document.querySelectorAll('[data-play-runner]'))b.disabled=!roster.has('volt');
 $('portal-readout').hidden=!roster.has('rift');$('solara-readout').hidden=!roster.has('solara');$('hero-readout').hidden=!roster.has('violet');$('mochi-readout').hidden=!roster.has('mochi');document.querySelector('.viewer').classList.toggle('has-mochi',roster.has('mochi'));
}
const effectGeometry=new THREE.IcosahedronGeometry(1,0),smokeMat=new THREE.MeshBasicMaterial({color:'#595d59',transparent:true,opacity:.25,depthWrite:false}),flashMat=new THREE.MeshBasicMaterial({color:'#ffd19a'}),sparkMat=new THREE.MeshBasicMaterial({color:'#eaa96b'});
const buildingSmokePool=new THREE.InstancedMesh(effectGeometry,new THREE.MeshBasicMaterial({color:'#333936',transparent:true,opacity:.46,depthWrite:false}),160);
const walkerBeamImpact=new WalkerBeamImpact(scene);
const smokePool=new THREE.InstancedMesh(effectGeometry,smokeMat,180),flashPool=new THREE.InstancedMesh(effectGeometry,flashMat,50),sparkPool=new THREE.InstancedMesh(effectGeometry,sparkMat,140);for(const p of [smokePool,buildingSmokePool,flashPool,sparkPool]){p.count=0;p.frustumCulled=false;scene.add(p);}
const tracerPositions=new Float32Array(240*6),tracerGeo=new THREE.BufferGeometry();tracerGeo.setAttribute('position',new THREE.BufferAttribute(tracerPositions,3));tracerGeo.setDrawRange(0,0);const tracerLines=new THREE.LineSegments(tracerGeo,new THREE.LineBasicMaterial({color:'#ffcc81',transparent:true,opacity:.7}));scene.add(tracerLines);
const projectileGeo=new THREE.SphereGeometry(.12,6,4),rocketGeo=new THREE.ConeGeometry(.075,.8,6),projectileMat=new THREE.MeshBasicMaterial({color:'#ffe4b1'});
function feed(text){impactLog.unshift(text);impactLog=impactLog.slice(0,3);$('feed').innerHTML='<span>OBSERVATION FEED</span>'+impactLog.map(t=>'<p>'+t+'</p>').join('');}
const buildingSmoke=new BuildingSmoke({getBuildings:()=>physics?.buildings||[],emit:(point,intensity)=>{if(particles.length>=320)return;const life=5+rand();particles.push({kind:'buildingSmoke',buildingSmoke:true,p:new THREE.Vector3(point.x,point.y,point.z),v:new THREE.Vector3(.15+point.outwardX*.65+(rand()-.5)*.35,1.5+rand()*1.2,point.outwardZ*.65+(rand()-.5)*.35),life,max:life,size:.65+rand()*.35,scale:2.2+intensity*1.3});}});
function extract(g){g.scene.updateMatrixWorld(true);for(const name of ['wall_module','slab_module','column_module','rubble_module','tank_hull','tank_turret','helicopter_body','main_rotor','tail_rotor','parked_car']){const o=g.scene.getObjectByName(name);if(!o?.isMesh)throw Error('Missing Blender mesh '+name);kit[name]={geometry:o.geometry.clone().applyMatrix4(o.matrixWorld),material:o.material.clone()};}}
function teamGeometry(name,team){const geo=kit[name].geometry.clone(),c=geo.getAttribute('color');if(c){for(let i=0;i<c.count;i++){const r=c.getX(i),g=c.getY(i),b=c.getZ(i);if(r>.10&&r<.24&&g>.23&&g<.36&&b>.22&&b<.36)c.setXYZ(i,...(team===0?[.16,.36,.39]:[.61,.28,.13]));}c.needsUpdate=true;}return geo;}
function asset(name,team=null){const proto=kit[name];return new THREE.Mesh(team===null?proto.geometry:teamGeometry(name,team),proto.material);}
function addChunks(){
 if(assetCity){assetCity.install(scene,physics,layout.buildings,chunkBatches,buildingRecords);
  return;}
 const templates={wall:{geo:'wall_module',base:[2.5,3,.32]},slab:{geo:'slab_module',base:[2.5,.325,2.5]},column:{geo:'column_module',base:[.48,3,.48]}};const specs={wall:[],slab:[],column:[]};
 for(const b of layout.buildings){buildingRecords.set(b.id,b);mesh(unitBox,pavement,b.x,.06,b.z,12,.18,12);
  for(let f=0;f<b.floors;f++){
   for(let side=0;side<4;side++)for(let j=0;j<4;j++){const a=side*Math.PI/2,u=(j-1.5)*2.5;specs.wall.push({type:'wall',building:b.id,floor:f,x:b.x+5*Math.sin(a)+u*Math.cos(a),y:f*3+1.5,z:b.z+5*Math.cos(a)-u*Math.sin(a),yaw:a,size:[2.5,2.72,.32],tint:b.tint});}
   for(let x=0;x<3;x++)for(let z=0;z<3;z++)specs.slab.push({type:'slab',building:b.id,floor:f,x:b.x+(x-1)*10/3,y:(f+1)*3,z:b.z+(z-1)*10/3,yaw:0,size:[10/3,.28,10/3],tint:b.tint});
   for(const x of [-4.78,4.78])for(const z of [-4.78,4.78])specs.column.push({type:'column',building:b.id,floor:f,x:b.x+x,y:f*3+1.5,z:b.z+z,yaw:0,size:[.48,2.72,.48],tint:b.tint});
  }
 }
 for(const [type,list]of Object.entries(specs)){const tmpl=templates[type],o=new SpatialChunkBatch(scene,kit[tmpl.geo].geometry,kit[tmpl.geo].material,list,{buildingPosition:section=>buildingRecords.get(section.building)});o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);chunkBatches[type]=o;
  list.forEach((spec,i)=>{spec.index=i;spec.scale=spec.size.map((n,j)=>n/tmpl.base[j]);const c=physics.addChunk(spec);dummy.position.set(c.x,c.y,c.z);dummy.rotation.set(0,c.yaw,0);dummy.scale.set(...c.scale);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);o.setColorAt(i,new THREE.Color(c.tint));const hx=(c.yaw%(Math.PI)===0?c.size[0]:c.size[2])/2,hz=(c.yaw%(Math.PI)===0?c.size[2]:c.size[0])/2;c.bounds=new THREE.Box3(new THREE.Vector3(c.x-hx,c.y-c.size[1]/2,c.z-hz),new THREE.Vector3(c.x+hx,c.y+c.size[1]/2,c.z+hz));});o.seal?.();
 }
}
// Tint per instance: no extra materials or draw calls; retain scorching on debris.
function applyChunkTint(c){
 const batch=chunkBatches[c.visualKey||c.type];
 if(!batch)return;
 const tint=new THREE.Color(c.tint).multiplyScalar(Math.min(c.hasDetached ? .78 : 1,1-c.scorch));
 batch.setColorAt(c.index,tint);
 batch.instanceColor.needsUpdate=true;
}
function syncChunkColor(c){
 applyChunkTint(c);
 assetCity?.syncAttachments(c);
}
function buildingDamaged(chunk){
 syncChunkColor(chunk);
}
function updateRelayFlash(dt){
 if(defenseMode)missionRaiders?.updateRelayFlash(dt);
}
function syncChunk(c){const o=chunkBatches[c.visualKey||c.type];dummy.position.set(c.body.position.x,c.body.position.y,c.body.position.z);dummy.quaternion.set(c.body.quaternion.x,c.body.quaternion.y,c.body.quaternion.z,c.body.quaternion.w);dummy.scale.set(...c.scale);dummy.updateMatrix();o.setMatrixAt(c.index,dummy.matrix);o.instanceMatrix.needsUpdate=true;assetCity?.syncAttachments(c);}
function makeTanks(){for(let team=0;team<2;team++)for(let i=0;i<4;i++){
 const root=new THREE.Group(),hull=asset('tank_hull',team),turret=asset('tank_turret',team);hull.castShadow=turret.castShadow=true;hull.receiveShadow=turret.receiveShadow=true;root.add(hull);turret.position.y=1.52;root.add(turret);const stripe=new THREE.Mesh(new THREE.BoxGeometry(.8,.07,.4),team===0?teal:orange);stripe.position.set(0,.49,.3);turret.add(stripe);scene.add(root);const side=team===0?-1:1;root.position.set(side*(42+i*2.5),.1,[-2.8,2.8,-26.8,26.8][i]);root.rotation.y=team===0?Math.PI/2:-Math.PI/2;tanks.push({team,i,root,turret,start:root.position.clone(),cooldown:1.1+i*.65+team*.6,speed:.5+rand()*.2});
 }}
function makeHelicopters(){for(let team=0;team<2;team++)for(let i=0;i<2;i++){
 const root=new THREE.Group(),body=asset('helicopter_body',team),rotor=asset('main_rotor',team),tail=asset('tail_rotor',team);root.add(body,rotor,tail);rotor.position.y=1.25;tail.position.set(.18,.85,-4.7);tail.rotation.z=Math.PI/2;body.castShadow=true;const stripe=new THREE.Mesh(new THREE.BoxGeometry(.06,.5,1.4),team===0?teal:orange);stripe.position.set(1,.0,0);root.add(stripe);scene.add(root);helicopters.push({team,i,root,rotor,tail,phase:team*Math.PI+i*.7,cooldown:2.0+team+i*1.5,previous:new THREE.Vector3()});
 }}
function makeTroops(){soldierCrowd=new InfantryCrowd(scene,soldierParts,soldierMotion,{characterModel:humanoidModel,random:rand,getTarget:s=>robot?.combatUnit?.alive?robot.aimPoint(new THREE.Vector3(s.x,1.5,s.z),s.i):null,onShot:(from,to,team,soldier)=>{if(!robot?.combatUnit?.alive)return;const collision=traceWorld(from,to,{allied:true});const end=collision?new THREE.Vector3(collision.point.x,collision.point.y,collision.point.z):to;tracers.push({from,to:end,life:.10});particles.push({kind:'flash',p:from.clone(),v:new THREE.Vector3(),life:.075,max:.075,size:.13,scale:1});if(collision?.section)physics.impact(end,.35,.25,collision.section,{source:soldier?.combatUnit?.id||'infantry'});if(collision?.unit===robot.combatUnit){damageRobotHit(collision,2.2,'infantry',false,team);emitParticle('spark',end,1,.7);}}});troops.push(...soldierCrowd.soldiers);}
function addProps(){const cars=[];for(const b of layout.buildings){if(rand()>.55)cars.push({p:[b.x+6.3,.12,b.z+2],yaw:0,s:[.85,.85,.85]});}instanced(kit.parked_car.geometry,kit.parked_car.material,cars);
 const poles=[],arms=[],lamps=[];for(const x of [-24,0,24])for(const z of [-24,0,24])for(const s of [-1,1]){poles.push({p:[x+6.4*s,2.7,z+7],s:[.12,5.4,.12]});arms.push({p:[x+5.5*s,5.32,z+7],s:[1.9,.10,.10]});lamps.push({p:[x+4.7*s,5.2,z+7],s:[.6,.18,.36]});}instanced(unitBox,dark,poles);instanced(unitBox,dark,arms);instanced(unitBox,simple('#d8d2b1'),lamps);
 const blocks=[];for(const side of [-1,1])for(let i=0;i<5;i++)blocks.push({p:[side*8,.5,(i-2)*1.8],s:[.6,1,1.35],yaw:.1*side});if(!convoyMode)instanced(unitBox,simple('#7c8475'),blocks);
}
function addTerrain(){
 if(defenseMode)return;
 physics.addTerrainPyramid({x:50,z:39,height:3.8,slopeX:.6,slopeZ:.28});physics.addTerrainPyramid({x:-50,z:-39,height:3.2,slopeX:.55,slopeZ:.27});
 for(const sign of [-1,1]){const positions=[],colors=[],indices=[],xs=[];for(let x=43;x<=57;x++)xs.push(sign*x);const zs=[];for(let z=25;z<=53;z++)zs.push(sign*z);for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++){const x=xs[i],z=zs[j],y=terrainHeight(x,z);positions.push(x,y,z);const c=new THREE.Color(y>.5?'#849378':'#79887c');colors.push(c.r,c.g,c.b);if(i<xs.length-1&&j<zs.length-1){const n=j*xs.length+i;indices.push(n,n+xs.length,n+1,n+1,n+xs.length,n+xs.length+1);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const o=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,flatShading:true}));o.receiveShadow=true;scene.add(o);}
}
function bastionTest(){return evacuationReinforcement?.adapter.enabled?evacuationReinforcement.adapter:testingArena?.bastion?.enabled?testingArena.bastion:null;}
let traversalSections=null,traversalBoss=null,traversalCity=null;
function arenaSections(){const boss=bastionTest()?.boss;if(!boss||boss.dead)return physics.chunks;if(traversalBoss!==boss||traversalCity!==physics.chunks){traversalBoss=boss;traversalCity=physics.chunks;traversalSections=[...physics.chunks,...boss.sections];traversalSections.querySegment=(a,b,r)=>physics.chunks.querySegment(a,b,r).concat(boss.sections);}return traversalSections;}
function heroPlatforms(){
 const decks=bastionTest()?.boss.walkableDecks()||[];
 if(!convoyMode&&robot)decks.push(...robot.walkableDecks());
 for(const drone of activeRaiders()?.flightDrones||[]){
  if(drone.deck.isActive())decks.push(drone.deck);
 }
 return decks;
}
function heroRobot(){return argus||(evacuationReinforcement?.adapter.enabled&&!evacuationReinforcement.adapter.boss.dead?evacuationReinforcement.adapter.boss:null)||activeRaiders()?.getTarget()||robot;}
function chooseTarget(team,from,heli=false){
 if(robot?.combatUnit?.alive)return robot.aimPoint(from,team+(heli?1:0));
 return null;

}
const particleUp=new THREE.Vector3(0,1,0);
function emitParticle(kind,pos,count,scale=1,direction=null){for(let i=0;i<count;i++){if(particles.length>340)particles.shift();const smoke=kind==='smoke';particles.push({kind,p:pos.clone(),v:new THREE.Vector3((rand()-.5)*(smoke?2:7),smoke?1.3+rand()*2:rand()*5,(rand()-.5)*(smoke?2:7)).addScaledVector(direction||particleUp, direction?4+rand()*7:0),life:smoke?2+rand()*1.2:.30+rand()*.4,max:smoke?3.2:.7,size:smoke?.45+rand()*.55:.07+rand()*.10,scale});}}
function registerUnits(){unitDamage=new UnitDamage(disableUnit,(unit,damage,point,part)=>{if(defenseMode&&unit===missionRaiders?.relay)missionRaiders.flashRelay();if(unit.kind==='civilian')unit.entity.silhouetteHitUntil=simTime+.9;enemyDamageFlash.hit(unit,damage,unit===robot.combatUnit?robot.lastWeaponHitPart:part);});unitDamage.canDamage=(u,p)=>{if(openingTitle?.active&&(u===missionRaiders?.relay||u===robot.combatUnit&&robot.weapon.bursts===0))return false;if(ninja?.smoke.protectsUnit(u)){ninja.smoke.absorb();return false;}return true;};for(const t of tanks)unitDamage.add('tank-'+t.team+'-'+t.i,'tank',t);for(const h of helicopters)unitDamage.add('helicopter-'+h.team+'-'+h.i,'helicopter',h);for(const t of troops)unitDamage.add('infantry-'+t.team+'-'+t.i,'infantry',t);unitDamage.add('siege-walker','robot',robot,robot.weapons.maxHealth);refreshUnitShapes();}
function refreshUnitShapes(){if(!unitDamage)return;for(const u of unitDamage.units){if((defenseMode||liberationMode)&&u===robot.combatUnit&&!robot.root.visible){u.shapes=[];continue;}if(testingArena&&u===robot.combatUnit&&!testingArena.walkerEnabled){u.shapes=[];continue;}if(u.entity.evac)continue;const e=u.entity,old=u.shapes;let next=[];if(u.kind==='robot')next=robot.shapes();else if(u.kind==='infantry'){const crouched=e.clip.includes('Crouch'),height=(crouched?(e.character?1.64:1.47):1.86)*e.scale;if(e.disabled)next=[{center:{x:e.x,y:.30,z:e.z+(e.team===0?1:-1)*.65},half:{x:.38,y:.30,z:1.0},rotation:{x:0,y:0,z:0,w:1}}];else next=[{center:{x:e.x,y:e.y+height/2,z:e.z},half:{x:.32*e.scale,y:height/2,z:.48*e.scale},rotation:{x:0,y:Math.sin((e.team===0?1:-1)*Math.PI/4),z:0,w:Math.cos(Math.PI/4)}}];}else{e.root.updateMatrixWorld(true);const box=(offset,half)=>{const c=e.root.localToWorld(new THREE.Vector3(...offset));return{center:{x:c.x,y:c.y,z:c.z},half,rotation:{x:e.root.quaternion.x,y:e.root.quaternion.y,z:e.root.quaternion.z,w:e.root.quaternion.w}};};next=u.kind==='tank'?[box([0,1.05,0],{x:1.75,y:1.05,z:2.3})]:[box([0,.10,.1],{x:1.1,y:1.05,z:2.25}),box([0,.55,-3.8],{x:.40,y:.5,z:1.8})];}next.forEach((shape,i)=>{const previous=shape.part?old.find(s=>(s.colliderId||s.part)===(shape.colliderId||shape.part)):old[i];shape.previousCenter=u.dashSweep?.[i]||previous?.center||shape.center;});u.shapes=next;}}
function charUnit(root,restore=false){root.traverse(o=>{if(!o.isMesh)return;if(restore&&o.userData.originalCombatMaterial){o.material.dispose();o.material=o.userData.originalCombatMaterial;delete o.userData.originalCombatMaterial;}else if(!restore&&!o.userData.originalCombatMaterial){o.userData.originalCombatMaterial=o.material;o.material=o.material.clone();o.material.color.multiplyScalar(.25);}});}
function disableUnit(unit,point){if(unit.entity===evacuationReinforcement?.adapter.boss){unit.entity.defeat();return;}if(argus?.disable(unit)||convoy?.disable(unit)||testingArena?.disable(unit)||evacuation?.disable(unit)||missionRaiders?.disable(unit))return;if(unit.kind==='robot'){robot.destroy();evacuation?.endEvacuation();feed(evacuation?'Siege Walker destroyed · Chinook withdrawing.':liberationMode||defenseMode?'Siege Walker defeated.':mission1Mode?'Siege Walker defeated. Watch for reinforcements.':'Siege Walker weapons destroyed. Both divisions hold fire.');return;}const e=unit.entity;if(unit.kind==='infantry')soldierCrowd.disable(e);else{charUnit(e.root);e.smokeTimer=0;if(unit.kind==='helicopter'){e.returning=null;e.root.visible=true;e.wreck=physics.addWreck({position:e.root.position,quaternion:e.root.quaternion,size:[2.0,1.6,4.2],mass:2800});}}feed(unit.kind.toUpperCase()+' disabled.');}
// Feedback-only hit proxies; hero health/death and movement remain owned by their existing controllers.
const playerHitProxies=new WeakMap();
function playerHitTargets(){const h=runner?.active?runner:ninja?.active?ninja:hero?.active?hero:lux?.active?lux:portalHero?.active?portalHero:null;if(!h||h.enabled===false||h.dash?.active||h.motion?.dash)return[];h.root.updateWorldMatrix(true,false);const center=h.root.localToWorld(new THREE.Vector3(0,1.3,0));let u=playerHitProxies.get(h);if(!u){u={id:'controlled-'+(h===runner?'volt':h===hero?'violet':h===lux?'lux':h===portalHero?'rift':'kage'),kind:'hero',entity:h,alive:true,shapes:[],time:-1};playerHitProxies.set(h,u);}const old=u.shapes[0];let previous=old?.previousCenter||center;if(u.time!==simTime){previous=old?.center||center;u.time=simTime;}if(new THREE.Vector3().copy(previous).distanceTo(center)>8)previous=center;u.shapes=[{center,previousCenter:previous,half:{x:.55,y:1.1,z:.5},rotation:h.root.quaternion.clone()}];return[u];}
function playerBlastFeedback(point,radius,power,direct=null){
 for(const u of playerHitTargets()){
  if(mochi?.protects(u))continue;
  const s=u.shapes[0],directHit=u.entity===direct?.entity;
  if(!directHit&&segmentBoxFraction(point,point,s.center,s.half,s.rotation,radius)===null)continue;
  const delta=s.center.clone().sub(new THREE.Vector3().copy(point));
  const start=new THREE.Vector3().copy(point).addScaledVector(delta.clone().normalize(),.04);
  if(!directHit&&traceImpact(start,s.center,{sections:physics.chunks.filter(c=>c.state==='intact'),ground:false,radius:0}))continue;
  const damage=directHit?power:power*.65*Math.max(0,1-Math.max(0,delta.length()-Math.max(s.half.x,s.half.y,s.half.z))/radius);
  if(damage>0&&!absorbDirectionalBarrier(u.entity,point,s.center,damage))u.entity.receiveEyeHit(point,damage);
 }
}
function argusOwner(owner){return owner==='argus'||!!owner?.startsWith('argus-');}
function traceWorld(from,to,{radius=0,owner=null,moving=false,allied=false,includeMissiles=true,livingOnly=false,ignoreEnemies=false,skipUnits=null,includeVoltOrb=false,extraTargets=[]}={}){const hit=traceImpact(from,to,{sections:physics.chunks,targets:(unitDamage?.units||[]).filter(u=>(!livingOnly||u.alive)&&!skipUnits?.has(u)&&(!argusOwner(owner)||u.kind!=='robot')&&(!ignoreEnemies||u.kind!=='robot')&&(!allied||u.kind==='robot')).concat(owner==='siege-walker'||argusOwner(owner)?playerHitTargets():[],extraTargets),ignoreUnit:owner,radius,movingTargets:moving}),terrain=traceTerrain(from,to,radius);let nearest=terrain&&(!hit||terrain.t<hit.t)?terrain:hit;const orb=!owner||!owner.startsWith('siege-walker')&&!owner.startsWith('evac-raider')&&!argusOwner(owner)?bastionTest()?.boss.projectiles.trace(from,to,radius):null;if(orb&&(!nearest||orb.t<nearest.t))nearest=orb;const missile=includeMissiles?robotMissiles?.trace(from,to,radius):null;if(missile&&(!nearest||missile.t<nearest.t))nearest=missile;const friendly=includeVoltOrb?runner?.storm?.trace(from,to,radius):null;if(friendly&&(!nearest||friendly.t<nearest.t))nearest=friendly;if(owner==='siege-walker'||owner?.startsWith('evac-raider')||argusOwner(owner))nearest=mochi?.blockTrace(from,to,nearest,radius)||nearest;return nearest;}
function raiderHeroTargets(){
 if(testingArena)return testingArena.heroUnits();
 const heroes=[runner,hero,solara,portalHero,mochi,ninja,prism,axo,ember];if(lux)heroes.push(lux);
 if(evacuation)return evacuation.heroUnits(heroes);
 return mission1Mode?districtHeroUnits(missionHeroTargets,heroes):[];
}
let defenseUpgradePanel=null;
function closeDefenseUpgrade(){
 defenseUpgradePanel?.remove();
 defenseUpgradePanel=null;
 hero?.player?.clear();portalHero?.player?.clear();lux?.player.clear();runner?.clearInput();ninja?.clearInput();keys.clear();
}
function openDefenseUpgrade(mission){
 const panel=document.createElement('dialog');
 panel.className='evac-briefing defense-upgrade';
 panel.setAttribute('aria-labelledby','defense-upgrade-title');
 panel.innerHTML='<div class="evac-briefing-inner"><h2 id="defense-upgrade-title">Choose an upgrade</h2><p data-upgrade-countdown hidden></p><div class="defense-upgrade-options"></div></div>';
 const choices=panel.querySelector('.defense-upgrade-options');
 const heroId=roster.has('volt')?'volt':roster.has('ninja')?'ninja':roster.has('violet')?'violet':null;
 for(const option of DEFENSE_UPGRADES){
  if(option.hero&&option.hero!==heroId)continue;
  const button=document.createElement('button');
  button.innerHTML='<strong>'+option.title+'</strong><span>'+option.detail+'</span>';
  button.disabled=mission.upgrades.has(option.id);
  if(button.disabled)button.append(' · Equipped');
  button.onclick=()=>{
   if(!mission.chooseUpgrade(option.id,heroId))return;
   closeDefenseUpgrade();
   feed(option.title+' selected.');
   if(runner?.active)runner.requestMouseLock();
   if(ninja?.active)ninja.requestLock();if(hero?.active)hero.player.lock();if(portalHero?.active)portalHero.player.lock();if(lux?.active)lux.player.lock();
   defenseStatus(mission);
  };
  choices.append(button);
 }
 const skip=document.createElement('button');
 skip.textContent='Skip upgrade';
 skip.onclick=()=>{
  mission.upgradePending=false;
  closeDefenseUpgrade();
  if(runner?.active)runner.requestMouseLock();
  if(ninja?.active)ninja.requestLock();if(hero?.active)hero.player.lock();if(portalHero?.active)portalHero.player.lock();if(lux?.active)lux.player.lock();
 };
 choices.append(skip);
 panel.addEventListener('cancel',event=>{event.preventDefault();skip.click();});
 document.querySelector('.viewer').append(panel);
 defenseUpgradePanel=panel;
 hero?.player?.clear();portalHero?.player?.clear();lux?.player.clear();runner?.clearInput();ninja?.clearInput();keys.clear();
 if(document.pointerLockElement)document.exitPointerLock();
 panel.showModal();
}
function defenseStatus(mission){
 const hud=$('defense-hud'),timer=$('defense-countdown');
 hud.hidden=false;
 const state=mission.phase==='waiting'?'Preparing':mission.phase==='launching'?(mission.launchElapsed<EVAC_ROCKET.ignition?'Thrusters igniting':'Liftoff'):'Wave '+mission.wave+' / 3';
 const text=mission.phase==='reinforcements'
  ?'ROCKET CLEAR · '+(mission.victoryRemaining!==null?'BASTION DEFEATED':evacuationReinforcement?.adapter.enabled?'DEFEAT THE BASTION':'BASTION INBOUND')
  :'EVAC ROCKET · '+Math.ceil(100*mission.relay.health/mission.relay.maxHealth)+'% · '+state;
 if(hud.textContent!==text)hud.textContent=text;
 timer.hidden=mission.ended||mission.remaining<=0;
 const countdown=mission.nextWaveLabel+' in '+Math.ceil(mission.remaining)+'s';
 if(timer.textContent!==countdown)timer.textContent=countdown;
 const bossHUD=document.querySelector('.boss-health-hud');
 const bastion=evacuationReinforcement?.adapter.enabled;
 const walkerPresent=mission.wave===3&&!mission.walker.dead&&mission.walker.root.visible;
 document.querySelector('.robot-readout').hidden=!walkerPresent;
 bossHUD.hidden=mission.phase==='reinforcements'?!bastion:!walkerPresent;
 const bossLabel=bastion?'THE BASTION':'SIEGE WALKER · WEAPONS';
 if(bossHUD.querySelector('b').textContent!==bossLabel)bossHUD.querySelector('b').textContent=bossLabel;
 if(mission.upgradePending&&!defenseUpgradePanel)openDefenseUpgrade(mission);
 else if(!mission.upgradePending&&defenseUpgradePanel)closeDefenseUpgrade();
 const modalTimer=defenseUpgradePanel?.querySelector('[data-upgrade-countdown]');
 if(modalTimer&&mission.phase==='intermission'){
  modalTimer.hidden=false;
  if(modalTimer.textContent!==countdown)modalTimer.textContent=countdown;
 }
}
function defenseResult(won){
 if(!won)robotDeathEffects.explode(new THREE.Vector3(RELAY.x,6,RELAY.z),{large:true});
 hero?.player?.exit();portalHero?.player?.exit();lux?.player.exit();runner?.exit();ninja?.exit();
 const panel=document.createElement('dialog');
 panel.id='defense-result';panel.className='evac-briefing';
 panel.innerHTML='<div class="evac-briefing-inner"><h2>'+(won?'Evacuation secured':'Evacuation rocket destroyed')+'</h2><p>'+(won?'The rocket escaped and the Bastion was defeated.':'The evacuation rocket was lost before it cleared the city.')+'</p><button>Play again</button></div>';
 document.querySelector('.viewer').append(panel);
 panel.addEventListener('cancel',e=>e.preventDefault());
 panel.querySelector('button').onclick=()=>{
  if(won){location.reload();return;}
  panel.close();
  setView('overview');
  evacuationBriefing.open('choose');
  resetDistrict();
 };
 panel.showModal();
}
function districtVisible(a,b){
 return !traceImpact(a,b,{sections:physics.chunks,ground:false})&&!traceTerrain(a,b);
}
function isRooftopHero(unit){
 const feet=unit.entity?.root?.position;
 if(!feet||feet.y<terrainHeight(feet.x,feet.z)+2.6)return false;
 const from=feet.clone().addScaledVector(new THREE.Vector3(0,1,0),.12),to=feet.clone();
 to.y-=4;
 const sections=physics.chunks.querySegment(from,to,0).filter(c=>c.type==='slab'&&c.state==='intact'&&!c.hasDetached);
 return !!traceImpact(from,to,{sections,ground:false,radius:0});
}
function walkerAware(unit){
 return unit.kind!=='hero'||robot.isAlertedTo(unit.entity)||inFrontOfEnemy(robot.root,unit.shapes[0]?.center);
}
function missionWalkerTargets(weapon='beam'){
 const origin=robot.root.position.clone().add(new THREE.Vector3(0,18,0));
 if(openingTitle?.active){
  if(openingTitle.time<TITLE_WALK_SECONDS)return [];
  const targets=raiderHeroTargets();
  const violet=targets.find(u=>u.entity===hero);
  return robot.weapon.bursts===0&&violet?[violet]:targets;
 }
 if(defenseMode){
  const player=controlledHero();
  const nearbyPlayer=player&&(robot.isAlertedTo(player)||inFrontOfEnemy(robot.root,player.root.position));
  return missionRaiders.walkerTargets(origin,EVACUATION_CONFIG.walkerTargetRange,weapon,nearbyPlayer?player.root.position:null,weapon==='plasma'?WALKER_SNIPER.range:undefined,walkerAware);
 }
 return raiderHeroTargets().filter(walkerAware).filter(u=>origin.distanceTo(u.shapes[0].center)<=(weapon==='plasma'?WALKER_SNIPER.range:EVACUATION_CONFIG.walkerTargetRange)&&districtVisible(origin,u.shapes[0].center));
}
function bastionDeathBlast(point,options){
 robotDeathEffects.explode(point,options);
 emitParticle('spark',point,options.ground?36:18,options.ground?3:1.7);
 if(options.ground){
  emitParticle('smoke',point,24,5);
  if(point.distanceTo(camera.position)<120)droneImpactShake=Math.max(droneImpactShake,.85);
 }
}
function registerRobotWreck(wreck){
 robotDeathEffects.part(wreck);
 physics.trackRobotWreck(wreck.body,()=>{
  robotDeathEffects.removePart(wreck.body);
  wreck.group?.removeFromParent();
 },{grounded:wreck.grounded});
}
function droneCombatOptions(){
 return {
  physics,particle:emitParticle,audio:()=>runner?.feedback.audio,groundHeight:terrainHeight,
  visible:(a,b)=>defenseMode?districtVisible(a,b):!traceImpact(a,b,{sections:physics.chunks,ground:false}),
  roof:(a,b)=>traceImpact(a,b,{sections:physics.chunks,ground:false})?.point,
  trace:traceDroneRound,redirect:(p,a,b)=>portalHero?.redirect(p,a,b),
  onRoundHit:droneRoundHit,onWreck:registerRobotWreck,
  onRemoveSmoke:body=>robotDeathEffects.removePart(body),
  burst:(p,scale,air)=>missileExplosions.burst(p,{scale,air}),
  cameraImpact:(p,speed)=>{if(p.distanceTo(camera.position)<52)droneImpactShake=Math.min(1,speed*.056);}
 };
}
function traceDroneRound(a,b,_owner,radius){
 const active=controlledHero();
 const targets=raiderHeroTargets().filter(u=>u.entity!==active).concat(playerHitTargets());
 if(defenseMode&&missionRaiders?.relay.alive)targets.push(missionRaiders.relay);
 let hit=traceImpact(a,b,{sections:physics.chunks,targets,radius,movingTargets:true});
 const terrain=traceTerrain(a,b,radius);
 if(terrain&&(!hit||terrain.t<hit.t))hit=terrain;
 for(const barrier of hero?.barriers()||[]){
  const shield=shieldBeamIntersection(a,b,barrier,radius);
  if(shield&&(!hit||shield.t<hit.t))hit={kind:'shield',barrier,...shield};
 }
 return mochi?.blockTrace(a,b,hit,radius)||hit;
}
function droneRoundHit(hit,power){
 const point=new THREE.Vector3().copy(hit.point);
 if(hit.barrier)hit.barrier.onHit?.(point,power);
 else if(defenseMode&&hit.unit===missionRaiders?.relay)unitDamage.hurt(hit.unit,power,point);
 else if(hit.unit?.alive&&unitDamage.canDamage(hit.unit,point))hit.unit.entity.receiveEyeHit?.(point,power);
 if(hit.section)physics.damageChunk(hit.section,power*.12,{source:'combat-drone'});
 emitParticle('spark',point,3,.55);
}
function traceVioletBarrier(a,b,hit,radius){
 for(const barrier of hero?.barriers()||[]){
  const shield=frontBarrierHit(a,b,barrier,radius);
  if(shield&&(!hit||shield.t<hit.t))hit={kind:'shield',...shield};
 }
 return hit;
}
function traceRaiderProjectile(a,b,owner,radius=RAIDER_COMBAT.projectileRadius){
 let hit=traceImpact(a,b,{sections:physics.chunks,targets:[...unitDamage.units.filter(u=>u.alive&&!u.id.startsWith('evac-raider')&&(!mission1Mode||!u.id.startsWith('combat-drone-'))&&(!evacuationReinforcement?.adapter.enabled||u.kind!=='robot')),...raiderHeroTargets()],ignoreUnit:owner,radius});
 if(owner==='bastion')hit=traceVioletBarrier(a,b,hit,radius);
 else for(const barrier of hero?.barriers()||[]){
  const shield=shieldBeamIntersection(a,b,barrier,radius);
  if(shield&&(!hit||shield.t<hit.t))hit={kind:'shield',barrier,...shield};
 }
 return mochi?.blockTrace(a,b,hit,radius)||hit;
}
function absorbBubble(hit,p){if(hit?.kind!=='bubble-shield')return false;hit.barrier.onHit(p);mochi.sparkle(new THREE.Vector3(p.x,p.y,p.z),12);return true;}
// Precise direct hits route to the armor part and its independent weapon durability.
function ninjaHit(hit,power,kind,player=false){
 if(hit.orb)return{damage:bastionTest().boss.applyHit(hit,power,kind),killed:true};
 const target=hit.missile||hit.unit,alive=!!target?.alive;let damage=0;
 if(hit.missile)damage=robotMissiles.hurt(hit.missile,power,'ninja');
 else if(hit.unit?.kind==='robot'&&alive)damage=damageRobotHit(hit,power,kind,player);
 else if(hit.section)physics.impact(new THREE.Vector3().copy(hit.point),kind==='ninja-dash'?6:1,.5,hit.section,{source:'kage'});
 return{damage,killed:alive&&!target.alive};
}
function alertAfterPlayerHit(unit,attacker){
 alertEnemiesToAttacker(unit,attacker,unitDamage.units);
}
function droneEngineHealth(hit){
 return hit.unit?.entity?.engines?.find(engine=>engine.id===hit.part)?.health;
}
function damageRobotHit(hit,power,kind,player=false,team=null){
 const bastion=bastionTest()?.boss;
 if(liberationMode&&player)power=missionRaiders.attackPower(hit,power,kind);
 const bastionHit=hit.orb||bastion&&hit.unit?.entity===bastion;
 const engineHealth=droneEngineHealth(hit);
 const damage=bastionHit
  ?bastion.applyHit(hit,power,kind+'-'+(kind==='electric'?'dash-'+runner.dash.dashes:simTime))
  :unitDamage.hurt(hit.unit,power,hit.point,hit.part);
 if(player&&(damage>0||droneEngineHealth(hit)<engineHealth))alertAfterPlayerHit(hit.unit,controlledHero());
 if(liberationMode&&player)missionRaiders.onHit(hit,damage);
 if(!bastionHit)hit.unit.entity.recordHit(kind,team,damage);
 if(kind==='laser-grind'&&damage>0&&hit.unit){
  enemyDamageFlash.emphasize(hit.unit,hit.unit.entity===robot?robot.lastWeaponHitPart:hit.part);
 }
 return damage;
}

function violetSplash(origin,radius,direct=null){
 return massContacts(origin,unitDamage.units,radius).filter(({unit,point})=>{
  if(unit===direct)return false;
  const start=origin.clone().addScaledVector(point.clone().sub(origin).normalize(),.04);
  return !traceImpact(start,point,{sections:physics.chunks,ground:false,radius:0});
 });
}

function violetOrbImpact(hit,point,{damage,radius}){
 const contacts=violetSplash(point,radius,hit.unit);
 let dealt=0;
 if(hit.orb||hit.unit?.kind==='robot')dealt+=damageRobotHit(hit,damage,'force',hero.active);
 if(hit.missile)dealt+=robotMissiles.hurt(hit.missile,damage,'violet');
 for(const target of contacts){
  dealt+=damageRobotHit(target,damage*.65*(1-target.distance/radius),'force-splash',hero.active);
 }
 if(hit.section){
  const charge=THREE.MathUtils.inverseLerp(VIOLET_ORB.minDamage,VIOLET_ORB.maxDamage,damage);
  const buildingPower=THREE.MathUtils.lerp(VIOLET_ORB.minBuildingDamage,VIOLET_ORB.maxBuildingDamage,charge);
  physics.impact(point,buildingPower,radius,hit.section,{player:hero.active,source:'violet-sentinel'});
  emitParticle('smoke',point,3,.4);
 }
 return dealt;
}

function violetPowerHit(hit,point,power){
 if(hit.orb||hit.unit?.kind==='robot')return damageRobotHit(hit,power,'force-beam',hero.active);
 if(hit.missile)return robotMissiles.hurt(hit.missile,power,'violet');
 const section=hit.section;
 if(!section||section.collisionDisabled||section.state!=='intact')return 0;
 const before=section.hp;
 physics.damageChunk(section,power*VIOLET_BEAM.buildingDamageScale,{source:'violet-sentinel'});
 if(before>0&&section.hp<=0){
  physics.queueDetach(section,point,1.5,'beam');
  physics.checkSupports(section.building);
  emitParticle('spark',point,8,1);
 }
 return before-section.hp;
}

function criticalMassBurst(origin,power){
 runner?.storm?.rechargeBlast(origin,power.radius,power.damage);const hits=[];for(const contact of massContacts(origin,unitDamage.units,power.radius)){
  const point=contact.point,direction=point.clone().sub(origin),start=origin.clone().addScaledVector(direction.clone().normalize(),.04);if(traceImpact(start,point,{sections:physics.chunks,ground:false,radius:.02}))continue;
  const raw=power.damage*(1-(1-CRITICAL_MASS.edgeMultiplier)*contact.distance/power.radius),hit={kind:'unit',unit:contact.unit,part:contact.part,point},damage=damageRobotHit(hit,raw,'critical-mass',true);
  if(damage<=0)continue;const target=contact.unit.entity,boss=target===robot||target===argus||target===bastionTest()?.boss;
  if(power.powerful&&contact.unit.alive){const seconds=boss?(power.critical?CRITICAL_MASS.criticalBossStagger:CRITICAL_MASS.bossStagger):(power.critical?CRITICAL_MASS.criticalStagger:CRITICAL_MASS.powerfulStagger);if(target===robot){arsenal?.interrupt(robot,robotMissiles,walkerSniper);eyeBeams?.cycle.cancel();robot.stun(seconds,'critical-mass');}else if(target.interrupt)target.interrupt(seconds);else target.stun?.(seconds,'critical-mass');}else if(!boss&&contact.unit.alive)target.startFlinch?.(false,point);
  emitParticle('spark',point,8+Math.round(power.level*12),.7+power.level);runner.fx.damageEffect.notify({...hit,damage},origin);hits.push({...hit,damage});
 }
 return hits;
}

function explosion(point,power,radius,kind,isPlayer=false,collision=null,owner=null,threatId=null){if(absorbBubble(collision,point))return;if(collision?.missile){robotMissiles.hurt(collision.missile,power*4,'other');return;}const blastDamage=kind==='rocket'?68:kind==='pulse'?24:80;const walkerMissile=kind==='rocket'&&owner==='siege-walker',blastRadius=walkerMissile?WALKER_MISSILE_UNIT_BLAST_RADIUS:radius+1.8;if(owner==='siege-walker'||argusOwner(owner))playerBlastFeedback(point,blastRadius,blastDamage,collision?.unit);weaponImpacts[kind]++;if(isPlayer){playerHits++;if(collision?.kind==='building')playerBuildingHits++;if(collision?.kind==='unit')playerUnitHits++;}if(isPlayer&&collision?.section){const c=collision.section,matrix=new THREE.Matrix4();chunkBatches[c.visualKey||c.type].getMatrixAt(c.index,matrix);lastPlayerDamage={section:c,before:new THREE.Vector3().setFromMatrixPosition(matrix).toArray(),state:c.state};}physics.impact(point,power,radius,collision?.section||null,{player:isPlayer,source:owner});const direct=collision?.unit||null;const damage=unitDamage.blast(point,{direct,directPart:collision?.part,power:blastDamage,radius:blastRadius,exclude:pilot?.active?.combatUnit?.id||owner,filter:u=>u.id!==owner&&(!argusOwner(owner)||u.kind!=='robot')&&(isPlayer||owner==='siege-walker'||argusOwner(owner)||u.kind==='robot')&&(!(owner==='siege-walker'||owner?.startsWith('evac-raider')||argusOwner(owner))||!mochi?.protects(u))});runner?.dash.rescues.impact(threatId,point,blastRadius);for(const d of damage)if(d.unit.kind==='robot')robot.recordHit(kind,(unitDamage.units.find(u=>u.id===owner)?.entity.team||0),d.damage);if(kind==='rocket')missileExplosions.burst(point,{scale:walkerMissile?2.5:1.25});else{emitParticle('smoke',point,7,.65);emitParticle('spark',point,14);particles.push({kind:'flash',p:point.clone(),v:new THREE.Vector3(),life:.23,max:.23,size:radius*.5,scale:1});}if(isPlayer){const result=damage.find(d=>d.unit===direct)||damage[0];pilot?.recordImpact({kind:collision?.kind||'ground',unit:result?.unit,disabled:result?.disabled||false,building:collision?.section?.building});}if(physics.impacts%3===1)feed((kind==='rocket'?'Rocket':kind==='pulse'?'Walker cannon':'Tank shell')+' impact · '+(collision?.unit?.kind||collision?.section?.building||'ground')+'.');}
function portalThreats(){const live=projectiles.filter(p=>p.life>0&&(p.player||p.owner==='siege-walker')).map(p=>({id:p.id,alive:true,position:p.mesh.position,velocity:p.dir.clone().multiplyScalar(p.speed),speed:p.speed,owner:p.owner,blastRadius:3.8}));for(const m of robotMissiles?.missiles||[])if(m.alive)live.push({id:m.id,alive:true,position:m.position,velocity:m.velocity,speed:m.speed,owner:'siege-walker',target:m.target,homing:true,lockLost:!!m.lockLost,age:m.age,blastRadius:WALKER_MISSILE_UNIT_BLAST_RADIUS});for(const b of activeRaiders()?.bolts||[])live.push({id:b.id,alive:b.life>0,position:b.mesh.position,velocity:b.dir.clone().multiplyScalar(b.speed??RAIDER_COMBAT.projectileSpeed),speed:b.speed??RAIDER_COMBAT.projectileSpeed,radius:b.radius??RAIDER_COMBAT.projectileRadius,owner:b.owner,blastRadius:0});live.push(...(walkerSniper?.threats()||[]));return live;}
function portalExitClear(p,unit){const radius=unit.kind==='tank'?2.8:.85;if(layout.buildings.some(b=>!physics.buildings.get(b.id)?.collisionDisabled&&Math.abs(p.x-b.x)<5.2+radius&&Math.abs(p.z-b.z)<5.2+radius))return false;const center={x:p.x,y:p.y+(unit.kind==='tank'?1.1:1),z:p.z};if(traceImpact(center,center,{sections:physics.chunks,targets:unitDamage.units.filter(u=>u.alive&&u!==unit),radius,ground:false}))return false;for(const t of portalThreats()){if(t.impactPoint){if(Math.hypot(p.x-t.impactPoint.x,p.z-t.impactPoint.z)<t.blastRadius+radius+1)return false;continue;}const end={x:t.position.x+t.velocity.x*2,y:t.position.y+t.velocity.y*2,z:t.position.z+t.velocity.z*2};if(segmentBoxFraction(t.position,end,center,{x:radius+3,y:2,z:radius+3})!==null)return false;}return true;}
function teleportFriendly(unit,destination){if(!unit.alive||unit.dashCarried)return false;const e=unit.entity;if(unit.kind==='tank'){e.root.position.set(destination.x,.1,destination.z);e.root.updateMatrixWorld(true);}else if(unit.kind==='infantry'){e.x=destination.x;e.y=.035;e.z=destination.z;soldierCrowd.renderSoldier(e);for(const b of soldierCrowd.batches)for(const mesh of Object.values(b))mesh.instanceMatrix.needsUpdate=true;}else if(unit.kind==='civilian'){civilianScene().relocateCivilian(e,destination);}else return false;unit.shapes=[];for(const m of robotMissiles.missiles)if(m.alive&&m.target===unit)m.lockLost=true;refreshUnitShapes();civilianScene()?.sync();return true;}
function moveDashAlly(unit,p){if(!unit.alive)return;unit.dashSweep??=unit.shapes.map(s=>({...s.center}));const e=unit.entity;if(unit.kind==='civilian'){civilianScene().moveCarriedCivilian(e,p);}else if(unit.kind==='tank'){e.root.position.set(p.x,p.y,p.z);e.root.updateMatrixWorld(true);}else{e.x=p.x;e.y=p.y;e.z=p.z;}}
function portalTravelPositions(){const result=[];for(const b of [...layout.buildings].sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z)).slice(0,6)){const l=Math.hypot(b.x,b.z)||1,x=b.x-b.x/l*3.1,z=b.z-b.z/l*3.1,roof=traceImpact({x,y:b.floors*3+1,z},{x,y:b.floors*3-.5,z},{sections:physics.chunks.filter(c=>c.building===b.id&&c.type==='slab'&&c.state==='intact'&&c.hp>0),ground:false,radius:0});if(roof)result.push({x,y:roof.point.y,z});}return result;}
function sniperImpact(point,hit,id){
 const power=WALKER_SNIPER.damage;
 emitParticle('spark',point,16,1.25);
 particles.push({kind:'flash',p:point.clone(),v:new THREE.Vector3(),life:.15,max:.15,size:1.8,scale:1});
 if(hit.kind==='shield'&&hit.barrier.onHit?.(point,power)!==false)return true;
 if(absorbBubble(hit,point))return true;
 if(hit.kind==='ice-barrier'&&hit.barrier.onHit(point,{id,target:point})!==false)return true;
 const unit=hit.unit;
 if(unit?.kind==='hero'){if(!unitDamage.canDamage(unit,point))return true;unit.entity.receiveEyeHit?.(point,power);}
 else if(unit&&unit.kind!=='robot'&&unit.id!==pilot?.active?.combatUnit?.id)unitDamage.hurt(unit,power,point,hit.part);
 if(hit.section)physics.impact(point,24,1.6,hit.section,{source:'siege-walker'});
 weaponImpacts.plasma++;
 runner?.dash.rescues.impact(id,point,WALKER_SNIPER.radius);
 return false;
}
function portalBoltHit(hit,p,power=8){if(hit.orb)return bastionTest().boss.applyHit(hit,power,'portal-'+simTime);if(hit.missile)return robotMissiles.hurt(hit.missile,power,'rift');if(hit.unit?.kind==='robot'&&hit.unit.alive){return damageRobotHit(hit,power,'portal',!!portalHero?.active);}if(hit.section)physics.impact(p,2,.5,hit.section,{source:'rift-warden'});return 0;}
function phaseDashAlly(unit,phased){
 const e=unit.entity;if(unit.kind==='tank'){if(phased)unit.dashWasVisible=e.root.visible;e.root.visible=phased?false:unit.alive&&unit.dashWasVisible!==false;if(!phased)delete unit.dashWasVisible;}
 if(phased){for(const m of robotMissiles?.missiles||[])if(m.alive&&m.target===unit)m.lockLost=true;}
 else{delete unit.dashSweep;unit.shapes=[];}
 if(unit.kind==='infantry'){soldierCrowd.renderSoldier(e);for(const mesh of Object.values(soldierCrowd.batches[e.team]))mesh.instanceMatrix.needsUpdate=true;}
 refreshUnitShapes();civilianScene()?.sync();if(unit.kind==='civilian')civilianScene().render();
}
function weldingBeamHit(hit,power,kind='welding'){
 if(hit.voltOrb){runner.storm.recharge(power,hit.energyOrb);runner.liberation?.weldOrb(hit.energyOrb);return{damage:0};}
 if(hit.orb)return{damage:bastionTest().boss.applyHit(hit,power,'weld-'+simTime)};
 let damage=0,stunned=false;if(hit.missile)damage=robotMissiles.hurt(hit.missile,power,'volt');else if(hit.unit?.kind==='robot'&&hit.unit.alive){damage=damageRobotHit(hit,power,liberationMode?kind:'welding',true);stunned=weldStun(hit,damage,[robot,argus,bastionTest()?.boss]);if(damage>0&&kind!=='welding')runner.fx.damageEffect.notify({...hit,damage},runner.character?runner.character.hand('R'):runner.root.position);}else if(hit.section)physics.impact(new THREE.Vector3().copy(hit.point),4*power/WELDING_BEAM.damagePerSecond,.35,hit.section,{player:true,source:'volt-rush'});return{damage,stunned};
}
function voltGroundTarget(from,direction){
 const c=VOLT_STORM,far=from.clone().addScaledVector(direction,c.strikeRange),terrain=traceTerrain(from,far),flat=traceImpact(from,far,{sections:[],ground:true,radius:0}),ground=terrain&&(!flat||terrain.t<flat.t)?terrain:flat,p=ground?new THREE.Vector3().copy(ground.point):new THREE.Vector3(runner.motion.position.x+Math.sin(runner.yaw)*25,0,runner.motion.position.z+Math.cos(runner.yaw)*25);p.y=terrainHeight(p.x,p.z)+.1;const b=runner.motion.bounds;if(p.x<b.minX+1||p.x>b.maxX-1||p.z<b.minZ+1||p.z>b.maxZ-1)return null;if(traceImpact(from,p,{sections:physics.chunks,ground:false})||traceImpact(p.clone().add(new THREE.Vector3(0,.2,0)),p.clone().add(new THREE.Vector3(0,4,0)),{sections:physics.chunks,ground:false,radius:.3}))return null;return p;
}
function voltStormHit(hit,power,kind){
 const skyStrike=kind==='sky-strike';
 if(hit.section&&(skyStrike||kind==='ball-lightning-contact')){
  const section=hit.section;
  if(section.state!=='intact'||section.collisionDisabled||section.hp<=0)return 0;
  const before=section.hp;
  physics.damageChunk(section,power,{source:skyStrike?'volt-rush':'volt-orb'});
  if(section.hp<=0)physics.queueDetach(section,hit.point,power*.14,true);
  if(!skyStrike)physics.checkSupports(section.building);
  return before-section.hp;
 }
 if(hit.unit?.kind!=='robot'||!hit.unit.alive)return 0;
 const damage=skyStrike
  ?runner.circuit.strike(hit,power,(contact,amount)=>{
   const before=droneEngineHealth(contact);
   const dealt=damageRobotHit(contact,amount,kind,true);
   return Math.max(dealt,(before-droneEngineHealth(contact))||0);
  })
  :damageRobotHit(hit,power,kind,true);
 if(damage>0)emitParticle('spark',new THREE.Vector3().copy(hit.point),skyStrike?20:6,skyStrike?1.3:.7);
 return damage;
}

function defenseChain(hit,power,alreadyHit=[]){
 if(!defenseMode||!missionRaiders?.upgrades.has('chain')||hit.unit?.kind!=='robot')return null;
 const origin=new THREE.Vector3().copy(hit.point);
 const candidates=[];
 for(const unit of unitDamage.units){
  if(unit.kind!=='robot'||!unit.alive||unit===hit.unit||alreadyHit.some(h=>h.unit===unit))continue;
  for(const shape of unit.shapes){
   const distance=origin.distanceToSquared(shape.center);
   if(distance<=18**2)candidates.push({unit,shape,distance});
  }
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 for(const {unit,shape} of candidates){
  if(traceImpact(origin,shape.center,{sections:physics.chunks,ground:false,radius:.03}))continue;
  const point=new THREE.Vector3().copy(shape.center);
  const amount=damageRobotHit({unit,point,part:shape.part},power*.6,'electric-chain',true);
  if(amount>0)return {unit,damage:amount,point};
 }
 return null;
}

function electricAttack(from,target,damageSeconds,{cpu=false}={}){
 const limit=from.clone().add(target.clone().sub(from).clampLength(0,RUNNER_BEAM.range));
 const hit=traceWorld(from,limit,{radius:.10,allied:cpu,includeVoltOrb:!cpu}),end=hit?.point||limit,enemyHits=[];let damage=0;
 if(hit&&damageSeconds>0){
  if(hit.voltOrb){runner.storm.recharge(150*damageSeconds,hit.energyOrb);return{end,kind:'volt-orb',damage:0,enemyHits};}
  const beamPower=liberationMode&&!cpu?missionRaiders.attackPower(hit,150*damageSeconds,'electric'):150*damageSeconds;
  weaponImpacts.electric++;if(hit.orb||(bastionTest()&&hit.unit?.entity===bastionTest().boss)){damage=bastionTest().boss.applyHit(hit,beamPower,cpu?'cpu-beam-'+runner.charge.bursts:'beam-'+runner.playerBeam.activations);if(damage>0){enemyHits.push({unit:hit.unit,damage,point:end});if(!cpu){alertAfterPlayerHit(hit.unit,runner);if(liberationMode)missionRaiders.onHit(hit,damage);}}return{end,kind:hit.unit?.kind||hit.kind,damage,enemyHits};}
  if(hit.missile){damage+=robotMissiles.hurt(hit.missile,150*damageSeconds,'volt');return{end,kind:'missile',damage,enemyHits};}

  if(hit.section)physics.impact(end,12*damageSeconds/.08,1.4,hit.section,{player:!cpu,source:'volt-rush'});
  const engineHealth=droneEngineHealth(hit);
  const results=unitDamage.blast(end,{direct:hit.unit||null,directPart:hit.part,power:beamPower,radius:1.3,filter:u=>!cpu||u.kind==='robot'});
  for(const d of results){
   damage+=d.damage;
   if(d.unit.kind!=='robot')continue;
   d.unit.entity.recordHit('electric',null,d.damage);
   if(!cpu&&(d.damage>0||d.unit===hit.unit&&droneEngineHealth(hit)<engineHealth))alertAfterPlayerHit(d.unit,runner);
   if(d.damage<=0)continue;
   enemyHits.push({unit:d.unit,damage:d.damage,point:end});
  }
 }
 if(liberationMode&&!cpu&&hit?.unit)missionRaiders.onHit(hit,enemyHits.find(d=>d.unit===hit.unit)?.damage||0);
 const chain=damage>0&&!cpu?defenseChain(hit,150*damageSeconds,enemyHits):null;
 if(chain){damage+=chain.damage;enemyHits.push(chain);}
 return{end,kind:hit?.unit?.kind||hit?.kind||null,damage,enemyHits,chain:chain?.point};
}

function updateCannonBeam(payload){
 hero?.receiveThreat(payload);mochi?.receiveBeam(payload);
 if(!payload){beamEffect?.clear();return;}
 const {state,from,direction,time,protectedUnit}=payload;
 if(state.events.includes('charging'))feed('Siege Walker cannon accumulating energy.');
 let end=from.clone().addScaledVector(direction,140),buildingContact=false;
 if(beamCombat&&(state.phase==='firing'||state.damageSeconds>0)){
  const result=beamCombat.update(from,direction,state.damageSeconds,protectedUnit);end.set(result.end.x,result.end.y,result.end.z);
  buildingContact=!!result.collision?.section;
  if(buildingContact&&state.damageSeconds>0){
   const impact=walkerBeamImpact.hit(end,direction,result.collision.section);
   const surface=impact.point;
   emitParticle('spark',surface,18,1.7,impact.normal);
   emitParticle('smoke',surface,4,1.8);
   particles.push({kind:'flash',p:surface.clone(),v:new THREE.Vector3(),life:.17,max:.17,size:2.25,scale:1});
  }
 }
 beamEffect?.update(state,from,direction,end,time,payload.plan);
 if(buildingContact&&state.phase==='firing'){
  beamEffect.hitGlow.scale.multiplyScalar(1.25);
  beamEffect.impactLight.intensity*=1.5;
 }
}
function fire(from,to,team,kind,isPlayer=false,owner=null){if(!to)return;if(isPlayer)playerMissiles++;const o=new THREE.Mesh(kind==='rocket'?rocketGeo:projectileGeo,kind==='pulse'?pulseMat:projectileMat);if(owner==='siege-walker')projectileSilhouette(o,'#ffad54',1.3);if(kind==='pulse')o.scale.setScalar(2.6);o.position.copy(from);scene.add(o);const dir=to.clone().sub(from).normalize();if(kind==='rocket')o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);projectiles.push({id:'round-'+(++projectileSequence),mesh:o,dir,player:isPlayer,owner,trail:0,speed:kind==='rocket'?55:62,life:6,kind,team,origin:from.clone()});shotsFired++;particles.push({kind:'flash',p:from.clone(),v:new THREE.Vector3(),life:.12,max:.12,size:kind==='rocket'?.6:1.1,scale:1});}
const pulseMat=new THREE.MeshBasicMaterial({color:'#ff5a22'});
function selectSolaraMissile(from,current){
 const eligible=m=>m.alive&&from.distanceToSquared(m.position)<90*90&&!solara.fireballs.some(b=>b.targetMissile===m)&&(m.claimUntil<=robotMissiles.clock||!m.claim||m.claim==='solara'||m.position.distanceTo(m.targetPoint)/m.speed<1.2)&&traceWorld(from,m.position,{radius:.34,allied:true})?.missile===m;
 return current&&eligible(current)?current:robotMissiles.selectThreat(from,'solara',eligible);
}
let evacBlockTime=-1,evacBlockers=[];
function evacuationPathClear(a,b){
 const from={x:a.x,y:1,z:a.z},to={x:b.x,y:1,z:b.z};
 for(const block of layout.buildings)if(!physics.buildings.get(block.id)?.collisionDisabled&&segmentBoxFraction(from,to,{x:block.x,y:block.floors*1.5,z:block.z},{x:5,y:block.floors*1.5,z:5},undefined,1.8)!==null)return false;
 if(evacBlockTime<0||simTime-evacBlockTime>.5){evacBlockTime=simTime;evacBlockers=physics.chunks.filter(c=>c.hasDetached&&!c.hidden&&!c.collisionDisabled&&c.body.position.y<5&&c.body.position.y+Math.max(...c.size)/2>.5&&Math.max(...c.size)>2);}
 const sections=evacBlockers.filter(c=>{const p=c.body.position,r=Math.max(...c.size)/2+2;return p.x>=Math.min(a.x,b.x)-r&&p.x<=Math.max(a.x,b.x)+r&&p.z>=Math.min(a.z,b.z)-r&&p.z<=Math.max(a.z,b.z)+r;});
 return !traceImpact(from,to,{sections,ground:false,radius:1.8});
}
function maintainEvacPad(center,radius){for(const c of physics.chunks){if(!c.hasDetached||c.hidden||c.collisionDisabled||c.body.position.y>5||Math.abs(c.body.position.x-center.x)>radius-1||Math.abs(c.body.position.z-center.z)>radius-1)continue;const side=c.body.position.z<center.z?-1:1;physics.freeze(c);c.body.position.x=center.x;c.body.position.z=center.z+side*(10+Math.max(...c.size)/2);c.body.aabbNeedsUpdate=true;syncChunk(c);}physics.world.broadphase.markStaticsDirty();evacBlockTime=-1;}
function evacuationTargets(select=false,weapon='missiles'){const candidates=evacuation.targets(robot.root.position.clone().add(new THREE.Vector3(0,18,0)),[runner,hero,solara,portalHero,mochi,ninja,prism,axo,ember],{helicopters:robot.isWeaponWorking('missiles')}).filter(walkerAware);if(!select)return candidates;if(weapon==='missiles'&&evacuationHelicopterStrike?.busy)return evacuationHelicopterStrike.missileTarget?[evacuationHelicopterStrike.missileTarget]:[];if(weapon!=='missiles'&&evacuationHelicopterStrike?.busy)return [];const chosen=evacuation.pick(candidates);if(chosen?.kind==='helicopter'&&weapon!=='missiles'){evacuationHelicopterStrike.request(chosen);return [];}return chosen?[chosen]:[];}
function updateCombat(dt){
 if(evacuationCinematic?.active)return;
 enemyDamageFlash.beginFrame();
 enemySeparation.update(dt,activeRaiders()?.members||[],{boss:bastionTest()?.boss||robot,bounds:testingMode?COMBAT_ARENA.movementBounds:districtMode?districtMovementBounds():undefined});
 if(evacuation&&robot.dead)evacuation.endEvacuation();evacuation?.update(dt);
 if(!openingTitle?.active)missionRaiders?.update(dt,simTime);
 if(liberationMode){missionRaiders.options.ui.step(dt);if(missionRaiders.upgradePending||missionRaiders.ended)return;}
 evacuationReinforcement?.update(dt);if(evacuationCinematic?.active)return;convoy?.update(dt);argus?.update(dt,simTime);if(argus){robotStunEffect.update(argus,simTime);}testingArena?.update(dt,simTime);
 for(const u of unitDamage.units)delete u.dashSweep;
 pilot?.updateFlight(dt);if(!defenseMode||!missionRaiders?.upgradePending){runner?.update(dt,simTime);ninja?.update(dt,simTime);}hero?.update(dt,simTime);solara?.update(dt,simTime);mochi?.update(dt,simTime);prism?.update(dt,simTime);axo?.update(dt,simTime);ember?.update(dt,simTime);
 testingArena?.bastion.afterHeroes(dt);evacuationReinforcement?.afterHeroes(dt);
 if(!convoyMode&&(!(defenseMode||liberationMode)||robot.root.visible)){
  evacuationHelicopterStrike?.update();
  const targets=testingArena?testingArena.heroUnits().filter(walkerAware):evacuation?evacuationTargets():mission1Mode?missionWalkerTargets():unitDamage.units;
  const defenseCombat=defenseMode&&!openingTitle?.active;
  const canTarget=defenseCombat?phase=>phase==='warning'?missionWalkerTargets('missiles').length>0:targets.length>0:undefined;
  const rocket=defenseCombat?missionRaiders.relay:null;
  const chargingAtRocket=robot.weapon.phase==='charging'&&robot.target===rocket;
  const markingRocket=walkerSniper.shells.some(s=>s.state==='warning'&&s.aim?.unitId===rocket?.id);
  if(rocket&&(chargingAtRocket||markingRocket)&&!targets.includes(rocket)){
   arsenal.interrupt(robot,robotMissiles,walkerSniper);
  }
  arsenal?.beforeBeam(robot,robotMissiles,walkerSniper);
  robot.protectedUnit=pilot?.active?.combatUnit?.id;
  robot.update(dt,simTime,targets);
  if(openingTitle?.active&&openingTitle.time<TITLE_WALK_SECONDS&&robot.isWeaponWorking('beam')){
   // Carry the cannon facing forward during the walk; target tracking starts afterward.
   robot.nodes.upperarm_r.rotation.x=-1.20+Math.sin(openingTitle.time*2)*.055;
   robot.nodes.forearm_r.rotation.x=0;
   robot.root.updateMatrixWorld(true);
  }
  refreshUnitShapes();eyeBeams?.update(dt,simTime);robotMissiles?.update(dt,simTime);walkerSniper?.update(dt,simTime);
  arsenal?.update(dt,robot,robotMissiles,walkerSniper,canTarget);evacuationHelicopterStrike?.update();
  evacuation?.trackWaveAttacks(robot,robotMissiles,walkerSniper);
  robot.updatePlasmaWarning(walkerSniper?.shells.some(s=>s.state==='warning'),simTime);
  if(arsenal)robot.updatePodWarning(arsenal.warning());
  robotStunEffect.update(robot,simTime);
 }
 for(const t of tanks){if(!t.combatUnit.alive||t.combatUnit.dashPhased)continue;const side=t.team===0?1:-1;if(!t.combatUnit.dashSweep&&Math.abs(t.root.position.x)>7+(t.i%2)*5)t.root.position.x+=side*t.speed*dt;t.cooldown-=dt;const from=t.root.position.clone().add(new THREE.Vector3(0,1.8,0)),target=chooseTarget(t.team,from);if(target){const angle=Math.atan2(target.x-from.x,target.z-from.z)-t.root.rotation.y;t.turret.rotation.y=THREE.MathUtils.lerp(t.turret.rotation.y,angle,.025);if(t.cooldown<=0){t.turret.rotation.y=angle;t.root.updateMatrixWorld(true);const muzzle=t.turret.localToWorld(new THREE.Vector3(0,.13,3.4));fire(muzzle,target,t.team,'shell',false,t.combatUnit.id);t.cooldown=4.3+rand()*2;}}
 }
 for(const h of helicopters){if(!h.combatUnit.alive)continue;h.rotor.rotation.y=simTime*38;h.tail.rotation.x=simTime*45;if(pilot?.owns(h))continue;
 const a=simTime*.055+h.phase,side=h.team===0?-1:1;h.previous.copy(h.root.position);const route=new THREE.Vector3(Math.cos(a)*26+side*10,27+Math.sin(simTime*.6+h.phase)*1.4+h.i*5,Math.sin(a)*30);const routeYaw=Math.atan2(-Math.sin(a),Math.cos(a));let yaw=routeYaw;
 if(h.returning){h.returning.elapsed+=dt;const t=THREE.MathUtils.smoothstep(h.returning.elapsed,0,4);h.root.position.lerpVectors(h.returning.position,route,t);let delta=routeYaw-h.returning.yaw;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;yaw=h.returning.yaw+delta*t;if(t===1)h.returning=null;}else h.root.position.copy(route);
 if(robot.combatUnit.alive&&!h.returning)yaw=Math.atan2(robot.root.position.x-h.root.position.x,robot.root.position.z-h.root.position.z);h.root.rotation.set(0,yaw,Math.sin(a)*.06,'YXZ');h.cooldown-=dt;if(h.cooldown<=0){const from=h.root.position.clone().add(new THREE.Vector3(0,-.6,0));fire(from,chooseTarget(h.team,from,true),h.team,'rocket',false,h.combatUnit.id);h.cooldown=5.5+rand()*2;}}
 if(soldierCrowd){soldierCrowd.combatEnabled=robot.combatUnit.alive;soldierCrowd.update(dt,simTime);}
 refreshUnitShapes();portalHero?.update(dt,simTime);lux?.update(dt);refreshUnitShapes();argus?.attacks.afterHeroes(dt);
 for(const u of unitDamage.units)if(!u.alive&&!u.entity.evac&&u.kind!=='infantry'&&u.kind!=='robot'){const e=u.entity;e.smokeTimer-=dt;if(e.smokeTimer<=0){emitParticle('smoke',e.root.position.clone().add(new THREE.Vector3(0,1,0)),2,.4);e.smokeTimer=.55;}}
 for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i],transit=portalHero?.redirect(p,p.mesh.position,p.mesh.position.clone().addScaledVector(p.dir,p.speed*dt));if(transit){p.mesh.position.copy(transit.position);p.dir.copy(transit.direction);p.life-=dt;continue;}const end=p.mesh.position.clone().addScaledVector(p.dir,p.speed*dt),collision=traceWorld(p.mesh.position,end,{radius:p.kind==='rocket'?.12:.06,owner:p.owner,moving:true,allied:!p.player&&p.owner!=='siege-walker'&&!argusOwner(p.owner)});if(collision){p.mesh.position.set(collision.point.x,collision.point.y,collision.point.z);explosion(p.mesh.position.clone(),p.kind==='rocket'?18:p.kind==='pulse'?9:23,p.kind==='rocket'?3.8:p.kind==='pulse'?2.2:4.5,p.kind,p.player,collision,p.owner,p.id);p.life=0;}else p.mesh.position.copy(end);if(p.kind==='rocket'&&p.life>0){p.trail-=dt;if(p.trail<=0){emitParticle('smoke',p.mesh.position,1,.14);p.trail=.10;}}p.life-=dt;if(p.life<=0){scene.remove(p.mesh);projectiles.splice(i,1);}}

}
function updateEffects(dt){
 buildingSmoke.update(dt);
 walkerBeamImpact.update(dt);
 enemyDamageFlash.update(dt);const bastion=bastionTest()?.boss;robotDeathEffects.update(dt,(unitDamage?.units||[]).filter(u=>u.entity!==robot&&u.entity!==argus&&u.entity!==bastion));
 missileExplosions.update(dt);
 const counts={smoke:0,buildingSmoke:0,flash:0,spark:0},pools={smoke:smokePool,buildingSmoke:buildingSmokePool,flash:flashPool,spark:sparkPool};for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.p.addScaledVector(p.v,dt);if(p.kind==='spark')p.v.y-=9*dt;const index=counts[p.kind]++;if(index>=pools[p.kind].instanceMatrix.count)continue;const size=(p.kind==='smoke'||p.buildingSmoke)?p.size*p.scale*(1+(1-p.life/p.max)*1.5)*(p.buildingSmoke?Math.min(1,p.life/.6):1):p.size*p.scale*Math.min(1,p.life*8);dummy.position.copy(p.p);dummy.rotation.set(0,0,0);dummy.scale.setScalar(size);dummy.updateMatrix();pools[p.kind].setMatrixAt(index,dummy.matrix);}
 for(const k of Object.keys(pools)){pools[k].count=Math.min(counts[k],pools[k].instanceMatrix.count);pools[k].instanceMatrix.needsUpdate=true;}
 for(let i=tracers.length-1;i>=0;i--){tracers[i].life-=dt;if(tracers[i].life<=0)tracers.splice(i,1);}let n=0;for(const t of tracers.slice(-240)){t.from.toArray(tracerPositions,n*6);t.to.toArray(tracerPositions,n*6+3);n++;}tracerGeo.attributes.position.needsUpdate=true;tracerGeo.setDrawRange(0,n*2);
}
function artilleryCamera(){
 const origin=robot.nodes.plasma_cannon.getWorldPosition(new THREE.Vector3());
 const shot=walkerSniper?.shells[0];
 const focus=shot?.state==='warning'?shot.target:shot?.position;
 const target=focus?origin.clone().lerp(focus,.42):origin;
 const distance=focus?Math.max(28,origin.distanceTo(focus)*.8):28;
 const offset=new THREE.Vector3(.45,.55,.7).normalize().multiplyScalar(distance);
 return{target,position:target.clone().add(offset)};
}
function setView(name){const selected={hero:'violet',runner:'volt',portal:'rift',solara:'solara',mochi:'mochi',ninja:'ninja',prism:'prism',axo:'axo',ember:'ember'}[name];if(selected&&!roster.has(selected))return;if(hero?.active)hero.player.exit();if(portalHero?.active)portalHero.player.exit();if(lux?.active)lux.player.exit();if(ninja?.active)ninja.exit();if(runner?.active)runner.exit();if(pilot?.active)pilot.exit();view=name;document.querySelector('.viewer').classList.toggle('is-solara-view',name==='solara');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===name));const narrow=camera.aspect<.85;if(name==='overview'&&bastionTest()){const b=bastionTest().boss;camera.position.copy(b.root.position).add(new THREE.Vector3(narrow?90:65,narrow?90:65,narrow?105:75));controls.target.copy(b.root.position).y+=15;}else if(name==='overview'&&assetCityMode&&testingArena?.walkerEnabled){
 const center=robot.root.position;
 camera.position.copy(center).add(new THREE.Vector3(narrow?18:12,narrow?14:12,narrow?40:30));
 controls.target.copy(center).y+=11;
 }else if(name==='overview'&&assetCityMode){camera.position.set(48,narrow?27:23,91);controls.target.set(47,13,43);}else if(name==='overview'&&testingMode){camera.position.set(narrow?235:180,narrow?215:160,narrow?255:200);controls.target.set(0,6,0);}else if(name==='overview'&&districtMode){camera.position.set(EVACUATION_LANDING.x+(narrow?150:110),narrow?145:100,EVACUATION_LANDING.z+(narrow?161:126));controls.target.set(EVACUATION_LANDING.x,6,EVACUATION_LANDING.z);}else if(name==='overview'){camera.position.set(narrow?112:77,narrow?100:68,narrow?125:85);controls.target.set(0,6,0);}if(name==='convoy'&&convoy){const p=(convoy.activeBuses[0]||convoy.buses.at(-1)).root.position;camera.position.copy(p).add(new THREE.Vector3(narrow?-28:-22,narrow?38:29,narrow?42:34));controls.target.copy(p).add(new THREE.Vector3(4,2,0));}if(name==='hero'&&hero){const pose=heroCamera();camera.position.copy(pose.position);controls.target.copy(pose.target);}if(name==='runner'&&runner){const pose=runnerEscortCamera();camera.position.copy(pose.position);controls.target.copy(pose.target);}if(name==='solara'&&solara){const pose=solaraCamera();camera.position.copy(pose.position);controls.target.copy(pose.target);}if(name==='ninja'&&ninja){camera.position.copy(ninja.root.position).add(new THREE.Vector3(5,4,7));controls.target.copy(ninja.root.position).y+=1.3;}if(name==='prism'&&prism){camera.position.copy(prism.root.position).add(new THREE.Vector3(narrow?12:8,narrow?5:3,narrow?15:10));controls.target.copy(prism.root.position).y+=1.4;}if(name==='mochi'&&mochi){camera.position.copy(mochi.root.position).add(new THREE.Vector3(6,3,7));controls.target.copy(mochi.root.position).add(new THREE.Vector3(0,1.2,0));}if(name==='portal'&&portalHero){const pose=portalCamera();camera.position.copy(pose.position);controls.target.copy(pose.target);}if(name==='artillery'&&walkerSniper){const pose=artilleryCamera();camera.position.copy(pose.position);controls.target.copy(pose.target);}if(name==='robot'){camera.position.copy((bastionTest()?.boss||robot).root.position).add(new THREE.Vector3(-30,21,4));controls.target.copy((bastionTest()?.boss||robot).root.position).add(new THREE.Vector3(0,bastionTest()?22:11,0));}if(name==='street'){camera.position.set(-47,4.5,6.5);controls.target.set(-7,2.4,0);}if(name==='tank'&&tanks[0]){camera.position.copy(tanks[0].root.position).add(new THREE.Vector3(-9,6,10));controls.target.copy(tanks[0].root.position).add(new THREE.Vector3(3,1,0));}if(name==='air'&&helicopters[0]){camera.position.copy(helicopters[0].root.position).add(new THREE.Vector3(10,5,14));controls.target.copy(helicopters[0].root.position);}if(name==='infantry'&&soldierCrowd){const p=soldierCrowd.position();camera.position.copy(p).add(new THREE.Vector3(3.5,2.1,3.0));controls.target.copy(p).add(new THREE.Vector3(0,1.05,0));}controls.update();$('camera-label').textContent={convoy:'CONVOY / EVACUATION ROUTE',overview:'OBSERVER / FREE ORBIT',artillery:'TRACKING / SNIPER CANNON',robot:'TRACKING / SIEGE WALKER',hero:'TRACKING / VIOLET SENTINEL',solara:'TRACKING / SOLARA FROST',ninja:'TRACKING / KAGE',mochi:'TRACKING / MOCHI PINK',prism:'TRACKING / RAINBOW STAR',axo:'TRACKING / FROSTFIN',ember:'TRACKING / CINDER FANG',portal:'TRACKING / RIFT WARDEN',runner:'TRACKING / VOLT RUSH — CPU',street:'OBSERVER / STREET LEVEL',tank:'TRACKING / NORTH ARMOR',air:'TRACKING / NORTH ROTORCRAFT',infantry:'TRACKING / NORTH RIFLEMAN'}[name]||'OBSERVER / FREE ORBIT';}
controls.addEventListener('start',()=>{if(pilot?.active)return;view='free';document.querySelector('.viewer').classList.remove('is-solara-view');document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('selected'));$('camera-label').textContent='OBSERVER / FREE ORBIT';});document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('pause').onclick=()=>{hero?.player?.clear();portalHero?.player?.clear();lux?.player.clear();paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');};
window.addEventListener('keydown',event=>{
 if(event.code!=='KeyP'||event.defaultPrevented||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
 if(event.target.closest?.('input,select,textarea,[contenteditable]')||document.querySelector('dialog[open]'))return;
 event.preventDefault();
 $('pause').click();
});
document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{speed=Number(b.dataset.speed);document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',x===b));});
$('reset').onclick=resetDistrict;
function resetDistrict(){if(!physics)return;if(liberationMode&&missionRaiders?.build){evacuationBriefing.open('choose');}const defensePlayer=defenseMode?controlledHero():null;evacuationCinematic?.reset();droneImpactShake=0;if(districtMode){$('hero-readout').hidden=!roster.has('violet');$('portal-readout').hidden=!roster.has('rift');}buildingSmoke.reset();walkerBeamImpact.reset();enemyDamageFlash.clear();enemySeparation.reset();robotDeathEffects.reset();robotStunEffect.clear();missileExplosions.reset();eyeBeams?.reset();portalHero?.reset();lux?.reset();solara?.reset();mochi?.reset();prism?.reset();axo?.reset();ember?.reset();walkerSniper?.reset();arsenal?.reset();evacuationHelicopterStrike?.reset();robotMissiles?.reset();ninja?.reset();runner?.reset();pilot?.exit();if(pilot){pilot.shots=0;pilot.lastImpact=null;}playerMissiles=playerHits=playerBuildingHits=playerUnitHits=0;lastPlayerDamage=null;unitDamage.reset();for(const u of unitDamage.units)delete u.dashSweep;for(const u of unitDamage.units)if(u.kind!=='infantry'&&u.kind!=='robot'){charUnit(u.entity.root,true);u.entity.wreck=null;}robot.reset();hero?.reset();beamCombat?.reset();physics.reset();for(const c of physics.chunks){syncChunk(c);chunkBatches[c.visualKey||c.type].setColorAt(c.index,new THREE.Color(c.tint));}for(const o of Object.values(chunkBatches)){o.instanceColor.needsUpdate=true;o.seal?.();}for(const p of projectiles)scene.remove(p.mesh);projectiles.length=particles.length=tracers.length=0;for(const p of [smokePool,buildingSmokePool,flashPool,sparkPool])p.count=0;tracerGeo.setDrawRange(0,0);for(const t of tanks){t.root.position.copy(t.start);t.cooldown=1.1+t.i*.65+t.team*.6;}for(const h of helicopters){h.cooldown=2+h.team+h.i*1.5;h.phase=h.team*Math.PI+h.i*.7;h.returning=null;const side=h.team===0?-1:1;h.root.position.set(Math.cos(h.phase)*26+side*10,27+Math.sin(h.phase)*1.4+h.i*5,Math.sin(h.phase)*30);h.root.rotation.set(0,Math.atan2(-Math.sin(h.phase),Math.cos(h.phase)),Math.sin(h.phase)*.06,'YXZ');h.rotor.rotation.y=0;h.tail.rotation.x=0;}evacBlockTime=-1;simTime=shotsFired=projectileSequence=0;soldierCrowd?.reset();weaponImpacts.shell=weaponImpacts.rocket=weaponImpacts.pulse=weaponImpacts.beam=weaponImpacts.electric=weaponImpacts.plasma=0;impactLog=[];evacuation?.reset();missionRaiders?.reset();if(defenseMode){document.querySelector('#defense-result')?.remove();paused=false;}evacuationReinforcement?.reset();if(convoyMode)resetConvoy();if(testingArena)resetTestingEnemies();else if(mission1Mode)positionDistrictHeroes();if(defensePlayer)(defensePlayer.player||defensePlayer).enter(RELAY_INTRO);refreshUnitShapes();feed(liberationMode?'City Liberation · district restored.':convoyMode?'Convoy reset · two pickups ahead.':testingMode?'Combat test reset with selected enemies.':'District rebuilt. Siege Walker attacks begin in five seconds.');updateStats();};
$('help').onclick=()=>$('guide').showModal();$('close-guide').onclick=()=>$('guide').close();$('fullscreen').onclick=()=>setGameFullscreen(!gameIsFullscreen());
const keys=new Set();let heightInput=0;window.addEventListener('keydown',e=>{if(lux?.active||hero?.active||portalHero?.active||pilot?.active||runner?.active||ninja?.active||document.querySelector('dialog[open]'))return;if(['INPUT','SELECT','BUTTON','A'].includes(e.target.tagName))return;if(['w','a','s','d','q','e','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();heightInput=0;});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();heightInput=0;}});for(const [id,sign]of [['rise',1],['lower',-1]]){const b=$(id);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);heightInput=sign;};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>heightInput=0;}
function runnerEscortCamera(){const p=runner.root.position,up=runner.bodyUp,forward=runner.bodyForward,right=new THREE.Vector3().crossVectors(up,forward).normalize(),target=p.clone().addScaledVector(up,1.3),position=up.y<.5?p.clone().addScaledVector(up,7).addScaledVector(right,5).add(new THREE.Vector3(0,3,0)):p.clone().addScaledVector(forward,-7).addScaledVector(right,4).add(new THREE.Vector3(0,4.2,0));const hit=traceImpact(target,position,{sections:physics.chunks,ground:false});if(hit)position.set(hit.point.x,hit.point.y,hit.point.z).addScaledVector(position.clone().sub(target).normalize(),-.35);position.y=Math.max(terrainHeight(position.x,position.z)+.4,position.y);return{position,target};}
function solaraCamera(){const p=solara.root.position,front=new THREE.Vector3(Math.sin(solara.root.rotation.y),0,Math.cos(solara.root.rotation.y)),side=new THREE.Vector3(front.z,0,-front.x);return{position:p.clone().addScaledVector(front,8).addScaledVector(side,8).add(new THREE.Vector3(0,4,0)),target:p.clone().add(new THREE.Vector3(0,1.45,0))};}
function portalCamera(){const p=portalHero.root.position,target=p.clone().add(new THREE.Vector3(0,1.5,0)),position=p.clone().add(new THREE.Vector3(10,7,13)),hit=traceImpact(target,position,{sections:physics.chunks,ground:false});if(hit)position.set(hit.point.x,hit.point.y,hit.point.z).addScaledVector(position.clone().sub(target).normalize(),-.4);return{position,target};}
function heroCamera(){const p=hero.root.position,away=p.clone().sub(robot.root.position);away.y=0;away.normalize();const side=new THREE.Vector3(-away.z,0,away.x);return{position:p.clone().addScaledVector(away,14).addScaledVector(side,8).add(new THREE.Vector3(0,5,0)),target:p.clone().add(new THREE.Vector3(0,1.4,0))};}
function updateCamera(dt){if(lux?.active){lux.player.frame();return;}if(portalHero?.active){portalHero.player.frame();return;}if(hero?.active){hero.player.frame();return;}if(openingTitle?.active){openingTitle.frame(camera,dt);return;}if(['axo','ember'].includes(view)&&(view==='axo'?axo:ember)?.enabled&&!evacuationCinematic?.active){const followed=view==='axo'?axo:ember;camera.position.lerp(followed.root.position.clone().add(new THREE.Vector3(7,5,9)),1-Math.exp(-4*dt));controls.target.copy(followed.root.position);controls.update();return;}if(evacuationCinematic?.active){evacuationCinematic.frameCamera();return;}if(ninja?.active){ninja.updateCamera(dt);return;}if(view==='ninja'&&ninja){const p=ninja.root.position;camera.position.lerp(p.clone().add(new THREE.Vector3(7,5,8)),1-Math.exp(-4*dt));controls.target.lerp(p.clone().add(new THREE.Vector3(0,1.2,0)),1-Math.exp(-4*dt));}if(view==='prism'&&prism){const p=prism.root.position,narrow=camera.aspect<.85;camera.position.lerp(p.clone().add(new THREE.Vector3(narrow?12:8,narrow?5:3,narrow?15:10)),1-Math.exp(-4*dt));controls.target.lerp(p.clone().add(new THREE.Vector3(0,1.5,0)),1-Math.exp(-4*dt));}if(view==='mochi'&&mochi){const p=mochi.root.position;camera.position.lerp(p.clone().add(new THREE.Vector3(6,3,7)),1-Math.exp(-4*dt));controls.target.lerp(p.clone().add(new THREE.Vector3(0,1.2,0)),1-Math.exp(-4*dt));}if(view==='convoy'&&convoy){const bus=convoy.activeBuses[0]||convoy.buses.at(-1),p=bus.root.position,narrow=camera.aspect<.85;camera.position.lerp(p.clone().add(new THREE.Vector3(narrow?-28:-22,narrow?38:29,narrow?42:34)),1-Math.exp(-3*dt));controls.target.lerp(p.clone().add(new THREE.Vector3(4,2,0)),1-Math.exp(-3*dt));}if(view==='artillery'&&walkerSniper){const pose=artilleryCamera();camera.position.lerp(pose.position,1-Math.exp(-3*dt));controls.target.lerp(pose.target,1-Math.exp(-3*dt));}if(runner?.active){runner.updateCamera(dt);return;}if(pilot?.active){pilot.updateCamera();return;}if(view==='runner'&&runner){const pose=runnerEscortCamera();camera.position.lerp(pose.position,1-Math.exp(-4*dt));controls.target.lerp(pose.target,1-Math.exp(-4*dt));}else if(view==='hero'&&hero){const pose=heroCamera();camera.position.lerp(pose.position,1-Math.exp(-5*dt));controls.target.lerp(pose.target,1-Math.exp(-5*dt));}else if(view==='solara'&&solara){const pose=solaraCamera();camera.position.lerp(pose.position,1-Math.exp(-4*dt));controls.target.lerp(pose.target,1-Math.exp(-4*dt));}else if(view==='portal'&&portalHero){const pose=portalCamera();camera.position.lerp(pose.position,1-Math.exp(-3*dt));controls.target.lerp(pose.target,1-Math.exp(-3*dt));}else if(view==='robot'&&robot){const p=(bastionTest()?.boss||robot).root.position;camera.position.lerp(p.clone().add(new THREE.Vector3(-30,21,4)),1-Math.exp(-3*dt));controls.target.lerp(p.clone().add(new THREE.Vector3(0,11,0)),1-Math.exp(-3*dt));}else if(view==='infantry'&&soldierCrowd){const p=soldierCrowd.position();camera.position.lerp(p.clone().add(new THREE.Vector3(3.5,2.1,3.0)),1-Math.exp(-4*dt));controls.target.lerp(p.add(new THREE.Vector3(0,1.05,0)),1-Math.exp(-4*dt));}else if(view==='tank'&&tanks[0]){const goal=tanks[0].root.position.clone().add(new THREE.Vector3(-9,6,10)),target=tanks[0].root.position.clone().add(new THREE.Vector3(3,1,0));camera.position.lerp(goal,1-Math.exp(-3*dt));controls.target.lerp(target,1-Math.exp(-3*dt));}else if(view==='air'&&helicopters[0]){camera.position.lerp(helicopters[0].root.position.clone().add(new THREE.Vector3(10,5,14)),1-Math.exp(-3*dt));controls.target.lerp(helicopters[0].root.position,1-Math.exp(-3*dt));}
 let x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),z=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),y=(keys.has('e')?1:0)-(keys.has('q')?1:0)+heightInput;
 if(x||z||y){view='free';camera.getWorldDirection(v3);v3.y=0;v3.normalize();const right=new THREE.Vector3().crossVectors(v3,new THREE.Vector3(0,1,0));const delta=v3.multiplyScalar(z).addScaledVector(right,x);delta.y=y;delta.multiplyScalar(dt*(keys.has('shift')?28:12));if(camera.position.y+delta.y<1)delta.y=0;camera.position.add(delta);controls.target.add(delta);$('camera-label').textContent='OBSERVER / FREE ROAM';}controls.update();}
function updateWeaponStatus(){
 const box=$('walker-weapons');box.hidden=robot.dead;
 for(const m of robot.weapons.modules){const el=$('weapon-'+m.id),percent=Math.ceil(m.health/m.maxHealth*100);el.dataset.destroyed=String(m.destroyed);el.querySelector('b').textContent=m.destroyed?'OFF':percent+'%';el.querySelector('i>span').style.width=percent+'%';el.setAttribute('aria-label',m.label+': '+(m.destroyed?'destroyed':percent+' percent durability'));}
}
function updateStats(){if(!loaded)return;if(convoy)convoyHUD.update(convoy);if(argus){$('argus-status').textContent=argus.dead?'NEUTRALIZED · CONVOY MUST STILL EXIT':'PHASE '+argus.phase+' · JOINTS '+[...argus.joints.values()].filter(j=>j.destroyed).length+'/4 DISABLED · STRIDE '+Math.round(argus.speedMultiplier*100)+'% · PYLONS '+argus.attacks.pylons.members.filter(p=>p.stage==='active').length+'/'+argus.config.attacks.pylons.maximumActive;}if(ninja)$('ninja-control-status').textContent=ninja.active?'PLAYER CONTROL':'CPU / SHURIKENS & AERIAL STRIKES';if(mochi){$('mochi-status').textContent=mochi.mode==='kawaii-cataclysm'?'KAWAII CATACLYSM / CHARGING':'PLATFORM PROPULSION / AIR SKATING';$('mochi-shields').textContent=mochi.shields;$('mochi-dazes').textContent=mochi.dazes;}if(hero){$('violet-energy-status').style.color=hero.capacitor.overloadRemaining>0||hero.capacitor.overloadProgress>=.5?'#ff9bbd':'';$('violet-energy-status').classList.toggle('is-overloading',hero.capacitor.overloadProgress>=.5);$('violet-energy-status').dataset.overload=hero.capacitor.overloadRemaining>0?'recovering':hero.capacitor.overloadProgress>0?'building':'none';$('violet-energy-status').textContent=hero.capacitor.overloadRemaining>0?'CAPACITOR OVERLOADED · '+hero.capacitor.overloadRemaining.toFixed(1)+'s':hero.capacitor.phase==='charging'?'FORCE BEAM CHARGING · '+hero.capacitor.chargeRemaining.toFixed(1)+'s':hero.capacitor.remaining>0?'FORCE BEAM · '+hero.capacitor.remaining.toFixed(1)+'s':hero.capacitor.ready?'FORCE BEAM READY'+(hero.capacitor.overloadProgress>0?' · OVERLOAD '+Math.floor(hero.capacitor.overloadProgress*100)+'%':''):'BARRIER ENERGY · '+Math.floor(hero.capacitor.amount/1200*100)+'%';}if(evacuation){const e=evacuation.diagnostics();$('evac-rescued').textContent=e.saved;$('evac-lost').textContent=e.lost;$('casualty-count').textContent=e.lost;$('casualty-fill').style.width=Math.min(100,e.lost/60*100)+'%';$('casualty-meter').setAttribute('aria-valuenow',Math.min(60,e.lost));$('casualty-meter').setAttribute('aria-valuetext',e.lost+' civilians lost');$('evac-waiting').textContent=e.waiting;$('evac-onboard').textContent=e.aboard;$('evac-phase').textContent=e.ended?(e.phase==='departing'?'EVACUATION CLOSED · HELICOPTER DEPARTING':e.phase==='destroyed'?'EVACUATION CLOSED · HELICOPTER LOST':'EVACUATION COMPLETE'):({inbound:'HELICOPTER INBOUND',landing:'HELICOPTER LANDING',boarding:'BOARDING · '+Math.ceil(e.boardingRemaining)+'s',departing:'HELICOPTER DEPARTING',returning:'NEXT HELICOPTER EN ROUTE',destroyed:'HELICOPTER LOST · REPLACEMENT EN ROUTE'}[e.phase]||e.phase)+' · NEXT GROUP '+Math.ceil(e.nextSpawn)+'s';}if(solara){$('solara-status').textContent={"ice-glide":'ICE PATH / PATROL',"ice-intercept":'GLIDING TO PLASMA ZONE',"raising-ice":'GROWING ICE DOME',"charging-fire":'CHARGING FIREBALL',"missile-defense":'INTERCEPTING MISSILES'}[solara.mode]||solara.mode;$('solara-shots').textContent=solara.shots;$('solara-blocks').textContent=solara.plasmaBlocked;$('solara-missiles').textContent=solara.missileInterceptions;}if(portalHero){$('portal-status').textContent={watching:'WATCHING / READY',teleporting:'TELEPORTING',rescuing:'EVACUATING ALLIES',casting:'PLACING PORTAL','portal-barrage':'AUTO PORTAL FIRE'}[portalHero.mode]||portalHero.mode;$('portal-count').textContent=portalHero.portals.length;$('portal-rescues').textContent=portalHero.rescues;}if(runner)$('runner-control-status').textContent=runner.active?'PLAYER CONTROL':{'roof-approach':'CPU / ROOFTOP APPROACH','roof-climb':'CPU / CLIMBING TO ROOF','roof-position':'CPU / ROOFTOP POSITION','roof-attack':'CPU / ROOFTOP ATTACK','roof-depart':'CPU / LEAVING ROOFTOP','rescue-standby':'CPU / GUARDING BLAST ZONE','rescue-approach':'CPU / RESCUE APPROACH','rescue-dash':'CPU / RESCUE DASH','missile-defense':'CPU / MISSILE DEFENSE',attack:'CPU / ATTACKING',climbing:'CPU / WALL RUN',recovering:'CPU / RECOVERING',patrol:'CPU / PATROL'}[runner.ai.mode]||'CPU CONTROL';if(hero){$('hero-status').textContent={defending:'INTERCEPTING MISSILES',patrol:'FLYING / PATROL',charging:'CHARGING FORCE',intercepting:'INTERCEPTING',blocking:'BARRIER DEPLOYED','force-charge':'CHARGING FORCE BEAM','force-beam':'SUSTAINED FORCE BEAM'}[hero.mode];$('hero-shots').textContent=hero.shots;$('hero-saves').textContent=hero.rescues;if(robotMissiles){const m=robotMissiles.diagnostics();$('missile-defense-status').textContent=(arsenal?.phase==='warning'?'POD WARNING / LAUNCH IMMINENT':m.active||m.pending?'MISSILES INBOUND '+m.active:robot.isWeaponWorking('missiles')?'SHOULDER POD / STANDBY':'SHOULDER POD / DESTROYED')+' · '+m.intercepted+' SHOT DOWN';}}updateWeaponStatus();$('walker-weapons').hidden=!!bastionTest();if(evacuation)document.querySelector('.robot-readout').hidden=!!bastionTest();const hudBoss=argus||bastionTest()?.boss||(testingArena?.pyroclast?.spawned?testingArena.pyroclast:null)||robot,health=hudBoss.combatUnit.health/hudBoss.combatUnit.maxHealth;$('robot-health').style.width=(health*100)+'%';$('boss-hp-meter').setAttribute('aria-valuenow',Math.round(health*100));$('boss-hp-meter').setAttribute('aria-label',argus||bastionTest()||testingArena?.pyroclast?.spawned?'Boss health':'Siege Walker weapon integrity: destroy all four weapons');document.querySelector('.boss-health-hud b').title=argus||bastionTest()?'':'Destroy all four weapons to defeat the Walker';$('robot-status').textContent=robot.dead?'NEUTRALIZED':robot.stunRemaining>0?(robot.stunKind==='weakpoint'?'CORE OVERLOAD / STAGGERED':'ELECTRIFIED / STUNNED'):arsenal?.phase==='startup'?'ATTACKS IN '+arsenal.diagnostics().startupRemaining.toFixed(1)+' s':arsenal?.phase==='recovery'?'WEAPON CHANGE / '+arsenal.diagnostics().delayRemaining.toFixed(1)+' s':walkerSniper?.busy?'SNIPER CANNON / '+(walkerSniper.shells.some(s=>s.state==='warning')?(walkerSniper.shells[0].lockedAt?'LOCKED':'TARGETING'):'SHOT IN FLIGHT'):robot.weapon.phase==='charging'?'CANNON CHARGING':robot.weapon.phase==='firing'?'ENERGY BEAM / FIRING':arsenal?.phase==='disarmed'?'MAIN WEAPONS OFFLINE':health<.3?'WEAPONS CRITICAL':health<.65?'WEAPONS DAMAGED':'HOSTILE / ACTIVE';$('robot-percent').textContent=Math.ceil(health*100)+'%';for(const [id,team]of [['north-count',0],['south-count',1]]){const alive=unitDamage.units.filter(u=>u.alive&&u.entity.team===team);$(id).textContent=alive.filter(u=>u.kind==='tank').length+' ARMOR · '+alive.filter(u=>u.kind==='helicopter').length+' AIR · '+alive.filter(u=>u.kind==='infantry').length+' INFANTRY';}const s=physics.stats();$('hits').textContent=s.impacts;$('debris').textContent=s.detached;$('active').textContent=s.activeBodies;$('time').textContent=String(Math.floor(simTime/60)).padStart(2,'0')+':'+String(Math.floor(simTime%60)).padStart(2,'0');bastionTest()?.hud();}
// City Battle restores normal weapon HP; other scenes retain the temporary test scale.
const kageVariants=['cyber','frog','armored','classic'];
function readKageModel(){
 const variant=new URLSearchParams(location.search).get('kage');
 if(kageVariants.includes(variant))return variant;
 try{const saved=localStorage.getItem('zero-hour-kage-model');if(kageVariants.includes(saved))return saved;}catch{}
 return 'cyber';
}
function loadKageArmor(variant){
 const asset=variant==='cyber'?'kage-cyber.glb?v=456':variant==='frog'?'kage-frog.glb?v=390':'kage-armored.glb?v=390';
 return new GLTFLoader().loadAsync('city-assets/licensed-characters/'+asset);
}
function setupKageModelPicker(classic,initial){
 const select=$('kage-model');
 let current=initial?readKageModel():'classic';
 const models=new Map([['classic',classic],[current,initial||classic]]);
 select.value=current;
 select.disabled=false;
 select.addEventListener('change',async()=>{
  const variant=select.value;
  select.disabled=true;
  try{
   if(!models.has(variant))models.set(variant,await loadKageArmor(variant));
   ninja.useAppearance(models.get(variant));
   current=variant;
   try{localStorage.setItem('zero-hour-kage-model',variant);}catch{}
   const url=new URL(location.href);
   if(url.searchParams.has('kage')){
    url.searchParams.set('kage',variant);
    history.replaceState(history.state,'',url);
   }
  }catch(error){
   console.warn('Kage model switch failed.',error);
   feed('Could not load the selected Kage model.');
  }finally{
   select.value=current;
   select.disabled=false;
  }
 });
}
async function initialize(){try{const [g,data,infantryModel,infantryMotion,cockpit,robotModel,robotSpec,heroModel,heroSpec,runnerModel,runnerSpec,missileModel,portalModel,portalSpec,humanoid,solaraModel,solaraSpec]=await Promise.all([new GLTFLoader().loadAsync('city-assets/city-kit.glb'),fetch('city-assets/city-layout.json').then(r=>{if(!r.ok)throw Error('layout request failed');return r.json()}),new GLTFLoader().loadAsync('city-assets/soldier-parts.glb'),fetch('city-assets/soldier-motion.json').then(r=>{if(!r.ok)throw Error('soldier motion request failed');return r.json()}),new GLTFLoader().loadAsync('city-assets/cockpit.glb'),new GLTFLoader().loadAsync(cyberpunkCity?'city-assets/siege-walker-cyber.glb?v=314':'city-assets/siege-walker.glb?v=plasma-18'),fetch(cyberpunkCity?'city-assets/siege-walker-cyber.json?v=314':'city-assets/siege-walker.json?v=plasma-18').then(r=>r.json()),new GLTFLoader().loadAsync('city-assets/violet-sentinel.glb'),fetch('city-assets/violet-sentinel.json').then(r=>r.json()),new GLTFLoader().loadAsync('city-assets/volt-runner.glb?v=runner-ai-7'),fetch('city-assets/volt-runner.json?v=runner-ai-7').then(r=>r.json()),cyberpunkCity?null:new GLTFLoader().loadAsync('city-assets/robot-missile.glb?v=salvo-9'),new GLTFLoader().loadAsync('city-assets/rift-warden.glb?v=portals-15'),fetch('city-assets/rift-warden.json?v=portals-15').then(r=>r.json()),new GLTFLoader().loadAsync('city-assets/licensed-characters/humanoid.glb?v=characters-24'),new GLTFLoader().loadAsync('city-assets/solara-frost.glb?v=solara-model-29'),fetch('city-assets/solara-frost.json?v=solara-model-29').then(r=>{if(!r.ok)throw Error('Solara spec request failed');return r.json();})]);const [shurikenModel,kunaiModel,kageArmor,voltArmor,violetArmor,riftArmor]=await Promise.all([new GLTFLoader().loadAsync('city-assets/kage-shuriken.glb?v=original-shuriken-441'),new GLTFLoader().loadAsync('city-assets/kage-kunai.glb?v=original-kunai-441'),readKageModel()!=='classic'?loadKageArmor(readKageModel()).catch(error=>{console.warn('Kage armor unavailable; using the classic model.',error);return null;}):null,new GLTFLoader().loadAsync('city-assets/licensed-characters/volt-armored.glb?v=330').catch(error=>{console.warn('Volt armor unavailable; using the classic model.',error);return null; }),new GLTFLoader().loadAsync('city-assets/licensed-characters/violet-armored.glb?v=386').catch(error=>{
  console.warn('Violet armor unavailable; using the classic model.',error);return null;
 }),new GLTFLoader().loadAsync('city-assets/licensed-characters/rift-armored.glb?v=390').catch(error=>{
  console.warn('Rift Warden armor unavailable; using the classic model.',error);return null;
 })]);const spiderModel=(testingMode||districtMode)?await new GLTFLoader().loadAsync('city-assets/licensed-robots/breaker-spider.glb?v=spider-breaker-263'):null;extract(g);if(cyberpunkCity){const [cityModel,cityManifest]=await Promise.all([new GLTFLoader().loadAsync(ASSET_CITY.modelUrl),fetch(ASSET_CITY.manifestUrl).then(r=>{if(!r.ok)throw Error('City asset manifest unavailable');return r.json();})]);assetCity=new AssetCity(cityModel,cityManifest);}layout=assetCityMode?assetCity.layout(data):testingMode?{...data,buildings:COMBAT_ARENA.buildings.map((position,i)=>({...data.buildings[i],id:'TEST-'+i,...position,floors:position.floors??12}))}:districtMode?{...data,buildings:assetCity.fitEvacuationBuildings(defenseMode?waveDefenseBuildings(mission1CityBuildings(data.buildings)):(mission1Mode?mission1CityBuildings:evacuationCityBuildings)(data.buildings))}:data;soldierParts=infantryModel;soldierMotion=infantryMotion;humanoidModel=humanoid;// Rainbow Star and Cinder Fang share the humanoid body now that the female model is not deployed.
const female=humanoid;physics=new DestructionWorld({maxDynamic:innerWidth<700?110:160,playerReserve:innerWidth<700?20:28,onDamage:buildingDamaged,onDetach:syncChunkColor,onFreeze:syncChunk,onMove:syncChunk,onCollapse:(id,f)=>{feed(id+' · structural supports failed. Floors '+(f+1)+' and above collapsing.');const b=buildingRecords.get(id);emitParticle('smoke',new THREE.Vector3(b.x,f*3+2,b.z),9,.9);}});addChunks();
 if(assetCity){
  const {loadPackagedCityTextures,setupCityTexturePicker}=await import('./asset-city-textures.js?v=313');
  await loadPackagedCityTextures(assetCity);
  if(assetCityMode)void setupCityTexturePicker(assetCity,$('test-controls'));
 }
 beamEffect=new EnergyBeamEffect(scene);robot=new SiegeWalker(scene,robotModel,robotSpec,{weaponHealthMultiplier:!evacuationMode&&!testingMode&&!convoyMode?1/WALKER_WEAPON_HEALTH_SCALE:1,onFire:()=>{shotsFired++;feed('Siege Walker unleashed its energy beam.');},onBeam:updateCannonBeam,onDebris:spec=>physics.addWreck(spec),onRemoveDebris:body=>{robotDeathEffects.removePart(body);physics.removeWreck(body);},onDeath:(point,options)=>robotDeathEffects.explode(point,options),onWreck:registerRobotWreck,onWeaponDestroyed:module=>{arsenal?.weaponDestroyed(module.id,robot,robotMissiles,walkerSniper);refreshUnitShapes();feed(module.label+' DESTROYED · weapon offline.');updateStats();},onFootfall:p=>emitParticle('smoke',new THREE.Vector3(p.x,.18,p.z),3,.22),onEffect:(p,smoke)=>{emitParticle('smoke',p,smoke?2:14,smoke?.45:1.2);if(!smoke){emitParticle('spark',p,28);particles.push({kind:'flash',p:p.clone(),v:new THREE.Vector3(),life:.4,max:.4,size:5,scale:1});}}});if(!districtMode&&!testingMode&&!convoyMode){makeTanks();makeHelicopters();makeTroops();}addProps();addTerrain();registerUnits();robotMissiles=new RobotMissiles(scene,missileModel,{cyberpunk:cyberpunkCity,redirect:(p,a,b)=>portalHero?.redirect(p,a,b),autoFire:false,canLaunch:()=>robot.isWeaponWorking('missiles')&&!robot.stunRemaining&&!['charging','firing'].includes(robot.weapon.phase),getMuzzles:()=>Array.from({length:6},(_,i)=>({position:robot.nodes.rocket_pod.localToWorld(new THREE.Vector3((i%3-1)*.94,.8+Math.floor(i/3)*.94,2.5)),direction:new THREE.Vector3(0,0,1).transformDirection(robot.nodes.rocket_pod.matrixWorld)})),getTargets:()=>{if(testingArena)return testingArena.heroUnits().filter(walkerAware);if(evacuation)return evacuationTargets(true);if(mission1Mode)return missionWalkerTargets('missiles');const u=unitDamage.units;return [u.find(v=>v.kind==='helicopter'&&v.entity.team===0&&v.alive&&v.id!==pilot?.active?.combatUnit?.id),u.find(v=>v.kind==='tank'&&v.entity.team===1&&v.alive),u.find(v=>v.kind==='infantry'&&v.entity.team===0&&v.alive),u.find(v=>v.kind==='helicopter'&&v.entity.team===1&&v.alive&&v.id!==pilot?.active?.combatUnit?.id),u.find(v=>v.kind==='tank'&&v.entity.team===0&&v.alive),u.find(v=>v.kind==='infantry'&&v.entity.team===1&&v.alive)].filter(Boolean);},isRobotAlive:()=>!!robot.combatUnit?.alive,traceWorld:(a,b,r)=>traceWorld(a,b,{radius:r,owner:'siege-walker',includeMissiles:false}),onImpact:(p,hit,id)=>explosion(p.clone(),18,WALKER_MISSILE_BLAST_RADIUS,'rocket',false,hit,'siege-walker',id),onBurst:p=>missileExplosions.burst(p,{air:true}),onTrail:p=>emitParticle('smoke',p,1,.19),onLaunch:p=>{shotsFired++;robot.podRecoil=.18;emitParticle('spark',p,5,1.2);},onSalvo:()=>feed('Shoulder pod launching '+WALKER_SALVO_SIZE+' missiles. Heroes intercepting.')} );walkerSniper=new WalkerSniper(scene,{
 canFire:()=>!!robot.combatUnit?.alive&&robot.isWeaponWorking('plasma')&&!robot.stunRemaining,
 getMuzzle:target=>robot.aimPlasma(target),
 getTargets:()=>{
  if(testingArena)return testingArena.heroUnits().filter(walkerAware);
  if(mission1Mode)return missionWalkerTargets('plasma');
  if(!evacuation)return unitDamage.units.filter(u=>['tank','infantry'].includes(u.kind));
  const visible=evacuationTargets().filter(u=>u.kind!=='helicopter'),priority=evacuation.waveTarget(visible);
  return priority?[priority,...visible.filter(u=>u!==priority)]:visible;
 },
 traceCover:(a,b)=>traceImpact(a,b,{sections:physics.chunks,ground:false}),
 traceShot:(a,b,r)=>{
  let hit=traceVioletBarrier(a,b,traceWorld(a,b,{radius:r,owner:'siege-walker',moving:true,livingOnly:true,includeMissiles:false,extraTargets:raiderHeroTargets()}),r);
  for(const barrier of solara?.barriers()||[]){
   if(!barrier.active)continue;
   const t=barrier.trace(a,b,r);
   if(t!==null&&(!hit||t<hit.t))hit={kind:'ice-barrier',barrier,t,point:a.clone().lerp(b,t)};
  }
  return hit;
 },
 redirect:(shot,a,b)=>portalHero?.redirect(shot,a,b),
 onImpact:sniperImpact,
 onLaunch:p=>{robot.plasmaRecoil=.42;shotsFired++;emitParticle('spark',p,18,1.8);},
 onEvent:feed
 });arsenal=new RobotArsenal({plasma:true});hero=new VioletHero(scene,heroModel,heroSpec,{redirect:(p,a,b)=>portalHero?.redirect(p,a,b),onPowerHit:violetPowerHit,characterModel:violetArmor||humanoid,getRobot:heroRobot,getMissileTarget:from=>robotMissiles.selectThreat(from,'violet'),claimMissile:m=>robotMissiles.claim(m,'violet'),buildings:layout.buildings,onEvent:feed,traceOrb:(from,to)=>traceWorld(from,to,{radius:.48,allied:true,livingOnly:!!hero?.active}),onOrbHit:violetOrbImpact});beamCombat=new BeamCombat({physics,units:unitDamage,onDebris:p=>{const point=new THREE.Vector3().copy(p);emitParticle('spark',point,6,.9);emitParticle('smoke',point,1,.65);},getHeroTargets:playerHitTargets,onHeroHit:(u,p,power)=>u.entity.receiveEyeHit(p,power),getTerrainHit:traceTerrain,getBarriers:()=>[...(hero?.barriers()||[]),...(mochi?.barriers()||[])],onImpact:(p,collision)=>{weaponImpacts.beam++;if(collision.kind==='shield'||collision.section)return;emitParticle('spark',new THREE.Vector3(p.x,p.y,p.z),7,1.8);emitParticle('smoke',new THREE.Vector3(p.x,p.y,p.z),2,.8);}});runner=new Speedster({scene,camera,controls,canvas:renderer.domElement,model:runnerModel,spec:runnerSpec,characterModel:voltArmor||humanoid,getBuildings:()=>layout.buildings,getRobot:heroRobot,getMissileTarget:from=>robotMissiles.selectThreat(from,'volt',m=>traceWorld(from,m.position,{radius:.1,allied:true})?.missile===m)||robotMissiles.selectThreat(from,'volt'),getAimTargets:()=>[...(robotMissiles?.missiles||[]).filter(m=>m.alive).map(m=>({id:m.id,kind:'missile',position:m.position})),...unitDamage.units.filter(u=>u.alive&&u.kind==='robot'&&u.entity!==bastionTest()?.boss).flatMap(u=>u.shapes.filter(shape=>shape.part!=='capacitor').map((shape,i)=>({id:u.id+'-'+(shape.part||i),unitId:u.id,kind:'robot',position:shape.center,half:shape.half,rotation:shape.rotation})))],getSections:arenaSections,traceAim:(from,to,options={})=>options.sectionsOnly?traceImpact(from,to,{sections:arenaSections(),ground:false}):traceWorld(from,to,{...options,allied:!!options.allied,includeVoltOrb:options.includeVoltOrb??!!runner?.active}),getStormSections:()=>physics.chunks,dashChargeMultiplier:()=>defenseMode&&missionRaiders?.upgrades.has('dash')?1.3:0,getStormTarget:voltGroundTarget,onStormHit:voltStormHit,onStormStrikeBuildings:buildings=>{for(const id of buildings)physics.checkSupports(id);},onElectric:electricAttack,onThunderHit:(hit,power,seconds)=>{
  const before=droneEngineHealth(hit);
  const damage=damageRobotHit(hit,power,'thunder-punch',true);
  const dealt=damage>0||droneEngineHealth(hit)<before;
  const enemy=hit.unit.entity;
  if(dealt&&hit.unit.alive&&![robot,argus,bastionTest()?.boss,testingArena?.ronin].includes(enemy))enemy.stun?.(seconds);
  return dealt;
 },onThunderImpact:(point,connected)=>{
  // A connected Thunder Punch freezes the world for a beat (hit-stop) and kicks the camera hard.
  droneImpactShake=Math.max(droneImpactShake,connected?1:.25);if(connected)hitStop=Math.max(hitStop,.085);
  if(connected)emitParticle('spark',new THREE.Vector3().copy(point),20,1.3);
 },onCircuitHit:(hit,power)=>{
  const before=droneEngineHealth(hit);
  const dealt=damageRobotHit(hit,power,'circuit-breaker',true);
  return dealt>0||droneEngineHealth(hit)<before;
 },onCircuitDetonate:point=>{
  const origin=new THREE.Vector3().copy(point);
  robotDeathEffects.explode(origin,{large:false,secondary:true});
  emitParticle('spark',origin,24,1.5);
 },onCriticalMass:criticalMassBurst,onWeldHit:weldingBeamHit,onDashHit:(hit,power)=>weldingBeamHit(hit,power,'electric-dash'),robotPreparing:()=>heroRobot()===robot?arsenal.preparing(robot,walkerSniper):heroRobot().windup>0,onStun:(hit)=>{if(hit.unit!==robot.combatUnit){const target=hit.unit.entity;target.stun(VOLT_STUN.duration);const damage=liberationMode?damageRobotHit(hit,VOLT_STUN.damage,'stun',true):hit.unit.entity===bastionTest()?.boss?bastionTest().boss.applyHit(hit,VOLT_STUN.damage,'overload-'+runner.stunShots):unitDamage.hurt(hit.unit,VOLT_STUN.damage,hit.point,hit.part);if(!liberationMode){target.recordHit('stun',null,damage);if(damage>0)alertAfterPlayerHit(hit.unit,runner);}feed(target===argus?'Volt overload — ARGUS stunned!':'Volt overload — raider stunned!');return true;}arsenal.interrupt(robot,robotMissiles,walkerSniper);eyeBeams?.cycle.cancel();robot.stun(VOLT_STUN.duration);damageRobotHit(hit,VOLT_STUN.damage,'stun',runner.active);feed('Volt overload — robot stunned!');return true;},getUnits:()=>unitDamage.units,getThreats:portalThreats,traceThreat:(a,b,p)=>traceWorld(a,b,{radius:p.radius??.12,owner:p.owner,includeMissiles:false}),onMoveUnit:moveDashAlly,onPhaseUnit:phaseDashAlly,onEvent:feed,isPaused:()=>paused||liberationMode&&(missionRaiders?.upgradePending||missionRaiders?.ended),onEnter:()=>{queueMicrotask(startDesktopPlay);ninja?.exit();pilot?.exit();view='runner';document.querySelector('.viewer').classList.remove('is-solara-view');paused=false;speed=1;keys.clear();heightInput=0;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause simulation');document.querySelectorAll('[data-speed]').forEach(b=>{b.disabled=true;b.classList.toggle('active',b.dataset.speed==='1')});document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('selected'));feed('Volt Rush controlled. Run toward a wall to climb.');},onExit:()=>{view='free';keys.clear();document.querySelectorAll('[data-speed]').forEach(b=>b.disabled=false);$('camera-label').textContent='OBSERVER / FREE ORBIT';feed('Volt Rush returned to CPU control.');}});pilot=new HelicopterPilot({scene,camera,controls,canvas:renderer.domElement,helicopters,cockpit,traceAim:(from,to,owner)=>traceWorld(from,to,{owner}),getSections:arenaSections,isPaused:()=>paused,onEnter:h=>{queueMicrotask(startDesktopPlay);ninja?.exit();view='pilot';document.querySelector('.viewer').classList.remove('is-solara-view');paused=false;speed=1;keys.clear();heightInput=0;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause simulation');document.querySelectorAll('[data-speed]').forEach(b=>{b.disabled=true;b.classList.toggle('active',b.dataset.speed==='1')});document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('selected'));feed('Manual flight · drag to aim, then launch a rocket.');},onExit:h=>{h.phase-=simTime*.055;view='free';keys.clear();document.querySelectorAll('[data-speed]').forEach(b=>b.disabled=false);$('camera-label').textContent='OBSERVER / FREE ORBIT';feed('Pilot released. Rotorcraft returning to its patrol.');},isBlocked:()=>!!(runner?.active||ninja?.active),onMissile:(from,to,team)=>fire(from,to,team,'rocket',true,pilot.active.combatUnit.id)});portalHero=new PortalHero(scene,portalModel,portalSpec,{characterModel:riftArmor||humanoid,getRobot:heroRobot,getUnits:()=>unitDamage.units,getThreats:portalThreats,traceThreat:(a,b,p)=>p.owner?.startsWith('combat-drone-')?traceDroneRound(a,b,p.owner,p.radius):traceWorld(a,b,{radius:p.radius??.12,owner:p.owner,includeMissiles:false}),traceBolt:(a,b)=>traceWorld(a,b,{radius:.10,allied:true}),isExitClear:portalExitClear,onTeleport:teleportFriendly,onBoltHit:portalBoltHit,onEvent:feed,getTravelPositions:portalTravelPositions});solara=new SolaraHero(scene,solaraModel,solaraSpec,female,{redirect:(p,a,b)=>portalHero?.redirect(p,a,b),getRobot:heroRobot,getUnits:()=>unitDamage.units,getThreats:()=>walkerSniper.threats(),getMissileTarget:selectSolaraMissile,claimMissile:(m,seconds)=>robotMissiles.claim(m,'solara',seconds),traceFireball:(a,b)=>traceWorld(a,b,{radius:.34,allied:true}),onFireballHit:(hit,p)=>{if(hit.orb)return bastionTest().boss.applyHit(hit,90,'hero-'+simTime);if(hit.missile)return robotMissiles.hurt(hit.missile,60,'solara');if(hit.unit?.kind==='robot'&&hit.unit.alive){return damageRobotHit(hit,90,'fire');}if(hit.section)physics.impact(p,10,1.7,hit.section,{source:'solara-frost'});return 0;},onEvent:feed,buildings:layout.buildings});eyeBeams=new RobotEyeBeams(scene,{redirect:(p,a,b)=>portalHero?.redirect(p,a,b),getRobot:()=>robot,getRunner:()=>runner,canAttack:()=>!robot.stunRemaining&&(!evacuation||evacuation.visible(robot.root.position.clone().add(new THREE.Vector3(0,18,0)),runner.root.position))&&['recovery','disarmed'].includes(arsenal.phase)&&!['charging','firing'].includes(robot.weapon.phase)&&!walkerSniper.busy&&!robotMissiles.pending&&(arsenal.phase==='disarmed'||eyeBeams?.cycle.phase!=='idle'||arsenal.delaySeconds-arsenal.elapsed>2.2),traceWorld:(a,b,r)=>traceWorld(a,b,{radius:r,owner:'siege-walker',moving:true,includeMissiles:false}),onLaunch:()=>{shotsFired++;},onImpact:(p,hit)=>{if(absorbBubble(hit,p))return;if(hit.kind!=='speedster'){if(hit.unit?.kind!=='hero')playerBlastFeedback(p,1.2,18);physics.impact(p,5,1.1,hit.section||null,{source:'siege-walker'});unitDamage.blast(p,{direct:hit.unit||null,power:18,radius:1.2,filter:u=>u.kind!=='robot'&&!mochi?.protects(u)});}emitParticle('spark',p,8,1.1);particles.push({kind:'flash',p:p.clone(),v:new THREE.Vector3(),life:.16,max:.16,size:.55,scale:1});}});mochi=new MochiHero(scene,humanoid,{getRobot:heroRobot,getUnits:()=>unitDamage.units.filter(u=>u.alive&&u.kind!=='robot'),getThreats:portalThreats,traceWave:(a,b)=>traceWorld(a,b,{radius:.3,allied:true}),redirect:(p,a,b)=>portalHero?.redirect(p,a,b),onJoyHit:(hit,p)=>{if(hit.orb)return bastionTest().boss.applyHit(hit,MOCHI.damage,'hero-'+simTime);if(hit.missile)return robotMissiles.hurt(hit.missile,100,'mochi');if(hit.unit?.kind!=='robot'||!hit.unit.alive)return 0;const target=hit.unit.entity;if(target===robot){arsenal.interrupt(robot,robotMissiles,walkerSniper);eyeBeams.cycle.cancel();}target.stun(MOCHI.dazeSeconds,'joy');return damageRobotHit(hit,MOCHI.damage,'joy');},onEvent:feed,buildings:layout.buildings});ninja=new NinjaHero({hasBackstabDash:()=>defenseMode&&missionRaiders?.upgrades.has('backstab-dash'),hasExtraAirJump:()=>defenseMode&&missionRaiders?.upgrades.has('extra-air-jump'),kunaiModel,shurikenModel,shurikenConfig:await fetch('ninja-shuriken-config.json?v=439').then(r=>r.json()),scene,model:kageArmor||humanoid,camera,controls,canvas:renderer.domElement,getSections:arenaSections,traceWorld:(a,b,options={})=>options.sectionsOnly?traceImpact(a,b,{sections:arenaSections(),ground:false,radius:.15}):traceWorld(a,b,{...options,livingOnly:true}),onHit:ninjaHit,getRobot:heroRobot,getDashEnemies:()=>unitDamage.units.filter(u=>u.kind==='robot'&&u.alive),getMissile:from=>robotMissiles.selectThreat(from,'ninja'),getAttackThreats:()=>robotMissiles?.missiles||[],getSmokeThreats:()=>{const people=civilianScene()?.civilians||[],danger=targetedCivilianGroups(people,{walker:robot,missiles:robotMissiles?.missiles,plasma:walkerSniper?.shells,plasmaClock:walkerSniper?.clock});return people.filter(c=>c.unit.alive&&danger.has(c.group||c)).map(c=>c.root.position);},redirect:(p,a,b)=>portalHero?.redirect(p,a,b),isPaused:()=>paused||liberationMode&&(missionRaiders?.upgradePending||missionRaiders?.ended),onEnter:()=>{queueMicrotask(startDesktopPlay);runner?.exit();pilot?.exit();view='ninja';keys.clear();heightInput=0;paused=false;speed=1;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause simulation');document.querySelector('.viewer').classList.remove('is-solara-view');document.querySelectorAll('[data-speed]').forEach(b=>{b.disabled=true;b.classList.toggle('active',b.dataset.speed==='1');});document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('selected'));$('camera-label').textContent='KAGE / PLAYER CONTROL';feed('Kage controlled. Jump twice, or jump near a wall to spring upward. Air dash kills reset the dash.');},onExit:()=>{view='free';keys.clear();document.querySelectorAll('[data-speed]').forEach(b=>b.disabled=false);$('camera-label').textContent='OBSERVER / FREE ORBIT';}});for(const event of ['pointerdown','keydown'])window.addEventListener(event,()=>runner.feedback.unlock(),{once:true});if(evacuationMode){evacuation=new EvacuationScene(scene,unitDamage,{onWave:()=>{if(!['charging','firing'].includes(robot.weapon.phase)){robot.target=null;robot.aiming=false;}},visible:districtVisible,onEvent:feed,isPathClear:evacuationPathClear,maintainLandingZone:maintainEvacPad,getGroundHeight:terrainHeight});}
if(districtMode){
 const bruiserOptions={spiderModel,isRooftopHero,onDebris:spec=>physics.addWreck(spec),onRemoveDebris:body=>{robotDeathEffects.removePart(body);physics.removeWreck(body);},onDeath:(point,options)=>robotDeathEffects.explode(point,options),onWreck:registerRobotWreck,visible:districtVisible,isPathClear:(a,b)=>!traceImpact(new THREE.Vector3(a.x,a.y+1.3,a.z),new THREE.Vector3(b.x,b.y+1.3,b.z),{sections:physics.chunks,ground:false,radius:1.45*RAIDER_COMBAT.modelScale}),trace:traceRaiderProjectile,onHeroHit:(unit,point,power)=>{unit.entity.receiveEyeHit?.(point,power);emitParticle('spark',new THREE.Vector3().copy(point),8,.5);particles.push({kind:'flash',p:new THREE.Vector3().copy(point),v:new THREE.Vector3(),life:.15,max:.15,size:.5,scale:1});},redirect:(p,a,b)=>portalHero?.redirect(p,a,b),onEvent:feed};
 if(evacuation){
  evacuation.raider=new EvacRaiderWaves(scene,unitDamage,{
   ...bruiserOptions,canSpawn:()=>!robot.dead&&robot.combatUnit.alive,
   landing:evacuation.landing,getHelicopter:()=>evacuation.heli,
   getTargets:()=>[...raiderHeroTargets(),...evacuation.civilians.map(c=>c.unit)]
  });
 }else{
  const WaveController=liberationMode?CityLiberation:defenseMode?WaveDefense:MissionEnemyWaves;
  const ui=liberationMode?new LiberationUI(viewer,scene,{
   release:()=>{runner.keys.clear();runner.mouseFire=runner.heldFire=false;ninja.keys.clear();ninja.heldLaser=ninja.heldFire=ninja.heldShuriken=false;lux?.player.keys.clear();keys.clear();if(document.pointerLockElement)document.exitPointerLock();},
   resume:()=>{if(lux?.active)lux.player.lock();if(runner.active)runner.requestMouseLock();if(ninja.active)ninja.requestLock();},
   restart:()=>resetDistrict()
  }):null;
  missionRaiders=new WaveController(scene,unitDamage,{
   buildings:layout.buildings,bruiser:bruiserOptions,drone:droneCombatOptions(),getTargets:raiderHeroTargets,onEvent:feed,
   ui,sound:(a,b)=>runner.feedback.electricalCue(runner.preferences.sound,a,b,.024),applyHit:(hit,power,kind)=>damageRobotHit(hit,power,kind,true),
   bossUnits:()=>[robot.combatUnit,evacuationReinforcement?.adapter.boss.combatUnit].filter(Boolean),
   get storage(){return window.localStorage;},bastionActive:()=>!!evacuationReinforcement?.adapter.enabled,
   openStreet:p=>!traceImpact({x:p.x,y:.3,z:p.z},{x:p.x,y:24,z:p.z},{sections:physics.chunks,ground:false,radius:3}),
   ring:(p,r,color)=>ui.ring(p,r,color),
   arc:(from,to,color)=>ui.arc(from,to,color),
   visible:districtVisible,walker:robot,startArsenal:()=>arsenal.reset(),
   finalBossDefeated:()=>!!evacuationReinforcement?.adapter.enabled&&evacuationReinforcement.adapter.boss.dead,
   status:defenseStatus,finish:defenseResult
  });
 }
 if(liberationMode){
  for(const actor of [runner,ninja])actor.onLiberationHit=power=>actor.active?missionRaiders.hitHero(power):false;
 }
 runner.motion.bounds=districtMovementBounds();runner.dash.bounds=districtMovementBounds(5);ninja.motion.body.bounds=districtMovementBounds();
}
if(evacuation){evacuationHelicopterStrike=new EvacuationHelicopterStrike({robot,pod:robotMissiles,artillery:walkerSniper,arsenal,isEligible:target=>evacuationTargets().some(u=>u===target)});robot.targetSelector=units=>{if(evacuationHelicopterStrike.busy)return null;const target=evacuation.pick(arsenal.phase==='beam'?units:units.filter(u=>u.kind!=='helicopter'));if(target?.kind==='helicopter'){evacuationHelicopterStrike.request(target);return null;}return target;};}
prism=new PrismwingHero(scene,female,{appearanceModel:solaraModel,appearanceSpec:solaraSpec,getRobot:heroRobot,buildings:layout.buildings,traceRainbow:(a,b,r)=>traceWorld(a,b,{radius:r,allied:true}),onRainbowHit:(hit,p,power)=>{if(hit.orb)return bastionTest().boss.applyHit(hit,power,'rainbow-'+simTime);if(hit.missile)return robotMissiles.hurt(hit.missile,power,'prism');if(hit.unit?.kind==='robot'&&hit.unit.alive)return damageRobotHit(hit,power,'rainbow');if(hit.section)physics.impact(p,3*power/PRISMWING.damagePerSecond,1,hit.section,{source:'prismwing'});return 0;}});
setupKageModelPicker(humanoid,kageArmor);
runner.motion.getPlatforms=heroPlatforms;
ninja.motion.body.getPlatforms=heroPlatforms;
if(defenseMode||liberationMode){
 document.querySelector('[data-select-hero="violet"] .hero-card-control').textContent='Player or CPU';
 document.querySelector('[data-select-hero="rift"] .hero-card-control').textContent='Player or CPU';
 const manualOptions={
  camera,canvas:renderer.domElement,viewport,controls,inputMode,
  spawn:districtHeroStart,bounds:districtMovementBounds(),terrain:terrainHeight,getPlatforms:heroPlatforms,
  blocked:(a,b,radius)=>traceImpact(a,b,{sections:physics.chunks,ground:false,radius}),
  paused:()=>paused||missionRaiders.ended||missionRaiders.upgradePending
 };
 if(defenseMode)hero.player=new VioletPlayer(hero,manualOptions);
 const groundOptions={...manualOptions,buildings:layout.buildings,getBuilding:id=>buildingRecords.get(id),roofBelow:(x,z,top,bottom)=>{
  const a={x,y:top,z},b={x,y:bottom,z};
  const sections=physics.chunks.querySegment(a,b,0).filter(c=>c.type==='slab'&&c.state==='intact'&&!c.hasDetached);
  return traceImpact(a,b,{sections,ground:false,radius:0});
 }};
 if(defenseMode)portalHero.player=new RiftPlayer(portalHero,groundOptions);
 const model=await new GLTFLoader().loadAsync('city-assets/licensed-characters/luxmancer.glb?v=416');
 lux=new Luxmancer(scene,model,{hasUpgrade:id=>missionRaiders?.upgrades?.has(id),getUnits:()=>unitDamage.units,visible:districtVisible,
  traceBolt:(a,b,skipUnits)=>traceWorld(a,b,{radius:.10,allied:true,livingOnly:true,skipUnits}),
  onHit:(hit,point,power,kind)=>{
   if(hit.orb||hit.unit?.kind==='robot')return damageRobotHit(hit,power,liberationMode?kind:'solar',true);
   if(hit.missile)return robotMissiles.hurt(hit.missile,power,'luxmancer');
   if(hit.section)physics.impact(point,power*.06,1,hit.section,{source:'luxmancer'});
  }});
 lux.player=new LuxPlayer(lux,groundOptions);
 if(defenseMode){const playLux=document.createElement('button');playLux.id='play-lux';playLux.textContent='Play Luxmancer';
 $('play-runner').after(playLux);
 playLux.onclick=()=>{if(!missionRaiders.ended&&!lux.active){setView('overview');lux.player.enter(RELAY_INTRO,false);startDesktopPlay();}};
 const play=document.createElement('button');play.type='button';play.id='play-violet';play.textContent='Play Violet';play.hidden=true;
 $('play-runner').after(play);play.onclick=()=>{if(!missionRaiders.ended&&!hero.active){setView('hero');hero.player.enter(RELAY_INTRO,false);startDesktopPlay();}};
 const riftPlay=document.createElement('button');
 riftPlay.type='button';riftPlay.id='play-rift';riftPlay.textContent='Play Rift Warden';riftPlay.hidden=true;
 play.after(riftPlay);riftPlay.onclick=()=>{if(!missionRaiders.ended&&!portalHero.active){setView('portal');portalHero.player.enter(RELAY_INTRO,false);startDesktopPlay();}};}
}
const axoModel=null;axo=new AxolotlHero(scene,{model:axoModel,getUnits:()=>unitDamage.units,groundHeight:terrainHeight,bounds:testingMode?COMBAT_ARENA.movementBounds:convoyMode?convoyConfig.map.bounds:districtMode?districtMovementBounds():{minX:-56,maxX:56,minZ:-56,maxZ:56},getFlightHeight:axoFlightHeight,isClear:(a,b)=>!traceImpact(new THREE.Vector3(a.x,a.y+.65,a.z),new THREE.Vector3(b.x,b.y+.65,b.z),{sections:physics.chunks,ground:false,radius:1}),trace:(a,b)=>traceWorld(a,b,{allied:true,radius:.08}),onHit:(hit,power)=>damageRobotHit(hit,power,'frost')});
ember=new EmbercatHero(scene,female,{getUnits:()=>unitDamage.units,getLanding:emberLanding,bounds:testingMode?COMBAT_ARENA.movementBounds:convoyMode?convoyConfig.map.bounds:districtMode?districtMovementBounds():{minX:-56,maxX:56,minZ:-56,maxZ:56},groundHeight:terrainHeight,cruiseHeight:Math.max(25,...layout.buildings.map(b=>b.floors*3+EMBERCAT.cruiseClearance)),clearFlight:(a,b)=>!traceImpact(a,b,{sections:physics.chunks,ground:false,radius:.12}),trace:(a,b)=>traceWorld(a,b,{radius:.28,allied:true}),onHit:(hit,p,power)=>{if(hit.orb)return bastionTest()?.boss.applyHit(hit,power,'ember-'+simTime)||0;if(hit.missile)return robotMissiles.hurt(hit.missile,power,'ember');if(hit.unit?.kind==='robot'&&hit.unit.alive)return damageRobotHit(hit,power,'fire');if(hit.section)physics.impact(p,6,1.3,hit.section,{source:'cinder-fang'});return 0;}});
if(convoyMode){const argusAsset=await Promise.all([new GLTFLoader().loadAsync('city-assets/argus-aster.glb?v=argus-sustained-205'),fetch('city-assets/argus-aster.json?v=argus-sustained-205').then(r=>{if(!r.ok)throw Error('ARGUS rig unavailable');return r.json();})]);convoy=new ConvoyMission(scene,unitDamage,convoyConfig,{onEvent:feed,groundHeight:terrainHeight,isBusPathClear:convoyBusPathClear,isCivilianPathClear:convoyCivilianPathClear,clearDebris:clearConvoyDebris,onBusDestroyed:p=>robotDeathEffects.explode(p,{large:false}),onSmoke:p=>emitParticle('smoke',p,2,.65),getBossDestroyed:()=>argus?.dead??false});convoyHUD=new ConvoyHUD($('convoy-status'),{onResults:()=>convoyResults.show(convoy)});convoyResults=new ConvoyResults(document.querySelector('.viewer'),{onOpen:()=>{ninja?.exit();runner?.exit();pilot?.exit();if(document.pointerLockElement)document.exitPointerLock();resultsPause=paused;paused=true;keys.clear();},onClose:()=>{paused=resultsPause;$('pause').textContent=paused?'▶':'Ⅱ';},onRestart:()=>$('reset').click()});argus=new Argus(scene,unitDamage,argusAsset[0],argusAsset[1],await fetch('argus-config.json?v=argus-tracking-207').then(r=>{if(!r.ok)throw Error('ARGUS config unavailable');return r.json();}),{getConvoy:()=>convoy,physics,onEvent:feed,getHeroes:()=>[runner,ninja,hero,solara,portalHero,mochi,prism,axo,ember].filter(h=>h?.enabled!==false),getBuildings:()=>layout.buildings,roofHeight:argusRoofHeight,getBarriers:()=>[...(hero?.barriers()||[]).map(b=>({...b,hero})),...(mochi?.barriers()||[])],onHeroHit:(h,p,power)=>{h.receiveEyeHit?.(p,power);emitParticle('spark',p,5,1);},onImpulse:(h,v,c)=>{const motion=h.motion?.body||h.motion;if(h.motion?.dash)h.motion.finishDash();motion?.applyKnockback?.(v,c);},onCharge:argusCharge,onThreat:p=>{hero?.receiveThreat(p);mochi?.receiveBeam(p);},onSpark:p=>{if(p)emitParticle('spark',p,4,1.2);},onStomp:p=>{emitParticle('smoke',p,10,.8);emitParticle('spark',p,16,1.5);},onDebris:spec=>physics.addWreck(spec),onRemoveDebris:body=>{robotDeathEffects.removePart(body);physics.removeWreck(body);},onDeath:(p,o)=>robotDeathEffects.explode(p,o),onWreck:registerRobotWreck});document.querySelector('.boss-health-hud b').textContent='ARGUS';const argusStatus=document.createElement('small');argusStatus.id='argus-status';document.querySelector('.boss-health-hud').append(argusStatus);document.querySelector('.boss-health-hud').setAttribute('aria-label','ARGUS health');resetConvoy();}
if(testingMode){runner.motion.bounds={...COMBAT_ARENA.movementBounds};runner.dash.bounds={...COMBAT_ARENA.dashBounds};ninja.motion.body.bounds={...COMBAT_ARENA.movementBounds};const shogunModel=await new GLTFLoader().loadAsync('city-assets/licensed-robots/ronin-shogun.glb?v=310').catch(error=>{console.warn('Shogun unavailable; using original Ronin.',error);$('test-ronin-model').value='original';$('test-ronin-model').disabled=true;return null;});testingArena=new CombatTesting(scene,unitDamage,{spiderModel,isRooftopHero,shogunModel,drone:droneCombatOptions(),rainLanding:(x,z)=>{const hit=traceImpact({x,y:130,z},{x,y:-1,z},{sections:physics.chunks.filter(c=>!c.collisionDisabled&&!c.hidden&&c.state==='intact'),ground:false,radius:0});if(hit)return new THREE.Vector3().copy(hit.point);return new THREE.Vector3(x,terrainHeight(x,z),z);},onBastionDeathBlast:bastionDeathBlast,onRoninBuildingStrike:spec=>damageRoninBuildings(physics,spec),onBastionRainImpact:(point,radius,power,hit)=>{physics.impact(point,32,radius,hit?.section||null,{source:'bastion'});},onPyroclastImpact:(point,radius,hit)=>{physics.impact(new THREE.Vector3().copy(point),26,radius,hit?.section||null,{source:'pyroclast'});const near=1-Math.min(1,camera.position.distanceTo(point)/95);if(near>0)droneImpactShake=Math.max(droneImpactShake,Math.min(1,radius*.12*near));},getBuildings:()=>layout.buildings,isMireguardPathClear:(a,b)=>[.12,.45,.8].every(f=>!traceImpact(new THREE.Vector3(a.x,a.y+MIREGUARD.height*f,a.z),new THREE.Vector3(b.x,b.y+MIREGUARD.height*f,b.z),{sections:physics.chunks,ground:false,radius:MIREGUARD.bodyRadius})),onBastionImpact:hit=>{if(hit.section)physics.impact(new THREE.Vector3().copy(hit.point),18,3.8,hit.section,{source:'bastion'});},bastionConfig:await fetch('bastion-config.json?v=gatling-333').then(r=>r.json()).then(config=>assetCityMode?{...config,appearance:'cyberpunk'}:config),onEvent:feed,getHeroes:()=>[runner,hero,solara,portalHero,mochi,ninja,prism,axo,ember],readConfig:()=>({walker:$('test-walker').checked,drones:$('test-drones').value,preset:$('test-enemy-preset').value,roninModel:$('test-ronin-model').value}),visible:(a,b)=>!traceImpact(a,b,{sections:physics.chunks,ground:false}),trace:traceRaiderProjectile,redirect:(p,a,b)=>portalHero?.redirect(p,a,b),isPathClear:(a,b)=>!traceImpact(new THREE.Vector3(a.x,a.y+1.3,a.z),new THREE.Vector3(b.x,b.y+1.3,b.z),{sections:physics.chunks,ground:false,radius:1.45*RAIDER_COMBAT.modelScale}),onHeroHit:(u,p)=>u.entity.receiveEyeHit?.(p),onDebris:spec=>physics.addWreck(spec),onRemoveDebris:body=>{robotDeathEffects.removePart(body);physics.removeWreck(body);},onDeath:(p,o)=>robotDeathEffects.explode(p,o),onWreck:registerRobotWreck});resetTestingEnemies();}
if(districtMode){
 const [bossConfig,transportConfig]=await Promise.all([fetch('bastion-config.json?v=gatling-333').then(r=>r.json()),fetch('evacuation-reinforcement-config.json?v=slower-delivery-244').then(r=>r.json())]);
 bossConfig.appearance='cyberpunk';bossConfig.dilation.enabled=false;bossConfig.debug.enabled=false;bossConfig.rain.bounds=[districtBounds.minX+8,districtBounds.maxX-8];
 const adapter=new BastionTesting(scene,unitDamage,bossConfig,{mission:true,onDeathBlast:bastionDeathBlast,arenaBounds:defenseMode?districtMovementBounds():escortMovementBounds(),getHeroes:()=>[runner,hero,solara,portalHero,mochi,ninja,prism,axo,ember],onEvent:feed,traceProjectile:(a,b,r)=>traceRaiderProjectile(a,b,'bastion',r),onProjectileImpact:hit=>{if(hit.section)physics.impact(new THREE.Vector3().copy(hit.point),18,3.8,hit.section,{source:'bastion'});},rainLanding:(x,z)=>{const hit=traceImpact({x,y:130,z},{x,y:-1,z},{sections:physics.chunks.filter(c=>!c.collisionDisabled&&!c.hidden&&c.state==='intact'),ground:false});return hit?new THREE.Vector3().copy(hit.point):new THREE.Vector3(x,terrainHeight(x,z),z);},onRainImpact:(point,radius,power,hit)=>physics.impact(point,32,radius,hit?.section||null,{source:'bastion'})});
 evacuationReinforcement=new EvacuationBastionReinforcement(scene,adapter,transportConfig,{getWalker:()=>robot,getGroundHeight:terrainHeight,canDeploy:()=>liberationMode?missionRaiders.stage===1&&missionRaiders.phase==='boss':!defenseMode||missionRaiders.phase==='reinforcements',onEvent:feed,onLanding:point=>{emitParticle('smoke',point,24,5);robotDeathEffects.explode(point,{large:true,secondary:true});evacuationCinematic?.start(point);}});

 if(!liberationMode)evacuationCinematic=new EvacuationBastionCinematic({scene,camera,controls,viewport,transport:evacuationReinforcement,violet:hero,rift:portalHero,getPlayer:()=>controlledHero()||[runner,ninja,solara,mochi,prism,axo,ember].find(h=>h.enabled!==false)||runner,clearInput:()=>{keys.clear();heightInput=0;runner.clearInput();ninja.clearInput();hero.player?.clear();portalHero.player?.clear();lux?.player.clear();pilot?.clearInput();},isSelected:h=>roster.has(h===hero?'violet':'rift'),onComplete:()=>{$('hero-readout').hidden=false;$('portal-readout').hidden=false;feed('Violet Sentinel and Rift Warden join the fight.');if(runner.active)runner.requestMouseLock();if(ninja.active)ninja.requestLock();if(hero.active)hero.player.lock();if(portalHero.active)portalHero.player.lock();if(lux?.active)lux.player.lock();updateStats();}});
}
minimap.setWorld({bounds:testingMode?COMBAT_ARENA.bounds:convoyMode?convoyConfig.map.bounds:districtMode?districtBounds:{minX:-60,maxX:60,minZ:-60,maxZ:60},roadLanes:testingMode?COMBAT_ARENA.roadLanes:undefined,roadExtent:testingMode?COMBAT_ARENA.bounds.maxZ:undefined,roadSegments:districtMode?districtRoads:undefined,buildings:layout.buildings,subways:evacuationMode?EVACUATION_ENTRANCES:[],landing:evacuation?.landing,route:convoyMode?convoyConfig.map.route:undefined});for(const h of[runner,ninja,hero,solara,portalHero,mochi,prism,axo,ember])guardHeroInSmoke(h,()=>ninja?.smoke);configureHeroes();loaded=true;$('choose-heroes').disabled=false;if(!evacuationBriefing)updateCombat(0);updateStats();setView(convoyMode?'convoy':districtMode?'overview':roster.has('ember')?'ember':roster.has('axo')?'axo':roster.has('prism')?'prism':roster.has('mochi')?'mochi':roster.has('rift')?'portal':roster.has('solara')?'solara':roster.has('violet')?'hero':'overview');$('loading').style.display='none';if(openingTitle)openingTitle.open();else if(evacuationBriefing)evacuationBriefing.open();else feed('Defenders deployed. Choose Heroes to change your team.');}catch(e){console.error(e);$('loading').innerHTML='<b>The district could not load.</b><span>Reload this page to try again.</span>';}}
const actorSilhouettes=new ActorSilhouettes();
function updateActorSilhouettes(){
 if(!loaded)return;
 actorSilhouettes.setEnemyVisibility(!openingTitle?.active&&!evacuationCinematic?.active);
 const people=civilianScene()?.civilians||[],danger=targetedCivilianGroups(people,{walker:robot,missiles:robotMissiles?.missiles,plasma:walkerSniper?.shells,plasmaClock:walkerSniper?.clock,predictCivilian:(unit,seconds)=>evacuation?.predictCivilian(unit,seconds),raiders:activeRaiders()?.members});for(const c of people)if(c.silhouetteHitUntil>simTime)danger.add(c.group||c);actorSilhouettes.update([robot,...(argus?[argus,...argus.drones.alive,...argus.attacks.pylons.members.filter(p=>p.unit?.alive).map(p=>p.unit.entity)]:[]),...(bastionTest()?[bastionTest().boss]:[]),...(activeRaiders()?.members||[]),...(activeRaiders()?.flightDrones||[])],civilianScene(),danger,simTime,[runner,hero,solara,portalHero,mochi,ninja,prism,axo,ember]);}
function controlledHero(){return[lux,runner,hero,portalHero,solara,mochi,ninja,prism,axo,ember].find(h=>h?.active===true&&h.enabled!==false)||null;}
function minimapSnapshot(){
 const player=controlledHero(),point=(id,p,extra={})=>({id,x:p.x,z:p.z,...extra});
 const people=(civilianScene()?.civilians||[]).filter(c=>c.unit.alive),targeted=targetedCivilianGroups(people,{walker:robot,missiles:robotMissiles?.missiles,plasma:walkerSniper?.shells,plasmaClock:walkerSniper?.clock,predictCivilian:(unit,seconds)=>evacuation?.predictCivilian(unit,seconds),raiders:activeRaiders()?.members});
 const civilians=people.map(c=>point(c.unit.id,c.root.position,{targeted:targeted.has(c.group||c)}));
 const enemies=(unitDamage?.units||[]).filter(u=>u.alive&&u.kind==='robot').map(u=>point(u.id,u.entity.root.position,{name:u.entity===argus?'ARGUS':undefined,boss:u.entity===argus||u.entity===robot||u.entity===bastionTest()?.boss}));
 const allies=[runner,hero,portalHero,solara,mochi,ninja,prism,axo,ember].filter(h=>h&&h!==player&&h.enabled!==false).map((h,i)=>point('hero-'+i,h.root.position));
 const e=evacuation,heli=e?.aircraft,helicopter=e?.heli.alive&&heli.visible&&(heli.position.y>5||Math.hypot(heli.position.x-e.landing.x,heli.position.z-e.landing.z)>8)?point('evac-helicopter',heli.position):null;
 const plasma=[...(walkerSniper?.threats()||[]),...(bastionTest()?.boss.rain?.threats()||[])].filter(t=>t.impactPoint).map(t=>point(t.id,t.impactPoint,{eta:t.timeToImpact,blastRadius:t.blastRadius,sniper:t.kind==='sniper'}));
 return{relay:defenseMode&&missionRaiders?.relay.alive?point(RELAY.id,RELAY):null,dropship:evacuationReinforcement?.root.visible?point('bastion-dropship',evacuationReinforcement.root.position,{time:evacuationReinforcement.clock}):null,spawnWarning:evacuation?{...evacuation.spawnWarning,time:evacuation.time,hz:evacuation.config.spawnWarningHz,entrance:evacuation.groups%evacuation.entrances.length,ended:evacuation.ended}:null,waves:districtMode?activeRaiders()?.waveAlerts()||[]:[],civilians:convoy?[]:civilians,civilianTotal:civilians.length,enemies:convoy?enemies.filter(e=>e.id==='argus'):enemies,allies,helicopter,plasma,exit:convoy?point('convoy-exit',routePoint(convoyConfig.map.route,routeLength(convoyConfig.map.route))):null,buses:(convoy?.activeBuses||[]).map(b=>point(b.id,b.root.position)),pickups:convoy?convoyConfig.map.pickups.map((p,i)=>point('pickup-'+i,routePoint(convoyConfig.map.route,p.distance),{label:'Pickup '+(i+1),number:i+1})):[]};
}
function updateHeroMinimap(dt){const player=loaded?controlledHero():null,alert=loaded&&(evacuationReinforcement?.root.visible||(districtMode&&activeRaiders()?.waveAlerts().length)||evacuation?.spawnWarning?.active);if(!player&&!alert){minimap.update(dt,null);return;}camera.getWorldDirection(v3);const yaw=Math.hypot(v3.x,v3.z)>.0001?Math.atan2(v3.x,v3.z):minimap.heading;minimap.update(dt,{position:player?.root.position||evacuation?.landing||robot.root.position,yaw});}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setPixelRatio(viewportPixelRatio(w,h,renderPixelRatio));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(viewport);resize();inputMode.subscribe(mode=>{$('camera-hint').innerHTML=mode==='touch'?'DRAG TO ORBIT <b>·</b> PINCH TO ZOOM <b>·</b> TWO FINGERS TO PAN':'WASD MOVE <b>·</b> Q/E HEIGHT <b>·</b> DRAG TO ORBIT <b>·</b> SCROLL TO ZOOM';});
let previous=performance.now(),fpsStart=previous,frames=0;function animate(now){requestAnimationFrame(animate);enemyDamageFlash.beginDashFrame();const elapsed=Math.min((now-previous)/1000,.25);previous=now;const dt=Math.min(elapsed,.075);if(loaded&&!paused&&(!liberationMode||openingTitle?.active||controlledHero()&&!missionRaiders?.upgradePending)&&!missionRaiders?.ended&&(!evacuationBriefing?.pending||openingTitle?.active)){const step=dt*speed*(hitStop>0?.05:1);hitStop=Math.max(0,hitStop-elapsed);if(evacuationCinematic?.active){evacuationCinematic.update(dt);evacuationReinforcement.update(dt);updateEffects(dt);}else{simTime+=step;updateCombat(step);if(!evacuationCinematic?.active){physics.step(step);for(const c of physics.dynamic)syncChunk(c);robot.syncWrecks();argus?.syncWrecks();activeRaiders()?.syncWrecks();for(const h of helicopters)if(h.wreck){h.root.position.set(h.wreck.position.x,h.wreck.position.y,h.wreck.position.z);h.root.quaternion.set(h.wreck.quaternion.x,h.wreck.quaternion.y,h.wreck.quaternion.z,h.wreck.quaternion.w);}refreshUnitShapes();updateEffects(step);}}}if(missionRaiders?.phase==='lost'&&physics.falling.size){physics.stepReleasedDebris(dt);updateEffects(dt);}if(convoy)convoyResults.update(convoy);if(openingTitle?.active)openingTitle.update(elapsed);updateRelayFlash(elapsed);updateCamera(elapsed);updateRelayIntro();updateHeroMinimap(elapsed);pilot?.updateMarkers();updateActorSilhouettes();if(ninja?.active&&view==='ninja'&&!missionRaiders?.ended){
 enemyDamageFlash.paintDashTargets(unitDamage.units.filter(unit=>
  !ninja.motion.dash?.hitUnits.has(unit)&&kageDashCanFinish(unit,ninja.shuriken.crosscutTarget===unit?ninja.shurikenConfig.arrival.damage*ninja.shurikenConfig.arrival.backstabMultiplier:NINJA.dashDamage,ninja.shuriken.crosscutTarget===unit)
 ),now/1000);
}const shake=droneImpactShake*Math.sin(now*.075)*.25;camera.position.x+=shake;droneImpactShake=Math.max(0,droneImpactShake-elapsed*3);if(cityLighting)cityLighting.render(scene,camera,now/1000,assetCity?.signLights);else renderer.render(scene,camera);camera.position.x-=shake;if(shake)camera.updateMatrixWorld();frames++;if(now-fpsStart>1000){const fps=Math.round(frames*1000/(now-fpsStart));$('fps').textContent=fps+' FPS';$('fullscreen-fps').textContent=fps+' FPS';slowSeconds=fps<25?slowSeconds+1:0;if(slowSeconds>=3&&renderer.getPixelRatio()>.65){renderPixelRatio=Math.max(.65,renderer.getPixelRatio()-.25);resize();slowSeconds=0;}fpsStart=now;frames=0;updateStats();}}
initialize();requestAnimationFrame(animate);
function renderedPlayerDamage(){if(!lastPlayerDamage)return null;const c=lastPlayerDamage.section,m=new THREE.Matrix4();chunkBatches[c.visualKey||c.type].getMatrixAt(c.index,m);const p=new THREE.Vector3().setFromMatrixPosition(m);return{building:c.building,type:c.type,index:c.index,hitState:lastPlayerDamage.state,state:c.state,before:lastPlayerDamage.before,rendered:p.toArray(),displacement:p.distanceTo(new THREE.Vector3(...lastPlayerDamage.before)),body:[c.body.position.x,c.body.position.y,c.body.position.z]};}
window.battleDiagnostics=()=>({liberation:liberationMode&&missionRaiders?.build?{stage:missionRaiders.stage+1,phase:missionRaiders.phase,level:missionRaiders.build.level,kills:missionRaiders.build.kills,hp:missionRaiders.build.hp,credits:missionRaiders.build.credits,upgrades:[...missionRaiders.build.ranks.keys()]}:null,waveDefense:defenseMode&&missionRaiders?{wave:missionRaiders.wave,group:missionRaiders.group+1,upgradePending:missionRaiders.upgradePending,upgrades:[...missionRaiders.upgrades],phase:missionRaiders.phase,relayHP:missionRaiders.relay.health,remaining:missionRaiders.remaining}:null,mission1:mission1Mode?{buildings:layout?.buildings.length,raiders:missionRaiders?.diagnostics()}:null,assetCity:assetCity?.diagnostics()||null,testing:testingArena?.diagnostics()||null,enemySeparation:enemySeparation.diagnostics(),actorSilhouettes:actorSilhouettes.diagnostics(),robotDeathEffects:robotDeathEffects.diagnostics(),enemyDamageFlash:enemyDamageFlash.diagnostics(),minimap:minimap.diagnostics(),evacuation:evacuation?.diagnostics()||null,evacuationHelicopterStrike:evacuationHelicopterStrike?.diagnostics()||null,evacuationReinforcement:evacuationReinforcement?.diagnostics()||null,evacuationCinematic:evacuationCinematic?.diagnostics()||null,convoy:convoy?.diagnostics()||null,argus:argus?.diagnostics()||null,mapBounds:convoyMode?convoyConfig.map.bounds:districtMode?districtBounds:{minX:-60,maxX:60,minZ:-60,maxZ:60},loaded,paused,speed,view,inputMode:inputMode.mode,seconds:simTime,shotsFired,weaponImpacts:{...weaponImpacts},army:{tanks:tanks.length,helicopters:helicopters.length,infantry:troops.length},physics:physics?.stats(),camera:camera.position.toArray(),pilot:pilot?.diagnostics(),playerMissiles,playerHits,playerBuildingHits,playerUnitHits,renderedPlayerDamage:renderedPlayerDamage(),combat:unitDamage?.stats(),ninja:ninja?.diagnostics(),robot:robot?.diagnostics(),mochi:mochi?.diagnostics(),prism:prism?.diagnostics(),axolotl:axo?.diagnostics(),embercat:ember?.diagnostics(),hero:hero?.diagnostics(),portalHero:portalHero?.diagnostics(),solara:solara?.diagnostics(),roster:roster.diagnostics(),missileDefense:robotMissiles?.diagnostics(),arsenal:arsenal?.diagnostics(),eyeBeams:eyeBeams?.diagnostics(),walkerSniper:walkerSniper?.diagnostics(),runner:runner?.diagnostics(),beam:beamCombat?.diagnostics(),beamEffect:beamEffect?.diagnostics(),missileExplosions:missileExplosions.diagnostics(),helicopters:helicopters.map(h=>({team:h.team,index:h.i,position:h.root.position.toArray(),visible:h.root.visible})),infantry:soldierCrowd?.diagnostics(),triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,debris:physics?.dynamic.slice(0,3).map(c=>({position:[c.body.position.x,c.body.position.y,c.body.position.z],quaternion:[c.body.quaternion.x,c.body.quaternion.y,c.body.quaternion.z,c.body.quaternion.w]}))});

if(districtMode||testingMode||convoyMode){document.querySelectorAll('[data-view="tank"],[data-view="air"],[data-view="infantry"],.factions').forEach(e=>e.hidden=true);document.querySelector('.headline>p').innerHTML=liberationMode?'City Liberation.<br>Break the occupation.':defenseMode?'Wave Defense.<br>Protect the evacuation rocket.':mission1Mode?'Mission 1.<br>Take down the Siege Walker.':'Protect the civilians.<br>Escort them to the evacuation Chinook.';}
document.querySelector('.viewer').classList.toggle('is-escort',evacuationMode);$('scene-select').value=assetCityMode?'city-test':convoyMode?'convoy':testingMode?'testing':liberationMode?'city-liberation':defenseMode?'wave-defense':mission1Mode?'mission-1':evacuationMode?'evacuation':'battle';$('evac-status').hidden=!evacuationMode;$('casualty-hud').hidden=!evacuationMode;$('scene-select').onchange=e=>{const url=new URL(location.href);if(['evacuation','mission-1','city-liberation','wave-defense','testing','convoy','city-test'].includes(e.target.value))url.searchParams.set('scene',e.target.value);else url.searchParams.set('scene','battle');location.href=url.href;};

if(liberationMode){
 viewer.classList.add('is-liberation');
 $('choose-heroes').onclick=()=>{if(missionRaiders?.build)resetDistrict();};
}
if(mission1Mode){
 $('hero-select-title').textContent='Choose your hero.';
 document.querySelector('.hero-select-header p:last-child').textContent='Select one hero for '+(defenseMode?'Wave Defense.':'Mission 1.');
 document.querySelector('.hero-select-footer>div>span').textContent='Deploying restarts '+(defenseMode?'Wave Defense.':'Mission 1.');
 $('deploy-heroes').textContent='Deploy hero';
}

$('watch-evac').hidden=!evacuationMode;$('watch-evac').onclick=()=>{setView('overview');view='free';controls.target.set(evacuation.landing.x,2,evacuation.landing.z);camera.position.set(evacuation.landing.x+25,23,evacuation.landing.z+22);controls.update();$('camera-label').textContent='EVACUATION / LANDING ZONE';};

const relayIntroAnchor=defenseMode?new THREE.Vector3(RELAY.x,RELAY_INTRO.markerHeight,RELAY.z):null;
const relayIntroScreen=new THREE.Vector3();
function updateRelayIntro(){
 if(!defenseMode)return;
 const marker=$('relay-intro');
 if(!loaded||evacuationBriefing?.pending||!missionRaiders?.relay.alive||simTime>=RELAY_INTRO.duration){
  marker.hidden=true;
  return;
 }
 camera.updateMatrixWorld();
 relayIntroScreen.copy(relayIntroAnchor).project(camera);
 const {x,y,z}=relayIntroScreen;
 marker.hidden=Math.abs(x)>1||Math.abs(y)>1||z< -1||z>1;
 if(!marker.hidden){
  marker.style.left=(50+x*50)+'%';
  marker.style.top=(50-y*50)+'%';
 }
}
function positionDistrictHeroes(){
 positionGroundHeroes(districtHeroStart,defenseMode?RELAY_INTRO.yaw:Math.PI);
}
function positionGroundHeroes(p,yaw=Math.PI){
 runner.motion.reset(p);runner.root.position.set(p.x,p.y,p.z);runner.yaw=runner.motion.yaw=yaw;runner.heading.reset(yaw);runner.pose(0);runner.ai.lastPosition=null;
 ninja.motion.body.reset(p);ninja.root.position.set(p.x,p.y,p.z);ninja.yaw=ninja.motion.body.yaw=yaw;ninja.pose(0,null);
}
function positionTestingHeroes(){
 const p=COMBAT_ARENA.heroStart;
 positionGroundHeroes(p);
 for(const h of[hero,solara,portalHero,mochi,prism,axo,ember]){h.root.position.set(p.x,h===solara?1.5:6,p.z);h.velocity?.set?.(0,0,0);}
}
function resetTestingEnemies(){axo?.clearChills();testingArena.reset();positionTestingHeroes();robot.root.visible=testingArena.walkerEnabled;if(testingArena.walkerEnabled){robot.spawnOrigin=COMBAT_ARENA.enemyCorner;robot.applyWalkPose(robot.walkPose);robot.combatUnit.shapes=robot.shapes();}if(!testingArena.walkerEnabled){robot.combatUnit.alive=false;robot.combatUnit.health=0;robot.combatUnit.shapes=[];robot.dead=true;robot.broken=true;robot.weapon.stop();arsenal.phase='off';}const pyro=testingArena.pyroclast?.spawned;document.querySelector('.boss-health-hud').hidden=!testingArena.walkerEnabled&&!bastionTest()&&!pyro;document.querySelector('.boss-health-hud b').textContent=bastionTest()?'THE BASTION':pyro?'PYROCLAST':robot.root.name.toUpperCase()+' · WEAPONS';document.querySelector('.robot-readout').hidden=!testingArena.walkerEnabled;}
if(testingMode){if(assetCityMode){const checkbox=$('test-walker');checkbox.parentElement.lastChild.textContent=' Cyberpunk Siege Walker';checkbox.checked=new URLSearchParams(location.search).get('enemy')==='walker';$('test-drones').value='0';}setupRoninModelChoice($('test-ronin-model'),()=>testingArena?.ronin);const requestedEnemy=new URLSearchParams(location.search).get('enemy');const requestedHero=new URLSearchParams(location.search).get('hero');if(['volt','ninja'].includes(requestedHero))roster.apply([requestedHero]);if(['mireguard-1','mireguard-3','ronin','drone','drone-pair','pyroclast'].includes(requestedEnemy)){$('test-enemy-preset').value=requestedEnemy;$('test-walker').checked=false;$('test-drones').disabled=true;}if(requestedEnemy==='bastion'){$('test-enemy-preset').value='bastion';$('test-walker').checked=false;$('test-walker').disabled=true;$('test-drones').disabled=true;}$('test-config-open').hidden=false;$('test-config-open').onclick=()=>{ninja?.exit();runner?.exit();$('test-controls').scrollIntoView({block:'center'});};document.querySelector('.hero-select-header p:last-child').textContent='Choose exactly one hero for this test.';document.querySelector('.hero-select-footer>div>span').textContent='Deploying restarts this test. Your main mission team is preserved.';$('test-controls').hidden=false;$('test-hero').value=roster.active[0];document.querySelector('.headline>p').innerHTML='Combat testing.<br>One hero. Your choice of enemies.';$('test-note').textContent='Kage and Volt support direct control; other heroes use CPU abilities. Spawn / Reset starts a fresh test and rebuilds the city.';$('test-enemy-preset').onchange=()=>{$('test-drones').disabled=$('test-enemy-preset').value!=='basic';$('test-walker').disabled=$('test-enemy-preset').value==='bastion';if($('test-enemy-preset').value!=='basic')$('test-walker').checked=false;};$('test-hero').onchange=()=>roster.apply([$('test-hero').value]);$('test-spawn').onclick=()=>{if(!loaded)return;$('reset').click();setView('overview');feed('Test field reset with your selected enemies.');};$('test-play').onclick=()=>{$('viewport').scrollIntoView({block:'center'});if(roster.has('ninja'))ninja.enter();else if(roster.has('volt'))runner.enter();else setView({violet:'hero',rift:'portal',solara:'solara',mochi:'mochi',prism:'prism',axo:'axo',ember:'ember'}[roster.active[0]]);};}

if(assetCityMode){document.querySelector('.headline>p').innerHTML='Asset City Test.<br>A new district to explore and battle in.';$('test-note').textContent='Explore the city or choose enemies and Spawn / Reset. Kage and Volt support direct control.';}

function convoyCivilianPathClear(a,b,radius=convoyConfig.civilianPathRadius){return !traceImpact({x:a.x,y:1,z:a.z},{x:b.x,y:1,z:b.z},{sections:physics.chunks.filter(c=>!c.hasDetached),ground:false,radius});}
function convoyBusPathClear(a,b,radius){return [1,2.7].every(y=>!traceImpact({x:a.x,y,z:a.z},{x:b.x,y,z:b.z},{sections:physics.chunks.filter(c=>!c.hasDetached),ground:false,radius}));}
function clearConvoyDebris(){let changed=false;for(const c of physics.chunks){if(!c.hasDetached||c.hidden||c.collisionDisabled||c.body.position.y>5)continue;const r=Math.max(...c.size)/2;if(Math.abs(c.body.position.z)>convoyConfig.map.roadHalfWidth+r)continue;if(c.body.position.y>Math.max(...c.size)/2+.12)continue;physics.disableGroundedCollision(c);changed=true;}if(changed)physics.world.broadphase.markStaticsDirty();}
function resetConvoy(){
 convoy.reset();convoyResults?.update(convoy);argus?.reset();robot.root.visible=false;robot.combatUnit.alive=false;robot.combatUnit.health=0;robot.combatUnit.shapes=[];robot.dead=true;robot.broken=true;robot.weapon.stop();arsenal.phase='off';beamEffect.clear();
 const b=convoyConfig.map.movementBounds,p=convoyConfig.map.heroStart;runner.motion.bounds={...b};runner.dash.bounds={...b};ninja.motion.body.bounds={...b};
 runner.motion.reset(p);runner.root.position.set(p.x,p.y,p.z);runner.yaw=runner.motion.yaw=Math.PI/2;runner.heading.reset(Math.PI/2);runner.ai.lastPosition=null;ninja.motion.body.reset(p);ninja.root.position.set(p.x,p.y,p.z);ninja.yaw=Math.PI/2;
 for(const h of[hero,solara,portalHero,mochi,prism,axo,ember]){h.root.position.set(p.x,h===solara?1.5:6,p.z);h.velocity?.set?.(0,0,0);}
}
if(convoyMode){$('watch-convoy').hidden=false;document.querySelectorAll('[data-view="robot"],[data-view="artillery"]').forEach(b=>b.hidden=true);document.querySelector('.viewer').classList.add('is-convoy');document.querySelector('.headline>p').innerHTML='Convoy defense.<br> Two pickups. Get the civilians out.';}

function argusRoofHeight(p){let closest=Infinity,height=0;for(const building of layout.buildings){const distance=Math.hypot(p.x-building.x,p.z-building.z);if(distance>argus.config.attacks.flak.rooftopSearchRadius||distance>=closest)continue;const slabs=physics.buildings.get(building.id)?.chunks.filter(c=>c.type==='slab'&&c.state==='intact'&&c.hp>0&&!c.collisionDisabled)||[];if(!slabs.length)continue;closest=distance;height=Math.max(...slabs.map(c=>c.body.position.y+c.size[1]/2));}return height;}
function argusCharge(kind,seconds){const audio=runner?.feedback?.audio,c=argus?.config.attacks.audio;if(!c?.enabled||!runner?.preferences.sound||audio?.state!=='running')return;const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.frequency.setValueAtTime(c.startHz,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(c.endHz,audio.currentTime+seconds);gain.gain.setValueAtTime(c.gain,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+seconds);oscillator.connect(gain);gain.connect(audio.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start();oscillator.stop(audio.currentTime+seconds);}

// Revalidate a real surviving slab, or an unobstructed terrain landing. Never cache a vanished roof.
function emberLanding(target,from,preferred=null){
 const slabs=physics.chunks.filter(c=>c.type==='slab'&&c.state==='intact'&&c.hp>0),height=Math.max(30,...layout.buildings.map(b=>b.floors*3+4));
 const at=(x,z)=>{const roof=traceImpact({x,y:height,z},{x,y:terrainHeight(x,z),z},{sections:slabs,ground:false});const y=roof?roof.point.y+.18:terrainHeight(x,z)+.18;if(traceImpact({x,y:y+.35,z},{x,y:y+2.6,z},{sections:physics.chunks,ground:false,radius:.4}))return null;return new THREE.Vector3(x,y,z);};
 if(preferred){const p=at(preferred.x,preferred.z);return p&&Math.abs(p.y-preferred.y)<.25?p:null;}
 const candidates=layout.buildings.filter(b=>Math.hypot(b.x-target.x,b.z-target.z)<70).flatMap(b=>[[0,0],[-4.3,-4.3],[4.3,-4.3],[-4.3,4.3],[4.3,4.3]].map(([x,z])=>at(b.x+x,b.z+z))).filter(Boolean);for(let i=0;i<8;i++){const a=i*Math.PI/4;candidates.push(at(target.x+Math.cos(a)*24,target.z+Math.sin(a)*24));}
 const bounds=testingMode?COMBAT_ARENA.movementBounds:convoyMode?convoyConfig.map.bounds:districtMode?districtMovementBounds():{minX:-56,maxX:56,minZ:-56,maxZ:56};return candidates.filter(p=>p&&p.x>bounds.minX+3&&p.x<bounds.maxX-3&&p.z>bounds.minZ+3&&p.z<bounds.maxZ-3&&!traceImpact(p.clone().add(new THREE.Vector3(0,1.8,0)),target,{sections:physics.chunks,ground:false,radius:.15})).sort((a,b)=>a.distanceTo(from)-b.distanceTo(from))[0]||null;
}

function axoFlightHeight(from,to){
 let height=0;const dx=to.x-from.x,dz=to.z-from.z,length2=dx*dx+dz*dz;
 for(const b of layout.buildings){const t=length2?THREE.MathUtils.clamp(((b.x-from.x)*dx+(b.z-from.z)*dz)/length2,0,1):0;if(Math.abs(b.x-from.x-dx*t)>7||Math.abs(b.z-from.z-dz*t)>7)continue;for(const c of physics.buildings.get(b.id)?.chunks||[])if(c.state==='intact'&&c.hp>0)height=Math.max(height,c.body.position.y+c.size[1]/2+AXO.roofClearance);}
 return height;
}
