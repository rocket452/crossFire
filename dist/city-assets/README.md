# Crossfire — city battle study

## What this is
A low-poly, autonomous battle observer. Two fictional armies use Blender-authored infantry, tanks, and helicopters. The battle runs autonomously, with optional first-person helicopter control. Click an aircraft or its PILOT tag to fly it and launch rockets. There are no campaign objectives or scores.

## Assets and source
- city.blend: editable Blender 4.3.2 city layout, reusable asset library, preview camera and sunlight.
- city-kit.glb: glTF 2.0 library of 14 reusable low-poly meshes, approximately 250 KB. Vertex-color PBR material; no external textures.
- city-layout.json: 16-building district layout and asset triangle counts.
- build_city.py: reproducible Blender Python generator. No Blender MCP. In the repository run `blender -b -t 4 --python source/build_city.py`. A standalone downloaded script writes to a sibling city-output directory.

Model triangle counts: tank hull + turret 948; helicopter body + rotors 556; infantry torso + legs + arms 644; façade module 60; slab 24; column 44. Building detail and troops are GPU-instanced. World dimensions are in meters.

## Runtime simulation
Three.js r170 renders the scene. Cannon-es 0.20.0 resolves actual rigid-body gravity, angular motion, contact, friction, and sleeping. The Blender file contains the modeled assets/layout; the autonomous battle and live destruction are implemented in the browser JavaScript.

2,668 separable building sections start static. Tank shells and helicopter rockets use swept, radius-expanded oriented-box queries against building sections and unit collision proxies to locate impacts. Blast damage detaches nearby sections. Losing at least two of a floor's four support columns queues that floor and everything above it for collapse. This is a simplified game support rule, not engineering structural analysis or stress-based fracture.

Detached sections use oriented box collision proxies. Gravity is 9.81 m/s²; friction 0.62; restitution 0.07; solver uses 8 iterations. Density approximations assign mass by volume. Geometry is pre-segmented; walls do not fracture at arbitrary points. Ground, intact sections, moving sections, and settled rubble collide. Glass is part of each façade section rather than individually simulated shards.

A static spatial hash narrows contact candidates; Cannon performs narrow-phase contact generation and constraint solving. Physics uses a fixed 1/60 second step with at most 4 catch-up substeps. At 2× speed or on slow devices, catch-up may not reproduce every elapsed wall-clock second.

Budget: 110 simultaneous moving debris bodies on narrow layouts; 160 on wider layouts. Further detachments wait in a queue rather than freezing airborne pieces. Sleeping/stable pieces become static colliders and remain visible. At most four normal queued sections activate per rendered frame, so large collapses are staged. Direct player hits use reserved capacity immediately. Settled rubble persists until rebuild. Particles, projectiles, and tracers have bounded lifetimes; effect pools have fixed capacities.

Armies follow authored routes and target opposing-sector structures. Infantry use visual fire exchanges. This prototype does not include full tactics, physical armor penetration, aerodynamic flight, explosive fluid dynamics, or weapon-accurate ballistics. Infantry tracer fire remains visual; shells and rockets now apply direct and area damage to units. Tanks and unselected helicopters follow authored routes; a selected helicopter uses assisted kinematic hover flight. Buildings and debris use the rigid-body solver.

## Camera
Desktop: orbit drag, right-drag pan, scroll zoom; WASD move, Q/E altitude, Shift faster. Phone: one-finger orbit, pinch zoom, two-finger pan; on-screen arrows change altitude. Camera presets: district overview, street, tank follow, helicopter follow. Dragging leaves follow mode. Pause stops combat/physics while camera controls remain active. Rebuild restores all structures, debris, routes, and counters.

## Performance and testing limits
Pixel ratio reduces automatically on persistently low frame rates. These are mobile-friendly controls, not a claim of a verified FPS on a phone. Browser QA uses Chromium software WebGL; actual iOS/Android GPU, memory, and thermal testing is still required. Very large collapses can lower frame rate or delay queued fracture activation.

## Licenses
Three.js and Cannon-es are MIT licensed; license text is in vendor/. Fonts come from Google Fonts, with system fallbacks. The character/city geometry was authored here with Blender Python rather than downloaded asset packs.

## Infantry revision 2
The live scene now uses soldier-parts.glb + soldier-motion.json rather than the original block infantry in city-kit.glb. The original kit retains its first-pass infantry proxies for compatibility; its 644-triangle figure above refers to those proxies only.

Updated soldier: **2,288 triangles**, **17-bone Blender armature**, **one vertex-color PBR material**, **16 rigid-skinned segments**. Geometry includes a shaped helmet, goggles, ear protection, chin strap, tapered uniform, plate carrier, three magazine pouches, webbing, backpack, antenna, thigh pouches, elbow/knee protection, gloves, boot soles, and a rifle with stock, receiver, magazine, handguard, optic, barrel and muzzle.

Files:
- soldier.blend: editable geometry, armature, eight authored actions, studio camera and lights.
- soldier.glb: single skinned mesh, one material, 17 joints and eight animation clips.
- soldier-parts.glb: the same geometry split by deforming bone for runtime crowd instancing.
- soldier-motion.json: 30 fps Blender animation palettes and asset statistics.
- build_soldier.py: reproducible Blender Python generator.
- soldier-preview.png: Blender beauty render.

Clips: Idle (2 s), Walk (1 s), Run (0.7 s), Aim (2 s), Fire (0.4 s), CrouchFire (0.4 s), CrouchAim (2 s), Reload (2.2 s). Loop endpoints match. Two-bone limb solving preserves knee/elbow articulation and keeps hands coordinated with the rifle. Walk is calibrated to 1.05 m/s; run to 2.3 m/s, adjusted for each soldier's scale. On planted walk frames, ankle drift is below 5 mm in the exported motion check.

