# Kage and defender combat updates — revision 82

Kage is a sixth roster choice, with the existing three-defender limit and Volt / Violet / Rift defaults preserved. The new hero uses the supplied 1,256-triangle, 53-bone weighted humanoid and its real run, directional run, jump and fall clips. Original runtime accessories add a mask, headband, scarf, held shuriken and dash blade. Double jumps roll around a hip-height pivot; wall springs, throws and slow-fall poses modify the actual weighted skeleton. Player and CPU use the existing city collision/damage/portal systems.

## Abilities and controls

- Normal run: **46 m/s**, the same as Volt's boosted speed. No charge bar or boost button.
- First jump **30 m/s**, double jump **27 m/s**, with normal **25 m/s²** gravity. An empty-air third jump is rejected. Landings restore both jumps.
- A jump within **1.55m** of an intact building wall springs away at **18m/s** and upward at **36m/s**, restoring one air jump. The outward kick lasts **0.22s** and a **0.35s** contact lock prevents repeated kicks against the same contact. Wall running remains Volt's ability.
- Shurikens: **55 damage**, **0.22s** throw interval, **85m/s**, fired from the actual right-hand bone; swept collision and gateways work normally. Pool limits: **36 stars**, **120 particles**, **32 dash trail segments**.
- Air dash: **24m** maximum at **92m/s**, **320 damage**, **6s** cooldown. It strikes toward the camera reticle with three swept body probes. Cover stops the dash; defeated robots do not block subsequent ninja attacks. Only a confirmed kill delivered by the dash resets its cooldown. Missile kills count; ordinary shuriken kills and scenery impacts do not.
- After a dash: **2s** of slow fall, gravity ×**0.12**, falling speed capped at **3m/s**. Landing ends this period. Dash resets do not grant extra empty-air jumps.
- Desktop: WASD, Space, left-click/F shurikens, E or right-click air dash, locked mouse look. Escape releases the mouse; again exits. Phone: left movement stick, grouped jump/fire/dash buttons, scene dragging to aim.
- Kage fights automatically when uncontrolled. Hero selection, minimap, robot/drone targeting, reset, pause and pilot/Volt handoff include him. Inactive Volt no longer releases mouse lock owned by another hero.

## Other requested changes

Violet recognizes beam targets whose entity is himself. He always accepts self-defense rather than applying his probabilistic civilian/aircraft rescue policy, brakes in place, faces the attacker and physically places his shield in the ray. Self-defense interrupts his active force beam. Existing shield capacity, absorbed-energy generation, no-shooting-while-shielding rule and civilian/helicopter interceptions remain.

Small robots flash **red** on damage. The Walker's hull has no damage flash; only the damaged individual weapon receives the red overlay. The overlay restores before simulation each frame, preserving current pod/plasma warning ownership rather than restoring stale light values. Destroyed weapon pieces stop flashing.

The glowing Walker weak points, tracing, damage diversion, automatic burst/stagger cycle, reset logic, status line and field-guide text are removed from the running game. The hull receives normal attack damage; destructible weapons and hero stun abilities remain. The obsolete weak-point runtime module and its feature-specific tests are deleted; other combat tests now validate normal hull hits.

## Verification

- `node QA/ninja-motion-test.mjs`: 30/60/120 Hz and irregular steps. Full run speed, high/double jump, no empty-air third jump, roofs, angled wall kick and air-jump refresh, contact lock, exact dash range, six-second cooldown, two-second slow fall, confirmed kill chains, scenery rejection and no ninja wall running.
- `node QA/enemy-damage-flash-test.mjs`: real Walker/raider models and physics at 30/60/120 Hz. Red whole-drone / weapon-only Walker flashes, no hull flash, live warning restoration, destroyed-weapon cleanup. Real weighted Violet self-defense, physical beam intersection, energy absorption, no offensive shots while shielding, emergency force-beam cancellation and release.
- `node QA/ninja-browser.cjs`: actual desktop and emulated-phone UI/input in the evacuation scene. Six-card roster and three-choice limit; real walking/jumping/wall jumping; dash cooldown/slow fall; two consecutive moving-missile dash kills; real-hand shuriken damage; a low-health drone dash kill, wrecks and reset; CPU movement/attacks; actual Walker beam self-interception by Violet; weapon red-flash scope; zero weak-point nodes/HUD. No page/console errors or horizontal overflow.
- `node QA/robot-death-browser.cjs`: desktop/touch actual lightning kills, existing eighteen/five-piece breakups, 33 simultaneous smoking parts, finite physics, no added civilian losses, rebuilding and repeat kills.
- `node QA/device-controls-browser.cjs`: desktop, narrow desktop, phone and tablet. Existing Volt pointer lock, free mouse look, independent movement/fire, E dash, Escape/resume, settings, denied-lock recovery, pause/blur cleanup, pilot reminders, touch move/fire and hybrid input switching all pass. The locator now scopes reminders to the Volt HUD because Kage has a second HUD.
- `node QA/enemy-damage-flash-browser.cjs`: desktop/touch real damage callbacks verify no hull flash, only struck weapons red, whole-drone red, warning ownership and rebuild. `node QA/runner-hit-effect-browser.cjs` also passes for boss/drone lightning contacts, sustained feedback, cover/miss rejection, normal damage/charge and reset. `node QA/walker-weapons-browser.cjs` passes actual desktop/touch destruction of all four mounts and restoration.
- Existing movement, swept-wall control, air-wall grip, landing forgiveness, hero roster, defense, arsenal, destructible weapons and evacuation lifecycle simulation checks pass. These include the original Volt wall-run/roof behavior.

Screenshots include `/tmp/ninja82-double-desktop.png`, `/tmp/ninja82-double-phone.png`, `/tmp/ninja82-wall-desktop.png`, `/tmp/ninja82-wall-phone.png`, `/tmp/ninja82-chain-desktop.png` and `/tmp/ninja82-chain-phone.png`. Browser fixtures isolate attacks and stage positions/low enemy HP where needed; actor collision, real damage/death callbacks, UI events and weighted meshes remain active. Physical-handset FPS/thermals and long-term ability balance have not been measured. Heroes retain the prototype's existing hit-feedback/target proxies rather than adding a new hero health/death system.
