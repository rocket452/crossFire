# Skitter: wall-climbing melee hunter

A fast four-legged enemy built on the user-supplied quadruped robot model ("low poly robot 3D model by niko"). It is available in Combat Testing as **1 Skitter** and **3 Skitters** (`?scene=city-test&enemy=skitter-1|skitter-3`). The model is private; see `source/PRIVATE_ASSETS.md`. Without the runtime asset, the preset spawns nothing and the game logs a warning.

## Behaviour (`dist/skitter.js`, tuning in `dist/skitter-config.js`)

It always stands on a surface: the street, a building wall or a roof. Its root frame aligns to that surface (up = surface normal), and the legs plant on it.

- **Hunt:** it tracks the nearest hero within 95 m, through walls. It keeps its target for a second through dash phasing.
- **Chase:** it runs at 9.5 m/s (8.5 on roofs) and stops at claw range. Three Skitters keep 3.4 m apart.
- **Claw strike:** within 3.3 m. A 0.4 s windup rears up with the front claws raised and open. A 0.14 s strike slams them forward with a lunge and a slash crescent: 16 damage plus knockback in a 3.9 m frontal cone. It then recovers.
- **Pounce:** from 6.5–13 m, every 3.4 s. A 0.55 s crouch shows a filling ground ring at the predicted landing point; it leads moving heroes. The leap deals 22 damage with knockback within 2.3 m of the landing.
- **Rooftop heroes:** a hero standing on a roof (feet 2.6 m or more above the street, inside a building's footprint and within 2.2 m of its roof height) is reached by running to the nearest wall face. The Skitter latches on belly-first, climbs at 7 m/s and drifts sideways toward the hero, then mantles over the edge in 0.38 s and fights on the roof.
- **Buildings in the way:** a building between it and a hero on the street is climbed over, crossed, and left by leaping down the far side.
- **Leaving a roof:** if the hero leaves the roof, the Skitter runs to the nearest edge and leaps after them. It lands near them on the street, or on their roof if that is within 30 m.
- **Falling:** if the roof or wall under it is destroyed, it falls to the street.
- **Stun:** it holds in place, still clinging if it is on a wall, then resumes.
- **Damage and death:** head (turret) hits take 1.5×. It has 280 HP. On death it drops from a wall, its legs curl up over the body like a dead spider, the game's robot explosion plays, and it sinks out of sight after about 3.5 s.

Building data comes from `climbableBuildingBoxes()` in `battle.js`. It uses the axis-aligned bounds of each building's intact destructible sections and the top of the highest intact roof slab, cached for one second, so climbing follows damaged and destroyed buildings. Buildings are treated as rectangular footprints, so irregular or rotated shapes are approximated by their bounding boxes.

## Rig and look (`dist/skitter-model.js`)

The runtime GLB keeps the source's 54-bone rig and skin weights:
- **Legs:** four three-segment legs, each ending in a four-finger claw.
- **Linkage:** a strut bar above each knee and an upright post at each ankle.
- **Turret:** a top bone carries the sensor turret.

There are no source animation clips; everything is procedural on the real bones:
- **Gait:** feet are planted in world space on the current surface and re-step in diagonal pairs.
- **Legs:** two-bone IK bends each knee away from the surface, and the struts and posts follow as a linkage.
- **Turret:** it tracks the target.
- **Claws:** fingers open and snap shut for strikes.
- **Death:** the legs curl in.

Cyberpunk finish, assigned per converted part:
- **Body:** matte black shell and gunmetal leg plates with the neon rim light from `astra-ronin-cyber.js`, a black frame and chrome joints.
- **Glow:** a neon magenta core, a red hunter eye and a cyan sensor ring. Their emissive values are high enough for the city bloom.
- **Turret cap:** yellow/black hazard stripes.
- **Claws:** dark steel with fingertips that glow hot magenta and flare during strikes and pounces.
- **Underglow:** a magenta pool that follows the surface it stands on, including walls.

Runtime model: 7,515 triangles (decimated from 48,866), 11 skinned meshes and 55 bones; each Skitter is its own skinned clone.

## Tests

`node QA/skitter-test.mjs` needs the private GLB. It covers:
- rig and budget;
- the street strike;
- rooftop climb, mantle and strike, then leaping after a hero who leaves, at 30/60/120 Hz;
- climbing over a building;
- the telegraphed pounce;
- holding on a wall when stunned;
- falling when the roof disappears;
- death on a wall (drop, fade) and reset;
- pack spacing and head-shot damage.

Visual QA used the real Combat Testing city: a three-Skitter pack chasing, scaling a 40 m tower to a rooftop hero, and attacking on the roof. Phone performance has not been measured.
