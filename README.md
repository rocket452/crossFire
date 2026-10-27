# Crossfire — City in Conflict

An autonomous low-poly city battle with observer camera controls and live rigid-body destruction. Assets are built directly in Blender with Python; browser rendering uses Three.js and rigid-body simulation uses Cannon-es.

## Run
`python -m http.server 8765 --directory dist`

Open http://localhost:8765. HTTP is required for ES modules and the GLB asset library.

## Rebuild assets
`blender -b -t 4 --python source/build_city.py`

Blender 4.3.2 is the tested authoring version. Outputs are under dist/city-assets/.

## Runtime source
- dist/battle.js: city rendering, armies, weapons, camera, effects, UI.
- dist/destruction.js: damage, support propagation, rigid bodies, activation budget.
- dist/physics-grid.js: static spatial hashing for collision broadphase.
- dist/city-assets/README.md: physics scope, limitations, import/download notes.

Prior project assets remain in version history and their existing local files; the main page now opens the city battle.
