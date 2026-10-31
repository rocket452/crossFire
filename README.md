# Crossfire — City in Conflict

An autonomous low-poly city battle with observer cameras, optional first-person helicopter control, and live rigid-body destruction. Assets are built directly in Blender with Python; browser rendering uses Three.js and rigid-body simulation uses Cannon-es.

## Run
`python -m http.server 8765 --directory dist`

Open http://localhost:8765. HTTP is required for ES modules and the GLB asset library.

## Rebuild assets
`blender -b -t 4 --python source/build_city.py`

Blender 4.3.2 is the tested authoring version. Outputs are under dist/city-assets/.

## Rebuild the revised infantry
`blender -b -t 4 --python source/build_soldier.py`

The scene uses the revised soldier asset/animation palette; the original city kit retains its first-pass infantry proxies for compatibility.

## Rebuild the cockpit
`blender -b -t 4 --python source/build_cockpit.py`

Click an aircraft or its PILOT tag to enter. Desktop W/S move, A/D strafe, Q/E turn, R/F altitude, drag to aim, Space to fire, Escape to exit. Phone uses the joystick, altitude buttons, and hold/drag FIRE.

## Rebuild Rift Warden
`blender -b -t 4 --python source/build_portal_hero.py`

Choose **Rift Warden escort** to watch the third CPU hero teleport, fire through stationary five-second portals, and evacuate threatened friendly armor/infantry.

## Destroying Siege Walker weapons

Focus fire on the beam forearm, shoulder rocket pod, shoulder plasma cannon or eye emitters to wear down that weapon independently. Initial durability is 1,800 / 1,600 / 1,800 / 700 HP respectively, configured in `dist/walker-weapons.js`. Compact meters beneath the boss health bar show each weapon's remaining durability.

Destroyed weapons explode, detach as smoking physics wreckage and remain offline until City Rebuild. The Walker cycles through its surviving main weapons. Losing a mount cancels charging and unlaunched shots; projectiles already airborne remain dangerous. Ordinary hits still damage the hull once, with no extra break-damage bonus. The previous glowing weak-point/stagger cycle has been removed; hero stun abilities remain available. Only damaged weapons flash red on the Walker; small robots flash red across their bodies.

## Kage, the shadow ninja

Choose Kage in **Heroes** (up to three active defenders), deploy, then choose **Play Kage**. The existing starting lineup stays Volt / Violet / Rift. Kage also fights automatically when not controlled.

- Run: 46m/s on the ground, matching Volt's boosted speed; 32.2m/s air steering. Space / JUMP launches at 30m/s; a second jump launches at 27m/s. An airborne jump within 1.55m of an intact building wall kicks away at 12.6m/s and upward at 36m/s, restoring one air jump. A short contact lock prevents repeated kicks against the same surface.
- Primary: hold left-click / F / SHURIKEN; 55-damage stars every 0.22s at 59.5m/s with doubled diameter, launched from the real weighted character's right hand. Stars share normal collision, damage, missile and portal systems.
- Air strike: E / right-click / AIR DASH, up to 24m at 64.4m/s toward the camera reticle, 320 damage. Six-second cooldown. A confirmed **dash** kill on an enemy or missile resets it immediately; ordinary primary kills do not. Solid cover stops the dash. Dead enemies do not obstruct subsequent ninja attacks.
- After dashing: two-second slow fall, gravity ×0.12 and downward speed capped at 3m/s. Ground contact ends this window. Double/wall jumps and dash resets remain distinct resources.
- Desktop: pointer-lock mouse look, WASD, Space and the above attacks. Escape releases the mouse; again exits. Phone: left movement stick and jump/fire/dash buttons; drag the scene to aim. The minimap follows the ninja camera too.

Values live in `dist/ninja-motion.js`. Character geometry/weights and clips reuse the supplied private humanoid; mask, headband, scarf, throwing star, sword and bounded effects are original runtime attachments. Violet now always shields himself against the boss beam, including interrupting his own force beam to defend. Weapon damage flashes preserve current warning lights.

## Civilian minimap warnings

A civilian group's small yellow dot flashes red while an enemy beam, missile, plasma landing zone or drone attack threatens the group. The flag follows current rescue groups and clears when the threat ends, is intercepted or the civilians leave a marked blast zone. The minimap reads combat state without selecting targets or changing the battle. Reduced-motion displays use a steady red dot. Policy and browser validation are documented in `QA/civilian-warning-validation.md`.

## Tracked drone projectiles

Seven small robots arrive in a staggered 3/3/1 formation with the second civilian wave. They fire energy bolts with a 1.32m radius (twice revision 85’s diameter) at 36m/s (double revision 86’s speed). Bright cores, pulsing halos, rotating energy rings, spark wakes and expanding impact discharges share three bounded instanced effect pools. Swept cover/unit/shield collision and incoming-attack predictions use the same size and speed. Damage, firing cadence and targeting ranges stay unchanged. Projectile tuning lives in `RAIDER_COMBAT` in `dist/evac-raider.js`, visual budgets in `RAIDER_ENERGY`, and wave size/row spacing in `ESCORT_APPROACH`.

## Runtime source
- dist/ninja-hero.js: ninja rig accessories/animation, player/CPU control, real-hand shurikens, effects and camera.
- dist/ninja-motion.js: shared city collision, high/double/wall jumps, aerial strike, confirmed-kill resets and slow fall.
- dist/battle.js: city rendering, armies, weapons, camera, effects, UI.
- dist/combat-collision.js: shared reticle/missile sweeps and unit durability.
- dist/helicopter-pilot.js: selection, cockpit camera, input, HUD and launch integration.
- dist/helicopter-flight.js: assisted flight, damping, clearance and bounds.
- dist/infantry.js: shared crowd meshes, baked Blender animation sampling, transitions, and weapon timing.
- dist/destruction.js: damage, support propagation, rigid bodies, activation budget.
- dist/violet-flight.js: bounded acceleration, persistent momentum and Violet combat tuning.
- dist/runner-charge.js: half-second wind-up and damage-time accounting for player/CPU electricity.
- dist/runner-rooftops.js: CPU speedster roof selection, facade approaches, supported rooftop attacks and departure.
- dist/walker-weapons.js: individual weapon durability, part bindings and one-time destruction events.
- dist/robot-arsenal.js: five-second initial/rebuild grace, beam → missiles → plasma rotation, five-second weapon changes and pre-launch warning.
- dist/shield-shake.js: shield forward offset and damage recoil.
- dist/portal-hero.js: portal hero articulation, teleport/attack/rescue effects and pooled projectiles.
- dist/portal-policy.js: hostile-impact prediction and safe friendly evacuation destinations.
- dist/robot-missiles.js: shoulder salvos, swept missile flight, target claims and interception damage.
- dist/missile-explosions.js: bounded fire/shockwave/spark/smoke bursts for rocket impacts and harmless shootdowns.
- dist/physics-grid.js: static spatial hashing for collision broadphase.
- dist/city-assets/README.md: physics scope, limitations, import/download notes.

Prior project assets remain in version history and their existing local files; the main page now opens the city battle.


Volt’s energy rescue dash travels up to **30 metres** (triple its former 10m range) at 36m/s, taking about 0.83 seconds on a clear route. It collects allies along the way and reforms them safely at the end; buildings, ledges and map boundaries still shorten the dash. Pickup radius, five-second cooldown and zero charge cost remain unchanged. Range tuning: `DASH.range` in `dist/runner-dash.js`.
