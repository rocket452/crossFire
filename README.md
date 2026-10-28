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

## Runtime source
- dist/battle.js: city rendering, armies, weapons, camera, effects, UI.
- dist/combat-collision.js: shared reticle/missile sweeps and unit durability.
- dist/helicopter-pilot.js: selection, cockpit camera, input, HUD and launch integration.
- dist/helicopter-flight.js: assisted flight, damping, clearance and bounds.
- dist/infantry.js: shared crowd meshes, baked Blender animation sampling, transitions, and weapon timing.
- dist/destruction.js: damage, support propagation, rigid bodies, activation budget.
- dist/violet-flight.js: bounded acceleration, persistent momentum and Violet combat tuning.
- dist/runner-rooftops.js: CPU speedster roof selection, facade approaches, supported rooftop attacks and departure.
- dist/robot-missiles.js: shoulder salvos, swept missile flight, target claims and interception damage.
- dist/physics-grid.js: static spatial hashing for collision broadphase.
- dist/city-assets/README.md: physics scope, limitations, import/download notes.

Prior project assets remain in version history and their existing local files; the main page now opens the city battle.