Squads alternate between moving bounds, standing aim, crouched aim, burst fire and reload. Timing and scale vary between soldiers. Tracer and flash origins follow the animated weapon muzzle. Crossfades interpolate translations and quaternions. No additional gameplay objectives or player weapons were added.

The browser shares 16 instanced mesh batches per division (32 base crowd draws total, plus applicable shadow passes). It applies baked rigid-bone transforms rather than reskinning every vertex on the CPU. The entire 36-soldier crowd contains 82,368 triangles. This is a deliberate increase over the block placeholders while remaining low polygon.

The soldier uses rigid segmented skinning, not continuous organic deformation, finger articulation, facial animation, or a validated Unity Humanoid avatar. Unity requires a suitable glTF importer; Blender and other glTF engines can import the animated GLB directly. The separate editable Blender source is included for further rigging work. Actual phone GPU/thermal measurements remain unverified.


## First-person helicopter pilot mode
Click/tap an actual helicopter or its PILOT tag. All four aircraft can be selected. Manual control replaces only that aircraft’s automatic flight and firing. Other units continue the battle. Exit cockpit, Escape, an observer preset, or Rebuild releases control; the aircraft returns smoothly to its patrol.

Desktop: W/S forward/back, A/D strafe, Q/E or left/right arrows turn, R/F climb/descend, up/down arrows or drag to aim, Shift faster, Space/left click/FIRE launches. Phone: movement joystick, altitude buttons, and hold FIRE to launch repeatedly; dragging FIRE also changes aim. Dragging the view changes aim without firing. Fullscreen remains optional. Entering pilot mode resumes the simulation at 1×; pause freezes aircraft and weapons.

A 304-triangle Blender-authored interior (cockpit.glb, cockpit.blend, build_cockpit.py) attaches to the first-person camera. The selected exterior is hidden from that camera view to avoid canopy occlusion. HUD shows altitude, horizontal airspeed, heading, clearance warnings, and rocket cooldown. Rockets alternate between two launch points, aim at the crosshair’s building/ground intersection, travel through the existing swept collision path, and trigger the same damage/support/debris system. They are unguided after launch; no lock-on is simulated.

Assisted-flight scope: acceleration and damping, automatic hover on input release, horizontal translation independent of aiming, vertical movement, yaw and a clamped aim pitch. Speeds approximately 14 m/s forward, 10 m/s lateral, 7 m/s vertical, with a Shift multiplier. A 1.2 m expanded-box clearance proxy checks intact and detached building sections; it does not model the full rotor disc, tail, crash damage, rotor aerodynamics, or rigid-body flight. Flight is bounded to the district and 1.3–72 m altitude. This is a playable helicopter prototype, not a flight simulator. Real mobile performance and device input compatibility still require hardware testing.


## Missile impact correction
The reticle and projectile sweeps now share one collision query. It includes intact sections (even when queued for collapse), falling and settled rubble using current body position/orientation, tanks, helicopters, infantry, and terrain. Missile volume is included in the sweep; exact endpoint contacts and start-inside contacts count. Moving unit centers are interpolated across the simulation step to reduce tunneling. The firing unit is excluded, as is cockpit display geometry. A wall in front of a unit blocks the shot. Rockets travel at 55 m/s and expire after 6 seconds, beyond the 220 m aim-query range. These are gameplay values, not real weapon specifications.

Direct player structural hits detach the struck section immediately using reserved capacity; settled rubble can be reactivated, and moving debris receives the blast impulse. The active-debris budget still applies. The cockpit displays reticle target/range and target durability. The transient hit-confirmation box has been removed. Oversized smoke puffs were reduced so they do not hide the damage.

Units have simple game durability: tanks 100, helicopters 90, infantry 35. A direct rocket deals 68, with distance-based area damage to nearby units. Disabled tanks stop moving/firing and become smoking wrecks. Disabled helicopters stop AI movement/firing and fall as Cannon rigid bodies. Infantry stop moving/firing and use a non-graphic knockdown pose. Disabled aircraft cannot be selected for piloting. The actively piloted aircraft is excluded from blast damage in this prototype. Rebuild restores every unit, normal materials, all durability, the city, and player hit counters. No scores, objectives, armor penetration, full ragdolls, or aircraft breakup are modeled.


## Visible building damage correction
AI collapse debris can no longer occupy the entire player damage budget. Of the existing 110/160 moving-section slots, 20/28 are reserved for directly struck player sections. These hits are processed immediately, including pieces already in the collapse queue. Adjacent blast damage and unsupported floors continue through the normal staged queue; the total moving-section cap is unchanged. Airborne debris is not frozen to make room.

Detached collision proxies are inset by 3% so broken panels can separate from tightly touching neighboring sections. Mesh geometry is unchanged. Rebuild restores the original collision dimensions and structure.

Quick touch taps fire once on release. On a held touch trigger, the first launch briefly waits for aim input; drag-to-aim therefore has a chance to update before the first shot. Holding continues normal repeat fire. Desktop keyboard/mouse triggering is unchanged. The confirmation popup and its reticle flash were removed.

Validation now includes the actual rendered instance transform: a cockpit-fired missile displaced a previously intact roof slab and façade panel by more than 0.8 m, matched by the physical body position, with before/after screenshot review showing a hole. This is stronger than checking only the hit counter.

## Siege Walker — giant robot encounter

