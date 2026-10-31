# Crossfire controls — revision 68

`dist/input-mode.js` chooses the layout from pointer capabilities and actual input, independently of viewport width. Fine-pointer desktops use keyboard/mouse reminders; coarse-pointer phones/tablets use touch controls. Touch/pen selects touch mode, mouse or gameplay keyboard selects desktop. Switching modes clears held input. Observer and helicopter controls retain their existing bindings.

## Volt Rush

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrow keys | Left movement stick |
| Jump | Space | JUMP |
| Primary lightning | Hold left-click or F for a sustained beam | Hold FIRE; drag it to aim if desired |
| Defense | E electric rescue wave | DASH |
| Boost | Hold Shift | BOOST toggle |
| Overload stun | Q; 50 charge, 15-second cooldown | STUN |
| Look | Hold right-click and drag; release to stop | Drag open scene or FIRE |
| Exit | Escape or Exit hero | Exit hero |

Right-click only looks. Left/right mouse buttons work in either press/release order, so aiming and firing can continue independently. No persistent mouse lock is requested. Right drags continue off the canvas through pointer capture/window handlers. Blur, pointer cancellation, menus, hero exit and device switching release held input. Automatic camera follow yields while aiming. Touch scene drags only aim, never attack.

## Sustained player lightning

Pressing primary starts the beam and damage on the next gameplay update, with no wind-up, 25-charge entry fee or shot recovery. Any positive stored charge can fire. Hold to sustain; release stops firing. An extremely quick click/tap is buffered for 80 ms so it still produces a visible, paid hit rather than disappearing between frames.

The beam drains **25 charge per second** and deals the existing **150 damage per second**. A stationary full 100-point bar lasts **4 seconds**, for 600 direct damage. Partial charge produces proportional duration/damage, including the final fraction of a frame. Damage to building panels is scaled by firing time so changing from batched bursts to per-frame hits does not multiply damage at higher frame rates; the existing 90% non-robot building protection remains in place.

Running and wall-running still earn charge from actual surface distance at `100 / (46 × 6)` per metre. While firing, real movement offsets part of the drain. At steady 46 m/s, net drain is about 8.33 charge/s, so a full bar can sustain about 12 seconds before emptying. Dash, falling, teleporting and pushing walls do not earn charge. No idle drain.

At zero charge the beam stops consuming energy and dealing damage. Holding FIRE/left-click/F resumes it on the first update with any positive charge, including new charge earned by running. There is no cooldown, rearm lock, required trigger release or minimum 25-charge gate. Damage remains proportional to energy actually consumed, so running income cannot produce free full-strength damage. The HUD shows gradual drain and hold instructions. Ready sounds do not repeat while held fire immediately consumes newly earned energy. Stun, dash and input clearing cancel the beam safely; the electric wave cannot fire during transit.

Autonomous Volt retains the previous paced 0.4-second, 25-charge burst and 1.5-second recovery, preserving the existing CPU combat/recharge balance. Player and CPU share the same stored energy and damage/collision routing; control handoff preserves the resource. `RunnerBeam` handles the manual sustained trigger, while `RunnerCharge` retains CPU burst cadence.

Tuning: `RUNNER_ENERGY.beamDrainPerSecond` in `dist/runner-energy.js`, `RUNNER_BEAM.tapSeconds` in `dist/runner-beam.js`, and existing lightning DPS in `dist/battle.js`.

## Lightning wave and escort extension

E / touch DASH converts Volt and nearby/touched soldiers, tanks and civilians into electricity, travels 10 metres, then reforms them in safe spaces. Five-second cooldown, no energy cost. Moving input chooses direction without snapping the camera; otherwise the wave follows the view. Solid obstacles, roof edges and ground-clearance restrictions remain. Landing buffering and failure feedback are unchanged. See `QA/runner-wave-validation.md`.

Escort mode extends player run/dash limits along the outer boulevard so Volt can intercept the three-drone squad. Original City battle limits remain unchanged. See `source/ESCORT_MISSION.md`.

QA: `QA/sustained-lightning-browser.cjs`, `QA/runner-beam-test.mjs`, `QA/device-controls-browser.cjs`, `QA/runner-energy-browser.cjs`, and `QA/weak-points-browser.cjs`. The old instant-lightning browser entry point invokes the current sustained-beam suite.

## Hero minimap (revision 69)

The corner radar appears during hero control, follows the hero and rotates with the actual camera heading. The white center arrow points along the view; N rotates around the rim. Gold circles show nearby civilian groups with headcounts, red diamonds show the Siege Walker and drones, cyan dots show allied heroes, green H marks the evacuation zone and S marks the existing subways. Ground civilian and enemy totals appear below the map. Boarding/death remove markers; teleports and the electric wave move them with their real positions. Units outside the 90 m range remain as rim arrows. Destroyed buildings dim to rubble footprints. Mouse/touch gestures pass through the map, including right-drag aiming, and it occupies space separate from desktop/mobile buttons. See `QA/hero-minimap-validation.md` for tests and tuning.

## Light lightning aim assistance (revision 70)

Beam aim assistance now works on desktop and touch, enabled by the existing setting by default. It corrects only near-misses within 2.5° of visible robot armor or 3° of a live missile, up to the existing 110 m beam range. Large/rotated armor uses a nearby point just inside its hitbox rather than pulling toward the robot's center. The camera, movement reference and minimap heading remain under player control. A small existing cyan marker indicates when the beam is assisted.

Direct hits on robots/missiles and deliberate weak-point rays keep their manual endpoint. Weak points are not aim candidates; a body-assistance ray that intersects one is rejected. Scenery and other units still block target selection, and the actual muzzle-to-endpoint collision remains authoritative. Previous-target preference cannot extend the narrow acquisition cone. Turn off **Beam aim assistance** in the ⚙ settings for fully manual fire; that preference persists on both input modes. Charge drain, sustained fire/no cooldown, E dash and right-drag look are unchanged. Tune `RUNNER_AIM` in `dist/runner-aim.js`.
