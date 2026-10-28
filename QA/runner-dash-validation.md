# Volt Rush rescue dash validation — 2026-10-28

- `node QA/runner-dash-test.mjs`: passed continuous 10 m group displacement
  at 30/60/120 Hz; 5 m capture; tank/infantry offsets and unchanged health;
  exclusions; five-second cooldown; wall/air rejection; whole-group walls,
  live new obstacles and roof ledges; cancellation/reset; CPU lateral escape.
- `node QA/runner-dash-browser.cjs`: full scene passed at 1100×1000 desktop
  and 390×844 touch. Actual E key and phone DASH tap captured a tank and a
  rifleman. At 0.05 s the hero/allies had moved 3 m, with 1 m swept collision
  history per frame and rendered positions within 0.2 m of real transforms.
  Both allies then completed 10 m displacement at unchanged 100/35 health.
- Verified lightning, suppressed firing during the dash, cooldown/input spam,
  pause, player/CPU handoff, original city reset, cleared passenger flags,
  phone layout and no page/shader errors.
- In the actual CPU encounter fixture, a hostile rocket was fired toward a
  nearby soldier. Volt Rush moved both the soldier and tank 10 m sideways,
  keeping both at full health as the rocket passed. The direction policy
  checks the entire group to avoid sweeping a carried tank into the incoming
  path while helping a soldier.
- Desktop/phone screenshots inspected: `/tmp/runner-rescue-dash.png` and
  `/tmp/runner-rescue-dash-phone.png`. Browser uses software GPU rendering;
  actual phone FPS/thermal behavior has not been measured.
- Existing node checks for runner movement, charge/cooldown/trail behavior
  and portal hero interactions passed.
- Existing `node QA/runner-cooldown-browser.cjs` also passed: held/tapped
  firing still observes the 0.5 s charge, 0.4 s burst and 1.5 s recovery;
  player/CPU handoff preserves recovery; CPU rooftop attacks dealt 120 damage;
  phone tap-spam stayed blocked during recharge.