Blender-authored 21 m robot: `siege-walker.blend`, `siege-walker.glb`,
`siege-walker.json` and reproducible `build_robot.py` (run Blender in background).
3,744 triangles, 17 rigid articulated mesh components, vertex colors, no image
textures. Runtime articulation in `siege-walker.js`: slow stride, tracking head,
shoulder aiming, cannon fire, damage flash, critical reactor smoke, buckling and
17 independently falling Cannon rigid-body wreck components. This is procedural
animation, not a skinned FBX animation library.

Both divisions now share the robot as their target. All eight tanks, four AI
helicopters, and 36 riflemen use actual swept/segment collision against robot
components and city cover. Rifle fire deals 2.2 damage; shell direct hits 80;
rocket direct hits 68. Shared robot armor starts at 12,000. The robot fires a
24-damage cannon round every 2.6 s after aligning; splash falls off with distance.
AI army fire cannot damage allied units. Manually piloted rockets retain damage
to all enemy/scene targets; the occupied helicopter remains protected as before.
Once armor is depleted, allied AI hold fire while the robot breaks apart. Rebuild
restores armor, units, geometry, rigid bodies and combat counters. The dedicated
Siege Walker view opens by default and follows the robot along the open avenue.
A fixed armor bar replaces no existing controls; the removed hit popup stays absent.

Browser QA uses software WebGL; actual phone GPU, thermal behavior and frame
rate remain device-dependent. The new model adds 17 draws, no texture memory and
approximately 365 KB of GLB data. Wreck components add at most 17 physics bodies.

### Walking update

The Walker now uses a 3.2-second alternating gait with 1.0-second foot swings and
periods of double support. World-space foot plants remain fixed while the pelvis
moves and turns. An analytic two-bone IK solve drives each thigh/shin/ankle;
0.8 m swing clearance, heel-to-toe contact, lateral weight transfer and a short
landing compression replace the original sine-wave leg rotations. The lower body
turns at up to 0.34 rad/s; the waist independently tracks cannon targets. Footfall
dust reuses the existing particle pool. No mesh, texture or draw-call additions.
Animation remains procedural and uses the existing Blender rigid articulation.

## Charged energy cannon

The robot's old pulse round is replaced by a charged plasma lance. After the
initial 3.8 s ready delay, its muzzle gathers energy for 3.2 s, fires continuously
for 7.0 s, then cools for 7.5 s before charging again. The barrel's actual world
axis follows the locked aim point, with a slow +/-7.5 degree sweep during firing.
The first target is selected to expose the charging muzzle in the robot camera.

`beam-cycle.js` owns simulation-time timing; `energy-beam.js` draws the effect;
`beam-combat.js` queries actual city/unit collision and applies sustained damage.
The effect uses a white-hot core, layered cyan/blue plasma, animated electrical
arcs, inward-moving charging particles, rotating rings, soft procedural halos,
and two unshadowed local lights. No external images or fullscreen bloom pass.

Range 140 m; contact radius 1.05 m; direct damage 300 health/s at 10 Hz, with 3.8 m
falloff splash. Intact walls stop the beam until breached. Loose building debris
and disabled wrecks do not stop it. Hits scorch building instances, detach rigid
sections and trigger the existing support-collapse simulation. Direct beam
activation can use half of the reserved debris slots; the other half remain for
manually piloted missiles. Total moving-section limits remain 110 / 160.

Pause freezes charge, beam motion and damage. Robot destruction cancels the beam
immediately. Rebuild clears effects, lights, damage counters, unit state, and
physics debris. Pilot protection and the removed hit-confirmation popup are
preserved. The burst is much stronger than the former cannon, so encounter
outcomes can differ. Effects remain pooled and bounded for the phone browser;
actual device GPU performance is not benchmarked.

### Head tracking and red beam telegraph

The neck now tracks the intended firing point in both yaw and pitch, using
chest-relative aiming, damped motion and a 2.5 rad/s speed limit. Yaw is limited
to +/-1.15 rad, pitch -0.65 to +0.90 rad. It follows live targets while acquiring,
the locked firing point during charge, and the swept aim during the burst.

A harmless red warning is shown throughout the 3.2 s charge: center aim line,
translucent sweep corridor, outer rails padded by the 1.05 m beam contact radius,
moving arrows and target rings. `beam-aim.js` supplies both the actual firing
sweep and the warning geometry. The sweep origin is locked with the target, so
the planned target arc remains stable. Preview endpoints extend to beam range
or ground contact, beyond cover that the weapon may breach. The warning is
intentionally drawn through buildings to remain readable. It updates with the
cannon's current pose; the robot continues to walk, so it is a live preview of
the planned firing corridor rather than a frozen prediction of every future
footstep. It disappears when the beam fires, on reset, or on robot destruction.
No hit-confirmation popup is introduced. Pause freezes neck and warning motion.

## Violet Sentinel — flying force-energy superhero

Original 2.59 m low-poly masked hero, built directly in Blender 4.3.2:
`violet-sentinel.blend`, `violet-sentinel.glb`, `violet-sentinel.json`, and
`build_hero.py`. 1,620 triangles, 16 rigid articulated components, vertex-color
materials, glowing eyes/sigil and a three-panel animated cape. Hero escort is
now the opening camera; the other observer and helicopter controls remain.

The autonomous ally patrols above the city and builds a purple energy orb between
his palms for 1.6 s, then launches it at 42 m/s. Direct robot hits apply 220 damage;
solid city cover can intercept the swept orb. Purple trails, impact particles,
charging glow and local lighting are bounded and reused. Offense pauses while
he intercepts a helicopter attack, and stops when the robot is defeated.

