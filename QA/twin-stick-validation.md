> Superseded by revision 32: see runner-left-controls-validation.md. The right look stick has been removed and FIRE moved left.

# Mobile hero twin-stick validation

Feature: mobile Volt Rush controls with a dedicated movement stick, a dedicated continuous look stick, and ability buttons beside movement.

Automated browser coverage uses the actual full-scene page, real Chromium CDP touch contacts and production input handlers. QA interception only stops the continuous renderer and exposes deterministic stepping; it is not shipped. Phone layouts are emulated, not physical-device performance measurements.

`node QA/twin-stick-browser.cjs` covers 390×844, 320×740, landscape fullscreen 844×390, and desktop 1100×1000:

- Two separate held touches move and look simultaneously; a third contact charges FIRE.
- Releasing FIRE preserves both sticks; releasing either stick preserves the other.
- BOOST, JUMP and DASH respond while both stick contacts remain held.
- Forward, back, left and right move in the correct screen-relative directions.
- Held look keeps turning without pointer movement; yaw matches at 30 and 60 Hz.
- Look pitch clamps to ±1 radian; near-center movement ignores the 12% deadzone.
- Cancellation, window blur, exit/re-entry clear held axes.
- All six touch controls remain within the game view, do not overlap, and have at least 44×44-pixel touch areas.
- Desktop D, Space, E and F still perform strafe, jump, dash and charge.
- No page errors or document horizontal overflow.

Regression checks:

- `node QA/runner-motion-test.mjs`: swept motion, facade capture, rooftop transitions, gravity, slopes, debris support and braking.
- `node QA/runner-charge-test.mjs`: 0.5s charge, 0.4s burst, 1.5s cooldown, cancellation, VFX and bounded streak effects.
- `node QA/runner-dash-test.mjs`: 10m ally carry, 5m pickup, 5s cooldown, obstruction/ledge checks and CPU avoidance.
- `node QA/runner-dash-browser.cjs`: desktop E and phone DASH execute actual ally carry, render/collider updates, cooldown, CPU rescues and reset.

Screenshots are generated at `/tmp/twin-stick-phone.png`, `/tmp/twin-stick-narrow-phone.png`, and `/tmp/twin-stick-landscape.png`.
