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

Destroyed weapons explode, detach as smoking physics wreckage and remain offline until City Rebuild. The Walker cycles through its surviving main weapons. Losing a mount cancels charging and unlaunched shots; projectiles already airborne remain dangerous. Ordinary hits still damage the hull once, with no extra break-damage bonus. Existing weak cores keep their separate damage/stun rules; an arm core moves to the intact shoulder if the cannon falls off.

## Runtime source
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