For helicopter-targeted robot bursts the rescue policy accepts four out of every
five opportunities (stable across resets, not a roll every frame). The hero flies
toward a point between the cannon and helicopter at up to 48 m/s, then raises an
11.6 m diameter purple barrier. Deployment and actual arrival are required: no
teleportation and no global helicopter immunity. Robot target priority alternates
air and ground opportunities, beginning with a helicopter so the new rescue can
be observed immediately. Aerial beam aim follows the selected helicopter; the
red telegraph updates while charging. Ground firing points still lock as before.

`hero-defense.js` computes beam/plane-disc collision. The barrier participates in
the same nearest-hit ordering as world cover and units. When it is first, the
rendered blue beam ends at its actual surface and damage/physics effects stop
there. Off-path, depleted or absent shields do not protect anything. The field
has 3,000 absorption energy, uses the real 300-health/s beam damage, and regenerates
250 energy/s when not defending. An ordinary full burst costs 2,100 energy. Impact
ripples and brightening display strain. The hero can miss an interception or
skip one; his body currently has no separate health model.

Pause freezes flight, charge, orbs, shields and damage. Rebuild restores all hero
state, pending orbs, rescue counters, barrier energy and visual effects. Existing
pilot protection and the removed hit popup are retained. Hero/field rendering
adds bounded simple geometry, a generated glow texture and one unshadowed light;
real phone GPU/thermal performance remains unbenchmarked.

## Volt Rush — playable electric speedster

Original Blender-built 1,760-triangle hero with 15 articulated parts, a blue/gold
suit, luminous visor and lightning emblem. Files: `volt-runner.blend`,
`volt-runner.glb`, `volt-runner.json`, reproducible `build_runner.py`.

Choose **Play Volt Rush** in the scene toolbar or camera section. Third-person
controls: WASD, Shift for boost, drag to aim, F or hold left mouse for electricity,
Space for a ballistic jump, Escape/Exit hero to return to observation. On phones:
movement stick, BOOST toggle, JUMP, and hold/drag FIRE to attack and aim. Observer
and helicopter controls are mutually exclusive with hero control; entering runs
at 1x. Pause freezes movement, attacks and VFX. Rebuild restores all runner state.

Base run target 14 m/s, boost 46 m/s. Movement uses <=8 ms collision substeps against
live static building-section oriented boxes. Running forward into a facade enters
wall mode; forward climbs, backward descends, strafe moves along the wall. Body
and camera orient to the surface; reaching the edge crests onto the roof. Idle
wall grip lasts 0.45 s, after which gravity applies. Destroyed/moving support is
not usable; losing it causes a fall. Jump starts at 9 m/s, gravity 25 m/s^2 and
there is no vertical thrust or flight mode. The prototype does not implement
automatic around-corner wall traversal or actor/vehicle collision/hero health.

Small low-poly outer embankments share their height function with movement and
weapon ray tests, with matching Cannon convex terrain so falling debris also
contacts the hills. Sloped settled debris can support the runner; airborne debris
cannot. Movement stays inside +/-56 m world bounds.

Electricity range 110 m, direct damage 150 health/s in 80 ms ticks, 1.3 m splash.
The hand beam respects nearest world/unit contact. Building strikes use the same
immediate player-hit physics capacity as manually piloted rockets. The beam can
damage units, including allies, as with existing player weapons. Cyan branching
bolts, contact flashes, body arcs and short speed trails are bounded in two pooled
instanced batches; speed trails begin above 18 m/s. No external VFX textures.

Robot warning translucency: red line/rings/arrows reduced from 0.90 to 0.36 alpha,
halo 0.18 to 0.06 and sweep fill from 0.065–0.12 to 0.018–0.038. Targeting and
warning geometry are unchanged. Actual phone GPU performance remains unmeasured.

### Speedster gait and CPU update

Volt Rush now has separate ankle/foot components in the native Blender asset,
keeping the same 1,760 triangle budget (15 rigid parts). `runner-animation.js`
uses an integrated stride clock instead of global-time-times-speed, with smoothed
cadence/run blending, two-bone leg solves, heel/toe articulation, knee recovery,
arm pumping, torso counter-rotation, acceleration lean, turn banking, braking
and airborne/landing transitions. Cadence is capped at a readable 4.5 cycles/s;
this is stylized super-speed animation, not a promise of world-locked footplants
at 46 m/s. The same rig/animation handles ground, slopes and wall surfaces.

Whenever the player is not controlling him, `runner-ai.js` drives the existing
RunnerMotion and electricity systems. A route through streets includes a facade
and rooftop crossing. He boosts on longer legs, climbs through real collision,
recovers with gravity after drops, and fires 1.05 s aimed bursts when his sight
line to the robot is clear. CPU fire excludes allied units and uses regular AI
building-debris capacity. It ceases when the robot is defeated. Direct player
control, including its existing weapon behavior, remains unchanged.

Taking control suspends CPU decisions immediately, stops autonomous fire and
brakes at the current location. Exiting resumes CPU behavior from that same
location. Reset restores the gait, route, counters and effects. Pause freezes
both modes. The **Volt Rush escort** preset observes his CPU patrol; **Play Volt
Rush** takes control. CPU attacks do not borrow or move the observer's camera.

### Building durability and damage tint

All section health is multiplied by 1.30: walls 5.2 (previously 4), slabs
7.8 (previously 6), columns 13 (previously 10). Direct hits now subtract
weapon damage rather than bypassing health; they apply once, and splash
retains its existing distance falloff. Powerful shells, rockets and energy
weapons can still destroy individual panels in one hit. Support rules,
weapon strength, and active-debris limits retain their existing values.

