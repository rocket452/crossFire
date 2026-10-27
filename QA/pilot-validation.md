# First-person helicopter pilot mode — validation

## Delivered
- Click an actual helicopter mesh or its accessible PILOT tag to take control of that aircraft.
- First-person camera at the aircraft's pilot-eye offset, with a 304-triangle Blender-authored cockpit.
- Assisted acceleration/hover, strafe, yaw, climb/descent, independent clamped aiming, and clearance limits.
- Keyboard controls, touch joystick, altitude buttons, held FIRE, and drag-FIRE aiming.
- Player rockets launch from alternating pods, converge on the crosshair intersection, and use the existing projectile/building damage/physics path.
- Selected aircraft AI flight/firing is suspended; other units continue.
- Exit restores observer controls and the exterior, with a smooth return to patrol. Reset exits and clears pilot/missile state.

## Passed automated model checks
- Forward acceleration and damping to hover.
- Strafe, climb, yaw, normalized aim direction.
- Building clearance stops movement without passing through a wall.
- Ground, district, and altitude bounds.
- Rocket launch cooldown.

## Passed browser checks
Chromium software WebGL; desktop 1100px and emulated 390px phone layout:
- A click on the actual 3D helicopter enters its cockpit.
- Manual forward flight, climb, and yaw change the selected helicopter's state.
- Player rockets hit a building, with a separate building-hit counter distinguishing them from ground impacts. Captured example: two player missiles, one confirmed direct building hit, damage/debris and support-collapse activity in the district.
- Pause freezes flight. Escape restores the observer and visible helicopter exterior.
- Touch PILOT selection enters cockpit; no horizontal overflow in the phone layout.
- CDP-generated touch joystick gestures change helicopter position.
- Touch FIRE both launches and changes aim when dragged.
- Exit cockpit and Rebuild clear the appropriate control/weapon state.
- Desktop/mobile cockpit screenshots reviewed.
- No JavaScript page errors in the final interaction checks.

## Regression checks
- Existing city rigid-body gravity, slab contact, support loss, reset and activation-budget tests pass.
- Existing soldier asset budget, transform, loop and ankle-contact checks pass.
- JavaScript syntax, Blender script compilation, and Git whitespace checks pass.

## Scope and limits
Assisted kinematic helicopter control, not aerodynamic or rigid-body flight. Clearance uses expanded axis-aligned section bounds, not a full rotor/tail hull or crash model. Other aircraft return to authored paths. The selected exterior is hidden during cockpit view. Real iOS/Android hardware input, GPU performance, and thermal stability remain unverified. The rigid-body city remains a pre-segmented destruction prototype with simplified support rules.
