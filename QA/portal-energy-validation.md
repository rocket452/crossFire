# Dimensional attack-portal energy — revision 53

Rift Warden's attack portals have a luminous green/gold dimensional core over the existing swirling portal surface. Forty-eight particles per portal spiral inward and flow forward from the center. An additive shader adds animated energy streams, a bright central source, and a short radial surge on every actual projectile launch. The existing sparkly projectiles emerge from the same center. Portal orientation, opening/closing scale and travel all carry the effect automatically.

Only attack portals receive the core. Three live attack portals add six draws and at most 144 particles, with shared geometry/materials and no additional lights or post-processing. Per-portal shader materials and instance buffers are disposed on expiration, reset and hero deselection. Attack cadence, bolt size/speed/damage, travel and rescue behavior are unchanged.

Validation:

- `QA/portal-energy-browser.cjs` passes desktop and 390px touch viewport: three cores, 144 bounded animated particles, finite matrices, pulses tied to actual shots, unchanged four-shots-per-second cadence, no cores on travel/transport portals, expiration and disable cleanup/material disposal, no runtime/shader errors. Screenshots inspected.
- `QA/rift47-browser.cjs` regression covers default roster, three attack portals, personal teleport, natural civilian rescues, paired tank/civilian transport, guided missile/plasma redirection and reset.
- `QA/rift-pair-test.mjs` passes crossing/direction/cover/expiry checks. Browser QA uses software Chromium; physical mobile GPU/thermal performance is not measured.