Every damaging hit calls the same persistent per-section scorch update,
including rifle fire into cover, shells, helicopter rockets, force orbs,
electricity, beam hits and their blast neighbors. An undamaged panel uses
its original tint. On first positive damage, the linear color multiplier
becomes `1 - min(0.72, 0.24 + 0.48 * lostHealthFraction)` and darkens with
further damage, down to 0.28 at zero health. It remains on falling and
settled debris. Unscorched pieces knocked loose by support loss retain
the existing 0.78 debris tint. This uses the existing InstancedMesh color
buffers, with no additional meshes, textures, materials or draw calls.
Rebuild city restores full increased health and original colors.

### Shoulder salvo and superhero missile defense

The robot's chest carries a Blender-built six-cell shoulder launcher, part
`rocket_pod`. The native Blender file, rigid-part GLB, articulation JSON and
reproducible build script include it. The robot remains under 5,000 triangles
(3,744 total / 17 articulated parts); the pod adds 676 triangles. A separate
246-triangle / 25 KB `robot-missile.glb` is generated by the same Blender script.

`robot-arsenal.js` alternates a complete beam attack with a two-second flashing
pod warning and a six-missile salvo, one missile every 0.43 s. It waits for
missiles to clear and a 1.2 s recovery before allowing the next beam. Launches
use six world-space muzzle transforms on the moving shoulder. Missiles fly at
8.5 m/s, loft for 2.25 s and then steer toward an army unit. They have 18 HP,
a 0.36 m collision radius and a 22 s lifespan. Flight is capped at 12 active
missiles; allocation pauses when the previous salvo has too many survivors.
Bright exhaust and 0.09 s smoke emissions expose flight paths. All unit and
city/terrain collision uses swept segments, sharing existing cover handling.
Unintercepted warheads use the rocket blast: building power 18 / radius 3.8 m,
direct unit damage 68 with existing splash falloff and pilot protection.

Violet Sentinel prioritizes missile defense using 1.0 s purple orb charges and a 1.4 s recovery between shots
and 42 m/s homing orbs. Her right arm aims at the missile. Shielding takes priority: she cannot charge or launch an orb while the barrier is up or fading. Launched orbs reserve their
target briefly so Volt preferentially attacks other missiles. CPU Volt uses
line of sight and normal 150 DPS electricity (0.08 s ticks, two hits to kill
a missile). He moves toward threats hidden by cover and can keep climbing
while aiming. Player control suspends this automation; manually aimed
electricity, purple orbs and other projectile sweeps can hit live missiles.

Interceptions generate harmless airborne flashes/sparks and remove the
warhead before it can invoke building or unit blast damage. Heroes continue
clearing launched missiles after the robot dies, while remaining pod launches
are cancelled. Rebuild clears missiles, effects, charges, claims and counters.
Pause freezes flight/defense with the rest of combat. The hero HUD shows live
inbound count and total shot down; `battleDiagnostics().missileDefense`
provides individual projectile state and separate Violet/Volt kill counters.

### Deliberate rooftop attacks

CPU Volt Rush now uses `runner-rooftops.js` to occasionally approach a building,
climb its actual facade, move to a firing point, attack from the supported roof,
and leave before resuming patrol. The first opportunity begins after 1.4 s;
completed visits have a 14–20 s cooldown. Roof attacks last up to 4.8 s, with
1.15 s firing windows in a 1.6 s cycle. He brakes before firing and aims at
the robot using the existing real electricity damage/occlusion path.

Candidates come from live intact roof slabs, within six nearby buildings;
firing positions are checked against real line of sight. Position probes are
checked every 0.25 s, LOS every 0.12 s, and a detached/destroyed local support
cancels shooting immediately. Blocked shots trigger repositioning or departure.
Approaches use normal movement, climbing and gravity; debris stalls trigger a
jump recovery. A missed approach re-routes to the facade staging point, and
an unsuccessful sortie times out after 22 active seconds. No teleporting,
fixed altitude or immunity to falling is added.

Incoming missiles retain priority and suspend the roof routine. Player takeover
cancels it at the current position; exiting re-enables autonomous decisions.
Robot defeat cancels roof attacks. Rebuild resets visits, timers and damage.
Choose **Volt Rush escort** to watch. Diagnostics expose phase, chosen building,
completed/aborted visits, recovery count, firing time and real robot damage
under `battleDiagnostics().runner.cpu.rooftop`.

### Violet Sentinel inertia and slower attacks

`violet-flight.js` keeps persistent world velocity instead of assigning a fixed
step toward each goal. Patrol acceleration is capped at 14 m/s² and braking
at 12 m/s²; rescue acceleration/braking are capped at 32/26 m/s² so she can
still reach threatened aircraft. Patrol/rescue/missile pursuit speed targets
are 12/40/24 m/s. Steering response and an arrival-speed curve produce visible
acceleration, coasting, reversals and gradual braking, integrated at up to
120 Hz. Switching modes retains velocity; reset clears it.

Normal orbs charge for 2.4 s then recover for 5.4 s (about 7.8 s between
launches, previously 4.8 s). Interception orbs charge for 1.0 s and recover
for 1.4 s (about 2.4 s between launches, previously 0.48 s). Both attacks
share the recovery timer so changing targets cannot bypass it.

The barrier blocks charging and launching, including its visible fade.
Raising it clears partial charges; lowering it requires 1.4 s recovery
before a new charge. Existing airborne orbs continue their trajectories.
Volt's missile interception remains independent during Violet's shield duty.
Diagnostics now include velocity, speed, cooldown, shielding and tuning.

### Alternating arsenal, pod warning and barrier recoil

