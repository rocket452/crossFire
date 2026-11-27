# Pyroclast validation

Pyroclast is the flying flame supervillain in Combat Testing (Test setup → Enemy preset → "Pyroclast — flying flame supervillain", or `?scene=testing&enemy=pyroclast`). Model, fire and effects are procedural (`dist/pyroclast-model.js`, `dist/pyroclast-fx.js`); no licensed assets.

- `node QA/pyroclast-test.mjs`: one 14,000 HP boss unit with head/torso/leg shapes (head ×1.5); full fireball → tornado → meteor cycle at 30/60/120 fps; stays airborne; three moving flame tornadoes lift heroes; 16 meteors, each with a warning ring that must finish its telegraph before the rock falls and is removed after impact; fireballs home gently, fuse on near misses and drop after overshooting; protected heroes take no damage; stun pauses attacks; death falls, explodes, reports defeat and respawns cleanly.
- Browser smoke (`?scene=testing` via the preset UI and `?scene=city-test&enemy=pyroclast&hero=volt`): PYROCLAST boss bar visible and falling, all three attacks fire, no page errors.
- Visuals were iterated in the cyberpunk city (fire crown, burning cape, boot jets, fireball/tornado/meteor art) and spot-checked in the daylight arena.
