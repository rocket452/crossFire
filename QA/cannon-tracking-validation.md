# Siege Walker cannon tracking — revision 61

The existing beam clock, damage, render effects and arsenal rotation remain in use. The cannon now refreshes the locked target's live visible position for heroes, civilians and ground vehicles as well as helicopters. Same-ID target objects are refreshed, preventing stale references. If a target leaves the available/visible set during a burst, the cannon retains its last known aim point. It does not acquire another target mid-beam.

`dist/cannon-tracking.js` exposes `CANNON_TRACKING`:

| Setting | Value |
| --- | --- |
| Acquiring / charging turn limit | 30 degrees/second |
| Firing turn limit | 20 degrees/second |
| Local waist turn limit during the beam turn | 20 degrees/second |
| Maximum barrel aim error to begin charging | 7 degrees |

Aim is stored in world space and converted back through the animated chest hierarchy to the actual cannon arm. Pelvis/waist rotation cannot bypass the firing cap. The existing approximately 19.5 degrees/second pelvis turn and foot gait remain unchanged. Other heavy weapons retain the prior waist response. Stuns freeze the tracker and existing weapon interrupt cancels firing. Reset clears tracking state.

The old artificial side-to-side firing sweep is removed: an instantaneous energy beam now pursues the live target directly, subject to the slow turn cap. There is no leading ahead of instantaneous-beam targets. The charging telegraph uses the actual muzzle and rate-limited barrel direction while it catches up, with the existing translucent red warning spread. Its ring lies on that actual ray, and `trackingTarget` separately records the intended target. Eye-bolt gaze cannot steal aim when the main cannon is allowed to start.

Verification:

- `node QA/cannon-tracking-test.mjs`: PASS 30/60/120 Hz, actual robot GLB and hierarchy. Live same-ID targets across hero/civilian/tank/helicopter kinds; moving target acquisition, harmless muzzle-aligned warning, close tracking of ordinary angular motion, world-space 30/20 degrees/second limits including a 180-degree reversal, no instant snap on relocation, frozen aim during stun, reset and death.
- `node QA/cannon-tracking-browser.cjs`: PASS desktop and phone with the actual gameplay update, physics, beam effects, and real keyboard/touch movement. Warning direction error was zero. Observed maximum turn was 30 degrees/second acquiring and 20 firing. A nearby 0.35-second strafe caused about 3.08 degrees of deliberate lag, caught after stopping. A sudden relocation turned the gun only 0.333 degrees in one 60 Hz frame and left about 102 degrees of error, allowing a clear dodge. Charging/firing screenshots reviewed; no page/renderer errors; rebuild returns to five-second startup.
- `node QA/head-telegraph-test.mjs`: PASS head limits/smoothing, physical muzzle and warning alignment, harmless charging and warning geometry/lifecycle. Updated the target assertion to distinguish actual warning ray from intended tracking target.
- `node QA/hero-powers-browser.cjs`: PASS desktop and phone: existing overload, three weapon interruptions, CPU use, physical shield absorption and 1,680-damage Violet beam, reset and evacuation targeting.
- `node QA/evacuation-cycle-browser.cjs`: PASS desktop and phone through multiple waves, boarding/escape/loss/replacement, civilian dash/barrier interactions, city destruction and full combat. At 65 seconds each layout rescued ten civilians, lost zero, had 25 waiting and one aboard.
- Node regressions PASS: arsenal, hero powers, five-second weak-point stagger cycle, walker gait at 30/60/120 Hz, hero defense, plasma artillery and eye bolts.

Changed runtime files: `cannon-tracking.js`, `siege-walker.js`, `beam-aim.js`, cache versions in `battle.js` and `index.html`. Models, beam damage, charge/fire duration and weapon recovery are unchanged. Fast nearby targets can deliberately outrun the beam; this is the intended consequence of the turn limit. Physical phone FPS/thermal performance is not measured.