The robot's weapons share `robot-arsenal.js`: beam charge/fire → 2 s pod
warning → six-missile salvo → missile clearance → 1.2 s recovery → beam.
Beam startup is gated while the pod is active or missiles remain airborne;
missile launches are also gated against beam charging/firing. The standalone
missile module retains optional autonomous timing for isolated fixtures, but
the live scene disables that timer. Destruction cancels warning/launches;
Rebuild restores the beam-first sequence. Diagnostics expose the phase and
recent alternating turns.

The pod has a -45° local X rest rotation, pointing its actual tubes upward
at 45° relative to the torso. Missile origins and directions use these
rotated tube transforms, without adding a second launch pitch. During the
warning the existing pod material flashes hot orange/red (emissive 0.1/4.2)
with increasing cadence, then returns to normal after launch. No extra
material, texture, mesh, or draw call is needed for flashing.

Violet's barrier moves from 1.7 m to 2.21 m in front of his chest reference,
exactly +30%. `shield-shake.js` adds bounded lateral recoil (up to 0.24/0.18 m)
and small rotational jolts when damage is absorbed, decaying at 7/s.
The rendered shield center and tilted normal are used for actual beam
collision; shake never leaves a hidden stationary collision plane behind.
The forward offset remains 2.21 m during tangent shake. Reset clears recoil.
Shielding still prevents attacks and preserves the slower flight/shot timing.

### Volt Rush charged lightning and extended dash streak

`runner-charge.js` adds a 0.5 s wind-up to each weapon activation
for both the player and CPU. Damage timing accounts only for the frame portion
after charge completes; existing 0.08 s / 150 DPS beam ticks follow it.
A growing white/cyan palm core, two spinning rings, spiral forearm arcs and
light buildup accompany a pull-back/extend arm pose. Charge status appears
in the player HUD. Holding fire repeats charged, capped bursts after recovery; tapping FIRE queues the
wind-up and a short 0.18 s beam pulse. Releasing keyboard fire before charge
completes cancels it. Blur, takeover/exit and reset clear partial charge.

Dash arcs now persist for 0.72/0.62 s rather than 0.16/0.13 s, with stronger
older-trail visibility and wider cores. Successive emissions connect from the
last emitted position to avoid dashed gaps. Body arcs use 0.18 s lifetime.
The 350-trail / 500-rendered-segment limits and two existing instance pools
remain fixed. At 46 m/s, the straight-line test retains about 34.5 m of
actual movement path. Charge uses four reusable visible meshes; no geometry
is allocated per activation. Stationary trails fade and all effects reset.

### Speedster firing-rate limit

Volt's lightning is now capped at 0.4 s per burst. Every fired burst, including
one released early, starts a 1.5 s cooldown before the next 0.5 s charge.
Holding fire therefore produces at most one full burst every 2.4 s rather
than an uninterrupted beam. During recovery, the HUD displays RECHARGING.
CPU targeting and player input share this clock. Switching targets, tapping
rapidly, blur, or entering/exiting player control cannot reset the cooldown.
Cancelling an unfinished charge remains allowed. Pause freezes recovery;
Rebuild city resets it. The existing charge animation and long dash trail
remain in use.

## Rift Warden — third CPU hero

Native Blender-authored original character: `rift-warden.blend`,
`rift-warden.glb` (194,368 bytes), `rift-warden.json`, and reproducible
`build_portal_hero.py`. 1,852 triangles / 16 rigid articulated parts, ivory
mantle, jade suit, gold gauntlets and a luminous green portal emblem.
No image textures. Choose **Rift Warden escort** for an observer camera.

He opens paired upright portals and teleports between currently intact
battlefield rooftop vantage points. Departure/arrival shrink and emergence
poses make the transition visible. The portals are stationary world-space
objects with immutable positions and exact five-second expiry, including
opening/closing animation. They use animated energy-disc shaders, shared
ring geometry and instanced runes rather than extra scene-render cameras.

An attack portal aims at the robot, warms up for 0.35 s, then emits four
65 m/s projectiles per second while open (up to 18 shots, half the original
firing rate). Bolts have 2.4× wider gold cores, green halos, three animated
star twinkles each, and short sparkling trails. Each bolt uses
real swept world collision, dealing 8 damage to the robot/missiles or
2 building-section damage with the existing scorch path. Buildings block
shots. Only one attack portal is active; bolts have a two-second lifespan.
Existing bolts finish after a portal closes. Robot defeat stops new fire.

Rescue policy examines actual hostile/player projectiles over the next
1.25 s and locked homing missile targets within five seconds of arrival.
It supports live tanks and infantry from both friendly divisions, never
disabled units or aircraft. Source/destination portals appear underneath
the rescued unit (tank radius 3.1 m, infantry 1.05 m), remain fixed for five
seconds, and the real unit instantly relocates at unchanged health.
Destinations are at least 16 m away, on the unit's own side, clear of city
geometry, other units, debris and near-future hostile trajectories.
Rescues are throttled to 0.6 s with a ten-second cooldown per unit.

Unit transforms, crowd render matrices, muzzle transforms and collision
shapes all move together. Previous collision centers reset to the destination
so teleporting does not create a swept collider across the city. Homing
missiles targeting an evacuated unit lose their lock and continue toward
the old target point; no unit invulnerability or healing is added.

A thin traveling gold-and-green trace follows every successful self, tank
or soldier teleport from source to destination. It is a short moving dash,
not a persistent full-length beam: 0.05 m core diameter, up to 2.5 m long,
0.65–1.1 s travel plus 0.14 s fade, with a slight raised arc for visibility.
Trace endpoints are copied at teleport time and never follow moving units.
Failed rescues do not create traces. Reset clears them.

Limits: twelve portal openings, 64 bolt cores/halos, 192 star twinkles,
120 effect particles and eight trace cores/halos. Effects are instanced
with fixed buffers; four additional draw calls, no lights or render targets.
Shared geometry/materials are retained; per-opening rune instance buffers
are disposed on expiry/reset. Pause freezes expiry, attacks and rescues.
Rebuild removes portals/bolts and restores original army positions/health,
hero state and counters. Diagnostics are in `battleDiagnostics().portalHero`.

## Volt Rush — rescue dash

Press **E** while controlling Volt Rush, or tap **DASH** on the phone HUD.
Dash runs forward up to 10 m at 60 m/s (about 0.167 s), with a five-second
cooldown from activation. It captures every live friendly tank and infantry
unit whose feet are within a 5 m sphere at departure, including both allied
divisions. Aircraft and disabled units are excluded. Relative horizontal
positions are preserved and each actor follows the local ground height.
Ground and roof starts are supported; wall/air starts are rejected.

`runner-dash.js` plans the whole group in 0.25 m steps, expanding live city
section/debris boxes by each actor's world-space footprint. Other units,
world bounds, excessive height steps, missing roof support and roof edges
stop the whole group at the shortest safe distance. Paths under 0.75 m are
rejected without consuming the cooldown. Live geometry is checked again
throughout movement. This is continuous movement, with per-frame swept
collision histories, rather than teleporting allies to an endpoint.

Real tank transforms, infantry transforms, render/weapon matrices and hit
shapes move together. Normal army navigation pauses while carried, then
resumes. Cyan lightning tethers and short trails use the existing bounded
350 trail segments / 500 instance pools; no extra renderer or physics-body
pool is added. Dash interrupts electricity charging/firing and preserves
existing weapon recovery. No healing, immunity, missile-lock cancellation
or guaranteed rescue is added: homing missiles can pursue moved allies.
Rift Warden will not teleport a currently carried ally.

The CPU scans every 0.15 s while ready and near eligible allies. Predicted
incoming projectile impacts within 1.5 s trigger an attempted rescue.
It tests both directions perpendicular to the incoming trajectory, requires
at least 4 m of clear movement, and scores the entire group's clearance
from the predicted projectile over 1.25 s. It rejects direct intersections
and chooses the better clear route; tight spaces may prevent a rescue.
It does not abandon distant rooftop positions to chase every threatened
unit. Player input can dash without passengers. Pause freezes movement and
cooldown; switching control/blur releases all passengers at their current
position without resetting recharge. Rebuild resets the ability and allies.
Diagnostics: `battleDiagnostics().runner.dash`.

## Opposite-shoulder plasma artillery

The current Siege Walker is **4,452 triangles / 18 rigid parts**. The new
`plasma_cannon` sits above the right shoulder opposite the left rocket pod:
wide ten-sided barrel, cooling collars, armored rails and a jade plasma bore.
The Blender source and build script, GLB (428,276 bytes), metadata and native
`.blend` have been regenerated. Existing articulation, hit boxes and death
wreck generation include the new component. It is one added character draw.

The cannon stays aligned with the torso’s forward axis at **45° elevation**,
compensating for walking pitch/roll. The robot turns its body/waist toward the
locked target; the shoulder mount never independently swings sideways or backward.
Launch waits until the barrel is aligned within 0.012 radians. Each artillery
turn warns for at least 2.4 s before the first shot; a second shot follows
1.6 s later where a separate target is available. A shared arsenal rotates
**plasma → beam → rocket pod → plasma**, waiting for all live shells/missiles
to clear between weapons. After each attack clears, all weapons rest for
**five full simulation seconds** before the next weapon begins charging or its
launch warning. The rotation is plasma → five-second rest → beam → five-second
rest → rocket pod → five-second rest → repeat. Existing charge/warning times
follow that pause. Plasma opens the first turn so it is visible early.
The existing beam and pod never charge/fire together with the artillery.

`plasma-artillery.js` solves a 45° ballistic trajectory from the actual muzzle
with gravity 5 m/s², typically 3–6 s of flight and an apex 23–30 m above the
street in this scene. It integrates swept collision in at most 1/90 s slices.
Each plasma ball has a 0.65 m core radius, a pulsing green halo, two spinning
plasma rings and a short instanced particle wake. Existing cover along an arc
rejects that aim before warning. Newly moved units/debris/buildings can still
intercept a live shell, causing an early burst and clearing its old marker.

Each locked ground target has a **7 m blast radius / 14 m diameter** with
crosshair ticks, a shrinking timing ring, translucent fill and a countdown.
Its world position remains fixed even if the original target moves or is
rescued; the shot never homes toward evacuated allies. Warnings remain visible
through city occlusion. Launch recomputes flight time from the moving muzzle
to the same fixed aim point. Use the **Plasma artillery** observer preset to
frame the cannon, arc and threatened ground zones on desktop or phone.

Actual impacts deal 160 nominal unit blast damage with the existing distance
falloff, and 32 structural impact power over the same 7 m radius. Direct world
hits use the shared scorch/destruction path and physical debris budget.
The robot is excluded from its own blast. The ground marker matches the
unit blast radius; unit footprints are included conservatively in rescue
predictions. There is no immunity or automatic damage cancellation for heroes.

Rift Warden reads the fixed predicted impact and begins attempting portal
rescues inside 3.5 s of impact. Both safe-exit policies reject every active
plasma blast area, including a footprint margin, even while the ball is still
high above the city. Carried allies are left to Volt Rush. His CPU approaches
reachable threatened allies within 24 m while there is enough time, holds
near them, and at <=2 s tries sixteen outward dash directions. It requires
the whole captured group to finish beyond every marked radius plus its body
footprint, and retains the existing wall/terrain/ledge checks. E / phone DASH
remains available to the player. Tight geometry or hero cooldowns can prevent
some rescues; the attack can still hurt allies that remain inside the zone.

No more than two shells/markers and 100 trail instances are active. Marker
textures, labels, line buffers and transient blast-wave materials are disposed
on expiry/reset. No extra lights, shadow maps, physics body per projectile or
scene-render cameras are added. Pause freezes all timers. Robot defeat cancels
unlaunched shots; already airborne balls remain dangerous and both rescue
heroes can still respond. Rebuild clears artillery, warnings and damage counters.
Diagnostics: `battleDiagnostics().plasmaArtillery` and `.robot.plasmaCannon`.

## Building armor: 90% reduction except Siege Walker

Building section health keeps its existing +30% increase (wall 5.2, slab 7.8,
column 13). Every non-robot source now deals **10% of its previous health
 damage** to those sections: army/player shells and missiles, infantry bullets,
Violet force orbs, Volt electricity and Rift portal bolts. Robot beam, shoulder
missiles and plasma artillery retain **100%** of their building damage.

The shared `DestructionWorld.damageChunk` applies the multiplier exactly once,
including direct, distance-falloff splash and detached-debris health paths.
`impact` carries an explicit `source` ID. Only `source: 'siege-walker'` receives
the full-damage exception; missing/unknown sources default to 10%. Player or
beam activation-priority flags alone do not bypass armor. All live robot weapon
callbacks explicitly pass the robot ID. Other weapons retain their own IDs.

Examples of direct structural damage: tank shell 23 → 2.3, aircraft missile
18 → 1.8, infantry bullet 0.35 → 0.035, Violet orb 26 → 2.6, electricity
impact 12 → 1.2 and portal bolt 2 → 0.2. Robot beam stays 35, pod missile 18
and plasma blast 32 before existing splash falloff.

Scorch remains persistent and follows actual section health loss. Unit damage,
blast radii, physical impulses, collision, support-loss rules and debris budgets
are unchanged. Sufficient accumulated non-robot damage can still break panels;
robot damage can still cause full physical structural collapse. Rebuild restores
health/colors and retains the armor rule. Diagnostics expose
`physics.nonRobotDamageMultiplier = 0.1` and `physics.robotDamageMultiplier = 1`.

### Mobile hero twin sticks

Volt Rush now has separate MOVE and LOOK sticks on narrow screens and coarse-pointer devices, including landscape fullscreen. The left stick moves forward/back/left/right relative to the view. The right stick continuously turns and looks while held: up to 2.4 rad/s yaw and 1.65 rad/s pitch, pitch limited to ±1 radian. Both use a radial 12% deadzone and analog strength; releasing/canceling a contact recenters only its own stick. Blur, hidden documents, exiting/rebuilding and viewport resize clear the stick contacts.

BOOST (toggle), JUMP and rescue DASH sit immediately above the movement stick. FIRE sits above LOOK, and still supports holding to charge/fire and dragging to aim. Ability buttons activate on pointer-down, including non-primary contacts while both sticks are held; keyboard activation remains available. Touch ability targets are at least 48×44 pixels, FIRE is 56×56, and both stick pads are 96×96. Safe-area insets keep controls clear in fullscreen. Screen-right player strafe follows screen-right on ground and walls; CPU motion conventions remain unchanged. Existing keyboard, wall-running, rescue-dash limits and charge/cooldown timings are retained.

### Volt Rush movement comfort, aim assistance and rescue feedback

The shared grounded/wall-running controller now accepts a jump for 0.12 seconds after leaving an edge and buffers a new jump for 0.15 seconds before landing. A jump consumes the grace period, so this does not enable double jumps. Descending feet can catch an intact or settled slab up to 0.28m to the side after at least 0.06s airborne and below −1.5m/s vertical speed. The adjusted position must have real support and a clear chest sweep. This avoids sticking to ledges when running off a roof. Wall climbs can mantle up to 1.05m onto a real walkable slab only when the chest can clear the lip. Intermediate floors behind a facade and falling roof sections do not qualify. Normal gravity, lost-support falls, grounded rescue dash limits and the electricity cadence remain active.

Hero controls now have a gear menu with persisted look sensitivity (0.5–2.0×), mobile aim assistance and rescue sounds. Touch electricity can select a live missile within 5 degrees or visible robot armor within 3 degrees of manual aim, up to 110m away. A small ring marks the assisted endpoint while charging/firing. Walls and friendly units block acquisition, the physical hand-to-target damage trace remains authoritative, fast look-stick input releases assistance, and the camera is never automatically rotated. Desktop mouse/keyboard shots retain manual aiming. The robot has no new weak-point damage multiplier.

Player rescue credit requires a predicted hostile threat before the dash and a matching real impact afterward. The ally must survive, have actually been carried at least 2m, and be clear of the actual blast plus a 0.3m margin; its original collision shapes must have been in that blast. The dash-carried endpoint must also have cleared the blast, so a later portal cannot earn dash credit. Ordinary transport, blocked short carries, friendly projectiles, CPU rescues and intercepted/expired threats do not increment the player counter. Credit is unique per ally/attack. Tracking is bounded to 128 pending candidates and 256 recent credited pairs and resets with Rebuild city.

Confirmed saves display an ally count for 2.2 seconds, add expanding cyan ground rings at the escape positions (at most 12 ring instances / one additional draw call), and play a short three-note chime after user gesture audio unlock. Saves attempted with at most 0.65s to impact receive a CLOSE CALL label. The HUD counter records saved allies for the current run. Exiting clears transient feedback; Rebuild clears the counter. The sound switch persists across reloads; Web Audio nodes disconnect after playback. These are rescue notifications, separate from weapon hit confirmations, which remain removed.
